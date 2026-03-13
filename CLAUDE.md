# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YouTube Channel Tracker — a Chrome Extension (Manifest V3) that monitors YouTube channels for subscriber count changes and new video uploads. Pure vanilla JavaScript, zero dependencies, zero build steps.

## Development

No build step or package manager. Load as unpacked extension in Chrome:
1. Open `chrome://extensions` → enable Developer Mode → Load unpacked → select repo root
2. After code changes, click the extension's reload button in `chrome://extensions`

No automated tests. Manual verification: add an API key in Options, add a channel in popup, trigger a check, verify notifications.

## Architecture

**Message-driven architecture**: The popup/options/channel pages communicate with `background.js` (the service worker) via `chrome.runtime.sendMessage`. All YouTube API calls and data mutations happen in the background service worker.

Message types handled by `background.js`:
- `addChannel` — resolves input to channel data, stores it
- `removeChannel`, `forceCheck`, `updateSettings`, `clearNewVideos`, `getState`, `getChannelVideos`

**Key modules in `lib/`:**
- `storage.js` — `StorageManager` class wrapping `chrome.storage.local`. All persistent state (API key, channels dict, newVideos array, settings) goes through this.
- `youtube-api.js` — `YouTubeAPI` class encapsulating all YouTube Data API v3 calls. Batches channel requests in groups of 50.
- `channel-resolver.js` — Parses various YouTube URL formats (@handle, /channel/, /c/, /user/, plain channel ID) and resolves them to channel data via the API.
- `utils.js` — Small helpers (number formatting, date keys).

**Data flow for periodic checks** (`checkAllChannels`):
1. Chrome Alarm fires → batch-fetch all tracked channel stats → update subscriber counts and 30-day history → detect new videos via uploads playlist → push desktop notifications → update badge count.

**Storage schema** (in `chrome.storage.local`):
- `apiKey`: string — user-provided YouTube Data API v3 key
- `channels`: `{ [channelId]: { title, thumbnail, subscriberCount, subscriberHistory[], uploadsPlaylistId, lastVideoId, ... } }`
- `newVideos`: array of detected new video objects (max 50)
- `checkIntervalMinutes`: number (default 15)
- `notificationsEnabled`: boolean (default true)

**UI pages:**
- `popup.html/js` — main extension popup: channel list, new videos, add channel input
- `options.html/js` — API key config, check interval, notifications toggle, data export
- `channel.html/js` — per-channel detail page showing recent videos with stats

## Coding Conventions

- ES modules (`import`/`export`) throughout, including the service worker (`"type": "module"` in manifest)
- 2-space indentation, semicolons
- `camelCase` for functions/vars, `PascalCase` for classes, `SCREAMING_SNAKE_CASE` for constants
- Filenames: lowercase with hyphens (e.g., `channel-resolver.js`)

## MV3 Constraints

All event listeners in `background.js` must be registered synchronously at the top level — this is a Manifest V3 requirement. The service worker can be terminated at any time; do not rely on in-memory state.
