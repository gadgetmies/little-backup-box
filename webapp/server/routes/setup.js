import express from 'express';
import { readFileSync, writeFileSync, existsSync, renameSync, createReadStream, unlinkSync, mkdirSync, readdirSync, statSync } from 'fs';
import { parse } from 'ini';
import path from 'path';
import { fileURLToPath } from 'url';
import { execCommand } from '../utils/execCommand.js';
import { getTempDir, getIdletimeLockfile } from '../utils/paths.js';
import {
  displayCommand,
  getCurrentConfig,
  isMailConfigured,
  requireDevicePassword,
  runInBackground,
  serverT,
} from '../utils/commandRunner.js';
import multer from 'multer';
import { applyConfigSave, phpLanguageString, shellQuote } from './config.js';
import {
  decodePassword,
  runLibPassword,
  runLibComitupConfig,
  validateWifiPassword,
  DEVICE_PASSWORD_MIN_LENGTH,
} from './security.js';
import { parseConfigText, reloadConfig } from '../utils/configLoader.js';
import { shouldUseMocks } from '../utils/systemDetector.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

const isDev = process.env.NODE_ENV !== 'production';
const uploadDir = isDev ? path.join(__dirname, '../../tmp') : '/tmp';
const upload = multer({ dest: uploadDir });

router.get('/wifi-country', async (req, res) => {
  try {
    const result = await execCommand('raspi-config nonint get_wifi_country', { logger: req.logger });
    const country = result.success ? result.stdout.trim() : '';
    res.json({ country });
  } catch (error) {
    req.logger.error('Failed to get WiFi country', { error: error.message });
    res.status(500).json({ error: 'Failed to get WiFi country' });
  }
});

router.get('/wifi-countries', async (req, res) => {
  try {
    const result = await execCommand("sed '/^#/d' /usr/share/zoneinfo/iso3166.tab", { logger: req.logger });
    
    if (!result.success) {
      return res.json({ countries: [] });
    }
    
    const countries = result.stdout
      .trim()
      .split('\n')
      .map(line => {
        const parts = line.split('\t');
        return {
          code: parts[0]?.trim() || '',
          name: parts[1]?.trim() || '',
        };
      })
      .filter(c => c.code && c.name);
    
    res.json({ countries });
  } catch (error) {
    req.logger.error('Failed to get WiFi countries', { error: error.message });
    res.status(500).json({ error: 'Failed to get WiFi countries' });
  }
});

router.post('/save', async (req, res) => {
  // Same save path (and side effects) as POST /api/config/save.
  try {
    await applyConfigSave(req, req.body);
    req.logger.info('Setup config saved');
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Failed to save setup config', { error: error.message });
    res.status(error.status || 500).json({ error: error.status ? error.message : 'Failed to save setup config' });
  }
});

router.post('/test-mail', async (req, res) => {
  try {
    const command = `sudo python3 ${req.WORKING_DIR}/lib_mail.py 'Test mail' 'This is a test mail from Little Backup Box' /dev/null 2>&1`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (result.success) {
      res.json({ success: true, message: 'Test mail sent' });
    } else {
      const errorMessage = result.stderr || result.error || 'Failed to send test mail';
      req.logger.error('Failed to send test mail', { error: errorMessage, stderr: result.stderr });
      res.status(500).json({ error: errorMessage });
    }
  } catch (error) {
    req.logger.error('Failed to send test mail', { error: error.message });
    res.status(500).json({ error: error.message || 'Failed to send test mail' });
  }
});

router.post('/restart-rclone-gui', async (req, res) => {
  try {
    const command = `sudo python3 ${req.WORKING_DIR}/start-rclone-gui.py True > /dev/null 2>&1 &`;
    await execCommand(command, { logger: req.logger });
    
    res.json({ success: true, message: 'Rclone GUI restarted' });
  } catch (error) {
    req.logger.error('Failed to restart rclone GUI', { error: error.message });
    res.status(500).json({ error: 'Failed to restart rclone GUI' });
  }
});

router.get('/update-check', async (req, res) => {
  try {
    const command = `sudo python3 ${req.WORKING_DIR}/lib_git.py --write-available --update-available`;
    const result = await execCommand(command, { logger: req.logger });
    
    const updateAvailable = result.success && result.stdout.trim() === 'True';
    
    res.json({ updateAvailable });
  } catch (error) {
    req.logger.error('Failed to check for updates', { error: error.message });
    res.status(500).json({ error: 'Failed to check for updates' });
  }
});

