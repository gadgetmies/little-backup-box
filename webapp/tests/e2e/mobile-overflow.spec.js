import { test, expect } from '@playwright/test';

// Long translations (Finnish, German) and narrow phones must never make content
// unreachable: it has to wrap, or scroll inside its own container.
const ROUTES = ['/', '/view', '/storage', '/maintenance', '/integrations', '/network', '/hardware', '/preferences', '/system'];

// Returns elements that either widen the page or are cut off by an
// overflow:hidden/clip ancestor (i.e. content the user cannot scroll to).
async function findUnreachable(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const found = [];
    for (const el of document.querySelectorAll('main *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (el.closest('.MuiTabs-scroller, .MuiTouchRipple-root, [aria-hidden="true"]')) continue;
      let clip = null;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        if (getComputedStyle(a).overflowX !== 'visible') { clip = a; break; }
      }
      if (!clip) {
        if (r.right > vw + 1) found.push(`page: ${(el.innerText || el.tagName).slice(0, 40)}`);
        continue;
      }
      const o = getComputedStyle(clip).overflowX;
      if ((o === 'hidden' || o === 'clip') && r.right > clip.getBoundingClientRect().right + 2
        && !clip.matches('.MuiInputBase-root, .MuiSelect-select, .MuiChip-root, .MuiOutlinedInput-root')) {
        found.push(`clipped: ${(el.getAttribute('aria-label') || el.innerText || el.tagName).slice(0, 40)}`);
      }
    }
    return [...new Set(found)];
  });
}

for (const [lang, width] of [['fi', 375], ['de', 320]]) {
  test.describe(`Mobile layout at ${width}px (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.addInitScript((l) => localStorage.setItem('lbb-language', l), lang);
    });

    for (const route of ROUTES) {
      test(`${route}: every tab fits or scrolls`, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const tabs = page.locator('main [role="tab"]');
        const count = await tabs.count();
        for (let i = 0; i < Math.max(count, 1); i++) {
          if (count) await tabs.nth(i).click();
          const closed = page.locator('main .MuiAccordionSummary-root[aria-expanded="false"]');
          for (let n = await closed.count(); n > 0; n--) await closed.first().click();
          await page.waitForTimeout(300);
          expect(await findUnreachable(page), `${route} tab ${i}`).toEqual([]);
        }
      });
    }
  });
}

test('Backup: "Stop all backups" wraps below the heading on a phone in Finnish', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.addInitScript(() => localStorage.setItem('lbb-language', 'fi'));
  await page.goto('/');
  const heading = page.getByRole('heading', { name: 'Käynnissä olevat varmuuskopiot' });
  const button = page.getByTestId('stop-all-backups');
  await expect(button).toBeVisible();
  const h = await heading.boundingBox();
  const b = await button.boundingBox();
  expect(b.y).toBeGreaterThanOrEqual(h.y + h.height - 1);
  expect(b.x + b.width).toBeLessThanOrEqual(375);
});

test('Storage: info tables scroll horizontally on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/storage');
  const containers = page.getByTestId('scrollable-table');
  await expect(containers).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    const box = containers.nth(i);
    await expect(box.locator('tbody tr').first()).toBeVisible();
    const scrolled = await box.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
      return { overflows: el.scrollWidth > el.clientWidth, scrollLeft: el.scrollLeft };
    });
    expect(scrolled.overflows).toBe(true);
    expect(scrolled.scrollLeft).toBeGreaterThan(0);
  }
});
