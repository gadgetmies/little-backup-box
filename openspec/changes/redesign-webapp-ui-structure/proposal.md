## Why

The webapp has grown organically into nine routed pages plus a sidebar of external links, and the placement, grouping, and component idioms have diverged page-by-page. Concretely: the Backup page (`/`) mixes the run-a-backup form with two unrelated maintenance accordions (`DatabaseOperations`, `FileOperations`) at the bottom, even though a `/maintenance` page already exists; the source picker is a `Select` while target is the same `Select` component but uses a different filtering model; nearly identical "target / preset partition / power off" forms are reimplemented inside `DatabaseOperations.jsx`, `FileOperations.jsx`, and `Backup.jsx`; pages alternate between top-level Cards (Setup, Network) and accordions (Backup options, Integrations) for what is the same kind of grouping; section headings jump between `<Typography variant="h2">`, `"h3">`, `"h5">`, and `"h6">` without a documented scale. The `webapp/src/pages/` directory also carries five abandoned page files (`Home.jsx`, `Tools.jsx`, `SysInfo.jsx`, `Scrape.jsx`, `Integrations.jsx`) that are not routed in `App.jsx` but still confuse anyone reading the codebase, and the two existing site-map docs (`webapp/.SITE_MAP.md`, `webapp/.SITE_MAP_IMPROVED.md`) reference some of those dead files as if they were live.

The result for users is that the same kind of action is disclosed in different ways across pages, related controls are split across pages, and unrelated controls share a page. There is also no source of truth that says "this is what the webapp does and this is where each capability lives." Without that, every new feature gets placed by whoever lands it first, which is how we got here.

## What Changes

- **New living feature catalog**: a hierarchical document under `webapp/docs/` (path finalized in design.md) that enumerates every user-facing capability of the webapp, grouped by user goal (e.g., "Run a backup", "Browse and triage media", "Configure the device"). Each leaf entry states purpose, who it's for, where in the UI it's accessed, what scripts/endpoints it invokes, and prerequisites. This is the artifact the page map and pattern decisions reference.
- **New page map**: a single document that defines the routes, page titles, and the canonical assignment of every catalog feature to one page and one section within that page. Routes are allowed to change — current `/`, `/setup`, `/tools`, `/sysinfo`, `/network`, `/maintenance`, `/integrations`, `/scrape`, `/view` are rebalanced (e.g., `DatabaseOperations` and `FileOperations` move off `/` into `/maintenance`; the sidebar gets a clearer ordering tied to user-task frequency). The page map supersedes both `.SITE_MAP.md` and `.SITE_MAP_IMPROVED.md`, which are deleted.
- **New UI pattern system**: a documented decision rubric for which container element to reach for — `Typography` heading scale (single h1 per page from the AppBar title; h2 for top-level sections; h3 for subsections), `Card` (peer sections of similar weight, always visible), `Accordion` (rarely-used or progressively-disclosed groups, default collapsed unless restored from `localStorage`), `Tabs` (exclusive views of the same data set), and `Stack`/`Grid` for layout — plus when to compose them. Includes naming conventions for accordion `localStorage` keys and a single shared `<SectionHeader>` / `<PageSection>` primitive to enforce the heading scale.
- **Per-page restructure**: each routed page is updated so its sections, headings, and disclosure pattern conform to the page map and pattern system. Specifically — `/` (Backup) loses the maintenance accordions and the inline "save as defaults" duplication; `/maintenance` absorbs database, file, and settings-backup operations under a single rubric; `/setup` (currently `UserInterface.jsx`) is renamed to `/preferences` and split from device-hardware setup; `/integrations` (`ServiceConnections.jsx`, 939 lines) is reorganized into Tabs by service category (cloud / social / VPN / mail / hardware buttons) instead of stacking every config component vertically; `/sysinfo` and `/network` adopt the same Card-based section grid; `/tools` (`Filesystem.jsx`) is renamed to `/storage` and limited to disk/partition operations; the dead `Home.jsx`, `Tools.jsx`, `SysInfo.jsx`, `Scrape.jsx`, and `Integrations.jsx` files are deleted.
- **Section implementation review**: with structure settled, every section's implementation is reviewed against the pattern system and fixed: shared "target + preset partition + power off" form extracted into a `BackupTargetSelector` component used by Backup, Database Operations, and File Operations; heading components replaced with the new primitive; `localStorage` accordion keys renamed to a `lbb-accordion-<page>-<section>` scheme; `Card`/`Accordion` choices flipped where they violate the rubric.
- **i18n**: new translation keys for any new section titles, page titles, and tab labels across en/de/es/fi/fr; obsolete keys removed.
- **E2E**: Playwright suites in `webapp/tests/e2e/` updated for renamed routes, new tab navigation on `/integrations`, and the moved maintenance accordions; new smoke test that asserts heading-scale conformance on every page.

