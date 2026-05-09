## Why

The webapp's information architecture is split between two patterns: pages with three or more peer panels render their sections as MUI Tabs (`/storage`, `/network`, `/system`, `/integrations`), while three remaining pages (`/maintenance`, `/hardware`, `/preferences`) still stack their sections vertically as accordions or cards. Side-by-side this is jarring — users land on one structure, then navigate to a peer page and meet a different one. The pattern-system spec already endorses Tabs for the 3+ peer-panel case; converting the three holdouts brings every multi-section page under the same primitive and lets each section keep its own scroll position.

Preferences (`/preferences`) is the awkward case: today it has only two cards (Display + Backup defaults), and the spec explicitly forbids Tabs on a two-panel page. Resolution decided with the user: split Preferences into three tabs (Display / Locale / Backup defaults) so the existing 3+ rule still holds and the page joins the same pattern as the others. The Locale split is also a content win — language and timezone always belonged together rather than under a "Display" header.

## What Changes

- **Maintenance** (`webapp/src/pages/Maintenance.jsx`) — replace the three `<PageSection variant="accordion">` (Database operations / File operations / Settings backup) with a Tabs strip + three `TabPanel`s wrapping the existing `DatabaseOperations`, `FileOperations`, `SettingsOperations` components. Persist last-active tab under `lbb-tabs-maintenance` using the symbolic `TAB_NAMES = ['database', 'files', 'settings']` pattern from `System.jsx`, so the storage key survives tab reorder. Drop the per-section accordion-collapse persistence (`lbb-accordion-maintenance-database`, `-files`, `-settings`, plus the legacy `accordion-database-operations` / `accordion-file-operations` keys) — accordion-collapse memory is meaningless when sections become tabs.
- **Hardware** (`webapp/src/pages/Hardware.jsx`) — replace the three `<PageSection variant="card">` (Display / Buttons / Fan) with a Tabs strip + three `TabPanel`s wrapping the existing `DisplayConfig`, `ButtonHardwareConfig`, `FanConfig` components. Persist under `lbb-tabs-hardware` with `TAB_NAMES = ['display', 'buttons', 'fan']`.
- **Preferences** (`webapp/src/pages/Preferences.jsx`) — split the current "Display" card into Display + Locale, then convert the three resulting groups (Display / Locale / Backup defaults) to a Tabs strip:
  - **Display** tab: theme `Select`, background image `TextField`, popup messages `Checkbox`, virtual keyboard `Checkbox`.
  - **Locale** tab: language `Select`, timezone `Autocomplete`.
  - **Backup defaults** tab: every form control currently in the second card (camera folder mask, etc., unchanged).
  Single page-level Save button stays where it is (it covers the unified `formData` across all tabs). Persist under `lbb-tabs-preferences` with `TAB_NAMES = ['display', 'locale', 'backup']`.
- **Mobile fit**: every new `<Tabs>` instance MUST set `variant="scrollable"`, `scrollButtons="auto"`, `allowScrollButtonsMobile` per the requirement added in `make-tab-strips-scrollable-on-mobile`.
- **i18n**: add nine new short tab-label keys (one per tab × three pages), in the existing `<page>.tab.<name>` namespace shape used by `System.jsx` and `Connections.jsx`. Mirror across en/de/es/fi/fr.
- **Docs**: update `webapp/docs/page-map.md` to list the new tab structure for `/maintenance`, `/hardware`, `/preferences`. Update `webapp/docs/feature-catalog.md` only for the Preferences split, since the language/timezone controls are moving from the "Display" entry to a new "Locale" entry. Update `webapp/docs/ui-pattern-system.md` if the prose narrative cites these pages as Card/Accordion exemplars.
- **E2E**: add Playwright suites mirroring `integrations-tabs.spec.js` for each of the three pages — assert all three tab labels render, then assert tab persistence across reload via the corresponding `lbb-tabs-<page>` storage key.

Non-goals: changing the rubric in the pattern-system spec (the existing 3+ rule stands and is honoured by the Preferences split); restructuring the inner content of any tab body beyond the Display→Display+Locale split; renaming any of the three pages or moving them in the sidebar.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `webapp-ui-pattern-system`: ADD a new requirement pinning the `lbb-tabs-<page>` symbolic-key persistence convention. The convention is informally followed by `Storage.jsx`, `Network.jsx`, `System.jsx`, `Connections.jsx` today (in two slightly different shapes — symbolic for System/Connections, numeric for Storage/Network); this change codifies the symbolic shape so the new tabified pages and any future tab page get it right by default.

The IA and feature-catalog specs are NOT changed at the requirement level. Their existing rules already mandate page-map consistency, feature-home uniqueness, and Tabs-for-3+-panel UX; this change updates the page-map.md and feature-catalog.md markdown docs, the React code, and the i18n bundles to satisfy those existing specs.


## Impact

- **Frontend**:
  - `webapp/src/pages/Maintenance.jsx` — rewrite the JSX returned by `Maintenance` (component scaffolding + `Tabs`/`Tab`/`TabPanel` mirroring the structure in `System.jsx`).
  - `webapp/src/pages/Hardware.jsx` — same treatment.
  - `webapp/src/pages/Preferences.jsx` — same treatment, plus split the existing Display PageSection's children into two groups (Display + Locale). No state-shape changes (`formData` is unified).
  - No new shared component is required; `<PageSection>` continues to wrap each tab body when the tab content benefits from a header (rare — the AppBar h1 already names the page, and the tab strip itself names the section).
- **i18n**: 9 new keys × 5 languages = 45 entries across `webapp/public/lang/{en,de,es,fi,fr}.json`.
- **Tests**: 3 new Playwright spec files (one per page), each modelled on `webapp/tests/e2e/integrations-tabs.spec.js`.
- **Docs**: `webapp/docs/page-map.md` and `webapp/docs/feature-catalog.md`.
- **No backend changes, no script changes, no new deps.**
- **localStorage migration**: the four legacy accordion-collapse keys for Maintenance (`lbb-accordion-maintenance-{database,files,settings}` plus legacy `accordion-database-operations`, `accordion-file-operations`) become orphaned. They consume a few bytes each and the browser will keep them; not worth a cleanup migration for a developer-mode device, but documented in design.md.
