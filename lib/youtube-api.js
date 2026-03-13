const BASE_URL = 'https://www.googleapis.com/youtube/v3';

export class YouTubeAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  async _fetch(endpoint, params) {
    params.key = this.apiKey;
    const url = `${BASE_URL}/${endpoint}?${new URLSearchParams(params)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err?.error?.message || `HTTP ${res.status}`;
      const code = err?.error?.errors?.[0]?.reason || res.status;
      throw new APIError(message, code, res.status);
    }
    return res.json();
  }

  async validateKey() {
    try {
      await this._fetch('channels', { part: 'id', id: 'UC_x5XG1OV2P6uZZ5FSM9Ttw', maxResults: 1 });
      return { valid: true };
    } catch (e) {
      return { valid: false, error: e.message };
    }
  }

  async getChannels(channelIds) {
    if (!channelIds.length) return [];
    const results = [];
    for (let i = 0; i < channelIds.length; i += 50) {
      const batch = channelIds.slice(i, i + 50);
      const data = await this._fetch('channels', {
        part: 'snippet,statistics,contentDetails',
        id: batch.join(',')
      });
      if (data.items) results.push(...data.items);
    }
    return results;
  }

  async getChannelByHandle(handle) {
    handle = handle.replace(/^@/, '');
    const data = await this._fetch('channels', {
      part: 'snippet,statistics,contentDetails',
      forHandle: handle
    });
    return data.items?.[0] || null;
  }

  async getChannelByUsername(username) {
    const data = await this._fetch('channels', {
      part: 'snippet,statistics,contentDetails',
      forUsername: username
    });
    return data.items?.[0] || null;
  }

  async getLatestVideo(uploadsPlaylistId) {
    const data = await this._fetch('playlistItems', {
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults: 1
    });
    const item = data.items?.[0];
    if (!item) return null;
    return {
      videoId: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url,
      publishedAt: item.snippet.publishedAt,
      channelTitle: item.snippet.channelTitle,
      channelId: item.snippet.channelId
    };
  }

  async getRecentVideos(uploadsPlaylistId, maxResults = 5) {
    const data = await this._fetch('playlistItems', {
      part: 'snippet',
      playlistId: uploadsPlaylistId,
      maxResults
    });
    const items = data.items || [];
    return items.map(item => ({
      videoId: item.snippet?.resourceId?.videoId || '',
      title: item.snippet?.title || '',
      thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || '',
      publishedAt: item.snippet?.publishedAt || '',
      channelTitle: item.snippet?.channelTitle || '',
      channelId: item.snippet?.channelId || ''
    })).filter(v => v.videoId);
  }

  async getVideoStats(videoIds) {
    if (!videoIds.length) return {};
    const data = await this._fetch('videos', {
      part: 'statistics',
      id: videoIds.join(',')
    });
    const statsById = {};
    for (const item of data.items || []) {
      statsById[item.id] = item.statistics || {};
    }
    return statsById;
  }

  async getRecentVideosWithStats(uploadsPlaylistId, maxResults = 5) {
    const videos = await this.getRecentVideos(uploadsPlaylistId, maxResults);
    if (!videos.length) return [];
    const statsById = await this.getVideoStats(videos.map(v => v.videoId));
    return videos.map(video => ({
      ...video,
      statistics: statsById[video.videoId] || {}
    }));
  }
}

export class APIError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
  }
}
