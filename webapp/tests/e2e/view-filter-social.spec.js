import { test, expect } from '@playwright/test';
import { expandFilters, openGallery, openSingle, selectByLabel } from './view-helpers.js';

test.describe('View page – FilterBar', () => {
  test.beforeEach(async ({ page }) => {
    await openGallery(page);
    await expandFilters(page);
  });

  test('shows the filter section with an h2 heading', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 2, name: 'Filter' })).toBeVisible();
  });

  test('rating chips show counts', async ({ page }) => {
    await expect(page.getByTestId('rating-chip-all')).toHaveText(/All \(\d+\)/);
    await expect(page.getByTestId('rating-chip--1')).toHaveText(/Rejected.*\(\d+\)/);
  });

  test('reset filters button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /reset filter/i })).toBeVisible();
  });

  test('selecting rejected chip updates URL', async ({ page }) => {
    await page.getByTestId('rating-chip--1').click();
    await expect(page).toHaveURL(/ratings=-1/);
  });

  test('reset filters clears rating selection', async ({ page }) => {
    await page.getByTestId('rating-chip--1').click();
    await expect(page).toHaveURL(/ratings=-1/);
    await page.getByRole('button', { name: /reset filter/i }).click();
    await expect(page).not.toHaveURL(/ratings=/);
  });

  test('selecting a directory (shown with counts) forwards directory=', async ({ page }) => {
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/view/images') && r.url().includes('directory=')),
      (async () => {
        await selectByLabel(page, 'Directory').click();
        await page.getByRole('option', { name: /^\/DCIM\/100EOS5D \(\d+\)$/ }).click();
      })(),
    ]);
    expect(decodeURIComponent(req.url())).toContain('directory=DCIM/100EOS5D');
    await expect(page).toHaveURL(/directory=/);
  });

  test('selecting an extension forwards extension= and updates URL', async ({ page }) => {
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/view/images') && r.url().includes('extension=')),
      (async () => {
        await selectByLabel(page, 'File extension').click();
        await page.getByRole('option', { name: /^JPG \(\d+\)$/ }).click();
        await page.keyboard.press('Escape');
      })(),
    ]);
    expect(req.url()).toContain('extension=JPG');
    await expect(page).toHaveURL(/extension=JPG/);
  });

  test('selecting a service in "Marked for publish" forwards social_publish=', async ({ page }) => {
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/view/images') && r.url().includes('social_publish=')),
      (async () => {
        await selectByLabel(page, 'Marked for publish').click();
        await page.getByRole('option', { name: /^Telegram \(\d+\)$/ }).click();
        await page.keyboard.press('Escape');
      })(),
    ]);
    expect(req.url()).toMatch(/social_publish=telegram/);
    await expect(page).toHaveURL(/socialPublish=telegram/);
  });

  test('facet counts follow the other active filters', async ({ page }) => {
    const before = await page.getByTestId('rating-chip-all').textContent();
    await selectByLabel(page, 'File extension').click();
    await page.getByRole('option', { name: /^RAF \(\d+\)$/ }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('rating-chip-all')).not.toHaveText(before);
    // Only RAF files are left; the rating "All" count equals the grid total.
    await expect(page.getByTestId('grid-summary')).toContainText('12 files');
    await expect(page.getByTestId('rating-chip-all')).toHaveText(/\(12\)/);
  });
});

test.describe('View page – social publish marking', () => {
  test('lists configured services with their queue state and toggles the bit', async ({ page }) => {
    await openGallery(page, '?extension=CR2');
    await openSingle(page, 0);
    const panel = page.getByTestId('social-publish-panel');
    await expect(panel).toContainText('Queued images are posted by the next backup run.');
    // Mock lib_socialmedia.py reports telegram;matrix as configured.
    await expect(page.getByTestId('social-toggle-telegram')).toBeVisible();
    await expect(page.getByTestId('social-toggle-matrix')).toBeVisible();
    await expect(page.getByTestId('social-toggle-mastodon')).toHaveCount(0);

    const chip = page.getByTestId('social-toggle-matrix');
    const before = await chip.getAttribute('data-state');
    const wasQueued = before === 'publish' || before === 'combined';
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/api/view/social-publish')),
      chip.click(),
    ]);
    expect(req.postDataJSON()).toMatchObject({ service: 'matrix', publish: !wasQueued, medium: 'target_usb' });
    await expect(chip).not.toHaveAttribute('data-state', before);

    // Restore the shared mock DB.
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/view/social-publish')),
      chip.click(),
    ]);
    await expect(chip).toHaveAttribute('data-state', before);
  });

  test('never calls the removed immediate-publish endpoint', async ({ page }) => {
    const calls = [];
    page.on('request', (r) => {
      if (r.url().includes('/api/social/publish')) calls.push(r.url());
    });
    await openGallery(page);
    await openSingle(page, 0);
    await expect(page.getByTestId('social-publish-button')).toHaveCount(0);
    expect(calls).toEqual([]);
  });
});
