import React, { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import usePopupMessages from '../hooks/usePopupMessages';
import api from '../utils/api';
import SectionHeader from './SectionHeader';

const MIN_LENGTH = 5;

// Device password (scripts/setup.php:1836-1856 UI, 270-289 logic). Setting or
// removing the password runs lib_password.py immediately through
// /api/security; it is deliberately not part of the page Save bar.
function DevicePasswordSettings({ onMessage }) {
  const { t } = useLanguage();
  const { passwordSet, reloadConfig } = useConfig();
  const { notifyInfo } = usePopupMessages();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError] = useState('');

  const tooShort = password.length > 0 && password.trim().length < MIN_LENGTH;
  const mismatch = repeat.length > 0 && password !== repeat;
  const canSet = password.trim().length >= MIN_LENGTH && password === repeat && !busy;

  const errorText = (code) => {
    switch (code) {
      case 'not_identical':
        return t('preferences.security.mismatch');
      case 'too_short':
        return t('preferences.security.too_short');
      default:
        return t('preferences.security.apply_error');
    }
  };

  const handleSet = async () => {
    setTouched(true);
    if (!canSet) return;
    setBusy(true);
    setError('');
    try {
      await api.post('/security/password', { password, repeat });
      setPassword('');
      setRepeat('');
      setTouched(false);
      await reloadConfig();
      notifyInfo(onMessage, t('preferences.security.set_success'));
    } catch (err) {
      setError(errorText(err?.response?.data?.error));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setConfirmOpen(false);
    setBusy(true);
    setError('');
    try {
      await api.post('/security/password/remove');
      await reloadConfig();
      notifyInfo(onMessage, t('preferences.security.remove_success'));
    } catch (err) {
      setError(errorText(err?.response?.data?.error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 560 }}>
      <SectionHeader level={2} title={t('preferences.security.header')} icon={<LockIcon />} />

      <Alert severity="info" data-testid="device-password-status">
        {passwordSet ? t('preferences.security.status_set') : t('preferences.security.status_not_set')}
      </Alert>

      {error && (
        <Alert severity="error" onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TextField
        type="password"
        label={t('preferences.security.new_password')}
        value={password}
        autoComplete="new-password"
        onChange={(e) => setPassword(e.target.value)}
        onBlur={() => setTouched(true)}
        error={touched && tooShort}
        helperText={touched && tooShort ? t('preferences.security.too_short') : ' '}
        fullWidth
      />
      <TextField
        type="password"
        label={t('preferences.security.repeat_password')}
        value={repeat}
        autoComplete="new-password"
        onChange={(e) => setRepeat(e.target.value)}
        error={mismatch}
        helperText={mismatch ? t('preferences.security.mismatch') : t('preferences.security.help')}
        fullWidth
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSet}
          disabled={!canSet}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <LockIcon />}
          sx={{ minHeight: 44 }}
        >
          {t('preferences.security.set_button')}
        </Button>
        {passwordSet && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => setConfirmOpen(true)}
            disabled={busy}
            startIcon={<WarningAmberIcon />}
            sx={{ minHeight: 44 }}
          >
            {t('preferences.security.remove_button')}
          </Button>
        )}
      </Box>

      <Typography variant="body2" color="text.secondary">
        {t('preferences.security.applied_note')}
      </Typography>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('preferences.security.remove_confirm_title')}</DialogTitle>
        <DialogContent>
          <DialogContentText>{t('preferences.security.remove_confirm_body')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>{t('main.cancel_button')}</Button>
          <Button color="error" variant="contained" startIcon={<WarningAmberIcon />} onClick={handleRemove}>
            {t('preferences.security.remove_button')}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}

export default DevicePasswordSettings;
