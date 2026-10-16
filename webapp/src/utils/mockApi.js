import { getActiveMockSettings } from './mockFailures.js';

let runningBackups = [];
let backupHistory = [];

// Protected commands (cmd.php) — the demo device password is "lbb".
const MOCK_DEVICE_PASSWORD = 'lbb';
const MOCK_CMD_LINE_MS = 400;
let mockCmdRun = null; // { cmd, lines, startedAt }
let mockCmdLog = '';

function mockCommandLines(cmd, param1 = '', param2 = '') {
  const dev = `/dev/${param1}`;
  switch (cmd) {
    case 'fsck':
      return [
        `sudo fsck.ext4 ${param2 === 'repair' ? '-f -p ' : ''}'${dev}'`, '',
        'e2fsck 1.47.0 (5-Feb-2023)',
        'Pass 1: Checking inodes, blocks, and sizes',
        'Pass 2: Checking directory structure',
        'Pass 3: Checking directory connectivity',
        'Pass 4: Checking reference counts',
        'Pass 5: Checking group summary information',
        `${param1}: 1532/7815168 files (0.4% non-contiguous), 712345/31258368 blocks`, '',
        'FINISHED.',
      ];
    case 'format':
      return [
        `sudo mkfs (${param2}) '${dev}'`, '',
        'Creating filesystem...',
        'Writing volume boot record: done',
        'Fat table creation: done',
        'Allocation bitmap creation: done',
        'Writing root directory entry: done',
        'Synchronizing...',
        'Format complete!', '',
        `Disk ${dev}: 59.48 GiB, 63864569856 bytes, 124735488 sectors`, '',
        `NAME FSTYPE UUID`,
        `${param1} ${String(param2).toLowerCase().split(' ')[0]} 1A2B-3C4D`, '',
        'FINISHED.',
      ];
    case 'f3':
      return [
        `sudo f3probe ${param2 === 'f3probe_destructive' ? '--destructive ' : ''}--time-ops '${dev}'`, '',
        'F3 probe 8.0',
        'WARNING: Probing normally takes from a few seconds to 15 minutes, but',
        '         it can take longer. Please be patient.', '',
        `Good news: The device \`${dev}' is the real thing`, '',
        'Device geometry:',
        '\t         *Usable* size: 59.48 GB (124735488 blocks)',
        '\t        Announced size: 59.48 GB (124735488 blocks)',
        '\t                Module: 64.00 GB (2^36 Bytes)', '',
        'Probe time: 1\'13"', '',
        'FINISHED.',
      ];
    case 'update_libraw':
      return [
        "Cloning into 'LibRaw'...",
        'checking whether build environment is sane... yes',
        'make  all-am',
        '  CXX      src/libraw_la-libraw_datastream.lo',
        '  CXXLD    libraw.la',
        'Libraries have been installed in: /usr/local/lib',
        'LibRaw update finished.',
      ];
    case 'update':
    case 'update_development':
      return [
        `Downloading install-little-backup-box.sh (${cmd === 'update' ? 'main' : 'development'})`,
        'Updating package lists...',
        'Installing Little Backup Box...',
        'Little Backup Box has been updated. The device will reboot now.',
      ];
    case 'comitup_reset':
      return [
        'sudo python3 /var/www/little-backup-box/lib_comitup.py --reset', '',
        'comitup: WiFi credentials deleted, switching to hotspot mode', '',
        'FINISHED.',
      ];
    default:
      return [`${cmd} ${param1} ${param2}`.trim(), '', 'FINISHED.'];
  }
}

function mockCmdProgress() {
  if (!mockCmdRun) return { running: false, text: mockCmdLog };
  const shown = Math.floor((Date.now() - mockCmdRun.startedAt) / MOCK_CMD_LINE_MS);
  const lines = mockCmdRun.lines.slice(0, Math.min(shown, mockCmdRun.lines.length));
  const text = lines.length ? `${lines.join('\n')}\n` : '';
  if (shown > mockCmdRun.lines.length) {
    mockCmdLog = text;
    mockCmdRun = null;
    return { running: false, text };
  }
  return { running: true, text };
}

// axios has already serialised the request body to JSON when the adapter runs.
function parseMockBody(data) {
  if (!data) return {};
  if (typeof data !== 'string') return data;
  try {
    return JSON.parse(data);
  } catch {
    return {};
  }
}

function decodeMockPassword(encoded) {
  try {
    return encoded ? atob(encoded) : '';
  } catch {
    return '';
  }
}

