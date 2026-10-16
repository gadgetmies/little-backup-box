import { test, expect } from '@playwright/test';

// PHP-parity behaviours of the Backup page (scripts/index.php).
test.describe('Backup page — PHP parity', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('lbb-accordion-backup-options', 'true');
    });
    await page.goto('/');
    await expect(page.getByTestId('backup-source-select')).toBeVisible();
  });

  const pickSource = async (page, service) => {
    await page.getByTestId('backup-source-select').click();
    await page.locator(`li[data-service="${service}"]`).click();
  };

  const pickTarget = async (page, service) => {
    await page.getByTestId('backup-target-select').click();
    await page.locator(`li[data-service="${service}"]`).click();
  };

  test('source offers grouped local and network services, including cloud and rsync', async ({ page }) => {
    await page.getByTestId('backup-source-select').click();
    const listbox = page.getByRole('listbox');
    await expect(listbox.getByText('Local', { exact: true })).toBeVisible();
    await expect(listbox.getByText('Network', { exact: true })).toBeVisible();
    await expect(listbox.locator('li[data-service="cloud_rsync"]')).toBeVisible();
    await expect(listbox.locator('li[data-service="ftp"]')).toBeVisible();
    await expect(listbox.locator('li[data-service^="cloud:"]').first()).toBeVisible();
    // Social media is never a source.
    await expect(listbox.locator('li[data-service^="social:"]')).toHaveCount(0);
  });

  test('target offers social services parsed from the ;-joined list', async ({ page }) => {
    await pickSource(page, 'usb');
    await page.getByTestId('backup-target-select').click();
    const listbox = page.getByRole('listbox');
    await expect(listbox.getByText('Social media', { exact: true })).toBeVisible();
    await expect(listbox.locator('li[data-service="social:telegram"]')).toBeVisible();
    await expect(listbox.locator('li[data-service="social:matrix"]')).toBeVisible();
    await expect(listbox.locator('li[data-service="social:telegram"]')).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('disallowed combinations are disabled with a reason', async ({ page }) => {
    // Default source is "any USB": rsync and social targets are not allowed (index.php:127-135).
    await page.getByTestId('backup-target-select').click();
    const rsync = page.locator('li[data-service="cloud_rsync"]');
    await expect(rsync).toHaveAttribute('aria-disabled', 'true');
    await expect(rsync).toContainText(/local storage first/i);
    const telegram = page.locator('li[data-service="social:telegram"]');
    await expect(telegram).toHaveAttribute('aria-disabled', 'true');
    await expect(telegram).toContainText(/local storage source/i);
  });

  test('cloud source to cloud target is sent as-is to /backup/start', async ({ page }) => {
    await pickSource(page, 'internal');
    await pickTarget(page, 'cloud_rsync');

    const requestPromise = page.waitForRequest((req) => req.url().includes('/api/backup/start'));
    await page.getByRole('button', { name: /start backup/i }).click();
    const body = (await requestPromise).postDataJSON();
    expect(body.sourceDevice).toBe('internal');
    expect(body.targetDevice).toBe('cloud_rsync');
    expect(body.presetSource).toBe('');
  });

  test('partition presets use the PHP model (usb + --device-identifier-preset-*)', async ({ page }) => {
    await pickSource(page, 'usb');
    await pickTarget(page, 'usb');

    await page.getByTestId('preset-source-select').click();
    await page.getByRole('option', { name: /sda1/ }).click();
    await page.getByTestId('preset-target-select').click();
    await page.getByRole('option', { name: /sdb1/ }).click();

    const requestPromise = page.waitForRequest((req) => req.url().includes('/api/backup/start'));
    await page.getByRole('button', { name: /start backup/i }).click();
    const body = (await requestPromise).postDataJSON();
    expect(body.sourceDevice).toBe('usb');
    expect(body.targetDevice).toBe('usb');
    expect(body.presetSource).toBe('USB-DRIVE-001');
    expect(body.presetTarget).toBe('BACKUP-DRIVE');
    expect(JSON.stringify(body)).not.toContain('selected_partition');
  });

  test('source partition preset is disabled unless the source is USB storage', async ({ page }) => {
    await expect(page.getByText(/only used when the source is usb storage/i)).toBeVisible();
    await pickSource(page, 'usb');
    await expect(page.getByText(/only used when the source is usb storage/i)).toHaveCount(0);
  });

  test('Telegram target offers a per-run chat that is sent as telegramChatId', async ({ page }) => {
    await pickSource(page, 'usb');
    await pickTarget(page, 'social:telegram');

    const chatSelect = page.getByTestId('telegram-chat-select');
    await expect(chatSelect).toBeVisible();
    await chatSelect.click();
    await page.getByRole('option', { name: /Family Photos/ }).click();
    await expect(page.getByTestId('backup-target-helper')).toContainText('Family Photos');

    const requestPromise = page.waitForRequest((req) => req.url().includes('/api/backup/start'));
    await page.getByRole('button', { name: /start backup/i }).click();
    const body = (await requestPromise).postDataJSON();
    expect(body.targetDevice).toBe('social:telegram');
    expect(body.telegramChatId).toBe('-987654321');
  });

  test('rename, thumbnails and EXIF are always shown, disabled for non-local targets', async ({ page }) => {
    const rename = page.getByRole('checkbox', { name: /rename files/i });
    await expect(rename).toBeVisible();
    await expect(rename).toBeEnabled();
    await expect(page.getByTestId('rename-warning-info')).toBeVisible();

    await pickSource(page, 'usb');
    await pickTarget(page, 'cloud_rsync');
    await expect(rename).toBeDisabled();
    await expect(page.getByRole('checkbox', { name: /generate thumbnails/i })).toBeDisabled();
    await expect(page.getByText(/only apply to local storage targets/i)).toBeVisible();
  });

  test('Stop all backups calls /backup/stop without a pid', async ({ page }) => {
    const button = page.getByTestId('stop-all-backups');
    await expect(button).toBeVisible();
    const requestPromise = page.waitForRequest((req) => req.url().includes('/api/backup/stop'));
    await button.click();
    const body = (await requestPromise).postDataJSON() || {};
    expect(body.pid).toBeUndefined();
  });

  test('starting a backup replaces the running one (stop_backup.sh first)', async ({ page }) => {
    await pickSource(page, 'usb');
    await pickTarget(page, 'internal');
    await page.getByRole('button', { name: /start backup/i }).click();
    await expect(page.getByText(/PID:/)).toHaveCount(1, { timeout: 10000 });
    await expect(page.getByTestId('start-stops-running-hint')).toBeVisible();

    await pickTarget(page, 'nvme');
    await page.getByRole('button', { name: /start backup/i }).click();
    await expect(page.getByText(/PID:/)).toHaveCount(1, { timeout: 10000 });
  });

  test('help section renders the translated help text', async ({ page }) => {
    await page.getByRole('button', { name: /^help$/i }).click();
    const help = page.getByTestId('backup-help-text');
    await expect(help).toContainText(/All connected USB devices/);
    await expect(help.getByRole('link', { name: 'Wiki' })).toHaveAttribute('href', /wiki/);
  });
});
