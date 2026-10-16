import express from 'express';
import { execCommand } from '../utils/execCommand.js';
import {
  getActiveRun,
  getCurrentConfig,
  getDemoPassword,
  isMailConfigured,
  isPasswordSet,
} from '../utils/commandRunner.js';

// The protected commands themselves live with their pages' routes
// (tools.js: fsck/format/f3, setup.js: update + LibRaw, network.js: comitup
// reset). This router only reports the state the ProtectedCommandDialog and
// the app shell need.

const router = express.Router();

// Whether a device password / SMTP is configured (cmd.php:180-200) and whether
// a command is currently running into the command log.
router.get('/status', (req, res) => {
  try {
    const config = getCurrentConfig(req);
    const active = getActiveRun();
    res.json({
      passwordSet: isPasswordSet(config),
      mailConfigured: isMailConfigured(config),
      running: Boolean(active),
      command: active,
      demoPassword: getDemoPassword(req),
    });
  } catch (error) {
    req.logger.error('Failed to get command status', { error: error.message });
    res.status(500).json({ error: 'Failed to get command status' });
  }
});

// App-shell status that sub-menu.php computes on every page load
// (sub-menu.php:41-43, 85). lib_git.py may hit the network, so the result is
// cached for a few minutes.
const SHELL_STATUS_TTL_MS = 5 * 60 * 1000;
let shellStatusCache = null;

router.get('/shell-status', async (req, res) => {
  try {
    const now = Date.now();
    if (!shellStatusCache || now - shellStatusCache.at > SHELL_STATUS_TTL_MS) {
      const [updateResult, whichResult] = await Promise.all([
        execCommand(`python3 ${req.WORKING_DIR}/lib_git.py --update-available`, { logger: req.logger }),
        execCommand('which comitup', { logger: req.logger }),
      ]);
      shellStatusCache = {
        at: now,
        updateAvailable: updateResult.success && (updateResult.stdout || '').trim() === 'True',
        comitupInstalled: whichResult.success && (whichResult.stdout || '').trim() !== '',
      };
    }

    // Hotspot state changes quickly and is cheap to read, so it is not cached.
    let comitupHotspotActive = false;
    if (shellStatusCache.comitupInstalled) {
      const hotspot = await execCommand(
        `sudo python3 ${req.WORKING_DIR}/lib_comitup.py --hotspot_active`,
        { logger: req.logger },
      );
      comitupHotspotActive = hotspot.success && (hotspot.stdout || '').trim() === 'active';
    }

    res.json({
      updateAvailable: shellStatusCache.updateAvailable,
      comitupInstalled: shellStatusCache.comitupInstalled,
      comitupHotspotActive,
    });
  } catch (error) {
    req.logger.error('Failed to get shell status', { error: error.message });
    res.status(500).json({ error: 'Failed to get shell status' });
  }
});

export default router;
