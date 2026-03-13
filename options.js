import { StorageManager } from './lib/storage.js';
import { YouTubeAPI } from './lib/youtube-api.js';

const $ = (sel) => document.querySelector(sel);

async function init() {
  const { apiKey, checkIntervalMinutes, notificationsEnabled, channels } = await StorageManager.getAll();

  const keyInput = $('#apiKey');
  keyInput.value = apiKey;

  $('#interval').value = String(checkIntervalMinutes);
  $('#notifications').checked = notificationsEnabled;
  updateQuotaEstimate(Object.keys(channels || {}).length, checkIntervalMinutes);

  // API key toggle visibility
  $('#toggleKey').addEventListener('click', () => {
    keyInput.type = keyInput.type === 'password' ? 'text' : 'password';
  });

  // Validate key
  $('#validateKey').addEventListener('click', async () => {
    const key = keyInput.value.trim();
    const statusEl = $('#keyStatus');
    statusEl.hidden = false;

    if (!key) {
      statusEl.className = 'status error';
      statusEl.textContent = 'Please enter an API key.';
      return;
    }

    statusEl.className = 'status';
    statusEl.textContent = 'Validating...';

    const api = new YouTubeAPI(key);
    const result = await api.validateKey();

    if (result.valid) {
      statusEl.className = 'status success';
      statusEl.textContent = 'API key is valid!';
      await StorageManager.setApiKey(key);
      showSaved();
    } else {
      statusEl.className = 'status error';
      statusEl.textContent = `Invalid key: ${result.error}`;
    }
  });

  // Auto-save API key on blur
  keyInput.addEventListener('change', async () => {
    const key = keyInput.value.trim();
    if (key) {
      await StorageManager.setApiKey(key);
      showSaved();
    }
  });

  // Interval change
  $('#interval').addEventListener('change', async (e) => {
    const val = Number(e.target.value);
    await chrome.runtime.sendMessage({ type: 'updateSettings', settings: { checkIntervalMinutes: val } });
    const ch = await StorageManager.getChannels();
    updateQuotaEstimate(Object.keys(ch).length, val);
    showSaved();
  });

  // Notifications toggle
  $('#notifications').addEventListener('change', async (e) => {
    await chrome.runtime.sendMessage({
      type: 'updateSettings',
      settings: { notificationsEnabled: e.target.checked }
    });
    showSaved();
  });

  // Export
  $('#exportData').addEventListener('click', async () => {
    const data = await StorageManager.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `youtube-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Clear
  $('#clearData').addEventListener('click', async () => {
    if (confirm('This will delete all tracked channels, history, and settings. Continue?')) {
      await StorageManager.clearAll();
      location.reload();
    }
  });
}

function updateQuotaEstimate(channelCount, intervalMinutes) {
  const checksPerDay = Math.floor(1440 / intervalMinutes);
  // Each check: 1 channels.list call (batched) + 1 playlistItems.list per channel
  const batchCalls = Math.ceil(channelCount / 50);
  const unitsPerCheck = batchCalls + channelCount;
  const daily = checksPerDay * unitsPerCheck;
  $('#quotaEstimate').textContent = channelCount
    ? `Estimated daily quota: ~${daily.toLocaleString()} / 10,000 units (${channelCount} channels, ${checksPerDay} checks/day)`
    : 'Add channels to see quota estimate.';
}

function showSaved() {
  const el = $('#saveStatus');
  el.hidden = false;
  el.style.opacity = '1';
  setTimeout(() => {
    el.style.opacity = '0';
    setTimeout(() => { el.hidden = true; }, 300);
  }, 1500);
}

init();
