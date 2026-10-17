import { test, expect } from '@playwright/test';

// Long translations (Finnish, German) must wrap or scroll inside their
// component; they must never make the whole page wider than a phone screen.
const ROUTES = ['/', '/view', '/storage', '/maintenance', '/integrations', '/network', '/hardware', '/preferences', '/system'];

for (const lang of ['fi', 'de']) {
  test.describe(`No horizontal page overflow at 375px (${lang})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.addInitScript((l) => localStorage.setItem('lbb-language', l), lang);
    });

    for (const route of ROUTES) {
      test(route, async ({ page }) => {
        await page.goto(route);
        await page.waitForLoadState('networkidle');
        const overflowing = await page.evaluate(() => {
          const vw = document.documentElement.clientWidth;
          const clipped = (el) => {
            for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
              if (getComputedStyle(a).overflowX !== 'visible') return true;
            }
            return false;
          };
          return [...document.querySelectorAll('main *')]
            .filter((el) => el.getBoundingClientRect().right > vw + 1 && !clipped(el))
            .map((el) => (el.innerText || el.tagName).slice(0, 40));
        });
        expect(overflowing).toEqual([]);
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
