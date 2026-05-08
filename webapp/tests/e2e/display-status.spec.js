import { test, expect } from '@playwright/test';

test.describe('Display status alert', () => {
  test('renders the polled status text on the Backup page', async ({ page }) => {
    await page.goto('/');
    // The DisplayStatus component polls /api/display/status once a second.
    // The mock fixture returns "Ready"; wait long enough for the first cycle.
    const alert = page.locator('[role="alert"]', { hasText: 'Ready' });
    await expect(alert).toBeVisible({ timeout: 5000 });
  });
});
