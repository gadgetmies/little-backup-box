import express from 'express';
import { execCommand } from '../utils/execCommand.js';
import path from 'path';
import { shouldMock } from '../utils/mockSystem.js';
import {
  cleanArgument,
  displayCommand,
  getCurrentConfig,
  isMailConfigured,
  normalizeDevice,
  requireDevicePassword,
  runInBackground,
  serverT,
  shellQuote,
} from '../utils/commandRunner.js';

const router = express.Router();

async function checkNVMeAvailable(req) {
  try {
    const command = `sudo python3 ${req.WORKING_DIR}/lib_storage.py --Action get_available_partitions --skipMounted False --ignore-fs False`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (!result.success) return false;
    
    const partitions = result.stdout.trim().split('\n');
    return partitions.some(p => p.startsWith(`/dev/${req.constants.const_STORAGE_NVME_MASK}`));
  } catch (error) {
    return false;
  }
}

async function getCloudServices(req) {
  try {
    const rcloneConfig = path.join(req.constants.const_MEDIA_DIR, req.constants.const_RCLONE_CONFIG_FILE);
    const command = `sudo rclone config show --config "${rcloneConfig}" | grep '^\\[.*\\]$' | sed 's/^\\[//' | sed 's/\\]$//'`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (!result.success) return [];
    
    return result.stdout
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\[|\]$/g, ''));
  } catch (error) {
    return [];
  }
}

router.get('/mounts', async (req, res) => {
  try {
    const command = `sudo python3 ${req.WORKING_DIR}/lib_storage.py --Action get_mounts_list`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to get mounts' });
    }
    
    res.json({ mountsList: result.stdout });
  } catch (error) {
    req.logger.error('Failed to get mounts', { error: error.message });
    res.status(500).json({ error: 'Failed to get mounts' });
  }
});

router.get('/devices', async (req, res) => {
  try {
    const { storageType = '', listPartitions = true, skipMounted = false, ignoreFs = false } = req.query;
    
    const storageTypeArg = storageType ? `--StorageName ${storageType}` : '';
    const action = listPartitions === 'true' ? 'get_available_partitions' : 'get_available_devices';
    const skipMountedArg = skipMounted === 'true' ? 'True' : 'False';
    const ignoreFsArg = ignoreFs === 'true' ? 'True' : 'False';
    
    const command = `sudo python3 ${req.WORKING_DIR}/lib_storage.py --Action ${action} ${storageTypeArg} --skipMounted ${skipMountedArg} --ignore-fs ${ignoreFsArg}`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to get devices' });
    }
    
    const devices = result.stdout
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        if (line.includes(':')) {
          const [lum, ...identifierParts] = line.split(': ');
          return {
            lum: lum.replace('/dev/', ''),
            identifier: identifierParts.join(': '),
          };
        }
        return {
          lum: line.replace('/dev/', ''),
          identifier: '',
        };
      });
    
    res.json({ devices });
  } catch (error) {
    req.logger.error('Failed to get devices', { error: error.message });
    res.status(500).json({ error: 'Failed to get devices' });
  }
});

router.post('/mount', async (req, res) => {
  try {
    const { role, storage, deviceIdentifierPreset } = req.body;
    
    const command = `sudo python3 ${req.WORKING_DIR}/lib_storage.py --Action mount --StorageName ${storage} --Role ${role} --DeviceIdentifierPresetThis '${deviceIdentifierPreset || ''}'`;
    
    await execCommand(`python3 ${req.WORKING_DIR}/lib_log.py 'execute' '' "${command}" '1'`, { logger: req.logger });
    
    req.logger.info(`Mount: ${role} ${storage}`);
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Failed to mount', { error: error.message });
    res.status(500).json({ error: 'Failed to mount' });
  }
});

