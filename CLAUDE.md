# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Little Backup Box turns a Raspberry Pi into a backup and media management hub. The repository contains shell/Python scripts for the device itself (`scripts/`) and a React/Node.js web GUI (`webapp/`) that replaces an older PHP interface. There is also a static GitHub Pages demo built from the same React app with mocked APIs.

## Webapp Development Commands

All commands run from `webapp/`:

```bash
npm run dev          # Start both Express backend + Vite frontend (requires Linux or mock env)
npm run dev:mock     # Same but forces USE_MOCKS=true (use this on Mac/Windows)
npm run dev:server   # Backend only (port 3000)
npm run dev:client   # Frontend only (port 5173, proxies /api to :3000)
npm run build        # Production build
npm run build:static # Static build for GitHub Pages (VITE_USE_MOCK_API=true)
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run test:e2e     # Playwright E2E tests (auto-starts dev:mock server)
npm run test:e2e:ui  # Playwright UI mode
npx playwright test tests/e2e/home.spec.js  # Run a single test file
```

## Architecture

### Backend (`webapp/server/`)
- `index.js` — Express entry point. Loads config from `scripts/config.cfg` via `utils/configLoader.js` and attaches `req.WORKING_DIR`, `req.config`, `req.constants`, and `req.logger` to every request.
- `routes/` — One file per API domain: `backup`, `cloud`, `cmd`, `config`, `display`, `log`, `network`, `setup`, `social`, `sysinfo`, `system`, `tools`, `view`, `vpn`.
- `utils/systemDetector.js` — `isLinux()` / `shouldUseMocks()`. Mocks are auto-enabled on non-Linux; override with `USE_MOCKS=true/false`.
- `utils/execCommand.js` — Wraps shell/Python script execution; routes through `utils/mockSystem.js` when mocks are active.

### Frontend (`webapp/src/`)
- `App.jsx` — React Router setup. Routes: `/` → Backup, `/setup` → UserInterface, `/tools` → Filesystem, `/sysinfo` → System, `/network` → Network, `/maintenance` → Maintenance, `/integrations` → ServiceConnections, `/scrape` → ScrapedUI.
- `contexts/ConfigContext.jsx` — Global config loaded from `/api/config`. Provides `config`, `constants`, `updateConfig()`, `reloadConfig()`.
- `contexts/LanguageContext.jsx` — i18n. Language JSON files live in `webapp/public/lang/` (de, en, es, fi, fr).
- `contexts/DrawerContext.jsx` — Mobile nav drawer state.
- `utils/api.js` — Axios instance with base `/api`. When `VITE_USE_MOCK_API=true`, swaps in a mock adapter from `utils/mockApi.js`.

### UI library
MUI v5 (`@mui/material`, `@mui/icons-material`) is the component library throughout the frontend. The app uses a custom MUI theme defined in `src/theme.js` (dark mode by default, with explicit typography scale). Always reach for MUI components rather than plain HTML or custom CSS.

### i18n
Every user-visible string must go through the translation hook:

```jsx
const { t } = useLanguage(); // from '../contexts/LanguageContext'
// then render as: {t('some_key')}
```

Translation keys and their strings live in `webapp/public/lang/{en,de,es,fi,fr}.json`. When adding new UI text, add the key to all language files (use the English string as the value for languages you can't translate).

### Config key conventions
All values from `ConfigContext` are strings. User-editable settings use a `conf_` prefix; system constants use a `const_` prefix. Booleans are stored as the strings `'true'` / `'false'`:

```js
config?.conf_BACKUP_CHECKSUM === 'true'   // boolean config
config?.conf_BACKUP_MOVE_FILES            // string config
constants?.const_MEDIA_DIR               // system constant
```

### Legacy asset serving
The Express server sets `WORKING_DIR` to `scripts/` (the directory shared with the PHP implementation). CSS, JS, images, and language files are served from there, not from the React build. During Vite dev, `/css`, `/js`, `/img`, and `/lang` requests are proxied to port 3000 where Express serves them out of `scripts/`.

### Script alignment
The backend must call the same Python and shell scripts in `scripts/` that the PHP implementation uses. Do not reimplement their logic in Node.js — the two interfaces need to stay aligned. New backend behaviour should be added by invoking or extending those scripts, not by replacing them.

### Scrape / PHP snapshot viewer
The `scrape/` directory (repo root) holds scraped HTML snapshots of the old PHP UI. A custom Vite plugin (`vite.config.js`) rewrites asset URLs and PHP links on the fly during dev and copies/rewrites files at build time. Snapshots are served under `/scrape/` and browsable inside the app.

### Config persistence
Device configuration is stored in `scripts/config.cfg` (INI format). The backend reads it at startup; saves go through `POST /api/config/save`.

## Mock System

On Mac/Windows, `USE_MOCKS=true` is set automatically. All shell commands, Python scripts, and hardware operations return realistic sample data from `server/utils/mockSystem.js`. The static GitHub Pages build uses `VITE_USE_MOCK_API=true` which intercepts all `axios` calls in the browser.

## E2E Tests

Playwright tests live in `webapp/tests/e2e/`. The test server starts automatically with `USE_MOCKS=true`. Tests run against `http://localhost:5173` across Chromium, Firefox, and WebKit. Mock API fixture data is in `tests/e2e/fixtures/api-responses.js`.
