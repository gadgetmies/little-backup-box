import React, { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';

// "Fetch Matrix token" dialog, the webapp version of scripts/sub-matrix-token.php
// + matrix_get_token.php: log in with the bot's Matrix user to obtain an access
// token. The password is only sent to the homeserver and never stored.
function MatrixTokenDialog({ open, initialHomeserver, onClose, onApply }) {
  const { t } = useLanguage();
  const [homeserver, setHomeserver] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [status, setStatus] = useState({ text: '', severity: 'info' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHomeserver(initialHomeserver || '');
    setPassword('');
    setToken('');
    setStatus({ text: '', severity: 'info' });
  }, [open, initialHomeserver]);

  const errorMessages = {
    invalid_credentials: t('integrations.matrix_token.error_invalid_credentials'),
    missing_parameters: t('integrations.matrix_token.error_missing_parameters'),
    bad_api_response: t('integrations.matrix_token.error_bad_api_response'),
    matrix_unreachable: t('integrations.matrix_token.error_unreachable'),
    no_token: t('integrations.matrix_token.error_no_token'),
  };

  const handleFetch = async () => {
    if (!homeserver.trim()) {
      setStatus({ text: t('config.social.matrix.error.not_set_homeserver'), severity: 'warning' });
      return;
    }
    if (!username.trim()) {
      setStatus({ text: t('integrations.matrix_token.enter_username_first'), severity: 'warning' });
      return;
    }
    if (!password) {
      setStatus({ text: t('integrations.matrix_token.enter_password_first'), severity: 'warning' });
      return;
    }
    setBusy(true);
    setStatus({ text: t('integrations.matrix_token.fetching'), severity: 'info' });
    try {
      const response = await api.post('/social/matrix/token', {
        homeserver: homeserver.trim(),
        username: username.trim(),
        password,
      });
      if (response.data?.ok && response.data.token) {
        setToken(response.data.token);
        setPassword('');
        setStatus({
          text: `${t('integrations.matrix_token.success')} ${response.data.user_id || ''}`.trim(),
          severity: 'success',
        });
      } else {
        const code = response.data?.error;
        setStatus({ text: errorMessages[code] || t('integrations.matrix_token.error_exception'), severity: 'error' });
      }
    } catch (error) {
      const code = error?.response?.data?.error;
      setStatus({ text: errorMessages[code] || t('integrations.matrix_token.error_exception'), severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{t('integrations.matrix_token.title')}</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ mb: 2 }}>{t('integrations.matrix_token.description')}</DialogContentText>
        <Stack spacing={2}>
          <TextField
            label={t('config.social.matrix.homeserver_label')}
            value={homeserver}
            onChange={(e) => setHomeserver(e.target.value)}
            fullWidth
          />
          <TextField
            label={t('integrations.matrix_token.username_label')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            fullWidth
          />
          <TextField
            type="password"
            label={t('integrations.matrix_token.password_label')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            fullWidth
          />
          <TextField
            label={t('config.social.matrix.token_label')}
            value={token}
            InputProps={{ readOnly: true }}
            fullWidth
          />
          {status.text && <Alert severity={status.severity}>{status.text}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('config.social.matrix.close')}</Button>
        <Button
          onClick={handleFetch}
          disabled={busy}
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {t('integrations.matrix_token.fetch_button')}
        </Button>
        <Button
          variant="contained"
          disabled={!token}
          onClick={() => onApply({ token, homeserver: homeserver.trim() })}
        >
          {t('config.social.matrix.accept')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default MatrixTokenDialog;
