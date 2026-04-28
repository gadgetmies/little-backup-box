# Plan 7 — Service Connections, Maintenance & Network Additions

Spec: `specs/2026-04-28-plan7-integrations-maintenance-network.md`  
Depends on: Plan 1 (useAsyncAction)  
Estimated effort: 1–2 days

---

## Slices

### Slice 1 — Social media general settings

**Commit: "Add social media general settings to Service Connections"**

Files to change:
- `webapp/src/pages/ServiceConnections.jsx` — add "General" sub-section at the top of the Social Media tab:
  - Publish date format `TextField` (e.g. `%Y-%m-%d`); helper text: "strftime format string"
  - Include filename in post `Checkbox`
  - Config keys: `conf_social_publish_date`, `conf_social_publish_filename`
  - Use existing config save pattern already present in `ServiceConnections.jsx`
- `webapp/public/lang/en.json` — add social general keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/plan7-additions.spec.js` — new test file:
  - Social Media tab has General section with both fields

Verification:
- `npm run dev:mock` → Social Media tab shows General section above per-service configs
- Fields save via existing config mechanism
- `npx playwright test tests/e2e/plan7-additions.spec.js`

---

### Slice 2 — Cloud per-service configuration

**Commit: "Add per-remote configuration fields to Cloud Services tab"**

Files to change:
- `webapp/src/pages/ServiceConnections.jsx` — in Cloud Services tab, for each listed rclone remote add an expandable `Accordion`:
  - Target base directory `TextField`
  - Sync method `Select`: rclone / rsync
  - Files stay in place `Checkbox`
  - Config keys derived from remote name: `conf_cloud_<name>_target_dir`, `conf_cloud_<name>_sync_method`, `conf_cloud_<name>_files_stay` (lowercase remote name, spaces → `_`)
  - Fetch remote names from existing `GET /api/cloud/remotes`; accordion title is the remote name
- `webapp/src/utils/mockApi.js` — verify `GET /api/cloud/remotes` mock exists; add if missing: `{ remotes: ['Dropbox', 'Google Drive'] }`
- `webapp/public/lang/en.json` — add cloud per-service keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/plan7-additions.spec.js` — extend:
  - Cloud Services tab shows per-remote accordions
  - Each accordion has the three config fields

Verification:
- `npm run dev:mock` → Cloud Services tab shows Dropbox and Google Drive accordions
- Expand Dropbox → three config fields visible
- Save target dir → config key `conf_cloud_dropbox_target_dir` persisted

---

### Slice 3 — Development branch update

**Commit: "Add development branch update option to UpdateManager"**

Files to change:
- `webapp/server/routes/setup.js` — extend `POST /api/setup/update/install` to accept `{ branch }` in request body and pass it to the update script
- `webapp/src/components/UpdateManager.jsx`
  - Add second button "Install development update" (outlined, warning colour); only rendered when `updateStatus.branch !== 'development'`
  - `Alert severity="warning"` above the button: "Development branch may contain unstable changes."
  - Uses `useAsyncAction`; streams log via `LogMonitor`
- `webapp/src/utils/mockApi.js` — extend `POST /api/setup/update/install` mock to handle `{ branch: 'development' }`: streams 5 log lines, 2000ms delay; failure mode `git_fetch_failed` → `{ error: 'Could not fetch from remote' }`
- `webapp/public/lang/en.json` — add dev update label keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/plan7-additions.spec.js` — extend:
  - Dev branch update button renders with warning Alert
  - `git_fetch_failed` failure shows inline error

Verification:
- `npm run dev:mock` → Maintenance page shows dev update button with warning
- Click → log streams, 2000ms (7000ms with 5000ms mock delay)
- Enable `git_fetch_failed` → inline error Alert

---

### Slice 4 — LibRaw updater component

**Commit: "Add LibRaw updater to Maintenance page"**

Files to create/change:
- `webapp/server/routes/setup.js` — add `POST /api/setup/update/libraw` → calls `scripts/install_libraw.sh` (verify script name against `cmd.php`); streams output
- `webapp/src/components/LibRawUpdater.jsx` — new component:
  - Header h2, descriptive body text (warns about 5–15 min compile time and RAW processing downtime)
  - "Update LibRaw" button using `useAsyncAction`
  - `LogMonitor` shows streaming compile output
  - Inline `Alert` on failure
- `webapp/src/pages/Maintenance.jsx` — import and render `<LibRawUpdater />` below `<UpdateManager />`
- `webapp/src/utils/mockApi.js` — `POST /api/setup/update/libraw`: streams 10 log lines over 4000ms; failure mode `compile_failed`
- `webapp/public/lang/en.json` — add libraw label keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/plan7-additions.spec.js` — extend:
  - LibRaw updater section renders on Maintenance page
  - Button triggers log streaming
  - `compile_failed` shows inline error

