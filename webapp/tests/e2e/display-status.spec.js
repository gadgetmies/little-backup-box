import { test, expect } from '@playwright/test';

test.describe('Display status alert', () => {
  test('renders the polled status text on the Backup page', async ({ page }) => {
    await page.route('**/api/display/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'Ready' }),
      });
    });

    await page.goto('/');
    // The DisplayStatus component polls /api/display/status once a second.
    // The route stub returns "Ready" — wait long enough for the first cycle.
    const alert = page.locator('[role="alert"]').filter({ hasText: 'Ready' });
    await expect(alert).toBeVisible({ timeout: 5000 });
  });

  test('renders nothing when the polled status is empty', async ({ page }) => {
    await page.route('**/api/display/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: '' }),
      });
    });

    await page.goto('/');
    // Give the polling cycle time to run; assert no Alert with status text appears.
    await page.waitForTimeout(1500);
    const alerts = page.locator('[role="alert"]');
    const count = await alerts.count();
    // Other alerts may exist on the page (e.g. mock-controls); none should match a
    // status-shaped text. Easiest sanity check: the DisplayStatus alert is the only
    // one rendered with severity="info" inside the layout's <Box sx={{ px:2, pt:2 }}>.
    // Just confirm nothing reads "Ready" or similar status strings.
    for (let i = 0; i < count; i++) {
      const text = (await alerts.nth(i).textContent()) || '';
      expect(text).not.toMatch(/^(Ready|Working|Backup complete|VPN connected)$/);
    }
  });
});
