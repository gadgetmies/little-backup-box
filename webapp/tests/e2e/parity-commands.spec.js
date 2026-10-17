import { test, expect } from '@playwright/test';

// PHP-parity for protected commands (scripts/cmd.php), logs, sysinfo and the
// app shell. Runs against dev:mock, where the device password is "lbb"
// (server/utils/commandRunner.js MOCK_DEVICE_PASSWORD).

// Only one protected command can run at a time on the server, so these tests
// must not run in parallel with each other.
test.describe.configure({ mode: 'serial' });

async function openStorageTab(page, index) {
  await page.addInitScript((i) => {
    window.localStorage.setItem('lbb-tabs-storage', String(i));
  }, index);
  await page.goto('/storage');
}

async function waitForIdle(request) {
  await expect
    .poll(async () => (await (await request.get('/api/cmd/status')).json()).running, { timeout: 30000 })
    .toBe(false);
}

test.describe('Protected commands', () => {
  test.beforeEach(async ({ request }) => {
    await waitForIdle(request);
  });

  test('format asks for the device password, rejects a wrong one and streams the output', async ({ page }) => {
    await openStorageTab(page, 3);

    await page.getByRole('combobox').nth(0).click();
    await page.getByRole('option', { name: /^sdb1/ }).click();
    await page.getByRole('combobox').nth(1).click();
    await page.getByRole('option', { name: /^exFAT/ }).click();
    await page.getByRole('button', { name: /format disc/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Format sdb1 as exFAT?');
    await expect(dialog).toContainText('Required for format, repair, capacity test, updates and WiFi reset.');
    await expect(dialog).toContainText('Demo password: lbb');

    const confirm = page.getByTestId('protected-command-confirm');
    await expect(confirm).toBeDisabled();

    await page.getByTestId('protected-command-password').fill('wrong');
    await confirm.click();
    await expect(dialog).toContainText('Wrong password');

    await page.getByTestId('protected-command-password').fill('lbb');
    await confirm.click();

    await expect(dialog).toContainText('Command output');
    const output = page.getByTestId('protected-command-output');
    await expect(output).toContainText('mkfs', { timeout: 10000 });
    await expect(output).toContainText('FINISHED.', { timeout: 20000 });
    await expect(dialog).toContainText('Command finished', { timeout: 10000 });
  });

  test('fsck check needs no password and shows the command output', async ({ page }) => {
    await openStorageTab(page, 2);

    await page.getByRole('combobox').first().click();
    await page.getByRole('option', { name: /^sdb1/ }).click();
    await page.getByRole('button', { name: /^check$/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(page.getByTestId('protected-command-password')).toHaveCount(0);
    await expect(page.getByTestId('protected-command-output')).toContainText('e2fsck', { timeout: 10000 });
    await expect(dialog).toContainText('Command finished', { timeout: 20000 });
  });

  test('without a device password the action is blocked and links to Preferences → Security', async ({ page }) => {
    await page.route('**/api/cmd/status', (route) =>
      route.fulfill({
        json: { passwordSet: false, mailConfigured: false, running: false, command: null, demoPassword: null },
      }),
    );
    await page.addInitScript(() => window.localStorage.setItem('lbb-tabs-system', 'updates'));
    await page.goto('/system');

    await page.getByRole('button', { name: /update libraw/i }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('No device password has been set');
    await expect(page.getByTestId('protected-command-confirm')).toBeDisabled();

    await dialog.getByRole('button', { name: 'Set password' }).click();
    await expect(page).toHaveURL(/\/preferences$/);
    expect(await page.evaluate(() => window.localStorage.getItem('lbb-tabs-preferences'))).toBe('security');
  });

  test('protected routes reject requests without the password', async ({ request }) => {
    const format = await request.post('/api/tools/format', { data: { partition: 'sdb1', fstype: 'exFAT' } });
    expect(format.status()).toBe(403);
    expect((await format.json()).code).toBe('password_invalid');

    const comitup = await request.post('/api/network/comitup/reset', { data: { password: 'nope' } });
    expect(comitup.status()).toBe(403);

    const update = await request.post('/api/setup/update/install', { data: {} });
    expect(update.status()).toBe(403);
  });
});

test.describe('Logs', () => {
  test('log endpoint only serves the allow-listed logs', async ({ request }) => {
    expect((await request.get('/api/log?file=/etc/passwd')).status()).toBe(400);
    expect((await request.post('/api/log/clear', { data: { file: '/etc/passwd' } })).status()).toBe(400);
    expect((await request.get('/api/log?file=cmd')).status()).toBe(200);
    expect((await request.get('/api/log?file=main')).status()).toBe(200);
  });

  test('clearing a log recreates it with the header line', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('lbb-tabs-system', 'logs'));
    await page.goto('/system');

    const monitor = page.getByTestId('log-monitor-main');
    await expect(monitor.getByRole('button', { name: 'Download' })).toBeVisible();
    await monitor.getByRole('button', { name: 'Clear log' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Clear log' }).click();
    // The server keeps logging, so only the header line is deterministic.
    await expect(monitor.locator('pre')).toHaveText(/^Little Backup Box\n/);
    await expect(page.getByTestId('log-monitor-cmd')).toContainText('Command log');
  });
});

test.describe('System information', () => {
  test('camera details follow sysinfo.php', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('lbb-tabs-system', 'cameras'));
    await page.goto('/system');

    const camera = page.getByTestId('camera-entry').first();
    await expect(camera).toContainText('Canon EOS Rebel T7i usb:001,005');
    await expect(camera).toContainText('Camera model');
    await expect(camera).toContainText('Serial number');
    await expect(camera).toContainText('Storage paths');
    await expect(camera).toContainText('For use as pattern in Settings');
    await expect(camera).toContainText('Canon_EOS_Rebel_T7i:!/store_00010001');
    await expect(camera).toContainText('Canon_EOS_Rebel_T7i_12345678:!/store_00010001');
  });

  test('device states list devices even when smartctl exits non-zero', async ({ page }) => {
    await openStorageTab(page, 0);
    await expect(page.getByText('BKP-998877')).toBeVisible();
  });
});

test.describe('App shell', () => {
  test('sidebar shows the update badge, comitup portal and rclone GUI links', async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/');
    // The drawer is rendered twice (temporary + permanent); use the visible one.
    const visible = (id) => page.locator(`[data-testid="${id}"]:visible`);
    await expect(visible('update-badge')).toHaveText('Update');
    await expect(visible('nav-comitup')).toContainText('WiFi portal (comitup)');
    await expect(visible('nav-comitup')).not.toHaveAttribute('aria-disabled', 'true');

    const opened = [];
    await page.exposeFunction('__recordOpen', (url) => opened.push(url));
    await page.evaluate(() => {
      window.open = (url) => {
        window.__recordOpen(url);
        return null;
      };
    });
    await visible('nav-rclone_gui').click();
    await visible('nav-comitup').click();
    await expect.poll(() => opened).toEqual(['/rclone/', '/comitup/']);
  });

  test('shows a branch chip when not on main and the display image when the display is enabled', async ({ page }) => {
    await page.route('**/api/config', async (route) => {
      const response = await route.fetch();
      const body = await response.json();
      body.constants = { ...body.constants, const_SOFTWARE_BRANCH: 'development' };
      body.config = { ...body.config, conf_DISP: '1', conf_DISP_RESOLUTION_X: '128', conf_DISP_RESOLUTION_Y: '64' };
      await route.fulfill({ response, json: body });
    });
    await page.goto('/');
    await expect(page.getByTestId('branch-chip')).toHaveText('branch: development');

    await page.getByRole('button', { name: 'Device status' }).click();
    const image = page.getByTestId('display-image');
    await expect(image).toBeVisible();
    await expect(image).toHaveAttribute('src', /\/api\/display\/image/);
  });
});
