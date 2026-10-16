import express from 'express';
import { execCommand } from '../utils/execCommand.js';
import axios from 'axios';
import { shouldUseMocks } from '../utils/systemDetector.js';

const router = express.Router();

router.post('/publish', async (req, res) => {
  try {
    const { medium, imageId, platforms } = req.body;

    if (!medium || !imageId || !Array.isArray(platforms) || platforms.length === 0) {
      return res.status(400).json({ error: 'medium, imageId and platforms are required' });
    }

    const results = {};

    for (const platform of platforms) {
      if (platform === 'telegram') {
        const command = `python3 ${req.WORKING_DIR}/lib_socialmedia_telegram.py --action publish --medium "${medium}" --image-id "${imageId}"`;
        const result = await execCommand(command, { logger: req.logger });
        results.telegram = result.success;
      } else if (platform === 'mastodon') {
        const command = `python3 ${req.WORKING_DIR}/lib_socialmedia_mastodon.py --action publish --medium "${medium}" --image-id "${imageId}"`;
        const result = await execCommand(command, { logger: req.logger });
        results.mastodon = result.success;
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    req.logger.error('Failed to publish to social media', { error: error.message });
    res.status(500).json({ error: 'Failed to publish to social media' });
  }
});

router.get('/config', async (req, res) => {
  try {
    const config = req.config;

    res.json({
      config: {
        conf_SOCIAL_PUBLISH_DATE: config.conf_SOCIAL_PUBLISH_DATE || 'true',
        conf_SOCIAL_PUBLISH_FILENAME: config.conf_SOCIAL_PUBLISH_FILENAME || 'false',
        conf_SOCIAL_TELEGRAM_TOKEN: config.conf_SOCIAL_TELEGRAM_TOKEN || '',
        conf_SOCIAL_TELEGRAM_CHAT_ID: config.conf_SOCIAL_TELEGRAM_CHAT_ID || '',
        conf_SOCIAL_TELEGRAM_CHAT_IDENTIFIER: config.conf_SOCIAL_TELEGRAM_CHAT_IDENTIFIER || '',
        conf_SOCIAL_MASTODON_BASE_URL: config.conf_SOCIAL_MASTODON_BASE_URL || '',
        conf_SOCIAL_MASTODON_TOKEN: config.conf_SOCIAL_MASTODON_TOKEN || '',
        conf_SOCIAL_BLUESKY_API_BASE_URL: config.conf_SOCIAL_BLUESKY_API_BASE_URL || 'https://bsky.social',
        conf_SOCIAL_BLUESKY_IDENTIFIER: config.conf_SOCIAL_BLUESKY_IDENTIFIER || '',
        conf_SOCIAL_BLUESKY_APP_PASSWORD: config.conf_SOCIAL_BLUESKY_APP_PASSWORD || '',
        conf_SOCIAL_MATRIX_HOMESERVER: config.conf_SOCIAL_MATRIX_HOMESERVER || '',
        conf_SOCIAL_MATRIX_TOKEN: config.conf_SOCIAL_MATRIX_TOKEN || '',
        conf_SOCIAL_MATRIX_ROOM_ID: config.conf_SOCIAL_MATRIX_ROOM_ID || '',
        conf_SOCIAL_MATRIX_ROOM_IDENTIFIER: config.conf_SOCIAL_MATRIX_ROOM_IDENTIFIER || '',
      },
    });
  } catch (error) {
    req.logger.error('Failed to get social config', { error: error.message });
    res.status(500).json({ error: 'Failed to get social config' });
  }
});

router.get('/services', async (req, res) => {
  try {
    const command = `python3 ${req.WORKING_DIR}/lib_socialmedia.py --action get_social_services_configured`;
    const result = await execCommand(command, { logger: req.logger });
    
    const services = result.success && result.stdout.trim()
      ? result.stdout.trim().split(';').filter(s => s)
      : [];
    
    res.json({ services });
  } catch (error) {
    req.logger.error('Failed to get social services', { error: error.message });
    res.status(500).json({ error: 'Failed to get social services' });
  }
});

router.post('/test/telegram', async (req, res) => {
  try {
    const { conf_SOCIAL_TELEGRAM_TOKEN, conf_SOCIAL_TELEGRAM_CHAT_ID } = req.body;
    
    if (!conf_SOCIAL_TELEGRAM_TOKEN || !conf_SOCIAL_TELEGRAM_CHAT_ID) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const command = `python3 ${req.WORKING_DIR}/lib_socialmedia_telegram.py --action test --token "${conf_SOCIAL_TELEGRAM_TOKEN}" --chat-id "${conf_SOCIAL_TELEGRAM_CHAT_ID}"`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (result.success) {
      res.json({ success: true, message: 'Telegram connection test successful' });
    } else {
      res.status(500).json({ error: result.stderr || 'Telegram connection test failed' });
    }
  } catch (error) {
    req.logger.error('Failed to test Telegram', { error: error.message });
    res.status(500).json({ error: 'Failed to test Telegram connection' });
  }
});

router.post('/test/mastodon', async (req, res) => {
  try {
    const { conf_SOCIAL_MASTODON_BASE_URL, conf_SOCIAL_MASTODON_TOKEN } = req.body;
    
    if (!conf_SOCIAL_MASTODON_BASE_URL || !conf_SOCIAL_MASTODON_TOKEN) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const command = `python3 ${req.WORKING_DIR}/lib_socialmedia_mastodon.py --action test --base-url "${conf_SOCIAL_MASTODON_BASE_URL}" --token "${conf_SOCIAL_MASTODON_TOKEN}"`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (result.success) {
      res.json({ success: true, message: 'Mastodon connection test successful' });
    } else {
      res.status(500).json({ error: result.stderr || 'Mastodon connection test failed' });
    }
  } catch (error) {
    req.logger.error('Failed to test Mastodon', { error: error.message });
    res.status(500).json({ error: 'Failed to test Mastodon connection' });
  }
});

router.post('/test/bluesky', async (req, res) => {
  try {
    const { conf_SOCIAL_BLUESKY_API_BASE_URL, conf_SOCIAL_BLUESKY_IDENTIFIER, conf_SOCIAL_BLUESKY_APP_PASSWORD } = req.body;
    
    if (!conf_SOCIAL_BLUESKY_API_BASE_URL || !conf_SOCIAL_BLUESKY_IDENTIFIER || !conf_SOCIAL_BLUESKY_APP_PASSWORD) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const command = `python3 ${req.WORKING_DIR}/lib_socialmedia_bluesky.py --action test --api-base-url "${conf_SOCIAL_BLUESKY_API_BASE_URL}" --identifier "${conf_SOCIAL_BLUESKY_IDENTIFIER}" --app-password "${conf_SOCIAL_BLUESKY_APP_PASSWORD}"`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (result.success) {
      res.json({ success: true, message: 'Bluesky connection test successful' });
    } else {
      res.status(500).json({ error: result.stderr || 'Bluesky connection test failed' });
    }
  } catch (error) {
    req.logger.error('Failed to test Bluesky', { error: error.message });
    res.status(500).json({ error: 'Failed to test Bluesky connection' });
  }
});

router.post('/test/matrix', async (req, res) => {
  try {
    const { conf_SOCIAL_MATRIX_HOMESERVER, conf_SOCIAL_MATRIX_TOKEN } = req.body;
    
    if (!conf_SOCIAL_MATRIX_HOMESERVER || !conf_SOCIAL_MATRIX_TOKEN) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const command = `python3 ${req.WORKING_DIR}/lib_socialmedia_matrix.py --action test --homeserver "${conf_SOCIAL_MATRIX_HOMESERVER}" --token "${conf_SOCIAL_MATRIX_TOKEN}"`;
    const result = await execCommand(command, { logger: req.logger });
    
    if (result.success) {
      res.json({ success: true, message: 'Matrix connection test successful' });
    } else {
      res.status(500).json({ error: result.stderr || 'Matrix connection test failed' });
    }
  } catch (error) {
    req.logger.error('Failed to test Matrix', { error: error.message });
    res.status(500).json({ error: 'Failed to test Matrix connection' });
  }
});

router.post('/telegram/chat-id', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token || !/^\d+:[A-Za-z0-9_-]+$/.test(token)) {
      return res.status(400).json({ ok: false, error: 'invalid_token' });
    }
    
    const url = `https://api.telegram.org/bot${token}/getUpdates`;
    
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'TelegramChatIdFetcher/1.1',
        },
      });
      
      if (!response.data || response.data.ok !== true) {
        return res.status(502).json({ ok: false, error: 'bad_api_response' });
      }
      
      const results = response.data.result || [];
      const chatsById = {};
      
      const mkName = (chat) => {
        if (chat.title) return chat.title;
        if (chat.username) return chat.username;
        const first = chat.first_name || '';
        const last = chat.last_name || '';
        const name = `${first} ${last}`.trim();
        return name || '(without name)';
      };
      
      const collect = (chat) => {
        if (!chat || !chat.id) return;
        const id = String(chat.id);
        const type = chat.type || 'unknown';
        const name = mkName(chat);
        chatsById[id] = { id: chat.id, type, name };
      };
      
      results.forEach((u) => {
        ['message', 'edited_message', 'channel_post', 'edited_channel_post'].forEach((k) => {
          if (u[k]?.chat) collect(u[k].chat);
        });
        if (u.my_chat_member?.chat) collect(u.my_chat_member.chat);
        if (u.chat_member?.chat) collect(u.chat_member.chat);
      });
      
      const order = { private: 0, group: 1, supergroup: 2, channel: 3, unknown: 9 };
      const chats = Object.values(chatsById).sort((a, b) => {
        const da = order[a.type] ?? 9;
        const db = order[b.type] ?? 9;
        if (da !== db) return da - db;
        return a.name.localeCompare(b.name);
      });
      
      res.json({ ok: true, chats });
    } catch (error) {
      if (error.response) {
        return res.status(502).json({ ok: false, error: 'bad_api_response' });
      }
      return res.status(502).json({ ok: false, error: 'telegram_unreachable' });
    }
  } catch (error) {
    req.logger.error('Failed to get Telegram chat ID', { error: error.message });
    res.status(500).json({ ok: false, error: 'Failed to get Telegram chat ID' });
  }
});

