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

- [ ] 5.1 **Maintenance** (`webapp/src/pages/Maintenance.jsx`): rebuild as the home for `<DatabaseOperations>`, `<FileOperations>`, `<SettingsOperations>`. Use `<PageSection variant="accordion">` for each of the three groups; `localStorage` keys `lbb-accordion-maintenance-database`, `lbb-accordion-maintenance-files`, `lbb-accordion-maintenance-settings`. No top-level `<Typography variant="h2">` for the page title (AppBar handles it).
- [ ] 5.2 **Backup** (`webapp/src/pages/Backup.jsx`): remove the bottom-of-page `<DatabaseOperations>` and `<FileOperations>` mounts. Keep source/target selectors as the always-visible top section, "Options" as `<PageSection variant="accordion">` (`lbb-accordion-backup-options`). Add a "Backup logs" `<PageSection variant="accordion">` (`lbb-accordion-backup-logs`) wrapping the existing `<LogMonitor>` so logs are progressively disclosed. Replace direct `<Typography variant="h2">` / `"h3">` with `<SectionHeader>`. Rename `localStorage` key from `accordion-home-options` to `lbb-accordion-backup-options` (keep one-release back-compat read on the old key, via the `legacyLocalStorageKey` prop on `<PageSection>`). Note: Backup's source/target selectors and per-run options form are *not* the same shape as `BackupTargetSelector` — that selector is for the maintenance-flavoured "pick local target + preset partitions + power off" form used only by `<DatabaseOperations>` and `<FileOperations>`.
- [ ] 5.3 **DatabaseOperations / FileOperations**: replace the duplicated target/preset/power-off form in each component with `<BackupTargetSelector>`. Verify NVMe-availability gating now comes from one place. (`SettingsOperations` does **not** consume `BackupTargetSelector` — it has download/upload buttons only.)
- [ ] 5.4 **Integrations** (`webapp/src/pages/ServiceConnections.jsx`): introduce MUI `<Tabs>` with three tabs — Cloud, Social, Mail — each rendering the existing config component (`<CloudConfig>` plus the rsync subsection currently in `ServiceConnections.jsx:808-881`, `<SocialMediaConfig>`, the mail subset currently in `ServiceConnections.jsx:486-690`). Add a one-line page header listing all three tab names so users do not miss content. Persist the selected tab in `localStorage` under `lbb-tabs-integrations`. (VPN stays on `/network` per the page-map decision; do **not** add a VPN tab here.)
- [ ] 5.5 **Devices** (new page `webapp/src/pages/Devices.jsx`, route `/devices`): host three `<PageSection variant="card">` peers — Display (`<DisplayConfig>`), Buttons (`<ButtonHardwareConfig>`), and Fan (the inline fan controls currently at `UserInterface.jsx:435-469`, either left inline or extracted to `<FanConfig>` if convenient). Move all three out of `UserInterface.jsx`.
- [ ] 5.6 **Preferences** (renamed from `UserInterface.jsx` to `webapp/src/pages/Preferences.jsx`, route `/preferences`): retain personal-preference controls and absorb the system-wide backup defaults that currently live on `/setup` "Backup" section. Use `<PageSection variant="card">` for two peers: "Display" (language, theme, timezone, background image, popup messages, virtual keyboard) and "Backup defaults" (camera folder mask, target free-space minimum, idle power-off, default backup mode per source/target pair, write-rating-to-EXIF). The mail-notification *opt-in* checkbox currently on Backup stays on `/` for per-run use; mail *server* config lives on `/integrations` Mail tab.
- [ ] 5.7 **System** (`webapp/src/pages/System.jsx`, route `/system`): merge the existing read-only system info with administrative log/update controls. Sections per page-map: "Device info" (`<PageSection variant="card">`), "Connected devices" (`<PageSection variant="card">`, the existing cameras/smartphones list), "Updates" (`<PageSection variant="accordion">` with `<UpdateManager>`), "Logs" (`<PageSection variant="card">` with the live log stream plus the log-level / log-sync / display-images-keep controls extracted from `UserInterface.jsx:482-518`). Reboot / Power off / Stop LBB / Logout are not on this page; they remain in the AppBar power menu.
- [ ] 5.8 **Storage** (renamed from `Filesystem.jsx` to `webapp/src/pages/Storage.jsx`, route `/storage`): no functional change beyond the rename and the heading-scale / primitive cleanup.
- [ ] 5.9 **Network** (`webapp/src/pages/Network.jsx`): convert top-level groupings to `<PageSection variant="card">` peers using `<SectionHeader>` for titles. No content moves.
- [ ] 5.10 **Library** (`webapp/src/pages/View.jsx`, route `/view`): heading-scale and primitive cleanup only. Out of scope for any larger restructure (Plan 04 owns View).
- [ ] 5.11 **Legacy UI** (`webapp/src/pages/ScrapedUI.jsx`, route `/scrape`): no internal restructure; only the surrounding chrome (page title, optional `<PageSection>` wrap) is normalised.

