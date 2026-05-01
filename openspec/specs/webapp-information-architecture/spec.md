# Webapp information architecture (page map)

## Purpose

Canonical page map: routes, page titles, navigation order, and per-page assignment of catalog features to sections.

## Requirements

### Requirement: Page map exists at a known path and defines every routed page

The webapp SHALL ship a page map at `webapp/docs/page-map.md` that defines the canonical set of routes, page titles, navigation order, and per-page section assignments. The page map SHALL be derived from and consistent with the feature catalog.

#### Scenario: Page map file exists and lists every route in App.jsx

- **WHEN** a contributor opens `webapp/docs/page-map.md`
- **THEN** every `<Route path="...">` registered in `webapp/src/App.jsx` is listed in the page map with its page title, sidebar order, and the catalog features assigned to it

#### Scenario: Route appears in code but not in the page map

- **WHEN** a new route is added to `webapp/src/App.jsx`
- **THEN** the same change adds the route to the page map, otherwise the change is incomplete

### Requirement: Each catalog feature is assigned to exactly one page section

Every leaf entry in the feature catalog SHALL be assigned to exactly one page in the page map and to exactly one section within that page. A single feature SHALL NOT appear in two places, and no feature SHALL be unassigned.

#### Scenario: Feature has a single canonical home

- **WHEN** a reader opens the page map
- **THEN** for every feature in the catalog, there is exactly one (page, section) pair claiming it

#### Scenario: Cross-references rather than duplication

- **WHEN** a feature is conceptually relevant to two pages
- **THEN** the page map assigns it to one page as the canonical home and lists a one-line cross-reference on the other page; the feature is implemented in only one place in the React code

### Requirement: Sidebar navigation order matches the page map

The sidebar (`webapp/src/components/Menu.jsx`) SHALL render `menuItems` in the order specified by the page map. The order is task-frequency descending: most-used pages at the top, infrequent and admin pages below, external links last.

#### Scenario: Sidebar order matches page map

- **WHEN** the sidebar is rendered
- **THEN** the order of internal-link items matches the page-map sidebar-order field for each page

#### Scenario: New page is added without updating the sidebar

- **WHEN** a new route is added to the page map but `Menu.jsx` is not updated
- **THEN** the change is incomplete; CI or review SHALL surface the inconsistency

### Requirement: Renamed and removed routes redirect to their successors for one release

When the page map renames or removes a route, the React Router config in `webapp/src/App.jsx` SHALL register a redirect from the legacy path to its successor for at least one release cycle, using `<Navigate to="..." replace />`. Permanent removal SHALL happen in a subsequent change.

#### Scenario: Legacy URL still navigates to the right page

- **WHEN** a user navigates to a renamed legacy path (for example `/setup` after rename to `/preferences`)
- **THEN** the router replaces the URL with the successor and renders the successor page

#### Scenario: Legacy redirect is documented

- **WHEN** a reader opens the page map
- **THEN** the page-map entry for the successor lists the legacy path under a "Legacy redirects" field that names the prior path

### Requirement: AppBar renders the page title; pages do not duplicate it

The AppBar (`Menu.jsx`, route-keyed `getPageTitle`) SHALL be the only h1 on each page. Page components SHALL NOT render a second copy of the page title at the top of their content.

#### Scenario: Page is loaded

- **WHEN** any page is rendered
- **THEN** the AppBar contains exactly one element styled as h1, and the page body contains zero elements styled as h1

#### Scenario: Page-title source of truth

- **WHEN** the page title needs to change
- **THEN** the change is made in the route-title map referenced by `Menu.jsx` and in the page map, not by adding or editing a `<Typography>` inside the page component

### Requirement: Page map lists each page's sections in render order

For each page, the page map SHALL list its sections in the order they appear top-to-bottom in the rendered UI, naming each section, its UI pattern (`Card`, `Accordion`, `Tabs`, plain `PageSection`), and the catalog features placed inside it.

#### Scenario: Section render order matches the page map

- **WHEN** a page is rendered
- **THEN** the visual top-to-bottom order of sections matches the page-map listing for that page

#### Scenario: Section uses a different pattern than the page map declares

- **WHEN** a page renders a section using a different pattern than the page map specifies
- **THEN** the discrepancy is treated as a bug; either the page or the page map is updated to reconcile
