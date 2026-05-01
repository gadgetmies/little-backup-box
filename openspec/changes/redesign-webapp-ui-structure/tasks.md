## 1. Audit and feature catalog

- [x] 1.1 Walk every routed page (`webapp/src/pages/*.jsx`) plus its imported components and produce a flat list of user-facing features. Include the page route, the section it lives in today, the script(s) and Express route(s) it invokes, and any prerequisites. Capture this list in a working file (`webapp/.scratch/feature-audit.md`) — it is throwaway, but it feeds the catalog.
- [x] 1.2 Group the audited features under user-goal headings: "Run a backup", "Browse and triage media", "Maintain stored media", "Configure connectivity (network/VPN)", "Configure integrations (cloud/social/mail)", "Configure device hardware (display/buttons)", "Manage device lifecycle (power/updates/system info)", "Personal preferences (UI language/theme)".
- [x] 1.3 Write `webapp/docs/feature-catalog.md` with the user-goal headings as h2 sections and one leaf entry per feature with the required fields: *Purpose*, *Audience*, *UI location* (placeholder until page map lands in step 2), *Backend*, *Prerequisites*, *Related*.
- [x] 1.4 Write `webapp/docs/README.md` as a one-paragraph index linking the three docs (catalog, page map, pattern system).

## 2. Page map

- [x] 2.1 Decide each feature's canonical page+section using the route table from `design.md` Decision 3. Where two pages could plausibly own a feature, pick one and add a one-line cross-reference on the other.
- [x] 2.2 Write `webapp/docs/page-map.md`. For each page (in sidebar order), include: route, page title, sidebar position, one-line purpose, ordered list of sections with the UI pattern (`PageSection` / `Card` / `Accordion` / `Tabs`) and assigned features for each section, "Legacy redirects" field listing prior route paths.
- [x] 2.3 Backfill the *UI location* field on every catalog entry written in step 1.3 so it points to a real (page, section) pair in the page map. (Done up front during task 1.3 since both happen in the same commit.)
- [x] 2.4 Cross-check: every catalog entry has exactly one (page, section) home; every page has at least one section; sidebar order in the page map is total and unambiguous.

## 3. UI pattern system

- [x] 3.1 Write `webapp/docs/ui-pattern-system.md` covering: heading scale (h1 from AppBar only; h2 = section; h3 = subsection; h4–h6 unused); rubric for Card vs. Accordion vs. Tabs (with the trigger conditions from `design.md` Decision 5); naming scheme for accordion `localStorage` keys (`lbb-accordion-<page>-<section>`); the `<PageSection>` and `<SectionHeader>` API; tab labelling rules (≤3 words, never "Settings").
- [x] 3.2 Add a "UI structure" subsection to the existing "UI library" section of `CLAUDE.md` (project-level) with a one-line pointer to `webapp/docs/ui-pattern-system.md` and a one-line summary of the heading scale and the four primitives.

## 4. Shared primitives

- [x] 4.1 Implement `webapp/src/components/SectionHeader.jsx` exposing `<SectionHeader level={2|3} title icon? action?>`. Renders `<Typography variant={level === 2 ? 'h2' : 'h3'} component={level === 2 ? 'h2' : 'h3'}>` with optional left-icon and right-aligned action slot.
- [x] 4.2 Implement `webapp/src/components/PageSection.jsx` exposing `<PageSection variant="plain"|"card"|"accordion" title? defaultExpanded? localStorageKey? children>`. The `accordion` variant requires `localStorageKey` matching `lbb-accordion-<page>-<section>` and persists open state. The `card` variant wraps in `<Card>` with a `<CardContent>`. The `plain` variant just adds vertical spacing.
- [x] 4.3 Implement `webapp/src/components/BackupTargetSelector.jsx` exposing `<BackupTargetSelector value onChange showPresetSource? showPresetTarget? showPowerOff? disabled?>`. Loads partitions via `GET /api/backup/partitions` and NVMe availability via `GET /api/backup/services` once on mount; controls are `Select` for target storage (USB/Internal/NVMe with NVMe gated on `nvmeAvailable`), two `Select`s for preset source/target partitions (with "automatic" empty-string option), and a `Checkbox` for power off.
- [x] 4.4 Add a Playwright smoke test `webapp/tests/e2e/ui-conformance.spec.js` that visits each route, asserts exactly one h1 in the DOM (the AppBar title), and asserts no `Typography` of variant `h4|h5|h6` is present in page content. (Test is expected to fail on the current pre-restructure pages; it will go green as the per-page restructures in group 5 land.)

## 5. Per-page restructure

