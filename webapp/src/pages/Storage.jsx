import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Paper,
  Divider,
  Select,
  MenuItem,
  FormControl,
  FormLabel,
  InputLabel,
  Grid,
  ListSubheader,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  TableHead,
  Tabs,
  Tab,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useLanguage } from '../contexts/LanguageContext';
import { useDrawer } from '../contexts/DrawerContext';
import { drawerWidth, drawerCollapsedWidth } from '../components/Menu';
import api from '../utils/api';
import DeviceSelector from '../components/DeviceSelector';
import LogMonitor from '../components/LogMonitor';
import ProtectedCommandDialog from '../components/ProtectedCommandDialog';

const INFO_REFRESH_MS = 5000;

function parseLsblkOutput(output) {
  if (!output || !output.trim()) {
    return { headers: [], rows: [] };
  }

  const lines = output.trim().split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headerLine = lines[0];
  const dataLines = lines.slice(1);

  const headers = headerLine.split('\t').map(h => h.trim()).filter(h => h);

  if (headers.length === 0) {
    return { headers: [], rows: [] };
  }

  const rows = dataLines.map(line => {
    const values = line.split('\t').map(v => v.trim());
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });

  return { headers, rows };
}

function Storage() {
  const { t } = useLanguage();
  const { desktopOpen } = useDrawer();
  const currentDrawerWidth = desktopOpen ? drawerWidth : drawerCollapsedWidth;
  const [mounts, setMounts] = useState('');
  const [mountableStorages, setMountableStorages] = useState([]);
  const [selectedSource, setSelectedSource] = useState('');
  const [selectedTarget, setSelectedTarget] = useState('');
  const [sourcePartition, setSourcePartition] = useState('');
  const [targetPartition, setTargetPartition] = useState('');
  const [sourcePartitions, setSourcePartitions] = useState([]);
  const [targetPartitions, setTargetPartitions] = useState([]);
  const [message, setMessage] = useState('');
  const [messageSeverity, setMessageSeverity] = useState('success');
  
  const [fsckPartition, setFsckPartition] = useState('-');
  const [formatPartition, setFormatPartition] = useState('-');
  const [formatFstype, setFormatFstype] = useState('-');
  const [f3Device, setF3Device] = useState('-');
  const [f3Action, setF3Action] = useState('-');
  
  // The command currently shown in the ProtectedCommandDialog (cmd.php).
  const [pendingCommand, setPendingCommand] = useState(null);
  const [currentTab, setCurrentTab] = useState(0);

  const [diskSpace, setDiskSpace] = useState({ headers: [], rows: [] });
  const [devices, setDevices] = useState({ headers: [], rows: [] });
  const [deviceStates, setDeviceStates] = useState([]);

  useEffect(() => {
    // Load selected tab from localStorage
    const savedTab = localStorage.getItem('lbb-tabs-storage');
    if (savedTab !== null) {
      try {
        const tabIndex = parseInt(savedTab, 10);
        if (tabIndex >= 0 && tabIndex <= 4) {
          setCurrentTab(tabIndex);
        }
      } catch (e) {
        console.error('Failed to parse saved tab:', e);
      }
    }
    
    loadAll();
  }, []);

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    localStorage.setItem('lbb-tabs-storage', newValue.toString());
  };

  const loadAll = () => {
    loadMounts();
    loadMountableStorages();
    loadDiskSpace();
    loadDevices();
    loadDeviceStates();
  };

  useEffect(() => {
    if (selectedSource === 'usb' || selectedSource === 'nvme') {
      loadPartitionsForStorage('source', selectedSource);
    } else {
      setSourcePartitions([]);
    }
  }, [selectedSource]);

  useEffect(() => {
    if (selectedTarget === 'usb' || selectedTarget === 'nvme') {
      loadPartitionsForStorage('target', selectedTarget);
    } else {
      setTargetPartitions([]);
    }
  }, [selectedTarget]);

  const loadMounts = async () => {
    try {
      const response = await api.get('/tools/mounts');
      setMounts(response.data.mountsList || '');
    } catch (error) {
      console.error('Failed to load mounts:', error);
    }
  };

  const loadMountableStorages = async () => {
    try {
      const response = await api.get('/tools/mountable-storages');
      setMountableStorages(response.data.mountableStorages || []);
    } catch (error) {
      console.error('Failed to load mountable storages:', error);
    }
  };

  const loadDiskSpace = async () => {
    try {
      const response = await api.get('/sysinfo/diskspace');
      if (response.data && response.data.output) {
        const parsed = parseLsblkOutput(response.data.output);
        setDiskSpace(parsed);
      } else {
        console.error('Invalid response format for disk space:', response.data);
        setDiskSpace({ headers: [], rows: [] });
      }
    } catch (error) {
      console.error('Failed to load disk space:', error);
      setDiskSpace({ headers: [], rows: [] });
    }
  };

  const loadDevices = async () => {
    try {
      const response = await api.get('/sysinfo/devices');
      if (response.data && response.data.output) {
        const parsed = parseLsblkOutput(response.data.output);
        setDevices(parsed);
      } else {
        console.error('Invalid response format for devices:', response.data);
        setDevices({ headers: [], rows: [] });
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
      setDevices({ headers: [], rows: [] });
    }
  };

  const loadDeviceStates = async () => {
    try {
      const response = await api.get('/sysinfo/device-states');
      setDeviceStates(response.data.deviceStates || []);
    } catch (error) {
      console.error('Failed to load device states:', error);
    }
  };

  // sysinfo.php:46 reloads every 5 s; refresh the Info tab while it is visible.
  useEffect(() => {
    if (currentTab !== 0) return undefined;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      loadDiskSpace();
      loadDevices();
      loadDeviceStates();
    }, INFO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [currentTab]);

  const loadPartitionsForStorage = async (role, storageType) => {
    try {
      const params = new URLSearchParams({
        storageType: storageType || '',
        listPartitions: 'true',
        skipMounted: 'true',
        ignoreFs: 'false',
      });

      const response = await api.get(`/tools/devices?${params}`);
      const partitions = response.data.devices || [];
      
      if (role === 'source') {
        setSourcePartitions(partitions);
      } else {
        setTargetPartitions(partitions);
      }
    } catch (error) {
      console.error('Failed to load partitions:', error);
      if (role === 'source') {
        setSourcePartitions([]);
      } else {
        setTargetPartitions([]);
      }
    }
  };

  const isMounted = (role, storage) => {
    const storageKey = `${role}_${storage}`;
    return mounts.includes(` ${storageKey} `);
  };

  const getStorageLabel = (storage) => {
    if (storage.startsWith('cloud:')) {
      return storage.substring(6);
    }
    if (storage === 'nvme') {
      return t('tools.mount.nvme') || 'NVMe SSD';
    }
    if (storage === 'usb') {
      return t('tools.mount.usb') || 'USB';
    }
    return storage;
  };

  const getGroupLabel = (group, t) => {
    const labels = {
      usb: t('main.backup.usb_devices') || 'USB Devices',
      nvme: t('tools.mount.nvme') || 'NVMe SSD',
      cloud: t('box.backup.mode.cloud') || 'Cloud',
    };
    return labels[group] || group;
  };

  const groupStoragesByType = (storages) => {
    const grouped = {
      usb: [],
      nvme: [],
      cloud: [],
    };

    storages.forEach(storage => {
      if (storage === 'usb') {
        grouped.usb.push(storage);
      } else if (storage === 'nvme') {
        grouped.nvme.push(storage);
      } else if (storage.startsWith('cloud:')) {
        grouped.cloud.push(storage);
      }
    });

    return grouped;
  };

  const hasMultipleDevices = (storageType, partitions) => {
    if (storageType !== 'usb' && storageType !== 'nvme') {
      return false;
    }
    return partitions.length > 1;
  };

  const handleMount = async (role, storage, deviceIdentifier) => {
    try {
      await api.post('/tools/mount', { 
        role, 
        storage, 
        deviceIdentifierPreset: deviceIdentifier || '' 
      });
      setMessage(t('tools.mount_success'));
      setMessageSeverity('success');
      loadMounts();
    } catch (error) {
      console.error('Failed to mount:', error);
      setMessage(error.response?.data?.error || t('tools.mount_failed'));
      setMessageSeverity('error');
    }
  };

  const handleUmount = async (role, storage) => {
    try {
      await api.post('/tools/umount', { role, storage });
      setMessage(t('tools.umount_success'));
      setMessageSeverity('success');
      loadMounts();
    } catch (error) {
      console.error('Failed to umount:', error);
      setMessage(error.response?.data?.error || t('tools.umount_failed'));
      setMessageSeverity('error');
    }
  };

  const handleSourceMount = async () => {
    if (!selectedSource) {
      setMessage(t('tools.select_source_first'));
      setMessageSeverity('error');
      return;
    }

    const deviceIdentifier = hasMultipleDevices(selectedSource, sourcePartitions) 
      ? sourcePartition 
      : '';
    
    if (isMounted('source', selectedSource)) {
      await handleUmount('source', selectedSource);
    } else {
      await handleMount('source', selectedSource, deviceIdentifier);
    }
  };

  const handleTargetMount = async () => {
    if (!selectedTarget) {
      setMessage(t('tools.select_target_first'));
      setMessageSeverity('error');
      return;
    }

    const deviceIdentifier = hasMultipleDevices(selectedTarget, targetPartitions) 
      ? targetPartition 
      : '';
    
    if (isMounted('target', selectedTarget)) {
      await handleUmount('target', selectedTarget);
    } else {
      await handleMount('target', selectedTarget, deviceIdentifier);
    }
  };

  const handleFsckCheck = () => {
    if (fsckPartition === '-') {
      setMessage(t('tools.select_partition_first'));
      setMessageSeverity('error');
      return;
    }
    // cmd.php:123-129 — the check needs no password but still shows output.
    setPendingCommand({
      title: `${t('cmd.fsck.header')}: ${fsckPartition}`,
      consequence: t('tools.fsck_check_consequence'),
      actionLabel: t('tools.fsck_check_b'),
      requiresPassword: false,
      destructive: false,
      request: (body) => api.post('/tools/fsck/check', { partition: fsckPartition, ...body }),
    });
  };

  const handleFsckRepair = () => {
    if (fsckPartition === '-') {
      setMessage(t('tools.select_partition_first'));
      setMessageSeverity('error');
      return;
    }
    setPendingCommand({
      title: t('tools.fsck_repair_title').replace('{device}', fsckPartition),
      consequence: t('cmd.fsck.warning'),
      actionLabel: t('tools.fsck_autorepair_b'),
      request: (body) => api.post('/tools/fsck/repair', { partition: fsckPartition, ...body }),
    });
  };

  const handleFormat = () => {
    if (formatPartition === '-' || formatFstype === '-') {
      setMessage(t('tools.select_partition_fstype_first'));
      setMessageSeverity('error');
      return;
    }
    setPendingCommand({
      title: t('tools.format_title').replace('{device}', formatPartition).replace('{fstype}', formatFstype),
      consequence: t('cmd.format.warning'),
      details: (
        <Typography variant="body2" sx={{ mb: 2, fontFamily: 'monospace' }}>
          {formatPartition} → {formatFstype}
        </Typography>
      ),
      actionLabel: t('tools.format_b'),
      request: (body) => api.post('/tools/format', { partition: formatPartition, fstype: formatFstype, ...body }),
    });
  };

  const handleF3 = () => {
    if (f3Device === '-' || f3Action === '-') {
      setMessage(t('tools.select_device_action_first'));
      setMessageSeverity('error');
      return;
    }
    const destructive = f3Action === 'f3probe_destructive';
    setPendingCommand({
      title: t('tools.f3_title').replace('{device}', f3Device),
      consequence: destructive ? t('cmd.f3.warning_destructive') : t('cmd.f3.warning_non_destructive'),
      details: (
        <Typography variant="body2" sx={{ mb: 2 }}>
          {f3Device} → {destructive ? t('tools.f3.probe_destructive') : t('tools.f3.probe_non_destructive')}
        </Typography>
      ),
      actionLabel: t('tools.f3.b'),
      request: (body) => api.post('/tools/f3', { device: f3Device, action: f3Action, ...body }),
    });
  };

  const filesystemTypes = [
    { value: 'FAT32', label: 'FAT32 (Windows®)' },
    { value: 'exFAT', label: 'exFAT (Windows®)' },
    { value: 'NTFS (compression enabled)', label: 'NTFS (compression enabled) (Windows®)' },
    { value: 'NTFS (no compression)', label: 'NTFS (no compression) (Windows®)' },
    { value: 'Ext4', label: 'Ext4 (Linux)' },
    { value: 'Ext3', label: 'Ext3 (Linux)' },
    { value: 'HFS Plus', label: 'HFS Plus (Mac)' },
    { value: 'HFS', label: 'HFS (Mac)' },
  ];

  const f3Actions = [
    { value: 'f3probe_non_destructive', label: t('tools.f3.probe_non_destructive') || 'try to preserve data (slow)' },
    { value: 'f3probe_destructive', label: t('tools.f3.probe_destructive') || 'ERASE data (faster)' },
  ];

  function TabPanel({ children, value, index, ...other }) {
    // Add bottom padding when refresh button is sticky (all tabs)
    const needsBottomPadding = value === index;
    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`lbb-tabs-storagepanel-${index}`}
        aria-labelledby={`lbb-tabs-storage-${index}`}
        {...other}
      >
        {value === index && <Box sx={{ pt: 3, pb: needsBottomPadding ? 10 : 0 }}>{children}</Box>}
      </div>
    );
  }

  return (
    <Box>
      {message && (
        <Alert 
          severity={messageSeverity}
          sx={{ mb: 3 }}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="filesystem tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab 
            label={t('sysinfo.info') || 'Info'} 
            id="lbb-tabs-storage-0"
            aria-controls="lbb-tabs-storagepanel-0"
          />
          <Tab 
            label={t('tools.mount.header') || 'Mount storage'} 
            id="lbb-tabs-storage-1"
            aria-controls="lbb-tabs-storagepanel-1"
          />
          <Tab 
            label={t('tools.repair') || 'Repair'} 
            id="lbb-tabs-storage-2"
            aria-controls="lbb-tabs-storagepanel-2"
          />
          <Tab 
            label={t('cmd.format.header') || 'Format device'} 
            id="lbb-tabs-storage-3"
            aria-controls="lbb-tabs-storagepanel-3"
          />
          <Tab 
            label={t('cmd.f3.header') || 'Verify USB drive capacity'} 
            id="lbb-tabs-storage-4"
            aria-controls="lbb-tabs-storagepanel-4"
          />
        </Tabs>
      </Box>

      <TabPanel value={currentTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box>
              <Typography variant="h2" gutterBottom>
                {t('sysinfo.diskspace') || 'Disk Space'}
              </Typography>
              <Box sx={{ mt: 2 }}>
                {diskSpace.headers.length > 0 ? (
                <TableContainer data-testid="scrollable-table" sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <Table size="small" sx={{ '& th, & td': { whiteSpace: 'nowrap' } }}>
                    <TableHead>
                      <TableRow>
                        {diskSpace.headers.map((header, index) => (
                          <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {diskSpace.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {diskSpace.headers.map((header, colIndex) => (
                            <TableCell key={colIndex}>
                              {row[header] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('sysinfo.loading')}
                </Typography>
              )}
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box>
              <Typography variant="h2" gutterBottom>
                {t('sysinfo.devices') || 'Devices'}
              </Typography>
              <Box sx={{ mt: 2 }}>
                {devices.headers.length > 0 ? (
                <TableContainer data-testid="scrollable-table" sx={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <Table size="small" sx={{ '& th, & td': { whiteSpace: 'nowrap' } }}>
                    <TableHead>
                      <TableRow>
                        {devices.headers.map((header, index) => (
                          <TableCell key={index} sx={{ fontWeight: 'bold' }}>
                            {header}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {devices.rows.map((row, rowIndex) => (
                        <TableRow key={rowIndex}>
                          {devices.headers.map((header, colIndex) => (
                            <TableCell key={colIndex}>
                              {row[header] || '-'}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('sysinfo.loading')}
                </Typography>
              )}
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Box>
              <Typography variant="h2" gutterBottom>
                {t('sysinfo.device_states') || 'Device status'}
              </Typography>
              <Box sx={{ mt: 2 }}>
                {deviceStates.length > 0 ? (
                <Box>
                  {deviceStates.map((device, deviceIndex) => (
                    <Box key={deviceIndex} sx={{ mb: 2 }}>
                      <Typography variant="h3" sx={{ fontWeight: 'bold', mb: 1 }}>
                        {device.lum}
                        {device.identifier && (
                          <Typography component="span" variant="body2" sx={{ ml: 1, color: 'text.secondary' }}>
                            ({device.identifier})
                          </Typography>
                        )}
                      </Typography>
                      {device.states && device.states.length > 0 ? (
                        <Box
                          component="dl"
                          data-testid="device-state-grid"
                          sx={{
                            // Key/value grid instead of space-padded <pre>: on phones the
                            // padding wrapped mid-line and scrambled the two columns.
                            display: 'grid',
                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                            columnGap: 2,
                            rowGap: 0.5,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            m: 0,
                            p: 1,
                            bgcolor: 'background.default',
                            borderRadius: 1,
                            '& dt, & dd': { m: 0, overflowWrap: 'anywhere' },
                            '& dd': { textAlign: 'right' },
                          }}
                        >
                          {device.states.map((state, stateIndex) => (
                            <React.Fragment key={stateIndex}>
                              <Box component="dt" sx={state.measured ? undefined : { gridColumn: '1 / -1' }}>
                                {state.value}
                              </Box>
                              {state.measured ? <Box component="dd">{state.measured}</Box> : null}
                            </React.Fragment>
                          ))}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                      {deviceIndex < deviceStates.length - 1 && <Divider sx={{ mt: 2 }} />}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {t('sysinfo.no_device_states')}
                </Typography>
              )}
              </Box>
            </Box>
          </Grid>
        </Grid>
        <LogMonitor />
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Box>
          <Typography variant="h2" gutterBottom>
            {t('tools.mount.header') || 'Mount storage'}
          </Typography>
        <Box sx={{ mt: 2 }}>
          <Paper elevation={0} sx={{ mb: 3, p: 2, bgcolor: 'background.default' }}>
          <Typography 
            component="pre" 
            variant="body2" 
            sx={{
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              margin: 0,
              fontSize: '0.875rem',
            }}
          >
            {mounts || t('tools.no_mounts')}
          </Typography>
        </Paper>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel>{t('tools.mount.source') || 'Source'}</FormLabel>
              <Select
                value={selectedSource}
                onChange={(e) => {
                  setSelectedSource(e.target.value);
                  setSourcePartition('');
                }}
              >
                <MenuItem value="">
                  <em>{t('tools.none')}</em>
                </MenuItem>
                {(() => {
                  const grouped = groupStoragesByType(mountableStorages);
                  const result = [];
                  
                  if (grouped.usb.length > 0) {
                    result.push(
                      <ListSubheader key="header-usb">
                        {getGroupLabel('usb', t)}
                      </ListSubheader>
                    );
                    grouped.usb.forEach(storage => {
                      const mounted = isMounted('source', storage);
                      result.push(
                        <MenuItem key={storage} value={storage}>
                          {getStorageLabel(storage)}
                          {mounted && ` (${t('tools.mount.mounted') || 'mounted'})`}
                        </MenuItem>
                      );
                    });
                  }
                  
                  if (grouped.nvme.length > 0) {
                    result.push(
                      <ListSubheader key="header-nvme">
                        {getGroupLabel('nvme', t)}
                      </ListSubheader>
                    );
                    grouped.nvme.forEach(storage => {
                      const mounted = isMounted('source', storage);
                      result.push(
                        <MenuItem key={storage} value={storage}>
                          {getStorageLabel(storage)}
                          {mounted && ` (${t('tools.mount.mounted') || 'mounted'})`}
                        </MenuItem>
                      );
                    });
                  }
                  
                  if (grouped.cloud.length > 0) {
                    result.push(
                      <ListSubheader key="header-cloud">
                        {getGroupLabel('cloud', t)}
                      </ListSubheader>
                    );
                    grouped.cloud.forEach(storage => {
                      const mounted = isMounted('source', storage);
                      result.push(
                        <MenuItem key={storage} value={storage}>
                          {getStorageLabel(storage)}
                          {mounted && ` (${t('tools.mount.mounted') || 'mounted'})`}
                        </MenuItem>
                      );
                    });
                  }
                  
                  return result;
                })()}
              </Select>
            </FormControl>
            
            {selectedSource && hasMultipleDevices(selectedSource, sourcePartitions) && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <FormLabel>{t('tools.mount.select_partition_label') || 'Partition'}</FormLabel>
                <Select
                  value={sourcePartition}
                  onChange={(e) => setSourcePartition(e.target.value)}
                >
                  <MenuItem value="">
                    {t('main.backup.preset_partition_auto') || 'automatic selection'}
                  </MenuItem>
                  {sourcePartitions.map((partition, i) => (
                    <MenuItem key={i} value={partition.identifier || partition.lum}>
                      {partition.lum} {partition.identifier ? `(${partition.identifier})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <Button
              variant={selectedSource && isMounted('source', selectedSource) ? 'outlined' : 'contained'}
              color={selectedSource?.startsWith('cloud:') ? 'primary' : 'secondary'}
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleSourceMount}
              disabled={!selectedSource}
            >
              {selectedSource && isMounted('source', selectedSource)
                ? `${t('tools.umount_b') || 'Remove'}: ${getStorageLabel(selectedSource)} ${t('tools.mount.source') || 'source'}`
                : `${t('tools.mount.b') || 'Mount'}: ${selectedSource ? getStorageLabel(selectedSource) : ''} ${t('tools.mount.source') || 'source'}`
              }
            </Button>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth>
              <FormLabel>{t('tools.mount.target') || 'Target'}</FormLabel>
              <Select
                value={selectedTarget}
                onChange={(e) => {
                  setSelectedTarget(e.target.value);
                  setTargetPartition('');
                }}
              >
                <MenuItem value="">
                  <em>{t('tools.none')}</em>
                </MenuItem>
                {(() => {
                  const grouped = groupStoragesByType(mountableStorages);
                  const result = [];
                  
                  if (grouped.usb.length > 0) {
                    result.push(
                      <ListSubheader key="header-usb">
                        {getGroupLabel('usb', t)}
                      </ListSubheader>
                    );
                    grouped.usb.forEach(storage => {
                      const mounted = isMounted('target', storage);
                      result.push(
                        <MenuItem key={storage} value={storage}>
                          {getStorageLabel(storage)}
                          {mounted && ` (${t('tools.mount.mounted') || 'mounted'})`}
                        </MenuItem>
                      );
                    });
                  }
                  
                  if (grouped.nvme.length > 0) {
                    result.push(
                      <ListSubheader key="header-nvme">
                        {getGroupLabel('nvme', t)}
                      </ListSubheader>
                    );
                    grouped.nvme.forEach(storage => {
                      const mounted = isMounted('target', storage);
                      result.push(
                        <MenuItem key={storage} value={storage}>
                          {getStorageLabel(storage)}
                          {mounted && ` (${t('tools.mount.mounted') || 'mounted'})`}
                        </MenuItem>
                      );
                    });
                  }
                  
                  if (grouped.cloud.length > 0) {
                    result.push(
                      <ListSubheader key="header-cloud">
                        {getGroupLabel('cloud', t)}
                      </ListSubheader>
                    );
                    grouped.cloud.forEach(storage => {
                      const mounted = isMounted('target', storage);
                      result.push(
                        <MenuItem key={storage} value={storage}>
                          {getStorageLabel(storage)}
                          {mounted && ` (${t('tools.mount.mounted') || 'mounted'})`}
                        </MenuItem>
                      );
                    });
                  }
                  
                  return result;
                })()}
              </Select>
            </FormControl>
            
            {selectedTarget && hasMultipleDevices(selectedTarget, targetPartitions) && (
              <FormControl fullWidth sx={{ mt: 2 }}>
                <FormLabel>{t('tools.mount.select_partition_label') || 'Partition'}</FormLabel>
                <Select
                  value={targetPartition}
                  onChange={(e) => setTargetPartition(e.target.value)}
                >
                  <MenuItem value="">
                    {t('main.backup.preset_partition_auto') || 'automatic selection'}
                  </MenuItem>
                  {targetPartitions.map((partition, i) => (
                    <MenuItem key={i} value={partition.identifier || partition.lum}>
                      {partition.lum} {partition.identifier ? `(${partition.identifier})` : ''}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            
            <Button
              variant={selectedTarget && isMounted('target', selectedTarget) ? 'outlined' : 'contained'}
              color={selectedTarget?.startsWith('cloud:') ? 'primary' : 'secondary'}
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleTargetMount}
              disabled={!selectedTarget}
            >
              {selectedTarget && isMounted('target', selectedTarget)
                ? `${t('tools.umount_b') || 'Remove'}: ${getStorageLabel(selectedTarget)} ${t('tools.mount.target') || 'target'}`
                : `${t('tools.mount.b') || 'Mount'}: ${selectedTarget ? getStorageLabel(selectedTarget) : ''} ${t('tools.mount.target') || 'target'}`
              }
            </Button>
          </Grid>
        </Grid>
        </Box>
        </Box>
        <LogMonitor />
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Box>
          <Typography variant="h2" gutterBottom>
            {t('tools.repair') || 'Repair'}
          </Typography>
        <Box sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
          {t('tools.help.repair_warning')}
        </Alert>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h3" gutterBottom>
            {t('tools.help.procedure')}
          </Typography>
          <Box component="ol" sx={{ pl: 3, mb: 0 }}>
            <li>{t('tools.help.repair_step1')}</li>
            <li>{t('tools.help.repair_step2')}</li>
            <li>{t('tools.help.repair_step3')}</li>
            <li>{t('tools.help.repair_step4')}</li>
            <li>{t('tools.help.repair_step5')}</li>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DeviceSelector
            optionValueIsIdentifier={false}
            listPartitions={true}
            skipMounted={false}
            ignoreFs={false}
            value={fsckPartition}
            onChange={setFsckPartition}
            label={t('tools.select_partition') || 'Select partition'}
          />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleFsckCheck}
              disabled={fsckPartition === '-'}
            >
              {t('tools.fsck_check_b') || 'Check'}
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleFsckRepair}
              disabled={fsckPartition === '-'}
              startIcon={<WarningAmberIcon />}
            >
              {t('tools.fsck_autorepair_b') || 'Repair'}
            </Button>
          </Box>
        </Box>
        </Box>
        </Box>
        <LogMonitor />
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <Box>
          <Typography variant="h2" gutterBottom>
            {t('cmd.format.header') || 'Format device'}
          </Typography>
        <Box sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
          {t('tools.help.format_warning')}
        </Alert>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h3" gutterBottom>
            {t('tools.help.options')}
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 0 }}>
            <li><strong>FAT32 (Windows®)</strong>: {t('tools.help.format_fat32')}</li>
            <li><strong>exFAT (Windows®)</strong>: {t('tools.help.format_exfat')}</li>
            <li><strong>NTFS (Windows®)</strong>: {t('tools.help.format_ntfs')}
              <Box component="ul" sx={{ pl: 3, mt: 0.5 }}>
                <li>NTFS (compression enabled): {t('tools.help.format_ntfs_compression')}</li>
                <li>NTFS (no compression): {t('tools.help.format_ntfs_no_compression')}</li>
              </Box>
            </li>
            <li><strong>Ext4 (Linux)</strong>: {t('tools.help.format_ext4')}</li>
            <li><strong>Ext3 (Linux)</strong>: {t('tools.help.format_ext3')}</li>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DeviceSelector
            optionValueIsIdentifier={false}
            listPartitions={true}
            skipMounted={false}
            ignoreFs={true}
            value={formatPartition}
            onChange={setFormatPartition}
            label={t('tools.select_partition') || 'Select partition'}
          />
          <FormControl sx={{ maxWidth: 400 }}>
            <InputLabel>{t('tools.select_format_fstype') || 'File system type'}</InputLabel>
            <Select
              value={formatFstype}
              onChange={(e) => setFormatFstype(e.target.value)}
              label={t('tools.select_format_fstype') || 'File system type'}
            >
              <MenuItem value="-">-</MenuItem>
              {filesystemTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleFormat}
              disabled={formatPartition === '-' || formatFstype === '-'}
              startIcon={<WarningAmberIcon />}
            >
              {t('tools.format_b') || 'format disc!'}
            </Button>
          </Box>
        </Box>
        </Box>
        </Box>
        <LogMonitor />
      </TabPanel>

      <TabPanel value={currentTab} index={4}>
        <Box>
          <Typography variant="h2" gutterBottom>
            {t('cmd.f3.header') || 'Verify USB drive capacity'}
          </Typography>
        <Box sx={{ mt: 2 }}>
          <Alert severity="warning" sx={{ mb: 2 }}>
          {t('tools.help.f3_warning')}
        </Alert>
        <Box sx={{ mb: 2 }}>
          <Typography variant="h3" gutterBottom>
            {t('tools.help.options')}
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 0 }}>
            <li><strong>{t('tools.f3.probe_destructive')}</strong>: {t('tools.help.f3_destructive')}</li>
            <li><strong>{t('tools.f3.probe_non_destructive')}</strong>: {t('tools.help.f3_non_destructive')}</li>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <DeviceSelector
            optionValueIsIdentifier={false}
            listPartitions={false}
            skipMounted={false}
            ignoreFs={false}
            value={f3Device}
            onChange={setF3Device}
            label={t('tools.select_partition') || 'Select partition'}
          />
          <FormControl sx={{ maxWidth: 400 }}>
            <InputLabel>{t('tools.f3.select_action') || 'Select test'}</InputLabel>
            <Select
              value={f3Action}
              onChange={(e) => setF3Action(e.target.value)}
              label={t('tools.f3.select_action') || 'Select test'}
            >
              <MenuItem value="-">-</MenuItem>
              {f3Actions.map((action) => (
                <MenuItem key={action.value} value={action.value}>
                  {action.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={handleF3}
              disabled={f3Device === '-' || f3Action === '-'}
              startIcon={<WarningAmberIcon />}
            >
              {t('tools.f3.b') || 'start test'}
            </Button>
          </Box>
        </Box>
        </Box>
        </Box>
        <LogMonitor />
      </TabPanel>

      <ProtectedCommandDialog
        open={Boolean(pendingCommand)}
        onClose={() => setPendingCommand(null)}
        title={pendingCommand?.title || ''}
        consequence={pendingCommand?.consequence}
        details={pendingCommand?.details}
        actionLabel={pendingCommand?.actionLabel || ''}
        requiresPassword={pendingCommand?.requiresPassword !== false}
        destructive={pendingCommand?.destructive !== false}
        onConfirm={(body) => pendingCommand.request(body)}
      />

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
        <Button
          variant="contained"
          startIcon={<RefreshIcon />}
          onClick={loadAll}
          size="large"
        >
          {t('sysinfo.refresh_button') || 'Refresh'}
        </Button>
      </Box>
    </Box>
  );
}

export default Storage;
