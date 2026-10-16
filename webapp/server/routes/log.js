import express from 'express';
import path from 'path';
import { readFileSync, writeFileSync } from 'fs';
import { getCmdLogFile, getLogFile } from '../utils/paths.js';

const router = express.Router();

// Only these two logs may be read, downloaded or cleared. Clients pass the
// symbolic name ('main' | 'cmd'); the configured absolute paths
// (const_LOGFILE / const_CMD_LOGFILE) are accepted as aliases for
// compatibility. Anything else is rejected.
function resolveLogFile(req, requested) {
  const value = requested === undefined || requested === null || requested === '' ? 'main' : String(requested);
  if (value === 'main' || value === req.constants?.const_LOGFILE) {
    return getLogFile(req.WORKING_DIR, req.constants);
  }
  if (value === 'cmd' || value === req.constants?.const_CMD_LOGFILE) {
    return getCmdLogFile(req.WORKING_DIR, req.constants);
  }
  return null;
}

router.get('/', (req, res) => {
  const logFile = resolveLogFile(req, req.query.file);
  if (!logFile) {
    return res.status(400).json({ error: 'Unknown log file' });
  }
  try {
    res.type('text/plain').send(readFileSync(logFile, 'utf-8'));
  } catch {
    res.type('text/plain').send('');
  }
});

router.get('/download', (req, res) => {
  const logFile = resolveLogFile(req, req.query.file);
  if (!logFile) {
    return res.status(400).json({ error: 'Unknown log file' });
  }
  let content = '';
  try {
    content = readFileSync(logFile, 'utf-8');
  } catch {
    content = '';
  }
  res.setHeader('Content-Disposition', `attachment; filename="${path.basename(logFile)}"`);
  res.type('text/plain').send(content);
});

// sub-logmonitor.php:45-52 — "delete" recreates the file with a header line
// instead of leaving it missing.
function clearLog(req, res) {
  const logFile = resolveLogFile(req, req.body?.file);
  if (!logFile) {
    return res.status(400).json({ error: 'Unknown log file' });
  }
  try {
    writeFileSync(logFile, 'Little Backup Box\n', 'utf-8');
    req.logger.info(`Log cleared: ${path.basename(logFile)}`);
    res.json({ success: true });
  } catch (error) {
    req.logger.error('Failed to clear log', { error: error.message });
    res.status(500).json({ error: 'Failed to clear log' });
  }
}

router.post('/clear', clearLog);
// Legacy alias.
router.post('/delete', clearLog);

export default router;
