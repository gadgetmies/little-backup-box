# PHP → webapp parity audit (October 2026)

A fresh, code-level comparison of the legacy PHP UI (`scripts/*.php`) with the React/Node webapp (`webapp/`) on `main` after PR #144. It supersedes the older gap analysis in `webapp/MISSING/`, most of which has since been implemented.

Method: every user-visible control, option, info row, and side effect in `index.php`, `view.php`, `setup.php`, `tools.php`, `sysinfo.php`, `cmd.php`, and the `sub-*.php` includes was traced to the script or command it calls. Each one was then checked against the webapp's UI **and** its backend route. A control with no working backend counts as a gap.

All gaps are closed together on `feature/php-parity`. The "Area" column below groups them by the part of the app they touch:

| Area | Scope |
| --- | --- |
| **A** | Config save path, config keys, Preferences, Security, hotspot password, settings restore |
| **B** | Backup page, Maintenance database operations |
| **C** | Library (gallery + single view) |
| **D** | Protected commands, Storage / System / Menu / logs |

## 1. Broken today: controls exist but don't reach the scripts

These are the most urgent, because the UI looks complete but nothing happens on the device.

| Gap | PHP reference | Area |
| --- | --- | --- |
| Saved config is never reloaded. `GET /api/config` returns startup values until restart | `setup.php` reloads after `write_config` | A |
| `ini.stringify` escapes `;` and drops quotes. This corrupts the cloud keys packed with `\|;\|`, the camera folder mask, and any value that `set_hardware.sh` sources | `setup.php:322-420` | A |
| Booleans are parsed as JS booleans, but the UI compares strings, so toggles render as "off" | — | A |
| Preferences, log, and fan settings write keys that no script reads: `conf_timezone`, `conf_popup_messages`, `conf_background_image`, `conf_camera_folder_mask`, `conf_target_size_minimum`, `conf_idle_power_off`, `conf_write_rating_to_exif`, `conf_log_level`, `conf_log_sync`, `conf_display_images_keep`, `conf_FAN_GPIO_PIN`, `conf_default_backup_*`, `conf_social_publish_*`, `conf_cloud_*` | `setup.php` | A |
| Timezone and WiFi country are saved but never applied (`raspi-config nonint …`) | `setup.php:107-116` | A |
| Hardware and display settings are not applied after save (`set_hardware.sh`, display restart) | `setup.php:87, 445` | A |
| Choosing a specific partition sends `--SourceName selected_partition`, which `backup.py` rejects | `index.php:333-375` | B |
| Maintenance → thumbnails / database / EXIF send `generate` / `sync` / `update` as `--SourceName`, which `backup.py` rejects | `index.php:395-418` | B |
| A list of two or more social services is parsed on newlines, but the script separates them with `;` | `lib_socialmedia.py:300` | B |
| The single view shows a placeholder image instead of the photo | `view.php:1262-1282` | C |
| Rating and comment are read from `rating` / `comment`, but the database columns are `LbbRating` / `Comment`, so every image looks unrated | `view.php:345-346` | C |
| Ratings are always written to the file because the setting is checked under the wrong key | `view.php:672-713` | C |
| Medium paths `/media/usb` etc. don't exist; PHP uses `usb_target`, `usb_source`, … | `view.php:563-636` | C |
| The date filter never matches the stored date formats `YYYY:MM:DD` / `YYYY_MM_DD` | `view.php:981-990` | C |
| Filters are dropped when single view or slideshow crosses a page boundary | `view.php:878-910` | C |
| Social publishing calls scripts that have no CLI; PHP queues images through the `social_publish` bitmask instead | `view.php:293-339`, `backup.py:804-834` | C |
| fsck / format / f3 chain steps with `&&`, so the display stop message and the `FINISHED` line are skipped when a step fails | `cmd.php:333-359` | D |
| smartctl's exit code is non-zero for many USB drives, and those drives disappear from Device health | `sysinfo.php:115-153` | D |
| `routes/cmd.js` is unused and its update commands are broken | `cmd.php:297-307` | D |
| The Storage selectors are empty in the static demo (mocks match the full URL) | — | D |

## 2. Missing functionality

