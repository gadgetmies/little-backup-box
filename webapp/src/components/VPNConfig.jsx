import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Stack,
  CircularProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import api from '../utils/api';

function VPNConfig({ onSavedStateChange, onMessage }) {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [formData, setFormData] = useState({});
  const [vpnStatus, setVpnStatus] = useState({});
  const [uploadType, setUploadType] = useState('none');
  const [loading, setLoading] = useState(false);
  const lastSavedConfig = useRef(null);

  const vpnTypes = ['OpenVPN', 'WireGuard'];
  const vpnTimeouts = [5, 10, 20, 30, 40, 50, 60, 90, 120, 300, 600];

  useEffect(() => {
    if (config) {
      const initial = {
        conf_VPN_TYPE_RSYNC: config.conf_VPN_TYPE_RSYNC || 'none',
        conf_VPN_TYPE_CLOUD: config.conf_VPN_TYPE_CLOUD || 'none',
        conf_VPN_TIMEOUT: config.conf_VPN_TIMEOUT || 20,
      };
      setFormData(initial);
      lastSavedConfig.current = JSON.stringify(initial);
    }
    loadVpnStatus();
  }, [config]);

  const loadVpnStatus = async () => {
    try {
      const response = await api.get('/vpn/status');
      setVpnStatus(response.data || {});
    } catch (error) {
      console.error('Failed to load VPN status:', error);
    }
  };

  const [saveCount, setSaveCount] = useState(0);
  const handleSave = useCallback(async () => {
    await updateConfig(formData);
    lastSavedConfig.current = JSON.stringify(formData);
    setSaveCount((c) => c + 1);
  }, [formData, updateConfig]);

  useEffect(() => {
    if (Object.keys(formData).length === 0) return;
    const formDataString = JSON.stringify(formData);
    const isSaved = lastSavedConfig.current === formDataString;
    if (onSavedStateChange) {
      onSavedStateChange(isSaved, handleSave);
    }
  }, [formData, saveCount, onSavedStateChange, handleSave]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || uploadType === 'none') {
      return;
    }

    setLoading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', uploadType);

      await api.post('/vpn/upload', uploadFormData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onMessage?.(t('integrations.vpn.file_uploaded') || 'VPN config file uploaded');
      setUploadType('none');
      event.target.value = '';
      loadVpnStatus();
    } catch (error) {
      onMessage?.(error.response?.data?.error || 'Error uploading VPN config file');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = async (vpnType) => {
    const confirmMessage = (t('integrations.vpn.confirm_remove') || 'Are you sure you want to remove the {type} config file?').replace('{type}', vpnType);
    if (!window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    try {
      await api.post('/vpn/remove', { type: vpnType });
      onMessage?.(t('integrations.vpn.file_removed') || 'VPN config file removed');
      loadVpnStatus();
    } catch (error) {
      onMessage?.(error.response?.data?.error || 'Error removing VPN config file');
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <Typography variant="h2">
        {t('config.vpn.type_header') || 'Which VPN to activate?'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t('config.vpn.type_desc') || 'Which VPN should be activated before transferring data to a network service? Caution: The Little Backup Box interface may not be accessible while the backup is running.'}
      </Typography>

      <FormControl sx={{ maxWidth: 400 }}>
        <InputLabel>{t('config.vpn.type_rsync_label') || 'For rsync server'}</InputLabel>
        <Select
          value={formData.conf_VPN_TYPE_RSYNC || 'none'}
          onChange={(e) => setFormData({ ...formData, conf_VPN_TYPE_RSYNC: e.target.value })}
          label={t('config.vpn.type_rsync_label') || 'For rsync server'}
        >
          <MenuItem value="none">{t('config.vpn.type_none') || "Don't use VPN"}</MenuItem>
          {vpnTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl sx={{ maxWidth: 400 }}>
        <InputLabel>{t('config.vpn.type_cloud_label') || 'For cloud services'}</InputLabel>
        <Select
          value={formData.conf_VPN_TYPE_CLOUD || 'none'}
          onChange={(e) => setFormData({ ...formData, conf_VPN_TYPE_CLOUD: e.target.value })}
          label={t('config.vpn.type_cloud_label') || 'For cloud services'}
        >
          <MenuItem value="none">{t('config.vpn.type_none') || "Don't use VPN"}</MenuItem>
          {vpnTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="h2">
        {t('config.vpn.timeout_header') || 'VPN timeout'}
      </Typography>
      <FormControl sx={{ maxWidth: 400 }}>
        <InputLabel>{t('config.vpn.timeout_label') || 'What is the maximum time to wait for the VPN connection to be established?'}</InputLabel>
        <Select
          value={formData.conf_VPN_TIMEOUT || 20}
          onChange={(e) => setFormData({ ...formData, conf_VPN_TIMEOUT: e.target.value })}
          label={t('config.vpn.timeout_label') || 'What is the maximum time to wait for the VPN connection to be established?'}
        >
          {vpnTimeouts.map((timeout) => (
            <MenuItem key={timeout} value={timeout}>
              {timeout} {t('seconds_short') || 's'}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Typography variant="h2">
        {t('config.vpn.upload_header') || 'Upload VPN configuration file'}
      </Typography>

      <FormControl sx={{ maxWidth: 400 }}>
        <InputLabel>{t('config.vpn.upload_type_label') || 'For which VPN variant should the configuration file be used?'}</InputLabel>
        <Select
          value={uploadType}
          onChange={(e) => setUploadType(e.target.value)}
          label={t('config.vpn.upload_type_label') || 'For which VPN variant should the configuration file be used?'}
        >
          <MenuItem value="none">{t('config.vpn.upload_type_none') || "Don't upload"}</MenuItem>
          {vpnTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Button
        variant="outlined"
        component="label"
        startIcon={<CloudUploadIcon />}
        disabled={uploadType === 'none' || loading}
        sx={{ width: 'auto', alignSelf: 'flex-start' }}
      >
        {t('config.vpn.upload_file_label') || 'Select VPN config file'}
        <input
          type="file"
          hidden
          onChange={handleFileUpload}
          accept=".conf,.ovpn,.zip"
        />
      </Button>

      {Object.keys(vpnStatus).some((type) => vpnStatus[type]?.fileExists) && (
        <>
          <Typography variant="h2">
            {t('config.vpn.remove_header') || 'Delete VPN configuration file'}
          </Typography>
          <Stack spacing={1} alignItems="flex-start">
            {vpnTypes.map((type) => {
              if (!vpnStatus[type]?.fileExists) return null;
              return (
                <Button
                  key={type}
                  variant="outlined"
                  color="error"
                  startIcon={<DeleteIcon />}
                  onClick={() => handleRemoveFile(type)}
                  disabled={loading}
                >
                  {t('integrations.vpn.remove') || 'Remove'} {type}
                </Button>
              );
            })}
          </Stack>
        </>
      )}
    </Stack>
  );
}

export default VPNConfig;
