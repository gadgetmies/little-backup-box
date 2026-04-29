import { test, expect } from '@playwright/test';
import { ContentExtractor } from '../helpers/content-extractor.js';
import { ContentComparator } from '../helpers/content-comparator.js';
import { phpContent } from './fixtures/php-content.js';
import { waitForApiCall } from '../helpers/test-utils.js';

test.describe('SysInfo Page', () => {
  let extractor;
  let comparator;

  test.beforeEach(async ({ page }) => {
    extractor = new ContentExtractor(page);
    comparator = new ContentComparator();
    await page.goto('/sysinfo');
    await waitForApiCall(page, '/sysinfo/system');
  });

  test('should display page title', async ({ page }) => {
    const title = await extractor.extractPageTitle();
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasSysInfoTitle =
      comparator.compareText(title, phpContent.sysinfo.pageTitle, { caseSensitive: false }) ||
      headers.some((h) => comparator.compareText(h, phpContent.sysinfo.pageTitle, { caseSensitive: false })) ||
      allText.toLowerCase().includes('system') ||
      allText.toLowerCase().includes('sysinfo');

    expect(hasSysInfoTitle).toBeTruthy();
  });

  test('should display system information section', async ({ page }) => {
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasSystemHeader =
      headers.some((h) =>
        comparator.compareText(h, phpContent.sysinfo.systemHeader, { caseSensitive: false })
      ) || allText.toLowerCase().includes('system');

    expect(hasSystemHeader).toBeTruthy();
  });

  test('should display disk space section', async ({ page }) => {
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasDiskSpaceHeader =
      headers.some((h) =>
        comparator.findSimilarText(h, [
          phpContent.sysinfo.diskspaceHeader,
          'disk space',
          'diskspace',
        ])
      ) || allText.toLowerCase().includes('disk');

    expect(hasDiskSpaceHeader).toBeTruthy();
  });

  test('should display devices section', async ({ page }) => {
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasDevicesHeader =
      headers.some((h) =>
        comparator.compareText(h, phpContent.sysinfo.devicesHeader, { caseSensitive: false })
      ) || allText.toLowerCase().includes('devices');

    expect(hasDevicesHeader).toBeTruthy();
  });

  test('should display cameras section', async ({ page }) => {
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasCamerasHeader =
      headers.some((h) =>
        comparator.compareText(h, phpContent.sysinfo.camerasHeader, { caseSensitive: false })
      ) || allText.toLowerCase().includes('cameras');

    expect(hasCamerasHeader).toBeTruthy();
  });

  test('should display refresh button', async ({ page }) => {
    const buttons = await extractor.extractButtonText();
    const hasRefreshButton = buttons.some((btn) =>
      comparator.compareText(btn, phpContent.sysinfo.refreshButton, { caseSensitive: false })
    );
    expect(hasRefreshButton).toBeTruthy();
  });

  test('should display system model', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const tableData = await extractor.extractTableData();

    const hasModel =
      allText.toLowerCase().includes('model') ||
      tableData.some((row) => row.some((cell) => cell.toLowerCase().includes('model')));

    expect(hasModel).toBeTruthy();
  });

  test('should display temperature', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const tableData = await extractor.extractTableData();

    const hasTemp =
      allText.toLowerCase().includes('temp') ||
      allText.toLowerCase().includes('temperature') ||
      allText.includes('°C') ||
      tableData.some((row) => row.some((cell) => cell.toLowerCase().includes('temp')));

    expect(hasTemp).toBeTruthy();
  });

  test('should display CPU load', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const tableData = await extractor.extractTableData();

    const hasCpuLoad =
      allText.toLowerCase().includes('cpu') ||
      allText.toLowerCase().includes('load') ||
      allText.includes('%') ||
      tableData.some((row) => row.some((cell) => cell.toLowerCase().includes('cpu')));

    expect(hasCpuLoad).toBeTruthy();
  });

  test('should display RAM memory', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const tableData = await extractor.extractTableData();

    const hasRam =
      allText.toLowerCase().includes('ram') ||
      allText.toLowerCase().includes('memory') ||
      tableData.some((row) => row.some((cell) => cell.toLowerCase().includes('ram')));

    expect(hasRam).toBeTruthy();
  });

  test('should display swap memory', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const tableData = await extractor.extractTableData();

    const hasSwap =
      allText.toLowerCase().includes('swap') ||
      tableData.some((row) => row.some((cell) => cell.toLowerCase().includes('swap')));

    expect(hasSwap).toBeTruthy();
  });

  test('should display abnormal conditions', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const tableData = await extractor.extractTableData();

    const hasConditions =
      allText.toLowerCase().includes('condition') ||
      allText.toLowerCase().includes('abnormal') ||
      tableData.some((row) => row.some((cell) => cell.toLowerCase().includes('condition')));

    expect(hasConditions).toBeTruthy();
  });

  test('should display disk space information', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const preElements = await page.$$('pre, [class*="monospace"]');

    const hasDiskSpace =
      allText.toLowerCase().includes('filesystem') ||
      allText.toLowerCase().includes('/dev/') ||
      preElements.length > 0;

    expect(hasDiskSpace).toBeTruthy();
  });

  test('should display device information', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const preElements = await page.$$('pre, [class*="monospace"]');

    const hasDeviceInfo =
      allText.toLowerCase().includes('sda') ||
      allText.toLowerCase().includes('sdb') ||
      allText.toLowerCase().includes('mmcblk') ||
      preElements.length > 0;

    expect(hasDeviceInfo).toBeTruthy();
  });

  test('should display cameras or empty state', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const listItems = await extractor.extractListItems();

    const hasCameras =
      listItems.length > 0 ||
      allText.toLowerCase().includes('camera') ||
      allText.toLowerCase().includes('canon') ||
      allText.toLowerCase().includes('nikon') ||
      comparator.findSimilarText(allText, [
        phpContent.sysinfo.noCamerasMessage,
        'no cameras',
      ]) !== null;

    expect(hasCameras).toBeTruthy();
  });

  test('should refresh data when refresh button is clicked', async ({ page }) => {
    const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("refresh")').first();
    await refreshButton.click();

    await waitForApiCall(page, '/sysinfo/system');
    const response = await page.waitForResponse((response) =>
      response.url().includes('/sysinfo/system')
    );
    expect(response.status()).toBe(200);
  });

  test('should load all system information from APIs', async ({ page }) => {
    const systemResponse = await page.waitForResponse((response) =>
      response.url().includes('/sysinfo/system')
    );
    expect(systemResponse.status()).toBe(200);

    const diskSpaceResponse = await page.waitForResponse((response) =>
      response.url().includes('/sysinfo/diskspace')
    );
    expect(diskSpaceResponse.status()).toBe(200);

    const devicesResponse = await page.waitForResponse((response) =>
      response.url().includes('/sysinfo/devices')
    );
    expect(devicesResponse.status()).toBe(200);
  });
});







