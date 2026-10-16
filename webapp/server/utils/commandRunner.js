// Shared helpers for the "protected command" flow ported from scripts/cmd.php:
// password gate, mail-result option, background execution into
// const_CMD_LOGFILE, and server-side translation of the display messages that
// cmd.php passes to lib_display.py.
//
// The command lines themselves are built by the individual routes (tools.js,
// setup.js, network.js) and mirror cmd.php line for line; this module only
// runs them.

import { spawn } from 'child_process';
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { createHash, timingSafeEqual } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadConfig } from './configLoader.js';
import { execCommand } from './execCommand.js';
import { mockCommandOutput, shouldMock, simulateCommandRun } from './mockSystem.js';
import { getCmdLogFile, getCmdRunnerLockfile } from './paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LANG_DIR = path.resolve(__dirname, '../../public/lang');

// Password used by dev:mock when no scripts/config.cfg exists, so the protected
// command dialog can be exercised (accept with "lbb", reject anything else).
export const MOCK_DEVICE_PASSWORD = 'lbb';

let activeRun = null;

// Single-quote a value for safe interpolation into a sh command line.
export function shellQuote(value) {
  return `'${String(value ?? '').replace(/'/g, `'\\''`)}'`;
}

// sub-security.php clean_argument(): strip quote, separator and redirection
// characters unless explicitly allowed (e.g. ' '). Shell metacharacters that
// PHP did not list are stripped too; values are additionally shellQuote()d.
const CLEAN_REMOVES = ['"', "'", ' ', ';', '\n', '&', '|', '<', '>', '`', '$', '\\'];
export function cleanArgument(value, allowed = []) {
  let out = String(value ?? '');
  for (const ch of CLEAN_REMOVES) {
    if (!allowed.includes(ch)) out = out.split(ch).join('');
  }
  return out;
}

// Device names reach mkfs/fsck/f3probe; accept only kernel block-device names
// such as sda1, nvme0n1p1 or mmcblk0p2 (optionally prefixed with /dev/).
export function normalizeDevice(value) {
  const name = String(value ?? '').replace(/^\/dev\//, '');
  return /^[a-zA-Z0-9]+$/.test(name) ? name : null;
}

// Always re-read config.cfg so a password set after server start is honoured.
export function getCurrentConfig(req) {
  const configPath = path.join(req.WORKING_DIR, 'config.cfg');
  const config = existsSync(configPath) ? loadConfig(req.WORKING_DIR) : { ...(req.config || {}) };
  if (shouldMock() && !existsSync(configPath) && !config.conf_PASSWORD) {
    config.conf_PASSWORD = Buffer.from(MOCK_DEVICE_PASSWORD, 'utf-8').toString('base64');
  }
  return config;
}

// The demo password is only reported while the dev:mock default is in effect.
export function getDemoPassword(req) {
  return shouldMock() && !existsSync(path.join(req.WORKING_DIR, 'config.cfg')) ? MOCK_DEVICE_PASSWORD : null;
}

function decodePassword(encoded) {
  if (!encoded) return '';
  try {
    return Buffer.from(String(encoded), 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

export function isPasswordSet(config) {
  return decodePassword(config?.conf_PASSWORD) !== '';
}

// cmd.php:189-200 — mail is only offered when every SMTP field is filled in.
export function isMailConfigured(config) {
  return [
    'conf_SMTP_SERVER',
    'conf_SMTP_PORT',
    'conf_MAIL_SECURITY',
    'conf_MAIL_USER',
    'conf_MAIL_PASSWORD',
    'conf_MAIL_FROM',
    'conf_MAIL_TO',
  ].every((key) => String(config?.[key] ?? '').length > 0);
}

// cmd.php:180-187 / 215 — compare against base64_decode(conf_PASSWORD).
// Hash both sides first so timingSafeEqual gets equal-length buffers.
export function checkDevicePassword(config, supplied) {
  const expected = decodePassword(config?.conf_PASSWORD);
  if (expected === '') return { ok: false, code: 'password_not_set' };
  const a = createHash('sha256').update(String(supplied ?? ''), 'utf-8').digest();
  const b = createHash('sha256').update(expected, 'utf-8').digest();
  if (!timingSafeEqual(a, b)) return { ok: false, code: 'password_invalid' };
  return { ok: true };
}

// Express middleware: reject the request unless body.password matches the
// device password. Used by every route cmd.php marks $PASSWORD_REQ.
export function requireDevicePassword(req, res, next) {
  const config = getCurrentConfig(req);
  const result = checkDevicePassword(config, req.body?.password);
  if (!result.ok) {
    req.logger?.warn?.(`Protected command refused: ${result.code}`);
    const message = result.code === 'password_not_set'
      ? 'No device password has been set'
      : 'Invalid device password';
    return res.status(403).json({ error: message, code: result.code });
  }
  req.currentConfig = config;
  return next();
}

const langCache = new Map();
function loadLang(code) {
  if (langCache.has(code)) return langCache.get(code);
  let data = null;
  try {
    data = JSON.parse(readFileSync(path.join(LANG_DIR, `${code}.json`), 'utf-8'));
  } catch {
    data = null;
  }
  langCache.set(code, data);
  return data;
}

function lookup(obj, key) {
  return key.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), obj);
}

// Translate a key with the device language (conf_LANGUAGE), falling back to
// English — the display messages are shown on the box, not in the browser.
export function serverT(config, key) {
  const lang = (config?.conf_LANGUAGE || 'en').slice(0, 2);
  const value = lookup(loadLang(lang), key) ?? lookup(loadLang('en'), key);
  return typeof value === 'string' ? value : key;
}

// One lib_display.py call; each element becomes a single ':<text>' line
// (lib_display.py treats every argv entry as one display line).
export function displayCommand(workingDir, lines) {
  const args = lines.map((line) => shellQuote(`:${line}`)).join(' ');
  return `sudo python3 ${workingDir}/lib_display.py ${args}`;
}

export function getActiveRun() {
  return activeRun ? { cmd: activeRun.cmd, param1: activeRun.param1, param2: activeRun.param2, startedAt: activeRun.startedAt } : null;
}

// Start commandLine in the background with stdout+stderr going to the command
// log (cmd.php:543-567). Returns immediately. When `mail` is set the log is
// mailed with lib_mail.py after the command finishes.
export function runInBackground(req, { cmd, param1 = '', param2 = '', commandLine, mail = false }) {
  if (activeRun) {
    const err = new Error('Another command is still running');
    err.code = 'command_running';
    throw err;
  }

  const logfile = getCmdLogFile(req.WORKING_DIR, req.constants);
  const lockfile = getCmdRunnerLockfile(req.WORKING_DIR, req.constants);
  const workingDir = req.WORKING_DIR;
  const logger = req.logger;

  writeFileSync(lockfile, commandLine, 'utf-8');
  activeRun = { cmd, param1, param2, startedAt: new Date().toISOString() };

  let finished = false;
  const finish = async () => {
    if (finished) return;
    finished = true;
    try {
      if (mail) {
        let result = '';
        try {
          result = readFileSync(logfile, 'utf-8');
        } catch {
          result = '';
        }
        const subject = `${cmd} ${cleanArgument(param1, [' '])} ${cleanArgument(param2, [' '])}`;
        await execCommand(
          `sudo python3 ${workingDir}/lib_mail.py ${shellQuote(subject)} ${shellQuote(result)}`,
          { logger, logCommand: false },
        );
      }
    } catch (error) {
      logger?.error?.('Failed to mail command result', { error: error.message });
    } finally {
      try {
        unlinkSync(lockfile);
      } catch {
        // already gone
      }
      activeRun = null;
    }
  };

  if (shouldMock()) {
    simulateCommandRun(logfile, mockCommandOutput(cmd, param1, param2), finish);
    return;
  }

  const fd = openSync(logfile, 'w');
  try {
    const child = spawn('sh', ['-c', commandLine], {
      stdio: ['ignore', fd, fd],
      detached: true,
    });
    child.on('exit', finish);
    child.on('error', (error) => {
      logger?.error?.('Command failed to start', { error: error.message });
      finish();
    });
    child.unref();
  } finally {
    closeSync(fd);
  }
}
