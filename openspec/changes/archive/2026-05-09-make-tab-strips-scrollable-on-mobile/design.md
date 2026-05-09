## Context

Four pages use MUI `<Tabs>` as their top-level navigation between peer panels: `Storage.jsx` (5 tabs), `Network.jsx` (3 tabs), `System.jsx` (4 tabs), `Connections.jsx` (4 tabs). The default MUI `<Tabs>` variant is `"standard"`, which sizes the strip to the container and clips overflow. On narrow viewports (< ~600px), the right-most tab labels fall off the visible area and become unreachable — there is no scroll affordance, no overflow indicator, and the tabs do not wrap. The pages most affected in practice are `Storage` (longer labels) and `Connections`/`System` at sub-360px widths.

MUI provides three props that, used together, fix this:

- `variant="scrollable"` makes the strip's container `overflow-x: auto` so labels can extend past the visible width.
- `scrollButtons="auto"` renders left/right chevron buttons only when overflow is present.
- `allowScrollButtonsMobile` keeps those buttons visible on touch viewports (MUI defaults to hiding them under `pointer: coarse` since touch users can swipe; we keep them so the affordance is visible regardless of input modality).

The change itself is one additive prop set per page. The interesting decisions are about scope.

## Goals / Non-Goals

**Goals:**

- Every page-level `<Tabs>` strip works on a 320–375px viewport.
- The rule is encoded in the `webapp-ui-pattern-system` spec so future tab strips inherit it without a code-review catch.
- One Playwright test guards against regression — independent of which page hosts the tabs.

**Non-Goals:**

- Changing tab labels, IA, or which controls live behind which tab.
- Restyling the tabs visually beyond the MUI defaults for the scrollable variant.
- Touching nested or in-content `<Tabs>` instances (there are none today; the rule applies to page-level strips only).
- Updating older PHP-snapshot UI under `/scrape`.

## Decisions

**Use all three MUI props together rather than just `variant="scrollable"`.**

Considered: `variant="scrollable"` alone (with the implicit default `scrollButtons="auto"` and the default-hidden mobile behaviour). Rejected because mobile is precisely the case the bug shows up in — without `allowScrollButtonsMobile`, the buttons are hidden on touch viewports and the affordance is invisible to the very users we are fixing this for. Swipe-to-scroll exists, but touch users on a desktop browser at narrow widths do not get gesture support reliably. Showing the buttons is universally safe and adds no clutter at desktop widths (they hide when overflow is absent).

**Encode the rule in the existing pattern-system spec, not a new capability.**

`webapp-ui-pattern-system` already governs Tabs choice and tab-label rules. Adding a fourth requirement there keeps every Tabs-related rule discoverable in one place. Creating a new capability for one rule would scatter the spec.

**Add the rule as ADDED, not MODIFIED.**

The existing Tabs requirements (`Tabs pattern is used for mutually exclusive views of one subject`, `Two-panel page uses Tabs`, `Tab labels are short and explicit`, `Page header describes tabbed content`) all govern *when* and *what*. The new requirement governs *how to render*. None of the existing requirements is being changed, so this is a pure addition.

**One Playwright test, not per-page.**

The failure mode is a property of the `<Tabs>` strip, not of any specific page's content. A single test against one of the four pages (probably `Storage` since it has the most tabs, so overflow shows up at the widest viewport) at a mobile viewport size validates the contract. Per-page tests would multiply maintenance cost without catching different bugs. The spec's third scenario — "new page introduces a tab strip" — is enforced by the requirement itself plus code review, not by an automated check; building a static-analysis sweep over `<Tabs>` props is more infrastructure than the bug warrants.

**Mobile viewport size: 375 × 667 (iPhone SE / `Mobile Safari` profile).**

This is a common Playwright mobile profile and is narrow enough to force overflow on every one of the four pages. We do not need to test multiple viewport widths — the requirement is "if it overflows, it must scroll", not "must look identical at every breakpoint".

## Risks / Trade-offs

- **Scroll buttons add visual chrome at narrow widths.** → Acceptable. Mobile users currently see nothing at all when tabs overflow; a chevron is strictly better than missing content. The chrome disappears on wide viewports because of `scrollButtons="auto"`.
- **Future page-level Tabs strips might silently omit the props.** → Mitigated by encoding the rule in the spec and by the Playwright test that exercises the existing pages. A new page that adds a Tabs strip without the props will not be caught by the test (which exercises one specific page) — but the spec gives the code reviewer a clear rule to point to. Trading off: a generic "all Tabs in this directory have these props" lint rule is overkill for four call sites.
- **Some Connections/System tab labels are long enough to overflow even at desktop widths if the user has narrow window.** → Already scoped in. The fix applies at every viewport; the buttons just hide when not needed.

## Migration Plan

No migration. Pure additive prop change. No state, storage, or API surface affected. Existing E2E tests continue to pass (they exercise tab clicks, which work identically under the scrollable variant).
