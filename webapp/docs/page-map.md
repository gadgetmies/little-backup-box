# Webapp page map

This document is the canonical assignment of every catalog feature to one page and one section. It also defines the route table, the AppBar page-title strings, and the sidebar order.

The route table is allowed to evolve, but every change must update both this file and `webapp/src/App.jsx` in the same PR. Each section names the UI pattern it uses (`PageSection.plain`, `PageSection.card`, `PageSection.accordion`, `Tabs`) — the rubric for choosing one is in `ui-pattern-system.md`.

## Conventions

- Sidebar order is task-frequency descending: most-used pages at the top, configuration and admin pages below, external links last.
- Each page has exactly one h1 — the AppBar page title — and the page body never duplicates it.
- Every feature in `feature-catalog.md` appears in exactly one (page, section) pair below. Cross-references are one-line pointers, not implementations.
- Routes that were renamed in this redesign list their prior path under "Legacy redirects". Redirects live for one release.
- "Section pattern" values: `PageSection.plain` (just spacing), `PageSection.card` (boxed peer), `PageSection.accordion` (collapsible, persisted), `Tabs` (mutually exclusive panels).

## Sidebar order

| Position | Route | Page title | Sidebar key |
| --- | --- | --- | --- |
| 1 | `/` | Backup | `mainmenue.main` |
| 2 | `/view` | Library | `mainmenue.gallery` |
| 3 | `/maintenance` | Maintenance | `mainmenue.maintenance` |
| 4 | `/integrations` | Integrations | `mainmenue.integrations` |
| 5 | `/devices` | Devices | `mainmenue.devices` |
| 6 | `/storage` | Storage | `mainmenue.storage` |
| 7 | `/network` | Network | `mainmenue.network` |
| 8 | `/system` | System | `mainmenue.system` |
| 9 | `/preferences` | Preferences | `mainmenue.preferences` |
| 10 | `/scrape` | Legacy UI | `mainmenue.scrape` |
| ext | `/files` | Files (external) | `mainmenue.filebrowser` |
| ext | `/frame.php?page=rclone_gui` | rclone GUI (external) | `mainmenue.rclone_gui` |

External links always appear after internal links and never highlight as the active route.

The AppBar also exposes a global power menu (Reboot, Power off, Stop LBB, Logout) that is not per-page; see the catalog entries under "Manage device lifecycle".

## Pages

### `/` — Backup

- **Sidebar position**: 1
- **Purpose**: configure and start a backup, monitor what's running, and review history.
- **Legacy redirects**: none.

| # | Section | Pattern | Features assigned |
| --- | --- | --- | --- |
| 1 | Run a backup | `PageSection.plain` | Configure and start a backup |
| 2 | Options | `PageSection.accordion` (`lbb-accordion-backup-options`, default collapsed) | Save current backup options as defaults; Configure secondary (chained) backup destination |
| 3 | Running backups | `PageSection.plain` (only renders when backups are running) | Stop a running backup; Monitor running backups |
| 4 | Previous runs | `PageSection.plain` (only renders when history exists) | View backup history; Re-run a previous backup |
| 5 | Backup logs | `PageSection.accordion` (`lbb-accordion-backup-logs`, default collapsed) | Stream backup logs |

Cross-references on this page:
- File-handling toggles inside section 1 (copy/move, rename, thumbnails, EXIF, comparison method, power off, email notification) are per-run and live with "Configure and start a backup". The system-wide *defaults* for these live at `/preferences` → "Backup defaults" — see catalog under "Configure backup defaults".

### `/view` — Library

- **Sidebar position**: 2
- **Purpose**: browse, filter, rate, comment on, and publish backed-up media.
- **Legacy redirects**: none.

| # | Section | Pattern | Features assigned |
| --- | --- | --- | --- |
| 1 | Gallery | `PageSection.plain` | Browse the media gallery; Filter the gallery; Sort and paginate the gallery; Choose backup source to view; Delete rejected images |
| 2 | Single view | overlay (not a `PageSection`; entered from the Gallery) | Open a single image; Navigate between images; Zoom and pan an image; Run a slideshow; Rate an image; Comment on an image; Publish an image to social media |

