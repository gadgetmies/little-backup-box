import express from 'express';
import { execCommand } from '../utils/execCommand.js';
import {
  displayCommand,
  getCurrentConfig,
  isMailConfigured,
  requireDevicePassword,
  runInBackground,
  serverT,
} from '../utils/commandRunner.js';

const router = express.Router();

router.get('/ips', async (req, res) => {
  try {
    const command = `python3 ${req.WORKING_DIR}/lib_network.py --Mode ip`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (!result.success) {
      return res.json({ ips: [] });
    }
    
    const ips = result.stdout
      .trim()
      .split('\n')
      .filter(ip => ip.trim())
      .filter(ip => !ip.startsWith('127.0.0.'));
    
    res.json({ ips });
  } catch (error) {
    req.logger.error('Failed to get IP addresses', { error: error.message });
    res.status(500).json({ error: 'Failed to get IP addresses' });
  }
});

router.get('/internet-status', async (req, res) => {
  try {
    const command = `python3 ${req.WORKING_DIR}/lib_network.py --Mode internet_status`;
    const result = await execCommand(command, { logger: req.logger });
    
    const online = result.success && result.stdout.trim() === 'True';
    
    res.json({ online });
  } catch (error) {
    req.logger.error('Failed to get internet status', { error: error.message });
    res.status(500).json({ error: 'Failed to get internet status' });
  }
});

router.get('/qr-links', async (req, res) => {
  try {
    const protocol = req.query.protocol || (req.headers['x-forwarded-proto'] || 'https').split(',')[0] || 'https';
    const command = `python3 ${req.WORKING_DIR}/lib_network.py --Mode qr_links --Protocol ${protocol}`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (!result.success) {
      return res.json({ qrLinks: [] });
    }
    
    const qrLinksHtml = result.stdout.trim();
    
    if (!qrLinksHtml) {
      return res.json({ qrLinks: [] });
    }
    
    const qrLinks = qrLinksHtml.split(/(?=<img|<a)/).filter(link => link.trim());
    
    res.json({ qrLinks });
  } catch (error) {
    req.logger.error('Failed to get QR links', { error: error.message });
    res.status(500).json({ error: 'Failed to get QR links' });
  }
});

// cmd.php:528-537 — print the reset script's commands, run it, then show
// "comitup / reset" on the display. Background + command log + mail option.
router.post('/comitup/reset', requireDevicePassword, async (req, res) => {
  try {
    const which = await execCommand('which comitup', { logger: req.logger });
    if (!which.success) {
      return res.status(400).json({ error: 'Comitup is not installed on this device', code: 'comitup_missing' });
    }

    const config = req.currentConfig || getCurrentConfig(req);
    const script = `${req.WORKING_DIR}/comitup-reset.sh`;
    const commandLine = [
      `cat ${script} | grep '^[^# ]'`,
      "echo ''",
      `sudo ${script}`,
      "echo ''",
      "echo 'FINISHED.'",
      displayCommand(req.WORKING_DIR, [serverT(config, 'cmd.box.comitup_section'), serverT(config, 'cmd.box.reset')]),
    ].join(';');
    const mail = req.body?.mailResult === true && isMailConfigured(config);

    runInBackground(req, { cmd: 'comitup_reset', commandLine, mail });

    req.logger.info('Comitup WiFi credentials reset started');
    res.json({ success: true, started: true });
  } catch (error) {
    if (error.code === 'command_running') {
      return res.status(409).json({ error: error.message, code: error.code });
    }
    req.logger.error('Failed to reset Comitup WiFi credentials', { error: error.message });
    res.status(500).json({ error: 'Failed to reset Comitup WiFi credentials' });
  }
});

router.get('/wifi/info', async (req, res) => {
  try {
    const result = await execCommand('iwconfig 2>/dev/null || iw dev', { logger: req.logger });

    if (!result.success || !result.stdout) {
      return res.json({ connected: false });
    }

    const output = result.stdout;

    // Try to parse iwconfig output
    const essidMatch = output.match(/ESSID:"([^"]+)"/);
    const freqMatch = output.match(/Frequency[=:]([0-9.]+)\s*GHz/);
    const signalMatch = output.match(/Signal level[=:](-?\d+)\s*dBm/);
    const bitRateMatch = output.match(/Bit Rate[=:]([0-9.]+)\s*Mb/);
    const ifaceMatch = output.match(/^(\S+)\s+IEEE/m);

    if (!essidMatch) {
      return res.json({ connected: false });
    }

    res.json({
      interface: ifaceMatch ? ifaceMatch[1] : 'wlan0',
      ssid: essidMatch[1],
      frequency: freqMatch ? parseFloat(freqMatch[1]) : null,
      signal_level: signalMatch ? parseInt(signalMatch[1], 10) : null,
      bit_rate: bitRateMatch ? parseFloat(bitRateMatch[1]) : null,
      connected: true,
    });
  } catch (error) {
    req.logger.error('Failed to get WiFi info', { error: error.message });
    res.status(500).json({ error: 'Failed to get WiFi info' });
  }
});

export default router;




