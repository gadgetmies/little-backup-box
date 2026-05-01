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
