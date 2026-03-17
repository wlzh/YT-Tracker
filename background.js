import { StorageManager } from './lib/storage.js';
import { YouTubeAPI } from './lib/youtube-api.js';
import { YouTubeRSS } from './lib/youtube-rss.js';
import { resolveChannel } from './lib/channel-resolver.js';
import { formatNumber } from './lib/utils.js';

const ALARM_NAME = 'youtube-check';

// Register all listeners synchronously at top level (MV3 requirement)

chrome.runtime.onInstalled.addListener(async () => {
  const data = await StorageManager.getAll();
  // Set defaults only for missing keys
  const defaults = {};
  if (!data.apiKey) defaults.apiKey = '';
  if (!Object.keys(data.channels || {}).length) defaults.channels = {};
  if (!data.newVideos) defaults.newVideos = [];
  if (Object.keys(defaults).length) await StorageManager.set(defaults);
  await ensureAlarm();
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_NAME) {
    await checkAllChannels();
  }
});

chrome.notifications.onClicked.addListener(async (notificationId) => {
  if (notificationId.startsWith('yt-video-')) {
    const videoId = notificationId.replace('yt-video-', '');
    chrome.tabs.create({ url: `https://www.youtube.com/watch?v=${videoId}` });
    chrome.notifications.clear(notificationId);
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch(err => sendResponse({ error: err.message }));
  return true; // keep channel open for async response
});

async function handleMessage(msg) {
  switch (msg.type) {
    case 'addChannel': {
      const apiKey = await StorageManager.getApiKey();
      if (!apiKey) throw new Error('API key not set. Configure it in extension options.');

      const channels = await StorageManager.getChannels();
      const channelData = await resolveChannel(msg.input, apiKey);

      if (channels[channelData.channelId]) {
        throw new Error('Channel already tracked');
      }

      // First-check suppression: get latest video but don't notify
      if (channelData.uploadsPlaylistId) {
        const api = new YouTubeAPI(apiKey);
        const latest = await api.getLatestVideo(channelData.uploadsPlaylistId);
        if (latest) channelData.lastVideoId = latest.videoId;
      }
      channelData.isNew = false;

      await StorageManager.setChannel(channelData.channelId, channelData);
      return { success: true, channel: channelData };
    }

    case 'removeChannel': {
      await StorageManager.removeChannel(msg.channelId);
      return { success: true };
    }

    case 'forceCheck': {
      await checkAllChannels();
      return { success: true };
    }

    case 'updateSettings': {
      await StorageManager.updateSettings(msg.settings);
      await ensureAlarm();
      return { success: true };
    }

    case 'clearNewVideos': {
      await StorageManager.clearNewVideos();
      await updateBadge();
      return { success: true };
    }

    case 'getState': {
      const data = await StorageManager.getAll();
      return data;
    }

    case 'getChannelVideos': {
      const apiKey = await StorageManager.getApiKey();
      if (!apiKey) throw new Error('API key not set. Configure it in extension options.');

      if (!msg.channelId) throw new Error('Missing channel ID.');
      const channel = await StorageManager.getChannel(msg.channelId);
      if (!channel) throw new Error('Channel not found.');
      if (!channel.uploadsPlaylistId) throw new Error('Channel uploads playlist not available.');

      const api = new YouTubeAPI(apiKey);
      const maxResults = Number(msg.maxResults) || 5;
      const videos = await api.getRecentVideosWithStats(channel.uploadsPlaylistId, maxResults);
      return {
        channel: {
          channelId: msg.channelId,
          title: channel.title,
          thumbnail: channel.thumbnail,
          customUrl: channel.customUrl,
          subscriberCount: channel.subscriberCount,
          lastChecked: channel.lastChecked
        },
        videos
      };
    }

    default:
      throw new Error(`Unknown message type: ${msg.type}`);
  }
}

async function ensureAlarm() {
  const { checkIntervalMinutes } = await StorageManager.getSettings();
  await chrome.alarms.clear(ALARM_NAME);
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: checkIntervalMinutes });
}

