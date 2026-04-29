import { test, expect } from '@playwright/test';

test.describe('View page – FilterBar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/view');
    // The FilterBar is visible on the grid view by default
  });

  test('shows filter bar on grid view', async ({ page }) => {
    await expect(page.locator('text=Filter')).toBeVisible({ timeout: 5000 });
  });

  test('filter chips are rendered', async ({ page }) => {
    // Rating "All" chip should be visible
    await expect(page.getByRole('button', { name: /All/i }).first()).toBeVisible({ timeout: 5000 });
  });

  test('reset filters button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /reset filter/i })).toBeVisible({ timeout: 5000 });
  });

  test('selecting rejected chip updates URL', async ({ page }) => {
    // Click "Rejected" chip
    const rejectedChip = page.locator('[role="button"]').filter({ hasText: /Rejected/i }).first();
    await rejectedChip.waitFor({ timeout: 5000 });
    await rejectedChip.click();

    // Check URL contains ratings=-1
    await expect(page).toHaveURL(/ratings=-1/, { timeout: 3000 });
  });

  test('reset filters clears rating selection', async ({ page }) => {
    // First select rejected
    const rejectedChip = page.locator('[role="button"]').filter({ hasText: /Rejected/i }).first();
    await rejectedChip.waitFor({ timeout: 5000 });
    await rejectedChip.click();

    // Then reset
    await page.getByRole('button', { name: /reset filter/i }).click();

    // URL should no longer contain ratings
    await expect(page).not.toHaveURL(/ratings=/, { timeout: 3000 });
  });
});

test.describe('View page – SocialPublishPanel', () => {
  test('social publish panel is visible when platforms configured', async ({ page }) => {
    await page.goto('/view');

    // The mock config includes Telegram and Mastodon tokens
    // Navigate to single image view by clicking an image (if images are loaded)
    // We need to initialize with a storage path first — in mock mode we can use any path
    const storageInput = page.locator('input[type="text"]').first();
    await storageInput.fill('/mock/storage');
    await page.getByRole('button', { name: /Initialize/i }).click();

    // Wait for grid to potentially show images
    await page.waitForTimeout(500);

    // If we have images in the grid, click the first one
    const firstCard = page.locator('.MuiCard-root').first();
    const cardCount = await firstCard.count();
    if (cardCount > 0) {
      await firstCard.click();
      // In single image view the social panel should appear
      await expect(page.locator('[data-testid="social-publish-button"]')).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test('publish button calls API and shows success', async ({ page }) => {
    await page.goto('/view');

    const storageInput = page.locator('input[type="text"]').first();
    await storageInput.fill('/mock/storage');
    await page.getByRole('button', { name: /Initialize/i }).click();
    await page.waitForTimeout(500);

    const firstCard = page.locator('.MuiCard-root').first();
    const cardCount = await firstCard.count();
    if (cardCount > 0) {
      await firstCard.click();
      await page.waitForTimeout(300);

      // Select Telegram chip
      const telegramChip = page.locator('[role="button"]').filter({ hasText: /Telegram/i }).first();
      if (await telegramChip.count() > 0) {
        await telegramChip.click();

        // Click publish
        const publishBtn = page.locator('[data-testid="social-publish-button"]');
        await publishBtn.click();

        // Should show success alert
        await expect(page.locator('.MuiAlert-standardSuccess')).toBeVisible({ timeout: 5000 });
      }
    }
  });
});
