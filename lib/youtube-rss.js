/**
 * YouTube RSS Feed Client
 * Uses official YouTube RSS feeds - no API key needed, no quota limits!
 */

export class YouTubeRSS {
  /**
   * Fetch RSS feed for a channel
   * @param {string} channelId - YouTube channel ID (UC...)
   * @returns {Promise<Object|null>} - Parsed feed or null
   */
  async fetchFeed(channelId) {
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; YouTube-Channel-Tracker/2.0)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      return this.parseFeed(text);
    } catch (err) {
      console.warn(`RSS fetch failed for ${channelId}:`, err.message);
      return null;
    }
  }

  /**
   * Parse RSS XML feed
   * @param {string} xml - RSS XML content
   * @returns {Object} - Parsed feed with entries
   */
  parseFeed(xml) {
    const entries = [];
    
    // Extract entries using regex (no DOM parser in service worker)
    const entryMatches = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
    
    for (const entryXml of entryMatches) {
      const videoIdMatch = entryXml.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i);
      const titleMatch = entryXml.match(/<title>([^<]*)<\/title>/i);
      const publishedMatch = entryXml.match(/<published>([^<]+)<\/published>/i);
      const authorMatch = entryXml.match(/<author>[\s\S]*?<name>([^<]*)<\/name>[\s\S]*?<\/author>/i);
      const thumbnailMatch = entryXml.match(/<media:thumbnail[^>]*url="([^"]+)"/i);
      const linkMatch = entryXml.match(/<link[^>]*href="([^"]+)"[^>]*rel="alternate"[^>]*>/i) ||
                          entryXml.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"[^>]*>/i);
      
      if (videoIdMatch) {
        entries.push({
          videoId: videoIdMatch[1],
          title: titleMatch ? titleMatch[1] : '',
          publishedAt: publishedMatch ? publishedMatch[1] : '',
          channelTitle: authorMatch ? authorMatch[1] : '',
          thumbnail: thumbnailMatch ? thumbnailMatch[1] : null,
          link: linkMatch ? linkMatch[1] : `https://www.youtube.com/watch?v=${videoIdMatch[1]}`
        });
      }
    }
    
    // Extract channel info from feed
    const channelTitleMatch = xml.match(/<author>[\s\S]*?<name>([^<]*)<\/name>[\s\S]*?<\/author>/i);
    
    return {
      channelTitle: channelTitleMatch ? channelTitleMatch[1] : '',
      entries
    };
  }

  /**
   * Get latest video from a channel
   * @param {string} channelId - YouTube channel ID
   * @returns {Promise<Object|null>} - Latest video or null
   */
  async getLatestVideo(channelId) {
    const feed = await this.fetchFeed(channelId);
    if (!feed || !feed.entries.length) return null;
    
    const latest = feed.entries[0];
    return {
      ...latest,
      channelId
    };
  }

  /**
   * Get multiple latest videos from a channel
   * @param {string} channelId - YouTube channel ID
   * @param {number} maxResults - Max number of videos (default 5)
   * @returns {Promise<Array>} - Array of videos
   */
  async getLatestVideos(channelId, maxResults = 5) {
    const feed = await this.fetchFeed(channelId);
    if (!feed || !feed.entries.length) return [];
    
    return feed.entries.slice(0, maxResults).map(entry => ({
      ...entry,
      channelId
    }));
  }
}
