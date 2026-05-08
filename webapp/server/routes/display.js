import express from 'express';
import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';
import { getDisplayContentPath, getDisplayContentOldFilePath } from '../utils/paths.js';

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

router.get('/status', (req, res) => {
  const dir = getDisplayContentPath(req.WORKING_DIR, req.constants);
  const oldFile = getDisplayContentOldFilePath(req.WORKING_DIR, req.constants);

  try {
    const fromQueue = readLatestFrame(dir);
    if (fromQueue !== null && fromQueue.trim() !== '') {
      const status = fromQueue.trim();
      return res.json({ status, severity: severityFor(status) });
    }
  } catch (error) {
    // Directory missing or unreadable — fall through to old-file fallback.
    req.logger?.debug?.('Display queue unreadable', { error: error.message });
  }

  try {
    const fromOld = readFileSync(oldFile, 'utf-8');
    if (fromOld.trim() !== '') {
      const status = fromOld.trim();
      return res.json({ status, severity: severityFor(status) });
    }
  } catch {
    // Old file missing — return empty status.
  }

  return res.json({ status: '', severity: 'ready' });
});

export default router;