Verification:
- `npm run dev:mock` → LibRaw section below UpdateManager
- Click Update LibRaw → 10 log lines stream, takes ~4s (mock delay)
- Enable `compile_failed` → partial log then inline error

---

### Slice 5 — Comitup reset

**Commit: "Add Comitup WiFi reset to Network page"**

Files to change:
- `webapp/server/routes/network.js` — add `POST /api/network/comitup/reset` → calls `comitup-cli` or equivalent script (verify against `cmd.php`); no response expected (device reboots)
- `webapp/src/pages/Network.jsx`
  - Add `Accordion` at bottom of page with `WarningIcon` in summary, labelled "WiFi Reset"
  - Inside: explanation text + "Reset WiFi credentials" `Button` (colour `error`)
  - Click → MUI `Dialog` with full warning: "This will erase stored WiFi credentials and reboot into access point mode. This device will become unreachable on the current network."
  - Cancel → closes dialog
  - Confirm → `POST /api/network/comitup/reset` via `useAsyncAction`; button stays disabled after confirm; Alert "Device is rebooting into AP mode. This page will become unreachable."
- `webapp/src/utils/mockApi.js` — `POST /api/network/comitup/reset`: 1000ms delay, no response body; failure mode `service_not_configured` → `{ error: 'Comitup is not installed on this device' }`
- `webapp/public/lang/en.json` — add comitup reset keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/plan7-additions.spec.js` — extend:
  - WiFi Reset accordion present and expandable
  - Confirmation dialog shows full warning text
  - Cancel closes dialog, button re-enabled
  - `service_not_configured` shows inline error

Verification:
- `npm run dev:mock` → WiFi Reset accordion at bottom of Network page
- Expand → red Reset button
- Click → confirmation dialog with full warning
- Cancel → dialog closes, button re-enabled
- Confirm → Alert "Device is rebooting…", button permanently disabled
- Enable `service_not_configured` → inline error "Comitup is not installed"

---

### Slice 6 — WiFi info on System page

**Commit: "Add WiFi info section to System page"**

Files to change:
- `webapp/server/routes/network.js` — add `GET /api/network/wifi/info` → calls `iwconfig` or `iw` (check `sysinfo.php` for exact command); returns `{ interface, ssid, frequency, signal_level, bit_rate, connected: bool }`
- `webapp/src/pages/System.jsx` — add WiFi info card alongside existing system info cards:
  - If `connected === false`: single `Alert` "Not connected"
  - If connected: display interface, SSID, signal level (dBm), bit rate (Mbps), frequency (GHz)
  - Fetched on mount with `useAsyncAction`; refresh button re-fetches
- `webapp/src/utils/mockApi.js` — `GET /api/network/wifi/info`: `{ interface: 'wlan0', ssid: 'HomeNetwork', frequency: 5.18, signal_level: -52, bit_rate: 300, connected: true }`; failure mode: return `{ connected: false }`
- `webapp/public/lang/en.json` — add wifi info label keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/plan7-additions.spec.js` — extend:
  - WiFi info card renders with fixture SSID
  - Not-connected returns Alert

Verification:
- `npm run dev:mock` → System page has WiFi card with SSID "HomeNetwork"
- Enable not-connected failure → Alert "Not connected"
- Real hardware: card shows correct SSID and signal level
