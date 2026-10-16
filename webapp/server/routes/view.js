import express from 'express';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { execCommand } from '../utils/execCommand.js';
import { shouldUseMocks } from '../utils/systemDetector.js';
import { SOCIAL_SERVICE_BITS, SOCIAL_SERVICES, maskFor } from '../utils/socialServiceBits.js';
import { getMockViewDb, getMockViewRow } from '../utils/viewMockDb.js';
import {
  NVME_MEDIA,
  VIEW_MEDIA,
  classifyMedia,
  defaultMediumFromDf,
  goProLrvName,
  isGoProH265,
  mediumDirName,
  mountedMediaFromDf,
  showsLowResImageNotice,
} from '../../src/utils/viewMediaKinds.js';
import { mockAssetFor } from '../../src/utils/viewMockFixture.js';

const MOCK_MEDIA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public/mock-media');

// Sentinel for "empty / NULL" values in the camera and variable filters
// (view.php:608 matches Camera_Model_Name = '' OR IS NULL; shown as "–").
const NONE_VALUE = '__none__';

// Day key used by the date filter: EXIF dates are stored as YYYY:MM:DD or, for
// files without EXIF, YYYY_MM_DD (lib_view.py:173-177). view.php:769 groups by
// substr(replace(Create_Date,':','-'),1,10); we also normalise '_'.
const DAY_EXPR = "substr(replace(replace(Create_Date, ':', '-'), '_', '-'), 1, 10)";

const router = express.Router();

