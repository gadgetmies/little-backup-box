// Pure helpers shared by the Express backend (server/routes/view.js), the
// in-browser mock API (src/utils/mockApi.js) and the Library page. Keep this
// file free of browser- or Vite-only globals (no import.meta.env, no window)
// so Node can import it too.

// Fallbacks mirror scripts/constants.sh. The live values come from
// req.constants / ConfigContext.constants when available.
export const DEFAULT_EXTENSION_LISTS = Object.freeze({
  const_FILE_EXTENSIONS_LIST_WEB_IMAGES: 'jpg;jpeg;gif;png;webp',
  const_FILE_EXTENSIONS_LIST_HEIC: 'heic;heif',
  const_FILE_EXTENSIONS_LIST_RAW:
    '3fr;arw;dcr;dng;cr2;cr3;crw;fff;gpr;j6i;k25;kc2;kdc;mdc;mrw;nef;nrw;orf;pef;raw;raf;rw2;rwl;sr2;srf;srw;x3f',
  const_FILE_EXTENSIONS_LIST_TIF: 'tif;tiff',
  const_FILE_EXTENSIONS_LIST_VIDEO: 'avi;lrv;mp4',
  const_FILE_EXTENSIONS_LIST_AUDIO: 'mp3;wav;m4a',
  const_FILE_EXTENSIONS_LIST_TEXT: 'txt;md;html',
});

