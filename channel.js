import { formatNumber, timeAgo, escapeHtml } from './lib/utils.js';

const $ = (sel) => document.querySelector(sel);

async function send(msg) {
  const res = await chrome.runtime.sendMessage(msg);
  if (res?.error) throw new Error(res.error);
  return res;
}

let currentChannelId = null;

function showLoading(isLoading) {
  $('#loading').hidden = !isLoading;
}

function showError(message) {
  const el = $('#error');
  el.textContent = message;
  el.hidden = false;
}

function hideError() {
  $('#error').hidden = true;
}

function showNotice(message, withSettingsLink = false) {
  const el = $('#notice');
  if (withSettingsLink) {
    el.innerHTML = `${escapeHtml(message)} <a href="#" id="openSettings">Open Settings</a>`;
    el.querySelector('#openSettings')?.addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
    });
  } else {
    el.textContent = message;
  }
  el.hidden = false;
}

function hideNotice() {
  $('#notice').hidden = true;
}

function renderHeader(channel) {
  $('#channelTitle').textContent = channel.title || 'Channel';

  const avatar = $('#channelAvatar');
  if (channel.thumbnail) {
    avatar.src = channel.thumbnail;
    avatar.hidden = false;
  } else {
    avatar.hidden = true;
  }

  const meta = [];
  if (channel.subscriberCount != null) {
    meta.push(`${formatNumber(channel.subscriberCount)} subscribers`);
  }
  if (channel.lastChecked) {
    meta.push(`Checked ${timeAgo(channel.lastChecked)}`);
  }
  $('#channelMeta').textContent = meta.join(' · ');

  const channelUrl = channel.customUrl
    ? `https://www.youtube.com/${channel.customUrl}`
    : `https://www.youtube.com/channel/${channel.channelId}`;
  const openLink = $('#openYoutube');
  openLink.href = channelUrl;
}

function renderVideos(videos) {
  const section = $('#videosSection');
  const list = $('#videosList');

  if (!videos.length) {
    section.hidden = false;
    list.innerHTML = '<div class="empty">No recent videos found.</div>';
    return;
  }

  section.hidden = false;
  list.innerHTML = videos.map(video => {
    const stats = video.statistics || {};
    const views = formatNumber(stats.viewCount);
    const likes = formatNumber(stats.likeCount);
    const comments = formatNumber(stats.commentCount);
    const published = video.publishedAt ? timeAgo(video.publishedAt) : 'Unknown date';
    return `
      <div class="video-card" data-video-id="${escapeHtml(video.videoId)}">
        <img class="video-thumb" src="${escapeHtml(video.thumbnail || '')}" alt="" loading="lazy">
        <div class="video-body">
          <div class="video-title">${escapeHtml(video.title || 'Untitled')}</div>
          <div class="video-meta">${escapeHtml(published)}</div>
          <div class="video-stats">
            <span class="stat"><span class="label">Views</span>${escapeHtml(String(views))}</span>
            <span class="stat"><span class="label">Likes</span>${escapeHtml(String(likes))}</span>
            <span class="stat"><span class="label">Comments</span>${escapeHtml(String(comments))}</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.video-card').forEach(card => {
    card.addEventListener('click', () => {
      const videoId = card.dataset.videoId;
      chrome.tabs.create({ url: `https://www.youtube.com/watch?v=${videoId}` });
    });
  });
}

async function loadChannel() {
  hideError();
  hideNotice();
  showLoading(true);
  $('#videosSection').hidden = true;

  try {
    const response = await send({
      type: 'getChannelVideos',
      channelId: currentChannelId,
      maxResults: 5
    });
    renderHeader(response.channel || {});
    renderVideos(response.videos || []);
  } catch (err) {
    const message = err.message || 'Failed to load videos.';
    if (message.toLowerCase().includes('api key')) {
      showNotice('API key not set.', true);
    } else {
      showError(message);
    }
  } finally {
    showLoading(false);
  }
}

function init() {
  const params = new URLSearchParams(window.location.search);
  currentChannelId = params.get('channelId');

  if (!currentChannelId) {
    showError('Missing channel ID.');
    return;
  }

  $('#backBtn').addEventListener('click', () => {
    if (history.length > 1) {
      history.back();
    } else {
      window.close();
    }
  });

  $('#refreshBtn').addEventListener('click', loadChannel);

  $('#settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  loadChannel();
}

init();