router.post('/umount', async (req, res) => {
  try {
    const { role, storage } = req.body;
    
    const command = `sudo python3 ${req.WORKING_DIR}/lib_storage.py --Action umount --StorageName ${storage} --Role ${role}`;
    
    await execCommand(`python3 ${req.WORKING_DIR}/lib_log.py 'execute' '' '${command}' '1'`, { logger: req.logger });
    
    req.logger.info(`Umount: ${role} ${storage}`);
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Failed to umount', { error: error.message });
    res.status(500).json({ error: 'Failed to umount' });
  }
});

router.get('/mountable-storages', async (req, res) => {
  try {
    const NVMe_available = await checkNVMeAvailable(req);
    const CloudServices = await getCloudServices(req);
    
    const LocalServices = ['usb'];
    if (NVMe_available) {
      LocalServices.push('nvme');
    }
    
    const CloudServices_marked = CloudServices.map(s => `cloud:${s}`);
    const MountableStorages = [...LocalServices, ...CloudServices_marked];
    
    res.json({ 
      mountableStorages: MountableStorages,
      nvmeAvailable: NVMe_available,
      cloudServices: CloudServices
    });
  } catch (error) {
    req.logger.error('Failed to get mountable storages', { error: error.message });
    res.status(500).json({ error: 'Failed to get mountable storages' });
  }
});

// Format options accepted by cmd.php:342-490 → [mkfs command, fsck command].
const FORMAT_COMMANDS = {
  FAT32: ['mkfs.vfat -v -I -F32', 'fsck'],
  exFAT: ['mkfs.exfat', 'fsck'],
  'NTFS (compression enabled)': ['mkfs.ntfs --enable-compression --force --verbose', 'fsck'],
  'NTFS (no compression)': ['mkfs.ntfs --force --verbose', 'fsck'],
  Ext4: ['mkfs.ext4 -v -F', 'fsck'],
  Ext3: ['mkfs.ext3 -v -F', 'fsck'],
  'HFS Plus': ['mkfs.hfsplus', 'fsck.hfsplus'],
  HFS: ['mkfs.hfs', 'fsck.hfs'],
};

const F3_COMMANDS = {
  f3probe_non_destructive: ['f3probe --time-ops', 'cmd.box.f3_probe_non_destructive'],
  f3probe_destructive: ['f3probe --destructive --time-ops', 'cmd.box.f3_probe_destructive'],
};

