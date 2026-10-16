import { test, expect } from '@playwright/test';

// PHP-parity for the settings save path, Preferences (Backup defaults +
// Security), the hotspot password, settings restore, the Matrix token fetcher
// and the conf_POPUP_MESSAGES setting.

async function openPreferencesTab(page, tabName) {
  await page.goto('/preferences');
  await page.waitForLoadState('networkidle');
  await page.getByRole('tab', { name: tabName }).click();
}

test.describe('Config save path', () => {
  test('a save is visible on the next GET and values stay strings', async ({ request }) => {
    const mask = `E2E_${Date.now()}:!/store_00010001/DCIM;*:DCIM`;
    const save = await request.post('/api/config/save', {
      data: { conf_BACKUP_CAMERA_FOLDER_MASK: mask },
    });
    expect(save.ok()).toBeTruthy();

    const response = await request.get('/api/config');
    const body = await response.json();
    // Not stale, and the ';' separated value survives intact.
    expect(body.config.conf_BACKUP_CAMERA_FOLDER_MASK).toBe(mask);
    // Booleans are exchanged as 'true' / 'false' strings.
    expect(['true', 'false']).toContain(body.config.conf_POPUP_MESSAGES);
    // The device password itself is never sent to the client.
    expect(body.config.conf_PASSWORD).toBe('');
    expect(typeof body.password_set).toBe('boolean');
  });
});

test.describe('Preferences › Backup defaults', () => {
  test('saves the PHP config keys through the page Save bar', async ({ page }) => {
    let saved = null;
    await page.route('**/api/config/save', async (route) => {
      saved = route.request().postDataJSON();
      await route.fulfill({ json: { success: true } });
    });

    await openPreferencesTab(page, 'Backup defaults');

    await expect(page.getByRole('heading', { name: 'Automatic backup at startup' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Safety limits' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Camera folders' })).toBeVisible();

    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeDisabled();

    // Default backup: the PHP selector offers source → target pairs grouped by target.
    await page.getByRole('combobox', { name: 'Default backup' }).click();
    await page.getByRole('option', { name: 'Camera → USB storage' }).click();

    await page.getByRole('combobox', { name: 'Stop when target has less than' }).click();
    await page.getByRole('option', { name: '1 GB free' }).click();

    await page.getByRole('combobox', { name: 'Power off when idle for' }).click();
    await page.getByRole('option', { name: '30 minutes' }).click();

    const mask = page.getByLabel('Folders to back up per camera — one per line');
    await mask.fill('Canon EOS R6:!/store_00020001/DCIM\n*:DCIM\n');

    await page.getByLabel('Convert HEIC images for the viewer').click();

    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect.poll(() => saved).not.toBeNull();
    expect(saved.conf_BACKUP_DEFAULT_SOURCE).toBe('camera');
    expect(saved.conf_BACKUP_DEFAULT_TARGET).toBe('usb');
    expect(saved.conf_BACKUP_TARGET_SIZE_MIN).toBe(String(1024 ** 3));
    expect(saved.conf_POWER_OFF_IDLE_TIME).toBe('30');
    expect(saved.conf_BACKUP_CAMERA_FOLDER_MASK).toBe('Canon EOS R6:!/store_00020001/DCIM;*:DCIM');
    expect(['true', 'false']).toContain(saved.conf_VIEW_CONVERT_HEIC);
    // No more lower-case or invented keys.
    expect(Object.keys(saved).filter((k) => /^conf_[a-z]/.test(k))).toEqual([]);
    expect(Object.keys(saved).some((k) => k.startsWith('conf_default_backup_'))).toBeFalsy();
  });

  test('display tab lists background images and the popup setting', async ({ page }) => {
    await openPreferencesTab(page, 'Display');
    await page.getByRole('combobox', { name: 'Background image' }).click();
    await expect(page.getByRole('option', { name: 'lbb/paris.jpg' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByLabel('Show popup messages')).toBeVisible();
  });
});

test.describe('Preferences › Security', () => {
  test('validates, sets and removes the device password', async ({ page }) => {
    await openPreferencesTab(page, 'Security');

    const status = page.getByTestId('device-password-status');
    const setButton = page.getByRole('button', { name: 'Set password' });

    await page.getByLabel('New password').fill('abcdef');
    await page.getByLabel('Repeat password').fill('abcdeX');
    await expect(page.getByText("Passwords don't match")).toBeVisible();
    await expect(setButton).toBeDisabled();

    await page.getByLabel('Repeat password').fill('abcdef');
    await expect(setButton).toBeEnabled();
    const setRequest = page.waitForRequest((req) => req.url().includes('/api/security/password') && req.method() === 'POST');
    await setButton.click();
    await setRequest;
    await expect(status).toContainText('A password is set');

    await page.getByRole('button', { name: 'Remove password' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Remove password' }).click();
    await expect(status).toContainText('No password is set');
  });
});

test.describe('Network › Hotspot password', () => {
  test('validates length and warns about QR limits before saving', async ({ page }) => {
    let saved = null;
    await page.route('**/api/security/wifi-password', async (route) => {
      saved = route.request().postDataJSON();
      await route.fulfill({ json: { success: true } });
    });

    await page.goto('/network');
    await page.waitForLoadState('networkidle');

    const section = page.getByTestId('hotspot-password-section');
    await expect(section.getByRole('heading', { name: 'Hotspot password' })).toBeVisible();

    const field = section.getByLabel('Password', { exact: true });
    await field.fill('short');
    await expect(section.getByText('At least 8 characters')).toBeVisible();
    await expect(page.getByTestId('hotspot-password-counter')).toHaveText('5 / 63');

    await field.fill('a-rather-long;password');
    await expect(section.getByText(/Longer than 13 characters/)).toBeVisible();
    await expect(section.getByText(/Avoid “;” and “:”/)).toBeVisible();

    await field.fill('hotspot123');
    await section.getByLabel('Fixed password').check();
    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    await expect.poll(() => saved).not.toBeNull();
    expect(saved).toEqual({ type: 'static', password: 'hotspot123' });
  });
});

test.describe('Maintenance › Settings restore', () => {
  test('shows the list of restored files', async ({ page }) => {
    await page.goto('/maintenance');
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: 'Settings' }).click();

    await page.locator('#settings-file-input').setInputFiles({
      name: 'lbb-settings.zip',
      mimeType: 'application/zip',
      buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00]),
    });

    const result = page.getByTestId('settings-restore-result');
    await expect(result).toBeVisible();
    await expect(result).toContainText('config.cfg');
    await expect(result).toContainText('rclone.conf');
  });
});

