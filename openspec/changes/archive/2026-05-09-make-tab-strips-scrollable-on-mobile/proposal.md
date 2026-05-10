## Why

The four tab-strip pages (`/storage`, `/network`, `/system`, `/integrations`) each render an MUI `<Tabs>` strip with three or four tab labels. On narrow viewports the strip overflows the page width and the right-most tab(s) are clipped off-screen with no way to scroll to them — they are simply unreachable. MUI ships a built-in fix (`variant="scrollable"`, `scrollButtons="auto"`, `allowScrollButtonsMobile`); we just have to opt into it. The `webapp-ui-pattern-system` spec already governs Tabs usage but has no rule about mobile fit, which is why every page that adopted Tabs reproduced the same defect.

## What Changes

- **Add scrollable behaviour to every page-level `<Tabs>` strip**: pass `variant="scrollable"`, `scrollButtons="auto"`, `allowScrollButtonsMobile` to the four existing instances in `webapp/src/pages/Storage.jsx`, `Network.jsx`, `System.jsx`, and `Connections.jsx`.
- **Encode the rule in the pattern-system spec**: add a new requirement under the Tabs pattern requiring page-level `<Tabs>` to be horizontally scrollable with mobile-visible scroll buttons, so future tab strips inherit the rule.
- **Add an E2E assertion at a narrow viewport**: a Playwright test (mobile-viewport profile) that renders one of the four pages, asserts the strip is rendered with `overflow-x` scrolling, and verifies the right-most tab can be activated after the user scrolls/clicks the scroll button. This protects against the regression of dropping the props.

Non-goals: changing the per-tab labels, restructuring the page IA, or moving any controls in or out of tab strips. Pure additive props plus one spec requirement.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `webapp-ui-pattern-system`: add a new Tabs requirement covering mobile-viewport scrollability and required MUI `<Tabs>` props on page-level tab strips.

## Impact

- **Frontend**: four-line prop addition in each of `webapp/src/pages/Storage.jsx`, `Network.jsx`, `System.jsx`, `Connections.jsx`. No new components, no new state.
- **Tests**: one new Playwright test (mobile-viewport profile) under `webapp/tests/e2e/`. No existing test should regress — the desktop layout is unchanged because at desktop widths there is no overflow and no scroll buttons render.
- **i18n**: none — scroll buttons render arrow icons, no text labels.
- **No backend changes, no script changes, no new deps.**
