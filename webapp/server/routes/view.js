import express from 'express';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import { execCommand } from '../utils/execCommand.js';
import { existsSync } from 'fs';

const router = express.Router();

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
      page = 1,
      per_page = 25,
      sort = 'date',
      dir = 'desc',
    } = req.query;

    if (!medium) {
      // Legacy path: support old storagePath-based query
      const {
        storagePath,
        filterRating = -1,
        filterImagesPerPage = 50,
        selectOffset = 0,
        orderBy = 'ID',
        orderDir = 'ASC',
      } = req.query;

      if (!storagePath) {
        return res.status(400).json({ error: 'medium or storagePath required' });
      }

      const dbPath = path.join(
        storagePath,
        req.constants.const_IMAGE_DATABASE_FILENAME
      );

      if (!existsSync(dbPath)) {
        return res.json({ images: [], count: 0, total: 0, dbExists: false });
      }

      const db = new sqlite3.Database(dbPath);
      const dbAll = promisify(db.all.bind(db));

      let query = 'SELECT * FROM EXIF_DATA WHERE 1=1';
      const params = [];

      if (filterRating !== '-1' && filterRating !== -1) {
        query += ' AND LbbRating = ?';
        params.push(filterRating);
      }

      query += ` ORDER BY ${orderBy} ${orderDir}`;

      const allImages = await dbAll(query, params);
      const count = allImages.length;
      const images = allImages.slice(
        selectOffset,
        parseInt(selectOffset) + parseInt(filterImagesPerPage)
      );

      db.close();

      return res.json({ images, count, total: count, dbExists: true });
    }

    // New medium-based query using lib_view.py
    const command = [
      `sudo python3 ${req.WORKING_DIR}/lib_view.py`,
      `--action list`,
      `--medium ${medium}`,
      `--page ${page}`,
      `--per-page ${per_page}`,
      `--sort ${sort}`,
      `--dir ${dir}`,
    ].join(' ');

    const result = await execCommand(command, { logger: req.logger });

    if (!result.success) {
      if (
        result.stderr?.includes('not mounted') ||
        result.stdout?.includes('not mounted')
      ) {
        return res.status(503).json({ error: 'not_mounted' });
      }
      return res.status(500).json({ error: 'Failed to list images' });
    }

    let parsed;
    try {
      parsed = JSON.parse(result.stdout.trim());
    } catch {
      return res.status(500).json({ error: 'Failed to parse image list' });
    }

    res.json({
      images: parsed.images || [],
      total: parsed.total || 0,
      dbExists: parsed.dbExists !== false,
    });
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
    const { storagePath } = req.query;
    
    if (!storagePath) {
      return res.status(400).json({ error: 'Storage path required' });
    }
    
    const dbPath = path.join(storagePath, req.constants.const_IMAGE_DATABASE_FILENAME);
    
    if (!existsSync(dbPath)) {
      return res.json({
        imagesAll: 0,
        directories: [],
        ratings: [],
        dates: [],
        fileTypes: [],
        fileTypeExtensions: [],
        cameraModelNames: [],
      });
    }
    
    const db = new sqlite3.Database(dbPath);
    const dbAll = promisify(db.all.bind(db));
    
    const imagesAll = await dbAll('SELECT COUNT(*) as count FROM EXIF_DATA');
    const directories = await dbAll('SELECT DISTINCT Directory FROM EXIF_DATA');
    const ratings = await dbAll('SELECT LbbRating, COUNT(*) as count FROM EXIF_DATA GROUP BY LbbRating');
    const dates = await dbAll('SELECT DISTINCT Create_Date FROM EXIF_DATA WHERE Create_Date IS NOT NULL');
    const fileTypes = await dbAll('SELECT DISTINCT File_Type FROM EXIF_DATA');
    const fileTypeExtensions = await dbAll('SELECT DISTINCT File_Extension FROM EXIF_DATA');
    const cameraModelNames = await dbAll('SELECT DISTINCT Camera_Model_Name FROM EXIF_DATA WHERE Camera_Model_Name IS NOT NULL');
    
    db.close();
    
    res.json({
      imagesAll: imagesAll[0]?.count || 0,
      directories: directories.map(d => d.Directory),
      ratings,
      dates: dates.map(d => d.Create_Date),
      fileTypes: fileTypes.map(f => f.File_Type),
      fileTypeExtensions: fileTypeExtensions.map(f => f.File_Extension),
      cameraModelNames: cameraModelNames.map(c => c.Camera_Model_Name),
    });
  } catch (error) {
    req.logger.error('Failed to get stats', { error: error.message });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

export default router;





