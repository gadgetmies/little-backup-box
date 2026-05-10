import { test, expect } from '@playwright/test';
import { ContentExtractor } from '../helpers/content-extractor.js';
import { ContentComparator } from '../helpers/content-comparator.js';
import { phpContent } from './fixtures/php-content.js';
import { waitForApiCall } from '../helpers/test-utils.js';

test.describe('Home/Dashboard Page', () => {
  let extractor;
  let comparator;

  test.beforeEach(async ({ page }) => {
    extractor = new ContentExtractor(page);
    comparator = new ContentComparator();
    await page.goto('/');
    await waitForApiCall(page, '/backup/services');
  });

  test('should display page title', async ({ page }) => {
    const title = await extractor.extractPageTitle();
    expect(title).toBeTruthy();
  });

  test('should display source section with correct header and description', async ({ page }) => {
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasSourceHeader = headers.some((h) =>
      comparator.compareText(h, phpContent.home.sourceHeader, { caseSensitive: false })
    );
    expect(hasSourceHeader).toBeTruthy();

    const hasSourceDescription = comparator.compareText(
      allText,
      phpContent.home.sourceDescription,
      { caseSensitive: false }
    ) || allText.toLowerCase().includes('select');
    expect(hasSourceDescription).toBeTruthy();
  });

  test('should display target section with correct header and description', async ({ page }) => {
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasTargetHeader = headers.some((h) =>
      comparator.compareText(h, phpContent.home.targetHeader, { caseSensitive: false })
    );
    expect(hasTargetHeader).toBeTruthy();

    const hasTargetDescription = comparator.compareText(
      allText,
      phpContent.home.targetDescription,
      { caseSensitive: false }
    ) || allText.toLowerCase().includes('execute');
    expect(hasTargetDescription).toBeTruthy();
  });

  test('should display source device radio buttons', async ({ page }) => {
    const radioLabels = await extractor.extractRadioButtonLabels();
    expect(radioLabels.length).toBeGreaterThan(0);

    const hasAnyUsb = radioLabels.some((label) =>
      comparator.findSimilarText(label, [phpContent.serviceLabels.anyusb, 'any usb', 'anyusb'])
    );
    expect(hasAnyUsb).toBeTruthy();
  });

  test('should display target device buttons', async ({ page }) => {
    const buttons = await extractor.extractButtonText();
    const hasTargetButtons = buttons.some((btn) =>
      btn.toLowerCase().includes('usb') ||
      btn.toLowerCase().includes('storage') ||
      btn.toLowerCase().includes('internal')
    );
    expect(hasTargetButtons).toBeTruthy();
  });

  test('should display stop backup button', async ({ page }) => {
    const buttons = await extractor.extractButtonText();
    const hasStopButton = buttons.some((btn) =>
      comparator.compareText(btn, phpContent.home.stopButton, { caseSensitive: false }) ||
      btn.toUpperCase().includes('STOP')
    );
    expect(hasStopButton).toBeTruthy();
  });

  test('should disable invalid source-target combinations', async ({ page }) => {
    await page.click('input[type="radio"][value="anyusb"]');
    await page.waitForTimeout(500);

    const cloudRsyncButton = page.locator('button:has-text("rsync"), button:has-text("cloud")').first();
    const isDisabled = await cloudRsyncButton.isDisabled().catch(() => true);
    expect(isDisabled).toBeTruthy();
  });

  test('should enable valid source-target combinations', async ({ page }) => {
    await page.click('input[type="radio"][value="usb"]');
    await page.waitForTimeout(500);

    const usbButton = page.locator('button:has-text("USB"), button:has-text("storage")').first();
    const isEnabled = await usbButton.isEnabled().catch(() => false);
    expect(isEnabled).toBeTruthy();
  });

  test('should display backup modifications accordion', async ({ page }) => {
    const allText = await extractor.extractAllVisibleText();
    const hasModifications = comparator.compareText(
      allText,
      phpContent.home.backupModifications,
      { caseSensitive: false }
    ) || allText.toLowerCase().includes('modifications');
    expect(hasModifications).toBeTruthy();
  });

  test('should expand backup modifications accordion and show options', async ({ page }) => {
    const accordion = page.locator('[class*="MuiAccordion"], details, summary').first();
    await accordion.click();
    await page.waitForTimeout(500);

    const allText = await extractor.extractAllVisibleText();
    const hasGeneral = allText.toLowerCase().includes('general');
    const hasPrimary = allText.toLowerCase().includes('primary') || allText.toLowerCase().includes('backup');

    expect(hasGeneral || hasPrimary).toBeTruthy();
  });

  test('should display power off checkbox when accordion expanded', async ({ page }) => {
    const accordion = page.locator('[class*="MuiAccordion"], details').first();
    await accordion.click();
    await page.waitForTimeout(500);

    const checkboxes = await extractor.extractCheckboxLabels();
    const hasPowerOff = checkboxes.some((label) =>
      comparator.findSimilarText(label, [
        phpContent.home.powerOffLabel,
        'power off',
        'poweroff',
      ])
    );
    expect(hasPowerOff).toBeTruthy();
  });

  test('should display backup option checkboxes when accordion expanded', async ({ page }) => {
    const accordion = page.locator('[class*="MuiAccordion"], details').first();
    await accordion.click();
    await page.waitForTimeout(500);

    const checkboxes = await extractor.extractCheckboxLabels();
    const allText = checkboxes.join(' ').toLowerCase();

    const hasMoveFiles = allText.includes('move') || allText.includes('copy');
    const hasRenameFiles = allText.includes('rename');
    const hasThumbnails = allText.includes('thumbnail') || allText.includes('thumb');
    const hasExif = allText.includes('exif');
    const hasChecksum = allText.includes('checksum');

    expect(hasMoveFiles || hasRenameFiles || hasThumbnails || hasExif || hasChecksum).toBeTruthy();
  });

  test('should display partition preset selectors when accordion expanded', async ({ page }) => {
    const accordion = page.locator('[class*="MuiAccordion"], details').first();
    await accordion.click();
    await page.waitForTimeout(500);

    const allText = await extractor.extractAllVisibleText();
    const hasPartition = allText.toLowerCase().includes('partition') || allText.toLowerCase().includes('preset');
    expect(hasPartition).toBeTruthy();
  });

  test('should start backup when target is selected', async ({ page }) => {
    await page.click('input[type="radio"][value="usb"]');
    await page.waitForTimeout(300);

    const targetButton = page.locator('button:has-text("USB"), button:has-text("storage")').first();
    await targetButton.click();

    await waitForApiCall(page, '/backup/start');
    const response = await page.waitForResponse((response) =>
      response.url().includes('/backup/start')
    );
    expect(response.status()).toBe(200);
  });

  test('should stop backup when stop button is clicked', async ({ page }) => {
    const stopButton = page.locator('button:has-text("STOP"), button:has-text("Stop")').first();
    await stopButton.click();

    await waitForApiCall(page, '/backup/stop');
    const response = await page.waitForResponse((response) =>
      response.url().includes('/backup/stop')
    );
    expect(response.status()).toBe(200);
  });
});







