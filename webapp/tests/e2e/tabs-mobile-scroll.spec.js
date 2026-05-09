import { test, expect } from '@playwright/test';

test.describe('Tabs — page-level strips are scrollable on narrow viewports', () => {
  test('Storage tabs overflow and right-most tab is reachable at 375x667', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/storage');
    await page.waitForLoadState('networkidle');

    const scroller = page.locator('.MuiTabs-scroller').first();
    await expect(scroller).toBeVisible();

    const overflows = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth);
    expect(overflows).toBe(true);

    const scrollButtons = page.locator('.MuiTabs-scrollButtons');
    expect(await scrollButtons.count()).toBeGreaterThan(0);

    const rightmostTab = page.getByRole('tab', { name: /Verify USB drive capacity/i });
    await rightmostTab.scrollIntoViewIfNeeded();
    await rightmostTab.click();
    await expect(rightmostTab).toHaveAttribute('aria-selected', 'true');
  });

  test('Storage tabs render no visible scroll buttons at desktop 1280x800', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/storage');
    await page.waitForLoadState('networkidle');

    for (const label of ['Info', 'Mount storage', 'Repair', 'Format device', 'Verify USB drive capacity']) {
      await expect(page.getByRole('tab', { name: label })).toBeVisible();
    }

    const visibleScrollButtons = await page
      .locator('.MuiTabs-scrollButtons')
      .evaluateAll((nodes) =>
        nodes.filter((n) => {
          const style = getComputedStyle(n);
          if (style.display === 'none' || style.visibility === 'hidden') return false;
          return n.getClientRects().length > 0;
        }).length,
      );
    expect(visibleScrollButtons).toBe(0);
  });
});
