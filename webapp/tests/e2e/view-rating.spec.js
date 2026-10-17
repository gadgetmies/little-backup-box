import { test, expect } from '@playwright/test';
import { expandFilters, openGallery, openSingle } from './view-helpers.js';

test.describe('View page — rating, comment, delete rejected', () => {
  test('grid cards show the rating from LbbRating', async ({ page }) => {
    await openGallery(page);
    const card = page.getByTestId('image-card').first();
    const lbb = await card.getAttribute('data-rating');
    await expect(card.locator('[aria-label="rating widget"]')).toHaveAttribute('data-rating', lbb);
  });

  test('rating in single view autosaves, shows "Changes saved", and restores', async ({ page }) => {
    await openGallery(page, '?extension=ARW');
    await openSingle(page, 0);
    const widget = page.getByTestId('single-view').locator('[aria-label="rating widget"]');
    const original = Number(await widget.getAttribute('data-rating'));
    const target = original === 3 ? 2 : 3;

    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/api/view/rating') && r.method() === 'POST'),
      widget.getByRole('button', { name: `rate ${target} star${target === 1 ? '' : 's'}` }).click(),
    ]);
    expect(req.postDataJSON()).toMatchObject({ rating: target, medium: 'target_usb' });
    await expect(page.getByTestId('saved-indicator')).toBeVisible();
    await expect(widget).toHaveAttribute('data-rating', String(target));

    // Restore the shared mock DB.
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/view/rating')),
      original === 0
        ? widget.getByRole('button', { name: `rate ${target} stars` }).click()
        : original === -1
          ? widget.getByRole('button', { name: 'reject' }).click()
          : widget.getByRole('button', { name: `rate ${original} star${original === 1 ? '' : 's'}` }).click(),
    ]);
  });

  test('comment has a character counter, no 500-char cap, and autosaves', async ({ page }) => {
    await openGallery(page, '?extension=RAF');
    await openSingle(page, 1);
    const input = page.getByTestId('comment-input');
    const original = await input.inputValue();
    await expect(input).not.toHaveAttribute('maxlength', /.*/);
    const long = 'x'.repeat(520);
    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/api/view/rating') && r.method() === 'POST', { timeout: 10000 }),
      input.fill(long),
    ]);
    expect(req.postDataJSON().comment).toBe(long);
    await expect(page.getByText('520 characters')).toBeVisible();
    await expect(page.getByTestId('saved-indicator')).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/view/rating'), { timeout: 10000 }),
      input.fill(original),
    ]);
  });

  test('delete rejected only appears when the rating filter is exactly "rejected"', async ({ page }) => {
    await openGallery(page);
    await expect(page.getByTestId('delete-rejected-button')).toHaveCount(0);
    await expandFilters(page);
    await page.getByTestId('rating-chip--1').click();
    await expect(page.getByTestId('delete-rejected-button')).toBeVisible();
    await page.getByTestId('rating-chip-0').click();
    await expect(page.getByTestId('delete-rejected-button')).toHaveCount(0);
  });

  test('delete rejected sends the IDs of the rejected files on this page', async ({ page }) => {
    await openGallery(page, '?ratings=-1');
    const cards = page.getByTestId('image-card');
    const ids = await cards.evaluateAll((els) => els.map((el) => Number(el.getAttribute('data-image-id'))));
    expect(ids.length).toBeGreaterThan(0);

    await page.getByTestId('delete-rejected-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('delete-rejected-message')).toContainText(`${ids.length} rejected files on this page`);

    const [req] = await Promise.all([
      page.waitForRequest((r) => r.url().includes('/api/view/delete-rejected')),
      page.getByTestId('delete-rejected-confirm').click(),
    ]);
    expect(req.postDataJSON().ids.sort()).toEqual([...ids].sort());
    // PHP drops the rating filter after deleting (view.php:600).
    await expect(page).not.toHaveURL(/ratings=/);
  });

  test('cancel closes the delete-rejected dialog', async ({ page }) => {
    await openGallery(page, '?ratings=-1');
    await page.getByTestId('delete-rejected-button').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(dialog).not.toBeVisible();
  });
});
