import { test, expect } from '@playwright/test';

test.describe('Page-level Save bar', () => {
  test('Hardware: Save button is disabled on load and enables when a field is dirty', async ({ page }) => {
    await page.goto('/hardware');
    await page.waitForLoadState('networkidle');

    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeVisible();
    await expect(saveButton).toBeDisabled();

    // Toggle the "Enable display" checkbox on the Display tab.
    await page.getByRole('tab', { name: 'Display' }).click();
    const displayCheckbox = page.getByLabel(/^Enable display$/i);
    await displayCheckbox.click();

    await expect(saveButton).toBeEnabled();
  });

  test('Connections: edit fields on two tabs and save once', async ({ page }) => {
    const saveRequests = [];
    page.on('request', (req) => {
      if (req.method() === 'POST' && req.url().includes('/api/config/save')) {
        saveRequests.push(req.postDataJSON?.() || null);
      }
    });

    await page.goto('/integrations');
    await page.waitForLoadState('networkidle');

    const saveButton = page.getByRole('button', { name: 'Save', exact: true });
    await expect(saveButton).toBeDisabled();

    // Edit a field on the Mail tab.
    await page.getByRole('tab', { name: 'Mail' }).click();
    const smtpServer = page.getByLabel(/Address of the SMTP/i);
    await smtpServer.fill('mail.example.com');

    await expect(saveButton).toBeEnabled();

    // Switch to the Cloud tab and edit a field there.
    await page.getByRole('tab', { name: 'Cloud' }).click();
    const rsyncServer = page.getByLabel(/Address of the rsync/i);
    await rsyncServer.fill('rsync.example.com');

    await expect(saveButton).toBeEnabled();

    await saveButton.click();
    await expect(saveButton).toBeDisabled({ timeout: 5000 });

    expect(
      saveRequests.length,
      'expected at least one POST /api/config/save fired by clicking the page Save button',
    ).toBeGreaterThan(0);
  });
});
