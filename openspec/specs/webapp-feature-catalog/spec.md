# Webapp feature catalog

## Purpose

Hierarchical, source-of-truth document listing every user-facing webapp feature with purpose, audience, location, and dependencies; updated whenever a feature is added, moved, or removed.

## Requirements

### Requirement: Catalog exists at a known path and indexes every user-facing feature

The webapp SHALL ship a feature catalog at `webapp/docs/feature-catalog.md` that lists every user-facing feature exposed by the React webapp. The catalog SHALL be the single source of truth for what the webapp does, referenced by the page map and the pattern system.

#### Scenario: Catalog file exists and is non-empty

- **WHEN** a contributor opens `webapp/docs/feature-catalog.md`
- **THEN** the file exists, is non-empty, and starts with a one-paragraph statement that this is the canonical inventory of webapp features

#### Scenario: Every routed page contributes at least one entry

- **WHEN** a reader scans the catalog
- **THEN** every page registered in `webapp/src/App.jsx` contributes at least one feature entry, identified by its UI location

### Requirement: Catalog is organised by user goal, not by page or component

The catalog SHALL group features under top-level user-goal headings (such as "Run a backup", "Browse and triage media", "Maintain stored media", "Configure connectivity", "Configure integrations", "Configure device hardware", "Manage device lifecycle"). Page placement and component identity SHALL appear inside leaf entries, not as the primary axis.

#### Scenario: Top-level headings are user goals

- **WHEN** a reader looks at the catalog table of contents
- **THEN** the top-level (h2) headings name user goals and not page names or React component names

#### Scenario: A feature that moves between pages keeps its catalog position

- **WHEN** a feature is moved from one page to another in the page map
- **THEN** its catalog entry stays under the same user-goal heading, and only the leaf entry's "UI location" field is updated

### Requirement: Each catalog leaf entry has a defined field set

Every leaf entry in the catalog SHALL include the following fields, in order: *Purpose* (one sentence), *Audience* (who would use this), *UI location* (page route + section name), *Backend* (script(s) under `scripts/` and Express route(s) under `webapp/server/routes/` invoked), *Prerequisites* (config, hardware, or other features required), and *Related* (links to neighbouring catalog entries).

#### Scenario: Entry omits a required field

- **WHEN** a reviewer reads a leaf entry that is missing one of the required fields
- **THEN** the entry is treated as incomplete and the change cannot land until the field is filled

#### Scenario: UI location matches the page map

- **WHEN** an entry's "UI location" field is read
- **THEN** the named route and section exist in `webapp/docs/page-map.md`

### Requirement: Catalog updates are part of the same change as the code change

Any change that adds, moves, removes, or renames a user-facing feature SHALL update the relevant catalog entries in the same pull request as the code change. Catalog updates SHALL NOT be deferred to a follow-up.

#### Scenario: Code adds a new user-facing feature

- **WHEN** a PR introduces a new user-facing feature in the webapp
- **THEN** the same PR adds a leaf entry to the catalog under the appropriate user-goal heading

#### Scenario: Code moves a feature between pages

- **WHEN** a PR moves a feature from one page or section to another
- **THEN** the same PR updates the feature's "UI location" field in the catalog

#### Scenario: Code removes a feature

- **WHEN** a PR removes a user-facing feature
- **THEN** the same PR removes the corresponding leaf entry from the catalog

### Requirement: Catalog supersedes the legacy site-map docs

The webapp SHALL NOT carry both the new catalog and the legacy `webapp/.SITE_MAP.md` / `webapp/.SITE_MAP_IMPROVED.md` documents. Once the catalog and page map are in place, the legacy site-map files are deleted from the repository.

#### Scenario: Legacy site-map docs are absent after the change

- **WHEN** a reader looks at the repository file tree after the change lands
- **THEN** `webapp/.SITE_MAP.md` and `webapp/.SITE_MAP_IMPROVED.md` no longer exist
