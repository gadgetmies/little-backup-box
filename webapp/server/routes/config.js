import express from 'express';
import path from 'path';
import { existsSync, statSync } from 'fs';
import { fileURLToPath } from 'url';
import { execCommand } from '../utils/execCommand.js';
import { saveConfigValues } from '../utils/configLoader.js';
import { shouldUseMocks } from '../utils/systemDetector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Keys whose values are secrets that must never be sent to the browser.
// The client only learns whether a device password is set (password_set).
const SECRET_KEYS = ['conf_PASSWORD'];

export function publicConfig(config) {
  const copy = { ...config };
  for (const key of SECRET_KEYS) {
    copy[key] = '';
  }
  return copy;
}

const TIME_ZONE_PATTERN = /^[A-Za-z0-9_+\-/]+$/;
const WIFI_COUNTRY_PATTERN = /^[A-Z]{2}$/;
const LANGUAGE_PATTERN = /^[a-z]{2}$/;

export function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

// Look up a string of the PHP UI's language files (scripts/lang/*.json) the
// same way the Python scripts do (lib_language.py -> lib-language-helper.php).
export async function phpLanguageString(req, key, fallback) {
  if (shouldUseMocks()) return fallback;
  const result = await execCommand(`python3 ${req.WORKING_DIR}/lib_language.py ${shellQuote(key)}`, {
    logger: req.logger,
    logCommand: false,
  });
  const text = result.success ? (result.stdout || '').trim() : '';
  return text || fallback;
}

// Run the side effects scripts/setup.php performs around write_config():
//   - setup.php:107-110  timezone changed   -> raspi-config do_change_timezone
//   - setup.php:112-116  WiFi country changed -> raspi-config do_wifi_country
//   - setup.php:445      sudo set_hardware.sh
//   - setup.php:447-452  tinyfilemanager language
//   - setup.php:87       restart the display and show "Settings saved."
async function runSaveSideEffects(req, previousConfig, newConfig, updates) {
  const { logger } = req;

  if (
    updates.conf_TIME_ZONE !== undefined &&
    newConfig.conf_TIME_ZONE &&
    newConfig.conf_TIME_ZONE !== previousConfig.conf_TIME_ZONE &&
    TIME_ZONE_PATTERN.test(newConfig.conf_TIME_ZONE)
  ) {
    await execCommand(`sudo raspi-config nonint do_change_timezone ${newConfig.conf_TIME_ZONE}`, { logger });
  }

  if (updates.conf_WIFI_COUNTRY !== undefined && WIFI_COUNTRY_PATTERN.test(newConfig.conf_WIFI_COUNTRY || '')) {
    const current = await execCommand('raspi-config nonint get_wifi_country', { logger });
    const currentCountry = current.success ? (current.stdout || '').trim() : '';
    if (currentCountry !== newConfig.conf_WIFI_COUNTRY) {
      await execCommand(`sudo raspi-config nonint do_wifi_country ${newConfig.conf_WIFI_COUNTRY}`, { logger });
    }
  }

  await execCommand(`sudo ${req.WORKING_DIR}/set_hardware.sh`, { logger });

  const language = (newConfig.conf_LANGUAGE || '').slice(0, 2);
  if (LANGUAGE_PATTERN.test(language)) {
    const php = `include "${req.WORKING_DIR}/tinyfilemanager-config.php"; $t = new tinyfilemanager\\tinyfilemanager; $t->reconfig(array("lang=${language}"));`;
    await execCommand(`sudo php -r ${shellQuote(php)}`, { logger });
  }

  const frameTime = Math.max(
    parseFloat(newConfig.conf_DISP_FRAME_TIME) || 0,
    parseFloat(newConfig.conf_DISP_FRAME_TIME_IP) || 0,
  ) + 0.2;
  const line1 = await phpLanguageString(req, 'config_display_message_settings_saved_1', 'Settings');
  const line2 = await phpLanguageString(req, 'config_display_message_settings_saved_2', 'saved.');
  const displayScript = `${req.WORKING_DIR}/lib_display.py`;
  const inner = `python3 ${displayScript} 'set:kill'; sleep ${frameTime.toFixed(1)}; python3 ${displayScript} ${shellQuote(line1)} ${shellQuote(line2)} > /dev/null 2>&1 &`;
  await execCommand(`sudo bash -c ${shellQuote(inner)}`, { logger });
}

