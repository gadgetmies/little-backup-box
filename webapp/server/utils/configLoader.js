import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';
import { shouldUseMocks } from './systemDetector.js';

// Value types of the config.cfg keys, copied from
// scripts/lib_setup.py __get_config_standard(). The type decides how a value
// is quoted when config.cfg is written (lib_setup.py rewrite_configfile():
// 'str' values in single quotes, everything else bare) and how booleans are
// normalised when read. Unknown keys are treated as 'str', like lib_setup.py.
const CONFIG_STANDARDS = {
  conf_SOFTWARE_DATE_INSTALLED: ['', 'str'],
  conf_SOFTWARE_DATE_AVAILABLE: ['', 'str'],
  conf_LANGUAGE: ['', 'str'],
  conf_TIME_ZONE: ['Europe/London', 'str'],
  conf_BACKUP_DEFAULT_SOURCE: ['none', 'str'],
  conf_BACKUP_DEFAULT_TARGET: ['none', 'str'],
  conf_BACKUP_DEFAULT_MOVE_FILES: ['false', 'bool'],
  conf_BACKUP_DEFAULT_GENERATE_THUMBNAILS: ['true', 'bool'],
  conf_BACKUP_DEFAULT_SOURCE2: ['none', 'str'],
  conf_BACKUP_DEFAULT_TARGET2: ['none', 'str'],
  conf_BACKUP_DEFAULT2_MOVE_FILES: ['false', 'bool'],
  conf_BACKUP_CAMERA_FOLDER_MASK: ['*:DCIM', 'str'],
  conf_BACKUP_CLOUDS_TARGET_BASEDIR: ['', 'str'],
  conf_BACKUP_CLOUDS_TARGET_FILES_STAY_IN_PLACE: ['', 'str'],
  conf_BACKUP_SYNC_METHOD_CLOUDS: ['rsync', 'str'],
  conf_BACKUP_RENAME_FILES: ['false', 'bool'],
  conf_BACKUP_CHECKSUM: ['false', 'bool'],
  conf_BACKUP_GENERATE_THUMBNAILS: ['true', 'bool'],
  conf_BACKUP_UPDATE_EXIF: ['false', 'bool'],
  conf_BACKUP_TARGET_SIZE_MIN: ['0', 'int'],
  conf_BACKUP_MOVE_FILES: ['false', 'bool'],
  conf_POWER_OFF: ['false', 'bool'],
  conf_VIEW_CONVERT_HEIC: ['true', 'bool'],
  conf_VIEW_WRITE_RATING_EXIF: ['false', 'bool'],
  conf_DISP: ['false', 'bool'],
  conf_DISP_CONNECTION: ['I2C', 'str'],
  conf_DISP_DRIVER: ['SSD1306', 'str'],
  conf_DISP_I2C_ADDRESS: ['0x3c', 'int16'],
  conf_DISP_SPI_PORT: ['0', 'int'],
  conf_DISP_RESOLUTION_X: ['128', 'int'],
  conf_DISP_RESOLUTION_Y: ['64', 'int'],
  conf_DISP_OFFSET_X: ['0', 'int'],
  conf_DISP_OFFSET_Y: ['0', 'int'],
  conf_DISP_ROTATE: ['0', 'int'],
  conf_DISP_CONTRAST: ['255', 'int'],
  conf_DISP_COLOR_BGR: ['false', 'bool'],
  conf_DISP_COLOR_INVERSE: ['false', 'bool'],
  conf_DISP_COLOR_MODEL: ['1', 'str'],
  conf_DISP_COLOR_TEXT: ['grey', 'str'],
  conf_DISP_COLOR_HIGH: ['white', 'str'],
  conf_DISP_COLOR_ALERT: ['orange', 'str'],
  conf_DISP_COLOR_BACKGROUND: ['black', 'str'],
  conf_DISP_FONT_SIZE: ['12', 'int'],
  conf_DISP_FRAME_TIME: ['1', 'float'],
  conf_DISP_FRAME_TIME_IP: ['3.0', 'float'],
  conf_DISP_IP_REPEAT: ['true', 'bool'],
  conf_DISP_SHOW_STATUSBAR: ['true', 'bool'],
  conf_DISP_BACKLIGHT_PIN: ['23', 'int'],
  conf_DISP_BACKLIGHT_ENABLED: ['true', 'bool'],
  conf_MENU_ENABLED: ['true', 'bool'],
  conf_MENU_BUTTON_COMBINATION: ['1', 'str'],
  conf_MENU_BUTTON_ROTATE: ['2', 'int'],
  conf_MENU_BUTTON_BOUNCETIME: ['15', 'int'],
  conf_MENU_BUTTON_EDGE_DETECTION: ['RISING', 'str'],
  conf_MENU_BUTTON_RESISTOR_PULL: ['DOWN', 'str'],
  conf_VIRTUAL_KEYBOARD_ENABLED: ['true', 'bool'],
  conf_FAN_PWM_TEMP_C: ['50', 'int'],
  conf_FAN_PWM_GPIO: ['18', 'int'],
  conf_POPUP_MESSAGES: ['true', 'bool'],
  conf_THEME: ['dark', 'str'],
  conf_BACKGROUND_IMAGE: ['', 'str'],
  conf_LOGLEVEL: ['1', 'int'],
  conf_LOG_SYNC: ['true', 'bool'],
  conf_POWER_OFF_IDLE_TIME: ['0', 'int'],
  conf_MAIL_IP: ['false', 'bool'],
  conf_MAIL_NOTIFICATIONS: ['false', 'bool'],
  conf_MAIL_TIMEOUT_SEC: ['60', 'int'],
  conf_MAIL_HTML: ['true', 'bool'],
  conf_SMTP_SERVER: ['', 'str'],
  conf_SMTP_PORT: ['465', 'str'],
  conf_MAIL_SECURITY: ['STARTTLS', 'str'],
  conf_MAIL_USER: ['', 'str'],
  conf_MAIL_PASSWORD: ['', 'str'],
  conf_MAIL_FROM: ['', 'str'],
  conf_MAIL_TO: ['', 'str'],
  conf_RSYNC_SERVER: ['', 'str'],
  conf_RSYNC_PORT: ['873', 'str'],
  conf_RSYNC_USER: ['', 'str'],
  conf_RSYNC_PASSWORD: ['', 'str'],
  conf_RSYNC_SERVER_MODULE: ['little-backup-box', 'str'],
  conf_WIFI_COUNTRY: ['GB', 'str'],
  conf_WIFI_PASSWORD_TYPE: ['static', 'str'],
  conf_WIFI_PASSWORD: ['', 'str'],
  conf_VPN_TYPE_RSYNC: ['none', 'str'],
  conf_VPN_TYPE_CLOUD: ['none', 'str'],
  conf_VPN_TIMEOUT: ['20', 'int'],
  conf_PASSWORD: ['', 'str'],
  conf_DIPLAY_IMAGES_KEEP: ['false', 'bool'],
  conf_SOCIAL_PUBLISH_DATE: ['true', 'bool'],
  conf_SOCIAL_PUBLISH_FILENAME: ['false', 'bool'],
  conf_SOCIAL_TELEGRAM_TOKEN: ['', 'str'],
  conf_SOCIAL_TELEGRAM_CHAT_ID: ['0', 'int'],
  conf_SOCIAL_TELEGRAM_CHAT_IDENTIFIER: ['', 'str'],
  conf_SOCIAL_MASTODON_BASE_URL: ['', 'str'],
  conf_SOCIAL_MASTODON_TOKEN: ['', 'str'],
  conf_SOCIAL_BLUESKY_API_BASE_URL: ['https://bsky.social', 'str'],
  conf_SOCIAL_BLUESKY_IDENTIFIER: ['', 'str'],
  conf_SOCIAL_BLUESKY_APP_PASSWORD: ['', 'str'],
  conf_SOCIAL_MATRIX_HOMESERVER: ['', 'str'],
  conf_SOCIAL_MATRIX_TOKEN: ['', 'str'],
  conf_SOCIAL_MATRIX_ROOM_ID: ['', 'str'],
  conf_SOCIAL_MATRIX_ROOM_IDENTIFIER: ['', 'str'],
};