function extList(constants, key) {
  const raw = String((constants && constants[key]) || DEFAULT_EXTENSION_LISTS[key] || '');
  return raw
    .replace(/^'+|'+$/g, '')
    .split(';')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function fileExtension(fileName) {
  const name = String(fileName || '');
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

/**
 * Classify a file the same way scripts/view.php:1262-1354 does.
 *
 * Returns one of: 'web' (browser-renderable image), 'raw', 'heic', 'tif'
 * (images shown via the tims/ preview), 'video', 'audio', 'text', 'other'.
 */
export function classifyMedia(fileName, constants) {
  const ext = fileExtension(fileName);
  if (extList(constants, 'const_FILE_EXTENSIONS_LIST_WEB_IMAGES').includes(ext)) return 'web';
  if (extList(constants, 'const_FILE_EXTENSIONS_LIST_RAW').includes(ext)) return 'raw';
  if (extList(constants, 'const_FILE_EXTENSIONS_LIST_HEIC').includes(ext)) return 'heic';
  if (extList(constants, 'const_FILE_EXTENSIONS_LIST_TIF').includes(ext)) return 'tif';
  if (extList(constants, 'const_FILE_EXTENSIONS_LIST_VIDEO').includes(ext)) return 'video';
  if (extList(constants, 'const_FILE_EXTENSIONS_LIST_AUDIO').includes(ext)) return 'audio';
  if (extList(constants, 'const_FILE_EXTENSIONS_LIST_TEXT').includes(ext)) return 'text';
  return 'other';
}

export function isImageKind(kind) {
  return kind === 'web' || kind === 'raw' || kind === 'heic' || kind === 'tif';
}

// view.php:1286 — only RAW and TIF get the "low resolution preview" notice
// (HEIC is also served from tims/ but PHP shows no notice for it).
export function showsLowResImageNotice(kind) {
  return kind === 'raw' || kind === 'tif';
}

// view.php:1300 — GoPro H.265 is not playable in most browsers; PHP swaps in
// the .LRV proxy (second character of the base name replaced by "L").
export function isGoProH265(row) {
  return Boolean(row && row.Compressor_Name && String(row.Compressor_Name).includes('GoPro H.265 encoder'));
}

export function goProLrvName(fileName) {
  const name = String(fileName || '');
  const dot = name.lastIndexOf('.');
  const base = dot >= 0 ? name.slice(0, dot) : name;
  if (base.length < 2) return null;
  return `${base.slice(0, 1)}L${base.slice(2)}.LRV`;
}

// Fields never shown in the metadata table (view.php:519-522).
export const EXIF_FIELDS_BLOCKED = Object.freeze(['ID', 'ExifTool_Version_Number']);

/**
 * Normalise an EXIF-ish date ("2024:06:14 09:12:33", "2024_06_14_09_12_33",
 * "2024-06-14") into its parts. Returns null when it cannot be parsed.
 * Mirrors the PHP fallback parser in view.php:1170-1182.
 */
export function parseCreateDate(value) {
  if (!value) return null;
  const parts = String(value).split(/[^0-9]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const [y, m, d, H = '0', M = '0', S = '0'] = parts;
  const year = parseInt(y, 10);
  const month = parseInt(m, 10);
  const day = parseInt(d, 10);
  if (!year || !month || !day || month > 12 || day > 31) return null;
  return {
    year,
    month,
    day,
    hour: parseInt(H, 10) || 0,
    minute: parseInt(M, 10) || 0,
    second: parseInt(S, 10) || 0,
  };
}

/** The YYYY-MM-DD day key used by the date filter (view.php:769). */
export function createDay(value) {
  if (!value) return '';
  return String(value).replace(/:/g, '-').replace(/_/g, '-').slice(0, 10);
}

const pad = (n) => String(n).padStart(2, '0');

/**
 * Format a Create_Date with a PHP date()-style pattern (view_date_format,
 * e.g. "Y/m/d" or "d.m.Y"). Only the d, j, m, n, Y, y, H, i, s tokens are
 * supported, which covers every language file. Falls back to the raw value.
 */
export function formatCreateDate(value, pattern = 'Y-m-d') {
  const p = parseCreateDate(value);
  if (!p) return value ? String(value) : '';
  const tokens = {
    d: pad(p.day),
    j: String(p.day),
    m: pad(p.month),
    n: String(p.month),
    Y: String(p.year),
    y: pad(p.year % 100),
    H: pad(p.hour),
    i: pad(p.minute),
    s: pad(p.second),
  };
  return String(pattern)
    .split('')
    .map((ch) => (Object.prototype.hasOwnProperty.call(tokens, ch) ? tokens[ch] : ch))
    .join('');
}

// Medium ids follow view.php:563-636. Order is the PHP <select> order.
export const VIEW_MEDIA = Object.freeze(['target_usb', 'source_usb', 'target_nvme', 'source_nvme', 'internal']);
export const NVME_MEDIA = Object.freeze(['target_nvme', 'source_nvme']);

export const MEDIUM_MOUNT_CONSTANTS = Object.freeze({
  target_usb: ['const_MOUNTPOINT_USB_TARGET', 'usb_target'],
  source_usb: ['const_MOUNTPOINT_USB_SOURCE', 'usb_source'],
  target_nvme: ['const_MOUNTPOINT_NVME_TARGET', 'nvme_target'],
  source_nvme: ['const_MOUNTPOINT_NVME_SOURCE', 'nvme_source'],
  internal: ['const_INTERNAL_BACKUP_DIR', 'internal'],
});

/** Mountpoint directory name for a medium id, or null for an unknown id. */
export function mediumDirName(medium, constants) {
  const entry = MEDIUM_MOUNT_CONSTANTS[medium];
  if (!entry) return null;
  const [key, fallback] = entry;
  return String((constants && constants[key]) || fallback).replace(/^'+|'+$/g, '');
}

/**
 * Pick the default medium from `df -h` output exactly like view.php:563-573:
 * the first of target_usb, source_usb, target_nvme, source_nvme that is
 * mounted, else internal.
 */
export function defaultMediumFromDf(dfOutput, constants) {
  const mediaDir = String((constants && constants.const_MEDIA_DIR) || '/media');
  const text = String(dfOutput || '');
  for (const medium of ['target_usb', 'source_usb', 'target_nvme', 'source_nvme']) {
    if (text.includes(`${mediaDir}/${mediumDirName(medium, constants)}`)) return medium;
  }
  return 'internal';
}

/** Which media are currently mounted according to `df -h`. */
export function mountedMediaFromDf(dfOutput, constants) {
  const mediaDir = String((constants && constants.const_MEDIA_DIR) || '/media');
  const text = String(dfOutput || '');
  const result = {};
  for (const medium of VIEW_MEDIA) {
    result[medium] = text.includes(`${mediaDir}/${mediumDirName(medium, constants)}`);
  }
  return result;
}

/**
 * Images-per-page presets: const_VIEW_GRID_COLUMNS × {5,10,20,50,100}
 * (view.php:488). The default is the second option (view.php:495).
 */
export function perPageOptions(gridColumns) {
  const cols = parseInt(String(gridColumns ?? '').replace(/'/g, ''), 10) || 3;
  return [5, 10, 20, 50, 100].map((n) => n * cols);
}
