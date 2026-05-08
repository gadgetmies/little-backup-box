# Webapp feature catalog

This document is the canonical inventory of every user-facing capability the React webapp exposes. Use it to answer "what does this app do?" and "where does feature X live?". Page placement and section pattern are derived properties — see `page-map.md`. Component idioms (heading scale, Card vs Accordion vs Tabs) — see `ui-pattern-system.md`.

Top-level headings are user goals, not pages. Leaf entries name a single user-facing capability, with these fields:

- **Purpose** — one sentence on what the user accomplishes
- **Audience** — who would reach for this
- **UI location** — `<route>` → `<section name>` (must match a section listed in `page-map.md`)
- **Backend** — Express route(s) under `webapp/server/routes/` and script(s) under `scripts/` invoked
- **Prerequisites** — config keys, hardware, or other features that must be set up first
- **Related** — other catalog entries the reader probably wants nearby

Update this file in the same PR that adds, moves, or removes a user-facing feature.

## Run a backup

### Configure and start a backup

- **Purpose**: pick a source and target, optionally tweak file-handling and post-run options, and kick off a backup.
- **Audience**: every user; this is the device's primary job.
- **UI location**: `/` → "Run a backup" section
- **Backend**: `GET /api/backup/services`, `GET /api/backup/partitions`, `POST /api/backup/start`; `scripts/backup.py`
- **Prerequisites**: at least one source device and one valid target available.
- **Related**: Stop a running backup; Configure secondary backup destination; Save backup options as defaults.

### Stop a running backup

- **Purpose**: halt one in-progress backup process.
- **Audience**: any user who started a backup that needs to be cancelled.
- **UI location**: `/` → "Running backups" section (per-row stop button)
- **Backend**: `POST /api/backup/stop`; `scripts/backup.py`
- **Prerequisites**: at least one backup is currently running.
- **Related**: Monitor running backups.

### Monitor running backups

- **Purpose**: see which backup processes are alive right now and what their configuration is.
- **Audience**: any user who launched a backup and wants live status.
- **UI location**: `/` → "Running backups" section
- **Backend**: `GET /api/backup/running` (polled every 2 s)
- **Prerequisites**: none (renders empty when nothing is running).
- **Related**: Stop a running backup; Stream backup logs.

### View backup history

- **Purpose**: see a list of finished backup runs with the configuration each used.
- **Audience**: users reviewing what was backed up recently.
- **UI location**: `/` → "Previous runs" section
- **Backend**: `GET /api/backup/history`
- **Prerequisites**: at least one backup has completed.
- **Related**: Re-run a previous backup.

### Re-run a previous backup

- **Purpose**: start a new backup with the exact configuration of a prior run, in one click.
- **Audience**: users who repeat the same source/target combination regularly.
- **UI location**: `/` → "Previous runs" section (per-row rerun button)
- **Backend**: `POST /api/backup/start`; `scripts/backup.py`
- **Prerequisites**: backup history populated.
- **Related**: View backup history.

### Stream backup logs

- **Purpose**: read live log output from running backups.
- **Audience**: anyone debugging a backup or curious about progress.
- **UI location**: `/` → "Backup logs" section (collapsible)
- **Backend**: `GET /api/log/stream` (SSE)
- **Prerequisites**: none.
- **Related**: Monitor running backups.

### Save current backup options as defaults

- **Purpose**: persist the currently-selected file-handling, comparison, secondary-destination, and notification options as the device's defaults.
- **Audience**: users who want next time's pre-filled values to match what they just configured.
- **UI location**: `/` → "Run a backup" section → "Options" accordion → "Save as defaults" action
- **Backend**: `POST /api/config/save` (writes `conf_BACKUP_*`, `conf_POWER_OFF`, `conf_MAIL_NOTIFICATIONS`)
- **Prerequisites**: a valid backup configuration is selected.
- **Related**: Configure backup defaults (system-wide).

### Configure secondary (chained) backup destination

