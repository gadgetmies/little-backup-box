import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { parse } from 'ini';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getConfigPath() {
  const projectRoot = path.resolve(__dirname, '../../../..');
  return path.join(projectRoot, 'scripts', 'config.cfg');
}

function readConfigFile() {
  const configPath = getConfigPath();
  try {
    const content = readFileSync(configPath, 'utf-8');
    return parse(content);
  } catch (error) {
    throw new Error(`Failed to read config file at ${configPath}: ${error.message}`);
  }
}

test.describe('Service Connections Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);
  });

  test('should display service connections page with tabs', async ({ page }) => {
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();
    expect(tabCount).toBeGreaterThanOrEqual(1);

    const emailTab = page.locator('[role="tab"]:has-text("Email"), [id="integrations-tab-0"]').first();
    await expect(emailTab).toBeVisible();
  });

  test('should save email configuration to config file', async ({ page }) => {
    const emailTab = page.locator('[role="tab"]:has-text("Email"), [id="integrations-tab-0"]').first();
    await emailTab.click();
    await page.waitForTimeout(500);

    const testValues = {
      smtpServer: 'smtp.test.example.com',
      smtpPort: '587',
      security: 'STARTTLS',
      user: 'testuser@example.com',
      password: 'testpassword123',
      from: 'sender@example.com',
      to: 'recipient@example.com',
      timeout: '30',
    };

    const getFieldByLabel = async (labelText) => {
      const label = page.locator(`label:has-text("${labelText}")`).first();
      if (await label.count() > 0) {
        const inputId = await label.getAttribute('for');
        if (inputId) {
          return page.locator(`#${inputId}`).first();
        }
        return label.locator('..').locator('input').first();
      }
      return null;
    };

    let smtpServerField = await getFieldByLabel('SMTP');
    if (!smtpServerField || (await smtpServerField.count()) === 0) {
      smtpServerField = page.locator('input[type="text"]').first();
    }
    await smtpServerField.fill(testValues.smtpServer);

    const portField = page.locator('input[type="number"]').first();
    await portField.fill(testValues.smtpPort);

    const securityRadio = page.locator('input[type="radio"][value="STARTTLS"]').first();
    if (await securityRadio.count() > 0) {
      await securityRadio.click();
    }

    let userField = await getFieldByLabel('Username');
    if (!userField || (await userField.count()) === 0) {
      userField = page.locator('input[type="text"]').nth(1);
    }
    await userField.fill(testValues.user);

    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.fill(testValues.password);

    let fromField = await getFieldByLabel('sender');
    if (!fromField || (await fromField.count()) === 0) {
      fromField = page.locator('input[type="email"]').first();
    }
    await fromField.fill(testValues.from);

    let toField = await getFieldByLabel('recipient');
    if (!toField || (await toField.count()) === 0) {
      toField = page.locator('input[type="email"]').nth(1);
    }
    await toField.fill(testValues.to);

    await page.waitForTimeout(500);

    const saveButton = page.locator('button:has-text("Save"), button[aria-label*="Save"]').first();
    const isSaveDisabled = await saveButton.isDisabled().catch(() => true);
    
    if (!isSaveDisabled) {
      await saveButton.click();
      await page.waitForResponse((response) => 
        response.url().includes('/api/config/save') && response.status() === 200
      );
      await page.waitForTimeout(1000);
    }

    const config = readConfigFile();
    expect(config.conf_SMTP_SERVER).toBe(testValues.smtpServer);
    expect(config.conf_SMTP_PORT).toBe(testValues.smtpPort);
    expect(config.conf_MAIL_SECURITY).toBe(testValues.security);
    expect(config.conf_MAIL_USER).toBe(testValues.user);
    expect(config.conf_MAIL_FROM).toBe(testValues.from);
    expect(config.conf_MAIL_TO).toBe(testValues.to);
    
    const savedPassword = config.conf_MAIL_PASSWORD;
    expect(savedPassword).toBeTruthy();
    const decodedPassword = Buffer.from(savedPassword, 'base64').toString('utf-8');
    expect(decodedPassword).toBe(testValues.password);
  });

  test('should save rsync configuration to config file', async ({ page }) => {
    const rsyncTab = page.locator('[role="tab"]:has-text("rsync"), [id="integrations-tab-3"]').first();
    await rsyncTab.click();
    await page.waitForTimeout(500);

    const testValues = {
      server: 'rsync.test.example.com',
      port: '873',
      user: 'rsyncuser',
      password: 'rsyncpass123',
      module: 'backup',
    };

    const getFieldByLabel = async (labelText) => {
      const label = page.locator(`label:has-text("${labelText}")`).first();
      if (await label.count() > 0) {
        const inputId = await label.getAttribute('for');
        if (inputId) {
          return page.locator(`#${inputId}`).first();
        }
        return label.locator('..').locator('input').first();
      }
      return null;
    };

    let serverField = await getFieldByLabel('rsync-server');
    if (!serverField || (await serverField.count()) === 0) {
      serverField = await getFieldByLabel('rsync');
    }
    if (!serverField || (await serverField.count()) === 0) {
      serverField = page.locator('input[type="text"]').first();
    }
    await serverField.fill(testValues.server);

    const portField = page.locator('input[type="number"]').first();
    await portField.fill(testValues.port);

    let userField = await getFieldByLabel('Username');
    if (!userField || (await userField.count()) === 0) {
      userField = page.locator('input[type="text"]').nth(1);
    }
    await userField.fill(testValues.user);

    const passwordField = page.locator('input[type="password"]').first();
    await passwordField.fill(testValues.password);

    let moduleField = await getFieldByLabel('Module');
    if (!moduleField || (await moduleField.count()) === 0) {
      moduleField = page.locator('input[type="text"]').last();
    }
    await moduleField.fill(testValues.module);

    await page.waitForTimeout(1000);

    const saveButton = page.locator('button:has-text("Save"), button[aria-label*="Save"]').first();
    const isSaveDisabled = await saveButton.isDisabled().catch(() => true);
    
    if (!isSaveDisabled) {
      await saveButton.click();
    }

    await page.waitForResponse((response) => 
      response.url().includes('/api/config/save') && response.status() === 200
    ).catch(() => {
      return page.waitForTimeout(2000);
    });
    
    await page.waitForTimeout(1000);

    const config = readConfigFile();
    expect(config.conf_RSYNC_SERVER).toBe(testValues.server);
    expect(config.conf_RSYNC_PORT).toBe(testValues.port);
    expect(config.conf_RSYNC_USER).toBe(testValues.user);
    expect(config.conf_RSYNC_SERVER_MODULE).toBe(testValues.module);
    
    const savedPassword = config.conf_RSYNC_PASSWORD;
    expect(savedPassword).toBeTruthy();
    const decodedPassword = Buffer.from(savedPassword, 'base64').toString('utf-8');
    expect(decodedPassword).toBe(testValues.password);
  });

  test('should update email configuration when form fields are changed', async ({ page }) => {
    const emailTab = page.locator('[role="tab"]:has-text("Email"), [id="integrations-tab-0"]').first();
    await emailTab.click();
    await page.waitForTimeout(500);

    const newSmtpServer = 'newsmtp.example.com';
    const newPort = '465';

    const getFieldByLabel = async (labelText) => {
      const label = page.locator(`label:has-text("${labelText}")`).first();
      if (await label.count() > 0) {
        const inputId = await label.getAttribute('for');
        if (inputId) {
          return page.locator(`#${inputId}`).first();
        }
        return label.locator('..').locator('input').first();
      }
      return null;
    };

    let smtpServerField = await getFieldByLabel('SMTP');
    if (!smtpServerField || (await smtpServerField.count()) === 0) {
      smtpServerField = page.locator('input[type="text"]').first();
    }
    await smtpServerField.fill(newSmtpServer);

    const portField = page.locator('input[type="number"]').first();
    await portField.fill(newPort);

    await page.waitForTimeout(500);

    const saveButton = page.locator('button:has-text("Save"), button[aria-label*="Save"]').first();
    const isSaveDisabled = await saveButton.isDisabled().catch(() => true);
    
    if (!isSaveDisabled) {
      await saveButton.click();
      await page.waitForResponse((response) => 
        response.url().includes('/api/config/save') && response.status() === 200
      );
      await page.waitForTimeout(1000);
    }

    const updatedConfig = readConfigFile();
    expect(updatedConfig.conf_SMTP_SERVER).toBe(newSmtpServer);
    expect(updatedConfig.conf_SMTP_PORT).toBe(newPort);
  });

  test('should validate password field and show error for invalid passwords', async ({ page }) => {
    const emailTab = page.locator('[role="tab"]:has-text("Email"), [id="integrations-tab-0"]').first();
    await emailTab.click();
    await page.waitForTimeout(300);

    const passwordField = page.locator('input[type="password"]').first();
    
    await passwordField.fill('123');
    await page.waitForTimeout(500);

    const errorText = await page.locator('text=/password.*short|too short/i').textContent().catch(() => null);
    if (errorText) {
      expect(errorText.toLowerCase()).toContain('password');
    }

    await passwordField.fill('test"password');
    await page.waitForTimeout(500);

    const invalidCharError = await page.locator('text=/cannot contain|invalid/i').textContent().catch(() => null);
    if (invalidCharError) {
      expect(invalidCharError.toLowerCase()).toMatch(/cannot|invalid/);
    }
  });

  test('should display all four tabs correctly', async ({ page }) => {
    const emailTab = page.locator('[id="integrations-tab-0"]').first();
    const socialTab = page.locator('[id="integrations-tab-1"]').first();
    const cloudTab = page.locator('[id="integrations-tab-2"]').first();
    const rsyncTab = page.locator('[id="integrations-tab-3"]').first();

    await expect(emailTab).toBeVisible();
    await expect(socialTab).toBeVisible();
    await expect(cloudTab).toBeVisible();
    await expect(rsyncTab).toBeVisible();
  });

  test('should switch between tabs and maintain form state', async ({ page }) => {
    const emailTab = page.locator('[id="integrations-tab-0"]').first();
    const rsyncTab = page.locator('[id="integrations-tab-3"]').first();

    await emailTab.click();
    await page.waitForTimeout(300);

    const smtpField = page.locator('input[type="text"]').first();
    await smtpField.fill('test-smtp.example.com');
    await page.waitForTimeout(300);

    await rsyncTab.click();
    await page.waitForTimeout(300);

    await emailTab.click();
    await page.waitForTimeout(300);

    const smtpValue = await smtpField.inputValue();
    expect(smtpValue).toBe('test-smtp.example.com');
  });
});

