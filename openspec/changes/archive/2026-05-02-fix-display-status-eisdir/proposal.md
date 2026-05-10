## Why

`webapp/server/routes/display.js` reads the device's display content with `readFileSync('<tmp>/display-content', 'utf-8')`, but `scripts/constants.sh` defines `const_DISPLAY_CONTENT_PATH=/var/www/little-backup-box/tmp/display-content` as a **directory** — the device-side `lib_display.py` writes timestamped `.txt` frames into it (`<uptime_centiseconds>.txt`). `readFileSync` on a directory throws `EISDIR`; the route catches the error and returns `{status: ''}`. The `<DisplayStatus>` component sees the empty string and early-returns `null`, so the status alert is **always empty on real hardware** — the "Ready" users see only appears under the mock.

## What Changes

- **Backend**: rewrite `GET /api/display/status` to treat `display-content` as a directory. List its `.txt` files, take the lexicographically last one (the device-side picker uses the same convention via `display_content_files.get_ContentFilesList()` in `scripts/lib_display.py:131`), read its contents, and return the trimmed string. Return `{status: ''}` if the directory is missing, empty, or unreadable. Old `display-content-old.txt` (when the display is disabled, scripts write there instead per `lib_display.py:77`) is read as a sibling fallback.
- **Mock**: no change to the existing mock fixture (`status: 'Ready'`).
- **Tests**: extend `webapp/tests/e2e/` mock-controlled coverage so a non-empty status renders in the alert.

Non-goals: the AppBar status icon + dropdown refactor (that's the next backlog item; this change leaves the existing per-page `<Alert>` in place).

## Capabilities

### New Capabilities
- `device-display-status`: the contract for `GET /api/display/status` — what it reads, what it returns, and how `<DisplayStatus>` renders the result.

### Modified Capabilities
<!-- None — this is a new spec for previously-undocumented behaviour. -->

## Impact

- **Backend**: `webapp/server/routes/display.js` (rewrite the handler).
- **Frontend**: no change to `webapp/src/components/DisplayStatus.jsx` (it just consumes whatever the route returns).
- **Mock**: no change to `webapp/src/utils/mockApi.js` or `webapp/server/utils/mockSystem.js`.
- **Tests**: small addition to a Playwright spec (or a new tiny spec) that asserts the alert renders the mock "Ready" string on `/`.
- **No script changes**, **no new deps**, **no route changes**.