- **Purpose**: automatically run a follow-up backup from a local target to a remote destination (rsync server or a configured cloud remote) once the primary completes.
- **Audience**: users with off-site or off-device backup policies.
- **UI location**: `/` → "Run a backup" section → "Options" accordion → "Secondary" subsection
- **Backend**: `POST /api/backup/start` (consumes secondary fields); `scripts/backup.py`
- **Prerequisites**: rsync server configured (Connections → Cloud → rsync subsection) or at least one cloud remote configured (Connections → Cloud).
- **Related**: Configure rclone cloud remotes; Configure rsync server target.

## Browse and triage media

### Browse the media gallery

- **Purpose**: see backed-up images as a paginated grid, filtered and sorted to taste.
- **Audience**: users culling photos after a shoot.
- **UI location**: `/view` → "Gallery" section
- **Backend**: `GET /api/view/media`, `GET /api/view/images`, `GET /api/view/stats`, `GET /api/view/image?variant=thumb`
- **Prerequisites**: at least one backup completed and indexed in the media database.
- **Related**: Filter the gallery; Sort and paginate the gallery; Open a single image.

### Filter the gallery

- **Purpose**: narrow the grid by rating, date range, filename, camera model, file type, source directory, file extension, or social-publish status.
- **Audience**: any gallery user.
- **UI location**: `/view` → "Gallery" section → FilterBar
- **Backend**: `GET /api/view/images` (with filter params), `GET /api/view/stats`
- **Prerequisites**: gallery loaded.
- **Related**: Browse the media gallery.

### Sort and paginate the gallery

- **Purpose**: change sort field, sort direction, page size, and grid column count.
- **Audience**: any gallery user.
- **UI location**: `/view` → "Gallery" section → grid controls header
- **Backend**: `GET /api/view/images` (with `sort`, `dir`, `page`, `per_page` params); column count is client-side and persisted in `localStorage`.
- **Prerequisites**: gallery loaded.
- **Related**: Browse the media gallery.

### Choose backup source to view

- **Purpose**: pick which of the available backup destinations the gallery should browse.
- **Audience**: users with multiple backup mediums (USB / internal / NVMe).
- **UI location**: `/view` → "Gallery" section → medium selector in the controls header
- **Backend**: `GET /api/view/media`
- **Prerequisites**: at least one indexed backup destination.
- **Related**: Browse the media gallery.

### Open a single image

- **Purpose**: replace the grid with a single full-window image view.
- **Audience**: users inspecting one photo at a time.
- **UI location**: `/view` → "Single view" overlay (entered by clicking a grid card)
- **Backend**: `GET /api/view/image`
- **Prerequisites**: an image is selected from the grid.
- **Related**: Navigate between images; Zoom and pan; Rate an image.

### Navigate between images

- **Purpose**: step through the filtered/sorted result set with first / previous / next / last controls or arrow keys.
- **Audience**: users in single view.
- **UI location**: `/view` → "Single view" overlay → navigation controls
- **Backend**: none (uses the already-loaded result set).
- **Prerequisites**: single view is open.
- **Related**: Open a single image.

### Zoom and pan an image

- **Purpose**: magnify the displayed image and pan around the zoomed view (mouse wheel or pinch).
- **Audience**: users checking image detail.
- **UI location**: `/view` → "Single view" overlay → zoom controls
- **Backend**: `GET /api/view/image` (full-resolution variant)
- **Prerequisites**: single view is open.
- **Related**: Open a single image.

### Run a slideshow

- **Purpose**: auto-advance through the result set at a configurable interval.
- **Audience**: users presenting or reviewing a set hands-free.
- **UI location**: `/view` → "Single view" overlay → slideshow controls
- **Backend**: none (client-side timer).
- **Prerequisites**: single view is open.
- **Related**: Navigate between images.

### Rate an image

- **Purpose**: assign a 0–5-star rating (or "rejected") to the current image.
- **Audience**: photographers triaging a shoot.
- **UI location**: `/view` → "Single view" overlay → rating widget
- **Backend**: `POST /api/view/rating`
- **Prerequisites**: media database available; optionally `conf_write_rating_to_exif` to also write the rating to EXIF.
- **Related**: Comment on an image; Delete rejected images; Toggle "write rating to EXIF" (Configure backup defaults).

### Comment on an image