export function getConfigType(key) {
  return CONFIG_STANDARDS[key]?.[1] || 'str';
}

function getDefaultConfig() {
  return Object.fromEntries(Object.entries(CONFIG_STANDARDS).map(([key, [value]]) => [key, value]));
}

// Booleans are exchanged with the client as the strings 'true' / 'false'.
// lib_setup.py accepts True / 1 / '1' / 'true' (any case) as true.
export function normaliseBool(value) {
  if (value === true) return 'true';
  if (value === false || value === null || value === undefined) return 'false';
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on' ? 'true' : 'false';
}

function normaliseValue(key, value) {
  const str = value === null || value === undefined ? '' : String(value);
  return getConfigType(key) === 'bool' ? normaliseBool(str) : str;
}

function unquote(raw) {
  const value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === "'" || first === '"') && first === last) {
      return value.slice(1, -1);
    }
  }
  return value;
}

const LINE_PATTERN = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;

// Parse a shell-style key=value file (config.cfg, constants.sh). Values are
// always returned as strings with surrounding quotes removed, so `a|;|b` and
// `*:DCIM;Canon:DCIM` survive intact (the `ini` package would treat `;` as a
// comment and turn true/false into JS booleans).
export function parseConfigText(content) {
  const result = {};
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*[#;]/.test(line)) continue;
    const match = line.match(LINE_PATTERN);
    if (!match) continue;
    result[match[1]] = unquote(match[2]);
  }
  return result;
}

