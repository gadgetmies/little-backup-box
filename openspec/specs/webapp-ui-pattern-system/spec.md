# Webapp UI pattern system

## Purpose

Decision rubric and shared primitives (heading scale, PageSection, SectionHeader, accordion-key scheme) that every page uses to render its sections, plus the documented logic for choosing Card vs. Accordion vs. Tabs.
## Requirements
### Requirement: Pattern system document exists at a known path

The webapp SHALL ship a pattern system document at `webapp/docs/ui-pattern-system.md` that defines the heading scale, the rubric for choosing between Card / Accordion / Tabs, the shared primitives (`<PageSection>`, `<SectionHeader>`), and naming conventions for accordion `localStorage` keys. The pattern system SHALL be referenced from `CLAUDE.md`'s UI library section.

#### Scenario: Pattern system document exists

- **WHEN** a contributor opens `webapp/docs/ui-pattern-system.md`
- **THEN** the file exists and contains, at minimum, the heading scale, the Card vs. Accordion vs. Tabs rubric, and the primitive API descriptions

#### Scenario: CLAUDE.md points to the pattern system

- **WHEN** a contributor reads the CLAUDE.md "UI library" section
- **THEN** that section contains a link to `webapp/docs/ui-pattern-system.md`

### Requirement: Heading scale is constrained to h1, h2, h3

The webapp SHALL use only three heading levels in user-facing content: h1 for the page title (rendered exclusively by the AppBar), h2 for top-level page sections, h3 for subsections inside a section. Heading levels h4, h5, and h6 SHALL NOT be used in page content.

#### Scenario: Page renders headings outside the allowed scale

- **WHEN** a page renders a `<Typography variant="h4">`, `"h5">`, or `"h6">` for sectioning purposes
- **THEN** the heading is replaced with `<SectionHeader level={2}>` or `<SectionHeader level={3}>` as appropriate

#### Scenario: Page renders multiple h1 elements

- **WHEN** a page body renders any element with the h1 role
- **THEN** the element is removed; the AppBar is the sole h1 source

### Requirement: Card pattern is used for visible peer sections

`Card` (or the `<PageSection variant="card">` shorthand) SHALL be used when a page has 2–4 peer sections of similar weight that the user typically wants to see together without progressive disclosure.

#### Scenario: Page uses Card for a single section

- **WHEN** a page wraps its only section in a `Card`
- **THEN** the wrapping is removed; a single section uses `<PageSection>` without the card variant

#### Scenario: Page uses Card for a rarely-needed grouping

- **WHEN** a section qualifies as "rarely needed" (used in less than half of typical visits)
- **THEN** an `Accordion` is used instead of a `Card`

### Requirement: Accordion pattern is used for progressively-disclosed groups

`Accordion` (or `<PageSection variant="accordion">`) SHALL be used when a page has more than four groupings or when a grouping is rarely needed. Accordions SHALL default to collapsed and SHALL persist their open/closed state in `localStorage` under a key matching `lbb-accordion-<page>-<section>`, where `<page>` is the page's route slug (e.g., `backup`, `maintenance`) and `<section>` is the section's stable kebab-case identifier.

#### Scenario: Accordion key follows the naming scheme

- **WHEN** an accordion writes its expanded state to `localStorage`
- **THEN** the key matches the pattern `lbb-accordion-<page>-<section>` exactly

#### Scenario: Accordion defaults to collapsed on first visit

- **WHEN** a user opens a page for the first time (no `localStorage` entry exists for the accordion)
- **THEN** the accordion is rendered collapsed

#### Scenario: Accordion restores last-open state

- **WHEN** a user reopens a page after previously expanding an accordion
- **THEN** the accordion is rendered expanded based on the persisted `localStorage` value

### Requirement: Tabs pattern is used for mutually exclusive views of one subject

`Tabs` SHALL be used when a page presents three or more peer panels of the same subject where the user picks exactly one to view at a time, and where stacking them would mean a long scroll of unrelated content.

#### Scenario: Two-panel page uses Tabs

- **WHEN** a page has only two peer panels
- **THEN** the panels are rendered side-by-side or stacked, not as Tabs

#### Scenario: Tab labels are short and explicit

- **WHEN** a tab strip is rendered
- **THEN** each tab label is at most three words and names the panel content (for example "Cloud", "Social", "Mail", "VPN") rather than a generic word like "Settings"

#### Scenario: Page header describes tabbed content

- **WHEN** a tabbed page is rendered
- **THEN** the page contains a one-line description above the tab strip naming all available tabs, so users do not miss content hidden under inactive tabs

### Requirement: Pages compose `<PageSection>`, not raw `Card` or `Accordion`

