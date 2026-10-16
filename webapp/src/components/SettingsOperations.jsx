import React, { useState } from 'react';
import {
  Stack,
  Alert,
  Button,
  Box,
  Typography,
  AlertTitle,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import { useConfig } from '../contexts/ConfigContext';
import SectionHeader from './SectionHeader';

function SettingsOperations() {
  const { t } = useLanguage();
  const { reloadConfig } = useConfig();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [restoreResult, setRestoreResult] = useState(null);
  const [messageIsError, setMessageIsError] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await api.get('/setup/download-settings', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'lbb-settings.zip');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage(t('maintenance.settings.download_success') || 'Settings downloaded successfully');
    } catch (error) {
      console.error('Failed to download settings:', error);
      setMessage(t('maintenance.settings.download_error') || 'Failed to download settings');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];

    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith('.zip')) {
      setMessage(t('maintenance.settings.invalid_file_type') || 'Please select a ZIP file');
      event.target.value = '';
      return;
    }

    setLoading(true);
    setMessage('');
    setMessageIsError(false);
    setRestoreResult(null);

    try {
      const formData = new FormData();
      formData.append('settings', file);

      const response = await api.post('/setup/upload-settings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setRestoreResult({
        files: response.data?.files || [],
        password: response.data?.password,
        wifiPasswordApplied: Boolean(response.data?.wifiPasswordApplied),
      });
      event.target.value = '';
      // The restored config.cfg replaces the current settings.
      reloadConfig().catch(() => {});
    } catch (error) {
      console.error('Failed to upload settings:', error);
      const code = error?.response?.data?.error;
      setMessage(
        code === 'not_zip'
          ? t('config.settings_restore_not_zip')
          : t('config.settings_restore_problem'),
      );
      setMessageIsError(true);
      event.target.value = '';
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      {restoreResult && (
        <Alert severity="success" onClose={() => setRestoreResult(null)} data-testid="settings-restore-result">
          <AlertTitle>{t('config.settings_restore_success')}</AlertTitle>
          {restoreResult.files.length > 0 ? (
            <List dense disablePadding>
              {restoreResult.files.map((name) => (
                <ListItem key={name} disableGutters sx={{ py: 0 }}>
                  <ListItemText primary={name} primaryTypographyProps={{ variant: 'body2', fontFamily: 'monospace' }} />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2">{t('config.settings_restore_no_files')}</Typography>
          )}
          {restoreResult.password === 'set' && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t('config.settings_restore_password_set')}
            </Typography>
          )}
          {restoreResult.password === 'removed' && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              {t('config.settings_restore_password_removed')}
            </Typography>
          )}
          {restoreResult.wifiPasswordApplied && (
            <Typography variant="body2">{t('config.settings_restore_wifi_password')}</Typography>
          )}
        </Alert>
      )}

      {message && (
        <Alert
          severity={
            messageIsError ||
            message.includes('error') || message.includes('Error') || message.includes('invalid') || message.includes('Please')
              ? 'error'
              : 'success'
          }
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      <Box>
        <SectionHeader level={3} title={t('config.save_settings_download_header') || 'Download'} />
        <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
          {t('config.save_settings_download_text') || 'Get a zip-archive with your settings'}
        </Typography>
        <Button
          variant="outlined"
          startIcon={loading ? null : <DownloadIcon />}
          onClick={handleDownload}
          disabled={loading}
        >
          {t('config.save_settings_download_link_text') || 'Download settings'}
        </Button>
      </Box>

      <Box>
        <SectionHeader level={3} title={t('config.save_settings_upload_header') || 'Upload'} />
        <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
          {t('config.save_settings_upload_text') || 'Upload a zip-archive with your settings'}
        </Typography>
        <input
          accept=".zip"
          style={{ display: 'none' }}
          id="settings-file-input"
          type="file"
          onChange={handleFileUpload}
        />
        <label htmlFor="settings-file-input" style={{ pointerEvents: loading ? 'none' : 'auto' }}>
          <Button
            variant="contained"
            component="span"
            startIcon={loading ? null : <UploadIcon />}
            disabled={loading}
          >
            {loading
              ? (t('maintenance.settings.uploading') || 'Uploading...')
              : (t('config.save_settings_upload_button') || 'Upload settings')}
          </Button>
        </label>
      </Box>
    </Stack>
  );
}

export default SettingsOperations;
