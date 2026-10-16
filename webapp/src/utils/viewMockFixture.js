// Library (/view) mock fixture shared by BOTH mock layers:
//   - server/utils/viewMockDb.js loads these rows into an in-memory sqlite DB
//     (dev:mock, Playwright) so the real SQL in server/routes/view.js runs;
//   - src/utils/mockApi.js (static GitHub Pages build) filters them in JS
//     with filterMockRows()/computeMockStats(), which mirror that SQL.
//
// The media files referenced by mockAssetFor() live in webapp/public/mock-media
// (small generated JPEGs, a 4 s WebM clip + low-res proxy, an MP3 and a text file).
//
// Keep this module free of browser/Vite-only globals: Node imports it too.

import {
  classifyMedia,
  createDay,
  isGoProH265,
  isImageKind,
} from './viewMediaKinds.js';

// Mirrors server/utils/socialServiceBits.js (scripts/lib_socialmedia.py
// get_social_service_bit). Keep in sync.
export const MOCK_SOCIAL_BITS = Object.freeze({ telegram: 0, mastodon: 1, bluesky: 2, matrix: 3 });
// Display order from lib_socialmedia.py get_social_services.
export const MOCK_SOCIAL_SERVICES = Object.freeze(['telegram', 'matrix', 'mastodon', 'bluesky']);
// What `lib_socialmedia.py --action get_social_services_configured` reports in
// mock mode (server/utils/mockSystem.js uses the same list).
export const MOCK_SOCIAL_SERVICES_CONFIGURED = Object.freeze(['telegram', 'matrix']);

const SHOOT_DAYS = [
  '2024:03:09', '2024:04:20', '2024:05:04', '2024:05:18', '2024:06:14', '2024:06:15',
  '2024:07:27', '2024:08:10', '2024:08:11', '2024:09:21', '2024:10:05', '2024:10:19',
];

const CAMERAS = {
  canon: {
    Make: 'Canon', Camera_Model_Name: 'Canon EOS 5D Mark IV', Directory: 'DCIM/100EOS5D',
    Lens_Model: 'EF24-70mm f/2.8L II USM', Image_Size: '6720x4480',
  },
  sony: {
    Make: 'SONY', Camera_Model_Name: 'ILCE-7M4', Directory: 'DCIM/100MSDCF',
    Lens_Model: 'FE 35mm F1.8', Image_Size: '7008x4672',
  },
  fuji: {
    Make: 'FUJIFILM', Camera_Model_Name: 'X-T5', Directory: 'DCIM/101_FUJI',
    Lens_Model: 'XF16-55mmF2.8 R LM WR', Image_Size: '7728x5152',
  },
  iphone: {
    Make: 'Apple', Camera_Model_Name: 'iPhone 14 Pro', Directory: 'DCIM/101APPLE',
    Lens_Model: 'iPhone 14 Pro back triple camera 6.86mm f/1.78', Image_Size: '4032x3024',
  },
  gopro: {
    Make: 'GoPro', Camera_Model_Name: 'HERO11 Black', Directory: 'DCIM/100GOPRO',
    Lens_Model: '', Image_Size: '3840x2160',
  },
};

// One slot per position inside a shoot day (10 files per day).
const DAY_SLOTS = [
  { cam: 'canon', prefix: 'IMG_', ext: 'JPG', type: 'JPEG' },
  { cam: 'canon', prefix: 'IMG_', ext: 'CR2', type: 'CR2' },
  { cam: 'sony', prefix: 'DSC0', ext: 'JPG', type: 'JPEG' },
  { cam: 'sony', prefix: 'DSC0', ext: 'ARW', type: 'ARW' },
  { cam: 'fuji', prefix: 'DSCF', ext: 'RAF', type: 'RAF' },
  { cam: 'fuji', prefix: 'DSCF', ext: 'JPG', type: 'JPEG' },
  { cam: 'iphone', prefix: 'IMG_', ext: 'HEIC', type: 'HEIC' },
  { cam: 'iphone', prefix: 'IMG_', ext: 'MP4', type: 'MP4' },
  { cam: 'gopro', prefix: 'GX01', ext: 'MP4', type: 'MP4' },
  null, // rotating special slot, see SPECIAL_SLOTS
];