// Fetch a Matrix access token with a password login, like
// scripts/matrix_get_token.php (used by sub-matrix-token.php). The password is
// only forwarded to the homeserver and never stored or logged.
router.post('/matrix/token', async (req, res) => {
  const homeserver = typeof req.body?.homeserver === 'string' ? req.body.homeserver.trim() : '';
  const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  if (!homeserver || !username || !password) {
    return res.status(400).json({ ok: false, error: 'missing_parameters' });
  }

  let baseUrl;
  try {
    const url = new URL(homeserver.replace(/\/+$/, ''));
    if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('protocol');
    baseUrl = url.toString().replace(/\/+$/, '');
  } catch {
    return res.status(400).json({ ok: false, error: 'missing_parameters' });
  }

  if (shouldUseMocks()) {
    const localpart = username.replace(/^@/, '').split(':')[0] || 'bot';
    const host = new URL(baseUrl).hostname;
    return res.json({
      ok: true,
      token: `syt_${Buffer.from(localpart).toString('base64').replace(/=+$/, '')}_mockAccessToken0123456789`,
      user_id: username.startsWith('@') ? username : `@${localpart}:${host}`,
    });
  }

  try {
    const response = await axios.post(
      `${baseUrl}/_matrix/client/v3/login`,
      {
        type: 'm.login.password',
        identifier: { type: 'm.id.user', user: username },
        password,
      },
      { headers: { 'Content-Type': 'application/json' }, timeout: 15000, validateStatus: () => true },
    );

    if (response.status === 401 || response.status === 403) {
      return res.json({ ok: false, error: 'invalid_credentials', status: response.status });
    }
    if (response.status !== 200 || typeof response.data !== 'object' || response.data === null) {
      return res.json({ ok: false, error: 'bad_api_response', status: response.status });
    }
    const token = response.data.access_token;
    if (!token) {
      return res.json({ ok: false, error: 'no_token' });
    }
    return res.json({ ok: true, token, user_id: response.data.user_id || null });
  } catch (error) {
    req.logger.warn('Matrix login failed', { error: error.message });
    return res.json({ ok: false, error: 'matrix_unreachable' });
  }
});

