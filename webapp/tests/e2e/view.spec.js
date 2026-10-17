import { test, expect } from '@playwright/test';
import { openGallery, openSingle } from './view-helpers.js';

test.describe('View Page', () => {
  test('shows the Gallery title in the app bar', async ({ page }) => {
    await page.goto('/view');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/gallery/i);
  });

  test('loads images after the medium is initialised', async ({ page }) => {
    const imagesResp = page.waitForResponse((r) => r.url().includes('/api/view/images'));
    await page.goto('/view');
    const resp = await imagesResp;
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body.total).toBe(120);
    // Real EXIF_DATA column names end to end (not rating/comment aliases).
    expect(body.images[0]).toHaveProperty('LbbRating');
    expect(body.images[0]).toHaveProperty('Comment');
    expect(body.images[0]).not.toHaveProperty('rating');
  });

  test('displays images in the grid', async ({ page }) => {
    await openGallery(page);
    expect(await page.getByTestId('image-card').count()).toBeGreaterThan(0);
  });

  test('switches to the single view when an image is clicked', async ({ page }) => {
    await openGallery(page);
    await openSingle(page, 0);
    await expect(page.getByRole('button', { name: /back to overview/i })).toBeVisible();
  });
});