- **Purpose**: attach free-text notes to an image.
- **Audience**: users keeping editorial notes.
- **UI location**: `/view` → "Single view" overlay → comment field
- **Backend**: `POST /api/view/rating` (with `comment` parameter)
- **Prerequisites**: media database available.
- **Related**: Rate an image.

### Publish an image to social media

- **Purpose**: push the current image to one of the configured social-media accounts.
- **Audience**: users publishing photos on Instagram, Twitter, etc.
- **UI location**: `/view` → "Single view" overlay → SocialPublishPanel
- **Backend**: `POST /api/social/publish`, `GET /api/social/services`
- **Prerequisites**: at least one social account configured (Connections → Social).
- **Related**: Configure social media accounts and publish defaults.

### Delete rejected images

- **Purpose**: permanently remove every image marked rejected from the current medium.
- **Audience**: users finalising a triage pass.
- **UI location**: `/view` → "Gallery" section → bulk-action toolbar (only visible when rejected images exist)
- **Backend**: `POST /api/view/delete-rejected`
- **Prerequisites**: at least one rejected image present.
- **Related**: Rate an image.

## Maintain stored media

### Generate or refresh thumbnails for stored media

- **Purpose**: walk a target storage and create (or recreate) thumbnails for indexed media.
- **Audience**: users who imported media outside the normal backup flow, or whose thumbnails are stale.
- **UI location**: `/maintenance` → "Database operations" accordion
- **Backend**: `POST /api/backup/function` (`function: 'generate_thumbnails'`); `scripts/lib_database.py`
- **Prerequisites**: target storage selected; media database initialised on that target.
- **Related**: Sync the media database; Update EXIF in stored media.

### Sync the media database

- **Purpose**: re-scan a target storage and reconcile the media database with what's actually on disk.
- **Audience**: users whose database has drifted from disk content (manual deletions, file moves).
- **UI location**: `/maintenance` → "Database operations" accordion
- **Backend**: `POST /api/backup/function` (`function: 'sync'`); `scripts/lib_database.py`
- **Prerequisites**: target storage selected.
- **Related**: Generate or refresh thumbnails.

### Update EXIF in stored media

- **Purpose**: rewrite EXIF metadata on stored files using current settings.
- **Audience**: users whose backup ran before EXIF settings changed, or who toggled "write rating to EXIF" later.
- **UI location**: `/maintenance` → "Database operations" accordion
- **Backend**: `POST /api/backup/function` (`function: 'update_exif'`); `scripts/lib_database.py`
- **Prerequisites**: target storage selected.
- **Related**: Toggle "write rating to EXIF" (Configure backup defaults).

### Rename files in stored media

- **Purpose**: apply the configured rename pattern to files already on a target storage.
- **Audience**: users who didn't enable rename at backup time and want to apply it after the fact.
- **UI location**: `/maintenance` → "File operations" accordion
- **Backend**: `POST /api/backup/function` (`function: 'rename'`); `scripts/backup.py`
- **Prerequisites**: target storage selected.
- **Related**: Rename files during backup (option in Run a backup).

### Export device settings

- **Purpose**: download a single file containing the device's current `scripts/config.cfg`.
- **Audience**: users keeping a backup of their device configuration.
- **UI location**: `/maintenance` → "Settings backup" accordion → "Download settings" action
- **Backend**: `GET /api/setup/download-settings`
- **Prerequisites**: none.
- **Related**: Import device settings.

### Import device settings

- **Purpose**: upload a previously-exported config file and apply it.
- **Audience**: users restoring or migrating a device.
- **UI location**: `/maintenance` → "Settings backup" accordion → "Upload settings" action
- **Backend**: `POST /api/setup/upload-settings`
- **Prerequisites**: a previously-exported settings file.
- **Related**: Export device settings.

### Update LibRaw camera-format library

- **Purpose**: pull the latest LibRaw build so newer camera RAW formats are recognised.
- **Audience**: users with newly-released cameras whose RAW files aren't being read.
- **UI location**: `/system` → "Updates" tab
- **Backend**: `POST /api/setup/update/libraw`
- **Prerequisites**: internet connectivity.
- **Related**: Check for system updates.

## Manage storage devices

