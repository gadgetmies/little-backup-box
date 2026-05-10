import { test, expect } from '@playwright/test';

test.describe('AppBar status indicator', () => {
  test('shows the ready icon and renders the placeholder when severity is ready', async ({ page }) => {
    await page.route('**/api/display/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: '', severity: 'ready' }),
      });
    });

    await page.goto('/');
    const button = page.getByRole('button', { name: 'Device status' });
    await expect(button).toBeVisible({ timeout: 5000 });

    await button.click();
    // The popover renders the localised "Ready" placeholder when status is empty.
    await expect(page.getByText('Ready', { exact: true })).toBeVisible();
  });

  test('shows the info icon and renders the status text when severity is info', async ({ page }) => {
    await page.route('**/api/display/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'Working', severity: 'info' }),
      });
    });

    await page.goto('/');
    const button = page.getByRole('button', { name: 'Device status' });
    await expect(button).toBeVisible({ timeout: 5000 });

    await button.click();
    await expect(page.getByText('Working', { exact: true })).toBeVisible();
  });

  test('hides the button when the status request fails', async ({ page }) => {
    await page.route('**/api/display/status', (route) => {
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    });

    await page.goto('/');
    // Wait at least one polling cycle.
    await page.waitForTimeout(1500);
    await expect(page.getByRole('button', { name: 'Device status' })).toHaveCount(0);
  });

  test('per-page Alert is gone (no body-rendered status banner)', async ({ page }) => {
    await page.route('**/api/display/status', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'Working', severity: 'info' }),
      });
    });

    await page.goto('/');
    await page.waitForTimeout(1500);
    // No <Alert> in <main> with the status text.
    const statusInMain = page.locator('main [role="alert"]', { hasText: 'Working' });
    await expect(statusInMain).toHaveCount(0);
  });
});
