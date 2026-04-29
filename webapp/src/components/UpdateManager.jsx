import React, { useState, useCallback } from 'react';
import {
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Box,
  Chip,
} from '@mui/material';
import UpdateIcon from '@mui/icons-material/Update';
import InstallIcon from '@mui/icons-material/Download';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import useAsyncAction from '../hooks/useAsyncAction';

function UpdateManager() {
  const { t } = useLanguage();
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [message, setMessage] = useState('');
  const [devInstallSuccess, setDevInstallSuccess] = useState(false);

  const installDevUpdateFn = useCallback(
    () => api.post('/setup/update/install', { branch: 'development' }),
    []
  );
  const {
    execute: executeDevInstall,
    loading: devInstalling,
    error: devInstallError,
  } = useAsyncAction(installDevUpdateFn);

  const handleCheckUpdate = async () => {
    setChecking(true);
    setMessage('');
    try {
      const response = await api.get('/setup/update-check');
      setUpdateAvailable(response.data.updateAvailable);
    } catch (error) {
      console.error('Failed to check for updates:', error);
      setMessage(t('maintenance.update.check_error') || 'Failed to check for updates');
    } finally {
      setChecking(false);
    }
  };

  const handleGetStatus = async () => {
    try {
      const response = await api.get('/setup/update/status');
      setUpdateStatus(response.data);
    } catch (error) {
      console.error('Failed to get update status:', error);
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateAvailable) {
      setMessage(t('maintenance.update.no_update_available') || 'System is already up to date');
      return;
    }

    setInstalling(true);
    setMessage('');
    try {
      await api.post('/setup/update/install');
      setMessage(t('maintenance.update.install_started') || 'Update installation started');
    } catch (error) {
      console.error('Failed to install update:', error);
      setMessage(t('maintenance.update.install_error') || 'Failed to install update');
    } finally {
      setInstalling(false);
    }
  };

  React.useEffect(() => {
    handleGetStatus();
  }, []);

  return (
    <Box>
      <Typography variant="h2" gutterBottom>
        {t('config.update.section')}
      </Typography>

      {updateStatus && (
          <Box sx={{ mb: 2 }}>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              {t('maintenance.update.branch')}:&nbsp;
              <Chip 
                label={updateStatus.branch} 
                size="small" 
                color={updateStatus.branch === 'development' ? 'warning' : 'default'} 
              />
            </Stack>
            {updateStatus.installedVersion && (
              <Typography variant="body2" color="text.secondary">
                {t('maintenance.update.installed_version')}: {updateStatus.installedVersion}
              </Typography>
            )}
            {updateStatus.availableVersion && (
              <Typography variant="body2" color="text.secondary">
                {t('maintenance.update.available_version')}: {updateStatus.availableVersion}
              </Typography>
            )}
          </Box>
        )}

        {updateAvailable !== null && (
          <Alert 
            severity={updateAvailable ? 'info' : 'success'} 
            sx={{ mb: 2 }}
          >
            {updateAvailable 
              ? t('config.update.available')
              : t('config.update.not_available')
            }
          </Alert>
        )}

        {message && (
          <Alert 
            severity={message.includes('Error') || message.includes('error') ? 'error' : 'info'} 
            sx={{ mb: 2 }}
            onClose={() => setMessage('')}
          >
            {message}
          </Alert>
        )}

        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={checking ? <CircularProgress size={20} /> : <UpdateIcon />}
            onClick={handleCheckUpdate}
            disabled={checking || installing}
          >
            {t('config.update.check_label')}
          </Button>
          
          {updateAvailable && (
            <Button
              variant="contained"
              color="primary"
              startIcon={installing ? <CircularProgress size={20} /> : <InstallIcon />}
              onClick={handleInstallUpdate}
              disabled={installing || checking}
            >
              {t('config.update.linktext')}
            </Button>
          )}
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mt: 2,
            '& ul': {
              marginLeft: 0,
              paddingLeft: '1.5em',
            },
            '& li': {
              marginLeft: 0,
              paddingLeft: 0,
            },
          }}
          dangerouslySetInnerHTML={{ __html: t('config.update.text') }}
        />

        {(!updateStatus || updateStatus.branch !== 'development') && (
          <Box sx={{ mt: 3 }}>
            <Alert severity="warning" sx={{ mb: 2 }}>
              {t('maintenance.dev_update_warning')}
            </Alert>
            {devInstallError && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => {}}>
                {t('maintenance.dev_update_error')}
              </Alert>
            )}
            {devInstallSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {t('maintenance.update.install_started')}
              </Alert>
            )}
            <Button
              variant="outlined"
              color="warning"
              startIcon={devInstalling ? <CircularProgress size={20} /> : <InstallIcon />}
              onClick={() => {
                executeDevInstall()
                  .then(() => setDevInstallSuccess(true))
                  .catch(() => {
                    // error shown via devInstallError
                  });
              }}
              disabled={devInstalling}
            >
              {t('maintenance.dev_update_button')}
            </Button>
          </Box>
        )}
    </Box>
  );
}

export default UpdateManager;

