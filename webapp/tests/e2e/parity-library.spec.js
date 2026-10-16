// PHP-parity checks for the Library (scripts/view.php + sub-view-icons.php).
import { test, expect } from '@playwright/test';
import { expandFilters, openGallery, openSingle, selectByLabel } from './view-helpers.js';

test.describe('Library parity — single view media', () => {
  test('RAW files show the tims/ preview with a low-resolution notice', async ({ page }) => {
    await openGallery(page, '?extension=CR2');
    await openSingle(page, 0);
    await expect(page.getByTestId('lowres-image-notice')).toBeVisible();
    await expect(page.getByTestId('stage-image')).toBeVisible();
  });

  test('TIF files also get the low-resolution notice, HEIC does not', async ({ page }) => {
    await openGallery(page, '?extension=TIF');
    await openSingle(page, 0);
    await expect(page.getByTestId('lowres-image-notice')).toBeVisible();

    await openGallery(page, '?extension=HEIC');
    await openSingle(page, 0);
    await expect(page.getByTestId('stage-image')).toBeVisible();
    await expect(page.getByTestId('lowres-image-notice')).toHaveCount(0);
  });

  test('GoPro H.265 video plays the LRV proxy with a notice', async ({ page }) => {
    await openGallery(page, '?directory=DCIM%2F100GOPRO');
    await openSingle(page, 0);
    const video = page.getByTestId('stage-video');
    await expect(video).toBeVisible();
    await expect(video).toHaveAttribute('controls', '');
    await expect(page.getByTestId('lowres-video-notice')).toBeVisible();
  });

  test('video is served with HTTP Range support', async ({ request }) => {
    const res = await request.get('/api/view/image?medium=target_usb&id=8&variant=display', {
      headers: { Range: 'bytes=0-99' },
    });
    expect(res.status()).toBe(206);
    expect(res.headers()['content-range']).toMatch(/^bytes 0-99\//);
    expect(res.headers()['accept-ranges']).toBe('bytes');
  });

  test('audio files show the thumbnail and an audio player', async ({ page }) => {
    await openGallery(page, '?extension=MP3');
    await openSingle(page, 0);
    await expect(page.getByTestId('stage-audio')).toBeAttached();
    await expect(page.getByTestId('stage-audio')).toHaveAttribute('controls', '');
  });

  test('text files show their thumbnail', async ({ page }) => {
    await openGallery(page, '?extension=txt');
    await openSingle(page, 0);
    const img = page.getByTestId('stage-image');
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el) => el.naturalWidth)).toBeGreaterThan(1);
  });

  test('download original links to the untouched file', async ({ page }) => {
    await openGallery(page, '?extension=CR2');
    await openSingle(page, 0);
    const link = page.getByTestId('download-original');
    await expect(link).toHaveAttribute('href', /variant=original/);
    await expect(link).toHaveAttribute('href', /download=1/);
  });

  test('file info shows key rows and all EXIF fields except ID / ExifTool version', async ({ page }) => {
    await openGallery(page, '?extension=CR2');
    await openSingle(page, 0);
    const key = page.getByTestId('file-info-key');
    await expect(key).toContainText('Camera');
    await expect(key).toContainText('Canon EOS 5D Mark IV');
    await expect(key).toContainText('Lens');
    await page.getByTestId('show-all-fields').click();
    const all = page.getByTestId('file-info-all');
    await expect(all).toContainText('Camera Model Name');
    await expect(all).toContainText('Exposure Time');
    await expect(all).not.toContainText('ExifTool Version Number');
    await expect(all.locator('th', { hasText: /^ID$/ })).toHaveCount(0);
  });
});

test.describe('Library parity — grid', () => {
  test('date headers group the grid when sorted by date', async ({ page }) => {
    await openGallery(page);
    await expect(page.getByTestId('date-header').first()).toHaveText('2024/10/19');
  });

  test('cards show comment indicator and social state icons', async ({ page }) => {
    await openGallery(page);
    await expect(page.getByTestId('comment-indicator').first()).toBeVisible();
    // Image 115 is published and queued again on Telegram (combined state).
    const card = page.locator('[data-testid="image-card"][data-image-id="115"]');
    await expect(card.locator('[data-social-service="telegram"]')).toHaveAttribute('data-social-state', 'combined');
  });

  test('missing thumbnails fall back to unknown.JPG', async ({ page }) => {
    await openGallery(page);
    const img = page.locator('[data-testid="image-card"][data-image-id="115"] img');
    await expect(img).toHaveAttribute('src', /unknown\.JPG$/);
  });
});

test.describe('Library parity — filters', () => {
  test('day filter lists days with counts and matches EXIF and underscore dates', async ({ page }) => {
    await openGallery(page);
    await expandFilters(page);
    await selectByLabel(page, 'Day').click();
    await page.getByRole('option', { name: '2024-09-21 (10)' }).click();
    await expect(page.getByTestId('grid-summary')).toContainText('10 files');
    // The day's text file uses the YYYY_MM_DD fallback date.
    await expect(page.locator('[data-testid="image-card"]', { hasText: '.txt' })).toHaveCount(1);
  });

  test('date range pickers match normalised dates', async ({ page }) => {
    await openGallery(page, '?dateFrom=2024-10-05&dateTo=2024-10-19');
    await expect(page.getByTestId('grid-summary')).toContainText('20 files');
  });

  test('camera filter offers "–" for files without a camera model', async ({ page }) => {
    await openGallery(page);
    await expandFilters(page);
    await selectByLabel(page, 'Camera').click();
    await page.getByRole('option', { name: /^– \(\d+\)$/ }).click();
    await expect(page).toHaveURL(/camera=__none__/);
    const names = await page.getByTestId('image-card').evaluateAll((els) => els.map((e) => e.textContent));
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n).toMatch(/\.(MP3|txt|TIF)/);
  });

  test('advanced filter: any metadata field and value with counts', async ({ page }) => {
    await openGallery(page);
    await expandFilters(page);
    await selectByLabel(page, 'Metadata field').click();
    await page.getByRole('option', { name: 'Make', exact: true }).click();
    await selectByLabel(page, 'Value').click();
    await page.getByRole('option', { name: /^GoPro \(\d+\)$/ }).click();
    await expect(page).toHaveURL(/varField=Make/);
    await expect(page).toHaveURL(/varValue=GoPro/);
    await expect(page.getByTestId('grid-summary')).toContainText('12 files');
  });
});
