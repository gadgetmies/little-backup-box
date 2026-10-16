// Shared helpers for the Library (/view) specs. Runs against dev:mock, where
// /api/view/* is served by server/routes/view.js on the in-memory fixture
// from src/utils/viewMockFixture.js (120 files, 30 per page by default).
import { expect } from '@playwright/test';

export async function openGallery(page, query = '') {
  await page.goto(`/view${query}`);
  await expect(page.getByTestId('image-card').first()).toBeVisible({ timeout: 15000 });
}

export async function expandFilters(page) {
  const summary = page.getByRole('button', { name: /^Filter/ }).first();
  if ((await summary.getAttribute('aria-expanded')) !== 'true') await summary.click();
  await expect(summary).toHaveAttribute('aria-expanded', 'true');
}

// MUI's Select doesn't expose its InputLabel via getByLabel reliably, so
// locate the combobox by the FormControl whose <label> matches.
export function selectByLabel(page, labelText) {
  return page
    .locator('.MuiFormControl-root', { has: page.locator('label', { hasText: labelText }) })
    .locator('[role="combobox"]')
    .first();
}

export async function openSingle(page, index = 0) {
  await page.getByTestId('image-card').nth(index).locator('button').first().click();
  await expect(page.getByTestId('single-view')).toBeVisible({ timeout: 10000 });
}