const SPECIAL_SLOTS = [
  { kind: 'audio', Directory: 'AUDIO/RECORDER', prefix: 'REC_', ext: 'MP3', type: 'MP3' },
  { kind: 'text', Directory: 'NOTES', prefix: 'notes_', ext: 'txt', type: 'TXT' },
  { kind: 'tif', Directory: 'SCANS', prefix: 'scan_', ext: 'TIF', type: 'TIFF' },
  { cam: 'canon', prefix: 'IMG_', ext: 'JPG', type: 'JPEG' },
];

const COMMENTS = [
  'Golden hour over the lake - keep for the album',
  'Slightly soft, try the next frame',
  'Client favourite',
  'Crop to 4:5 for social',
  'Long exposure, tripod',
];

const EXPOSURES = ['1/250', '1/125', '1/60', '1/1000', '1/30', '2', '1/500'];
const APERTURES = ['2.8', '4.0', '5.6', '8.0', '1.8', '11.0'];
const ISOS = ['100', '200', '400', '800', '1600', '3200'];
const FOCALS = ['24.0 mm', '35.0 mm', '50.0 mm', '70.0 mm', '16.0 mm', '6.9 mm'];

function ratingFor(id) {
  const h = (id * 37) % 23;
  if (h < 2) return -1;
  if (h < 4) return 5;
  if (h < 6) return 4;
  if (h < 9) return 3;
  if (h < 11) return 2;
  if (h < 13) return 1;
  return 0;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');

export function buildMockViewRows(count = 120) {
  const rows = [];
  for (let id = 1; id <= count; id++) {
    const dayIdx = Math.floor((id - 1) / 10) % SHOOT_DAYS.length;
    const slotIdx = (id - 1) % 10;
    const slot = DAY_SLOTS[slotIdx] || SPECIAL_SLOTS[dayIdx % SPECIAL_SLOTS.length];
    const cam = slot.cam ? CAMERAS[slot.cam] : null;
    const minute = 8 * 60 + slotIdx * 7 + (id % 5);
    const time = `${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:${pad((id * 13) % 60)}`;
    const day = SHOOT_DAYS[dayIdx];
    const fileName = `${slot.prefix}${pad(1000 + id * 7, 4)}.${slot.ext}`;
    const lbbRating = ratingFor(id);

    const row = {
      ID: id,
      Directory: cam ? cam.Directory : slot.Directory,
      File_Name: fileName,
      // Text files carry no EXIF date; lib_view.py falls back to an
      // underscore-separated timestamp (lib_view.py:173-177).
      Create_Date: slot.kind === 'text'
        ? `${day.replace(/:/g, '_')}_${time.replace(/:/g, '_')}`
        : `${day} ${time}`,
      LbbRating: lbbRating,
      Rating: String(lbbRating),
      Camera_Model_Name: cam ? cam.Camera_Model_Name : slot.kind === 'text' ? null : '',
      File_Type: slot.type,
      File_Type_Extension: slot.ext,
      Comment: id % 9 === 4 ? COMMENTS[Math.floor(id / 9) % COMMENTS.length] : '',
      social_publish: 0,
      social_published: 0,
      ExifTool_Version_Number: '12.76',
    };

    const kind = classifyMedia(fileName);
    if (cam) {
      row.Make = cam.Make;
      if (cam.Lens_Model) row.Lens_Model = cam.Lens_Model;
      row.Image_Size = cam.Image_Size;
    }
    if (isImageKind(kind)) {
      row.Exposure_Time = EXPOSURES[id % EXPOSURES.length];
      row.F_Number = APERTURES[id % APERTURES.length];
      row.ISO = ISOS[id % ISOS.length];
      row.Focal_Length = FOCALS[id % FOCALS.length];
      row.White_Balance = 'Auto';
      row.Flash = 'Off, Did not fire';
      row.Orientation = 'Horizontal (normal)';
      row.File_Size = kind === 'web' ? `${(6 + (id % 7) * 0.7).toFixed(1)} MB` : `${(24 + (id % 9) * 1.3).toFixed(1)} MB`;
      if (kind === 'tif') {
        row.Image_Size = '4960x7016';
        row.MIME_Type = 'image/tiff';
      }
    }
    if (kind === 'video') {
      row.Duration = `0:00:${pad(8 + (id % 40))}`;
      row.Video_Frame_Rate = slot.cam === 'gopro' ? '59.94' : '29.97';
      row.Compressor_Name = slot.cam === 'gopro' ? 'GoPro H.265 encoder' : 'H.264';
      row.File_Size = `${60 + (id % 50)} MB`;
      row.MIME_Type = 'video/mp4';
    }
    if (kind === 'audio') {
      row.Duration = `0:01:${pad(id % 60)}`;
      row.Audio_Bitrate = '128 kbps';
      row.MIME_Type = 'audio/mpeg';
      row.File_Size = '1.9 MB';
    }
    if (kind === 'text') {
      row.MIME_Type = 'text/plain';
      row.File_Size = '131 bytes';
    }

    // Social state on images and videos only: queued (social_publish) and
    // published (social_published) bits, including one "queued again" mix.
    if (isImageKind(kind) || kind === 'video') {
      let publish = 0;
      let published = 0;
      if (id % 6 === 1) publish |= 1 << MOCK_SOCIAL_BITS.telegram;
      if (id % 8 === 3) publish |= 1 << MOCK_SOCIAL_BITS.matrix;
      if (id % 7 === 2) published |= 1 << MOCK_SOCIAL_BITS.telegram;
      if (id % 11 === 5) published |= 1 << MOCK_SOCIAL_BITS.matrix;
      if (id % 13 === 0) published |= 1 << MOCK_SOCIAL_BITS.mastodon;
      if (id === 115) {
        publish |= 1 << MOCK_SOCIAL_BITS.telegram;
        published |= 1 << MOCK_SOCIAL_BITS.telegram;
      }
      row.social_publish = publish;
      row.social_published = published;
    }
    rows.push(row);
  }
  return rows;
}

// Integer columns; everything else is stored as text like lib_view.py does.
export const MOCK_INTEGER_COLUMNS = Object.freeze(['ID', 'LbbRating', 'social_publish', 'social_published']);

/** Union of all row keys in a stable order (ID first) — the EXIF_DATA columns. */
export function mockViewColumns(rows) {
  const seen = new Set();
  const cols = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        cols.push(key);
      }
    }
  }
  return cols;
}

