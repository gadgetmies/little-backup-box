import { test, expect } from '@playwright/test';

// ── Slice 1 : DisplayConfig audit ──────────────────────────────────────────
// Gap-table result: all conf_DISP_* keys from setup.php are already present in
// DisplayConfig.jsx. No new fields were needed; tests verify the fields render.

test.describe('Display configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Navigate to User Interface (config) page
    await page.getByRole('link', { name: /user interface/i }).click();
    await expect(page.getByRole('heading', { name: /display/i }).first()).toBeVisible();
  });

  test('display enable checkbox is present', async ({ page }) => {
    await expect(page.getByRole('checkbox', { name: /enable.*display/i })).toBeVisible();
  });

  test('font size select is present', async ({ page }) => {
    await expect(page.getByText(/font size/i).first()).toBeVisible();
  });

  test('display driver select is present', async ({ page }) => {
    await expect(page.getByText(/display driver/i)).toBeVisible();
  });

  test('display interface select is present (I2C / SPI)', async ({ page }) => {
    await expect(page.getByText(/display interface/i)).toBeVisible();
  });

  test('color model select is present', async ({ page }) => {
    await expect(page.getByText(/color notation/i)).toBeVisible();
  });

  test('backlight enable checkbox is present', async ({ page }) => {
    await expect(page.getByRole('checkbox', { name: /backlight/i })).toBeVisible();
  });

  test('inverted colors checkbox is present', async ({ page }) => {
    await expect(page.getByRole('checkbox', { name: /inverted/i })).toBeVisible();
  });

  test('status bar checkbox is present', async ({ page }) => {
    await expect(page.getByRole('checkbox', { name: /status bar/i })).toBeVisible();
  });
});

// ── Slice 2 : Button hardware ──────────────────────────────────────────────

test.describe('Button hardware configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /user interface/i }).click();
  });

  test('button hardware accordion is present and can be expanded', async ({ page }) => {
    const accordion = page.getByRole('button', { name: /button hardware/i });
    await expect(accordion).toBeVisible();
    await accordion.click();
    await expect(page.getByRole('checkbox', { name: /enable buttons/i })).toBeVisible();
  });

  test('add combination row button works', async ({ page }) => {
    const accordion = page.getByRole('button', { name: /button hardware/i });
    await accordion.click();

    const addBtn = page.getByRole('button', { name: /add combination/i });
    await expect(addBtn).toBeVisible();

    // Count initial rows (excluding header), then add one
    const tableBody = page.locator('[data-testid="combinations-table-body"]');
    const initialRows = await tableBody.locator('tr').count();
    await addBtn.click();
    await expect(tableBody.locator('tr')).toHaveCount(initialRows + 1);
  });
});

// ── Slice 3 : Fan configuration ────────────────────────────────────────────

test.describe('Fan configuration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /user interface/i }).click();
  });

  test('fan accordion is present and can be expanded', async ({ page }) => {
    const accordion = page.getByRole('button', { name: /^fan$/i });
    await expect(accordion).toBeVisible();
    await accordion.click();
    await expect(page.getByLabel(/temperature threshold/i)).toBeVisible();
    await expect(page.getByLabel(/gpio pin/i)).toBeVisible();
  });

  test('temperature value 101 shows validation error', async ({ page }) => {
    const accordion = page.getByRole('button', { name: /^fan$/i });
    await accordion.click();

    const tempField = page.getByLabel(/temperature threshold/i);
    await tempField.fill('101');
    await tempField.blur();

    await expect(page.getByText(/must be 0.?100/i)).toBeVisible();
  });
});
