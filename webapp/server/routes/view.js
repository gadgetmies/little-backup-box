import express from 'express';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { execCommand } from '../utils/execCommand.js';
import { existsSync, statSync } from 'fs';
import { shouldUseMocks } from '../utils/systemDetector.js';
import { SOCIAL_SERVICES, maskFor } from '../utils/socialServiceBits.js';
import { getMockViewDb } from '../utils/viewMockDb.js';

// 1×1 transparent PNG. Used for mock-mode thumbnail and image responses so
// e2e tests have a deterministic, dependency-free image payload.
const MOCK_TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=',
  'base64'
);

const router = express.Router();

// Resolve a request to a sqlite handle. Real mode uses the per-medium
// database file under MEDIA_DIR; mock mode uses an in-memory fixture so
// e2e tests and the static GitHub Pages build behave identically.
async function openImageDb(req, { medium, storagePath: storagePathParam }) {
  if (shouldUseMocks()) {
    return { db: await getMockViewDb(), exists: true, mock: true };
  }
  const storagePath = storagePathParam || (medium ? path.join(req.constants.const_MEDIA_DIR || '/media', medium) : null);
  if (!storagePath) return { db: null, exists: false, mock: false };
  const dbPath = path.join(storagePath, req.constants.const_IMAGE_DATABASE_FILENAME);
  if (!existsSync(dbPath)) return { db: null, exists: false, mock: false, storagePath };
  return { db: new sqlite3.Database(dbPath), exists: true, mock: false, storagePath };
}

const SORT_COLUMNS = {
  date: 'Create_Date',
  filename: 'File_Name',
  id: 'ID',
};

// Build WHERE clauses + bind values for the /images and /stats handlers.
// Mirrors the PHP form in scripts/view.php:595-611. Returns { sql, params }.
function buildImageFilters(query) {
  const where = [];
  const params = [];

  const { rating, date_from, date_to, filename, camera, file_type, directory, extension, social_publish, social_published } = query;

  if (rating) {
    const ratingVals = String(rating)
      .split(',')
      .map((r) => parseInt(r, 10))
      .filter((r) => !Number.isNaN(r));
    if (ratingVals.length === 1) {
      where.push('LbbRating = ?');
      params.push(ratingVals[0]);
    } else if (ratingVals.length > 1) {
      where.push(`LbbRating IN (${ratingVals.map(() => '?').join(',')})`);
      params.push(...ratingVals);
    }
  }
  if (date_from) {
    where.push('Create_Date >= ?');
    params.push(date_from);
  }
  if (date_to) {
    where.push('Create_Date <= ?');
    params.push(date_to);
  }
  if (filename) {
    where.push('File_Name LIKE ?');
    params.push(`%${filename}%`);
  }
  if (camera) {
    where.push('Camera_Model_Name = ?');
    params.push(camera);
  }
  if (file_type) {
    const ftVals = String(file_type)
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    if (ftVals.length === 1) {
      where.push('File_Type = ?');
      params.push(ftVals[0]);
    } else if (ftVals.length > 1) {
      where.push(`File_Type IN (${ftVals.map(() => '?').join(',')})`);
      params.push(...ftVals);
    }
  }
  if (directory) {
    where.push('Directory = ?');
    params.push(directory);
  }
  if (extension) {
    const extVals = String(extension)
      .split(',')
      .map((e) => e.trim())
      .filter(Boolean);
    if (extVals.length === 1) {
      where.push('File_Type_Extension = ?');
      params.push(extVals[0]);
    } else if (extVals.length > 1) {
      where.push(`File_Type_Extension IN (${extVals.map(() => '?').join(',')})`);
      params.push(...extVals);
    }
  }
  if (social_publish) {
    const masks = String(social_publish)
      .split(',')
      .map((s) => maskFor(s.trim()))
      .filter((m) => m !== null);
    if (masks.length > 0) {
      where.push(`(${masks.map(() => '(social_publish & ?) != 0').join(' OR ')})`);
      params.push(...masks);
    }
  }
  if (social_published) {
    const masks = String(social_published)
      .split(',')
      .map((s) => maskFor(s.trim()))
      .filter((m) => m !== null);
    if (masks.length > 0) {
      where.push(`(${masks.map(() => '(social_published & ?) != 0').join(' OR ')})`);
      params.push(...masks);
    }
  }

  const sql = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : '';
  return { sql, params };
}

