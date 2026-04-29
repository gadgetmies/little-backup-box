import { test, expect } from '@playwright/test';

test.describe('View page — foundation', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any failure-mode flags
    await page.addInitScript(() => {
      localStorage.removeItem('lbb-mock-failure');
    });
  });

  // --- Slice 3 ---

  test('View route renders at /view', async ({ page }) => {
    await page.goto('/view');
    await expect(page).toHaveURL('/view');
    // The medium selector label should be visible
    await expect(page.getByLabel(/storage medium/i).first()).toBeVisible();
  });

  test('Medium selector appears on /view', async ({ page }) => {
    await page.goto('/view');
    await expect(page.getByLabel(/storage medium/i).first()).toBeVisible();
  });

  test('Selecting a medium loads image grid', async ({ page }) => {
    await page.goto('/view');
    // Wait for the medium selector to appear and have options
    const mediumSelect = page.getByLabel(/storage medium/i).first();
    await expect(mediumSelect).toBeVisible();
    // The mock auto-selects the first available medium and loads images
    // Wait for at least one image card to appear
    await expect(page.locator('[data-testid="image-card"], .MuiCard-root').first()).toBeVisible({
      timeout: 10000,
    });
  });

  test('not_mounted failure shows Alert', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('lbb-mock-failure', 'not_mounted');
    });
    await page.goto('/view');
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('alert')).toContainText(/not mounted/i);
  });

  // --- Slice 4 ---

  test('Sort controls are present', async ({ page }) => {
    await page.goto('/view');
    // Sort field select
    await expect(page.getByLabel(/sort by/i).first()).toBeVisible({ timeout: 10000 });
    // Per-page select
    await expect(page.getByLabel(/per page/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('Pagination navigates to page 2', async ({ page }) => {
    await page.goto('/view');
    // Wait for images to load
    await expect(page.locator('.MuiCard-root').first()).toBeVisible({ timeout: 10000 });
    // Click page 2 in pagination
    const page2Button = page.getByRole('button', { name: /^2$/ });
    await expect(page2Button).toBeVisible({ timeout: 5000 });
    await page2Button.click();
    // After clicking page 2, images should still be visible
    await expect(page.locator('.MuiCard-root').first()).toBeVisible({ timeout: 10000 });
  });

  test('Per-page change reloads grid', async ({ page }) => {
    await page.goto('/view');
    await expect(page.locator('.MuiCard-root').first()).toBeVisible({ timeout: 10000 });
    // Change per-page to 10
    const perPageSelect = page.getByLabel(/per page/i).first();
    await perPageSelect.click();
    await page.getByRole('option', { name: '10' }).click();
    // Grid should reload (still show cards)
    await expect(page.locator('.MuiCard-root').first()).toBeVisible({ timeout: 10000 });
  });

  // --- Slice 5 ---

  test('Clicking thumbnail opens single-image view', async ({ page }) => {
    await page.goto('/view');
    await expect(page.locator('.MuiCard-root').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.MuiCard-root').first().click();
    // Single image view should show a large image
    await expect(page.locator('img[style*="max-height"]')).toBeVisible({ timeout: 5000 });
  });

  test('Navigation buttons work in single-image view', async ({ page }) => {
    await page.goto('/view');
    await expect(page.locator('.MuiCard-root').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.MuiCard-root').first().click();
    // Next button should be visible
    await expect(page.getByRole('button', { name: /next/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole('button', { name: /next/i }).click();
    await expect(page.locator('img[style*="max-height"]')).toBeVisible({ timeout: 5000 });
  });

  test('Back to grid returns to grid view', async ({ page }) => {
    await page.goto('/view');
    await expect(page.locator('.MuiCard-root').first()).toBeVisible({ timeout: 10000 });
    await page.locator('.MuiCard-root').first().click();
    // Click back to grid button
    await expect(page.getByRole('button', { name: /back|grid|overview/i })).toBeVisible({
      timeout: 5000,
    });
    await page.getByRole('button', { name: /back|grid|overview/i }).click();
    // Should be back to grid
    await expect(page.locator('.MuiCard-root').first()).toBeVisible({ timeout: 10000 });
  });
});