// Shared save path used by POST /api/config/save and POST /api/setup/save.
export async function applyConfigSave(req, body) {
  const updates = {};
  for (const [key, value] of Object.entries(body || {})) {
    if (key.startsWith('conf_') && !SECRET_KEYS.includes(key)) {
      updates[key] = value;
    }
  }

  if (updates.conf_TIME_ZONE !== undefined && !TIME_ZONE_PATTERN.test(String(updates.conf_TIME_ZONE))) {
    const error = new Error('Invalid time zone');
    error.status = 400;
    throw error;
  }
  if (updates.conf_WIFI_COUNTRY !== undefined && updates.conf_WIFI_COUNTRY !== '' && !WIFI_COUNTRY_PATTERN.test(String(updates.conf_WIFI_COUNTRY))) {
    const error = new Error('Invalid WiFi country');
    error.status = 400;
    throw error;
  }

  const previousConfig = { ...req.config };
  const newConfig = saveConfigValues(updates, req.WORKING_DIR);
  req.config = newConfig;

  try {
    await runSaveSideEffects(req, previousConfig, newConfig, updates);
  } catch (error) {
    req.logger.warn('Config saved, but a post-save step failed', { error: error.message });
  }

  return newConfig;
}

router.get('/', (req, res) => {
  try {
    res.json({
      config: publicConfig(req.config),
      constants: req.constants,
      password_set: Boolean(req.config.conf_PASSWORD),
    });
  } catch (error) {
    req.logger.error('Failed to get config', { error: error.message });
    res.status(500).json({ error: 'Failed to load config' });
  }
});

router.get('/button-actions', (req, res) => {
  res.json({
    actions: ['backup_start', 'backup_stop', 'view_next', 'view_prev', 'shutdown', 'reboot'],
  });
});

router.post('/save', async (req, res) => {
  try {
    await applyConfigSave(req, req.body);
    req.logger.info('Config saved');
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Failed to save config', { error: error.message });
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to save config' });
  }
});

function backgroundImagesDir(constants) {
  return path.join(constants.const_MEDIA_DIR, constants.const_BACKGROUND_IMAGES_DIR);
}

// Mock mode: the bundled installer backgrounds (install-little-backup-box.sh
// moves scripts/img/backgrounds/* to <media>/<bg dir>/lbb/).
const MOCK_BACKGROUND_DIR = path.resolve(__dirname, '../../../scripts/img/backgrounds');

// Background images for conf_BACKGROUND_IMAGE, listed like setup.php:873-885.
router.get('/background-images', async (req, res) => {
  try {
    const dir = backgroundImagesDir(req.constants);
    const command = `find ${shellQuote(dir)} -type f -exec file --mime-type {} \\+ | awk -F: '{if ($2 ~/image\\//) print $1}'`;
    const result = await execCommand(command, { logger: req.logger });
    const images = result.success
      ? (result.stdout || '')
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.startsWith(`${dir}/`))
          .map((line) => line.slice(dir.length + 1))
          .sort()
      : [];
    res.json({ images, directory: dir });
  } catch (error) {
    req.logger.error('Failed to list background images', { error: error.message });
    res.status(500).json({ error: 'Failed to list background images' });
  }
});

router.get('/background-image', (req, res) => {
  const file = String(req.query.file || '');
  if (!file || file.includes('..') || path.isAbsolute(file)) {
    return res.status(400).json({ error: 'Invalid file' });
  }
  const baseDir = shouldUseMocks() ? MOCK_BACKGROUND_DIR : backgroundImagesDir(req.constants);
  const relative = shouldUseMocks() ? path.basename(file) : file;
  const fullPath = path.resolve(baseDir, relative);
  if (!fullPath.startsWith(`${path.resolve(baseDir)}${path.sep}`) || !existsSync(fullPath) || !statSync(fullPath).isFile()) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.sendFile(fullPath);
});

export default router;
