import { test, expect } from '@playwright/test';

test.describe('DatabaseOperations on Backup page', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any failure mode before each test
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('lbb-mock-controls', JSON.stringify({ delay: 0, failureMode: '' }));
    });
  });

  test('Expand Database Operations accordion', async ({ page }) => {
    await page.goto('/');

    // Find and expand the Database Operations accordion
    const accordion = page.getByRole('button', { name: /database operations/i });
    await expect(accordion).toBeVisible();
    await accordion.click();

    // The Generate thumbnails button should now be visible
    const generateBtn = page.getByRole('button', { name: /generate thumbnails/i });
    await expect(generateBtn).toBeVisible();
  });

  test('Clicking Generate thumbnails button disables it during execution and shows success toast', async ({
    page,
  }) => {
    await page.goto('/');

    // Expand accordion
    const accordion = page.getByRole('button', { name: /database operations/i });
    await accordion.click();

    const generateBtn = page.getByRole('button', { name: /generate thumbnails/i });
    await expect(generateBtn).toBeVisible();

    await generateBtn.click();

    // Button should be disabled while executing
    await expect(generateBtn).toBeDisabled();

    // Success toast should appear
    await expect(page.getByText(/operation completed successfully/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('Shows inline Alert when failure mode is disk_full', async ({ page }) => {
    await page.goto('/');

    // Set failure mode to disk_full
    await page.evaluate(() => {
      localStorage.setItem(
        'lbb-mock-controls',
        JSON.stringify({ delay: 0, failureMode: 'disk_full' })
      );
    });

    // Expand accordion
    const accordion = page.getByRole('button', { name: /database operations/i });
    await accordion.click();

    const generateBtn = page.getByRole('button', { name: /generate thumbnails/i });
    await generateBtn.click();

    // Inline error alert should appear
    await expect(page.getByText(/not enough disk space/i)).toBeVisible({ timeout: 10000 });
  });
});
