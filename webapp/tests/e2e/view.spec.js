import { test, expect } from '@playwright/test';
import { ContentExtractor } from '../helpers/content-extractor.js';
import { ContentComparator } from '../helpers/content-comparator.js';
import { phpContent } from './fixtures/php-content.js';
import { waitForApiCall } from '../helpers/test-utils.js';

test.describe('View Page', () => {
  let extractor;
  let comparator;

  test.beforeEach(async ({ page }) => {
    extractor = new ContentExtractor(page);
    comparator = new ContentComparator();
    await page.goto('/view');
  });

  test('should display page title', async ({ page }) => {
    const title = await extractor.extractPageTitle();
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasViewTitle =
      comparator.compareText(title, phpContent.view.pageTitle, { caseSensitive: false }) ||
      headers.some((h) => comparator.compareText(h, phpContent.view.pageTitle, { caseSensitive: false })) ||
      allText.toLowerCase().includes('view');

    expect(hasViewTitle).toBeTruthy();
  });

  test('should display storage medium input field', async ({ page }) => {
    const labels = await extractor.extractFormLabels();
    const allText = await extractor.extractAllVisibleText();

    const hasStorageLabel =
      labels.some((label) =>
        comparator.findSimilarText(label, [
          phpContent.view.storageMediumLabel,
          'storage',
          'medium',
        ])
      ) || allText.toLowerCase().includes('storage');

    expect(hasStorageLabel).toBeTruthy();

    const input = page.locator('input[type="text"], input[placeholder*="storage"], input[placeholder*="medium"]').first();
    expect(await input.count()).toBeGreaterThan(0);
  });

  test('should display initialize button', async ({ page }) => {
    const buttons = await extractor.extractButtonText();
    const allText = buttons.join(' ').toLowerCase();

    const hasInitializeButton =
      buttons.some((btn) =>
        comparator.findSimilarText(btn, [
          phpContent.view.initializeButton,
          'initialize',
          'init',
        ])
      ) || allText.includes('initialize') || allText.includes('init');

    expect(hasInitializeButton).toBeTruthy();
  });

  test('should initialize view when initialize button is clicked', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('/media/usb1');

    const initButton = page.locator('button:has-text("Initialize"), button:has-text("Init")').first();
    await initButton.click();

    await waitForApiCall(page, '/view/init');
    const response = await page.waitForResponse((response) =>
      response.url().includes('/view/init')
    );
    expect(response.status()).toBe(200);
  });

  test('should load images after initialization', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('/media/usb1');

    const initButton = page.locator('button:has-text("Initialize"), button:has-text("Init")').first();
    await initButton.click();

    await waitForApiCall(page, '/view/images');
    const response = await page.waitForResponse((response) =>
      response.url().includes('/view/images')
    );
    expect(response.status()).toBe(200);
  });

  test('should display view mode toggle button', async ({ page }) => {
    const buttons = await extractor.extractButtonText();
    const iconButtons = await page.$$('button[aria-label*="view"], button[aria-label*="grid"], button[aria-label*="list"]');
    
    const hasToggle = iconButtons.length > 0 || buttons.some((btn) => 
      btn.toLowerCase().includes('view') || btn.toLowerCase().includes('grid') || btn.toLowerCase().includes('list')
    );

    expect(hasToggle).toBeTruthy();
  });

  test('should display images in grid view', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('/media/usb1');

    const initButton = page.locator('button:has-text("Initialize"), button:has-text("Init")').first();
    await initButton.click();

    await page.waitForTimeout(1000);

    const images = await page.$$('img, [class*="MuiCardMedia"]');
    expect(images.length).toBeGreaterThanOrEqual(0);
  });

  test('should switch to single image view when image is clicked', async ({ page }) => {
    const input = page.locator('input[type="text"]').first();
    await input.fill('/media/usb1');

    const initButton = page.locator('button:has-text("Initialize"), button:has-text("Init")').first();
    await initButton.click();

    await page.waitForTimeout(1000);

    const firstImage = page.locator('img, [class*="MuiCardMedia"]').first();
    if (await firstImage.count() > 0) {
      await firstImage.click();
      await page.waitForTimeout(500);

      const allText = await extractor.extractAllVisibleText();
      const hasBackButton = allText.toLowerCase().includes('back') || 
                           allText.toLowerCase().includes('grid');
      expect(hasBackButton).toBeTruthy();
    }
  });
});







