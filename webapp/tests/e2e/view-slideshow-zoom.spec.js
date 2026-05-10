import { test, expect } from '@playwright/test';

/**
 * Helper: navigate to the View page and enter single-image view.
 *
 * Since the mock API returns an empty image list, we need to set up mock
 * images by manipulating the page state. The tests directly manipulate
 * the React app state through the UI or check element presence in the
 * single-image toolbar which is rendered when viewMode === 'single'.
 *
 * For these tests we use the toggle icon to switch to single view mode
 * (which renders "selectedImage && ..." — but since images is empty the
 * paper won't render). Instead, we focus tests on what IS visible:
 * the grid view controls and the toolbar that appears once an image is selected.
 */

test.describe('View Page — Slideshow & Zoom', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/view');
    // Wait for the page to be interactive
    await page.waitForLoadState('networkidle');
  });

  test('View page loads without errors', async ({ page }) => {
    await expect(page.locator('body')).toBeVisible();
    // The storage medium input should be present
    const input = page.locator('input').first();
    await expect(input).toBeVisible();
  });

  test.describe('Single-image toolbar controls', () => {
    /**
     * To test single-image toolbar we need images loaded. We'll inject
     * mock image data into the page by intercepting the API response and
     * then navigating to trigger a reload.
     */
    test.beforeEach(async ({ page }) => {
      // Intercept the /api/view/images call to return a couple of test images
      await page.route('**/api/view/images**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            images: [
              {
                ID: 1,
                File_Name: 'test1.jpg',
                Directory: 'DCIM',
                Create_Date: '2024-01-01',
                LbbRating: 0,
              },
              {
                ID: 2,
                File_Name: 'test2.jpg',
                Directory: 'DCIM',
                Create_Date: '2024-01-02',
                LbbRating: 0,
              },
            ],
            count: 2,
          }),
        });
      });

      // Also intercept the full-res image endpoint
      await page.route('**/api/view/image**', (route) => {
        const url = route.request().url();
        if (url.includes('id=missing')) {
          route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'file_missing' }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              url: 'https://placehold.co/800x600/333/fff?text=Full+Resolution',
            }),
          });
        }
      });

      await page.goto('/view');
      await page.waitForLoadState('networkidle');

      // Set storage path and trigger init
      const storageInput = page.locator('input').first();
      await storageInput.fill('/media/test');

      // Click Initialize button to trigger image load
      const initButton = page.locator('button').filter({ hasText: /initialize|back to|init/i }).first();
      await initButton.click();

      // Wait for images to load
      await page.waitForTimeout(500);

      // Click on the first image card to enter single-image view
      const firstCard = page.locator('.MuiCard-root').first();
      await expect(firstCard).toBeVisible({ timeout: 5000 });
      await firstCard.click();

      // Wait for single-image toolbar to appear
      await page.waitForTimeout(300);
    });

    test('Play button exists in single-image view', async ({ page }) => {
      // Check by MUI icon selector
      const playIcon = page.locator('[data-testid="PlayArrowIcon"]');
      const stopIcon = page.locator('[data-testid="StopIcon"]');

      // Either Play or Stop should be present in the toolbar
      const hasPlayOrStop =
        (await playIcon.count()) > 0 || (await stopIcon.count()) > 0;
      expect(hasPlayOrStop).toBeTruthy();
    });

    test('Interval input exists and is editable', async ({ page }) => {
      // Check that the interval number input is present
      const intervalInput = page.locator('input[type="number"]');
      await expect(intervalInput).toBeVisible({ timeout: 5000 });
      await expect(intervalInput).toHaveValue('5');
    });

    test('Clicking play toggles to stop', async ({ page }) => {
      const playIcon = page.locator('[data-testid="PlayArrowIcon"]');
      await expect(playIcon).toBeVisible({ timeout: 5000 });

      // Click play button (parent IconButton)
      await playIcon.locator('..').click();

      // After clicking play, Stop icon should appear
      const stopIcon = page.locator('[data-testid="StopIcon"]');
      await expect(stopIcon).toBeVisible({ timeout: 3000 });
    });

    test('Clicking stop after play halts slideshow', async ({ page }) => {
      const playIcon = page.locator('[data-testid="PlayArrowIcon"]');
      await expect(playIcon).toBeVisible({ timeout: 5000 });

      // Start slideshow
      await playIcon.locator('..').click();
      const stopIcon = page.locator('[data-testid="StopIcon"]');
      await expect(stopIcon).toBeVisible({ timeout: 3000 });

      // Stop slideshow
      await stopIcon.locator('..').click();
      await expect(playIcon).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Zoom button — file_missing failure mode', () => {
    test.beforeEach(async ({ page }) => {
      // Return an image that will trigger file_missing on zoom
      await page.route('**/api/view/images**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            images: [
              {
                ID: 'missing',
                File_Name: 'missing.jpg',
                Directory: 'DCIM',
                Create_Date: '2024-01-01',
                LbbRating: 0,
              },
            ],
            count: 1,
          }),
        });
      });

      await page.route('**/api/view/image**', (route) => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'file_missing' }),
        });
      });

      await page.goto('/view');
      await page.waitForLoadState('networkidle');

      const storageInput = page.locator('input').first();
      await storageInput.fill('/media/test');

      const initButton = page
        .locator('button')
        .filter({ hasText: /initialize|back to|init/i })
        .first();
      await initButton.click();
      await page.waitForTimeout(500);

      const firstCard = page.locator('.MuiCard-root').first();
      await expect(firstCard).toBeVisible({ timeout: 5000 });
      await firstCard.click();
      await page.waitForTimeout(300);
    });

    test('Zoom button exists in single-image toolbar', async ({ page }) => {
      const zoomButton = page.locator('[data-testid="zoom-button"]');
      await expect(zoomButton).toBeVisible({ timeout: 5000 });
    });

    test('file_missing shows Alert and disables zoom button', async ({ page }) => {
      const zoomButton = page.locator('[data-testid="zoom-button"]');
      await expect(zoomButton).toBeVisible({ timeout: 5000 });
      await expect(zoomButton).not.toBeDisabled();

      // Click zoom to trigger the API call which returns file_missing
      await zoomButton.click();
      await page.waitForTimeout(500);

      // Alert should be shown
      const alert = page.locator('.MuiAlert-root');
      await expect(alert).toBeVisible({ timeout: 3000 });

      // Zoom button should now be disabled
      const disabledZoomButton = page.locator('[data-testid="zoom-button"]');
      await expect(disabledZoomButton).toBeDisabled({ timeout: 3000 });
    });
  });
});
