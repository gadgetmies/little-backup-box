import { test, expect } from '@playwright/test';
import { openGallery, openSingle, selectByLabel } from './view-helpers.js';

test.describe('View page — foundation', () => {
  test('View route renders at /view with the medium selector', async ({ page }) => {
    await openGallery(page);
    await expect(page).toHaveURL(/\/view/);
    const medium = selectByLabel(page, 'Storage medium');
    await expect(medium).toBeVisible();
    // Default medium follows view.php: first mounted of target_usb, source_usb, …
    await expect(medium).toHaveText('USB target');
  });

  test('Medium selector lists the PHP medium ids with translated labels', async ({ page }) => {
    await openGallery(page);
    await selectByLabel(page, 'Storage medium').click();
    await expect(page.getByRole('option', { name: 'USB target' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'USB source' })).toBeVisible();
    await expect(page.getByRole('option', { name: /Local NVMe target/ })).toBeVisible();
    await expect(page.getByRole('option', { name: /Internal storage/ })).toBeVisible();
    await page.keyboard.press('Escape');
  });

  test('Opening a medium runs /view/init with the medium id', async ({ page }) => {
    const initReq = page.waitForRequest((r) => r.url().includes('/api/view/init'));
    await page.goto('/view');
    const req = await initReq;
    expect(req.url()).toContain('medium=target_usb');
  });

  test('Sort controls are present', async ({ page }) => {
    await openGallery(page);
    await expect(selectByLabel(page, 'Sort by')).toBeVisible();
    await expect(selectByLabel(page, 'Per page')).toBeVisible();
  });

  test('Per-page presets are const_VIEW_GRID_COLUMNS × {5,10,20,50,100}', async ({ page }) => {
    await openGallery(page);
    const perPage = selectByLabel(page, 'Per page');
    await expect(perPage).toHaveText('30');
    await expect(page.getByTestId('image-card')).toHaveCount(30);
    await perPage.click();
    for (const n of ['15', '30', '60', '150', '300']) {
      await expect(page.getByRole('option', { name: n, exact: true })).toBeVisible();
    }
    await page.getByRole('option', { name: '15', exact: true }).click();
    await expect(page.getByTestId('image-card')).toHaveCount(15);
  });

  test('Pagination navigates to page 2', async ({ page }) => {
    await openGallery(page);
    const firstId = await page.getByTestId('image-card').first().getAttribute('data-image-id');
    await page.getByRole('button', { name: /page 2/i }).click();
    await expect(page.getByTestId('image-card').first()).not.toHaveAttribute('data-image-id', firstId);
  });

  test('Clicking a thumbnail opens the single view with the real image', async ({ page }) => {
    await openGallery(page);
    await openSingle(page, 0);
    const img = page.getByTestId('stage-image');
    await expect(img).toBeVisible();
    const src = await img.getAttribute('src');
    expect(src).toContain('/api/view/image');
    expect(src).toContain('variant=display');
    expect(src).not.toContain('placehold.co');
    // The image actually loads (served from the mock media files).
    await expect.poll(() => img.evaluate((el) => el.naturalWidth)).toBeGreaterThan(1);
  });

  test('Navigation buttons work in single view', async ({ page }) => {
    await openGallery(page);
    await openSingle(page, 0);
    await expect(page.getByTestId('single-position')).toHaveText('1 / 120');
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(page.getByTestId('single-position')).toHaveText('2 / 120');
    await page.getByRole('button', { name: 'Last', exact: true }).click();
    await expect(page.getByTestId('single-position')).toHaveText('120 / 120');
    await page.getByRole('button', { name: 'First', exact: true }).click();
    await expect(page.getByTestId('single-position')).toHaveText('1 / 120');
  });

  test('Back to grid returns to grid view', async ({ page }) => {
    await openGallery(page);
    await openSingle(page, 0);
    await page.getByRole('button', { name: /back to overview/i }).click();
    await expect(page.getByTestId('image-card').first()).toBeVisible();
  });

  test('Grid thumbnails request /api/view/image with variant=thumb', async ({ page }) => {
    await openGallery(page);
    const firstImg = page.locator('[data-testid="image-card"] img').first();
    const src = await firstImg.getAttribute('src');
    expect(src).toContain('/api/view/image');
    expect(src).toContain('variant=thumb');
    expect(src).not.toContain('placehold.co');
  });
});
