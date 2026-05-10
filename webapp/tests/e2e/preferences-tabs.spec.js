import { test, expect } from '@playwright/test';

test.describe('Preferences — Display / Locale / Backup defaults tabs', () => {
  test('renders all three tab labels', async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');

    for (const label of ['Display', 'Locale', 'Backup defaults']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
  });

  test('selecting a tab persists across reload via lbb-tabs-preferences', async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Locale' }).click();
    const stored = await page.evaluate(() => window.localStorage.getItem('lbb-tabs-preferences'));
    expect(stored).toBe('locale');

    await page.reload();
    await page.waitForLoadState('networkidle');

    const localeTab = page.getByRole('tab', { name: 'Locale' });
    await expect(localeTab).toHaveAttribute('aria-selected', 'true');
  });
});
