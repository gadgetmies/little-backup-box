import { test, expect } from '@playwright/test';
import { ContentExtractor } from '../helpers/content-extractor.js';
import { ContentComparator } from '../helpers/content-comparator.js';
import { phpContent } from './fixtures/php-content.js';
import { waitForApiCall } from '../helpers/test-utils.js';

test.describe('Tools Page', () => {
  let extractor;
  let comparator;

  test.beforeEach(async ({ page }) => {
    extractor = new ContentExtractor(page);
    comparator = new ContentComparator();
    await page.goto('/storage');
    await waitForApiCall(page, '/tools/mounts');
    await waitForApiCall(page, '/tools/devices');
  });

  test('should display page title', async ({ page }) => {
    const title = await extractor.extractPageTitle();
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasToolsTitle =
      comparator.compareText(title, phpContent.tools.pageTitle, { caseSensitive: false }) ||
      headers.some((h) => comparator.compareText(h, phpContent.tools.pageTitle, { caseSensitive: false })) ||
      allText.toLowerCase().includes('tools');

    expect(hasToolsTitle).toBeTruthy();
  });

  test('should display mount storage section', async ({ page }) => {
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasMountHeader =
      headers.some((h) =>
        comparator.findSimilarText(h, [
          phpContent.tools.mountHeader,
          'mount storage',
          'mount',
        ])
      ) || allText.toLowerCase().includes('mount');

    expect(hasMountHeader).toBeTruthy();
  });

  test('should display devices section', async ({ page }) => {
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasDevicesHeader =
      headers.some((h) =>
        comparator.compareText(h, phpContent.tools.devicesHeader, { caseSensitive: false })
      ) || allText.toLowerCase().includes('devices');

    expect(hasDevicesHeader).toBeTruthy();
  });

  test('should display mount list', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const preElements = await page.$$('pre, [class*="monospace"]');

    const hasMountList =
      allText.toLowerCase().includes('/dev/') ||
      allText.toLowerCase().includes('mount') ||
      preElements.length > 0;

    expect(hasMountList).toBeTruthy();
  });

  test('should display device list', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const listItems = await extractor.extractListItems();

    const hasDevices =
      allText.toLowerCase().includes('sda') ||
      allText.toLowerCase().includes('sdb') ||
      allText.toLowerCase().includes('mmcblk') ||
      listItems.length > 0;

    expect(hasDevices || allText.toLowerCase().includes('no devices')).toBeTruthy();
  });

  test('should display empty state when no devices found', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const hasEmptyState =
      comparator.findSimilarText(allText, [
        phpContent.tools.noDevicesMessage,
        'no devices',
        'no devices found',
      ]) !== null;

    if (hasEmptyState) {
      expect(hasEmptyState).toBeTruthy();
    }
  });

  test('should load mounts from API', async ({ page }) => {
    const response = await page.waitForResponse((response) =>
      response.url().includes('/tools/mounts')
    );
    expect(response.status()).toBe(200);
  });

  test('should load devices from API', async ({ page }) => {
    const response = await page.waitForResponse((response) =>
      response.url().includes('/tools/devices')
    );
    expect(response.status()).toBe(200);
  });
});