/** Quote a value for a POSIX shell (single quotes, embedded ' escaped). */
function sq(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

/** Resolve a medium id (view.php:621-636) to its storage path, or null. */
function storagePathFor(req, medium) {
  if (!VIEW_MEDIA.includes(medium)) return null;
  const mediaDir = req.constants?.const_MEDIA_DIR || '/media';
  return path.join(mediaDir, mediumDirName(medium, req.constants));
}

// Resolve a request to a sqlite handle. Real mode uses the per-medium
// database file; mock mode uses an in-memory fixture so e2e tests behave the
// same way as the device.
async function openImageDb(req, medium) {
  const storagePath = storagePathFor(req, medium);
  if (!storagePath) return { db: null, exists: false, mock: false, storagePath: null, invalid: true };
  if (shouldUseMocks()) {
    return { db: await getMockViewDb(), exists: true, mock: true, storagePath };
  }
  const dbPath = path.join(storagePath, req.constants.const_IMAGE_DATABASE_FILENAME || 'images.db');
  if (!existsSync(dbPath)) return { db: null, exists: false, mock: false, storagePath };
  return { db: new sqlite3.Database(dbPath), exists: true, mock: false, storagePath };
}

function closeDb(handle) {
  if (handle?.db && !handle.mock) handle.db.close();
}

function dbHelpers(db) {
  return {
    all: promisify(db.all.bind(db)),
    get: promisify(db.get.bind(db)),
    run: (sql, params = []) =>
      new Promise((resolve, reject) => {
        db.run(sql, params, function cb(err) {
          if (err) reject(err);
          else resolve(this);
        });
      }),
  };
}

/** Column names of EXIF_DATA (view.php:821 PRAGMA table_info). */
async function exifColumns(all) {
  const rows = await all('PRAGMA table_info(EXIF_DATA)');
  return rows.map((r) => r.name);
}

// Date sort key: normalises the YYYY_MM_DD_HH_MM_SS fallback format to the
// EXIF "YYYY:MM:DD HH:MM:SS" form so files without EXIF sort among the rest
// instead of all landing at one end (raw text order puts '_' after ':').
const SORT_DATE_EXPR =
  "replace(replace(substr(Create_Date, 1, 10), '_', ':'), '-', ':') || ' ' || replace(substr(Create_Date, 12), '_', ':')";

const SORT_COLUMNS = {
  date: SORT_DATE_EXPR,
  filename: 'File_Name',
  id: 'ID',
};

const splitList = (value) =>
  String(value)
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

/**
 * Build WHERE clauses + bind values for /images and /stats. Mirrors the PHP
 * add_to_where() model (view.php:420-434, 592-618): every facet query applies
 * all active filters EXCEPT its own, so each dropdown shows counts that are
 * consistent with the other selections. `exclude` names the facet to skip.
 * `columns` validates the "any metadata field" filter against the schema.
 */
function buildImageFilters(query, { exclude = null, columns = null } = {}) {
  const where = [];
  const params = [];

  const {
    rating, date, date_from, date_to, filename, camera, file_type, directory,
    extension, social_publish, social_published, var_field, var_value,
  } = query;

  if (exclude !== 'rating' && rating) {
    const vals = splitList(rating)
      .map((r) => parseInt(r, 10))
      .filter((r) => !Number.isNaN(r) && r >= -1 && r <= 5);
    if (vals.length === 1) {
      where.push('LbbRating = ?');
      params.push(vals[0]);
    } else if (vals.length > 1) {
      where.push(`LbbRating IN (${vals.map(() => '?').join(',')})`);
      params.push(...vals);
    }
  }
  if (exclude !== 'date') {
    if (date) {
      where.push(`${DAY_EXPR} = ?`);
      params.push(String(date));
    }
    if (date_from) {
      where.push(`${DAY_EXPR} >= ?`);
      params.push(String(date_from));
    }
    if (date_to) {
      where.push(`${DAY_EXPR} <= ?`);
      params.push(String(date_to));
    }
  }
  if (filename) {
    where.push('File_Name LIKE ?');
    params.push(`%${filename}%`);
  }
  if (exclude !== 'camera' && camera) {
    if (camera === NONE_VALUE) {
      where.push("(Camera_Model_Name IS NULL OR Camera_Model_Name = '')");
    } else {
      where.push('Camera_Model_Name = ?');
      params.push(camera);
    }
  }
  if (exclude !== 'file_type' && file_type) {
    const vals = splitList(file_type);
    if (vals.length > 0) {
      where.push(`File_Type IN (${vals.map(() => '?').join(',')})`);
      params.push(...vals);
    }
  }
  if (exclude !== 'directory' && directory) {
    where.push('Directory = ?');
    params.push(directory);
  }
  if (exclude !== 'extension' && extension) {
    const vals = splitList(extension);
    if (vals.length > 0) {
      where.push(`File_Type_Extension IN (${vals.map(() => '?').join(',')})`);
      params.push(...vals);
    }
  }
  for (const column of ['social_publish', 'social_published']) {
    const value = column === 'social_publish' ? social_publish : social_published;
    if (exclude === column || !value) continue;
    const masks = splitList(value)
      .map((s) => maskFor(s))
      .filter((m) => m !== null);
    if (masks.length > 0) {
      where.push(`(${masks.map(() => `(${column} & ?) != 0`).join(' OR ')})`);
      params.push(...masks);
    }
  }
  if (exclude !== 'variable' && var_field && var_value !== undefined && var_value !== '' && columns?.includes(var_field)) {
    if (var_value === NONE_VALUE) {
      where.push(`("${var_field}" IS NULL OR "${var_field}" = '')`);
    } else {
      where.push(`"${var_field}" = ?`);
      params.push(String(var_value));
    }
  }

  const sql = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return { sql, params };
}

/** Same as buildImageFilters but appends an extra condition. */
function withCondition({ sql, params }, condition) {
  return { sql: sql ? `${sql} AND ${condition}` : ` WHERE ${condition}`, params };
}

// GET /view/media — the medium model of view.php:563-573 + 949-963: the five
// medium ids, which of them are mounted (df -h), whether NVMe exists
// (sub-common.php get_nvme_available) and the default selection.
router.get('/media', async (req, res) => {
  try {
    const dfResult = await execCommand('df -h', { logger: req.logger });
    const dfOutput = dfResult.success ? dfResult.stdout : '';

    const nvmeMask = req.constants?.const_STORAGE_NVME_MASK || 'nvme';
    let nvmeAvailable = false;
    try {
      const partResult = await execCommand(
        `sudo python3 ${req.WORKING_DIR}/lib_storage.py --Action get_available_partitions --skipMounted False --ignore-fs False`,
        { logger: req.logger }
      );
      if (partResult.success) {
        nvmeAvailable = partResult.stdout
          .trim()
          .split('\n')
          .some((p) => p.startsWith(`/dev/${nvmeMask}`));
      }
    } catch {
      nvmeAvailable = false;
    }

    const media = VIEW_MEDIA.filter((m) => nvmeAvailable || !NVME_MEDIA.includes(m));
    const mounted = mountedMediaFromDf(dfOutput, req.constants);
    const defaultMedium = defaultMediumFromDf(dfOutput, req.constants);

    res.json({
      media,
      mounted,
      default: media.includes(defaultMedium) ? defaultMedium : 'internal',
      nvmeAvailable,
    });
  } catch (error) {
    req.logger.error('Failed to get media', { error: error.message });
    res.status(500).json({ error: 'Failed to get media' });
  }
});

// GET /view/init?medium=… — view.php:644-646 runs lib_view.py --action init
// (creates/upgrades the EXIF_DATA schema) whenever a medium with a database
// is opened.
router.get('/init', async (req, res) => {
  try {
    const { medium } = req.query;
    const storagePath = storagePathFor(req, medium);
    if (!storagePath) {
      return res.status(400).json({ error: 'Valid medium required' });
    }

    const dbPath = path.join(storagePath, req.constants.const_IMAGE_DATABASE_FILENAME || 'images.db');
    if (!shouldUseMocks() && !existsSync(dbPath)) {
      return res.json({ success: true, dbExists: false });
    }

    const command = `sudo python3 ${req.WORKING_DIR}/lib_view.py --action init --mountpoint ${sq(storagePath)}`;
    const result = await execCommand(command, { logger: req.logger });
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to initialize view' });
    }
    res.json({ success: true, dbExists: true });
  } catch (error) {
    req.logger.error('Failed to initialize view', { error: error.message });
    res.status(500).json({ error: 'Failed to initialize view' });
  }
});