Pages SHALL compose their sections using the shared `<PageSection>` primitive. Pages SHALL NOT instantiate `Card`, `Accordion`, `AccordionSummary`, or `AccordionDetails` directly for sectioning purposes. Direct use of those MUI primitives is reserved for inner content (for example a card inside a list item).

#### Scenario: Page imports raw Accordion for sectioning

- **WHEN** a page file imports `Accordion` from `@mui/material` and uses it for top-level sectioning
- **THEN** the import is replaced with `<PageSection variant="accordion">` from the shared primitives

#### Scenario: Page imports raw Card for sectioning

- **WHEN** a page file imports `Card` from `@mui/material` and uses it as a top-level section wrapper
- **THEN** the import is replaced with `<PageSection variant="card">` from the shared primitives

### Requirement: Section headings come from `<SectionHeader>`

All section and subsection titles SHALL be rendered through the `<SectionHeader level={2|3}>` primitive, which renders the appropriate `<Typography>` and applies the documented heading scale. Pages SHALL NOT render `<Typography variant="h2">` or `"h3">` directly for section titles.

#### Scenario: Page renders Typography h2 directly

- **WHEN** a page file renders `<Typography variant="h2">` for a section title
- **THEN** the element is replaced with `<SectionHeader level={2}>`

### Requirement: Shared `BackupTargetSelector` is used wherever the target/preset/power-off form appears

The repeated "target storage select + preset source partition + preset target partition + power off checkbox" form SHALL be implemented exactly once in `webapp/src/components/BackupTargetSelector.jsx` and consumed by every page or component that needs it. Independent re-implementations of any subset of those controls are not allowed.

#### Scenario: Component duplicates the target+preset+power-off form

- **WHEN** any component re-implements the target storage select, preset source partition select, preset target partition select, or power off checkbox locally
- **THEN** the component is updated to consume `BackupTargetSelector` instead

#### Scenario: BackupTargetSelector exposes per-field visibility props

- **WHEN** a consumer needs only a subset of the form (for example only the target select and the power-off checkbox)
- **THEN** `BackupTargetSelector` accepts props (`showPresetSource`, `showPresetTarget`, `showPowerOff`) to opt out of the unwanted controls

### Requirement: Page-level Tabs strips are horizontally scrollable on narrow viewports

Every page-level MUI `<Tabs>` strip — that is, each `<Tabs>` instance rendered as the primary navigation between top-level panels of a page (currently `Storage.jsx`, `Network.jsx`, `System.jsx`, `Connections.jsx`, and any future page that uses Tabs for the same purpose) — SHALL pass `variant="scrollable"`, `scrollButtons="auto"`, and `allowScrollButtonsMobile` so the strip overflows horizontally rather than clipping right-most tabs and so the scroll buttons render on touch viewports as well as on desktop.

This rule is purely additive over the existing Tabs requirements (3+ peer panels, short labels, header describes content). It does not modify when Tabs are chosen, only how a chosen Tabs strip must be rendered.

#### Scenario: Page-level Tabs strip overflows on a narrow viewport

- **WHEN** the viewport width is narrower than the combined intrinsic width of the tab labels (e.g., a mobile viewport of 375px on a four-tab page)
- **THEN** the strip MUST overflow horizontally — the tab strip's scrollable container has `overflow-x: auto` (the MUI scrollable variant's contract)
- **AND** scroll buttons MUST be rendered (because `scrollButtons="auto"` shows them when overflow is present, and `allowScrollButtonsMobile` keeps them visible on touch viewports)
- **AND** activating the right-most tab via tap or scroll-button click MUST switch the page to the corresponding panel

#### Scenario: Page-level Tabs strip on a wide viewport

- **WHEN** the viewport is wide enough to show every tab label without overflow (e.g., a desktop viewport of 1280px)
- **THEN** no scroll buttons are rendered — the `scrollButtons="auto"` prop hides them when overflow is absent
- **AND** every tab is reachable by tap or click without scrolling

#### Scenario: New page introduces a tab strip

- **WHEN** a new page-level `<Tabs>` instance is added in `webapp/src/pages/`
- **THEN** the instance MUST be authored with all three props (`variant="scrollable"`, `scrollButtons="auto"`, `allowScrollButtonsMobile`); a Tabs instance missing any of the three is a defect of this requirement

### Requirement: Page-level Tabs persist the active tab under a symbolic localStorage key

Every page-level `<Tabs>` strip SHALL persist the user's last-active tab to `localStorage` under the key `lbb-tabs-<page-route-slug>` (for example `lbb-tabs-storage`, `lbb-tabs-system`, `lbb-tabs-maintenance`). The stored value MUST be the symbolic name of the tab (for example `'database'`, `'logs'`, `'locale'`) — never the numeric index — so that adding, removing, or reordering tabs in the React code never silently re-routes a user's saved selection to a different panel.