router.get('/update/status', async (req, res) => {
  try {
    const configPath = path.join(req.WORKING_DIR, 'config.cfg');
    const config = parse(readFileSync(configPath, 'utf-8'));
    
    const branch = req.constants?.const_SOFTWARE_BRANCH || 'main';
    const installedVersion = config.conf_SOFTWARE_DATE_INSTALLED || '';
    const availableVersion = config.conf_SOFTWARE_DATE_AVAILABLE || '';
    
    res.json({
      branch,
      installedVersion,
      availableVersion,
    });
  } catch (error) {
    req.logger.error('Failed to get update status', { error: error.message });
    res.status(500).json({ error: 'Failed to get update status' });
  }
});

// cmd.php:309-313 — LibRaw update runs in the background into the command
// log, with display start/stop messages and the optional mail result.
router.post('/update/libraw', requireDevicePassword, async (req, res) => {
  try {
    const config = req.currentConfig || getCurrentConfig(req);
    const tr = (key) => serverT(config, key);
    const commandLine = [
      displayCommand(req.WORKING_DIR, [tr('cmd.box.update_start1'), tr('cmd.box.update_start2')]),
      `sudo bash ${req.WORKING_DIR}/mods/update_libraw.sh`,
      displayCommand(req.WORKING_DIR, [tr('cmd.box.update_stop1'), tr('cmd.box.update_stop2')]),
    ].join(';');
    const mail = req.body?.mailResult === true && isMailConfigured(config);

    runInBackground(req, { cmd: 'update_libraw', commandLine, mail });

    req.logger.info('LibRaw update started');
    res.json({ success: true, started: true });
  } catch (error) {
    if (error.code === 'command_running') {
      return res.status(409).json({ error: error.message, code: error.code });
    }
    req.logger.error('Failed to update LibRaw', { error: error.message });
    res.status(500).json({ error: 'Failed to update LibRaw' });
  }
});

// cmd.php:297-307 — 'update' installs the main branch, 'update_development'
// the development branch. Password protected, no mail option.
router.post('/update/install', requireDevicePassword, async (req, res) => {
  try {
    const config = req.currentConfig || getCurrentConfig(req);
    const branch = req.body?.branch === 'development' ? 'development' : 'main';
    const cmd = branch === 'development' ? 'update_development' : 'update';
    const commandLine = [
      displayCommand(req.WORKING_DIR, [serverT(config, 'cmd.box.update_start1'), serverT(config, 'cmd.box.update_start2')]),
      `sudo -u pi curl -sSL https://raw.githubusercontent.com/outdoorbits/little-backup-box/${branch}/install-little-backup-box.sh -o ~pi/install-little-backup-box.sh`,
      `sudo -u pi bash ~pi/install-little-backup-box.sh ${branch}`,
    ].join(';');

    runInBackground(req, { cmd, commandLine, mail: false });

    req.logger.info(`Update installation started for branch: ${branch}`);
    res.json({ success: true, started: true, message: 'Update installation started' });
  } catch (error) {
    if (error.code === 'command_running') {
      return res.status(409).json({ error: error.message, code: error.code });
    }
    req.logger.error('Failed to install update', { error: error.message });
    res.status(500).json({ error: 'Failed to install update' });
  }
});

