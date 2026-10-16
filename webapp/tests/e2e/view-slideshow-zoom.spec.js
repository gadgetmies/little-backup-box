import { test, expect } from '@playwright/test';
import { openGallery, openSingle, selectByLabel } from './view-helpers.js';

test.describe('View Page — Slideshow, fullscreen & zoom', () => {
  test('zoom toggles the magnifier on the loaded image', async ({ page }) => {
    await openGallery(page, '?extension=JPG');
    await openSingle(page, 0);
    const zoom = page.getByTestId('zoom-button');
    await expect(zoom).toBeVisible();
    await zoom.click();
    await expect(page.getByTestId('zoom-level-indicator')).toHaveText('2.0x');
    await page.getByTestId('zoom-in-button').click();
    await expect(page.getByTestId('zoom-level-indicator')).toHaveText('2.5x');
    // Same image element/source while zoomed (no separate full-res fetch).
    const src = await page.getByTestId('stage-image').getAttribute('src');
    expect(src).toContain('variant=display');
    await zoom.click();
    await expect(page.getByTestId('zoom-level-indicator')).toHaveCount(0);
  });

  test('a missing display file shows a warning instead of a broken image', async ({ page }) => {
    await page.route('**/api/view/image?**variant=display**', (route) =>
      route.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"file_missing"}' })
    );
    await openGallery(page, '?extension=JPG');
    await openSingle(page, 0);
    await expect(page.getByTestId('media-load-error')).toBeVisible();
    await expect(page.getByTestId('zoom-button')).toHaveCount(0);
  });

  test('fullscreen overlay opens and closes via × and Escape', async ({ page }) => {
    await openGallery(page);
    await openSingle(page, 0);
    await page.getByTestId('fullscreen-button').click();
    await expect(page.getByTestId('fullscreen-overlay')).toBeVisible();
    await page.getByTestId('fullscreen-close').click();
    await expect(page.getByTestId('fullscreen-overlay')).toHaveCount(0);

    await page.getByTestId('fullscreen-button').click();
    await expect(page.getByTestId('fullscreen-overlay')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('fullscreen-overlay')).toHaveCount(0);
  });

  test('slideshow runs inside the overlay and advances', async ({ page }) => {
    await openGallery(page);
    await openSingle(page, 0);
    await selectByLabel(page, 'Interval').click();
    await page.getByRole('option', { name: /^1 s$/ }).click();
    await page.getByTestId('slideshow-toggle').click();
    const overlay = page.getByTestId('fullscreen-overlay');
    await expect(overlay).toBeVisible();
    await expect(page.getByRole('dialog').getByTestId('single-position')).toHaveText(/^[2-9] \/ 120$/, { timeout: 5000 });
    // Closing the overlay stops the slideshow (js/slideshow.js slideshow_stop).
    await page.keyboard.press('Escape');
    await expect(overlay).toHaveCount(0);
    await expect(page.getByTestId('slideshow-toggle')).toHaveAttribute('aria-label', /play/i);
  });

  test('navigation keeps the active filters across page boundaries', async ({ page }) => {
    await openGallery(page, '?extension=JPG');
    await openSingle(page, 0);
    await expect(page.getByTestId('filtered-hint')).toBeVisible();
    const total = (await page.getByTestId('single-position').textContent()).split('/')[1].trim();
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/api/view/images') && r.url().includes('page=2')),
      page.getByRole('button', { name: 'Last', exact: true }).click(),
    ]);
    expect(req.url()).toContain('extension=JPG');
    await expect(page.getByTestId('single-position')).toHaveText(`${total} / ${total}`);
    await expect(page.getByTestId('single-filename')).toHaveText(/\.JPG$/);
  });
});
