import { test, expect } from '@playwright/test';

test.describe('Hardware — Display / Buttons / Fan tabs', () => {
  test('renders all three tab labels', async ({ page }) => {
    await page.goto('/hardware');
    await page.waitForLoadState('networkidle');

    for (const label of ['Display', 'Buttons', 'Fan']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }
  });

  test('selecting a tab persists across reload via lbb-tabs-hardware', async ({ page }) => {
    await page.goto('/hardware');
    await page.waitForLoadState('networkidle');

    await page.getByRole('tab', { name: 'Fan' }).click();
    const stored = await page.evaluate(() => window.localStorage.getItem('lbb-tabs-hardware'));
    expect(stored).toBe('fan');

    await page.reload();
    await page.waitForLoadState('networkidle');

    const fanTab = page.getByRole('tab', { name: 'Fan' });
    await expect(fanTab).toHaveAttribute('aria-selected', 'true');
  });
});
