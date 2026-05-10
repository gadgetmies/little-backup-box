import { test, expect } from '@playwright/test';

test.describe('Integrations — Cloud / Social / Mail tabs', () => {
  test('renders all three tab labels', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');

    for (const label of ['Cloud', 'Social', 'Mail']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
  });

  test('selecting a tab persists across reload via lbb-tabs-integrations', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Mail' }).click();
    // Confirm persistence write
    const stored = await page.evaluate(() => window.localStorage.getItem('lbb-tabs-integrations'));
    expect(stored).toBe('mail');

    await page.reload();
    await page.waitForLoadState('networkidle');

    // The Mail tab should be selected after reload
    const mailTab = page.getByRole('tab', { name: 'Mail' });
    await expect(mailTab).toHaveAttribute('aria-selected', 'true');
  });
});