## 6. Routing, navigation, redirects

- [ ] 6.1 Update `webapp/src/App.jsx` route table to: `/` Backup, `/view` Library, `/maintenance` Maintenance, `/integrations` Integrations, `/devices` Devices, `/storage` Storage, `/network` Network, `/system` System, `/preferences` Preferences, `/scrape` Legacy UI. Add `<Route path="/setup" element={<Navigate to="/preferences" replace />} />`, `/tools` → `/storage`, `/sysinfo` → `/system`.
- [ ] 6.2 Update `webapp/src/components/Menu.jsx`: `menuItems` order matches the page-map sidebar order; `getPageTitle()` route map updated to the new paths and titles.
- [ ] 6.3 Verify external links in the sidebar (`/files`, `/frame.php?page=rclone_gui`) still appear last and in their current order; no functional changes.

## 7. i18n

- [ ] 7.1 Add new translation keys to all five language files (`webapp/public/lang/{en,de,es,fi,fr}.json`): page titles for renamed/new pages (`mainmenue.maintenance` already exists; add `mainmenue.devices`, `mainmenue.storage`, `mainmenue.preferences`, `mainmenue.system` if missing); section titles created in step 5; tab labels for Integrations.
- [ ] 7.2 Remove obsolete keys that are no longer referenced (sweep with `grep -r "t('the.key')"` per file). Confirm zero references before removing.
- [ ] 7.3 Add a script `webapp/scripts/check-i18n-parity.mjs` (Node, no new deps) that loads all five language files and exits non-zero if their key sets differ. Wire it into the lint step in `webapp/package.json` (`npm run lint` extension or new `npm run check:i18n`).

## 8. Tests

- [ ] 8.1 Update existing Playwright specs in `webapp/tests/e2e/` for renamed routes — search-and-replace `/setup` → `/preferences`, `/tools` → `/storage`, `/sysinfo` → `/system` in test URLs; verify each suite still passes.
- [ ] 8.2 Add a Playwright spec `webapp/tests/e2e/integrations-tabs.spec.js` covering: tab strip renders all three tab labels (Cloud / Social / Mail); clicking a tab renders the corresponding config; selected tab persists across reload via `localStorage`.
- [ ] 8.3 Add a Playwright spec `webapp/tests/e2e/maintenance-page.spec.js` covering: Maintenance page renders three accordions (database / files / settings); each accordion expands and reveals its action buttons; accordion state persists across reload.
- [ ] 8.4 Run `npm run lint && npm run test:e2e` from `webapp/` and ensure all suites pass.

## 9. Cleanup and deletion

- [ ] 9.1 Verify no imports remain of the dead pages: `grep -rn "from '\.\./pages/Home'" webapp/src` (and equivalent for `Tools`, `SysInfo`, `Scrape`, `Integrations`). Expect zero matches.
- [ ] 9.2 Delete dead page files: `webapp/src/pages/Home.jsx`, `webapp/src/pages/Tools.jsx`, `webapp/src/pages/SysInfo.jsx`, `webapp/src/pages/Scrape.jsx`, `webapp/src/pages/Integrations.jsx`.
- [ ] 9.3 Delete legacy site-map docs: `webapp/.SITE_MAP.md`, `webapp/.SITE_MAP_IMPROVED.md`.
- [ ] 9.4 Delete the throwaway scratch file `webapp/.scratch/feature-audit.md` from step 1.1.

## 10. Final verification

- [ ] 10.1 Re-read each of the three docs (`feature-catalog.md`, `page-map.md`, `ui-pattern-system.md`) end-to-end and confirm internal cross-references resolve (catalog UI-location fields name pages and sections that the page map declares; page map sections name patterns the pattern system defines).
- [ ] 10.2 Manual smoke: start `npm run dev:mock` from `webapp/`, click through every sidebar item plus every Integrations tab plus every Maintenance accordion, confirm the AppBar title matches the page-map title, and confirm no page renders a duplicated h1.
- [ ] 10.3 Run the conformance test from step 4.4 plus the full Playwright suite; confirm green.
