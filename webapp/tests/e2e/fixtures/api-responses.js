export const mockServices = {
  sourceServices: {
    anyusb: ['anyusb'],
    usb: ['usb', 'internal'],
    camera: ['camera'],
    cloud: ['cloud_rsync', 'ftp'],
  },
  targetServices: {
    usb: ['usb', 'internal'],
    cloud: ['cloud_rsync'],
    social: [],
  },
};

export const mockPartitions = {
  partitions: [
    { lum: 'sda1', identifier: 'USB-DRIVE-1' },
    { lum: 'sdb1', identifier: 'USB-DRIVE-2' },
    { lum: 'mmcblk0p1', identifier: 'INTERNAL' },
  ],
};

export const mockSystemInfo = {
  model: 'Raspberry Pi 4 Model B',
  temp: 45.2,
  cpuusage: 12.5,
  memRam: '25.3 % * 4096 MB',
  memSwap: '0.0 % * 100 MB',
  abnormalConditions: 'None',
};

export const mockDiskSpace = {
  output: `Filesystem      Size  Used Avail Use% Mounted on
/dev/root        15G  2.1G   12G  15% /
/dev/sda1       500G  120G  380G  24% /media/usb1
/dev/sdb1       250G   50G  200G  20% /media/usb2`,
};

export const mockDevices = {
  output: `sda: USB-DRIVE-1
sdb: USB-DRIVE-2
mmcblk0: INTERNAL`,
};

export const mockDeviceStates = {
  deviceStates: [
    { lum: 'sda1', mounted: true, mountpoint: '/media/usb1' },
    { lum: 'sdb1', mounted: true, mountpoint: '/media/usb2' },
  ],
};

export const mockCameras = {
  cameras: [
    { model: 'Canon EOS 5D', port: 'usb:001,002' },
    { model: 'Nikon D850', port: 'usb:001,003' },
  ],
};

export const mockMounts = {
  mountsList: `/dev/sda1 on /media/usb1 type vfat (rw,noexec,nosuid,nodev)
/dev/sdb1 on /media/usb2 type ext4 (rw,noexec,nosuid,nodev)
/dev/root on / type ext4 (rw,noexec,nosuid,nodev)`,
};

export const mockConfig = {
  conf_LANGUAGE: 'en',
  conf_THEME: 'dark',
  conf_BACKUP_MOVE_FILES: 'false',
  conf_BACKUP_RENAME_FILES: 'false',
  conf_BACKUP_GENERATE_THUMBNAILS: 'true',
  conf_BACKUP_UPDATE_EXIF: 'false',
  conf_BACKUP_CHECKSUM: 'false',
  conf_POWER_OFF: 'false',
};

export const mockViewImages = {
  images: [
    {
      ID: 1,
      File_Name: 'IMG_001.jpg',
      Directory: '2024/01',
      Create_Date: '2024-01-01 12:00:00',
      thumbnail_path: '/img/unknown.JPG',
      rating: -1,
      comment: 'Blurry shot',
    },
    {
      ID: 2,
      File_Name: 'IMG_002.jpg',
      Directory: '2024/01',
      Create_Date: '2024-01-01 12:05:00',
      thumbnail_path: '/img/unknown.JPG',
      rating: 0,
      comment: '',
    },
    {
      ID: 3,
      File_Name: 'IMG_003.jpg',
      Directory: '2024/01',
      Create_Date: '2024-01-01 12:10:00',
      thumbnail_path: '/img/unknown.JPG',
      rating: 3,
      comment: 'Nice composition',
    },
    {
      ID: 4,
      File_Name: 'IMG_004.jpg',
      Directory: '2024/01',
      Create_Date: '2024-01-01 12:15:00',
      thumbnail_path: '/img/unknown.JPG',
      rating: 5,
      comment: 'Best shot of the day',
    },
    {
      ID: 5,
      File_Name: 'IMG_005.jpg',
      Directory: '2024/01',
      Create_Date: '2024-01-01 12:20:00',
      thumbnail_path: '/img/unknown.JPG',
      rating: 1,
      comment: '',
    },
    {
      ID: 6,
      File_Name: 'IMG_006.jpg',
      Directory: '2024/01',
      Create_Date: '2024-01-01 12:25:00',
      thumbnail_path: '/img/unknown.JPG',
      rating: -1,
      comment: 'Out of focus',
    },
  ],
  count: 6,
};

export const mockDisplayStatus = {
  status: 'Ready',
};

export const mockLog = {
  content: '2024-01-01 12:00:00 - Backup started\n2024-01-01 12:05:00 - Files copied: 100',
};

export function withMockDelay(response, ms) {
  return new Promise((resolve) => setTimeout(() => resolve(response), ms));
}

// View page fixtures

export const viewMediaResponse = {
  media: ['usb', 'nvme', 'internal'],
  available: { usb: true, nvme: false, internal: true },
};

function generateImages(count = 120, page = 1, perPage = 25) {
  const start = (page - 1) * perPage;
  const end = Math.min(start + perPage, count);
  const images = [];
  for (let i = start; i < end; i++) {
    const id = i + 1;
    const filename = `IMG_${String(id).padStart(4, '0')}.jpg`;
    images.push({
      ID: id,
      File_Name: filename,
      Create_Date: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
      thumbnail_path: `/thumbnails/usb/${filename}`,
      rating: id % 7 === 0 ? -1 : id % 6 === 0 ? 5 : id % 5 === 0 ? 3 : 0,
      comment: '',
      publish_telegram: false,
      publish_mastodon: false,
    });
  }
  return images;
}

export const viewImagesResponse = {
  images: generateImages(120, 1, 25),
  total: 120,
  dbExists: true,
};

export const viewImagesPage2Response = {
  images: generateImages(120, 2, 25),
  total: 120,
  dbExists: true,
};

export const viewImagesNotMountedResponse = {
  error: 'not_mounted',
};

export const viewImagesNoResultsResponse = {
  images: [],
  total: 0,
  dbExists: true,
};

export const viewImagesDbNotInitialisedResponse = {
  images: [],
  total: 0,
  dbExists: false,
};
