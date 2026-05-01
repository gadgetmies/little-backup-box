import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useLanguage } from '../contexts/LanguageContext';
import { useDrawer } from '../contexts/DrawerContext';
import { drawerWidth, drawerCollapsedWidth } from '../components/Menu';
import api from '../utils/api';
import PageSection from '../components/PageSection';
import LogConfig from '../components/LogConfig';
import LogMonitor from '../components/LogMonitor';
import UpdateManager from '../components/UpdateManager';

function System() {
  const { t } = useLanguage();
  const { desktopOpen } = useDrawer();
  const [systemInfo, setSystemInfo] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [copiedText, setCopiedText] = useState('');
  const currentDrawerWidth = desktopOpen ? drawerWidth : drawerCollapsedWidth;

  const loadSystemInfo = async () => {
    try {
      const response = await api.get('/sysinfo/system');
      setSystemInfo(response.data);
    } catch (error) {
      console.error('Failed to load system info:', error);
    }
  };

  const loadCameras = async () => {
    try {
      const response = await api.get('/sysinfo/cameras');
      setCameras(response.data.cameras || []);
    } catch (error) {
      console.error('Failed to load cameras:', error);
    }
  };

  const loadAll = useCallback(() => {
    loadSystemInfo();
    loadCameras();
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, [loadAll]);

  const handleCopyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(''), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return (
    <Stack spacing={3} sx={{ pb: 10 }}>
      <PageSection variant="card" title={t('sysinfo.system') || 'Device info'}>
        {systemInfo ? (
          <Table size="small">
            <TableBody>
              <TableRow>
                <TableCell>{t('sysinfo.model') || 'Model'}:</TableCell>
                <TableCell>{systemInfo.model}</TableCell>
              </TableRow>
              {systemInfo.temp !== null && (
                <TableRow>
                  <TableCell>{t('sysinfo.temp') || 'Temperature'}:</TableCell>
                  <TableCell>
                    <Chip
                      label={`${systemInfo.temp}°C`}
                      size="small"
                      color={systemInfo.temp > 70 ? 'error' : systemInfo.temp > 60 ? 'warning' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              )}
              {systemInfo.cpuusage !== null && (
                <TableRow>
                  <TableCell>{t('sysinfo.cpuload') || 'CPU Load'}:</TableCell>
                  <TableCell>
                    <Chip
                      label={`${systemInfo.cpuusage}%`}
                      size="small"
                      color={systemInfo.cpuusage > 80 ? 'error' : systemInfo.cpuusage > 60 ? 'warning' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              )}
              {systemInfo.memRam && (
                <TableRow>
                  <TableCell>{t('sysinfo.memory_ram') || 'RAM'}:</TableCell>
                  <TableCell>{systemInfo.memRam}</TableCell>
                </TableRow>
              )}
              {systemInfo.memSwap && (
                <TableRow>
                  <TableCell>{t('sysinfo.memory_swap') || 'Swap'}:</TableCell>
                  <TableCell>{systemInfo.memSwap}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell>{t('sysinfo.conditions') || 'Conditions'}:</TableCell>
                <TableCell>
                  <Chip
                    label={systemInfo.abnormalConditions}
                    size="small"
                    color={systemInfo.abnormalConditions === 'None' ? 'success' : 'warning'}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('sysinfo.loading') || 'Loading…'}
          </Typography>
        )}
      </PageSection>

      <PageSection variant="card" title={t('sysinfo.cameras') || 'Connected devices'}>
        {cameras.length > 0 ? (
          <Stack spacing={2}>
            {cameras.map((camera, i) => (
              <Box key={i} sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                  {camera.model}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {camera.port}
                </Typography>
                {camera.serial && (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {t('sysinfo.camera_serial') || 'Serial number'}: {camera.serial}
                  </Typography>
                )}
                {camera.storages && camera.storages.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {camera.storages.map((storage, storageIndex) => {
                      const modelPattern = `${camera.model}:!${storage}`;
                      const specificPattern = camera.serial
                        ? `${camera.model}_${camera.serial}:!${storage}`
                        : null;
                      return (
                        <Box key={storageIndex} sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {storage}
                          </Typography>
                          <Box sx={{ ml: 1, mt: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                                {modelPattern}
                              </Typography>
                              <Tooltip title={copiedText === modelPattern ? 'Copied!' : 'Copy to clipboard'}>
                                <IconButton size="small" onClick={() => handleCopyToClipboard(modelPattern)}>
                                  <ContentCopyIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Box>
                            {specificPattern && (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <Typography variant="body2" sx={{ fontFamily: 'monospace', flex: 1 }}>
                                  {specificPattern}
                                </Typography>
                                <Tooltip title={copiedText === specificPattern ? 'Copied!' : 'Copy to clipboard'}>
                                  <IconButton size="small" onClick={() => handleCopyToClipboard(specificPattern)}>
                                    <ContentCopyIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Box>
                            )}
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            ))}
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t('sysinfo.no_cameras') || 'No cameras detected'}
          </Typography>
        )}
      </PageSection>

      <PageSection
        variant="accordion"
        title={t('maintenance.update.section') || 'Updates'}
        localStorageKey="lbb-accordion-system-updates"
      >
        <UpdateManager />
      </PageSection>

      <PageSection variant="card" title={t('system.logs_section') || 'Logs'}>
        <Stack spacing={3}>
          <LogConfig />
          <LogMonitor />
        </Stack>
      </PageSection>

      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: { md: `${currentDrawerWidth}px` },
          right: 0,
          zIndex: 1000,
          p: 2,
          backgroundColor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'center',
          transition: (theme) =>
            theme.transitions.create('left', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        <Button variant="contained" startIcon={<RefreshIcon />} onClick={loadAll} size="large">
          {t('sysinfo.refresh_button') || 'Refresh'}
        </Button>
      </Box>
    </Stack>
  );
}

export default System;