The Single view is a full-window overlay rather than a peer section; this is the one documented exception to the "every section is a `PageSection`" rule and is justified by Plan 04 owning this page.

### `/maintenance` — Maintenance

- **Sidebar position**: 3
- **Purpose**: post-backup cleanup, library reconciliation, settings backup, and library updates.
- **Legacy redirects**: none.

| # | Section | Pattern | Features assigned |
| --- | --- | --- | --- |
| 1 | Database operations | `PageSection.accordion` (`lbb-accordion-maintenance-database`, default collapsed) | Generate or refresh thumbnails for stored media; Sync the media database; Update EXIF in stored media |
| 2 | File operations | `PageSection.accordion` (`lbb-accordion-maintenance-files`, default collapsed) | Rename files in stored media |
| 3 | Settings backup | `PageSection.accordion` (`lbb-accordion-maintenance-settings`, default collapsed) | Export device settings; Import device settings |
| 4 | Updates | `PageSection.accordion` (`lbb-accordion-maintenance-updates`, default collapsed) | Update LibRaw camera-format library |

System-software updates (the OS-level update flow) live on `/system` rather than here, because they're a device-lifecycle concern; LibRaw lives here because it's a stored-media concern.

### `/integrations` — Integrations

- **Sidebar position**: 4
- **Purpose**: connect the device to external services (cloud destinations, social platforms, mail, VPN).
- **Legacy redirects**: none.

This page uses `Tabs` because the four panels are mutually exclusive views of the same subject (third-party connections), and stacking them all would make a long scroll of unrelated forms. The page header lists all four tab labels so users do not miss content under inactive tabs. Selected tab persists in `localStorage` under `lbb-tabs-integrations`.

| # | Tab label | Features assigned |
| --- | --- | --- |
| 1 | Cloud | Configure rclone cloud remotes; Configure rsync server target |
| 2 | Social | Configure social media accounts and publish defaults |
| 3 | Mail | Configure SMTP and email-notification recipients; Send a test email |
| 4 | VPN | (cross-reference) — VPN is on `/network` because it's a connectivity primitive, not a third-party integration |

> Note: VPN was originally placed under `/integrations` in design.md Decision 5, but on closer reading the catalog treats VPN as a connectivity layer used by other integrations rather than a peer of mail/social/cloud. The page-map authority moves VPN to `/network`. The Integrations page lists it with a one-line pointer instead of a real tab — three tabs (Cloud / Social / Mail) is the active count.

### `/devices` — Devices

- **Sidebar position**: 5
- **Purpose**: configure the device's physical hardware peripherals (display, buttons, fan).
- **Legacy redirects**: none (newly introduced page; content moved out of `/setup`).

| # | Section | Pattern | Features assigned |
| --- | --- | --- | --- |
| 1 | Display | `PageSection.card` | Configure the physical display |
| 2 | Buttons | `PageSection.card` | Configure hardware buttons |
| 3 | Fan | `PageSection.card` | Configure fan control |

Three peer sections of similar weight that the user typically wants visible together — the Card pattern fits.

### `/storage` — Storage

- **Sidebar position**: 6
- **Purpose**: inspect, mount, repair, format, and verify storage devices.
- **Legacy redirects**: `/tools` → `/storage`.

| # | Section | Pattern | Features assigned |
| --- | --- | --- | --- |
| 1 | Disk usage | `PageSection.card` | View disk-space usage |
| 2 | Devices | `PageSection.card` | View connected block devices |
| 3 | Device health | `PageSection.card` | View device health states |
| 4 | Mount | `PageSection.accordion` (`lbb-accordion-storage-mount`, default collapsed) | Mount storage as backup source; Mount storage as backup target; Unmount storage |
| 5 | Repair | `PageSection.accordion` (`lbb-accordion-storage-repair`, default collapsed) | Check filesystem for errors; Repair filesystem errors |
| 6 | Format | `PageSection.accordion` (`lbb-accordion-storage-format`, default collapsed) | Format a partition |
| 7 | Verify capacity | `PageSection.accordion` (`lbb-accordion-storage-f3`, default collapsed) | Verify USB drive capacity (f3) |

