# OpenSpec backlog

Ideas and follow-ups that aren't ready to be (or aren't worth) full openspec changes yet. This is a plain Markdown convention, not an openspec primitive — `openspec list` does not see this file. Promote an item by running `openspec new change <kebab-name>` and remove the bullet here in the same PR.

Format per entry: one bullet stating what to do, and *why now* (or "why eventually" if it's vague). Add a pointer to the relevant code/spec/change if it makes the entry actionable.

## Soon

- **Add a catch-all 404 route in `webapp/src/App.jsx`.** Removing the legacy `/setup` / `/tools` / `/sysinfo` redirects (commit 6b853f1) means stale bookmarks now fall through React Router and render a blank page. A one-line `<Route path="*" element={<Navigate to="/" replace />} />` would route them to Backup. Defer until we see whether anyone actually hits the blank page in practice.
- **Run the full Playwright suite locally and fix any conformance regressions.** Tasks 8.4 / 10.3 of `redesign-webapp-ui-structure` were deferred because the suite needs the dev server. The new `tests/e2e/ui-conformance.spec.js` now expects exactly one h1 on every page; the AppBar fix (`component="h1"` in `Menu.jsx`) is meant to make this green but no one has confirmed it yet.
- **Manual smoke of the redesigned UI.** Task 10.2: `npm run dev:mock`, click each sidebar item, every Integrations tab, every Maintenance accordion. Confirm AppBar title matches the page-map and no body-rendered h1 appears.

## Eventually

- **Replace inline `<Typography variant="h2|h3">` with `<SectionHeader>` on Storage and Network.** The pattern-system spec (`openspec/specs/webapp-ui-pattern-system/spec.md`) requires it; the conformance test does not enforce it (only h4–h6 are blocked). About a dozen call sites between the two pages. Pure refactor, no user-visible change.
- **Clean up pre-existing ESLint errors in untouched components.** `CloudConfig.jsx`, `FilterBar.jsx`, `LogMonitor.jsx`, etc. have 6 `Cannot access variable before it is declared` and `no-async-promise-executor` errors that predate any of the recent restructure work. They didn't block landing because the lint script doesn't fail CI on errors today, but they will surface the moment we tighten that.
- **Update `webapp/.PLANS/00-index.md`** to point at the new `webapp/docs/page-map.md` and `feature-catalog.md` for placement decisions. The redesign tasks claimed this would land but it didn't.
- **Add an icon to `<PageSection>` for use on Devices / Network / Storage.** Already noted as an open question in `redesign-webapp-ui-structure` design.md; deferred until first page actually wants one.
- **Restructure `/scrape` (Legacy UI).** Currently a thin index over auto-generated PHP snapshots. Out of scope for the IA redesign. Worth revisiting once the PHP UI is genuinely retired.

## Won't do (and why)

- **Move route-title resolution from `Menu.jsx:getPageTitle()` into a route-config object exported from `App.jsx`.** Mentioned as an open question in `redesign-webapp-ui-structure/design.md`. Worth doing in principle, but it's a refactor that touches an unrelated concern (routing infrastructure) and should not piggyback on a structural change. Open a focused change if/when it's useful — not a backlog item we expect to act on.