/**
 * Which file under public/mock-media stands in for a row's
 * thumb (tims/<file>.JPG), display (what the single view shows) or original.
 * Returns null when the variant does not exist (e.g. a missing thumbnail, so
 * the grid falls back to unknown.JPG like view.php:1206).
 */
export function mockAssetFor(row, variant) {
  if (!row) return null;
  const kind = classifyMedia(row.File_Name);
  const photo = `photo-${pad((row.ID % 8) + 1)}`;
  if (variant === 'thumb' && row.ID % 23 === 0) return null;
  if (kind === 'video') {
    if (variant === 'thumb') return 'clip-thumb.jpg';
    // WebM (VP9/Opus) so the sample also plays in open-source Chromium builds.
    if (variant === 'display' && isGoProH265(row)) return 'clip-lrv.webm';
    return 'clip.webm';
  }
  if (kind === 'audio') return variant === 'thumb' ? 'audio.jpg' : 'tone.mp3';
  if (kind === 'text') return variant === 'original' ? 'notes.txt' : 'text.jpg';
  if (kind === 'other') return variant === 'thumb' ? null : 'unknown.jpg';
  return variant === 'thumb' ? `${photo}-thumb.jpg` : `${photo}.jpg`;
}

// ---------------------------------------------------------------------------
// JS filter engine for the static mock (mirrors server/routes/view.js SQL).
// ---------------------------------------------------------------------------

export const NONE_VALUE = '__none__';

const splitList = (value) =>
  String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

