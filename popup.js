import { formatNumber, timeAgo, escapeHtml } from './lib/utils.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

async function send(msg) {
  return chrome.runtime.sendMessage(msg);
}

async function init() {
  const state = await send({ type: 'getState' });

  if (!state.apiKey) {
    $('#noApiKey').hidden = false;
  }

  renderNewVideos(state.newVideos || []);
  renderChannels(state.channels || {});

  // Clear badge on open
  if ((state.newVideos || []).length > 0) {
    send({ type: 'clearNewVideos' });
  }

  // Event listeners
  $('#settingsBtn').addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  $('#openSettings')?.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  $('#refreshBtn').addEventListener('click', async () => {
    const btn = $('#refreshBtn');
    btn.disabled = true;
    btn.style.opacity = '0.5';
    showStatus('Checking channels...');
    try {
      await send({ type: 'forceCheck' });
      const updated = await send({ type: 'getState' });
      renderNewVideos(updated.newVideos || []);
      renderChannels(updated.channels || {});
      showStatus('Updated!', false, 2000);
    } catch (err) {
      showStatus(err.message, true);
    }
    btn.disabled = false;
    btn.style.opacity = '';
  });

  $('#addBtn').addEventListener('click', addChannel);
  $('#channelInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addChannel();
  });

  $('#clearVideos').addEventListener('click', async () => {
    await send({ type: 'clearNewVideos' });
    renderNewVideos([]);
  });
}

async function addChannel() {
  const input = $('#channelInput');
  const btn = $('#addBtn');
  const errorEl = $('#addError');
  const value = input.value.trim();

  if (!value) return;

  btn.disabled = true;
  btn.textContent = '...';
  errorEl.hidden = true;

  try {
    const result = await send({ type: 'addChannel', input: value });
    if (result.error) throw new Error(result.error);
    input.value = '';
    // Re-render
    const state = await send({ type: 'getState' });
    renderChannels(state.channels || {});
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }

  btn.disabled = false;
  btn.textContent = 'Add';
}

function renderNewVideos(videos) {
  const section = $('#newVideosSection');
  const list = $('#newVideosList');

  if (!videos.length) {
    section.hidden = true;
    return;
  }

  section.hidden = false;
  list.innerHTML = videos.map(v => `
    <div class="video-item" data-video-id="${escapeHtml(v.videoId)}">
      <img class="video-thumb" src="${escapeHtml(v.thumbnail || '')}" alt="" loading="lazy">
      <div class="video-info">
        <div class="video-title">${escapeHtml(v.title)}</div>
        <div class="video-channel">${escapeHtml(v.channelTitle)} · ${timeAgo(v.publishedAt)}</div>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.video-item').forEach(el => {
    el.addEventListener('click', () => {
      chrome.tabs.create({ url: `https://www.youtube.com/watch?v=${el.dataset.videoId}` });
    });
  });
}

function renderChannels(channels) {
  const container = $('#channelList');
  const entries = Object.entries(channels);

  if (!entries.length) {
    container.innerHTML = `
      <div id="emptyState" class="empty-state">
        <p>No channels tracked yet.</p>
        <p class="hint">Add a channel above to get started.</p>
      </div>`;
    return;
  }

  // Sort by added time, newest first
  entries.sort((a, b) => new Date(b[1].addedAt) - new Date(a[1].addedAt));

  container.innerHTML = entries.map(([id, ch]) => {
    const growth = computeGrowth(ch.subscriberHistory || []);
    const sparkline = renderSparklineSVG(ch.subscriberHistory || []);
    const channelUrl = ch.customUrl
      ? `https://www.youtube.com/${ch.customUrl}`
      : `https://www.youtube.com/channel/${id}`;

    return `
      <div class="channel-card" data-channel-id="${escapeHtml(id)}">
        <img class="channel-avatar" src="${escapeHtml(ch.thumbnail || '')}" alt="" loading="lazy">
        <div class="channel-body">
          <div class="channel-name">
            <a href="${escapeHtml(channelUrl)}" target="_blank">${escapeHtml(ch.title)}</a>
          </div>
          <div class="channel-stats">
            <span class="sub-count">${formatNumber(ch.subscriberCount)} subscribers</span>
            ${growth.html}
          </div>
          <div class="channel-meta">${ch.lastChecked ? 'Checked ' + timeAgo(ch.lastChecked) : 'Not checked yet'}</div>
          ${sparkline ? `<div class="channel-sparkline">${sparkline}</div>` : ''}
        </div>
        <div class="channel-actions">
          <button class="remove-btn" title="Remove channel">&times;</button>
        </div>
      </div>`;
  }).join('');

  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const card = e.target.closest('.channel-card');
      const channelId = card.dataset.channelId;
      if (confirm(`Remove this channel from tracking?`)) {
        await send({ type: 'removeChannel', channelId });
        card.remove();
        const remaining = container.querySelectorAll('.channel-card');
        if (!remaining.length) renderChannels({});
      }
    });
  });

  container.querySelectorAll('.channel-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('a') || e.target.closest('.remove-btn')) return;
      const channelId = card.dataset.channelId;
      const url = chrome.runtime.getURL(`channel.html?channelId=${encodeURIComponent(channelId)}`);
      chrome.tabs.create({ url });
    });
  });
}

function computeGrowth(history) {
  if (history.length < 2) {
    return { value: 0, html: '<span class="sub-growth neutral">—</span>' };
  }
  const latest = history[history.length - 1].count;
  const previous = history[history.length - 2].count;
  const diff = latest - previous;

  if (diff === 0) return { value: 0, html: '<span class="sub-growth neutral">±0</span>' };

  const sign = diff > 0 ? '+' : '';
  const cls = diff > 0 ? 'positive' : 'negative';
  return {
    value: diff,
    html: `<span class="sub-growth ${cls}">${sign}${formatNumber(Math.abs(diff))}/day</span>`
  };
}

function renderSparklineSVG(history) {
  if (history.length < 2) return '';

  const width = 120;
  const height = 24;
  const padding = 2;
  const counts = history.map(h => h.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const range = max - min || 1;

  const points = counts.map((c, i) => {
    const x = padding + (i / (counts.length - 1)) * (width - padding * 2);
    const y = height - padding - ((c - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const isUp = counts[counts.length - 1] >= counts[0];
  const color = isUp ? '#2e7d32' : '#c62828';

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <polyline fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" points="${points.join(' ')}"/>
  </svg>`;
}

function showStatus(text, isError = false, autoClear = 0) {
  const bar = $('#statusBar');
  bar.hidden = false;
  bar.textContent = text;
  bar.className = `status-bar${isError ? ' error' : ''}`;

  if (autoClear > 0) {
    setTimeout(() => { bar.hidden = true; }, autoClear);
  }
}

init();