### View disk-space usage

- **Purpose**: see partition sizes, used space, and available space across all visible disks.
- **Audience**: users who need to know if a target has room for the next backup.
- **UI location**: `/storage` → "Disk usage" section
- **Backend**: `GET /api/sysinfo/diskspace`
- **Prerequisites**: none.
- **Related**: View connected block devices.

### View connected block devices

- **Purpose**: list block devices and their identifying properties (model, size, mount points).
- **Audience**: users tracing a specific device for mount, format, or repair.
- **UI location**: `/storage` → "Devices" section
- **Backend**: `GET /api/sysinfo/devices`
- **Prerequisites**: none.
- **Related**: View device health states; Mount storage as backup source/target.

### View device health states

- **Purpose**: surface SMART, wear, and other health indicators for storage devices that report them.
- **Audience**: users monitoring drive longevity.
- **UI location**: `/storage` → "Device health" section
- **Backend**: `GET /api/sysinfo/device-states`
- **Prerequisites**: device must report SMART or wear info.
- **Related**: View connected block devices.

### Mount storage as backup source

- **Purpose**: make a chosen device available to act as a backup *source*.
- **Audience**: users running a backup from a device that isn't auto-detected.
- **UI location**: `/storage` → "Mount" section → "Source" controls
- **Backend**: `POST /api/tools/mount`; `scripts/backup.py`
- **Prerequisites**: target device visible to the OS.
- **Related**: Unmount storage; Configure and start a backup.

### Mount storage as backup target

- **Purpose**: make a chosen device available to act as a backup *target*.
- **Audience**: users running a backup to a device that isn't auto-detected.
- **UI location**: `/storage` → "Mount" section → "Target" controls
- **Backend**: `POST /api/tools/mount`; `scripts/backup.py`
- **Prerequisites**: target device visible to the OS.
- **Related**: Unmount storage; Configure and start a backup.

### Unmount storage

- **Purpose**: safely eject a mounted device before unplugging.
- **Audience**: any user finishing a backup or moving a device.
- **UI location**: `/storage` → "Mount" section → per-row "Unmount" buttons
- **Backend**: `POST /api/tools/umount`
- **Prerequisites**: device is currently mounted.
- **Related**: Mount storage as backup source/target.

### Check filesystem for errors

- **Purpose**: run a non-destructive integrity check on a partition.
- **Audience**: users investigating a flaky disk.
- **UI location**: `/storage` → "Repair" section → "Check" action
- **Backend**: `POST /api/tools/fsck/check`
- **Prerequisites**: partition selected and not currently in use.
- **Related**: Repair filesystem errors.

### Repair filesystem errors

- **Purpose**: attempt automatic repair of detected filesystem errors.
- **Audience**: users with confirmed errors from the check.
- **UI location**: `/storage` → "Repair" section → "Repair" action
- **Backend**: `POST /api/tools/fsck/repair`
- **Prerequisites**: partition selected and unmounted.
- **Related**: Check filesystem for errors.

### Format a partition

- **Purpose**: erase a partition and write a new filesystem on it.
- **Audience**: users preparing fresh media.
- **UI location**: `/storage` → "Format" section
- **Backend**: `POST /api/tools/format`
- **Prerequisites**: partition selected, target filesystem type chosen, partition unmounted.
- **Related**: View connected block devices.

### Verify USB drive capacity (f3)

- **Purpose**: detect counterfeit or failing USB drives by writing and reading test patterns.
- **Audience**: users vetting cheap or unknown-source media before trusting them.
- **UI location**: `/storage` → "Verify capacity" section
- **Backend**: `POST /api/tools/f3`
- **Prerequisites**: device selected.
- **Related**: View device health states.

## Configure backup defaults (system-wide)

These settings affect every future backup; they are not per-run options.

### Set the camera-folder mask

- **Purpose**: define the folder pattern used to locate photos on connected cameras (default `DCIM`).
- **Audience**: users with non-standard camera folder layouts.
- **UI location**: `/preferences` → "Backup defaults" card → "Camera folder mask"
- **Backend**: `POST /api/config/save` (writes `conf_camera_folder_mask`)
- **Prerequisites**: none.
- **Related**: Configure and start a backup.