// Emulates server/utils/commandRunner.js: password gate + background run.
function startMockCommand(body, { cmd, param1 = '', param2 = '', requiresPassword = true }) {
  if (requiresPassword) {
    const expected = decodeMockPassword(mockData.config.conf_PASSWORD);
    if (!expected) {
      return Promise.reject({
        response: { status: 403, data: { error: 'No device password has been set', code: 'password_not_set' } },
      });
    }
    if ((body?.password || '') !== expected) {
      return Promise.reject({
        response: { status: 403, data: { error: 'Invalid device password', code: 'password_invalid' } },
      });
    }
  }
  if (mockCmdProgress().running) {
    return Promise.reject({
      response: { status: 409, data: { error: 'Another command is still running', code: 'command_running' } },
    });
  }
  mockCmdRun = { cmd, param1, param2, lines: mockCommandLines(cmd, param1, param2), startedAt: Date.now() };
  return { data: { success: true, started: true } };
}

// Rendition of the device display image (const_DISPLAY_IMAGE_EXPORT_FILE)
// for the static demo; mirrors mockDisplaySvg() in server/utils/mockSystem.js.
export function mockDisplayImageUrl(statusText = '') {
  const escape = (v) => String(v).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lines = (String(statusText).trim() || 'Little Backup Box\nReady')
    .split('\n')
    .map((l) => l.replace(/^[:+-]/, '').trim())
    .slice(0, 5);
  const text = lines
    .map((line, i) => `<text x="6" y="${16 + i * 12}" font-family="monospace" font-size="10" fill="#fff">${escape(line)}</text>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="64" viewBox="0 0 128 64"><rect width="128" height="64" fill="#000"/>${text}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const mockData = {
  services: {
    sourceServices: {
      usb: ['anyusb', 'usb', 'camera'],
      internal: ['internal', 'nvme'],
      cloud: ['cloud_rsync', 'cloud:google-drive', 'cloud:dropbox'],
    },
    targetServices: {
      internal: ['internal', 'nvme'],
      usb: ['usb'],
      cloud: ['cloud_rsync', 'cloud:google-drive', 'cloud:dropbox'],
      social: ['social:telegram', 'social:matrix'],
    },
    nvmeAvailable: true,
  },
  partitions: [
    { lum: 'sda1', identifier: 'USB-DRIVE-001' },
    { lum: 'sda2', identifier: 'USB-DRIVE-002' },
    { lum: 'sdb1', identifier: 'BACKUP-DRIVE' },
    { lum: 'nvme0n1p1', identifier: 'NVME-DRIVE' },
  ],
  devices: [
    { lum: 'sda1', identifier: 'USB-DRIVE-001' },
    { lum: 'sda2', identifier: 'USB-DRIVE-002' },
    { lum: 'sdb1', identifier: 'BACKUP-DRIVE' },
    { lum: 'nvme0n1p1', identifier: 'NVME-DRIVE' },
  ],
  config: {
    conf_LANGUAGE: 'en',
    conf_THEME: 'dark',
    conf_BACKUP_MOVE_FILES: 'false',
    conf_BACKUP_RENAME_FILES: 'false',
    conf_BACKUP_GENERATE_THUMBNAILS: 'true',
    conf_BACKUP_UPDATE_EXIF: 'false',
    conf_BACKUP_CHECKSUM: 'false',
    conf_POWER_OFF: 'false',
    conf_TIME_ZONE: 'UTC',
    conf_WIFI_COUNTRY: 'US',
    conf_SOCIAL_TELEGRAM_TOKEN: 'mock-telegram-token',
    conf_SOCIAL_MASTODON_TOKEN: 'mock-mastodon-token',
    conf_SOCIAL_MASTODON_BASE_URL: 'https://mastodon.social',
    // base64("lbb") — demo device password for protected commands.
    conf_PASSWORD: 'bGJi',
    conf_DISP: '1',
    conf_DISP_RESOLUTION_X: '128',
    conf_DISP_RESOLUTION_Y: '64',
  },
  constants: {
    const_STORAGE_NVME_MASK: 'nvme',
    const_MEDIA_DIR: '/media',
    const_RCLONE_CONFIG_FILE: 'rclone.conf',
    const_BUTTONS_PRIVATE_CONFIG_FILE: 'buttons.cfg',
    const_IMAGE_DATABASE_FILENAME: 'images.db',
    const_BACKGROUND_IMAGES_DIR: 'backgrounds',
    const_SOFTWARE_BRANCH: 'main',
    const_DISPLAY_SIZE_UI_X: '200',
    const_DISPLAY_SIZE_UI_Y: '100',
  },
  systemInfo: {
    model: 'Raspberry Pi 4 Model B (Mock)',
    temp: 45.2,
    cpuusage: 25.5,
    memRam: '45.2 % * 4096 MB',
    memSwap: '12.3 % * 1024 MB',
    abnormalConditions: 'None',
  },
  diskSpace: {
    output: 'NAME\tSIZE\tFSAVAIL\tFSUSED\tFSUSE%\tMOUNTPOINT\nsda\t64G\t50G\t10G\t17%\t/media/usb_target\nsdb\t128G\t100G\t20G\t17%\t/media/usb_source\nnvme0n1\t256G\t200G\t40G\t17%\t/media/nvme_target',
  },
  devicesInfo: {
    output: 'NAME\tFSTYPE\tUUID\tMODEL\nsda\tvfat\t1234-5678\tUSB Drive\nsdb\text4\tabcd-efgh-ijkl-mnop\tBackup Drive\nnvme0n1\text4\t9876-5432-1098-7654\tNVMe SSD',
  },
  mounts: {
    mountsList: 'target_usb source_usb',
  },
  cameras: {
    cameras: [
      {
        detected: 'Canon EOS Rebel T7i usb:001,005',
        summaryModel: 'Canon_EOS_Rebel_T7i',
        model: 'Canon_EOS_Rebel_T7i',
        port: 'usb:001,005',
        serial: '12345678',
        storages: ['/store_00010001', '/store_00010002'],
      },
    ],
  },
  wifi: {
    wifi: [
      {
        interface: 'wlan0',
        info: 'wlan0     IEEE 802.11  ESSID:"MockNetwork"  Mode:Managed  Frequency:2.437 GHz',
      },
    ],
  },
  wifiCountry: {
    country: 'US',
  },
  wifiCountries: {
    countries: [
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
      { code: 'DE', name: 'Germany' },
      { code: 'FR', name: 'France' },
    ],
  },
  displayStatus: {
    status: 'Ready',
    severity: 'ready',
  },
  log: 'Little Backup Box\n2024-06-01 09:12:03 Backup usb -> usb started\n2024-06-01 09:14:47 Backup complete\n',
  deviceStates: [
    {
      lum: '/dev/sda1',
      identifier: 'USB-DRIVE-001',
      states: [
        { value: 'SMART overall-health self-assessment test result:', measured: 'PASSED' },
        { value: 'Device Model:', measured: 'Mock Drive' },
        { value: 'Serial Number:', measured: 'MOCK123456' },
        { value: 'User Capacity:', measured: '64,000,000,000 bytes' },
        { value: 'Power_On_Hours:', measured: '1234' },
      ],
    },
    {
      lum: '/dev/sdb1',
      identifier: 'BACKUP-DRIVE',
      states: [
        { value: 'Device Model:', measured: 'Backup Drive' },
        { value: 'Serial Number:', measured: 'BKP-998877' },
        { value: 'SMART support is:', measured: 'Unavailable - device lacks SMART capability.' },
      ],
    },
  ],
  viewImages: {
    images: [
      {
        ID: 1,
        File_Name: 'IMG_001.jpg',
        Directory: '2024/01',
        Create_Date: '2024-01-01',
        thumbnail_path: '/img/unknown.JPG',
        rating: -1,
        comment: 'Blurry shot',
        Camera_Model_Name: 'Canon EOS R5',
        File_Type: 'JPEG',
        publish_telegram: false,
        publish_mastodon: false,
      },
      {
        ID: 2,
        File_Name: 'IMG_002.jpg',
        Directory: '2024/01',
        Create_Date: '2024-01-05',
        thumbnail_path: '/img/unknown.JPG',
        rating: 0,
        comment: '',
        Camera_Model_Name: 'Canon EOS R5',
        File_Type: 'JPEG',
        publish_telegram: false,
        publish_mastodon: false,
      },
      {
        ID: 3,
        File_Name: 'IMG_003.jpg',
        Directory: '2024/01',
        Create_Date: '2024-01-10',
        thumbnail_path: '/img/unknown.JPG',
        rating: 3,
        comment: 'Nice composition',
        Camera_Model_Name: 'Fujifilm X-T5',
        File_Type: 'JPEG',
        publish_telegram: true,
        publish_mastodon: false,
      },
      {
        ID: 4,
        File_Name: 'IMG_004.RAF',
        Directory: '2024/01',
        Create_Date: '2024-01-15',
        thumbnail_path: '/img/unknown.JPG',
        rating: 5,
        comment: 'Best shot of the day',
        Camera_Model_Name: 'Fujifilm X-T5',
        File_Type: 'RAF',
        publish_telegram: false,
        publish_mastodon: true,
      },
      {
        ID: 5,
        File_Name: 'IMG_005.jpg',
        Directory: '2024/02',
        Create_Date: '2024-02-01',
        thumbnail_path: '/img/unknown.JPG',
        rating: 1,
        comment: '',
        Camera_Model_Name: 'Canon EOS R5',
        File_Type: 'JPEG',
        publish_telegram: false,
        publish_mastodon: false,
      },
      {
        ID: 6,
        File_Name: 'IMG_006.jpg',
        Directory: '2024/02',
        Create_Date: '2024-02-05',
        thumbnail_path: '/img/unknown.JPG',
        rating: -1,
        comment: 'Out of focus',
        Camera_Model_Name: 'Fujifilm X-T5',
        File_Type: 'JPEG',
        publish_telegram: false,
        publish_mastodon: false,
      },
    ],
    count: 6,
  },
  viewStats: {
    imagesAll: 4,
    directories: ['2024/01', '2024/02'],
    ratings: [
      { LbbRating: -1, count: 1 },
      { LbbRating: 0, count: 1 },
      { LbbRating: 3, count: 1 },
      { LbbRating: 5, count: 1 },
    ],
    dates: ['2024-01-15', '2024-01-16', '2024-02-10', '2024-02-11'],
    fileTypes: ['JPEG', 'RAF'],
    fileTypeExtensions: ['jpg', 'RAF'],
    cameraModelNames: ['Canon EOS R5', 'Fujifilm X-T5'],
  },
};

function delay(ms = 100) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function resolveDisplayStatus() {
  // Reads MockControls' display-status setting from localStorage. Mirrors the
  // backend severity rule (ready when status is empty or === "Ready", else info).
  let mode = 'ready';
  let custom = '';
  try {
    const raw = typeof window !== 'undefined' && window.localStorage.getItem('lbb-mock-controls');
    if (raw) {
      const parsed = JSON.parse(raw);
      const ds = parsed && parsed.displayStatus;
      if (ds && ['ready', 'info', 'custom'].includes(ds.mode)) mode = ds.mode;
      if (ds && typeof ds.custom === 'string') custom = ds.custom;
    }
  } catch {
    // localStorage unavailable or malformed; fall through to defaults.
  }
  let status;
  if (mode === 'ready') status = 'Ready';
  else if (mode === 'info') status = 'Working';
  else status = (custom || '').trim();
  const severity = status === '' || status === 'Ready' ? 'ready' : 'info';
  return { status, severity };
}

function generateBackupId() {
  return Date.now();
}

export function createMockApiInterceptor() {
  return async (config) => {
    // Match on the pathname: callers such as DeviceSelector put the query in
    // the URL itself (`/tools/devices?…`).
    const url = (config.url || '').split('?')[0];
    const method = config.method?.toLowerCase() || 'get';

    // Apply configurable delay and failure mode from MockControls
    const mockSettings = getActiveMockSettings();
    const totalDelay = 50 + (mockSettings.delay || 0);
    await delay(totalDelay);
    
    if (url === '/backup/services') {
      return { data: mockData.services };
    }
    
    if (url === '/backup/partitions') {
      return { data: { partitions: mockData.partitions } };
    }
    
    if (url === '/backup/running') {
      return { data: { backups: runningBackups } };
    }
    
    if (url === '/backup/history') {
      return { data: { history: backupHistory.slice(0, 5) } };
    }
    
    if (url === '/backup/start' && method === 'post') {
      const backupConfig = config.data;
      const existingBackup = runningBackups.find(
        b => b.sourceDevice === backupConfig.sourceDevice &&
        b.targetDevice === backupConfig.targetDevice &&
        (b.presetSource || '') === (backupConfig.presetSource || '') &&
        (b.presetTarget || '') === (backupConfig.presetTarget || '')
      );
      
      if (existingBackup) {
        return Promise.reject({
          response: {
            status: 409,
            data: {
              error: 'A backup with this configuration is already running',
              alreadyRunning: true,
            },
          },
        });
      }
      
      const newBackup = {
        pid: generateBackupId(),
        ...backupConfig,
        timestamp: new Date().toISOString(),
      };
      
      runningBackups.push(newBackup);
      
      const historyEntry = {
        ...backupConfig,
        timestamp: new Date().toISOString(),
      };
      backupHistory.unshift(historyEntry);
      if (backupHistory.length > 100) {
        backupHistory.splice(100);
      }
      
      return { data: { success: true, message: `Backup ${backupConfig.sourceDevice} to ${backupConfig.targetDevice} initiated (mock)` } };
    }
    
    if (url === '/backup/stop' && method === 'post') {
      const { pid } = config.data || {};
      
      if (pid) {
        const index = runningBackups.findIndex(b => b.pid === pid);
        if (index !== -1) {
          runningBackups.splice(index, 1);
          return { data: { success: true, message: `Backup stopped (PID: ${pid})` } };
        }
        return Promise.reject({
          response: {
            status: 404,
            data: { error: 'Backup not found' },
          },
        });
      } else {
        const count = runningBackups.length;
        runningBackups = [];
        return { data: { success: true, message: `All backups stopped (${count} backups)` } };
      }
    }
    
    if (url === '/backup/function' && method === 'post') {
      const failureMode = mockSettings.failureMode;
      if (failureMode === 'disk_full') {
        return Promise.reject({
          response: { status: 500, data: { error: 'Not enough disk space' } },
        });
      }
      if (failureMode === 'db_locked') {
        return Promise.reject({
          response: { status: 500, data: { error: 'Database is locked' } },
        });
      }
      if (failureMode === 'permission_denied') {
        return Promise.reject({
          response: { status: 500, data: { error: 'Permission denied' } },
        });
      }
      if (failureMode === 'partial_failure') {
        return { data: { success: true, warnings: ['Some files could not be processed'] } };
      }
      return { data: { success: true, message: 'Backup function initiated (mock)' } };
    }
    
    if (url === '/config/button-actions') {
      return {
        data: {
          actions: ['backup_start', 'backup_stop', 'view_next', 'view_prev', 'shutdown', 'reboot'],
        },
      };
    }

    if (url === '/config' || url === '/config/') {
      return { data: { config: mockData.config, constants: mockData.constants } };
    }
    
    if (url === '/config/save' && method === 'post') {
      const saveData = config.data || {};
      const saveFailureMode = mockSettings.failureMode;
      if (saveFailureMode === 'invalid_timezone' && saveData.conf_timezone !== undefined) {
        return Promise.reject({
          response: { status: 400, data: { error: 'Unknown timezone identifier' } },
        });
      }
      if (
        saveFailureMode === 'gpio_conflict' &&
        ('conf_MENU_BUTTON_COMBINATION' in saveData || 'conf_FAN_GPIO_PIN' in saveData)
      ) {
        return Promise.reject({
          response: { status: 422, data: { error: 'GPIO pin already in use' } },
        });
      }
      Object.assign(mockData.config, saveData);
      return { data: { success: true } };
    }
    
    if (url === '/sysinfo/system') {
      return { data: mockData.systemInfo };
    }
    
    if (url === '/sysinfo/diskspace') {
      return { data: mockData.diskSpace };
    }
    
    if (url === '/sysinfo/devices') {
      return { data: mockData.devicesInfo };
    }
    
    if (url === '/sysinfo/device-states') {
      return { data: { deviceStates: mockData.deviceStates } };
    }
    
    if (url === '/sysinfo/cameras') {
      return { data: mockData.cameras };
    }
    
    if (url === '/sysinfo/wifi') {
      return { data: mockData.wifi };
    }
    
    if (url === '/tools/mounts') {
      return { data: mockData.mounts };
    }
    
    if (url === '/tools/devices') {
      return { data: { devices: mockData.devices } };
    }
    
    if (url === '/tools/mount' && method === 'post') {
      return { data: { success: true } };
    }
    
    if (url === '/tools/umount' && method === 'post') {
      return { data: { success: true } };
    }

    if (url === '/tools/mountable-storages') {
      return {
        data: {
          mountableStorages: ['usb', 'nvme', 'cloud:google-drive', 'cloud:dropbox'],
          nvmeAvailable: true,
          cloudServices: ['google-drive', 'dropbox'],
        },
      };
    }

    if (url === '/tools/fsck/check' && method === 'post') {
      const body = parseMockBody(config.data);
      return startMockCommand(body, { cmd: 'fsck', param1: body.partition, param2: 'check', requiresPassword: false });
    }

    if (url === '/tools/fsck/repair' && method === 'post') {
      const body = parseMockBody(config.data);
      return startMockCommand(body, { cmd: 'fsck', param1: body.partition, param2: 'repair' });
    }

    if (url === '/tools/format' && method === 'post') {
      const body = parseMockBody(config.data);
      return startMockCommand(body, { cmd: 'format', param1: body.partition, param2: body.fstype });
    }

    if (url === '/tools/f3' && method === 'post') {
      const body = parseMockBody(config.data);
      return startMockCommand(body, { cmd: 'f3', param1: body.device, param2: body.action });
    }

    if (url === '/cmd/status') {
      const progress = mockCmdProgress();
      const c = mockData.config;
      const mailConfigured = ['conf_SMTP_SERVER', 'conf_SMTP_PORT', 'conf_MAIL_SECURITY', 'conf_MAIL_USER',
        'conf_MAIL_PASSWORD', 'conf_MAIL_FROM', 'conf_MAIL_TO'].every((k) => String(c[k] ?? '').length > 0);
      return {
        data: {
          passwordSet: decodeMockPassword(c.conf_PASSWORD) !== '',
          mailConfigured,
          running: progress.running,
          command: progress.running && mockCmdRun
            ? { cmd: mockCmdRun.cmd, param1: mockCmdRun.param1, param2: mockCmdRun.param2 }
            : null,
          demoPassword: decodeMockPassword(c.conf_PASSWORD) === MOCK_DEVICE_PASSWORD ? MOCK_DEVICE_PASSWORD : null,
        },
      };
    }

    if (url === '/cmd/shell-status') {
      return { data: { updateAvailable: true, comitupInstalled: true, comitupHotspotActive: true } };
    }
    
    if (url === '/setup/wifi-country') {
      return { data: mockData.wifiCountry };
    }
    
    if (url === '/setup/wifi-countries') {
      return { data: mockData.wifiCountries };
    }
    
    if (url === '/setup/save' && method === 'post') {
      Object.assign(mockData.config, config.data);
      return { data: { success: true } };
    }
    
    if (url === '/setup/test-mail' && method === 'post') {
      return { data: { success: true, message: 'Test mail sent (mock)' } };
    }
    
    if (url === '/setup/update-check') {
      return { data: { updateAvailable: true } };
    }
    
    if (url === '/setup/update/status') {
      return {
        data: {
          branch: 'main',
          installedVersion: '2024-01-01',
          availableVersion: '2024-01-01',
        },
      };
    }
    
    if (url === '/setup/update/install' && method === 'post') {
      const body = parseMockBody(config.data);
      return startMockCommand(body, { cmd: body.branch === 'development' ? 'update_development' : 'update' });
    }
    
    if (url === '/setup/download-settings') {
      return Promise.reject({
        response: {
          status: 404,
          data: { error: 'Mock API: File download not supported' },
        },
      });
    }
    
    if (url === '/setup/upload-settings' && method === 'post') {
      return { data: { success: true, message: 'Settings uploaded (mock)' } };
    }
    
    if (url === '/view/image') {
      const params = config.params || {};
      if (params.id === 'missing') {
        return Promise.reject({
          response: {
            status: 404,
            data: { error: 'file_missing' },
          },
        });
      }
      return {
        data: { url: `https://placehold.co/800x600/333/fff?text=Full+Resolution+${params.id || ''}` },
      };
    }

    if (url === '/view/init') {
      return { data: { success: true } };
    }

    if (url === '/view/media') {
      if (mockSettings.failureMode === 'not_mounted') {
        return Promise.reject({
          response: { status: 503, data: { error: 'not_mounted' } },
        });
      }
      return {
        data: {
          media: ['usb', 'nvme', 'internal'],
          available: { usb: true, nvme: false, internal: true },
        },
      };
    }

    if (url === '/view/images') {
      if (mockSettings.failureMode === 'not_mounted') {
        return Promise.reject({
          response: { status: 503, data: { error: 'not_mounted' } },
        });
      }

      const params = config.params || {};
      const medium = params.medium;

      // Legacy storagePath-based mock
      if (!medium) {
        return { data: mockData.viewImages };
      }

      if (mockSettings.failureMode === 'no_results') {
        return { data: { images: [], total: 0, dbExists: true } };
      }
      if (mockSettings.failureMode === 'db_not_initialised') {
        return { data: { images: [], total: 0, dbExists: false } };
      }

      const TOTAL = 120;
      const page = parseInt(params.page || '1', 10);
      const perPage = parseInt(params.per_page || '25', 10);
      const cameras = ['Canon EOS R5', 'Fujifilm X-T5', 'Nikon Z7 II'];
      const fileTypes = ['JPEG', 'RAF', 'NEF', 'MP4'];
      const fileExtensions = ['JPG', 'RAF', 'NEF', 'MP4'];
      const directories = ['DCIM/100EOS5D', 'DCIM/101EOS5D', 'PRIVATE/M4ROOT/CLIP', 'VIDEO'];
      // Mirrors webapp/server/utils/socialServiceBits.js. Keep in sync.
      const SOCIAL_BITS = { telegram: 0, mastodon: 1, bluesky: 2, matrix: 3 };
      const SERVICE_NAMES = Object.keys(SOCIAL_BITS);

      let allImages = [];
      for (let i = 0; i < TOTAL; i++) {
        const id = i + 1;
        const ftIdx = i % fileTypes.length;
        const ext = fileExtensions[ftIdx];
        const filename = `IMG_${String(id).padStart(4, '0')}.${ext}`;
        const dir = directories[i % directories.length];
        const publishService = i % 3 === 0 ? SERVICE_NAMES[i % SERVICE_NAMES.length] : null;
        const publishedService = i % 7 === 0 ? SERVICE_NAMES[i % SERVICE_NAMES.length] : null;
        allImages.push({
          ID: id,
          File_Name: filename,
          Directory: dir,
          Create_Date: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
          thumbnail_path: `/thumbnails/${medium}/${filename}`,
          rating: id % 7 === 0 ? -1 : id % 6 === 0 ? 5 : id % 5 === 0 ? 3 : 0,
          LbbRating: id % 7 === 0 ? -1 : id % 6 === 0 ? 5 : id % 5 === 0 ? 3 : 0,
          comment: '',
          Camera_Model_Name: cameras[i % cameras.length],
          File_Type: fileTypes[ftIdx],
          File_Type_Extension: ext,
          social_publish: publishService ? 1 << SOCIAL_BITS[publishService] : 0,
          social_published: publishedService ? 1 << SOCIAL_BITS[publishedService] : 0,
        });
      }

      // Apply filters — mirrors the SQL builder in webapp/server/routes/view.js.
      if (params.rating) {
        const ratingValues = params.rating.split(',').map((r) => parseInt(r, 10));
        allImages = allImages.filter((img) => ratingValues.includes(img.LbbRating));
      }
      if (params.date_from) allImages = allImages.filter((img) => img.Create_Date >= params.date_from);
      if (params.date_to) allImages = allImages.filter((img) => img.Create_Date <= params.date_to);
      if (params.filename) {
        const fn = params.filename.toLowerCase();
        allImages = allImages.filter((img) => img.File_Name.toLowerCase().includes(fn));
      }
      if (params.camera) allImages = allImages.filter((img) => img.Camera_Model_Name === params.camera);
      if (params.file_type) {
        const ftValues = params.file_type.split(',').map((f) => f.trim());
        allImages = allImages.filter((img) => ftValues.includes(img.File_Type));
      }
      if (params.directory) {
        allImages = allImages.filter((img) => img.Directory === params.directory);
      }
      if (params.extension) {
        const extValues = params.extension.split(',').map((e) => e.trim());
        allImages = allImages.filter((img) => extValues.includes(img.File_Type_Extension));
      }
      if (params.social_publish) {
        const masks = params.social_publish.split(',').map((s) => 1 << SOCIAL_BITS[s.trim()]).filter((m) => !Number.isNaN(m));
        allImages = allImages.filter((img) => masks.some((m) => (img.social_publish & m) !== 0));
      }
      if (params.social_published) {
        const masks = params.social_published.split(',').map((s) => 1 << SOCIAL_BITS[s.trim()]).filter((m) => !Number.isNaN(m));
        allImages = allImages.filter((img) => masks.some((m) => (img.social_published & m) !== 0));
      }

      const total = allImages.length;
      const start = (page - 1) * perPage;
      const images = allImages.slice(start, start + perPage);

      return { data: { images, total, dbExists: true } };
    }


    if (url === '/view/stats') {
      const params = config.params || {};
      const medium = params.medium;
      // Legacy storagePath-based callers get the static fixture.
      if (!medium) {
        return { data: mockData.viewStats };
      }
      // Counts that mirror the medium-based generator above (TOTAL=120, every
      // 3rd marked-for-publish, every 7th already-published, rotating service).
      const SERVICE_NAMES = ['telegram', 'mastodon', 'bluesky', 'matrix'];
      const buildCounts = (modulo) => {
        const counts = Object.fromEntries(SERVICE_NAMES.map((s) => [s, 0]));
        for (let i = 0; i < 120; i++) {
          if (i % modulo === 0) counts[SERVICE_NAMES[i % SERVICE_NAMES.length]] += 1;
        }
        return SERVICE_NAMES.map((service) => ({ service, count: counts[service] }));
      };
      return {
        data: {
          ...mockData.viewStats,
          directories: ['DCIM/100EOS5D', 'DCIM/101EOS5D', 'PRIVATE/M4ROOT/CLIP', 'VIDEO'],
          fileTypes: ['JPEG', 'RAF', 'NEF', 'MP4'],
          fileTypeExtensions: ['JPG', 'RAF', 'NEF', 'MP4'],
          cameraModelNames: ['Canon EOS R5', 'Fujifilm X-T5', 'Nikon Z7 II'],
          socialPublishPending: buildCounts(3),
          socialPublished: buildCounts(7),
        },
      };
    }

    if (url === '/social/publish' && method === 'post') {
      const { platforms } = config.data || {};
      const results = {};
      if (Array.isArray(platforms)) {
        platforms.forEach((p) => {
          results[p] = true;
        });
      }
      return { data: { success: true, results } };
    }
    
    if (url === '/view/update-metadata' && method === 'post') {
      return { data: { success: true } };
    }

    if (url === '/view/delete-image' && method === 'post') {
      return { data: { success: true } };
    }

    if (url === '/view/rating' && method === 'post') {
      const failureMode = mockSettings.failureMode;
      if (failureMode === 'db_locked') {
        return Promise.reject({
          response: {
            status: 500,
            data: { error: 'DB locked by another process' },
          },
        });
      }
      if (failureMode === 'permission_denied') {
        return Promise.reject({
          response: {
            status: 500,
            data: { error: 'EXIF write failed: file is read-only' },
          },
        });
      }
      const { imageId, rating, comment } = config.data || {};
      const img = mockData.viewImages.images.find(i => i.ID === imageId);
      if (img) {
        if (rating !== undefined) img.rating = rating;
        if (comment !== undefined) img.comment = comment;
      }
      return { data: { success: true } };
    }

    if (url === '/view/delete-rejected' && method === 'post') {
      const failureMode = mockSettings.failureMode;
      if (failureMode === 'db_locked') {
        return Promise.reject({
          response: {
            status: 500,
            data: { error: 'DB locked' },
          },
        });
      }
      if (failureMode === 'partial_failure') {
        mockData.viewImages.images = mockData.viewImages.images.filter(
          i => i.rating !== -1
        );
        mockData.viewImages.count = mockData.viewImages.images.length;
        return {
          data: { success: false, deleted: 2, error: '1 file could not be deleted' },
        };
      }
      const rejectedCount = mockData.viewImages.images.filter(i => i.rating === -1).length;
      mockData.viewImages.images = mockData.viewImages.images.filter(
        i => i.rating !== -1
      );
      mockData.viewImages.count = mockData.viewImages.images.length;
      return { data: { success: true, deleted: rejectedCount } };
    }
    
    if (url === '/display/status') {
      return { data: resolveDisplayStatus() };
    }
    
    if (url === '/log' || url === '/log/') {
      const file = config.params?.file || 'main';
      if (file === 'cmd') return { data: mockCmdProgress().text };
      if (file === 'main') return { data: mockData.log };
      return Promise.reject({ response: { status: 400, data: { error: 'Unknown log file' } } });
    }

    if ((url === '/log/clear' || url === '/log/delete') && method === 'post') {
      const body = parseMockBody(config.data);
      if ((body.file || 'main') === 'cmd') {
        mockCmdRun = null;
        mockCmdLog = 'Little Backup Box\n';
      } else {
        mockData.log = 'Little Backup Box\n';
      }
      return { data: { success: true } };
    }
    
    
    if (url === '/cloud/remotes') {
      return { data: { remotes: ['Dropbox', 'Google Drive'] } };
    }

    if (url === '/setup/update/libraw' && method === 'post') {
      const body = parseMockBody(config.data);
      return startMockCommand(body, { cmd: 'update_libraw' });
    }

    if (url === '/network/comitup/reset' && method === 'post') {
      const body = parseMockBody(config.data);
      return startMockCommand(body, { cmd: 'comitup_reset' });
    }

    if (url === '/network/wifi/info') {
      return {
        data: {
          interface: 'wlan0',
          ssid: 'HomeNetwork',
          frequency: 5.18,
          signal_level: -52,
          bit_rate: 300,
          connected: true,
        },
      };
    }

    if (url === '/system') {
      return { data: { useMocks: true, platform: 'mock' } };
    }
    
    return Promise.reject({
      response: {
        status: 404,
        data: { error: 'Mock API: Endpoint not found' },
      },
    });
  };
}

