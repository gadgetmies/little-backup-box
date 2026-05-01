import React, { useState } from 'react';
import {
  Stack,
  Alert,
  Button,
  Box,
  Typography,
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import SectionHeader from './SectionHeader';

function SettingsOperations() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

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

    try {
      const formData = new FormData();
      formData.append('settings', file);

      await api.post('/setup/upload-settings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setMessage(t('maintenance.settings.upload_success') || 'Settings uploaded successfully');
      event.target.value = '';
    } catch (error) {
      console.error('Failed to upload settings:', error);
      setMessage(t('maintenance.settings.upload_error') || 'Failed to upload settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      {message && (
        <Alert
          severity={
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
