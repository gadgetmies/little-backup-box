import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useLanguage } from '../contexts/LanguageContext';
import { useDrawer } from '../contexts/DrawerContext';
import { drawerWidth, drawerCollapsedWidth } from '../components/Menu';
import api from '../utils/api';
import LogConfig from '../components/LogConfig';
import LogMonitor from '../components/LogMonitor';
import UpdateManager from '../components/UpdateManager';
import LibRawUpdater from '../components/LibRawUpdater';

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`system-tabpanel-${index}`}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const TAB_NAMES = ['device', 'cameras', 'updates', 'logs'];

function System() {
  const { t } = useLanguage();
  const { desktopOpen } = useDrawer();
  const [systemInfo, setSystemInfo] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [copiedText, setCopiedText] = useState('');
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = window.localStorage.getItem('lbb-tabs-system');
    const idx = TAB_NAMES.indexOf(saved);
    return idx >= 0 ? idx : 0;
  });
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

  const handleTabChange = (_event, newValue) => {
    setCurrentTab(newValue);
    if (TAB_NAMES[newValue]) {
      localStorage.setItem('lbb-tabs-system', TAB_NAMES[newValue]);
    }
  };

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
    <Box sx={{ pb: 10 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="system tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label={t('system.tab.device') || 'Device'} id="system-tab-0" aria-controls="system-tabpanel-0" />
          <Tab label={t('system.tab.cameras') || 'Cameras'} id="system-tab-1" aria-controls="system-tabpanel-1" />
          <Tab label={t('system.tab.updates') || 'Updates'} id="system-tab-2" aria-controls="system-tabpanel-2" />
          <Tab label={t('system.tab.logs') || 'Logs'} id="system-tab-3" aria-controls="system-tabpanel-3" />
        </Tabs>
      </Box>

      <TabPanel value={currentTab} index={0}>
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
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
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
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Stack spacing={3}>
          <UpdateManager />
          <Divider />
          <LibRawUpdater />
        </Stack>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Stack spacing={3}>
          <LogConfig />
          <LogMonitor />
        </Stack>
      </TabPanel>

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
    </Box>
  );
}

export default System;
