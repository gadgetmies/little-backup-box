import { getActiveMockSettings } from './mockFailures.js';
import {
  MOCK_SOCIAL_BITS,
  MOCK_SOCIAL_SERVICES,
  MOCK_SOCIAL_SERVICES_CONFIGURED,
  buildMockViewRows,
  computeMockStats,
  filterMockRows,
  sortMockRows,
} from './viewMockFixture.js';
import { classifyMedia, isGoProH265, showsLowResImageNotice } from './viewMediaKinds.js';

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
      internal: ['internal', 'nvme', 'ftp'],
      cloud: ['cloud_rsync', 'cloud:google-drive', 'cloud:dropbox'],
    },
    targetServices: {
      internal: ['internal', 'nvme'],
      usb: ['usb'],
      cloud: ['cloud_rsync', 'cloud:google-drive', 'cloud:dropbox'],
      social: ['social:telegram', 'social:matrix', 'social:mastodon'],
    },
    nvmeAvailable: true,
  },
  telegramChats: [
    { id: -1001234567890, type: 'channel', name: 'LBB Photo Channel' },
    { id: -987654321, type: 'group', name: 'Family Photos' },
    { id: 123456789, type: 'private', name: 'Jane Doe' },
  ],
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
    conf_SOCIAL_TELEGRAM_CHAT_ID: '-1001234567890',
    conf_SOCIAL_TELEGRAM_CHAT_IDENTIFIER: 'LBB Photo Channel (channel)',
    conf_SOCIAL_MATRIX_ROOM_IDENTIFIER: '#lbb-backups:matrix.org',
    conf_SOCIAL_MASTODON_TOKEN: 'mock-mastodon-token',
    conf_SOCIAL_MASTODON_BASE_URL: 'https://mastodon.social',
    // base64("lbb") — demo device password for protected commands.
    conf_PASSWORD: 'bGJi',
    conf_DISP: '1',
    conf_DISP_RESOLUTION_X: '128',
    conf_DISP_RESOLUTION_Y: '64',
    conf_POPUP_MESSAGES: 'true',
    conf_BACKGROUND_IMAGE: '',
    conf_VIRTUAL_KEYBOARD_ENABLED: 'true',
    conf_BACKUP_DEFAULT_SOURCE: 'usb',
    conf_BACKUP_DEFAULT_TARGET: 'usb',
    conf_BACKUP_DEFAULT_MOVE_FILES: 'false',
    conf_BACKUP_DEFAULT_SOURCE2: 'usb',
    conf_BACKUP_DEFAULT_TARGET2: 'cloud:dropbox',
    conf_BACKUP_DEFAULT2_MOVE_FILES: 'false',
    conf_BACKUP_TARGET_SIZE_MIN: '1073741824',
    conf_POWER_OFF_IDLE_TIME: '30',
    conf_BACKUP_CAMERA_FOLDER_MASK: 'Canon EOS R6:!/store_00020001/DCIM;iPhone_0001A4:/DCIM/*APPLE;*:/DCIM',
    conf_VIEW_WRITE_RATING_EXIF: 'true',
    conf_VIEW_CONVERT_HEIC: 'false',
    conf_LOGLEVEL: '1',
    conf_LOG_SYNC: 'true',
    conf_DIPLAY_IMAGES_KEEP: 'false',
    conf_FAN_PWM_TEMP_C: '60',
    conf_FAN_PWM_GPIO: '18',
    conf_WIFI_PASSWORD_TYPE: 'static',
    conf_WIFI_PASSWORD: 'bGl0dGxlLWJhY2t1cC1ib3gtaG90c3BvdA==',
    conf_SOCIAL_PUBLISH_DATE: 'true',
    conf_SOCIAL_PUBLISH_FILENAME: 'false',
  },
  // Device password state for the Preferences > Security tab. The password
  // itself is never part of the config sent to the client.
  passwordSet: true,
  backgroundImages: ['lbb/andromeda.jpg', 'lbb/paris.jpg', 'lbb/river-fog.jpg', 'lbb/river.jpg'],
  constants: {
    const_STORAGE_NVME_MASK: 'nvme',
    const_MEDIA_DIR: '/media',
    const_RCLONE_CONFIG_FILE: 'rclone.conf',
    const_BUTTONS_PRIVATE_CONFIG_FILE: 'buttons.cfg',
    const_IMAGE_DATABASE_FILENAME: 'images.db',
    const_MOUNTPOINT_USB_TARGET: 'usb_target',
    const_MOUNTPOINT_USB_SOURCE: 'usb_source',
    const_MOUNTPOINT_NVME_TARGET: 'nvme_target',
    const_MOUNTPOINT_NVME_SOURCE: 'nvme_source',
    const_INTERNAL_BACKUP_DIR: 'internal',
    const_VIEW_GRID_COLUMNS: '3',
    const_VIEW_MAGNIFYING_GLASS_ZOOM: '10',
    const_FILE_EXTENSIONS_LIST_WEB_IMAGES: 'jpg;jpeg;gif;png;webp',
    const_FILE_EXTENSIONS_LIST_HEIC: 'heic;heif',
    const_FILE_EXTENSIONS_LIST_RAW: '3fr;arw;dcr;dng;cr2;cr3;crw;fff;gpr;j6i;k25;kc2;kdc;mdc;mrw;nef;nrw;orf;pef;raw;raf;rw2;rwl;sr2;srf;srw;x3f',
    const_FILE_EXTENSIONS_LIST_TIF: 'tif;tiff',
    const_FILE_EXTENSIONS_LIST_VIDEO: 'avi;lrv;mp4',
    const_FILE_EXTENSIONS_LIST_AUDIO: 'mp3;wav;m4a',
    const_FILE_EXTENSIONS_LIST_TEXT: 'txt;md;html',
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

// axios has already serialised JSON bodies by the time the mock adapter runs.
function parseBody(config) {
  if (typeof config.data === 'string') {
    try {
      return JSON.parse(config.data);
    } catch {
      return {};
    }
  }
  return config.data || {};
}

function generateBackupId() {
  return Date.now();
}

// Library rows for the static mock (mutable per page load, like a real DB).
let viewRows = null;
function getViewRows() {
  if (!viewRows) viewRows = buildMockViewRows();
  return viewRows;
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
      const backupConfig = parseBody(config);
      // Like PHP (index.php:488) and the Node route, every start runs
      // stop_backup.sh first, so only one backup runs at a time.
      runningBackups = [];
      
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
      const { pid } = parseBody(config);
      
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
      // Same validation as server/routes/backup.js: backup.py only accepts
      // --SourceName thumbnails|database|exif|rename (index.php:494-541).
      const { function: func, target } = parseBody(config);
      const [functionType, combinedTarget] = String(func || '').split(/_(.*)/s);
      if (
        !['thumbnails', 'database', 'exif', 'rename'].includes(functionType) ||
        !['usb', 'internal', 'nvme'].includes(target || combinedTarget)
      ) {
        return Promise.reject({
          response: { status: 400, data: { error: `Unknown backup function: ${func}` } },
        });
      }
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
      return {
        data: {
          config: { ...mockData.config, conf_PASSWORD: '' },
          constants: mockData.constants,
          password_set: mockData.passwordSet,
        },
      };
    }

    if (url === '/config/background-images') {
      return {
        data: {
          images: mockData.backgroundImages,
          directory: `${mockData.constants.const_MEDIA_DIR}/${mockData.constants.const_BACKGROUND_IMAGES_DIR}`,
        },
      };
    }

    if (url === '/security/status') {
      return {
        data: {
          password_set: mockData.passwordSet,
          wifi_password_type: mockData.config.conf_WIFI_PASSWORD_TYPE || 'static',
        },
      };
    }

    if (url === '/security/password' && method === 'post') {
      const body = parseBody(config);
      const password = (body.password || '').trim();
      if (password !== (body.repeat || '').trim()) {
        return Promise.reject({ response: { status: 400, data: { error: 'not_identical' } } });
      }
      if (password.length < 5) {
        return Promise.reject({ response: { status: 400, data: { error: 'too_short', min: 5 } } });
      }
      mockData.passwordSet = true;
      return { data: { success: true, password_set: true } };
    }

    if (url === '/security/password/remove' && method === 'post') {
      mockData.passwordSet = false;
      return { data: { success: true, password_set: false } };
    }

    if (url === '/security/wifi-password' && method === 'post') {
      const body = parseBody(config);
      const password = (body.password || '').trim();
      if (body.type !== 'static' && body.type !== 'dynamic') {
        return Promise.reject({ response: { status: 400, data: { error: 'invalid_type' } } });
      }
      if (password && (password.length < 8 || password.length > 63 || /[^\x20-\x7e]/.test(password))) {
        return Promise.reject({ response: { status: 400, data: { error: password.length < 8 ? 'too_short' : password.length > 63 ? 'too_long' : 'not_ascii' } } });
      }
      mockData.config.conf_WIFI_PASSWORD_TYPE = body.type;
      mockData.config.conf_WIFI_PASSWORD = password ? btoa(password) : '';
      return { data: { success: true } };
    }
    
    if (url === '/config/save' && method === 'post') {
      const saveData = parseBody(config);
      const saveFailureMode = mockSettings.failureMode;
      if (saveFailureMode === 'invalid_timezone' && saveData.conf_TIME_ZONE !== undefined) {
        return Promise.reject({
          response: { status: 400, data: { error: 'Unknown timezone identifier' } },
        });
      }
      if (
        saveFailureMode === 'gpio_conflict' &&
        ('conf_MENU_BUTTON_COMBINATION' in saveData || 'conf_FAN_PWM_GPIO' in saveData)
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
      Object.assign(mockData.config, parseBody(config));
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
      const file = config.data && typeof config.data.get === 'function' ? config.data.get('settings') : null;
      if (file && file.name && !file.name.toLowerCase().endsWith('.zip')) {
        return Promise.reject({ response: { status: 400, data: { error: 'not_zip' } } });
      }
      return {
        data: {
          success: true,
          files: ['config.cfg', 'rclone.conf', 'buttons.private.cfg', 'wg0.conf', 'paris.jpg'],
          password: mockData.passwordSet ? 'set' : 'removed',
          wifiPasswordApplied: true,
        },
      };
    }
    
    // ---- Library (/view) — mirrors webapp/server/routes/view.js -------------
    if (url === '/view/media') {
      if (mockSettings.failureMode === 'not_mounted') {
        return Promise.reject({
          response: { status: 503, data: { error: 'not_mounted' } },
        });
      }
      return {
        data: {
          media: ['target_usb', 'source_usb', 'target_nvme', 'source_nvme', 'internal'],
          mounted: { target_usb: true, source_usb: true, target_nvme: false, source_nvme: false, internal: false },
          default: 'target_usb',
          nvmeAvailable: true,
        },
      };
    }

    if (url === '/view/init') {
      return { data: { success: true, dbExists: true } };
    }

    if (url === '/view/social-services') {
      return {
        data: {
          configured: [...MOCK_SOCIAL_SERVICES_CONFIGURED],
          services: [...MOCK_SOCIAL_SERVICES],
          bits: { ...MOCK_SOCIAL_BITS },
        },
      };
    }

    if (url === '/view/images') {
      if (mockSettings.failureMode === 'not_mounted') {
        return Promise.reject({
          response: { status: 503, data: { error: 'not_mounted' } },
        });
      }
      if (mockSettings.failureMode === 'no_results') {
        return { data: { images: [], count: 0, total: 0, dbExists: true } };
      }
      if (mockSettings.failureMode === 'db_not_initialised') {
        return { data: { images: [], count: 0, total: 0, dbExists: false } };
      }
      const params = config.params || {};
      const page = Math.max(1, parseInt(params.page || '1', 10));
      const perPage = Math.max(1, parseInt(params.per_page || '30', 10));
      const rows = sortMockRows(filterMockRows(getViewRows(), params), params.sort, params.dir);
      const images = rows.slice((page - 1) * perPage, page * perPage).map((r) => ({ ...r }));
      return { data: { images, count: images.length, total: rows.length, dbExists: true } };
    }

    if (url === '/view/stats') {
      return { data: computeMockStats(getViewRows(), config.params || {}) };
    }

    if (url === '/view/details') {
      const id = parseInt((config.params || {}).id, 10);
      const row = getViewRows().find((r) => r.ID === id);
      if (!row) {
        return Promise.reject({ response: { status: 404, data: { error: 'Image not found' } } });
      }
      const kind = classifyMedia(row.File_Name, mockData.constants);
      return {
        data: {
          image: { ...row },
          media: {
            kind,
            lowResImage: showsLowResImageNotice(kind),
            lowResVideo: kind === 'video' && isGoProH265(row),
          },
        },
      };
    }

    if (url === '/social/telegram/chat-id' && method === 'post') {
      return { data: { ok: true, chats: mockData.telegramChats } };
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
      const { imageId, rating, comment } = parseBody(config);
      const row = getViewRows().find((r) => r.ID === imageId);
      if (!row) {
        return Promise.reject({ response: { status: 404, data: { error: 'Image not found' } } });
      }
      const updated = {};
      if (rating !== undefined && rating !== null) {
        row.LbbRating = Number(rating);
        updated.LbbRating = row.LbbRating;
        if (mockData.config.conf_VIEW_WRITE_RATING_EXIF === 'true') {
          row.Rating = String(rating);
          updated.Rating = row.Rating;
        }
      }
      if (comment !== undefined && comment !== null) {
        row.Comment = String(comment).trim();
        updated.Comment = row.Comment;
      }
      return { data: { success: true, changed: Object.keys(updated).length > 0, updated } };
    }

    if (url === '/view/social-publish' && method === 'post') {
      const { imageId, service, publish } = parseBody(config);
      const row = getViewRows().find((r) => r.ID === imageId);
      const bit = MOCK_SOCIAL_BITS[service];
      if (!row || bit === undefined) {
        return Promise.reject({ response: { status: 400, data: { error: 'Image ID and a known service are required' } } });
      }
      row.social_publish = publish ? row.social_publish | (1 << bit) : row.social_publish & ~(1 << bit);
      return { data: { success: true, social_publish: row.social_publish, social_published: row.social_published } };
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
      const { ids } = parseBody(config);
      const idSet = new Set((ids || []).map(Number));
      const targets = getViewRows().filter((r) => idSet.has(r.ID) && r.LbbRating === -1);
      const keep = failureMode === 'partial_failure' ? targets.slice(0, 1) : [];
      const removeIds = new Set(targets.filter((r) => !keep.includes(r)).map((r) => r.ID));
      viewRows = getViewRows().filter((r) => !removeIds.has(r.ID));
      if (keep.length > 0) {
        return {
          data: { success: false, deleted: removeIds.size, error: `${keep.length} file(s) could not be deleted` },
        };
      }
      return { data: { success: true, deleted: removeIds.size } };
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
    
    if (url === '/social/matrix/token' && method === 'post') {
      const body = parseBody(config);
      if (!body.homeserver || !body.username || !body.password) {
        return Promise.reject({ response: { status: 400, data: { ok: false, error: 'missing_parameters' } } });
      }
      if (body.password === 'wrong') {
        return { data: { ok: false, error: 'invalid_credentials', status: 403 } };
      }
      const localpart = String(body.username).replace(/^@/, '').split(':')[0] || 'bot';
      let host = 'matrix.example.org';
      try {
        host = new URL(body.homeserver).hostname;
      } catch {
        // keep the example host
      }
      return {
        data: {
          ok: true,
          token: `syt_${btoa(localpart).replace(/=+$/, '')}_mockAccessToken0123456789`,
          user_id: String(body.username).startsWith('@') ? body.username : `@${localpart}:${host}`,
        },
      };
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

