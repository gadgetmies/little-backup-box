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
| 3 | `/storage` | Storage | `mainmenue.storage` |
| 4 | `/maintenance` | Maintenance | `mainmenue.maintenance` |
| 5 | `/integrations` | Connections | `mainmenue.integrations` |
| 6 | `/network` | Network | `mainmenue.network` |
| 7 | `/hardware` | Hardware | `mainmenue.hardware` |
| 8 | `/preferences` | Preferences | `mainmenue.preferences` |
| 9 | `/system` | Info | `mainmenue.system` |
| 10 | `/scrape` | Legacy UI | `mainmenue.scrape` |
| ext | `/files` | Files (external) | `mainmenue.filebrowser` |
| ext | `/frame.php?page=rclone_gui` | rclone GUI (external) | `mainmenue.rclone_gui` |

The sidebar order targets typical-user task frequency: things touched every backup session at the top (Backup → Library → Storage), occasional admin in the middle (Maintenance, Connections, Network), set-once configuration after that (Hardware, Preferences), and diagnostics / legacy at the end. Note the route slugs are stable but the displayed page titles diverge in three cases: `/integrations` displays "Connections", `/system` displays "Info", and `/hardware` was renamed from `/devices` (no redirect — the old route was new enough that no external links pointed at it).

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

- **Sidebar position**: 4
- **Purpose**: post-backup cleanup, library reconciliation, settings backup.
- **Legacy redirects**: none.

| # | Section | Pattern | Features assigned |
| --- | --- | --- | --- |
| 1 | Database operations | `PageSection.accordion` (`lbb-accordion-maintenance-database`, default collapsed) | Generate or refresh thumbnails for stored media; Sync the media database; Update EXIF in stored media |
| 2 | File operations | `PageSection.accordion` (`lbb-accordion-maintenance-files`, default collapsed) | Rename files in stored media |
| 3 | Settings backup | `PageSection.accordion` (`lbb-accordion-maintenance-settings`, default collapsed) | Export device settings; Import device settings |

Both update flows (system updates and LibRaw) now live on `/system` → "Updates" tab — they are administrative, not stored-media concerns.

### `/integrations` — Connections

- **Sidebar position**: 5
- **Purpose**: connect the device to external services (cloud destinations, social platforms, mail).
- **Legacy redirects**: none. Route slug stays `/integrations` for stability; only the displayed page title is "Connections".

This page uses `Tabs` because the three panels are mutually exclusive views of the same subject (third-party connections), and stacking them all would make a long scroll of unrelated forms. Selected tab persists in `localStorage` under `lbb-tabs-integrations`.

| # | Tab label | Features assigned |
| --- | --- | --- |
| 1 | Cloud | Configure rclone cloud remotes; Configure rsync server target |
| 2 | Social | Configure social media accounts and publish defaults |
| 3 | Mail | Configure SMTP and email-notification recipients; Send a test email |

VPN lives on `/network` (it's a connectivity primitive, not a third-party integration). No intro line above the tab strip — the three short tab labels are self-explanatory.

### `/hardware` — Hardware

- **Sidebar position**: 7
- **Purpose**: configure the device's physical hardware peripherals (display, buttons, fan).
- **Legacy redirects**: none.

| # | Section | Pattern | Features assigned |
| --- | --- | --- | --- |
| 1 | Display | `PageSection.card` | Configure the physical display |
| 2 | Buttons | `PageSection.card` | Configure hardware buttons |
| 3 | Fan | `PageSection.card` | Configure fan control |

Three peer sections of similar weight that the user typically wants visible together — the Card pattern fits.

### `/storage` — Storage

- **Sidebar position**: 3
- **Purpose**: inspect, mount, repair, format, and verify storage devices.
- **Legacy redirects**: none (the legacy `/tools` redirect was removed in commit 6b853f1).

This page uses `Tabs` rather than the Card+Accordion combination originally drafted, because the operational sections (Mount / Repair / Format / Verify) each render large per-device tables and forms (~150–250 lines each). Stacking them as Accordions on one page produced too much vertical scroll once any two were expanded; Tabs keeps each operation isolated. Selected tab persists in `localStorage` under `lbb-tabs-storage`.

| # | Tab label | Features assigned |
| --- | --- | --- |
| 1 | Info | View disk-space usage; View connected block devices; View device health states |
| 2 | Mount | Mount storage as backup source; Mount storage as backup target; Unmount storage |
| 3 | Repair | Check filesystem for errors; Repair filesystem errors |
| 4 | Format | Format a partition |
| 5 | Verify capacity | Verify USB drive capacity (f3) |

### `/network` — Network

- **Sidebar position**: 6
- **Purpose**: configure WiFi, see addresses and connectivity, configure VPN.
- **Legacy redirects**: none.

This page uses `Tabs` for the three configuration domains (WiFi / Network info / VPN) — same rationale as `/storage`: each domain has substantial content and stacking them produced excessive scroll. Below the tabs sits the rare-and-destructive WiFi-recovery accordion (separate because it lives outside the tabbed flow). Selected tab persists in `localStorage` under `lbb-tabs-network`.

| # | Tab label | Features assigned |
| --- | --- | --- |
| 1 | WiFi | Set the WiFi country (regulatory domain); View WiFi interface info |
| 2 | Network info | View internet connectivity status; View device IP addresses and access links; View QR codes for device access |
| 3 | VPN | Configure VPN |

Below the tabs:
- **WiFi recovery** — `Accordion` (`accordion-network-wifi-reset`, default collapsed) — Reset WiFi to access-point mode

### `/system` — Info

- **Sidebar position**: 9
- **Purpose**: device telemetry, software updates, and log inspection. Displayed page title is "Info"; route slug stays `/system` for stability.
- **Legacy redirects**: none (the legacy `/sysinfo` redirect was removed in commit 6b853f1).

This page uses `Tabs` for the four functional areas — same rationale as `/storage` and `/network`: each panel has substantial content (Device info table, cameras list, two updaters, log stream + config). Selected tab persists in `localStorage` under `lbb-tabs-system`.

| # | Tab label | Features assigned |
| --- | --- | --- |
| 1 | Device | View system information |
| 2 | Cameras | View connected cameras and smartphones; Copy camera storage pattern to clipboard |
| 3 | Updates | Check for system updates; Install system updates; Update LibRaw camera-format library |
| 4 | Logs | View live logs; Set log level; Toggle log sync; Keep display images for debugging |

Reboot / Power off / Stop LBB / Logout do not live on this page — they live in the AppBar power menu and are accessible from anywhere. They are catalogued under "Manage device lifecycle" but their UI location is "AppBar → power menu".

### `/preferences` — Preferences

- **Sidebar position**: 8
- **Purpose**: personal preferences (language, theme, timezone, etc.) and system-wide backup defaults.
- **Legacy redirects**: none (the legacy `/setup` redirect was removed in commit 6b853f1).

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