router.get('/download-settings', async (req, res) => {
  try {
    const tempDir = getTempDir(req.WORKING_DIR, req.constants);
    const zipFileName = 'lbb-settings.zip';
    const zipFilePath = path.join(tempDir, zipFileName);
    
    const files = [];
    
    const configFile = path.join(req.WORKING_DIR, 'config.cfg');
    if (existsSync(configFile)) {
      files.push({ file: configFile, dir: '' });
    }
    
    const rcloneConfig = path.join(req.constants.const_MEDIA_DIR, req.constants.const_RCLONE_CONFIG_FILE);
    if (existsSync(rcloneConfig)) {
      files.push({ file: rcloneConfig, dir: '' });
    }
    
    const buttonsConfig = path.join(req.constants.const_MEDIA_DIR, req.constants.const_BUTTONS_PRIVATE_CONFIG_FILE);
    if (existsSync(buttonsConfig)) {
      files.push({ file: buttonsConfig, dir: '' });
    }
    
    const vpnTypes = ['OpenVPN', 'WireGuard'];
    for (const vpnType of vpnTypes) {
      const vpnDir = req.constants[`const_VPN_DIR_${vpnType}`];
      const vpnFilename = req.constants[`const_VPN_FILENAME_${vpnType}`];
      if (vpnDir && vpnFilename) {
        const vpnConfigFile = path.join(vpnDir, vpnFilename);
        if (existsSync(vpnConfigFile)) {
          await execCommand(`sudo chmod 755 "${vpnDir}"`, { logger: req.logger });
          await execCommand(`sudo chmod 755 "${vpnConfigFile}"`, { logger: req.logger });
          files.push({ file: vpnConfigFile, dir: '' });
        }
      }
    }
    
    const backgroundImagesDir = path.join(req.constants.const_MEDIA_DIR, req.constants.const_BACKGROUND_IMAGES_DIR);
    if (existsSync(backgroundImagesDir)) {
      const { readdirSync, statSync } = await import('fs');
      const backgroundImages = readdirSync(backgroundImagesDir);
      for (const bgImage of backgroundImages) {
        const bgImagePath = path.join(backgroundImagesDir, bgImage);
        if (statSync(bgImagePath).isFile()) {
          files.push({ file: bgImagePath, dir: 'bg-images' });
        }
      }
    }
    
    if (files.length === 0) {
      return res.status(404).json({ error: 'No settings files found' });
    }
    
    if (existsSync(zipFilePath)) {
      unlinkSync(zipFilePath);
    }
    
    for (const fileInfo of files) {
      let zipCommand;
      if (fileInfo.dir) {
        const targetPath = `${fileInfo.dir}/${path.basename(fileInfo.file)}`;
        zipCommand = `zip -q "${zipFilePath}" "${targetPath}" "${fileInfo.file}"`;
      } else {
        zipCommand = `cd "${path.dirname(fileInfo.file)}" && zip -q "${zipFilePath}" "${path.basename(fileInfo.file)}"`;
      }
      
      const result = await execCommand(zipCommand, { logger: req.logger });
      if (!result.success) {
        throw new Error('Failed to create zip archive');
      }
    }
    
    for (const vpnType of vpnTypes) {
      const vpnDir = req.constants[`const_VPN_DIR_${vpnType}`];
      const vpnFilename = req.constants[`const_VPN_FILENAME_${vpnType}`];
      if (vpnDir && vpnFilename) {
        const vpnConfigFile = path.join(vpnDir, vpnFilename);
        if (existsSync(vpnConfigFile)) {
          await execCommand(`sudo chmod 700 "${vpnConfigFile}"`, { logger: req.logger });
        }
      }
    }
    
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
    
    const fileStream = createReadStream(zipFilePath);
    fileStream.pipe(res);
    
    fileStream.on('end', () => {
      unlinkSync(zipFilePath);
    });
    
    fileStream.on('error', (error) => {
      req.logger.error('Error streaming zip file', { error: error.message });
      if (existsSync(zipFilePath)) {
        unlinkSync(zipFilePath);
      }
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to download settings' });
      }
    });
  } catch (error) {
    req.logger.error('Failed to download settings', { error: error.message });
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to download settings' });
    }
  }
});

const ZIP_MIME_TYPES = ['application/zip', 'application/x-zip-compressed', 'multipart/x-zip', 'application/x-compressed'];
const VPN_TYPES = ['OpenVPN', 'WireGuard'];

function isZipUpload(file) {
  // setup.php:461-475 accepts the upload only with a .zip extension and a zip
  // mime type. Browsers are inconsistent about the mime type of zip files, so
  // a file starting with the zip magic number "PK\x03\x04" is accepted too.
  if (!file || !file.originalname || !file.originalname.toLowerCase().endsWith('.zip')) return false;
  if (ZIP_MIME_TYPES.includes(file.mimetype)) return true;
  try {
    const header = readFileSync(file.path).subarray(0, 4);
    return header.length === 4 && header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
  } catch {
    return false;
  }
}

async function showDisplayMessage(req, lines) {
  const args = lines.map((line) => shellQuote(line)).join(' ');
  await execCommand(`sudo python3 ${req.WORKING_DIR}/lib_display.py ${args} > /dev/null 2>&1 &`, { logger: req.logger });
}

