import { YouTubeAPI } from './youtube-api.js';

const PATTERNS = {
  channelId: /(?:youtube\.com\/channel\/|^)(UC[\w-]{22})$/,
  handle: /(?:youtube\.com\/@|^@)([\w.-]+)$/,
  customUrl: /youtube\.com\/c\/([\w.-]+)/,
  username: /youtube\.com\/user\/([\w.-]+)/,
  shortUrl: /youtu\.be\/([\w-]+)/,
  videoUrl: /youtube\.com\/watch\?v=([\w-]+)/
};

export async function resolveChannel(input, apiKey) {
  input = input.trim();
  const api = new YouTubeAPI(apiKey);

  // Direct channel ID
  const idMatch = input.match(PATTERNS.channelId);
  if (idMatch) {
    const channels = await api.getChannels([idMatch[1]]);
    if (channels.length) return normalizeChannel(channels[0]);
    throw new Error('Channel not found');
  }

  // @handle
  const handleMatch = input.match(PATTERNS.handle);
  if (handleMatch) {
    const channel = await api.getChannelByHandle(handleMatch[1]);
    if (channel) return normalizeChannel(channel);
    throw new Error(`Channel @${handleMatch[1]} not found`);
  }

  // /c/custom URL
  const customMatch = input.match(PATTERNS.customUrl);
  if (customMatch) {
    const channel = await api.getChannelByHandle(customMatch[1]);
    if (channel) return normalizeChannel(channel);
    // Fallback to username
    const byUser = await api.getChannelByUsername(customMatch[1]);
    if (byUser) return normalizeChannel(byUser);
    throw new Error(`Channel "${customMatch[1]}" not found`);
  }

  // /user/ URL
  const userMatch = input.match(PATTERNS.username);
  if (userMatch) {
    const channel = await api.getChannelByUsername(userMatch[1]);
    if (channel) return normalizeChannel(channel);
    throw new Error(`User "${userMatch[1]}" not found`);
  }

  // Plain text: try as handle first, then channel ID
  if (/^[\w.-]+$/.test(input)) {
    try {
      const channel = await api.getChannelByHandle(input);
      if (channel) return normalizeChannel(channel);
    } catch { /* try next */ }

    if (/^UC[\w-]{22}$/.test(input)) {
      const channels = await api.getChannels([input]);
      if (channels.length) return normalizeChannel(channels[0]);
    }

    throw new Error(`Could not resolve "${input}" to a channel`);
  }

  throw new Error('Unrecognized input format. Use a YouTube URL, @handle, or channel ID.');
}

function normalizeChannel(item) {
  const uploadsPlaylistId = item.contentDetails?.relatedPlaylists?.uploads;
  return {
    channelId: item.id,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
    customUrl: item.snippet.customUrl || '',
    subscriberCount: Number(item.statistics.subscriberCount) || 0,
    videoCount: Number(item.statistics.videoCount) || 0,
    uploadsPlaylistId: uploadsPlaylistId || null,
    subscriberHistory: [
      { date: new Date().toISOString().slice(0, 10), count: Number(item.statistics.subscriberCount) || 0 }
    ],
    lastVideoId: null,
    lastChecked: new Date().toISOString(),
    addedAt: new Date().toISOString(),
    isNew: true
  };
}