router.get('/media', async (req, res) => {
  try {
    const nvmeMask = req.constants?.const_STORAGE_NVME_MASK || 'nvme';

    // Check mounted media by listing mounts
    const mountResult = await execCommand(
      `sudo python3 ${req.WORKING_DIR}/lib_storage.py --Action get_mounts_list`,
      { logger: req.logger }
    );

    const mountsList = mountResult.success ? mountResult.stdout.trim() : '';

    // Check for NVMe availability via partition listing
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

    // USB is available when any USB-like mount is present
    const usbAvailable = mountsList.toLowerCase().includes('usb');
    // Internal storage is considered available when nvme or internal mount is present
    const internalAvailable =
      mountsList.toLowerCase().includes('internal') ||
      mountsList.toLowerCase().includes('nvme');

    res.json({
      media: ['usb', 'nvme', 'internal'],
      available: {
        usb: usbAvailable,
        nvme: nvmeAvailable,
        internal: internalAvailable,
      },
    });
  } catch (error) {
    req.logger.error('Failed to get media', { error: error.message });
    res.status(500).json({ error: 'Failed to get media' });
  }
});

router.get('/images', async (req, res) => {
  try {
    const {
      medium,
      storagePath,
      page = 1,
      per_page = 25,
      sort = 'date',
      dir = 'desc',
    } = req.query;

    if (!medium && !storagePath) {
      return res.status(400).json({ error: 'medium or storagePath required' });
    }

    const handle = await openImageDb(req, { medium, storagePath });
    if (!handle.db) {
      return res.json({ images: [], count: 0, total: 0, dbExists: false });
    }
    const db = handle.db;
    const dbAll = promisify(db.all.bind(db));

    const { sql: whereSql, params: whereParams } = buildImageFilters(req.query);

    const sortColumn = SORT_COLUMNS[String(sort).toLowerCase()] || SORT_COLUMNS.date;
    const sortDir = String(dir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const perPageNum = Math.max(1, parseInt(per_page, 10) || 25);
    const offset = (pageNum - 1) * perPageNum;

    const totalRow = await dbAll(`SELECT COUNT(*) AS total FROM EXIF_DATA${whereSql}`, whereParams);
    const total = totalRow[0]?.total || 0;

    const images = await dbAll(
      `SELECT * FROM EXIF_DATA${whereSql} ORDER BY ${sortColumn} ${sortDir}, ID ${sortDir} LIMIT ? OFFSET ?`,
      [...whereParams, perPageNum, offset]
    );

    if (!handle.mock) db.close();

    res.json({ images, count: images.length, total, dbExists: true });
  } catch (error) {
    req.logger.error('Failed to get images', { error: error.message });
    res.status(500).json({ error: 'Failed to get images' });
  }
});

router.get('/init', async (req, res) => {
  try {
    const { mountpoint } = req.query;
    
    if (!mountpoint) {
      return res.status(400).json({ error: 'Mountpoint required' });
    }
    
    const command = `sudo python3 ${req.WORKING_DIR}/lib_view.py --action init --mountpoint ${mountpoint}`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to initialize view' });
    }
    
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Failed to initialize view', { error: error.message });
    res.status(500).json({ error: 'Failed to initialize view' });
  }
});

