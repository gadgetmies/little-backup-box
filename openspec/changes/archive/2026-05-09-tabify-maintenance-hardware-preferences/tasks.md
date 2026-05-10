## 1. Pre-flight

- [x] 1.1 Confirmed: System's `TAB_NAMES`-with-indexOf shape is the simpler of the two existing patterns; using it for all three new pages.
- [x] 1.2 Inventoried `Preferences.jsx`. No `conf_date_format` setting — open question dropped. Field grouping: Display = theme, background image, popup messages, virtual keyboard. Locale = language, timezone. Backup defaults = camera folder mask, target size minimum, idle power off, write rating to exif, default-backup-mode matrix. Note: Preferences uses debounced autosave (line 78), not a Save button — design.md's "page-level Save" framing was inaccurate; the change is unaffected since tabs don't alter `formData` shape.

## 2. i18n keys

- [x] 2.1 Add to `webapp/public/lang/en.json` under existing `maintenance`, `hardware`, `preferences` namespaces:
  - `maintenance.tab.database` = `"Database"`
  - `maintenance.tab.files` = `"Files"`
  - `maintenance.tab.settings` = `"Settings"`
  - `hardware.tab.display` = `"Display"`
  - `hardware.tab.buttons` = `"Buttons"`
  - `hardware.tab.fan` = `"Fan"`
  - `preferences.tab.display` = `"Display"`
  - `preferences.tab.locale` = `"Locale"`
  - `preferences.tab.backup` = `"Backup defaults"`
- [x] 2.2 Mirrored all nine keys into de/es/fi/fr. Used straightforward translations; `preferences.tab.locale` rendered as "Sprache & Zeit" (de), "Idioma y zona horaria" (es), "Kieli ja aika" (fi), "Langue et région" (fr) — flagged for native-speaker review in the commit message.
- [x] 2.3 `npm run check:i18n` reports parity OK across all 5 files (504 shared keys).

## 3. Convert `/maintenance`

- [x] 3.1 Rewrite `webapp/src/pages/Maintenance.jsx` to render a Tabs strip (`variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile`) with three tabs labelled by the new i18n keys, and three `TabPanel`s wrapping `<DatabaseOperations />`, `<FileOperations />`, `<SettingsOperations />`. Use `TAB_NAMES = ['database', 'files', 'settings']`. Persist under `lbb-tabs-maintenance`. Drop all `<PageSection>` imports and the four `localStorageKey` / `legacyLocalStorageKey` props that go with them.
- [ ] 3.2 Verify by `npm run dev:mock`: visit `/maintenance`, confirm three tabs render, confirm tab change writes `lbb-tabs-maintenance`, confirm reload restores the same tab. Try switching to "Files" then closing/reopening the browser to confirm persistence.

## 4. Convert `/hardware`

- [x] 4.1 Rewrite `webapp/src/pages/Hardware.jsx` to render a Tabs strip (same scrollable props) with three tabs labelled by the new i18n keys, wrapping `<DisplayConfig />`, `<ButtonHardwareConfig />`, `<FanConfig />`. `TAB_NAMES = ['display', 'buttons', 'fan']`. Persist under `lbb-tabs-hardware`.
- [ ] 4.2 Manual verify same as 3.2 against `/hardware`.

## 5. Convert `/preferences` (split + tabify)

- [x] 5.1 In `webapp/src/pages/Preferences.jsx`, rewrote the JSX inside `return (<Stack spacing={3}> … </Stack>)`:
  - Replace the `<Stack>` wrapping the two `<PageSection variant="card">` instances with a Tabs strip (same scrollable props) + three `TabPanel`s.
  - The first `TabPanel` (Display): theme `Select`, background image `TextField`, popup messages `Checkbox`, virtual keyboard `Checkbox`.
  - The second `TabPanel` (Locale): language `Select`, timezone `Autocomplete`, plus the date-format setting if it surfaced in 1.2.
  - The third `TabPanel` (Backup defaults): every form control currently inside the second card, unchanged.
  - Keep the existing page-level Save button below the Tabs strip (outside the `TabPanel`s), so it is visible regardless of active tab.
  - `TAB_NAMES = ['display', 'locale', 'backup']`. Persist under `lbb-tabs-preferences`.
- [ ] 5.2 Manual verify: visit `/preferences`, exercise each tab, edit a field on each tab, hit Save once, reload, confirm the values persisted across all three tabs (proves the unified `formData` survives the tab boundary). Try with `USE_MOCKS=true` since the device-side save is mocked.

## 6. Docs

- [x] 6.1 Update `webapp/docs/page-map.md` for `/maintenance`, `/hardware`, `/preferences`: replace the existing Card/Accordion section listings with three Tab listings each, naming the tab label and the catalog features inside it. Confirm the pattern column reads "Tabs" for all three pages.
- [x] 6.2 Update `webapp/docs/feature-catalog.md`: move the "Language" and "Timezone" leaf entries from the Preferences "Display" section to a new Preferences "Locale" section. Update each entry's *UI location* field to `/preferences → Locale`. No other catalog entries move.
- [x] 6.3 Re-read `webapp/docs/ui-pattern-system.md` and update any prose that cites Maintenance / Hardware / Preferences as Card/Accordion exemplars (a quick grep — these references may not exist).

## 7. E2E tests

- [x] 7.1 Add `webapp/tests/e2e/maintenance-tabs.spec.js` modelled on `integrations-tabs.spec.js`: assert the three tab labels render, then assert tab persistence (select Files, reload, Files still selected; `localStorage.getItem('lbb-tabs-maintenance') === 'files'`).
- [x] 7.2 Add `webapp/tests/e2e/hardware-tabs.spec.js` analogously for Display/Buttons/Fan and `lbb-tabs-hardware`.
- [x] 7.3 Add `webapp/tests/e2e/preferences-tabs.spec.js` for Display/Locale/Backup defaults and `lbb-tabs-preferences`.

## 8. Validate

- [x] 8.1 `npm run lint` — no new errors. Same 31 pre-existing errors as the prior change; none from `Maintenance.jsx`, `Hardware.jsx`, `Preferences.jsx`, or any new test file.
- [x] 8.2 All 8 tests across the four files pass (10.0s total).
- [x] 8.3 `integrations-tabs.spec.js` passes 2/2. `ui-conformance.spec.js` has 6 pre-existing failures on routes this change does not touch (`/`, `/view`, `/storage`, `/network`, `/hardware`-inner-components, `/scrape`). Notably `/maintenance` and `/preferences` are absent from the failure list — converting them from accordion/card (which rendered `<Typography variant="h?">` inside summaries/headers) to bare `<Tab>` labels likely removed prior heading-level leakage on those two pages.

## 9. Backlog hygiene

- [x] 9.1 Removed the bullet from `openspec/BACKLOG.md` "Soon" section.
