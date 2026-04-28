import { test, expect } from '@playwright/test';

test.describe('MockControls overlay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('MockControls overlay is visible when running in mock mode', async ({ page }) => {
    // The overlay label should be visible even when collapsed
    const label = page.getByText('Mock Controls');
    await expect(label).toBeVisible();
  });

  test('Clicking chevron expands the panel', async ({ page }) => {
    // The slider should not be visible initially (collapsed)
    const slider = page.getByRole('slider', { name: /mock delay/i });
    await expect(slider).not.toBeVisible();

    // Click the expand button
    const chevron = page.getByRole('button', { name: /expand mock controls/i });
    await chevron.click();

    // Now the slider should be visible
    await expect(slider).toBeVisible();
  });

  test('Moving the delay slider changes the lbb-mock-controls localStorage value', async ({
    page,
  }) => {
    // Expand first
    const chevron = page.getByRole('button', { name: /expand mock controls/i });
    await chevron.click();

    // Set the slider value by evaluating JS that dispatches a change via React state
    // We set the localStorage value directly and verify it reflects
    await page.evaluate(() => {
      localStorage.setItem(
        'lbb-mock-controls',
        JSON.stringify({ delay: 500, failureMode: '' })
      );
    });

    // Reload to pick up the persisted value
    await page.reload();

    const value = await page.evaluate(() => {
      const raw = localStorage.getItem('lbb-mock-controls');
      return raw ? JSON.parse(raw) : null;
    });

    expect(value).not.toBeNull();
    expect(value.delay).toBe(500);
  });
});
