import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import WifiPasswordIcon from '@mui/icons-material/WifiPassword';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import { decodeConfigPassword } from '../utils/configValue';
import api from '../utils/api';
import SectionHeader from './SectionHeader';

const MIN_LENGTH = 8;
const MAX_LENGTH = 63;
const QR_MAX_LENGTH = 13;

function isPrintableAscii(value) {
  return [...value].every((c) => {
    const code = c.charCodeAt(0);
    return code >= 32 && code <= 126;
  });
}

function validateHotspotPassword(password) {
  if (!password) return null;
  if (password.length < MIN_LENGTH) return 'too_short';
  if (password.length > MAX_LENGTH) return 'too_long';
  if (!isPrintableAscii(password)) return 'not_ascii';
  return null;
}

// Hotspot (comitup access point) password, scripts/setup.php:1760-1800 and
// 290-302. Saved through the Network page Save bar via /api/security/wifi-password,
// which runs lib_comitup.py --config for a fixed password.
function HotspotPasswordSettings({ onSavedStateChange }) {
  const { t } = useLanguage();
  const { config, reloadConfig } = useConfig();
  const [type, setType] = useState('static');
  const [password, setPassword] = useState('');
  const lastSaved = useRef('');

  useEffect(() => {
    if (!config) return;
    const initialType = config.conf_WIFI_PASSWORD_TYPE === 'dynamic' ? 'dynamic' : 'static';
    const initialPassword = decodeConfigPassword(config.conf_WIFI_PASSWORD);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setType(initialType);
    setPassword(initialPassword);
    lastSaved.current = JSON.stringify({ type: initialType, password: initialPassword });
  }, [config]);

  const validation = validateHotspotPassword(password.trim());

  const save = useCallback(async () => {
    if (validateHotspotPassword(password.trim())) {
      throw new Error(t('network.hotspot.invalid'));
    }
    try {
      await api.post('/security/wifi-password', { type, password: password.trim() });
    } catch (error) {
      throw new Error(error?.response?.data?.error || error.message);
    }
    lastSaved.current = JSON.stringify({ type, password });
    await reloadConfig();
  }, [type, password, reloadConfig, t]);

  useEffect(() => {
    if (!onSavedStateChange) return;
    onSavedStateChange(JSON.stringify({ type, password }) === lastSaved.current, save);
  }, [type, password, save, onSavedStateChange]);

  const errorText = {
    too_short: t('network.hotspot.too_short'),
    too_long: t('network.hotspot.too_long'),
    not_ascii: t('network.hotspot.not_ascii'),
  }[validation];

  const warnings = [];
  if (password.length > QR_MAX_LENGTH && password.length <= MAX_LENGTH) {
    warnings.push(t('network.hotspot.qr_length_warning'));
  }
  if (password.includes(';') || password.includes(':')) {
    warnings.push(t('network.hotspot.qr_chars_warning'));
  }

  return (
    <Stack spacing={2} sx={{ maxWidth: 480 }} data-testid="hotspot-password-section">
      <SectionHeader level={3} title={t('network.hotspot.header')} icon={<WifiPasswordIcon />} />
      <FormControl>
        <FormLabel id="hotspot-password-type-label">{t('network.hotspot.type_label')}</FormLabel>
        <RadioGroup
          aria-labelledby="hotspot-password-type-label"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <FormControlLabel
            value="static"
            control={<Radio />}
            label={t('network.hotspot.static')}
            sx={{ minHeight: 44 }}
          />
          <FormControlLabel
            value="dynamic"
            control={<Radio />}
            label={t('network.hotspot.dynamic')}
            sx={{ minHeight: 44 }}
          />
        </RadioGroup>
      </FormControl>
      {type === 'dynamic' && (
        <Typography variant="body2" color="text.secondary">
          {t('network.hotspot.dynamic_desc')}
        </Typography>
      )}
      <TextField
        label={t('network.hotspot.password_label')}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={Boolean(errorText)}
        helperText={
          <span style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <span>{errorText || t('network.hotspot.password_help')}</span>
            <span data-testid="hotspot-password-counter">{`${password.length} / ${MAX_LENGTH}`}</span>
          </span>
        }
        inputProps={{ maxLength: 128, autoComplete: 'off', spellCheck: false }}
        fullWidth
      />
      {warnings.map((warning) => (
        <Alert key={warning} severity="warning">
          {warning}
        </Alert>
      ))}
    </Stack>
  );
}

export default HotspotPasswordSettings;