### Set the target free-space minimum

- **Purpose**: refuse to start a backup if the target has less than the chosen amount of free space.
- **Audience**: users protecting against accidental over-fill.
- **UI location**: `/preferences` → "Backup defaults" card → "Target free-space minimum"
- **Backend**: `POST /api/config/save` (writes `conf_target_size_minimum`)
- **Prerequisites**: none.
- **Related**: Configure and start a backup.

### Set idle power-off threshold

- **Purpose**: auto-shutdown the device after the chosen number of minutes of inactivity.
- **Audience**: battery-powered users.
- **UI location**: `/preferences` → "Backup defaults" card → "Idle power-off"
- **Backend**: `POST /api/config/save` (writes `conf_idle_power_off`)
- **Prerequisites**: none.
- **Related**: Power off after backup (option in Run a backup).

### Set default backup mode per source/target pair

- **Purpose**: pick the default copy/move mode for every (source, target) combination, so the Backup page pre-fills correctly.
- **Audience**: users with mixed workflows across media types.
- **UI location**: `/preferences` → "Backup defaults" card → "Default mode" subsection (matrix)
- **Backend**: `POST /api/config/save` (writes `conf_default_backup_*` keys)
- **Prerequisites**: none.
- **Related**: Configure and start a backup.

### Toggle "write rating to EXIF"

- **Purpose**: persist gallery star-ratings into image EXIF metadata, not just the local DB.
- **Audience**: users who want ratings to travel with the file.
- **UI location**: `/preferences` → "Backup defaults" card → "Write rating to EXIF"
- **Backend**: `POST /api/config/save` (writes `conf_write_rating_to_exif`)
- **Prerequisites**: none.
- **Related**: Rate an image.

## Configure connectivity

### Set the WiFi country (regulatory domain)

- **Purpose**: set the regulatory domain so WiFi behaves correctly for the user's location.
- **Audience**: users setting up a new device or moving regions.
- **UI location**: `/network` → "WiFi" card → country selector
- **Backend**: `POST /api/config/save`; `scripts/setup.sh`
- **Prerequisites**: WiFi adapter present.
- **Related**: View WiFi interface info.

### View WiFi interface info

- **Purpose**: show the current WiFi adapter's status (SSID, signal, bitrate, frequency, IP).
- **Audience**: users diagnosing WiFi issues.
- **UI location**: `/network` → "WiFi" card → status panel
- **Backend**: `GET /api/sysinfo/wifi`, `GET /api/network/wifi/info`
- **Prerequisites**: WiFi adapter present.
- **Related**: Set the WiFi country; Reset WiFi to access-point mode.

### View internet connectivity status

- **Purpose**: confirm whether the device currently has working outbound internet.
- **Audience**: users diagnosing why a cloud or update operation fails.
- **UI location**: `/network` → "Internet" card
- **Backend**: `GET /api/network/internet-status`
- **Prerequisites**: none.
- **Related**: Check for system updates.

### View device IP addresses and access links

- **Purpose**: list every IPv4/IPv6 address the device has and offer one-click links (HTTPS, HTTP, SMB, FTP).
- **Audience**: users connecting from another machine.
- **UI location**: `/network` → "Access" card → "IP addresses" subsection
- **Backend**: `GET /api/network/ips`
- **Prerequisites**: none.
- **Related**: View QR codes for device access.

### View QR codes for device access

- **Purpose**: render scannable QR codes for the device's URLs to make mobile access trivial.
- **Audience**: phone/tablet users.
- **UI location**: `/network` → "Access" card → "QR codes" subsection
- **Backend**: `GET /api/network/qr-links`
- **Prerequisites**: device IPs known.
- **Related**: View device IP addresses and access links.

### Reset WiFi to access-point mode

- **Purpose**: reboot the WiFi stack into the comitup AP-mode so the device becomes its own hotspot for first-time setup or recovery.
- **Audience**: users who lost WiFi credentials or are setting up the device fresh.
- **UI location**: `/network` → "WiFi" card → "Reset to AP mode" accordion (rare action)
- **Backend**: `POST /api/network/comitup/reset`; `scripts/comitup-reset.sh`
- **Prerequisites**: comitup tool installed.
- **Related**: View WiFi interface info.

