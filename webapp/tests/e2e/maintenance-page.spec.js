import { test, expect } from '@playwright/test';

test.describe('Maintenance page', () => {
  test('renders four accordions with the documented localStorage keys', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');

    // Each accordion title should be visible
    await expect(page.getByRole('button', { name: /Database operations/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /File operations/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Settings/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /(LibRaw|Updates|Update)/i })).toBeVisible();
  });

  test('expanding the Database operations accordion persists state', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');

    const dbAccordion = page.getByRole('button', { name: /Database operations/i });
    await dbAccordion.click();

    const stored = await page.evaluate(() =>
      window.localStorage.getItem('lbb-accordion-maintenance-database'),
    );
    expect(stored).toBe('true');
  });
});