router.get('/images', async (req, res) => {
  try {
    const { medium, page = 1, per_page = 30, sort = 'date', dir = 'desc' } = req.query;

    const handle = await openImageDb(req, medium);
    if (handle.invalid) {
      return res.status(400).json({ error: 'Valid medium required' });
    }
    if (!handle.db) {
      return res.json({ images: [], count: 0, total: 0, dbExists: false });
    }
    const { all } = dbHelpers(handle.db);

    try {
      const columns = await exifColumns(all);
      const { sql: whereSql, params: whereParams } = buildImageFilters(req.query, { columns });

      const sortColumn = SORT_COLUMNS[String(sort).toLowerCase()] || SORT_COLUMNS.date;
      const sortDir = String(dir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const perPageNum = Math.min(1000, Math.max(1, parseInt(per_page, 10) || 30));
      const offset = (pageNum - 1) * perPageNum;

      const totalRow = await all(`SELECT COUNT(*) AS total FROM EXIF_DATA${whereSql}`, whereParams);
      const total = totalRow[0]?.total || 0;

      const images = await all(
        `SELECT * FROM EXIF_DATA${whereSql} ORDER BY ${sortColumn} ${sortDir}, ID ${sortDir} LIMIT ? OFFSET ?`,
        [...whereParams, perPageNum, offset]
      );

      res.json({ images, count: images.length, total, dbExists: true });
    } finally {
      closeDb(handle);
    }
  } catch (error) {
    req.logger.error('Failed to get images', { error: error.message });
    res.status(500).json({ error: 'Failed to get images' });
  }
});

// GET /view/stats — faceted filter options with counts (view.php:763-827).
// Each facet applies every active filter except its own.
router.get('/stats', async (req, res) => {
  try {
    const { medium, var_field } = req.query;

    const handle = await openImageDb(req, medium);
    if (handle.invalid) {
      return res.status(400).json({ error: 'Valid medium required' });
    }
    if (!handle.db) {
      return res.json({
        imagesAll: 0,
        total: 0,
        directories: [],
        ratings: [],
        dates: [],
        fileTypes: [],
        fileTypeExtensions: [],
        cameraModelNames: [],
        socialPublishPending: SOCIAL_SERVICES.map((service) => ({ service, bit: SOCIAL_SERVICE_BITS[service], count: 0 })),
        socialPublished: SOCIAL_SERVICES.map((service) => ({ service, bit: SOCIAL_SERVICE_BITS[service], count: 0 })),
        fields: [],
        variableValues: [],
      });
    }
    const { all } = dbHelpers(handle.db);

    try {
      const columns = await exifColumns(all);
      const facet = (exclude) => buildImageFilters(req.query, { exclude, columns });

      const grouped = async (exclude, expr) => {
        const { sql, params } = facet(exclude);
        return all(
          `SELECT ${expr} AS value, COUNT(ID) AS count FROM EXIF_DATA${sql} GROUP BY value ORDER BY value`,
          params
        );
      };

      const imagesAll = await all('SELECT COUNT(*) AS count FROM EXIF_DATA');
      const totalRow = await all(`SELECT COUNT(*) AS count FROM EXIF_DATA${facet(null).sql}`, facet(null).params);
      const ratings = await grouped('rating', 'LbbRating');
      const dates = (await grouped('date', DAY_EXPR)).reverse();
      const directories = await grouped('directory', 'Directory');
      const fileTypes = await grouped('file_type', 'File_Type');
      const fileTypeExtensions = await grouped('extension', 'File_Type_Extension');
      const cameraModelNames = await grouped('camera', "COALESCE(Camera_Model_Name, '')");

      // Per-service bit counts (view.php:781-819 WITH RECURSIVE bits …).
      const socialCounts = async (column) => {
        const out = [];
        for (const service of SOCIAL_SERVICES) {
          const { sql, params } = withCondition(facet(column), `(${column} & ?) != 0`);
          const row = await all(`SELECT COUNT(*) AS count FROM EXIF_DATA${sql}`, [...params, maskFor(service)]);
          out.push({ service, bit: SOCIAL_SERVICE_BITS[service], count: row[0]?.count || 0 });
        }
        return out;
      };
      const socialPublishPending = await socialCounts('social_publish');
      const socialPublished = await socialCounts('social_published');

      let variableValues = [];
      if (var_field && columns.includes(var_field)) {
        variableValues = await grouped('variable', `COALESCE("${var_field}", '')`);
        variableValues = variableValues.map((v) => ({ value: String(v.value), count: v.count }));
      }

      res.json({
        imagesAll: imagesAll[0]?.count || 0,
        total: totalRow[0]?.count || 0,
        ratings: ratings.map((r) => ({ value: Number(r.value), count: r.count })),
        dates: dates.filter((d) => d.value),
        directories: directories.filter((d) => d.value !== null),
        fileTypes: fileTypes.filter((f) => f.value !== null),
        fileTypeExtensions: fileTypeExtensions.filter((f) => f.value !== null),
        cameraModelNames,
        socialPublishPending,
        socialPublished,
        fields: [...columns].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())),
        variableValues,
      });
    } finally {
      closeDb(handle);
    }
  } catch (error) {
    req.logger.error('Failed to get stats', { error: error.message });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// GET /view/social-services — services shown in the Library: the configured
// ones from lib_socialmedia.py (sub-socialmedia.php get_social_services_configured,
// ';'-separated output) plus the bit of each service for the bitmask columns.
router.get('/social-services', async (req, res) => {
  try {
    const result = await execCommand(
      `python3 ${req.WORKING_DIR}/lib_socialmedia.py --action get_social_services_configured`,
      { logger: req.logger }
    );
    const configured = result.success
      ? result.stdout
          .trim()
          .split(/[;\n]/)
          .map((s) => s.trim())
          .filter((s) => SOCIAL_SERVICES.includes(s))
      : [];
    res.json({ configured, services: SOCIAL_SERVICES, bits: SOCIAL_SERVICE_BITS });
  } catch (error) {
    req.logger.error('Failed to get social services', { error: error.message });
    res.status(500).json({ error: 'Failed to get social services' });
  }
});

/** Media details for the single view: kind and low-resolution notices. */
function describeMedia(req, row, storagePath, mock) {
  const kind = classifyMedia(row.File_Name, req.constants);
  let lowResVideo = false;
  if (kind === 'video' && isGoProH265(row)) {
    if (mock) {
      lowResVideo = true;
    } else {
      const lrv = goProLrvName(row.File_Name);
      lowResVideo = Boolean(lrv && existsSync(path.join(storagePath, row.Directory || '', lrv)));
    }
  }
  return { kind, lowResImage: showsLowResImageNotice(kind), lowResVideo };
}

// GET /view/details?medium&id — the full EXIF_DATA row plus what the stage
// needs to render it (view.php:1251-1387).
router.get('/details', async (req, res) => {
  try {
    const { medium, id } = req.query;
    const handle = await openImageDb(req, medium);
    if (handle.invalid) return res.status(400).json({ error: 'Valid medium required' });
    if (!handle.db) return res.status(404).json({ error: 'Database not found' });
    const { get } = dbHelpers(handle.db);
    try {
      const row = await get('SELECT * FROM EXIF_DATA WHERE ID = ?', [id]);
      if (!row) return res.status(404).json({ error: 'Image not found' });
      res.json({ image: row, media: describeMedia(req, row, handle.storagePath, handle.mock) });
    } finally {
      closeDb(handle);
    }
  } catch (error) {
    req.logger.error('Failed to get image details', { error: error.message });
    res.status(500).json({ error: 'Failed to get image details' });
  }
});

function writeRatingToExif(config) {
  const v = config?.conf_VIEW_WRITE_RATING_EXIF;
  return v === true || v === 'true' || v === '1' || v === 1;
}

// POST /view/rating { medium, imageId, rating?, comment? }
// Mirrors view.php:662-713:
//  - LbbRating is always updated;
//  - only when conf_VIEW_WRITE_RATING_EXIF is 'true' is the EXIF `Rating`
//    column updated too and lib_metadata.py --rating called;
//  - a changed comment always goes to the DB and lib_metadata.py --comment.
router.post('/rating', async (req, res) => {
  try {
    const { medium, imageId, rating, comment } = req.body || {};
    if (imageId === undefined || imageId === null) {
      return res.status(400).json({ error: 'Image ID required' });
    }
    const handle = await openImageDb(req, medium);
    if (handle.invalid) return res.status(400).json({ error: 'Valid medium required' });
    if (!handle.db) return res.status(404).json({ error: 'Database not found' });
    const { get, run } = dbHelpers(handle.db);

    try {
      const image = await get(
        'SELECT Directory, File_Name, Rating, LbbRating, Comment FROM EXIF_DATA WHERE ID = ?',
        [imageId]
      );
      if (!image) return res.status(404).json({ error: 'Image not found' });

      const update = {};
      if (rating !== undefined && rating !== null) {
        const r = parseInt(rating, 10);
        if (Number.isNaN(r) || r < -1 || r > 5) {
          return res.status(400).json({ error: 'Rating must be between -1 and 5' });
        }
        if (writeRatingToExif(req.config)) {
          if (Number(image.LbbRating) !== r || String(image.Rating) !== String(r)) {
            update.LbbRating = r;
            update.Rating = r;
          }
        } else if (Number(image.LbbRating) !== r) {
          update.LbbRating = r;
        }
      }
      if (comment !== undefined && comment !== null) {
        const c = String(comment).trim();
        if (c !== (image.Comment ?? '')) update.Comment = c;
      }

      const cols = Object.keys(update);
      if (cols.length === 0) {
        return res.json({ success: true, changed: false });
      }

      await run(
        `UPDATE EXIF_DATA SET ${cols.map((c) => `"${c}" = ?`).join(', ')} WHERE ID = ?`,
        [...cols.map((c) => update[c]), imageId]
      );

      // Write into the file's metadata (view.php:705-712).
      const args = [];
      if (update.Comment !== undefined) args.push(`--comment ${sq(update.Comment)}`);
      if (update.Rating !== undefined) args.push(`--rating ${sq(update.Rating)}`);
      if (args.length > 0) {
        const imagePath = path.join(handle.storagePath, image.Directory || '', image.File_Name);
        await execCommand(
          `sudo python3 ${req.WORKING_DIR}/lib_metadata.py ${sq(imagePath)} ${args.join(' ')}`,
          { logger: req.logger }
        );
      }

      res.json({ success: true, changed: true, updated: update });
    } finally {
      closeDb(handle);
    }
  } catch (error) {
    req.logger.error('Failed to set rating', { error: error.message });
    res.status(500).json({ error: 'Failed to set rating' });
  }
});

// POST /view/social-publish { medium, imageId, service, publish }
// Toggles the service's bit in EXIF_DATA.social_publish (view.php:552-559,
// 694-698). The next backup run (backup.py:804-834) posts queued images and
// sets the matching bit in social_published.
router.post('/social-publish', async (req, res) => {
  try {
    const { medium, imageId, service, publish } = req.body || {};
    const mask = maskFor(service);
    if (imageId === undefined || imageId === null || mask === null) {
      return res.status(400).json({ error: 'Image ID and a known service are required' });
    }
    const handle = await openImageDb(req, medium);
    if (handle.invalid) return res.status(400).json({ error: 'Valid medium required' });
    if (!handle.db) return res.status(404).json({ error: 'Database not found' });
    const { get, run } = dbHelpers(handle.db);
    try {
      const row = await get('SELECT social_publish, social_published FROM EXIF_DATA WHERE ID = ?', [imageId]);
      if (!row) return res.status(404).json({ error: 'Image not found' });
      const current = Number(row.social_publish) || 0;
      const next = publish ? current | mask : current & ~mask;
      if (next !== current) {
        await run('UPDATE EXIF_DATA SET social_publish = ? WHERE ID = ?', [next, imageId]);
      }
      res.json({ success: true, social_publish: next, social_published: Number(row.social_published) || 0 });
    } finally {
      closeDb(handle);
    }
  } catch (error) {
    req.logger.error('Failed to update social publish state', { error: error.message });
    res.status(500).json({ error: 'Failed to update social publish state' });
  }
});

// POST /view/delete-rejected { medium, ids: [...] }
// view.php:718-735: for the rejected images ON THE CURRENT PAGE, remove the
// file, its tims/<file>.JPG thumbnail and <base>.xmp sidecar, then delete the
// DB row. Only rows that are still rejected (LbbRating = -1) are touched.
router.post('/delete-rejected', async (req, res) => {
  try {
    const { medium, ids } = req.body || {};
    const idList = (Array.isArray(ids) ? ids : [])
      .map((id) => parseInt(id, 10))
      .filter((id) => !Number.isNaN(id));
    if (idList.length === 0) {
      return res.status(400).json({ error: 'No image IDs given' });
    }
    const handle = await openImageDb(req, medium);
    if (handle.invalid) return res.status(400).json({ error: 'Valid medium required' });
    if (!handle.db) return res.status(404).json({ error: 'Database not found' });
    const { get, run } = dbHelpers(handle.db);

    let deleted = 0;
    const errors = [];
    try {
      for (const id of idList) {
        const image = await get(
          'SELECT ID, File_Name, Directory FROM EXIF_DATA WHERE ID = ? AND LbbRating = -1',
          [id]
        );
        if (!image) continue;
        const dir = path.join(handle.storagePath, image.Directory || '');
        const filePath = path.join(dir, image.File_Name);
        const timsPath = path.join(dir, 'tims', `${image.File_Name}.JPG`);
        const xmpPath = path.join(dir, `${path.parse(image.File_Name).name}.xmp`);
        try {
          const result = await execCommand(`sudo rm ${sq(filePath)}`, { logger: req.logger });
          if (!result.success) throw new Error(result.stderr || 'rm failed');
          // Thumbnail and sidecar are optional; ignore "not found".
          await execCommand(`sudo rm -f ${sq(timsPath)}`, { logger: req.logger });
          await execCommand(`sudo rm -f ${sq(xmpPath)}`, { logger: req.logger });
          // Mock mode keeps the shared fixture intact so parallel e2e runs
          // stay deterministic; the commands above are still exercised.
          if (!handle.mock) {
            await run('DELETE FROM EXIF_DATA WHERE ID = ? AND LbbRating = -1', [id]);
          }
          deleted++;
        } catch (err) {
          errors.push(image.File_Name);
          req.logger.error('Failed to delete image', { file: image.File_Name, error: err.message });
        }
      }
    } finally {
      closeDb(handle);
    }

    if (errors.length > 0) {
      return res.json({ success: false, deleted, error: `${errors.length} file(s) could not be deleted` });
    }
    res.json({ success: true, deleted });
  } catch (error) {
    req.logger.error('Failed to delete rejected images', { error: error.message });
    res.status(500).json({ error: 'Failed to delete rejected images' });
  }
});

const MEDIA_MIME_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.tiff': 'image/tiff',
  '.tif': 'image/tiff', '.bmp': 'image/bmp', '.heic': 'image/heic',
  '.heif': 'image/heif', '.raw': 'image/raw',
  '.cr2': 'image/x-canon-cr2', '.nef': 'image/x-nikon-nef',
  '.mp4': 'video/mp4', '.lrv': 'video/mp4', '.m4v': 'video/mp4',
  '.mov': 'video/quicktime', '.avi': 'video/x-msvideo', '.webm': 'video/webm',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg',
  // Text is always served as plain text so an .html file from a card can't
  // run script in the app's origin.
  '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8', '.html': 'text/plain; charset=utf-8',
};

function mimeFor(file) {
  return MEDIA_MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

/**
 * Serve a file with HTTP Range support (res.sendFile handles Range,
 * If-None-Match and If-Modified-Since), so <video>/<audio> can seek.
 */
function sendMedia(res, filePath, { download = false, downloadName } = {}) {
  res.setHeader('Content-Type', mimeFor(filePath));
  if (download) res.attachment(downloadName || path.basename(filePath));
  res.sendFile(filePath, {
    acceptRanges: true,
    cacheControl: false,
    headers: { 'Cache-Control': 'private, max-age=86400' },
  });
}

// GET /view/image?medium&id&variant=thumb|display|original[&download=1]
//  thumb    tims/<file>.JPG (grid; view.php:1192, 1206)
//  display  what the single view shows (view.php:1262-1368): web images and
//           audio/video as-is, RAW/HEIC/TIF/text via tims/, GoPro H.265 via
//           the .LRV proxy when present
//  original the untouched file (the "Download original" link, view.php:364-369)
router.get('/image', async (req, res) => {
  try {
    const { medium, id } = req.query;
    const variant = ['thumb', 'display', 'original'].includes(req.query.variant) ? req.query.variant : 'original';
    const download = req.query.download === '1' || req.query.download === 'true';

    if (!medium || !id) {
      return res.status(400).json({ error: 'medium and id are required' });
    }

    if (shouldUseMocks()) {
      const row = getMockViewRow(id);
      const asset = mockAssetFor(row, variant);
      if (variant === 'thumb') res.setHeader('X-Thumbnail-Status', asset ? 'ok' : 'missing');
      if (!asset) return res.status(404).json({ error: 'file_missing' });
      return sendMedia(res, path.join(MOCK_MEDIA_DIR, asset), {
        download,
        downloadName: download ? row.File_Name : undefined,
      });
    }

    const handle = await openImageDb(req, medium);
    if (handle.invalid) return res.status(400).json({ error: 'Valid medium required' });
    if (!handle.db) return res.status(404).json({ error: 'file_missing' });
    const { get } = dbHelpers(handle.db);
    let image;
    try {
      image = await get('SELECT * FROM EXIF_DATA WHERE ID = ?', [id]);
    } finally {
      closeDb(handle);
    }
    if (!image) {
      return res.status(404).json({ error: 'file_missing' });
    }

    const dir = path.join(handle.storagePath, image.Directory || '');
    const originalPath = path.join(dir, image.File_Name);
    // Thumbnails are generated by backup.py into <dir>/tims/<filename>.JPG.
    const timsPath = path.join(dir, 'tims', `${image.File_Name}.JPG`);
    const kind = classifyMedia(image.File_Name, req.constants);

    let servedPath = originalPath;
    if (variant === 'thumb') {
      const ok = existsSync(timsPath);
      res.setHeader('X-Thumbnail-Status', ok ? 'ok' : 'missing');
      if (!ok) return res.status(404).json({ error: 'file_missing' });
      servedPath = timsPath;
    } else if (variant === 'display') {
      if (kind === 'raw' || kind === 'heic' || kind === 'tif' || kind === 'text' || kind === 'other') {
        servedPath = timsPath;
      } else if (kind === 'video' && isGoProH265(image)) {
        const lrv = goProLrvName(image.File_Name);
        if (lrv && existsSync(path.join(dir, lrv))) servedPath = path.join(dir, lrv);
      }
    }

    if (!existsSync(servedPath)) {
      return res.status(404).json({ error: 'file_missing' });
    }
    sendMedia(res, servedPath, { download, downloadName: image.File_Name });
  } catch (error) {
    req.logger.error('Failed to serve image', { error: error.message });
    if (!res.headersSent) res.status(500).json({ error: 'Failed to serve image' });
  }
});

export default router;
