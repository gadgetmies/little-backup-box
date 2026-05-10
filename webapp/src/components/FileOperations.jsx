import React, { useState } from 'react';
import {
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Box,
  Divider,
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import WarningIcon from '@mui/icons-material/Warning';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import BackupTargetSelector from './BackupTargetSelector';

function FileOperations() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    target: 'usb',
    presetSource: '',
    presetTarget: '',
    powerOff: false,
  });

  const targetLabel = (target) => {
    const labels = {
      usb: t('box.backup.mode.usb') || 'USB storage',
      internal: t('box.backup.mode.internal') || 'Int. storage',
      nvme: t('box.backup.mode.nvme') || 'NVMe SSD',
    };
    return labels[target] || target;
  };

  const handleRename = async () => {
    setLoading(true);
    setMessage('');
    try {
      await api.post('/backup/function', {
        function: 'rename',
        target: form.target,
        presetSource: form.presetSource,
        presetTarget: form.presetTarget,
        powerOff: form.powerOff,
      });
      setMessage(t('maintenance.file.rename_started') || 'Rename files operation started');
    } catch (error) {
      console.error('Failed to start rename:', error);
      setMessage(t('maintenance.file.rename_error') || 'Failed to start rename operation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      {message && (
        <Alert
          severity={message.includes('error') || message.includes('Error') ? 'error' : 'success'}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      <Alert severity="warning" icon={<WarningIcon />}>
        {t('config.backup.rename.warning') || 'Attention! The files should then be deleted from the source. Otherwise they will be transferred again during the next backup, renamed and replacing the version from the previous backup.'}
      </Alert>

      <BackupTargetSelector value={form} onChange={setForm} disabled={loading} />

      <Divider />

      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('config.backup.rename.desc') || 'An attempt is made to read the creation date from all media files on local storage devices. If this is possible, the file is renamed according to the following pattern: For example, "Image0123.jpg" becomes "2024-10-18_23-47-26_-_Image.jpg".'}
        </Typography>
        <Button
          variant="outlined"
          color="error"
          startIcon={loading ? <CircularProgress size={20} /> : <ArrowForwardIcon />}
          onClick={handleRename}
          disabled={loading}
        >
          {t('box.backup.mode.rename') || 'Rename'} → {targetLabel(form.target)}
        </Button>
      </Box>
    </Stack>
  );
}

export default FileOperations;