When the page renders, it SHALL read the stored value and select the tab whose symbolic name matches; if the stored value is absent or no longer matches any tab, the page SHALL fall back to the first tab (index `0`) without throwing.

This rule applies in addition to the existing Tabs requirements (3+ peer panels, short labels, header describes content, mobile scrollability).

#### Scenario: User selects a tab and reloads

- **WHEN** the user selects a non-default tab (for example "Files" on `/maintenance`)
- **AND** reloads the page
- **THEN** the same tab is selected after the reload
- **AND** `localStorage.getItem('lbb-tabs-maintenance')` returns the matching symbolic name (for example `'files'`)

#### Scenario: Tab order changes between deploys

- **WHEN** a code change reorders the tabs of a page (for example moves "Logs" from index 3 to index 0 of `/system`)
- **AND** a returning user has `localStorage` containing the prior selection (for example `lbb-tabs-system = 'logs'`)
- **THEN** the user still lands on the Logs tab after the deploy, because the persisted value is symbolic, not positional

#### Scenario: Persisted value no longer matches any tab

- **WHEN** a returning user has `localStorage` containing a value that no current tab uses (for example `lbb-tabs-maintenance = 'legacy'`)
- **THEN** the page renders the first tab (index `0`) without throwing
- **AND** the next user-driven tab change overwrites the stale value

### Requirement: Multi-field configuration pages use a single page-level Save button; independent-toggle pages may autosave

Configuration pages SHALL fall into one of two categories, and the category determines the save UX:

**Multi-field configuration pages**: pages whose forms are *transactional units* — collections of related fields that are meaningful only when applied together (an SMTP server config, a WiFi config, a fan PWM curve, a cloud-remote config). On these pages:

- The page MUST render exactly one Save button using the shared `<PageSaveBar>` primitive at `webapp/src/components/PageSaveBar.jsx`. The bar is sticky to the bottom of the viewport and visible on every tab of the page.
- Field changes MUST NOT trigger any `updateConfig` (or equivalent backend save) call on their own. Saves only happen on user click of the page-level Save button.
- The Save button is enabled iff *any* form on the page is dirty (i.e., its current state differs from its last-saved snapshot).
- A single click of the Save button persists every dirty form on the page. Implementations MAY issue one `updateConfig` call with a merged payload, or several parallel calls — the user-visible behaviour is the same: one click, all-or-nothing.
- Every form on the page exposes its `(isDirty, save)` state to the page via the `onSavedStateChange(isSaved, handleSave)` callback contract already used by `CloudConfig`, `SocialMediaConfig` (and extended to `DisplayConfig`, `ButtonHardwareConfig`, `FanConfig`, `VPNConfig` by this change).

The four current pages in this category are `/integrations`, `/network`, `/hardware` (each MUST use the page-level Save button) plus any future page composing transactional configuration forms.

**Independent-toggle pages**: pages whose fields are each *self-contained user preferences* whose effect is immediate and isolated (theme, language, timezone, popup-on/off, virtual-keyboard-on/off). On these pages:

- The page MAY autosave on field change (debounced page-wide, not per-field). The single current page in this category is `/preferences`.
- Autosave MUST be guarded by a last-saved snapshot so the load transition (config arrives → form state populates) does not trigger a save.

#### Scenario: Multi-field page on initial load

- **WHEN** the user opens `/integrations` (or `/network` or `/hardware`) and the page loads its current `config` values
- **THEN** zero `POST /api/config/save` (or equivalent `updateConfig`) requests are issued
- **AND** no "Settings saved" toast appears
- **AND** the page-level Save button is rendered disabled (no form is dirty)

#### Scenario: User edits multiple tabs and saves once

- **WHEN** the user opens `/integrations`, edits a field on the Cloud tab, switches to the Mail tab, edits a field there, and clicks the page-level Save button
- **THEN** `updateConfig` is called once (or in parallel for the dirty forms) with both edits in the resulting payload
- **AND** the Save button transitions to disabled after the request resolves
- **AND** a single "Settings saved" toast appears

#### Scenario: User navigates away with unsaved changes

- **WHEN** the user has unsaved changes on `/network` and clicks a different sidebar item
- **THEN** the change is silently discarded (no confirmation prompt — out of scope for this change)
- **AND** when the user returns, the page renders the last persisted config values

#### Scenario: Independent-toggle page on initial load

- **WHEN** the user opens `/preferences` and the page loads its current `config` values
- **THEN** zero `POST /api/config/save` requests are issued
- **AND** no "Settings saved" toast appears
- **AND** field changes after this point trigger a single debounced `updateConfig` call with the changed fields

