## ADDED Requirements

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