async function showUploadErrorOnDisplay(req) {
  await showDisplayMessage(req, [
    await phpLanguageString(req, 'config_display_message_settings_upload_error_1', 'Settings'),
    await phpLanguageString(req, 'config_display_message_settings_upload_error_2', 'import'),
    await phpLanguageString(req, 'config_display_message_settings_upload_error_3', 'failed.'),
  ]);
}

// Restore a settings archive, following scripts/setup.php upload_settings()
// (lines 456-596): config.cfg, rclone config, private buttons config, VPN
// configs and background images are moved into place and converted with
// dos2unix, lib_setup.py migrates the config to the current version, and the
// device and hotspot passwords from the restored config are applied again.
router.post('/upload-settings', upload.single('settings'), async (req, res) => {
  const cleanupUpload = () => {
    if (req.file?.path && existsSync(req.file.path)) {
      try { unlinkSync(req.file.path); } catch { /* ignore */ }
    }
  };

  try {
    if (!req.file) {
      return res.status(400).json({ error: 'no_file' });
    }

    if (!isZipUpload(req.file)) {
      cleanupUpload();
      await showUploadErrorOnDisplay(req);
      return res.status(400).json({ error: 'not_zip' });
    }

    if (shouldUseMocks()) {
      // Nothing is extracted or moved in mock mode; report a typical archive.
      cleanupUpload();
      await execCommand(`sudo python3 ${req.WORKING_DIR}/lib_setup.py`, { logger: req.logger });
      return res.json({
        success: true,
        files: ['config.cfg', req.constants.const_RCLONE_CONFIG_FILE, req.constants.const_BUTTONS_PRIVATE_CONFIG_FILE, 'lbb/paris.jpg'],
        password: 'removed',
        wifiPasswordApplied: false,
      });
    }

    const { constants } = req;
    const targetDir = path.join(getTempDir(req.WORKING_DIR, constants), 'unzip');
    const targetZip = path.join(targetDir, 'settings.zip');

    await execCommand(`sudo rm -rf ${shellQuote(targetDir)}`, { logger: req.logger });
    mkdirSync(targetDir, { recursive: true });
    renameSync(req.file.path, targetZip);

    const unzipResult = await execCommand(`unzip -o ${shellQuote(targetZip)} -d ${shellQuote(targetDir)}`, { logger: req.logger });
    if (!unzipResult.success) {
      await execCommand(`sudo rm -rf ${shellQuote(targetDir)}`, { logger: req.logger });
      await showUploadErrorOnDisplay(req);
      return res.status(400).json({ error: 'upload_problem' });
    }
    unlinkSync(targetZip);

    const restored = [];
    const moveIntoPlace = async (fileName, destination) => {
      const source = path.join(targetDir, fileName);
      if (!existsSync(source)) return;
      const moved = await execCommand(`sudo mv -f ${shellQuote(source)} ${shellQuote(destination)}`, { logger: req.logger });
      if (moved.success) {
        restored.push(fileName);
        // dos2unix runs on the restored copy, after it has been moved into place.
        await execCommand(`sudo dos2unix ${shellQuote(destination)}`, { logger: req.logger });
      }
    };

    // Remember whether the old config had a hotspot password (setup.php:557).
    const wifiPasswordWasSet = Object.prototype.hasOwnProperty.call(
      parseConfigText(existsSync(path.join(req.WORKING_DIR, 'config.cfg')) ? readFileSync(path.join(req.WORKING_DIR, 'config.cfg'), 'utf-8') : ''),
      'conf_WIFI_PASSWORD',
    );

    await moveIntoPlace('config.cfg', path.join(req.WORKING_DIR, 'config.cfg'));
    await moveIntoPlace(constants.const_RCLONE_CONFIG_FILE, path.join(constants.const_MEDIA_DIR, constants.const_RCLONE_CONFIG_FILE));
    await moveIntoPlace(constants.const_BUTTONS_PRIVATE_CONFIG_FILE, path.join(constants.const_MEDIA_DIR, constants.const_BUTTONS_PRIVATE_CONFIG_FILE));

    for (const vpnType of VPN_TYPES) {
      const vpnDir = constants[`const_VPN_DIR_${vpnType}`];
      const vpnFile = constants[`const_VPN_FILENAME_${vpnType}`];
      if (!vpnDir || !vpnFile || !existsSync(path.join(targetDir, vpnFile))) continue;
      const destination = path.join(vpnDir, vpnFile);
      await execCommand(`sudo mkdir -p ${shellQuote(vpnDir)}`, { logger: req.logger });
      await execCommand(`sudo rm -f ${shellQuote(destination)}`, { logger: req.logger });
      await moveIntoPlace(vpnFile, destination);
      // secure VPN config files
      await execCommand(`sudo chmod 700 ${shellQuote(destination)}`, { logger: req.logger });
    }

    const bgSource = path.join(targetDir, 'bg-images');
    if (existsSync(bgSource) && statSync(bgSource).isDirectory()) {
      const bgTarget = path.join(constants.const_MEDIA_DIR, constants.const_BACKGROUND_IMAGES_DIR);
      await execCommand(`sudo mkdir -p ${shellQuote(bgTarget)}`, { logger: req.logger });
      await execCommand(`sudo chown www-data:www-data ${shellQuote(bgTarget)} -R`, { logger: req.logger });
      for (const entry of readdirSync(bgSource)) {
        const entryPath = path.join(bgSource, entry);
        if (!statSync(entryPath).isFile()) continue;
        const moved = await execCommand(`sudo mv -f ${shellQuote(entryPath)} ${shellQuote(path.join(bgTarget, entry))}`, { logger: req.logger });
        if (moved.success) restored.push(entry);
      }
      await execCommand(`sudo chown www-data:www-data ${shellQuote(bgTarget)} -R`, { logger: req.logger });
    }

    // rewrite config to the current version
    await execCommand(`sudo python3 ${req.WORKING_DIR}/lib_setup.py`, { logger: req.logger });

    await showDisplayMessage(req, [
      `:${await phpLanguageString(req, 'config_display_message_settings_uploaded_1', 'Settings')}`,
      `:${await phpLanguageString(req, 'config_display_message_settings_uploaded_2', 'imported.')}`,
    ]);

    const config = reloadConfig(req.WORKING_DIR);
    req.config = config;

    // Device password from the restored config (setup.php:567-574).
    const devicePassword = decodePassword(config.conf_PASSWORD);
    let passwordState = 'removed';
    if (devicePassword.length >= DEVICE_PASSWORD_MIN_LENGTH) {
      await runLibPassword(req, devicePassword);
      passwordState = 'set';
    } else {
      await runLibPassword(req, '');
    }

    // Hotspot password from the restored config (setup.php:576-589). An old
    // archive without conf_WIFI_PASSWORD falls back to the device password.
    const wifiValue = wifiPasswordWasSet ? config.conf_WIFI_PASSWORD : config.conf_PASSWORD;
    const wifiPassword = decodePassword(wifiValue);
    let wifiPasswordApplied = false;
    if ((config.conf_WIFI_PASSWORD_TYPE || 'static') === 'static' && (!wifiPassword || !validateWifiPassword(wifiPassword))) {
      await runLibComitupConfig(req, wifiPassword);
      wifiPasswordApplied = Boolean(wifiPassword);
    }

    await execCommand(`sudo rm -rf ${shellQuote(targetDir)}`, { logger: req.logger });

    req.logger.info(`Settings restored: ${restored.join(', ')}`);
    res.json({ success: true, files: restored, password: passwordState, wifiPasswordApplied });
  } catch (error) {
    cleanupUpload();
    req.logger.error('Failed to upload settings', { error: error.message });
    res.status(500).json({ error: 'upload_problem' });
  }
});

router.post('/exit-lbb', async (req, res) => {
  try {
    const { stopBackup } = req.body;
    
    const lockfile = getIdletimeLockfile(req.WORKING_DIR, req.constants);
    writeFileSync(lockfile, '', 'utf-8');
    
    if (stopBackup) {
      await execCommand(`sudo ${req.WORKING_DIR}/stop_backup.sh`, { logger: req.logger });
    }
    
    await execCommand('sudo pkill -f firefox', { logger: req.logger });
    
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Failed to exit LBB', { error: error.message });
    res.status(500).json({ error: 'Failed to exit LBB' });
  }
});

router.get('/display/i2c-detect', async (req, res) => {
  try {
    const result = await execCommand('sudo i2cdetect -y 1', { logger: req.logger });
    
    if (result.success) {
      res.json({ output: result.stdout || '' });
    } else {
      res.json({ output: '' });
    }
  } catch (error) {
    req.logger.error('Failed to detect I2C devices', { error: error.message });
    res.json({ output: '' });
  }
});

export default router;