Top three (read-only inspection) are always visible Cards; the four operational sections are progressively-disclosed Accordions because they're rarely needed and each carries destructive actions.

### `/network` — Network

- **Sidebar position**: 7
- **Purpose**: configure WiFi, see addresses and connectivity, configure VPN.
- **Legacy redirects**: none.

| # | Section | Pattern | Features assigned |
| --- | --- | --- | --- |
| 1 | Internet | `PageSection.card` | View internet connectivity status |
| 2 | Access | `PageSection.card` | View device IP addresses and access links; View QR codes for device access |
| 3 | WiFi | `PageSection.card` | Set the WiFi country (regulatory domain); View WiFi interface info |
| 4 | VPN | `PageSection.card` | Configure VPN |
| 5 | WiFi recovery | `PageSection.accordion` (`lbb-accordion-network-wifi-recovery`, default collapsed) | Reset WiFi to access-point mode |

Peer Cards for the four routine sections; the AP-mode reset is rare and destructive (locks you out of WiFi until reconfigured), so it's an Accordion.

### `/system` — System

- **Sidebar position**: 8
- **Purpose**: device telemetry, software updates, and log inspection.
- **Legacy redirects**: `/sysinfo` → `/system`.

| # | Section | Pattern | Features assigned |
| --- | --- | --- | --- |
| 1 | Device info | `PageSection.card` | View system information |
| 2 | Connected devices | `PageSection.card` | View connected cameras and smartphones; Copy camera storage pattern to clipboard |
| 3 | Updates | `PageSection.accordion` (`lbb-accordion-system-updates`, default collapsed) | Check for system updates; Install system updates |
| 4 | Logs | `PageSection.card` | View live logs; Set log level; Toggle log sync; Keep display images for debugging |

Reboot / Power off / Stop LBB / Logout do not live on this page — they live in the AppBar power menu and are accessible from anywhere. They are catalogued under "Manage device lifecycle" but their UI location is "AppBar → power menu".

### `/preferences` — Preferences

- **Sidebar position**: 9
- **Purpose**: personal preferences (language, theme, timezone, etc.) and system-wide backup defaults.
- **Legacy redirects**: `/setup` → `/preferences`.

| # | Section | Pattern | Features assigned |
| --- | --- | --- | --- |
| 1 | Display | `PageSection.card` | Set UI language; Set UI theme; Set the device timezone; Set background image; Toggle popup messages; Enable virtual keyboard |
| 2 | Backup defaults | `PageSection.card` | Set the camera-folder mask; Set the target free-space minimum; Set idle power-off threshold; Set default backup mode per source/target pair; Toggle "write rating to EXIF" |

Two peer Cards. "Backup defaults" lives here (rather than on `/`) because they are system-wide policy, not per-run options.

Language and Theme also surface in the AppBar quick-menu for one-click access; that is a shortcut, not a separate feature — both still live in the catalog only once.

### `/scrape` — Legacy UI

- **Sidebar position**: 10
- **Purpose**: open the embedded snapshot of the older PHP-based UI for cross-reference.
- **Legacy redirects**: none.

| # | Section | Pattern | Features assigned |
| --- | --- | --- | --- |
| 1 | Snapshots | `PageSection.plain` | Browse legacy PHP-UI snapshots |

Single section, no internal restructure. Listed in the sidebar last to reflect that it is a developer / migration-tester surface, not a routine destination.

## Cross-page features

Some features are reachable from more than one entry point but are implemented and catalogued exactly once:

- **Set UI language** and **Set UI theme** — primary location is `/preferences` → "Display"; AppBar quick-menus are shortcuts.
- **Reboot the device**, **Power off the device**, **Stop the LBB process**, **Log out** — primary location is the AppBar power menu (always available); not on any page.

## Verifying the page map

Run the conformance test to assert the page-map invariants the runtime can enforce: exactly one h1 per page (the AppBar title), no `Typography variant=h4|h5|h6` in page content, every routed page renders.

```bash
cd webapp
npx playwright test tests/e2e/ui-conformance.spec.js
```

The structural invariants the runtime can't enforce (every catalog entry has exactly one home; sidebar order matches; section patterns match) are the responsibility of code review.
