import express from 'express';
import { execCommand } from '../utils/execCommand.js';
import { saveConfigValues } from '../utils/configLoader.js';
import { shellQuote } from './config.js';

// Device password and hotspot (WiFi) password, mirroring scripts/setup.php
// write_config() (lines 270-302) and the "Global Password" / "Wi-Fi" sections
// of the settings page (lines 1760-1856). Both act immediately and are not part
// of the generic POST /api/config/save path, because they change system
// accounts and the comitup configuration.

const router = express.Router();

export const DEVICE_PASSWORD_MIN_LENGTH = 5;
export const WIFI_PASSWORD_MIN_LENGTH = 8;
export const WIFI_PASSWORD_MAX_LENGTH = 63;

function encodePassword(password) {
  return password ? Buffer.from(password, 'utf-8').toString('base64') : '';
}

export function decodePassword(value) {
  if (!value) return '';
  try {
    return Buffer.from(String(value), 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

function isPrintableAscii(value) {
  return [...value].every((c) => {
    const code = c.charCodeAt(0);
    return code >= 32 && code <= 126;
  });
}

// setup.php check_new_password() for the hotspot password: 8-63 printable ASCII.
export function validateWifiPassword(password) {
  if (password.length < WIFI_PASSWORD_MIN_LENGTH) return 'too_short';
  if (password.length > WIFI_PASSWORD_MAX_LENGTH) return 'too_long';
  if (!isPrintableAscii(password)) return 'not_ascii';
  return null;
}

// sudo python3 lib_password.py '<pwd>' (set) or without argument (remove).
// The password is passed as a single shell-quoted argument and never logged.
export async function runLibPassword(req, password) {
  const script = `${req.WORKING_DIR}/lib_password.py`;
  const command = password ? `sudo python3 ${script} ${shellQuote(password)}` : `sudo python3 ${script}`;
  return execCommand(command, { logger: req.logger, logCommand: false });
}

// sudo python3 lib_comitup.py --config '<pwd>' (setup.php:292).
export async function runLibComitupConfig(req, password) {
  const command = `sudo python3 ${req.WORKING_DIR}/lib_comitup.py --config ${shellQuote(password || '')}`;
  return execCommand(command, { logger: req.logger, logCommand: false });
}

// lib_password.py also writes the device password into the comitup config
// (lib_comitup.config(Password)). setup.php processes conf_WIFI_PASSWORD right
// afterwards, so a static hotspot password wins again; do the same here.
async function reapplyStaticWifiPassword(req, config) {
  if ((config.conf_WIFI_PASSWORD_TYPE || 'static') !== 'static') return;
  const wifiPassword = decodePassword(config.conf_WIFI_PASSWORD);
  if (wifiPassword && validateWifiPassword(wifiPassword)) return;
  await runLibComitupConfig(req, wifiPassword);
}

router.get('/status', (req, res) => {
  res.json({
    password_set: Boolean(req.config.conf_PASSWORD),
    wifi_password_type: req.config.conf_WIFI_PASSWORD_TYPE || 'static',
  });
});

router.post('/password', async (req, res) => {
  try {
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    const repeat = typeof req.body?.repeat === 'string' ? req.body.repeat.trim() : '';

    if (password !== repeat) {
      return res.status(400).json({ error: 'not_identical' });
    }
    if (password.length < DEVICE_PASSWORD_MIN_LENGTH) {
      return res.status(400).json({ error: 'too_short', min: DEVICE_PASSWORD_MIN_LENGTH });
    }
    if (/[\r\n]/.test(password)) {
      return res.status(400).json({ error: 'invalid_characters' });
    }

    const result = await runLibPassword(req, password);
    if (!result.success) {
      req.logger.error('lib_password.py failed while setting the device password');
      return res.status(500).json({ error: 'apply_failed' });
    }

    const config = saveConfigValues({ conf_PASSWORD: encodePassword(password) }, req.WORKING_DIR);
    await reapplyStaticWifiPassword(req, config);

    req.logger.info('Device password set');
    res.json({ success: true, password_set: true });
  } catch (error) {
    req.logger.error('Failed to set device password', { error: error.message });
    res.status(500).json({ error: 'apply_failed' });
  }
});

router.post('/password/remove', async (req, res) => {
  try {
    const result = await runLibPassword(req, '');
    if (!result.success) {
      req.logger.error('lib_password.py failed while removing the device password');
      return res.status(500).json({ error: 'apply_failed' });
    }

    const config = saveConfigValues({ conf_PASSWORD: '' }, req.WORKING_DIR);
    await reapplyStaticWifiPassword(req, config);

    req.logger.info('Device password removed');
    res.json({ success: true, password_set: false });
  } catch (error) {
    req.logger.error('Failed to remove device password', { error: error.message });
    res.status(500).json({ error: 'apply_failed' });
  }
});

// Hotspot password (setup.php:290-302). With a fixed ('static') password the
// comitup config is rewritten via lib_comitup.py --config; an empty fixed
// password leaves the hotspot open (lib_comitup only writes ap_password for
// 8-63 characters). 'dynamic' just stores the setting: lib_comitup.py picks a
// new random password on each start.
router.post('/wifi-password', async (req, res) => {
  try {
    const type = req.body?.type;
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';

    if (type !== 'static' && type !== 'dynamic') {
      return res.status(400).json({ error: 'invalid_type' });
    }
    if (password) {
      const validationError = validateWifiPassword(password);
      if (validationError) {
        return res.status(400).json({
          error: validationError,
          min: WIFI_PASSWORD_MIN_LENGTH,
          max: WIFI_PASSWORD_MAX_LENGTH,
        });
      }
    }

    if (type === 'static') {
      const result = await runLibComitupConfig(req, password);
      if (!result.success) {
        req.logger.error('lib_comitup.py --config failed while setting the hotspot password');
        return res.status(500).json({ error: 'apply_failed' });
      }
    }

    saveConfigValues(
      { conf_WIFI_PASSWORD_TYPE: type, conf_WIFI_PASSWORD: encodePassword(password) },
      req.WORKING_DIR,
    );

    req.logger.info(`Hotspot password saved (${type})`);
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Failed to save hotspot password', { error: error.message });
    res.status(500).json({ error: 'apply_failed' });
  }
});

export default router;
