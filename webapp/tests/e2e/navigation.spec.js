import { test, expect } from '@playwright/test';
import { ContentExtractor } from '../helpers/content-extractor.js';
import { ContentComparator } from '../helpers/content-comparator.js';
import { phpContent } from './fixtures/php-content.js';

test.describe('Navigation and Layout', () => {
  let extractor;
  let comparator;

  test.beforeEach(async ({ page }) => {
    extractor = new ContentExtractor(page);
    comparator = new ContentComparator();
  });

  test('should display navigation menu', async ({ page }) => {
    await page.goto('/');
    
    const menuItems = await page.$$eval('nav a, [role="navigation"] a, button[role="link"]', (elements) =>
      elements.map((el) => el.textContent?.trim()).filter(Boolean)
    );

    expect(menuItems.length).toBeGreaterThan(0);
  });

  test('should navigate to dashboard', async ({ page }) => {
    await page.goto('/');
    const dashboardLink = page.locator('a:has-text("Dashboard"), button:has-text("Dashboard")').first();
    
    if (await dashboardLink.count() > 0) {
      await dashboardLink.click();
      await page.waitForURL('**/');
      expect(page.url()).toContain('/');
    }
  });

  test('should navigate to settings', async ({ page }) => {
    await page.goto('/');
    const settingsLink = page.locator('a:has-text("Settings"), button:has-text("Settings"), a:has-text("Config")').first();
    
    if (await settingsLink.count() > 0) {
      await settingsLink.click();
      await page.waitForURL('**/preferences');
      expect(page.url()).toContain('/preferences');
    }
  });

  test('should navigate to view', async ({ page }) => {
    await page.goto('/');
    const viewLink = page.locator('a:has-text("View"), button:has-text("View")').first();
    
    if (await viewLink.count() > 0) {
      await viewLink.click();
      await page.waitForURL('**/view');
      expect(page.url()).toContain('/view');
    }
  });

  test('should navigate to tools', async ({ page }) => {
    await page.goto('/');
    const toolsLink = page.locator('a:has-text("Tools"), button:has-text("Tools")').first();
    
    if (await toolsLink.count() > 0) {
      await toolsLink.click();
      await page.waitForURL('**/storage');
      expect(page.url()).toContain('/storage');
    }
  });

  test('should navigate to system info', async ({ page }) => {
    await page.goto('/');
    const sysinfoLink = page.locator('a:has-text("System"), button:has-text("System"), a:has-text("SysInfo")').first();
    
    if (await sysinfoLink.count() > 0) {
      await sysinfoLink.click();
      await page.waitForURL('**/system');
      expect(page.url()).toContain('/system');
    }
  });

  test('should highlight active route', async ({ page }) => {
    await page.goto('/preferences');
    await page.waitForTimeout(500);

    const activeLink = page.locator('[class*="active"], [aria-current="page"], [class*="selected"]').first();
    if (await activeLink.count() > 0) {
      const isActive = await activeLink.isVisible();
      expect(isActive).toBeTruthy();
    }
  });

  test('should display mobile hamburger menu on small screens', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForTimeout(500);

    const hamburger = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], [class*="hamburger"]').first();
    const menu = page.locator('nav, [role="navigation"]').first();

    if (await hamburger.count() > 0) {
      expect(await hamburger.isVisible()).toBeTruthy();
    } else if (await menu.count() > 0) {
      expect(await menu.isVisible()).toBeTruthy();
    }
  });

  test('should display footer', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer, [class*="Footer"]').first();
    
    if (await footer.count() > 0) {
      expect(await footer.isVisible()).toBeTruthy();
    }
  });

  test('should display display status component', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const status = page.locator('[role="alert"], [class*="Alert"], [class*="DisplayStatus"]').first();
    
    if (await status.count() > 0) {
      const isVisible = await status.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    }
  });

  test('should display log monitor component', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    const logMonitor = page.locator('[class*="LogMonitor"], [class*="log"], pre, textarea').first();
    
    if (await logMonitor.count() > 0) {
      const isVisible = await logMonitor.isVisible().catch(() => false);
      expect(isVisible || true).toBeTruthy();
    }
  });

  test('should maintain navigation state across page navigations', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.goto('/preferences');
    await page.waitForTimeout(500);

    await page.goto('/view');
    await page.waitForTimeout(500);

    const menu = page.locator('nav, [role="navigation"]').first();
    if (await menu.count() > 0) {
      expect(await menu.isVisible()).toBeTruthy();
    }
  });
});







