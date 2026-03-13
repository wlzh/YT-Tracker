# Repository Guidelines

## Project Structure & Module Organization
- `manifest.json`: Chrome Extension manifest (MV3) and permissions.
- `background.js`: service worker entry point; handles alarms, notifications, and messaging.
- `popup.html` / `popup.css` / `popup.js`: extension UI and logic.
- `options.html` / `options.css` / `options.js`: options page for API key and settings.
- `lib/`: shared modules (`storage.js`, `youtube-api.js`, `channel-resolver.js`, `utils.js`).
- `icons/`: extension icons.

## Build, Test, and Development Commands
There is no build step or package manager config in this repo.
- Run locally: load the folder as an unpacked extension in Chrome.
  - Open `chrome://extensions` → enable Developer Mode → Load unpacked → select this repo root.
- Reload after edits: click the extension’s reload button in `chrome://extensions`.

## Coding Style & Naming Conventions
- JavaScript uses ES modules with `import`/`export`.
- Indentation is 2 spaces; semicolons are used.
- Naming: `camelCase` for functions/vars, `PascalCase` for classes, `SCREAMING_SNAKE_CASE` for constants.
- File names are lowercase with hyphens (e.g., `channel-resolver.js`).

## Testing Guidelines
- No automated tests or test framework are present.
- Manual verification is expected:
  - Add a YouTube API key in the Options page.
  - Add a channel in the popup and confirm subscriber data updates.
  - Trigger a manual check and confirm notifications.

## Commit & Pull Request Guidelines
- This workspace does not include a `.git` directory, so no existing commit message conventions can be inferred.
- If you add Git, prefer concise messages such as `feat: add channel validation` and include:
  - A brief summary of behavior changes.
  - Screenshots for UI changes (`popup`/`options`).

## Security & Configuration Tips
- The YouTube API key is stored in extension storage via the Options page.
- Do not hard-code API keys in source files or commit them to version control.
