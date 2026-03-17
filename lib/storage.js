const DEFAULTS = {
  apiKey: '',
  channels: {},
  newVideos: [],
  checkIntervalMinutes: 15,
  notificationsEnabled: true,
  useRSS: true  // Default to RSS mode (no API key needed)
};

export class StorageManager {
  static async get(keys) {
    return chrome.storage.local.get(keys);
  }

  static async set(data) {
    return chrome.storage.local.set(data);
  }

  static async getAll() {
    return chrome.storage.local.get(DEFAULTS);
  }

  static async getApiKey() {
    const { apiKey } = await chrome.storage.local.get({ apiKey: '' });
    return apiKey;
  }

  static async setApiKey(key) {
    return chrome.storage.local.set({ apiKey: key });
  }

  static async getChannels() {
    const { channels } = await chrome.storage.local.get({ channels: {} });
    return channels;
  }

  static async getChannel(channelId) {
    const channels = await this.getChannels();
    return channels[channelId] || null;
  }

  static async setChannel(channelId, data) {
    const channels = await this.getChannels();
    channels[channelId] = data;
    return chrome.storage.local.set({ channels });
  }

  static async removeChannel(channelId) {
    const channels = await this.getChannels();
    delete channels[channelId];
    return chrome.storage.local.set({ channels });
  }

  static async updateChannelStats(channelId, subscriberCount) {
    const channels = await this.getChannels();
    const channel = channels[channelId];
    if (!channel) return;

    channel.subscriberCount = subscriberCount;
    channel.lastChecked = new Date().toISOString();

    const today = new Date().toISOString().slice(0, 10);
    if (!channel.subscriberHistory) channel.subscriberHistory = [];

    const lastEntry = channel.subscriberHistory[channel.subscriberHistory.length - 1];
    if (lastEntry && lastEntry.date === today) {
      lastEntry.count = subscriberCount;
    } else {
      channel.subscriberHistory.push({ date: today, count: subscriberCount });
    }

    if (channel.subscriberHistory.length > 30) {
      channel.subscriberHistory = channel.subscriberHistory.slice(-30);
    }

    channels[channelId] = channel;
    return chrome.storage.local.set({ channels });
  }

  static async getNewVideos() {
    const { newVideos } = await chrome.storage.local.get({ newVideos: [] });
    return newVideos;
  }

  static async addNewVideo(video) {
    const newVideos = await this.getNewVideos();
    if (newVideos.some(v => v.videoId === video.videoId)) return;
    newVideos.unshift(video);
    if (newVideos.length > 50) newVideos.length = 50;
    return chrome.storage.local.set({ newVideos });
  }

  static async clearNewVideos() {
    return chrome.storage.local.set({ newVideos: [] });
  }

  static async getSettings() {
    const { checkIntervalMinutes, notificationsEnabled, useRSS } = await chrome.storage.local.get({
      checkIntervalMinutes: 15,
      notificationsEnabled: true,
      useRSS: true
    });
    return { checkIntervalMinutes, notificationsEnabled, useRSS };
  }

  static async updateSettings(settings) {
    return chrome.storage.local.set(settings);
  }

  static async clearAll() {
    return chrome.storage.local.clear();
  }

  static async exportData() {
    return chrome.storage.local.get(null);
  }
}