router.post('/matrix/room-id', async (req, res) => {
  try {
    const { homeserver, token } = req.body;
    
    if (!homeserver || !token) {
      return res.status(400).json({ ok: false, error: 'missing_parameters' });
    }
    
    const baseUrl = homeserver.replace(/\/$/, '');
    
    try {
      const whoamiResponse = await axios.get(`${baseUrl}/_matrix/client/v3/account/whoami`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
      
      const botUserId = whoamiResponse.data?.user_id;
      if (!botUserId) {
        return res.status(401).json({ ok: false, error: 'invalid_token' });
      }
      
      const roomsResponse = await axios.get(`${baseUrl}/_matrix/client/v3/joined_rooms`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });
      
      if (roomsResponse.status !== 200 || !Array.isArray(roomsResponse.data?.joined_rooms)) {
        return res.status(502).json({ ok: false, error: 'bad_api_response' });
      }
      
      const rooms = [];
      
      for (const roomId of roomsResponse.data.joined_rooms) {
        try {
          const roomEnc = encodeURIComponent(roomId);
          
          const powerLevelsResponse = await axios.get(
            `${baseUrl}/_matrix/client/v3/rooms/${roomEnc}/state/m.room.power_levels`,
            { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
          );
          
          if (powerLevelsResponse.status !== 200) continue;
          
          const pl = powerLevelsResponse.data;
          const users = pl.users || {};
          const usersDefault = parseInt(pl.users_default || 0);
          const events = pl.events || {};
          const eventsDefault = parseInt(pl.events_default || 0);
          
          const sendLevel = events['m.room.message'] !== undefined
            ? parseInt(events['m.room.message'])
            : eventsDefault;
          
          const botLevel = users[botUserId] !== undefined
            ? parseInt(users[botUserId])
            : usersDefault;
          
          if (botLevel < sendLevel) continue;
          
          const createResponse = await axios.get(
            `${baseUrl}/_matrix/client/v3/rooms/${roomEnc}/state/m.room.create`,
            { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
          );
          
          if (createResponse.status === 200 && createResponse.data?.type === 'm.space') {
            continue;
          }
          
          const room = { room_id: roomId, name: null, canonical_alias: null };
          
          try {
            const nameResponse = await axios.get(
              `${baseUrl}/_matrix/client/v3/rooms/${roomEnc}/state/m.room.name`,
              { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
            );
            if (nameResponse.status === 200 && nameResponse.data?.name) {
              room.name = nameResponse.data.name;
            }
          } catch (e) {
          }
          
          try {
            const aliasResponse = await axios.get(
              `${baseUrl}/_matrix/client/v3/rooms/${roomEnc}/state/m.room.canonical_alias`,
              { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
            );
            if (aliasResponse.status === 200 && aliasResponse.data?.alias) {
              room.canonical_alias = aliasResponse.data.alias;
            }
          } catch (e) {
          }
          
          rooms.push(room);
        } catch (e) {
          continue;
        }
      }
      
      if (rooms.length === 0) {
        return res.json({ ok: false, error: 'no_writable_rooms' });
      }
      
      res.json({ ok: true, rooms });
    } catch (error) {
      if (error.response?.status === 401) {
        return res.status(401).json({ ok: false, error: 'invalid_token' });
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return res.status(502).json({ ok: false, error: 'matrix_unreachable' });
      }
      return res.status(502).json({ ok: false, error: 'bad_api_response' });
    }
  } catch (error) {
    req.logger.error('Failed to get Matrix room ID', { error: error.message });
    res.status(500).json({ ok: false, error: 'Failed to get Matrix room ID' });
  }
});

router.post('/matrix/test-message', async (req, res) => {
  try {
    const { homeserver, token, room_id, text } = req.body;
    
    if (!homeserver || !token || !room_id || !text) {
      return res.status(400).json({ ok: false, error: 'missing_parameters' });
    }
    
    const baseUrl = homeserver.replace(/\/$/, '');
    const roomEnc = encodeURIComponent(room_id);
    
    const response = await axios.put(
      `${baseUrl}/_matrix/client/v3/rooms/${roomEnc}/send/m.room.message/${Date.now()}`,
      {
        msgtype: 'm.text',
        body: text,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      }
    );
    
    if (response.status === 200) {
      res.json({ ok: true });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to send message' });
    }
  } catch (error) {
    req.logger.error('Failed to send Matrix test message', { error: error.message });
    res.status(500).json({ ok: false, error: 'Failed to send Matrix test message' });
  }
});

export default router;




