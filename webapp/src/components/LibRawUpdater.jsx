import React, { useState, useCallback } from 'react';
import { Box, Typography, Button, Alert, CircularProgress } from '@mui/material';
import BuildIcon from '@mui/icons-material/Build';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import useAsyncAction from '../hooks/useAsyncAction';
import LogMonitor from './LogMonitor';

function LibRawUpdater() {
  const { t } = useLanguage();
  const [success, setSuccess] = useState(false);

  const updateLibRawFn = useCallback(() => api.post('/setup/update/libraw'), []);
  const { execute, loading, error } = useAsyncAction(updateLibRawFn);

  const handleUpdate = () => {
    setSuccess(false);
    execute()
      .then(() => setSuccess(true))
      .catch(() => {
        // error shown via error state
      });
  };

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t('maintenance.libraw_title')}
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {t('maintenance.libraw_description')}
      </Typography>
      <Alert severity="warning" sx={{ mb: 2 }}>
        {t('maintenance.libraw_warning')}
      </Alert>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {t('maintenance.update.install_started')}
        </Alert>
      )}

      <Button
        variant="contained"
        startIcon={loading ? <CircularProgress size={20} /> : <BuildIcon />}
        onClick={handleUpdate}
        disabled={loading}
      >
        {t('maintenance.libraw_button')}
      </Button>

      {loading && <LogMonitor />}
    </Box>
  );
}

export default LibRawUpdater;