function quoteValue(key, value) {
  const type = getConfigType(key);
  let str = type === 'bool' ? normaliseBool(value) : String(value ?? '');
  // config.cfg is line based and is `source`d by set_hardware.sh: never let a
  // value span lines.
  str = str.replace(/[\r\n]+/g, ' ');
  const needsQuotes = type === 'str' || type === 'int16' || /[\s'";#]/.test(str);
  if (!needsQuotes) return str;
  // lib_setup.py / setup.php use single quotes; fall back to double quotes for
  // values containing a single quote (as setup.php does for social tokens).
  // A value containing both quote characters cannot be represented in a file
  // that is both `source`d by bash and read by ConfigObj; drop the double quotes.
  return str.includes("'") ? `"${str.replace(/"/g, '')}"` : `'${str}'`;
}

// Apply `updates` to the text of an existing config file, keeping comments,
// unknown keys and key order. New keys are appended at the end.
export function serializeConfigUpdate(originalContent, updates) {
  const pending = new Map(Object.entries(updates));
  const lines = originalContent ? originalContent.split(/\r?\n/) : [];
  if (lines.length && lines[lines.length - 1] === '') lines.pop();

  const output = lines.map((line) => {
    if (/^\s*[#;]/.test(line)) return line;
    const match = line.match(LINE_PATTERN);
    if (!match || !pending.has(match[1])) return line;
    const key = match[1];
    const value = pending.get(key);
    pending.delete(key);
    return `${key}=${quoteValue(key, value)}`;
  });

  for (const [key, value] of pending) {
    output.push(`${key}=${quoteValue(key, value)}`);
  }

  return `${output.join('\n')}\n`;
}

function normaliseConfig(config) {
  const out = {};
  for (const [key, value] of Object.entries(config)) {
    out[key] = normaliseValue(key, value);
  }
  return out;
}

function readConfigFile(configPath) {
  const content = readFileSync(configPath, 'utf-8');
  return normaliseConfig({ ...getDefaultConfig(), ...parseConfigText(content) });
}

export function loadConfig(workingDir) {
  const configPath = path.join(workingDir, 'config.cfg');

  if (!existsSync(configPath)) {
    console.warn(`Config file not found at ${configPath}, using default values`);
    return getDefaultConfig();
  }

  try {
    return readConfigFile(configPath);
  } catch (err) {
    console.warn(`Failed to load config.cfg: ${err.message}, using default values`);
    return getDefaultConfig();
  }
}

// ---------------------------------------------------------------------------
// Config store: the single in-memory copy of config.cfg that every request
// sees (req.config). It is refreshed after every write so GET /api/config
// never returns stale values. In mock mode writes stay in memory so dev:mock
// and the E2E tests never touch scripts/config.cfg.
// ---------------------------------------------------------------------------

let store = null;
let storeWorkingDir = null;

export function initConfigStore(workingDir) {
  storeWorkingDir = workingDir;
  store = loadConfig(workingDir);
  return store;
}

export function getConfig() {
  if (!store) {
    throw new Error('Config store not initialised');
  }
  return store;
}

export function reloadConfig(workingDir = storeWorkingDir) {
  if (shouldUseMocks()) return store;
  store = loadConfig(workingDir);
  return store;
}

const KEY_PATTERN = /^conf_[A-Za-z0-9_]+$/;

// Persist `updates` (conf_* keys only) to config.cfg and refresh the store.
// Returns the refreshed config.
export function saveConfigValues(updates, workingDir = storeWorkingDir) {
  const filtered = {};
  for (const [key, value] of Object.entries(updates || {})) {
    if (!KEY_PATTERN.test(key)) continue;
    if (value !== null && typeof value === 'object') continue;
    filtered[key] = normaliseValue(key, value).replace(/[\r\n]+/g, ' ');
  }

  if (shouldUseMocks()) {
    store = { ...store, ...filtered };
    return store;
  }

  const configPath = path.join(workingDir, 'config.cfg');
  const original = existsSync(configPath) ? readFileSync(configPath, 'utf-8') : '';
  writeFileSync(configPath, serializeConfigUpdate(original, filtered), 'utf-8');
  store = readConfigFile(configPath);
  return store;
}

function getDefaultConstants() {
  return {
    const_MEDIA_DIR: '/media',
    const_MOUNTPOINT_USB_TARGET: 'usb_target',
    const_MOUNTPOINT_USB_SOURCE: 'usb_source',
    const_MOUNTPOINT_NVME_TARGET: 'nvme_target',
    const_MOUNTPOINT_NVME_SOURCE: 'nvme_source',
    const_MOUNTPOINT_CLOUD_TARGET: 'cloud_target',
    const_MOUNTPOINT_CLOUD_SOURCE: 'cloud_source',
    const_INTERNAL_BACKUP_DIR: 'internal',
    const_BACKGROUND_IMAGES_DIR: 'backgroundimages',
    const_WEB_ROOT_LBB: '/var/www/little-backup-box',
    const_LOGFILE: '/var/www/little-backup-box/tmp/little-backup-box.log',
    const_DISPLAY_CONTENT_PATH: '/var/www/little-backup-box/tmp/display-content',
    const_RCLONE_CONFIG_FILE: 'rclone.conf',
    const_BUTTONS_CONFIG_FILE: 'buttons.cfg',
    const_BUTTONS_PRIVATE_CONFIG_FILE: 'buttons.private.cfg',
    const_STORAGE_EXT_MASK: 'sd',
    const_STORAGE_NVME_MASK: 'nvme',
    const_CMD_LOGFILE: '/var/www/little-backup-box/tmp/cmd.log',
    const_CMD_RUNNER_LOCKFILE: '/var/www/little-backup-box/tmp/cmd-runner.lock',
    const_IMAGE_DATABASE_FILENAME: 'images.db',
    const_IDLETIME_LOCKFILE: '/var/www/little-backup-box/tmp/idletime.lock',
    const_FILE_EXTENSIONS_LIST_WEB_IMAGES: 'jpg;jpeg;gif;png;webp',
    const_FILE_EXTENSIONS_LIST_RAW: '3fr;arw;dcr;dng;cr2;cr3;crw;fff;gpr;j6i;k25;kc2;kdc;mdc;mrw;nef;nrw;orf;pef;raw;raf;rw2;rwl;sr2;srf;srw;x3f',
    const_FILE_EXTENSIONS_LIST_VIDEO: 'avi;lrv;mp4',
    const_FILE_EXTENSIONS_LIST_AUDIO: 'mp3;wav;m4a',
    const_FILE_EXTENSIONS_LIST_TEXT: 'txt;md;html',
    const_VIEW_GRID_COLUMNS: '3',
    const_VIEW_RATING_STANDARD_VALUE: '0',
    const_VPN_DIR_OpenVPN: '/etc/openvpn',
    const_VPN_DIR_WireGuard: '/etc/wireguard',
    const_VPN_FILENAME_OpenVPN: 'openvpn.conf',
    const_VPN_FILENAME_WireGuard: 'wg0.conf',
  };
}

export function loadConstants(workingDir) {
  const constantsPath = path.join(workingDir, 'constants.sh');

  if (!existsSync(constantsPath)) {
    console.warn(`Constants file not found at ${constantsPath}, using default values`);
    return getDefaultConstants();
  }

  try {
    const content = readFileSync(constantsPath, 'utf-8');
    const constants = Object.fromEntries(
      Object.entries(parseConfigText(content)).filter(([key]) => key.startsWith('const_')),
    );
    return { ...getDefaultConstants(), ...constants };
  } catch (err) {
    console.warn(`Failed to load constants.sh: ${err.message}, using default values`);
    return getDefaultConstants();
  }
}
