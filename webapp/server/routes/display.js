import express from 'express';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { getDisplayContentPath, getDisplayContentOldFilePath, getTempDir } from '../utils/paths.js';
import { mockDisplaySvg, shouldMock } from '../utils/mockSystem.js';

const router = express.Router();

function readLatestFrame(dir) {
  const entries = readdirSync(dir).filter((f) => f.endsWith('.txt'));
  if (entries.length === 0) return null;
  // Filenames are 14-digit uptime centiseconds, so lex order matches chronology.
  entries.sort();
  const latest = path.join(dir, entries[entries.length - 1]);
  if (!statSync(latest).isFile()) return null;
  return readFileSync(latest, 'utf-8');
}

function severityFor(status) {
  return status === '' || status === 'Ready' ? 'ready' : 'info';
}

function currentStatus(req) {
  const dir = getDisplayContentPath(req.WORKING_DIR, req.constants);
  const oldFile = getDisplayContentOldFilePath(req.WORKING_DIR, req.constants);

  try {
    const fromQueue = readLatestFrame(dir);
    if (fromQueue !== null && fromQueue.trim() !== '') {
      const status = fromQueue.trim();
      return { status, severity: severityFor(status) };
    }
  } catch (error) {
    // Directory missing or unreadable — fall through to old-file fallback.
    req.logger?.debug?.('Display queue unreadable', { error: error.message });
  }

  try {
    const fromOld = readFileSync(oldFile, 'utf-8');
    if (fromOld.trim() !== '') {
      const status = fromOld.trim();
      return { status, severity: severityFor(status) };
    }
  } catch {
    // Old file missing — return empty status.
  }

  return { status: '', severity: 'ready' };
}

router.get('/status', (req, res) => {
  res.json(currentStatus(req));
});

// sub-display.php:28-34 — the rendered image of the physical display
// (const_DISPLAY_IMAGE_EXPORT_FILE, written by display.py). In mock mode an
// SVG rendition of the current status text is returned instead.
router.get('/image', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (shouldMock()) {
    return res.type('image/svg+xml').send(mockDisplaySvg(currentStatus(req).status));
  }
  const file = req.constants?.const_DISPLAY_IMAGE_EXPORT_FILE
    || path.join(getTempDir(req.WORKING_DIR, req.constants), 'display.png');
  if (!existsSync(file)) {
    return res.status(404).json({ error: 'No display image available' });
  }
  return res.type('image/png').sendFile(path.resolve(file));
});

export default router;