router.post('/update-metadata', async (req, res) => {
  try {
    const { storagePath, imageId, comment, rating } = req.body;

    if (!storagePath || !imageId) {
      return res.status(400).json({ error: 'Storage path and image ID required' });
    }

    const dbPath = path.join(storagePath, req.constants.const_IMAGE_DATABASE_FILENAME);

    if (!existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database not found' });
    }
    
    const db = new sqlite3.Database(dbPath);
    const dbGet = promisify(db.get.bind(db));
    const dbRun = promisify(db.run.bind(db));
    
    const image = await dbGet('SELECT * FROM EXIF_DATA WHERE ID = ?', [imageId]);
    
    if (!image) {
      db.close();
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const imagePath = path.join(storagePath, image.Directory, image.File_Name);
    
    if (comment !== undefined) {
      const command = `sudo python3 ${req.WORKING_DIR}/lib_metadata.py '${imagePath}' --comment '${comment.replace(/'/g, "'\\''")}'`;
      await execCommand(command, { logger: req.logger });
    }
    
    if (rating !== undefined) {
      const command = `sudo python3 ${req.WORKING_DIR}/lib_metadata.py '${imagePath}' --rating '${rating}'`;
      await execCommand(command, { logger: req.logger });
    }
    
    if (comment !== undefined && rating !== undefined) {
      await dbRun(
        'UPDATE EXIF_DATA SET Comment = ?, LbbRating = ? WHERE ID = ?',
        [comment, rating, imageId]
      );
    } else if (comment !== undefined) {
      await dbRun('UPDATE EXIF_DATA SET Comment = ? WHERE ID = ?', [comment, imageId]);
    } else if (rating !== undefined) {
      await dbRun('UPDATE EXIF_DATA SET LbbRating = ? WHERE ID = ?', [rating, imageId]);
    }
    
    db.close();
    
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Failed to update metadata', { error: error.message });
    res.status(500).json({ error: 'Failed to update metadata' });
  }
});

router.post('/delete-image', async (req, res) => {
  try {
    const { storagePath, imageId } = req.body;
    
    if (!storagePath || !imageId) {
      return res.status(400).json({ error: 'Storage path and image ID required' });
    }
    
    const dbPath = path.join(storagePath, req.constants.const_IMAGE_DATABASE_FILENAME);
    
    if (!existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database not found' });
    }
    
    const db = new sqlite3.Database(dbPath);
    const dbGet = promisify(db.get.bind(db));
    const dbRun = promisify(db.run.bind(db));
    
    const image = await dbGet('SELECT * FROM EXIF_DATA WHERE ID = ?', [imageId]);
    
    if (!image) {
      db.close();
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const imagePath = path.join(storagePath, image.Directory, image.File_Name);
    const baseName = path.basename(imagePath, path.extname(imagePath));
    const dir = path.dirname(imagePath);
    
    const deleteFile = imagePath;
    const deleteTims = path.join(dir, `${baseName}.tims`);
    const deleteXmp = path.join(dir, `${baseName}.xmp`);
    
    await execCommand(`sudo rm '${deleteFile}'`, { logger: req.logger });
    await execCommand(`sudo rm '${deleteTims}'`, { logger: req.logger });
    await execCommand(`sudo rm '${deleteXmp}'`, { logger: req.logger });
    
    await dbRun('DELETE FROM EXIF_DATA WHERE ID = ? AND LbbRating = -1', [imageId]);
    
    db.close();
    
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Failed to delete image', { error: error.message });
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const { medium, storagePath } = req.query;

    if (!medium && !storagePath) {
      return res.status(400).json({ error: 'medium or storagePath required' });
    }

    const handle = await openImageDb(req, { medium, storagePath });
    if (!handle.db) {
      return res.json({
        imagesAll: 0,
        directories: [],
        ratings: [],
        dates: [],
        fileTypes: [],
        fileTypeExtensions: [],
        cameraModelNames: [],
        socialPublishPending: SOCIAL_SERVICES.map((service) => ({ service, count: 0 })),
        socialPublished: SOCIAL_SERVICES.map((service) => ({ service, count: 0 })),
      });
    }
    const db = handle.db;
    const dbAll = promisify(db.all.bind(db));

    const imagesAll = await dbAll('SELECT COUNT(*) as count FROM EXIF_DATA');
    const directories = await dbAll('SELECT DISTINCT Directory FROM EXIF_DATA WHERE Directory IS NOT NULL ORDER BY Directory');
    const ratings = await dbAll('SELECT LbbRating, COUNT(*) as count FROM EXIF_DATA GROUP BY LbbRating');
    const dates = await dbAll('SELECT DISTINCT Create_Date FROM EXIF_DATA WHERE Create_Date IS NOT NULL ORDER BY Create_Date');
    const fileTypes = await dbAll('SELECT DISTINCT File_Type FROM EXIF_DATA WHERE File_Type IS NOT NULL ORDER BY File_Type');
    // Column is File_Type_Extension per scripts/lib_view.py:74; the previous
    // SELECT DISTINCT File_Extension was a pre-existing bug (no such column).
    const fileTypeExtensions = await dbAll('SELECT DISTINCT File_Type_Extension FROM EXIF_DATA WHERE File_Type_Extension IS NOT NULL ORDER BY File_Type_Extension');
    const cameraModelNames = await dbAll('SELECT DISTINCT Camera_Model_Name FROM EXIF_DATA WHERE Camera_Model_Name IS NOT NULL ORDER BY Camera_Model_Name');

    // Per-service publish-state aggregates. Always emit one entry per service
    // (count: 0 when none) so the FilterBar can render a complete service list.
    const socialPublishPending = [];
    const socialPublished = [];
    for (const service of SOCIAL_SERVICES) {
      const mask = maskFor(service);
      const pending = await dbAll('SELECT COUNT(*) as count FROM EXIF_DATA WHERE (social_publish & ?) != 0', [mask]);
      const published = await dbAll('SELECT COUNT(*) as count FROM EXIF_DATA WHERE (social_published & ?) != 0', [mask]);
      socialPublishPending.push({ service, count: pending[0]?.count || 0 });
      socialPublished.push({ service, count: published[0]?.count || 0 });
    }

    if (!handle.mock) db.close();

    res.json({
      imagesAll: imagesAll[0]?.count || 0,
      directories: directories.map((d) => d.Directory),
      ratings,
      dates: dates.map((d) => d.Create_Date),
      fileTypes: fileTypes.map((f) => f.File_Type),
      fileTypeExtensions: fileTypeExtensions.map((f) => f.File_Type_Extension),
      cameraModelNames: cameraModelNames.map((c) => c.Camera_Model_Name),
      socialPublishPending,
      socialPublished,
    });
  } catch (error) {
    req.logger.error('Failed to get stats', { error: error.message });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

router.post('/rating', async (req, res) => {
  try {
    const { medium, storagePath: storagePathParam, imageId, rating, comment } = req.body;
    const storagePath = storagePathParam || (medium ? path.join(req.constants.const_MEDIA_DIR || '/media', medium) : null);

    if (!storagePath || imageId === undefined || imageId === null) {
      return res.status(400).json({ error: 'Storage path and image ID required' });
    }

    const dbPath = path.join(storagePath, req.constants.const_IMAGE_DATABASE_FILENAME);

    if (!existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database not found' });
    }

    const db = new sqlite3.Database(dbPath);
    const dbGet = promisify(db.get.bind(db));
    const dbRun = promisify(db.run.bind(db));

    const image = await dbGet('SELECT * FROM EXIF_DATA WHERE ID = ?', [imageId]);

    if (!image) {
      db.close();
      return res.status(404).json({ error: 'Image not found' });
    }

    const imagePath = path.join(storagePath, image.Directory, image.File_Name);

    const args = [`'${imagePath}'`];
    if (rating !== undefined) {
      args.push(`--rating '${rating}'`);
    }
    if (comment !== undefined) {
      args.push(`--comment '${comment.replace(/'/g, "'\\''")}'`);
    }
    if (req.config.conf_WRITE_EXIF_RATING === 'true') {
      // lib_metadata.py doesn't have --write-exif flag; EXIF embedding is the default
      // behaviour when not a RAW file; for RAW files it writes XMP sidecars automatically
    }

    const command = `sudo python3 ${req.WORKING_DIR}/lib_metadata.py ${args.join(' ')}`;
    await execCommand(command, { logger: req.logger });

    if (rating !== undefined && comment !== undefined) {
      await dbRun(
        'UPDATE EXIF_DATA SET LbbRating = ?, Comment = ? WHERE ID = ?',
        [rating, comment, imageId]
      );
    } else if (rating !== undefined) {
      await dbRun('UPDATE EXIF_DATA SET LbbRating = ? WHERE ID = ?', [rating, imageId]);
    } else if (comment !== undefined) {
      await dbRun('UPDATE EXIF_DATA SET Comment = ? WHERE ID = ?', [comment, imageId]);
    }

    db.close();

    res.json({ success: true });
  } catch (error) {
    req.logger.error('Failed to set rating', { error: error.message });
    res.status(500).json({ error: 'Failed to set rating' });
  }
});

router.post('/delete-rejected', async (req, res) => {
  try {
    const { medium, storagePath: storagePathParam } = req.body;
    const storagePath = storagePathParam || (medium ? path.join(req.constants.const_MEDIA_DIR || '/media', medium) : null);

    if (!storagePath) {
      return res.status(400).json({ error: 'Storage path required' });
    }

    const dbPath = path.join(storagePath, req.constants.const_IMAGE_DATABASE_FILENAME);

    if (!existsSync(dbPath)) {
      return res.status(404).json({ error: 'Database not found' });
    }

    const db = new sqlite3.Database(dbPath);
    const dbAll = promisify(db.all.bind(db));
    const dbRun = promisify(db.run.bind(db));

    const rejectedImages = await dbAll(
      'SELECT * FROM EXIF_DATA WHERE LbbRating = -1'
    );

    let deleted = 0;
    const errors = [];

    for (const image of rejectedImages) {
      try {
        const imagePath = path.join(storagePath, image.Directory, image.File_Name);
        const baseName = path.basename(imagePath, path.extname(imagePath));
        const dir = path.dirname(imagePath);
        const timsPath = path.join(dir, 'tims', `${image.File_Name}.JPG`);
        const xmpPath = path.join(dir, `${baseName}.xmp`);

        await execCommand(`sudo rm -f '${imagePath}'`, { logger: req.logger });
        await execCommand(`sudo rm -f '${timsPath}'`, { logger: req.logger });
        await execCommand(`sudo rm -f '${xmpPath}'`, { logger: req.logger });

        await dbRun('DELETE FROM EXIF_DATA WHERE ID = ? AND LbbRating = -1', [image.ID]);
        deleted++;
      } catch (err) {
        errors.push(image.File_Name);
        req.logger.error('Failed to delete image', { file: image.File_Name, error: err.message });
      }
    }

    db.close();

    if (errors.length > 0) {
      return res.json({
        success: false,
        deleted,
        error: `${errors.length} file(s) could not be deleted`,
      });
    }

    res.json({ success: true, deleted });
  } catch (error) {
    req.logger.error('Failed to delete rejected images', { error: error.message });
    res.status(500).json({ error: 'Failed to delete rejected images' });
  }
});

const IMAGE_MIME_TYPES = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.gif': 'image/gif', '.webp': 'image/webp', '.tiff': 'image/tiff',
  '.tif': 'image/tiff', '.bmp': 'image/bmp', '.heic': 'image/heic',
  '.heif': 'image/heif', '.raw': 'image/raw',
  '.cr2': 'image/x-canon-cr2', '.nef': 'image/x-nikon-nef',
};

router.get('/image', async (req, res) => {
  try {
    const { medium, id, variant } = req.query;

    if (!medium || !id) {
      return res.status(400).json({ error: 'medium and id are required' });
    }

    const isThumb = variant === 'thumb';

    // Mock mode: serve a tiny inline PNG for both variants. Mirrors the shape
    // tests expect (status header + 200 body) without depending on real media.
    if (shouldUseMocks()) {
      res.setHeader('X-Thumbnail-Status', isThumb ? 'ok' : 'missing');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.setHeader('ETag', `W/"mock-${id}-${isThumb ? 'thumb' : 'full'}"`);
      if (req.headers['if-none-match'] === res.getHeader('ETag')) {
        return res.status(304).end();
      }
      return res.end(MOCK_TRANSPARENT_PNG);
    }

    const storagePath = path.join(req.constants.const_MEDIA_DIR || '/media', medium);
    const dbPath = path.join(storagePath, req.constants.const_IMAGE_DATABASE_FILENAME);

    if (!existsSync(dbPath)) {
      return res.status(404).json({ error: 'file_missing' });
    }

    const db = new sqlite3.Database(dbPath);
    const dbGet = promisify(db.get.bind(db));
    const image = await dbGet('SELECT * FROM EXIF_DATA WHERE ID = ?', [id]);
    db.close();

    if (!image) {
      return res.status(404).json({ error: 'file_missing' });
    }

    // Pick the file to serve. For variant=thumb, prefer the existing TIMS
    // thumbnail (generated by scripts/backup.py:generateThumbnails into
    // <dir>/tims/<filename>.JPG, ≤ 800 px JPEG). Fall back to the original
    // when TIMS is missing so the grid still renders something.
    const originalPath = path.join(storagePath, image.Directory, image.File_Name);
    const tims_path = path.join(storagePath, image.Directory, 'tims', `${image.File_Name}.JPG`);
    let servedPath = originalPath;
    let thumbStatus = 'missing';
    let mimeType = IMAGE_MIME_TYPES[path.extname(image.File_Name).toLowerCase()] || 'application/octet-stream';

    if (isThumb && existsSync(tims_path)) {
      servedPath = tims_path;
      thumbStatus = 'ok';
      mimeType = 'image/jpeg';
    } else if (isThumb) {
      req.logger.debug('TIMS thumbnail missing', { medium, id, tims_path });
    }

    if (!existsSync(servedPath)) {
      return res.status(404).json({ error: 'file_missing' });
    }

    // ETag from served file's mtime+size. Same shape Express uses for static files.
    const stat = statSync(servedPath);
    const etag = `W/"${stat.size}-${Math.floor(stat.mtimeMs)}"`;
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    if (isThumb) res.setHeader('X-Thumbnail-Status', thumbStatus);
    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', mimeType);
    res.sendFile(servedPath);
  } catch (error) {
    req.logger.error('Failed to serve image', { error: error.message });
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

export default router;

