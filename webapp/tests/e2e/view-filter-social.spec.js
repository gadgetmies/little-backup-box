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

  // MUI's Select doesn't expose its InputLabel via getByLabel reliably in this
  // app, so locate by FormControl whose <label> text matches.
  function selectByLabel(page, labelText) {
    return page
      .locator('.MuiFormControl-root', { has: page.locator('label', { hasText: labelText }) })
      .locator('[role="combobox"]')
      .first();
  }

  test('selecting a directory updates URL and triggers /view/images request', async ({ page }) => {
    // Wait for the grid to load so stats (and the directory dropdown) are populated
    await expect(page.locator('[data-testid="image-card"]').first()).toBeVisible({ timeout: 10000 });

    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/view/images') && r.url().includes('directory='), { timeout: 10000 }),
      (async () => {
        await selectByLabel(page, 'Directory').click();
        // The first option is the empty "All" choice — pick a named one
        // (the mock fixture always has DCIM/100EOS5D).
        await page.getByRole('option', { name: 'DCIM/100EOS5D' }).click();
      })(),
    ]);

    expect(req.url()).toMatch(/directory=/);
    await expect(page).toHaveURL(/directory=/);
  });

  test('selecting an extension forwards extension= and updates URL', async ({ page }) => {
    await expect(page.locator('[data-testid="image-card"]').first()).toBeVisible({ timeout: 10000 });

    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/view/images') && r.url().includes('extension='), { timeout: 10000 }),
      (async () => {
        await selectByLabel(page, 'File extension').click();
        await page.getByRole('option', { name: 'JPG', exact: true }).click();
        await page.keyboard.press('Escape');
      })(),
    ]);

    expect(req.url()).toContain('extension=JPG');
    await expect(page).toHaveURL(/extension=JPG/);
  });

  test('selecting a service in "Marked for publish" forwards social_publish= and updates URL', async ({ page }) => {
    await expect(page.locator('[data-testid="image-card"]').first()).toBeVisible({ timeout: 10000 });

    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/view/images') && r.url().includes('social_publish='), { timeout: 10000 }),
      (async () => {
        await selectByLabel(page, 'Marked for publish').click();
        // Telegram has count > 0 in the fixture, so its option is enabled.
        await page.getByRole('option', { name: /^telegram/i }).click();
        await page.keyboard.press('Escape');
      })(),
    ]);

    expect(req.url()).toMatch(/social_publish=telegram/);
    await expect(page).toHaveURL(/socialPublish=telegram/);
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