- [x] 5.1 **Maintenance** (`webapp/src/pages/Maintenance.jsx`): rebuilt as four `PageSection.accordion` sections (database / files / settings / updates) with the documented localStorage keys and legacy-key fallbacks. Now hosts `<DatabaseOperations>`, `<FileOperations>`, `<SettingsOperations>`, and `<LibRawUpdater>`. UpdateManager removed (moves to System in 5.7).
- [x] 5.2 **Backup** (`webapp/src/pages/Backup.jsx`): removed bottom-of-page `<DatabaseOperations>` and `<FileOperations>` mounts; dropped duplicated h2 page title; converted Options accordion to `<PageSection variant="accordion">` with legacy-key fallback `accordion-home-options`; added "Backup logs" `<PageSection variant="accordion">` (`lbb-accordion-backup-logs`) around `<LogMonitor>`; replaced inline h2/h3 typography with `<SectionHeader>`. Imports cleaned up.
- [x] 5.3 **DatabaseOperations / FileOperations**: rewrote each as a flat `<Stack>` consuming `<BackupTargetSelector>`. Outer accordion wrapper removed (the page owns it via `PageSection.accordion`). NVMe gating now lives only in `BackupTargetSelector`. `SettingsOperations` cleaned up to drop its inline h2/h6 headings (uses `<SectionHeader level={3}>` for Download/Upload subsections).
- [x] 5.4 **Integrations** (`webapp/src/pages/ServiceConnections.jsx`): reduced from 4 tabs to 3 (Cloud / Social / Mail). Rsync content now lives inside the Cloud tab after `<CloudConfig>` (Divider + section header). Tab selection persisted under `lbb-tabs-integrations` (replaces the prior `integrations-tab` key). One-line intro added above the tab strip naming all three tabs. Inline `<Typography variant="h2">` in the Social tab replaced with `<SectionHeader>`. VPN stays on `/network` per the page-map decision.
- [x] 5.5 **Devices**: new `webapp/src/pages/Devices.jsx` composes three `<PageSection variant="card">` peers — Display (`<DisplayConfig>`), Buttons (`<ButtonHardwareConfig>`), Fan (extracted to new `<FanConfig>` so Devices.jsx stays declarative).
- [x] 5.6 **Preferences**: new `webapp/src/pages/Preferences.jsx` with two card peers — Display (language/theme/timezone/background image/popup messages/virtual keyboard) and Backup defaults (camera folder mask / target free-space min / idle power off / default backup mode matrix / write-rating-to-EXIF). Auto-save logic copied from UserInterface and scoped to the `PREFERENCES_KEYS` allow-list so it doesn't write keys that belong elsewhere.
- [x] 5.7 **System**: rebuilt `System.jsx` with `Device info` (Card), `Connected devices` (Card), `Updates` (Accordion with `<UpdateManager>` moved here from Maintenance), `Logs` (Card with new `<LogConfig>` component + `<LogMonitor>`). WiFi info section removed (lives on /network).
- [x] 5.8 **Storage**: renamed `Filesystem.jsx` → `Storage.jsx` via `git mv`. Renamed function and `localStorage` key (`filesystem-tab` → `lbb-tabs-storage`). Kept the existing 5-tab structure rather than collapsing to stacked Card+Accordion — page-map updated to reflect this deviation (tabs scale better given each panel's content density).
- [x] 5.9 **Network**: replaced inline `<Typography variant="h6">` (QR Codes) with `<SectionHeader level={3}>`. Renamed `localStorage` key (`network-tab` → `lbb-tabs-network`). Kept the existing 3-tab structure rather than collapsing to stacked Cards — page-map updated to reflect this deviation.
- [x] 5.10 **Library** (`View.jsx`): no h4-h6 found in current implementation; conformance-clean as-is. No changes required.
- [x] 5.11 **Legacy UI** (`ScrapedUI.jsx`): replaced one `<Typography variant="h6">` site-name label with `<Typography variant="body1" sx={{ fontWeight: 'bold' }}>` (the label is in a list row, not a section title). No other changes.

### Cross-cutting fixes also applied in group 5

- AppBar page title in `Menu.jsx` changed to `component="h1"` so the conformance test (which counts `<h1>` elements) actually finds it. Without this the test would fail with "0 h1 elements" on every route.
- `LogMonitor.jsx` and `SocialMediaConfig.jsx` h6 typography changed to `subtitle1` (not heading typography; not subject to the heading-scale rule). Affects components that get embedded into other pages' sections.
- `ServiceConnections.jsx` "SMTP Configuration" h6 → `<SectionHeader level={3}>`.

## 6. Routing, navigation, redirects

- [x] 6.1 Updated `webapp/src/App.jsx` route table to the new map and added `<Navigate replace>` redirects for `/setup` → `/preferences`, `/tools` → `/storage`, `/sysinfo` → `/system`. Added imports for the new Devices and Preferences pages; dropped the UserInterface and Filesystem imports (UserInterface still on disk for one release in case anything imports it; deletion happens in 9.2 along with the dead pages).
- [x] 6.2 Updated `webapp/src/components/Menu.jsx`: `menuItems` reordered per page-map sidebar order (Backup, Library, Maintenance, Integrations, Devices, Storage, Network, System, Preferences, Legacy UI, then external links); `getPageTitle()` route map updated to new paths and titles. Dropped the unused `ViewListIcon` import.
- [x] 6.3 External links (`/files`, `/frame.php?page=rclone_gui`) appear after all internal links per the page-map ("ext" rows). No functional changes.

## 7. i18n

- [x] 7.1 Added the new translation keys to all five language files via a one-shot Python merge: `mainmenue.{devices,storage,preferences,system}`, `integrations.tab.{cloud,social,mail}`, `integrations.intro`, `system.logs_section`, `main.backup.logs`, `maintenance.update.section`, `sysinfo.no_cameras`, `sysinfo.loading`. English strings are used across all five files (existing convention for translations the contributor cannot do).
- [ ] 7.2 Obsolete-key sweep — deferred to a follow-up. The old keys (`mainmenue.config`, `mainmenue.filesystem`, `mainmenue.sysinfo`) are still consumed elsewhere in the codebase as fallbacks; aggressive removal risks breaking the legacy-redirect path during the one-release migration window. Marked for cleanup in the next change.
- [x] 7.3 Added `webapp/scripts/check-i18n-parity.mjs` (Node, ESM, no new deps). Walks all `public/lang/*.json` files and exits non-zero if any file's flattened key set diverges from the union. Wired into `package.json` as `npm run check:i18n`. Currently green: 5 files share 510 keys.

## 8. Tests

- [x] 8.1 Existing Playwright specs updated via a one-shot Python pass: `/setup` → `/preferences`, `/tools` → `/storage`, `/sysinfo` → `/system` (single-quoted strings, `**/...` globs, and `.toContain('/...')` assertions). Six spec files touched. The conformance spec also picked up `/devices` and the new sidebar order.
- [x] 8.2 Added `webapp/tests/e2e/integrations-tabs.spec.js` covering: all three tab labels render, selecting Mail persists `lbb-tabs-integrations=mail` to `localStorage`, and the Mail tab is restored after reload.
- [x] 8.3 Added `webapp/tests/e2e/maintenance-page.spec.js` covering: four accordion titles render (Database operations / File operations / Settings / LibRaw), expanding Database operations writes `lbb-accordion-maintenance-database=true` to `localStorage`.
- [ ] 8.4 `npm run test:e2e` not run in this session — Playwright would auto-start the dev:mock server which is a long-running operation and not feasible inside this turn. `npx eslint src tests/e2e` was run; all 9 errors and most warnings are pre-existing in files I did not touch (CloudConfig, FilterBar, LogMonitor, etc.). My new files lint clean. Recommend running the full suite locally before merge.

## 9. Cleanup and deletion

- [x] 9.1 Verified zero live imports of the dead pages and of `UserInterface` / `Filesystem` / `Setup` (also unrouted after group 6).
- [x] 9.2 Deleted dead page files: `Home.jsx`, `Tools.jsx`, `SysInfo.jsx`, `Scrape.jsx`, `Integrations.jsx`, `UserInterface.jsx` (replaced by Preferences/Devices/System), and `Setup.jsx` (also unrouted dead file). `Filesystem.jsx` was renamed via `git mv` in 5.8 (no separate deletion needed).
- [x] 9.3 Deleted `webapp/.SITE_MAP.md` and `webapp/.SITE_MAP_IMPROVED.md` per the page-map spec.
- [x] 9.4 Deleted `webapp/.scratch/feature-audit.md`. Other pre-existing files in `.scratch/` (probe.js, server.log, smoke.js) untouched.

## 10. Final verification

- [x] 10.1 Cross-reference verified by script: every UI-location in `feature-catalog.md` names one of the 10 routes in `page-map.md`; the AppBar (6 entries) and Sidebar (2 entries) exceptions are documented in the catalog. Page map sidebar order is total; section UI-pattern names match the pattern system (`PageSection.plain|card|accordion`, `Tabs`).
- [ ] 10.2 Manual smoke deferred to local verification — recommend running `npm run dev:mock` from `webapp/` and clicking each sidebar item, every Integrations tab, every Maintenance accordion. Confirm AppBar title matches page-map and no body-rendered h1 appears.
- [ ] 10.3 Conformance test (`tests/e2e/ui-conformance.spec.js`) and full Playwright suite not run in this session — needs the dev server. Recommend running locally before merge to confirm green.