// Build the command line exactly like cmd.php exec_command(): steps are joined
// with ';' so the FINISHED line and the display stop message always run, and
// every display line is a single ':<text>' argument (lib_display.py:161).
async function buildCommandLine(req, config, cmd, device, param2) {
  const WD = req.WORKING_DIR;
  const tr = (key) => serverT(config, key);
  const devicePath = shellQuote(`/dev/${device}`);
  const p2 = cleanArgument(param2, [' ']);
  const steps = [];

  switch (cmd) {
    case 'fsck': {
      // cmd.php:316-318 — detect the filesystem type of the partition.
      const detect = await execCommand(
        `sudo lsblk -p -P -o PATH,MOUNTPOINT,UUID,FSTYPE | grep ${shellQuote(`/dev/${device}`)}`,
        { logger: req.logger },
      );
      const match = (detect.stdout || '').match(/FSTYPE="([^"]*)"/);
      const fstype = cleanArgument(match ? match[1] : '');
      if (!fstype && !shouldMock()) {
        const err = new Error('Could not detect filesystem type');
        err.status = 400;
        throw err;
      }
      const fsckBin = `fsck.${fstype || 'ext4'}`;
      let main;
      if (param2 === 'repair') {
        main = fstype === 'exfat' ? `${fsckBin} -p ${devicePath}` : `${fsckBin} -f -p ${devicePath}`;
      } else {
        main = `${fsckBin} ${devicePath}`;
      }
      steps.push(displayCommand(WD, [tr('cmd.box.fsck_start1'), tr('cmd.box.fsck_start2'), p2]));
      steps.push(`echo ${shellQuote(`sudo ${main}`)}`, "echo ''", `sudo ${main}`, "echo ''", "echo 'FINISHED.'");
      steps.push(displayCommand(WD, [tr('cmd.box.fsck_stop1'), tr('cmd.box.fsck_stop2'), p2]));
      break;
    }

    case 'format': {
      const entry = FORMAT_COMMANDS[param2];
      if (!entry) {
        const err = new Error('Invalid format type');
        err.status = 400;
        throw err;
      }
      const [mkfs, fsckBin] = entry;
      const main = `${mkfs} ${devicePath}`;
      const label = `${device}: ${p2}`;
      steps.push(displayCommand(WD, [tr('cmd.box.format_start1'), label, tr('cmd.box.format_start2')]));
      steps.push(
        `echo ${shellQuote(`sudo ${main}`)}`, "echo ''",
        `sudo ${main}`, "echo ''",
        `sudo fdisk -l ${devicePath}`, "echo ''",
        `lsblk -f ${devicePath}`, "echo ''",
        `sudo ${fsckBin} ${devicePath}`, "echo ''",
        "echo 'FINISHED.'",
      );
      steps.push(displayCommand(WD, [tr('cmd.box.format_stop1'), label, tr('cmd.box.format_stop2')]));
      break;
    }

    case 'f3': {
      const entry = F3_COMMANDS[param2];
      if (!entry) {
        const err = new Error('Invalid f3 action');
        err.status = 400;
        throw err;
      }
      const [probe, descKey] = entry;
      const main = `${probe} ${devicePath}`;
      const label = `${device}: ${tr(descKey)}`;
      steps.push(displayCommand(WD, [tr('cmd.box.f3_probe_start1'), label, tr('cmd.box.f3_probe_start2')]));
      steps.push(`echo ${shellQuote(`sudo ${main}`)}`, "echo ''", `sudo ${main}`, "echo ''", "echo 'FINISHED.'");
      steps.push(displayCommand(WD, [tr('cmd.box.f3_probe_stop1'), label, tr('cmd.box.f3_probe_stop2')]));
      break;
    }

    default: {
      const err = new Error('Unknown command');
      err.status = 400;
      throw err;
    }
  }

  return steps.join(';');
}

// Shared handler for the cmd.php commands exposed on the Storage page.
function storageCommandHandler(cmd, { deviceField, param2Of }) {
  return async (req, res) => {
    try {
      const device = normalizeDevice(req.body?.[deviceField]);
      const param2 = param2Of(req.body || {});
      if (!device || !param2 || param2 === '-') {
        return res.status(400).json({ error: 'Invalid parameters' });
      }

      const config = req.currentConfig || getCurrentConfig(req);
      const commandLine = await buildCommandLine(req, config, cmd, device, param2);
      const mail = req.body?.mailResult === true && isMailConfigured(config);

      // tools.php:286-317 logs the request to the main log before redirecting.
      await execCommand(
        `python3 ${req.WORKING_DIR}/lib_log.py 'message' ${shellQuote(`${cmd} ${device} ${param2}`)} '1'`,
        { logger: req.logger },
      );
      runInBackground(req, { cmd, param1: device, param2, commandLine, mail });

      req.logger.info(`${cmd}: ${device} ${param2}`);
      res.json({ success: true, started: true });
    } catch (error) {
      if (error.code === 'command_running') {
        return res.status(409).json({ error: error.message, code: error.code });
      }
      req.logger.error(`Failed to execute ${cmd}`, { error: error.message });
      res.status(error.status || 500).json({ error: error.message || `Failed to execute ${cmd}` });
    }
  };
}

// cmd.php:123-129 — check is unprotected, repair needs the device password.
router.post('/fsck/check', storageCommandHandler('fsck', { deviceField: 'partition', param2Of: () => 'check' }));
router.post(
  '/fsck/repair',
  requireDevicePassword,
  storageCommandHandler('fsck', { deviceField: 'partition', param2Of: () => 'repair' }),
);
router.post(
  '/format',
  requireDevicePassword,
  storageCommandHandler('format', { deviceField: 'partition', param2Of: (b) => b.fstype }),
);
router.post(
  '/f3',
  requireDevicePassword,
  storageCommandHandler('f3', { deviceField: 'device', param2Of: (b) => b.action }),
);

export default router;
