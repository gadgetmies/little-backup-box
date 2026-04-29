let runningBackups = [];
let backupHistory = [];

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
  },
  constants: {
    const_STORAGE_NVME_MASK: 'nvme',
    const_MEDIA_DIR: '/media',
    const_RCLONE_CONFIG_FILE: 'rclone.conf',
    const_BUTTONS_PRIVATE_CONFIG_FILE: 'buttons.cfg',
    const_IMAGE_DATABASE_FILENAME: 'images.db',
    const_BACKGROUND_IMAGES_DIR: 'backgrounds',
    const_SOFTWARE_BRANCH: 'main',
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
  },
  log: '',
  viewImages: {
    images: [
      {
        ID: 1,
        File_Name: 'IMG_0001.jpg',
        Directory: '2024/01',
        Create_Date: '2024-01-15',
        LbbRating: 3,
        Camera_Model_Name: 'Canon EOS R5',
        File_Type: 'JPEG',
        publish_telegram: '0',
        publish_mastodon: '0',
      },
      {
        ID: 2,
        File_Name: 'IMG_0002.jpg',
        Directory: '2024/01',
        Create_Date: '2024-01-16',
        LbbRating: -1,
        Camera_Model_Name: 'Canon EOS R5',
        File_Type: 'JPEG',
        publish_telegram: '0',
        publish_mastodon: '0',
      },
      {
        ID: 3,
        File_Name: 'IMG_0003.RAF',
        Directory: '2024/02',
        Create_Date: '2024-02-10',
        LbbRating: 0,
        Camera_Model_Name: 'Fujifilm X-T5',
        File_Type: 'RAF',
        publish_telegram: '1',
        publish_mastodon: '0',
      },
      {
        ID: 4,
        File_Name: 'IMG_0004.jpg',
        Directory: '2024/02',
        Create_Date: '2024-02-11',
        LbbRating: 5,
        Camera_Model_Name: 'Fujifilm X-T5',
        File_Type: 'JPEG',
        publish_telegram: '0',
        publish_mastodon: '1',
      },
    ],
    count: 4,
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

function generateBackupId() {
  return Date.now();
}

export function createMockApiInterceptor() {
  return async (config) => {
    const url = config.url || '';
    const method = config.method?.toLowerCase() || 'get';
    
    await delay(50);
    
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
      return { data: { success: true, message: 'Backup function initiated (mock)' } };
    }
    
    if (url === '/config' || url === '/config/') {
      return { data: { config: mockData.config, constants: mockData.constants } };
    }
    
    if (url === '/config/save' && method === 'post') {
      Object.assign(mockData.config, config.data);
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
      return { data: { deviceStates: [] } };
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
      return { data: { updateAvailable: false } };
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
      return { data: { success: true, message: 'Update installation started (mock)' } };
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
    
    if (url === '/view/init') {
      return { data: { success: true } };
    }
    
    if (url === '/view/images') {
      const params = config.params || {};
      let images = [...mockData.viewImages.images];

      // Apply rating filter
      if (params.rating) {
        const ratingValues = params.rating.split(',').map((r) => parseInt(r, 10));
        images = images.filter((img) => ratingValues.includes(img.LbbRating));
      }

      // Apply date_from filter
      if (params.date_from) {
        images = images.filter((img) => img.Create_Date >= params.date_from);
      }

      // Apply date_to filter
      if (params.date_to) {
        images = images.filter((img) => img.Create_Date <= params.date_to);
      }

      // Apply filename filter
      if (params.filename) {
        const fn = params.filename.toLowerCase();
        images = images.filter((img) => img.File_Name.toLowerCase().includes(fn));
      }

      // Apply camera filter
      if (params.camera) {
        images = images.filter((img) => img.Camera_Model_Name === params.camera);
      }

      // Apply file_type filter
      if (params.file_type) {
        const ftValues = params.file_type.split(',').map((f) => f.trim());
        images = images.filter((img) => ftValues.includes(img.File_Type));
      }

      // Pagination
      const offset = parseInt(params.selectOffset || 0, 10);
      const perPage = parseInt(params.filterImagesPerPage || 50, 10);
      const count = images.length;
      const paged = images.slice(offset, offset + perPage);

      return { data: { images: paged, count } };
    }

    if (url === '/view/stats') {
      return { data: mockData.viewStats };
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
    
    if (url === '/display/status') {
      return { data: mockData.displayStatus };
    }
    
    if (url === '/log' || url === '/log/') {
      return { data: mockData.log };
    }
    
    if (url === '/log/delete' && method === 'post') {
      mockData.log = '';
      return { data: { success: true } };
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