### Configure VPN

- **Purpose**: install, enable, or disable an OpenVPN client configuration.
- **Audience**: users tunnelling backup traffic through a VPN.
- **UI location**: `/network` → "VPN" card
- **Backend**: `webapp/server/routes/vpn.js`
- **Prerequisites**: VPN configuration file from your provider.
- **Related**: Configure rclone cloud remotes (often used together).

## Configure integrations

### Configure SMTP and email-notification recipients

- **Purpose**: set the SMTP server, security mode, credentials, sender, recipient, and timeout for email notifications.
- **Audience**: users who want backup-completion emails.
- **UI location**: `/integrations` → "Mail" tab
- **Backend**: `POST /api/config/save` (writes `conf_SMTP_*`, `conf_MAIL_*`)
- **Prerequisites**: an SMTP account.
- **Related**: Send a test email; Enable email notifications for backup (option in Run a backup).

### Send a test email

- **Purpose**: verify the configured SMTP setup by sending a test message.
- **Audience**: users finishing email setup.
- **UI location**: `/integrations` → "Mail" tab → "Send test mail" action
- **Backend**: `POST /api/setup/test-mail`
- **Prerequisites**: SMTP fields filled in.
- **Related**: Configure SMTP and email-notification recipients.

### Configure rclone cloud remotes

- **Purpose**: create, edit, or remove rclone remotes (Google Drive, Dropbox, S3, etc.) used as backup destinations.
- **Audience**: users with off-site cloud backup.
- **UI location**: `/integrations` → "Cloud" tab
- **Backend**: `GET /api/cloud/remotes`, `POST /api/cloud/*`; `rclone` CLI under the hood
- **Prerequisites**: cloud provider credentials.
- **Related**: Open the rclone GUI (external sidebar link); Configure secondary backup destination.

### Configure rsync server target

- **Purpose**: configure an rsync server (host, port, username, password) as a secondary backup destination.
- **Audience**: users with their own NAS or rsync host.
- **UI location**: `/integrations` → "Cloud" tab → "rsync" subsection
- **Backend**: `POST /api/config/save` (writes `conf_RSYNC_*`)
- **Prerequisites**: an rsync server reachable from the device.
- **Related**: Configure secondary backup destination.

### Configure social media accounts and publish defaults

- **Purpose**: link social-media accounts (Instagram, Twitter, etc.) and configure default captions, hashtags, and publishing options.
- **Audience**: users publishing photos.
- **UI location**: `/integrations` → "Social" tab
- **Backend**: `webapp/server/routes/social.js`; `scripts/social_*.py`
- **Prerequisites**: account credentials (OAuth tokens, API keys).
- **Related**: Publish an image to social media.

## Configure device hardware

### Configure the physical display

- **Purpose**: configure rotation, brightness, and other settings of the device's attached display.
- **Audience**: users with a touchscreen or HDMI display.
- **UI location**: `/hardware` → "Display" card
- **Backend**: `POST /api/config/save` (`conf_DISPLAY_*`); `scripts/display_*.py`
- **Prerequisites**: a display attached.
- **Related**: Enable virtual keyboard (Personal preferences).

### Configure hardware buttons

- **Purpose**: choose which device action each physical button triggers.
- **Audience**: users with the optional button hardware.
- **UI location**: `/hardware` → "Buttons" card
- **Backend**: `POST /api/config/save` (`conf_BUTTON_*`); `scripts/buttons.py`
- **Prerequisites**: button hardware connected.
- **Related**: Configure the physical display.

### Configure fan control

- **Purpose**: set the temperature threshold and GPIO pin used for PWM fan control.
- **Audience**: users with a PWM-controlled fan.
- **UI location**: `/hardware` → "Fan" card
- **Backend**: `POST /api/config/save` (`conf_FAN_PWM_TEMP_C`, `conf_FAN_GPIO_PIN`)
- **Prerequisites**: PWM fan connected.
- **Related**: View system information.

## Manage device lifecycle

### View system information

