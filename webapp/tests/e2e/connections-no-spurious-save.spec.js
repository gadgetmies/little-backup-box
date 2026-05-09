import { test, expect } from '@playwright/test';

const PAGES = ['/integrations', '/network', '/hardware'];

for (const route of PAGES) {
  test(`${route} fires zero config-save requests on initial load`, async ({ page }) => {
    const saveRequests = [];
    page.on('request', (req) => {
      const url = req.url();
      const method = req.method();
      if (method === 'POST' && url.includes('/api/config/save')) {
        saveRequests.push(url);
      }
    });

    await page.goto(route);
    await page.waitForLoadState('networkidle');

    expect(
      saveRequests,
      `route ${route}: page load triggered ${saveRequests.length} unexpected POST(s) to /api/config/save`,
    ).toHaveLength(0);

    const savedToast = page.getByText(/config\.cfg was written successfully|Settings saved/i);
    await expect(savedToast).not.toBeVisible({ timeout: 1000 }).catch(() => {});
  });
}
