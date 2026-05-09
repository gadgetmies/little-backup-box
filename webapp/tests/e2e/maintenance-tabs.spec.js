import { test, expect } from '@playwright/test';

test.describe('Maintenance — Database / Files / Settings tabs', () => {
  test('renders all three tab labels', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');

    for (const label of ['Database', 'Files', 'Settings']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
  });

  test('selecting a tab persists across reload via lbb-tabs-maintenance', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Files' }).click();
    const stored = await page.evaluate(() => window.localStorage.getItem('lbb-tabs-maintenance'));
    expect(stored).toBe('files');

    await page.reload();
    await page.waitForLoadState('networkidle');

    const filesTab = page.getByRole('tab', { name: 'Files' });
    await expect(filesTab).toHaveAttribute('aria-selected', 'true');
  });
});