- **Purpose**: see CPU model, temperature, load, RAM, swap, and overall system condition flags.
- **Audience**: anyone diagnosing performance or thermal issues.
- **UI location**: `/system` → "Device" tab
- **Backend**: `GET /api/sysinfo/system`
- **Prerequisites**: none.
- **Related**: View connected cameras and smartphones.

### View connected cameras and smartphones

- **Purpose**: list cameras/phones currently connected over USB, with their storage paths and the folder-sync pattern to use as a preset.
- **Audience**: users configuring presets for a specific camera.
- **UI location**: `/system` → "Cameras" tab
- **Backend**: `GET /api/sysinfo/cameras`
- **Prerequisites**: camera connected via USB.
- **Related**: Configure and start a backup.

### Copy camera storage pattern to clipboard

- **Purpose**: copy a camera's folder-sync pattern to the clipboard so it can be pasted into a preset elsewhere.
- **Audience**: users wiring up source presets.
- **UI location**: `/system` → "Cameras" tab → per-device copy button
- **Backend**: none (client-side clipboard).
- **Prerequisites**: camera detected.
- **Related**: View connected cameras and smartphones.

### Check for system updates

- **Purpose**: query upstream to see whether a newer release is available.
- **Audience**: anyone keeping the device current.
- **UI location**: `/system` → "Updates" tab → "Check" action
- **Backend**: `GET /api/setup/update-check`
- **Prerequisites**: internet connectivity.
- **Related**: Install system updates.

### Install system updates

- **Purpose**: apply a previously-detected update.
- **Audience**: anyone keeping the device current.
- **UI location**: `/system` → "Updates" tab → "Install" action
- **Backend**: `POST /api/setup/update/install`, `GET /api/setup/update/status`
- **Prerequisites**: an update is available.
- **Related**: Check for system updates.

### Reboot the device

- **Purpose**: cleanly reboot the device.
- **Audience**: anyone after a config change that requires it, or to recover from a hung state.
- **UI location**: AppBar → power menu → "Reboot" (always available)
- **Backend**: `POST /api/system/reboot`
- **Prerequisites**: none. Warns if backups are running.
- **Related**: Power off the device; Stop a running backup.

### Power off the device

- **Purpose**: cleanly shut the device down.
- **Audience**: end-of-session or before unplugging.
- **UI location**: AppBar → power menu → "Power off" (always available)
- **Backend**: `POST /api/system/shutdown`
- **Prerequisites**: none. Warns if backups are running.
- **Related**: Reboot the device.

### Stop the LBB process

- **Purpose**: terminate the Little Backup Box service without rebooting/powering off the host.
- **Audience**: developers, or users letting another service take over.
- **UI location**: AppBar → power menu → "Stop LBB"
- **Backend**: `POST /api/setup/exit-lbb`
- **Prerequisites**: none. Warns if backups are running.
- **Related**: Reboot the device.

### Log out

- **Purpose**: clear the browser's HTTP basic-auth cache for the device.
- **Audience**: shared-device users.
- **UI location**: AppBar → power menu → "Logout"
- **Backend**: client-side (`http://logout@host` trick).
- **Prerequisites**: none.
- **Related**: Stop the LBB process.

### View live logs

- **Purpose**: stream the device's logs in the browser for live monitoring or debugging.
- **Audience**: developers and users diagnosing issues.
- **UI location**: `/system` → "Logs" tab
- **Backend**: `GET /api/log/stream`
- **Prerequisites**: none.
- **Related**: Stream backup logs.

### Set log level

- **Purpose**: tune logging verbosity (ERROR / WARNING / INFO / DEBUG).
- **Audience**: developers debugging.
- **UI location**: `/system` → "Logs" tab → "Log level" control
- **Backend**: `POST /api/config/save` (writes `conf_log_level`)
- **Prerequisites**: none.
- **Related**: View live logs.

### Toggle log sync

- **Purpose**: enable/disable shipping logs to an external server.
- **Audience**: deployments collecting logs centrally.
- **UI location**: `/system` → "Logs" tab → "Log sync" control
- **Backend**: `POST /api/config/save` (writes `conf_log_sync`)
- **Prerequisites**: external log target configured at the OS level.
- **Related**: Set log level.

