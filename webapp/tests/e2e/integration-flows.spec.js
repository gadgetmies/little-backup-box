import { test, expect } from '@playwright/test';
import { waitForApiCall } from '../helpers/test-utils.js';

test.describe('Complete User Flow Integration Tests', () => {
  test('complete backup flow', async ({ page }) => {
    await page.goto('/');
    await waitForApiCall(page, '/backup/services');

    const sourceRadio = page.locator('input[type="radio"][value="usb"]').first();
    await sourceRadio.click();
    await page.waitForTimeout(300);

    const targetButton = page.locator('button:has-text("USB"), button:has-text("storage")').first();
    await targetButton.click();

    await waitForApiCall(page, '/backup/start');
    const startResponse = await page.waitForResponse((response) =>
      response.url().includes('/backup/start')
    );
    expect(startResponse.status()).toBe(200);

    await page.waitForTimeout(1000);

    const stopButton = page.locator('button:has-text("STOP"), button:has-text("Stop")').first();
    if (await stopButton.isVisible()) {
      await stopButton.click();
      await waitForApiCall(page, '/backup/stop');
      const stopResponse = await page.waitForResponse((response) =>
        response.url().includes('/backup/stop')
      );
      expect(stopResponse.status()).toBe(200);
    }
  });

  test('complete settings flow', async ({ page }) => {
    await page.goto('/preferences');
    await waitForApiCall(page, '/setup/config');

    const languageSelect = page.locator('select, [role="combobox"]').first();
    await languageSelect.click();
    await page.waitForTimeout(200);

    const deutschOption = page.locator('[role="option"]:has-text("Deutsch"), [role="option"]:has-text("German")').first();
    if (await deutschOption.count() > 0) {
      await deutschOption.click();
      await page.waitForTimeout(500);
    }

    const saveButton = page.locator('button:has-text("Save"), button:has-text("save")').first();
    await saveButton.click();

    await waitForApiCall(page, '/setup/config');
    const saveResponse = await page.waitForResponse((response) =>
      response.url().includes('/setup/config') && response.request().method() === 'POST'
    );
    expect(saveResponse.status()).toBe(200);

    await page.waitForTimeout(500);

    const testMailButton = page.locator('button:has-text("Mail"), button:has-text("Test")').first();
    if (await testMailButton.isVisible()) {
      await testMailButton.click();
      await waitForApiCall(page, '/setup/test-mail');
      const mailResponse = await page.waitForResponse((response) =>
        response.url().includes('/setup/test-mail')
      );
      expect(mailResponse.status()).toBe(200);
    }
  });

  test('complete view flow', async ({ page }) => {
    await page.goto('/view');

    const input = page.locator('input[type="text"]').first();
    await input.fill('/media/usb1');

    const initButton = page.locator('button:has-text("Initialize"), button:has-text("Init")').first();
    await initButton.click();

    await waitForApiCall(page, '/view/init');
    const initResponse = await page.waitForResponse((response) =>
      response.url().includes('/view/init')
    );
    expect(initResponse.status()).toBe(200);

    await waitForApiCall(page, '/view/images');
    const imagesResponse = await page.waitForResponse((response) =>
      response.url().includes('/view/images')
    );
    expect(imagesResponse.status()).toBe(200);

    await page.waitForTimeout(1000);

    const firstImage = page.locator('img, [class*="MuiCardMedia"]').first();
    if (await firstImage.count() > 0) {
      await firstImage.click();
      await page.waitForTimeout(500);

      const backButton = page.locator('button:has-text("Back"), button:has-text("Grid")').first();
      if (await backButton.count() > 0) {
        await backButton.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('complete tools flow', async ({ page }) => {
    await page.goto('/storage');
    await waitForApiCall(page, '/tools/mounts');
    await waitForApiCall(page, '/tools/devices');

    const mountsResponse = await page.waitForResponse((response) =>
      response.url().includes('/tools/mounts')
    );
    expect(mountsResponse.status()).toBe(200);

    const devicesResponse = await page.waitForResponse((response) =>
      response.url().includes('/tools/devices')
    );
    expect(devicesResponse.status()).toBe(200);

    await page.waitForTimeout(500);
    const allText = await page.textContent('body');
    expect(allText).toBeTruthy();
  });

  test('complete sysinfo flow', async ({ page }) => {
    await page.goto('/system');
    await waitForApiCall(page, '/sysinfo/system');

    const systemResponse = await page.waitForResponse((response) =>
      response.url().includes('/sysinfo/system')
    );
    expect(systemResponse.status()).toBe(200);

    await waitForApiCall(page, '/sysinfo/diskspace');
    const diskSpaceResponse = await page.waitForResponse((response) =>
      response.url().includes('/sysinfo/diskspace')
    );
    expect(diskSpaceResponse.status()).toBe(200);

    await waitForApiCall(page, '/sysinfo/devices');
    const devicesResponse = await page.waitForResponse((response) =>
      response.url().includes('/sysinfo/devices')
    );
    expect(devicesResponse.status()).toBe(200);

    await waitForApiCall(page, '/sysinfo/cameras');
    const camerasResponse = await page.waitForResponse((response) =>
      response.url().includes('/sysinfo/cameras')
    );
    expect(camerasResponse.status()).toBe(200);

    const refreshButton = page.locator('button:has-text("Refresh"), button:has-text("refresh")').first();
    await refreshButton.click();

    await waitForApiCall(page, '/sysinfo/system');
    const refreshResponse = await page.waitForResponse((response) =>
      response.url().includes('/sysinfo/system')
    );
    expect(refreshResponse.status()).toBe(200);
  });

  test('cross-page navigation flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/');

    await page.goto('/preferences');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/preferences');

    await page.goto('/view');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/view');

    await page.goto('/storage');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/storage');

    await page.goto('/system');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/system');

    await page.goto('/');
    await page.waitForTimeout(500);
    expect(page.url()).toContain('/');
  });

  test('backup with advanced options flow', async ({ page }) => {
    await page.goto('/');
    await waitForApiCall(page, '/backup/services');

    const accordion = page.locator('[class*="MuiAccordion"], details').first();
    await accordion.click();
    await page.waitForTimeout(500);

    const powerOffCheckbox = page.locator('input[type="checkbox"]').first();
    await powerOffCheckbox.check();
    await page.waitForTimeout(200);

    const moveFilesCheckbox = page.locator('input[type="checkbox"]').nth(1);
    if (await moveFilesCheckbox.count() > 0) {
      await moveFilesCheckbox.check();
      await page.waitForTimeout(200);
    }

    await accordion.click();
    await page.waitForTimeout(300);

    const sourceRadio = page.locator('input[type="radio"][value="usb"]').first();
    await sourceRadio.click();
    await page.waitForTimeout(300);

    const targetButton = page.locator('button:has-text("USB"), button:has-text("storage")').first();
    await targetButton.click();

    await waitForApiCall(page, '/backup/start');
    const response = await page.waitForResponse((response) =>
      response.url().includes('/backup/start')
    );
    expect(response.status()).toBe(200);
  });
});







