# Plan 7 — Service Connections, Maintenance & Network Additions

**Effort:** 1–2 days  
**Depends on:** Plan 1 (useAsyncAction)  
**Blocks:** nothing

---

## What this plan delivers

- **Service Connections:** cloud per-service config, social media general settings
- **Maintenance:** development branch update, update LibRaw
- **Network:** Comitup reset
- **System page:** WiFi info section

---

## Service Connections additions

### Social media general settings

Add a "General" sub-section at the top of the Social Media tab in `ServiceConnections.jsx`:

| Field | Config key | UI | Notes |
|---|---|---|---|
| Publish date format | `conf_social_publish_date` | `TextField` | Format string e.g. `%Y-%m-%d` |
| Include filename in post | `conf_social_publish_filename` | `Checkbox` | |

Use the existing config save pattern already in `ServiceConnections.jsx`.

### Cloud per-service configuration

In the Cloud Services tab, for each configured rclone remote add an expandable details row
(MUI `Accordion` inside the remote list item):

| Field | Config key pattern | UI | Values |
|---|---|---|---|
| Target base directory | `conf_cloud_<name>_target_dir` | `TextField` | Remote path |
| Sync method | `conf_cloud_<name>_sync_method` | `Select` | rclone / rsync |
| Files stay in place | `conf_cloud_<name>_files_stay` | `Checkbox` | |

Remote names come from the existing `GET /api/cloud/remotes` response. Config keys are
constructed dynamically from the remote name (lowercase, spaces replaced with `_`).

---

## Maintenance additions

### Development branch update

Add a secondary button in `UpdateManager.jsx` next to the existing install button:

```jsx
<Button
  variant="outlined"
  color="warning"
  onClick={() => executeDevUpdate()}
  disabled={isExecutingDevUpdate}
  startIcon={showDevSpinner ? <CircularProgress size={18} /> : <BranchIcon />}
>
  {t('maintenance.update.install_dev')}
</Button>
```

Show only when `updateStatus.branch !== 'development'` (already on dev branch → button not
needed). Add a warning `Alert` above the button: "Development branch may contain unstable
changes."

Backend route: `POST /api/setup/update/install` with body `{ branch: 'development' }`.
Extend the existing route handler to accept and pass the branch parameter to the update script.

### Update LibRaw

Add a new section in `Maintenance.jsx` below `UpdateManager`:

```jsx
<LibRawUpdater />
```

New component `webapp/src/components/LibRawUpdater.jsx`:
- Header: "LibRaw"
- Body text: "Updates the RAW image processing library. This compiles from source and takes
  5–15 minutes. The device will be unable to process RAW files during the update."
- Button: "Update LibRaw" → `POST /api/setup/update/libraw`
- Streams log output via `LogMonitor`

Backend route: `POST /api/setup/update/libraw` → calls `scripts/install_libraw.sh` (verify
script name against `cmd.php`).

---

## Network addition: Comitup reset

Add a "Reset WiFi" section at the bottom of `Network.jsx`, inside a collapsed `Accordion`
labelled "WiFi Reset" with a `WarningIcon` in the summary.

Button: "Reset WiFi credentials" → confirmation dialog:

> "This will erase the stored WiFi credentials and reboot the device into access point mode.
> You will need to reconnect via the LBB hotspot to configure a new WiFi network.
> Your device will become unreachable on the current network."

On confirm: `POST /api/network/comitup/reset`. The device reboots so no success response
is expected. Show Alert: "Device is rebooting into AP mode. This page will become
unreachable." The button remains disabled after confirmation.

Backend route calls: `comitup-cli` or the equivalent shell command from `cmd.php`.

---

## System page addition: WiFi info

Add a "WiFi" card in `System.jsx` alongside the existing system info cards.

```
GET /api/network/wifi/info
Returns: { interface, ssid, frequency, signal_level, bit_rate, connected: bool }
```

Backend route calls `iwconfig` (or `iwgetid` / `iw`) — check `sysinfo.php` for the exact command.

Display fields:
- Interface name
- SSID (or "Not connected")
- Signal level (dBm)
- Bit rate (Mbps)
- Frequency (GHz)

If `connected === false`, show a single "Not connected" Alert instead of the detail fields.

---

## Mock additions

New mock endpoints:
- `POST /api/setup/update/install` with `{ branch: 'development' }` → streams 5 log lines, 2000ms delay
- `POST /api/setup/update/libraw` → streams 10 log lines (simulating compile), 4000ms delay
- `POST /api/network/comitup/reset` → 1000ms delay, no response body (simulate reboot)
- `GET /api/network/wifi/info` → `{ interface: 'wlan0', ssid: 'HomeNetwork', frequency: 5.18, signal_level: -52, bit_rate: 300, connected: true }`

Failure modes:
- `compile_failed` on LibRaw → streams partial log then error line
- `git_fetch_failed` on dev branch update → error "Could not fetch from remote"
- Comitup not installed → `service_not_configured` → error "Comitup is not installed on this device"
- WiFi not connected → `GET /api/network/wifi/info` returns `{ connected: false }`

---

## Verification

### 1. Static
- `npm run lint && npm run build` pass

### 2. Mock UI (`npm run dev:mock`)
- Service Connections → Social Media tab has "General" section at top with date format and filename fields
- Service Connections → Cloud tab: each remote has expandable row with per-service config fields
- Maintenance page: "Update (development)" button visible (not on dev branch in mock)
- Warning Alert shown above dev branch button
- Click dev update → streams log, 2000ms delay visible with 3000ms mock delay
- LibRaw section visible; body text explains duration
- Click "Update LibRaw" → streams 10 log lines, 4000ms (or 7000ms with 3000ms mock delay)
- Enable `compile_failed` → log shows failure line, inline error Alert
- Network page: "WiFi Reset" accordion at bottom
- Expand → "Reset WiFi credentials" button
- Click → confirmation dialog with full warning text
- Cancel → nothing happens, button re-enabled
- Confirm → Alert "Device is rebooting into AP mode", button stays disabled
- Enable `service_not_configured` → error "Comitup is not installed"
- System page: WiFi card shows fixture SSID, signal, bit rate
- Enable WiFi not-connected failure → card shows "Not connected" Alert

### 3. E2E tests (`webapp/tests/e2e/plan7-additions.spec.js`)
- Dev branch update button renders with warning
- LibRaw updater streams log
- Comitup reset shows confirmation dialog
- WiFi info card renders connected state
- WiFi not-connected shows Alert

### 4. Real hardware
- Dev branch update pulls from development branch
- LibRaw compile completes (allow 15 min)
- Comitup reset puts device in AP mode (verify with WiFi scan)
- WiFi info shows correct SSID and signal level
