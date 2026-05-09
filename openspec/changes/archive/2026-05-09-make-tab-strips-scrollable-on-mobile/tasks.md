## 1. Pre-flight

- [x] 1.1 Confirm the four `<Tabs>` instances and the file:line of each: `webapp/src/pages/Storage.jsx:492` (5 tabs), `Network.jsx:443` (3 tabs), `System.jsx:101` (4 tabs), `Connections.jsx:450` (4 tabs). Verify no other page-level Tabs exist (`grep -rn '<Tabs' webapp/src/pages/`).

## 2. Add scrollable props to all four pages

- [x] 2.1 In `webapp/src/pages/Storage.jsx`, add `variant="scrollable"`, `scrollButtons="auto"`, `allowScrollButtonsMobile` to the `<Tabs>` element on line ~492.
- [x] 2.2 In `webapp/src/pages/Network.jsx`, do the same on line ~443.
- [x] 2.3 In `webapp/src/pages/System.jsx`, do the same on line ~101.
- [x] 2.4 In `webapp/src/pages/Connections.jsx`, do the same on line ~450.

## 3. E2E test for scrollable mobile behaviour

- [x] 3.1 Add `webapp/tests/e2e/tabs-mobile-scroll.spec.js` (chromium project, no new playwright project needed). Use `page.setViewportSize({ width: 375, height: 667 })` inside the test.
- [x] 3.2 Pick `Storage` as the test target (5 tabs — most likely to overflow). Navigate to `/storage`, assert the tab strip is rendered, assert `overflow-x` of the strip's scroller container is `auto` (or `scroll`), assert the right-most tab label is reachable: scroll the strip, then click it, then assert the corresponding panel renders.
- [x] 3.3 Add a second assertion at desktop viewport (1280×800) on the same page asserting that scroll-button elements are absent (or have `aria-hidden="true"` because there is no overflow), to lock in the "wide viewport renders no chrome" branch of the spec.

## 4. Validate

- [x] 4.1 `cd webapp && npm run lint` — no new errors introduced by this change. (31 pre-existing errors confirmed unchanged.)
- [x] 4.2 `cd webapp && npx playwright test tests/e2e/tabs-mobile-scroll.spec.js --project=chromium` — both assertions pass (4.2s).
- [x] 4.3 Regression suite: `integrations-tabs.spec.js` (the directly tab-related test) passes 2/2. `sysinfo.spec.js` and `ui-conformance.spec.js` have 12 pre-existing failures unrelated to this change — they assert on content/headings the IA redesign moved or removed (e.g., "disk space" no longer on `/system`, h4/h5/h6 leakage on pages this change does not touch). Backlog item "Clean up pre-existing ESLint errors" + "Audit existing pages against pattern-system" both already cover follow-up.

## 5. Backlog hygiene

- [x] 5.1 Removed the "Make tab strips horizontally scrollable on mobile" bullet from `openspec/BACKLOG.md` "Soon" section.

## 6. Test-infra fix discovered while validating

When validating this change, the Playwright test connected to the wrong app because port 5173 on this dev machine is held on `::1` (IPv6 loopback) by another project's vite, while macOS resolves `localhost` to `::1` first. Fixed test infrastructure so the suite can run alongside other vite servers without manual port juggling.

- [x] 6.1 `webapp/playwright.config.js`: pick free ports at config-load time (preferring 5173/3000, falling back to OS-allocated ports), require both IPv4 and IPv6 loopback to be free before keeping the preferred port, and cache the resolved choice in env vars so forked workers re-evaluating the config use the same port as the orchestrator that started webServer. Switch `baseURL` and `webServer.url` to `http://127.0.0.1:<port>` to dodge dual-stack `localhost` resolution.
- [x] 6.2 `webapp/vite.config.js`: read `VITE_DEV_PORT`, `VITE_DEV_API_PORT`, and `VITE_DEV_HOST` from env (defaults preserved at 5173 / `localhost:3000` / `localhost`); set `strictPort: true` only when `VITE_DEV_PORT` is explicitly set, so plain `npm run dev` keeps its current port-fallback behaviour and only the test runner forces a specific port.