async function checkAllChannels() {
  const settings = await StorageManager.getSettings();
  const useRSS = settings.useRSS !== false; // Default to RSS mode
  
  const channels = await StorageManager.getChannels();
  const channelIds = Object.keys(channels);
  if (!channelIds.length) return;

  const { notificationsEnabled } = settings;
  const rss = new YouTubeRSS();

  try {
    // RSS mode: no channel stats (subscriber count), but can check videos
    if (useRSS) {
      // Check each channel for new videos using RSS
      for (const id of channelIds) {
        const channel = channels[id];
        
        try {
          const latest = await rss.getLatestVideo(id);
          if (!latest) continue;

          if (channel.lastVideoId && latest.videoId !== channel.lastVideoId) {
            // New video found
            const video = {
              videoId: latest.videoId,
              title: latest.title,
              thumbnail: latest.thumbnail,
              publishedAt: latest.publishedAt,
              channelTitle: latest.channelTitle || channel.title,
              channelId: latest.channelId || id,
              detectedAt: new Date().toISOString()
            };

            await StorageManager.addNewVideo(video);

            if (notificationsEnabled) {
              chrome.notifications.create(`yt-video-${latest.videoId}`, {
                type: 'basic',
                iconUrl: channel.thumbnail || 'icons/icon128.png',
                title: `New video from ${video.channelTitle}`,
                message: latest.title
              });
            }
          }

          // Update last known video
          const updatedChannels = await StorageManager.getChannels();
          if (updatedChannels[id]) {
            updatedChannels[id].lastVideoId = latest.videoId;
            await StorageManager.set({ channels: updatedChannels });
          }
        } catch (err) {
          console.warn(`Failed to check videos for ${channel.title}:`, err.message);
        }
      }
    } else {
      // API mode (legacy): requires API key
      const apiKey = await StorageManager.getApiKey();
      if (!apiKey) {
        console.warn('API key not set, skipping API mode check');
        return;
      }

      const api = new YouTubeAPI(apiKey);

      // Batch fetch channel stats (up to 50 per request, 1 unit each)
      const items = await api.getChannels(channelIds);
      for (const item of items) {
        const subCount = Number(item.statistics.subscriberCount) || 0;
        const oldCount = channels[item.id]?.subscriberCount ?? subCount;
        await StorageManager.updateChannelStats(item.id, subCount);

        // 订阅数变化时推送通知
        if (notificationsEnabled && subCount !== oldCount) {
          const diff = subCount - oldCount;
          const sign = diff > 0 ? '+' : '';
          const channelName = channels[item.id]?.title || item.snippet.title;
          chrome.notifications.create(`yt-sub-${item.id}-${Date.now()}`, {
            type: 'basic',
            iconUrl: channels[item.id]?.thumbnail || 'icons/icon128.png',
            title: `${channelName} 订阅数变化`,
            message: `${formatNumber(oldCount)} → ${formatNumber(subCount)} (${sign}${formatNumber(diff)})`
          });
        }
      }

      // Check each channel for new videos
      for (const id of channelIds) {
        const channel = channels[id];
        if (!channel.uploadsPlaylistId) continue;

        try {
          const latest = await api.getLatestVideo(channel.uploadsPlaylistId);
          if (!latest) continue;

          if (channel.lastVideoId && latest.videoId !== channel.lastVideoId) {
            // New video found
            const video = {
              videoId: latest.videoId,
              title: latest.title,
              thumbnail: latest.thumbnail,
              publishedAt: latest.publishedAt,
              channelTitle: latest.channelTitle,
              channelId: latest.channelId,
              detectedAt: new Date().toISOString()
            };

            await StorageManager.addNewVideo(video);

            if (notificationsEnabled) {
              chrome.notifications.create(`yt-video-${latest.videoId}`, {
                type: 'basic',
                iconUrl: channel.thumbnail || 'icons/icon128.png',
                title: `New video from ${latest.channelTitle}`,
                message: latest.title
              });
            }
          }

          // Update last known video
          const updatedChannels = await StorageManager.getChannels();
          if (updatedChannels[id]) {
            updatedChannels[id].lastVideoId = latest.videoId;
            await StorageManager.set({ channels: updatedChannels });
          }
        } catch (err) {
          console.warn(`Failed to check videos for ${channel.title}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.error('Channel check failed:', err.message);
  }

  await updateBadge();
}

async function updateBadge() {
  const newVideos = await StorageManager.getNewVideos();
  const count = newVideos.length;
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#FF0000' });
}
