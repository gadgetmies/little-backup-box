import { test, expect } from '@playwright/test';

// Database operations live on /maintenance → "Database" tab. They must post the
// PHP function names (index.php:395-418): thumbnails / database / exif, which
// the backend turns into `backup.py --SourceName <function> --TargetName <target>`.
test.describe('DatabaseOperations on Maintenance page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/maintenance');
    await page.evaluate(() => {
      localStorage.setItem('lbb-mock-controls', JSON.stringify({ delay: 0, failureMode: '' }));
      localStorage.setItem('lbb-tabs-maintenance', 'database');
    });
    await page.goto('/maintenance');
  });

  test('Database tab shows the three database operations', async ({ page }) => {
    await expect(page.getByRole('button', { name: /generate thumbnails/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /sync database/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /update exif/i })).toBeVisible();
  });

  for (const [label, expected] of [
    [/generate thumbnails/i, 'thumbnails'],
    [/sync database/i, 'database'],
    [/update exif/i, 'exif'],
  ]) {
    test(`${expected} posts the PHP function name and succeeds`, async ({ page }) => {
      const requestPromise = page.waitForRequest(
        (req) => req.url().includes('/api/backup/function') && req.method() === 'POST',
      );
      const responsePromise = page.waitForResponse((res) => res.url().includes('/api/backup/function'));

      await page.getByRole('button', { name: label }).click();

      const request = await requestPromise;
      expect(request.postDataJSON()).toMatchObject({ function: expected, target: 'usb' });
      const response = await responsePromise;
      expect(response.status()).toBe(200);
      await expect(page.getByText(/operation completed successfully/i)).toBeVisible({ timeout: 10000 });
    });
  }

  test('Backend rejects function names backup.py does not accept', async ({ request }) => {
    const response = await request.post('/api/backup/function', {
      data: { function: 'generate_thumbnails', target: 'usb' },
    });
    expect(response.status()).toBe(400);
  });

  test('Shows inline Alert when the operation fails', async ({ page }) => {
    await page.route('**/api/backup/function', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not enough disk space' }),
      }),
    );

    await page.getByRole('button', { name: /generate thumbnails/i }).click();
    await expect(page.getByText(/not enough disk space/i)).toBeVisible({ timeout: 10000 });
  });
});