function matches(row, query, exclude) {
  const q = query || {};
  if (exclude !== 'rating' && q.rating) {
    const vals = splitList(q.rating).map((r) => parseInt(r, 10)).filter((r) => !Number.isNaN(r));
    if (vals.length && !vals.includes(Number(row.LbbRating))) return false;
  }
  if (exclude !== 'date') {
    const day = createDay(row.Create_Date);
    if (q.date && day !== q.date) return false;
    if (q.date_from && day < q.date_from) return false;
    if (q.date_to && day > q.date_to) return false;
  }
  if (q.filename && !String(row.File_Name || '').toLowerCase().includes(String(q.filename).toLowerCase())) return false;
  if (exclude !== 'camera' && q.camera) {
    const cam = row.Camera_Model_Name || '';
    if (q.camera === NONE_VALUE ? cam !== '' : cam !== q.camera) return false;
  }
  if (exclude !== 'file_type' && q.file_type) {
    const vals = splitList(q.file_type);
    if (vals.length && !vals.includes(row.File_Type)) return false;
  }
  if (exclude !== 'directory' && q.directory && row.Directory !== q.directory) return false;
  if (exclude !== 'extension' && q.extension) {
    const vals = splitList(q.extension);
    if (vals.length && !vals.includes(row.File_Type_Extension)) return false;
  }
  for (const [param, column] of [['social_publish', 'social_publish'], ['social_published', 'social_published']]) {
    if (exclude !== param && q[param]) {
      const masks = splitList(q[param])
        .map((s) => MOCK_SOCIAL_BITS[s])
        .filter((b) => b !== undefined)
        .map((b) => 1 << b);
      if (masks.length && !masks.some((m) => (Number(row[column]) & m) !== 0)) return false;
    }
  }
  if (exclude !== 'variable' && q.var_field && q.var_value !== undefined && q.var_value !== '') {
    const v = row[q.var_field] === null || row[q.var_field] === undefined ? '' : String(row[q.var_field]);
    if (q.var_value === NONE_VALUE ? v !== '' : v !== q.var_value) return false;
  }
  return true;
}

export function filterMockRows(rows, query, exclude = null) {
  return rows.filter((row) => matches(row, query, exclude));
}

const SORT_COLUMNS = { date: 'Create_Date', filename: 'File_Name', id: 'ID' };

// Mirrors SORT_DATE_EXPR in server/routes/view.js.
const dateSortKey = (value) => {
  const v = String(value ?? '');
  return `${v.slice(0, 10).replace(/[_-]/g, ':')} ${v.slice(11).replace(/_/g, ':')}`;
};

export function sortMockRows(rows, sort = 'date', dir = 'desc') {
  const col = SORT_COLUMNS[String(sort).toLowerCase()] || 'Create_Date';
  const sign = String(dir).toLowerCase() === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = col === 'Create_Date' ? dateSortKey(a[col]) : a[col];
    const bv = col === 'Create_Date' ? dateSortKey(b[col]) : b[col];
    let cmp;
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
    else {
      // Binary order, like sqlite's default collation.
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      cmp = as < bs ? -1 : as > bs ? 1 : 0;
    }
    if (cmp === 0) cmp = a.ID - b.ID;
    return cmp * sign;
  });
}

function countBy(rows, keyFn) {
  const counts = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count }));
}

const byValue = (a, b) => String(a.value).localeCompare(String(b.value));

/** Same shape as GET /api/view/stats. */
export function computeMockStats(rows, query = {}) {
  const facet = (name) => filterMockRows(rows, query, name);
  const columns = mockViewColumns(rows);
  const stats = {
    imagesAll: rows.length,
    total: filterMockRows(rows, query).length,
    ratings: countBy(facet('rating'), (r) => Number(r.LbbRating)).sort((a, b) => a.value - b.value),
    dates: countBy(facet('date'), (r) => createDay(r.Create_Date)).sort((a, b) => byValue(b, a)),
    directories: countBy(facet('directory'), (r) => r.Directory).sort(byValue),
    fileTypes: countBy(facet('file_type'), (r) => r.File_Type).sort(byValue),
    fileTypeExtensions: countBy(facet('extension'), (r) => r.File_Type_Extension).sort(byValue),
    cameraModelNames: countBy(facet('camera'), (r) => r.Camera_Model_Name || '').sort(byValue),
    socialPublishPending: MOCK_SOCIAL_SERVICES.map((service) => ({
      service,
      bit: MOCK_SOCIAL_BITS[service],
      count: facet('social_publish').filter((r) => (r.social_publish & (1 << MOCK_SOCIAL_BITS[service])) !== 0).length,
    })),
    socialPublished: MOCK_SOCIAL_SERVICES.map((service) => ({
      service,
      bit: MOCK_SOCIAL_BITS[service],
      count: facet('social_published').filter((r) => (r.social_published & (1 << MOCK_SOCIAL_BITS[service])) !== 0).length,
    })),
    fields: [...columns].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
    variableValues: [],
  };
  if (query.var_field && columns.includes(query.var_field)) {
    stats.variableValues = countBy(facet('variable'), (r) =>
      r[query.var_field] === null || r[query.var_field] === undefined ? '' : String(r[query.var_field])
    ).sort(byValue);
  }
  return stats;
}
