import React, { useState } from 'react';
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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import ProtectedCommandDialog from './ProtectedCommandDialog';

function UpdateManager() {
  const { t } = useLanguage();
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('');
  // 'main' | 'development' while the ProtectedCommandDialog is open
  // (cmd.php CMD=update / CMD=update_development).
  const [installBranch, setInstallBranch] = useState(null);

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

  const handleInstallUpdate = () => {
    if (!updateAvailable) {
      setMessage(t('maintenance.update.no_update_available') || 'System is already up to date');
      return;
    }
    setMessage('');
    setInstallBranch('main');
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
            disabled={checking}
          >
            {t('config.update.check_label')}
          </Button>
          
          {updateAvailable && (
            <Button
              variant="contained"
              color="error"
              startIcon={<WarningAmberIcon />}
              onClick={handleInstallUpdate}
              disabled={checking}
              sx={{ minHeight: 44 }}
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
            <Button
              variant="outlined"
              color="error"
              startIcon={<WarningAmberIcon />}
              onClick={() => setInstallBranch('development')}
              sx={{ minHeight: 44 }}
            >
              {t('maintenance.dev_update_button')}
            </Button>
          </Box>
        )}

      <ProtectedCommandDialog
        open={Boolean(installBranch)}
        onClose={() => setInstallBranch(null)}
        title={installBranch === 'development' ? t('cmd.update_development_title') : t('cmd.update_title')}
        consequence={t('cmd.update_warning')}
        actionLabel={installBranch === 'development' ? t('maintenance.dev_update_button') : t('config.update.linktext')}
        allowMail={false}
        onConfirm={(body) => api.post('/setup/update/install', { ...body, branch: installBranch || 'main' })}
      />
    </Box>
  );
}

export default UpdateManager;