test.describe('Integrations › Matrix token', () => {
  test('fetches an access token and fills the token field', async ({ page }) => {
    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');
    await page.getByRole('tab', { name: 'Social' }).click();
    await page.getByRole('button', { name: 'Matrix' }).click();

    await page.getByRole('button', { name: 'Fetch token…' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/Matrix homeserver/).fill('https://matrix.example.org');
    await dialog.getByLabel(/Matrix username/).fill('@bot:example.org');
    await dialog.getByLabel('Password', { exact: true }).fill('secret-password');
    await dialog.getByRole('button', { name: 'Fetch token', exact: true }).click();
    await expect(dialog.getByText(/Token successfully fetched for @bot:example.org/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Apply' }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByLabel('Access token of the bot account')).toHaveValue(/^syt_/);
  });
});

test.describe('Popup messages setting', () => {
  test('suppresses the "settings saved" toast when conf_POPUP_MESSAGES is false', async ({ page }) => {
    await page.route('**/api/config', async (route) => {
      const response = await route.fetch();
      const json = await response.json();
      json.config.conf_POPUP_MESSAGES = 'false';
      await route.fulfill({ response, json });
    });
    await page.route('**/api/config/save', (route) => route.fulfill({ json: { success: true } }));

    await openPreferencesTab(page, 'Backup defaults');
    await page.getByLabel('Move files instead of copying').click();
    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await saveButton.click();
    await expect(saveButton).toBeDisabled();
    await page.waitForTimeout(500);
    await expect(page.getByText('config.cfg was written successfully.')).toHaveCount(0);
  });
});