### Keep display images for debugging

- **Purpose**: retain the on-display image artefacts so a developer can inspect what the front display rendered.
- **Audience**: display-firmware developers.
- **UI location**: `/system` → "Logs" tab → "Keep display images" control
- **Backend**: `POST /api/config/save` (writes `conf_display_images_keep`)
- **Prerequisites**: device has a front display.
- **Related**: Configure the physical display.

## Personal preferences

### Set UI language

- **Purpose**: change the interface language (English, German, Spanish, Finnish, French) or auto-detect from the browser.
- **Audience**: every user.
- **UI location**: AppBar → language menu, *and* `/preferences` → "Display" card → "Language"
- **Backend**: `POST /api/config/save` (writes `conf_LANGUAGE`); also persists to `localStorage` (`lbb-language`).
- **Prerequisites**: none.
- **Related**: Set UI theme.

### Set UI theme

- **Purpose**: switch between Light, Dark, System, and Sepia themes.
- **Audience**: every user.
- **UI location**: AppBar → theme menu, *and* `/preferences` → "Display" card → "Theme"
- **Backend**: `POST /api/config/save` (writes `conf_THEME`); also persists to `localStorage` (`lbb-theme`).
- **Prerequisites**: none.
- **Related**: Set UI language.

### Set the device timezone

- **Purpose**: configure the device's system timezone so timestamps in logs and EXIF are correct.
- **Audience**: any user; mandatory after first install.
- **UI location**: `/preferences` → "Display" card → "Timezone"
- **Backend**: `POST /api/config/save` (writes `conf_timezone`)
- **Prerequisites**: none.
- **Related**: Set UI language.

### Set background image

- **Purpose**: pick an on-disk image to use as the UI background.
- **Audience**: users personalising the UI.
- **UI location**: `/preferences` → "Display" card → "Background image"
- **Backend**: `POST /api/config/save` (writes `conf_background_image`)
- **Prerequisites**: an image file accessible to the device.
- **Related**: Set UI theme.

### Toggle popup messages

- **Purpose**: turn UI toast/popup notifications on or off.
- **Audience**: users who find toasts noisy.
- **UI location**: `/preferences` → "Display" card → "Popup messages"
- **Backend**: `POST /api/config/save` (writes `conf_popup_messages`)
- **Prerequisites**: none.
- **Related**: Enable email notifications for backup (the silent alternative).

### Enable virtual keyboard

- **Purpose**: show an on-screen keyboard for touchscreen-only deployments.
- **Audience**: users with touchscreen-only setups.
- **UI location**: `/preferences` → "Display" card → "Virtual keyboard"
- **Backend**: `POST /api/config/save` (writes `conf_VIRTUAL_KEYBOARD_ENABLED`)
- **Prerequisites**: touchscreen.
- **Related**: Configure the physical display.

## Open external tools

### Open the system file browser

- **Purpose**: open the legacy PHP file browser in a new tab for free-form file management.
- **Audience**: users moving files around outside the backup workflow.
- **UI location**: Sidebar → "Files" (external link icon)
- **Backend**: `/files` (PHP file browser served by the legacy stack)
- **Prerequisites**: file browser service running on the device.
- **Related**: Manage storage devices.

### Open the rclone GUI

- **Purpose**: open the rclone built-in web GUI in a new tab for advanced remote configuration.
- **Audience**: users tweaking cloud remotes beyond what the React UI exposes.
- **UI location**: Sidebar → "rclone GUI" (external link icon, with credentials info tooltip)
- **Backend**: `/frame.php?page=rclone_gui` (PHP wrapper around the rclone GUI)
- **Prerequisites**: rclone GUI service running.
- **Related**: Configure rclone cloud remotes.

### Browse legacy PHP-UI snapshots

- **Purpose**: open the embedded snapshot of the older PHP-based UI for cross-reference during the migration.
- **Audience**: developers and migration testers.
- **UI location**: `/scrape` → snapshot list
- **Backend**: static HTML under `scrape/` rewritten by Vite
- **Prerequisites**: snapshots present in `scrape/`.
- **Related**: (none — reference-only)