Non-goals: visual redesign (colors, spacing, MUI theme tokens) — this change is structural; backend/script changes beyond what is required to keep the existing capabilities working from their new locations; the legacy PHP scrape inside `/scrape` (left as-is per scoping decision); accessibility audit beyond preserving current ARIA semantics.

## Capabilities

### New Capabilities
- `webapp-feature-catalog`: a hierarchical, source-of-truth document listing every user-facing webapp feature with purpose, audience, location, and dependencies; updated whenever a feature is added, moved, or removed.
- `webapp-information-architecture`: the canonical page map — set of routes, page titles, navigation order, and per-page assignment of catalog features to sections.
- `webapp-ui-pattern-system`: the decision rubric and shared primitives (heading scale, `<PageSection>`, `<SectionHeader>`, accordion-key scheme) that every page uses to render its sections, plus the documented logic for choosing Card vs. Accordion vs. Tabs.

### Modified Capabilities
<!-- No existing capabilities to modify; openspec/specs/ is empty. -->

## Impact

- **Frontend pages** (all under `webapp/src/pages/`):
  - Routed and restructured: `Backup.jsx`, `UserInterface.jsx` (renamed), `Filesystem.jsx` (renamed), `System.jsx`, `Network.jsx`, `Maintenance.jsx`, `ServiceConnections.jsx` (tabified), `View.jsx`, `ScrapedUI.jsx`.
  - Deleted (currently unrouted dead files): `Home.jsx`, `Tools.jsx`, `SysInfo.jsx`, `Scrape.jsx`, `Integrations.jsx`.
- **Frontend components** (`webapp/src/components/`):
  - New: `PageSection.jsx`, `SectionHeader.jsx`, `BackupTargetSelector.jsx`.
  - Modified: `DatabaseOperations.jsx`, `FileOperations.jsx`, `SettingsOperations.jsx` (consume `BackupTargetSelector`); `Menu.jsx` (updated `menuItems`, route paths, page-title route map); `CloudConfig.jsx`, `SocialMediaConfig.jsx`, `VPNConfig.jsx`, `ButtonHardwareConfig.jsx`, `DisplayConfig.jsx` (re-homed under `/integrations` Tabs).
- **Routing**: `webapp/src/App.jsx` route table updated; legacy paths (`/setup`, `/tools`) get redirect entries so external links and bookmarks keep working for one release.
- **i18n**: `webapp/public/lang/{en,de,es,fi,fr}.json` — add page-title and tab-label keys, remove obsolete section keys.
- **Docs**:
  - New: `webapp/docs/feature-catalog.md`, `webapp/docs/page-map.md`, `webapp/docs/ui-pattern-system.md` (paths confirmed in design.md).
  - Deleted: `webapp/.SITE_MAP.md`, `webapp/.SITE_MAP_IMPROVED.md`.
  - Updated: `CLAUDE.md` UI library section gets a pointer to the pattern system; `webapp/.PLANS/00-index.md` notes that placement decisions now defer to the page map.
- **Tests**: Playwright specs in `webapp/tests/e2e/` — route updates, integrations-tab navigation, maintenance-page assertions; new `tests/e2e/ui-conformance.spec.js` asserts each page exposes exactly one h1 and uses the documented heading scale.
- **No backend route changes**, **no script changes**, **no new runtime deps**. Existing endpoints (`/api/backup/function`, `/api/backup/start`, etc.) keep their contracts; only their callers move.
