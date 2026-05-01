import { test, expect } from '@playwright/test';

/**
 * UI conformance tests — enforce the heading-scale invariants from
 * `webapp/docs/ui-pattern-system.md`:
 *
 * - Exactly one h1 per page (the AppBar page title; pages do not duplicate it).
 * - No h4/h5/h6 typography variants in user-facing content.
 *
 * The route list below mirrors the current `webapp/src/App.jsx` route table.
 * When the route table changes (tasks 6.1 / 8.1), update this list to match
 * `webapp/docs/page-map.md`.
 *
 * NOTE: this spec is expected to fail until the per-page restructure tasks
 * (group 5 of the redesign-webapp-ui-structure change) land. Each failing
 * route is a page that still uses h5/h6 directly or duplicates the AppBar
 * title in the body; fixing the page is what makes the assertion green.
 */

const ROUTES = [
  '/',
  '/setup',
  '/tools',
  '/sysinfo',
  '/network',
  '/maintenance',
  '/integrations',
  '/scrape',
  '/view',
];

test.describe('UI conformance — heading scale', () => {
  for (const route of ROUTES) {
    test(`${route} renders exactly one h1`, async ({ page }) => {
      await page.goto(route);
      // Wait for the page title in the AppBar to settle.
      await page.waitForLoadState('networkidle');

      const h1Count = await page.locator('h1').count();
      expect(h1Count, `route ${route}: should have exactly one h1 (the AppBar title)`).toBe(1);
    });

    test(`${route} renders no h4/h5/h6 in page content`, async ({ page }) => {
      await page.goto(route);
      await page.waitForLoadState('networkidle');

      // MUI typography variants render as actual h-elements only when
      // `component` matches the variant. Pages that mis-use h4-h6 do so via
      // <Typography variant="h5"> with the default component, which renders as
      // <h5>. Match raw element selectors so the assertion catches both forms.
      const h4 = await page.locator('main h4, [role="main"] h4, h4').count();
      const h5 = await page.locator('main h5, [role="main"] h5, h5').count();
      const h6 = await page.locator('main h6, [role="main"] h6, h6').count();

      expect(h4 + h5 + h6, `route ${route}: page content uses disallowed heading levels`)
        .toBe(0);
    });
  }
});