| Feature | PHP reference | Webapp home | Area |
| --- | --- | --- | --- |
| Cloud (rclone) and rsync as backup **source** | `index.php:74-95` | `/` Run a backup | B |
| Cloud, rsync, and social media as backup **target**, including the Telegram chat / Matrix room shown under the target | `index.php:97-101, 212-253` | `/` Run a backup | B |
| Per-run Telegram chat override (`--telegram-chat-id`) | `index.php:431-439` | `/` Options | B |
| Stop all backups (`stop_backup.sh`: LED, display, FTP cleanup); stop the running backup before starting a new one | `index.php:259, 488, 538, 544` | `/` Running backups | B |
| Main help text; rename warning tooltip | `index.php:300, 459-464` | `/` | B |
| Video and audio playback, text preview, low-resolution notices, GoPro `.LRV` proxy | `view.php:1286-1368` | `/view` single view | C |
| Full EXIF / metadata table | `view.php:1376-1387` | `/view` single view | C |
| Download original | `view.php:364-369` | `/view` single view | C |
| Fullscreen overlay with slideshow | `view.php:383-387` | `/view` single view | C |
| Delete rejected, scoped to the current page, including `tims/` and `.xmp` | `view.php:718-735` | `/view` | C |
| Faceted filter counts, "any metadata field" filter, empty camera, stripped directory paths | `view.php:420-434, 608-618, 1037-1119` | `/view` filters | C |
| Date group headers, comment indicator, social state icons on grid cards | `view.php:1196-1243`, `sub-view-icons.php` | `/view` gallery | C |
| Database init / upgrade when a medium is opened (`lib_view.py --action init`) | `view.php:646` | `/view` | C |
| Default backup at startup (source → target, move) and secondary default | `setup.php:724-841` | `/preferences` Backup defaults | A |
| Convert HEIC for viewer (`conf_VIEW_CONVERT_HEIC`) | `setup.php:1400-1402` | `/preferences` Backup defaults | A |
| Background image picker listing `bg-images/` | `setup.php:873-885` | `/preferences` Display | A |
| Device password set / remove (`lib_password.py`) | `setup.php:270-289, 1836-1856` | `/preferences` Security (new tab) | A |
| WiFi hotspot password, static or dynamic (`lib_comitup.py --config`) | `setup.php:290-302, 1760-1800` | `/network` WiFi | A |
| Full settings restore: rclone, buttons, VPN, backgrounds, migration, password reapply | `setup.php:456-596` | `/maintenance` Settings | A |
| Matrix access-token fetcher (homeserver login) | `sub-matrix-token.php`, `matrix_get_token.php` | `/integrations` Social | A |
| Popup messages setting honoured | `sub-popup.php` | global | A |
| Password gate for format, fsck repair, f3, updates, LibRaw, and comitup reset | `cmd.php:98-249` | dialog used by Storage / System / Network | D |
| Command output shown live (`const_CMD_LOGFILE`) | `cmd.php:258, 549` | same dialog | D |
| "Email me the result" (`lib_mail.py`) | `cmd.php:189-200, 551-565` | same dialog | D |
| LibRaw update and comitup reset run in the background with display messages | `cmd.php:309-313, 528-537` | `/system`, `/network` | D |
| "Update available" indicator in the menu | `sub-menu.php:79-85` | sidebar badge | D |
| Comitup WiFi portal link | `sub-menu.php:64-70` | sidebar + `/network` | D |
| Software branch indicator | `sub-footer.php:52-54` | AppBar | D |
| Live image of the device display | `sub-display.php` | AppBar display popover | D |
| rclone GUI link to `/rclone/` instead of `frame.php` | `frame.php:39-43` | sidebar | D |
| Log download; clear keeps the header line; log endpoints restricted to known files | `sub-logmonitor.php:30-41` | LogMonitor | D |
| Camera details (auto-detect line, serial pattern, explanations) | `sysinfo.php:160-249` | `/system` Cameras | D |
| System info auto-refresh | `sysinfo.php:46` | `/system`, `/storage` Info | D |
| Translated Storage help and messages | `tools.php:239-244` | `/storage` | D |

## 3. Not carried over (intentional)

- **Virtual keyboard (KioskBoard)**: the Preferences toggle exists, but the on-screen keyboard itself is only useful on the device's local kiosk browser. It is tracked in `openspec/BACKLOG.md` rather than in these PRs.
- **Inline Telegram/Matrix forms on the home page**: these are covered by the target selector and per-run chat override (B) plus the full forms under Connections.
- **`frame.php` embedding**: the webapp links to `/files`, `/rclone/`, and `/comitup/` directly.

## 4. Design

The UI for the new pieces follows `ui-pattern-system.md`: MUI only, `PageSection` / `SectionHeader`, the destructive-action warning-icon convention, and ≥44 px touch targets. The mockups covered six screens:

1. Backup: grouped source / target selects (Local · Network · Social), partition and per-run Telegram options, "Stop all backups".
2. Library single view: media stage with low-resolution notice; side panel with Comment, Publish to social media (queued / published chips), and File info with "show all fields".
3. Protected command dialog: password, "email me the result", then live command output.
4. Preferences → Security (device password) and Network → WiFi hotspot password.
5. Preferences → Backup defaults rebuilt on the real config keys.
6. App shell: update badge, branch chip, device display popover, comitup portal link.
