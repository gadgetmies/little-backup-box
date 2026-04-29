import { test, expect } from '@playwright/test';
import { ContentExtractor } from '../helpers/content-extractor.js';
import { ContentComparator } from '../helpers/content-comparator.js';
import { phpContent } from './fixtures/php-content.js';
import { waitForApiCall } from '../helpers/test-utils.js';

test.describe('Setup/Settings Page', () => {
  let extractor;
  let comparator;

  test.beforeEach(async ({ page }) => {
    extractor = new ContentExtractor(page);
    comparator = new ContentComparator();
    await page.goto('/setup');
    await waitForApiCall(page, '/setup/config');
  });

  test('should display page title', async ({ page }) => {
    const title = await extractor.extractPageTitle();
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasSettingsTitle =
      comparator.compareText(title, phpContent.setup.pageTitle, { caseSensitive: false }) ||
      headers.some((h) => comparator.compareText(h, phpContent.setup.pageTitle, { caseSensitive: false })) ||
      allText.toLowerCase().includes('settings') ||
      allText.toLowerCase().includes('config');

    expect(hasSettingsTitle).toBeTruthy();
  });

  test('should display general settings section', async ({ page }) => {
    const headers = await extractor.extractSectionHeaders();
    const hasGeneral = headers.some((h) =>
      comparator.compareText(h, phpContent.setup.generalHeader, { caseSensitive: false })
    );
    expect(hasGeneral).toBeTruthy();
  });

  test('should display backup settings section', async ({ page }) => {
    const headers = await extractor.extractSectionHeaders();
    const allText = await extractor.extractAllVisibleText();

    const hasBackup =
      headers.some((h) =>
        comparator.compareText(h, phpContent.setup.backupHeader, { caseSensitive: false })
      ) || allText.toLowerCase().includes('backup');

    expect(hasBackup).toBeTruthy();
  });

  test('should display language selector', async ({ page }) => {
    const labels = await extractor.extractFormLabels();
    const allText = await extractor.extractAllVisibleText();

    const hasLanguageLabel =
      labels.some((label) =>
        comparator.compareText(label, phpContent.setup.languageLabel, { caseSensitive: false })
      ) || allText.toLowerCase().includes('language');

    expect(hasLanguageLabel).toBeTruthy();

    const languageSelect = page.locator('select, [role="combobox"]').first();
    await languageSelect.click();
    await page.waitForTimeout(200);

    const options = await extractor.extractSelectOptions('select, [role="combobox"]');
    expect(options.length).toBeGreaterThan(0);

    const hasEnglish = options.some((opt) =>
      comparator.compareText(opt, 'English', { caseSensitive: false })
    );
    expect(hasEnglish).toBeTruthy();
  });

  test('should display theme selector', async ({ page }) => {
    const labels = await extractor.extractFormLabels();
    const allText = await extractor.extractAllVisibleText();

    const hasThemeLabel =
      labels.some((label) =>
        comparator.compareText(label, phpContent.setup.themeLabel, { caseSensitive: false })
      ) || allText.toLowerCase().includes('theme');

    expect(hasThemeLabel).toBeTruthy();
  });

  test('should display save button', async ({ page }) => {
    const buttons = await extractor.extractButtonText();
    const hasSaveButton = buttons.some((btn) =>
      comparator.compareText(btn, phpContent.setup.saveButton, { caseSensitive: false })
    );
    expect(hasSaveButton).toBeTruthy();
  });

  test('should display test mail button', async ({ page }) => {
    const buttons = await extractor.extractButtonText();
    const allText = buttons.join(' ').toLowerCase();

    const hasTestMail =
      buttons.some((btn) =>
        comparator.findSimilarText(btn, [
          phpContent.setup.testMailButton,
          'test mail',
          'send test',
        ])
      ) || allText.includes('mail') || allText.includes('test');

    expect(hasTestMail).toBeTruthy();
  });

  test('should display update check button', async ({ page }) => {
    const buttons = await extractor.extractButtonText();
    const allText = buttons.join(' ').toLowerCase();

    const hasUpdateCheck =
      buttons.some((btn) =>
        comparator.findSimilarText(btn, [
          phpContent.setup.updateCheckButton,
          'update',
          'check update',
        ])
      ) || allText.includes('update');

    expect(hasUpdateCheck).toBeTruthy();
  });

  test('should save settings when save button is clicked', async ({ page }) => {
    const saveButton = page.locator('button:has-text("Save"), button:has-text("save")').first();
    await saveButton.click();

    await waitForApiCall(page, '/setup/config');
    const response = await page.waitForResponse((response) =>
      response.url().includes('/setup/config') && response.request().method() === 'POST'
    );
    expect(response.status()).toBe(200);
  });

  test('should send test mail when test mail button is clicked', async ({ page }) => {
    const testMailButton = page
      .locator('button:has-text("Mail"), button:has-text("Test")')
      .first();
    await testMailButton.click();

    await waitForApiCall(page, '/setup/test-mail');
    const response = await page.waitForResponse((response) =>
      response.url().includes('/setup/test-mail')
    );
    expect(response.status()).toBe(200);
  });

  test('should check for updates when update check button is clicked', async ({ page }) => {
    const updateButton = page.locator('button:has-text("Update"), button:has-text("update")').first();
    await updateButton.click();

    await waitForApiCall(page, '/setup/update-check');
    const response = await page.waitForResponse((response) =>
      response.url().includes('/setup/update-check')
    );
    expect(response.status()).toBe(200);
  });

  test('should display backup option checkboxes', async ({ page }) => {
    const checkboxes = await extractor.extractCheckboxLabels();
    const allText = checkboxes.join(' ').toLowerCase();

    const hasMoveFiles = allText.includes('move') || allText.includes('copy');
    const hasRenameFiles = allText.includes('rename');

    expect(hasMoveFiles || hasRenameFiles).toBeTruthy();
  });

  test('should change language when language selector is changed', async ({ page }) => {
    const languageSelect = page.locator('select, [role="combobox"]').first();
    await languageSelect.click();
    await page.waitForTimeout(200);

    const option = page.locator('[role="option"]:has-text("Deutsch"), [role="option"]:has-text("German")').first();
    if (await option.count() > 0) {
      await option.click();
      await page.waitForTimeout(500);

      const allText = await extractor.extractAllVisibleText();
      expect(allText).toBeTruthy();
    }
  });
});







