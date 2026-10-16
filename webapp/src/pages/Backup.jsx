import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  FormControl,
  FormControlLabel,
  Button,
  Grid,
  Alert,
  Checkbox,
  Select,
  MenuItem,
  FormLabel,
  CircularProgress,
  Stack,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Chip,
  ListSubheader,
  Snackbar,
  Tooltip,
  FormHelperText,
} from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ReplayIcon from '@mui/icons-material/Replay';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import api from '../utils/api';
import LogMonitor from '../components/LogMonitor';
import PageSection from '../components/PageSection';
import SectionHeader from '../components/SectionHeader';

function Backup() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [services, setServices] = useState({ sourceServices: {}, targetServices: {}, nvmeAvailable: false });
  const [partitions, setPartitions] = useState([]);
  const [runningBackups, setRunningBackups] = useState([]);
  const [backupHistory, setBackupHistory] = useState([]);
  const [formData, setFormData] = useState({
    sourceDevice: 'anyusb',
    targetDevice: '',
    moveFiles: config?.conf_BACKUP_MOVE_FILES === 'true' ? 'move' : 'copy',
    renameFiles: config?.conf_BACKUP_RENAME_FILES === 'true',
    generateThumbnails: config?.conf_BACKUP_GENERATE_THUMBNAILS === 'true',
    updateExif: config?.conf_BACKUP_UPDATE_EXIF === 'true',
    checksum: config?.conf_BACKUP_CHECKSUM === 'true' ? 'checksum' : 'file_size_timestamp',
    powerOff: config?.conf_POWER_OFF === 'true',
    presetSource: '',
    presetTarget: '',
    secSourceName: 'none',
    secTargetName: 'none',
    // '' = use the configured chat (conf_SOCIAL_TELEGRAM_CHAT_ID), like PHP's
    // sub-telegram-chat-id.php default; otherwise passed as --telegram-chat-id.
    telegramChatId: '',
  });
  const [telegramChats, setTelegramChats] = useState([]);
  const [telegramChatsError, setTelegramChatsError] = useState(false);
  const [message, setMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState('success');
  const [previousRunningBackups, setPreviousRunningBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [defaultBackupConfig, setDefaultBackupConfig] = useState({
    conf_BACKUP_MOVE_FILES: 'false',
    conf_BACKUP_RENAME_FILES: 'false',
    conf_BACKUP_GENERATE_THUMBNAILS: 'false',
    conf_BACKUP_UPDATE_EXIF: 'false',
    conf_BACKUP_CHECKSUM: 'false',
    conf_POWER_OFF: 'false',
    conf_MAIL_NOTIFICATIONS: 'false',
  });
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef(null);
  const lastSavedConfig = useRef(null);
  const isSaving = useRef(false);
  const configInitialized = useRef(false);
  const pendingSaveConfig = useRef(null);
  const isSyncingFromServer = useRef(false);
  const defaultBackupConfigRef = useRef({
    conf_BACKUP_MOVE_FILES: 'false',
    conf_BACKUP_RENAME_FILES: 'false',
    conf_BACKUP_GENERATE_THUMBNAILS: 'false',
    conf_BACKUP_UPDATE_EXIF: 'false',
    conf_BACKUP_CHECKSUM: 'false',
    conf_POWER_OFF: 'false',
    conf_MAIL_NOTIFICATIONS: 'false',
  });
  useEffect(() => {
    loadServices();
    loadPartitions();
    loadRunningBackups();
    loadBackupHistory();

    const interval = setInterval(() => {
      loadRunningBackups();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    defaultBackupConfigRef.current = defaultBackupConfig;
  }, [defaultBackupConfig]);

  // Per-run Telegram chat override (PHP index.php:431-439 + sub-telegram-chat-id.php):
  // list the bot's chats from the same route the Integrations page uses.
  const isTelegramTarget = formData.targetDevice === 'social:telegram';
  const telegramToken = config?.conf_SOCIAL_TELEGRAM_TOKEN || '';
  useEffect(() => {
    if (!isTelegramTarget) return undefined;
    let cancelled = false;
    setTelegramChatsError(false);
    api.post('/social/telegram/chat-id', { token: telegramToken })
      .then((response) => {
        if (cancelled) return;
        if (response.data?.ok && Array.isArray(response.data.chats)) {
          setTelegramChats(response.data.chats);
        } else {
          setTelegramChats([]);
          setTelegramChatsError(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setTelegramChats([]);
        setTelegramChatsError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [isTelegramTarget, telegramToken]);

  useEffect(() => {
    if (config && !configInitialized.current) {
      const newConfig = {
        conf_BACKUP_MOVE_FILES: config.conf_BACKUP_MOVE_FILES || 'false',
        conf_BACKUP_RENAME_FILES: config.conf_BACKUP_RENAME_FILES || 'false',
        conf_BACKUP_GENERATE_THUMBNAILS: config.conf_BACKUP_GENERATE_THUMBNAILS || 'false',
        conf_BACKUP_UPDATE_EXIF: config.conf_BACKUP_UPDATE_EXIF || 'false',
        conf_BACKUP_CHECKSUM: config.conf_BACKUP_CHECKSUM || 'false',
        conf_POWER_OFF: config.conf_POWER_OFF || 'false',
        conf_MAIL_NOTIFICATIONS: config.conf_MAIL_NOTIFICATIONS || 'false',
      };
      const configString = JSON.stringify(newConfig);
      setDefaultBackupConfig(newConfig);
      lastSavedConfig.current = configString;
      configInitialized.current = true;
      isSaving.current = false;
      
      setFormData(prev => ({
        ...prev,
        moveFiles: newConfig.conf_BACKUP_MOVE_FILES === 'true' ? 'move' : 'copy',
        renameFiles: newConfig.conf_BACKUP_RENAME_FILES === 'true',
        generateThumbnails: newConfig.conf_BACKUP_GENERATE_THUMBNAILS === 'true',
        updateExif: newConfig.conf_BACKUP_UPDATE_EXIF === 'true',
        checksum: newConfig.conf_BACKUP_CHECKSUM === 'true' ? 'checksum' : 'file_size_timestamp',
        powerOff: newConfig.conf_POWER_OFF === 'true',
      }));
    } else if (config && configInitialized.current && !isSaving.current) {
      const newConfig = {
        conf_BACKUP_MOVE_FILES: config.conf_BACKUP_MOVE_FILES || 'false',
        conf_BACKUP_RENAME_FILES: config.conf_BACKUP_RENAME_FILES || 'false',
        conf_BACKUP_GENERATE_THUMBNAILS: config.conf_BACKUP_GENERATE_THUMBNAILS || 'false',
        conf_BACKUP_UPDATE_EXIF: config.conf_BACKUP_UPDATE_EXIF || 'false',
        conf_BACKUP_CHECKSUM: config.conf_BACKUP_CHECKSUM || 'false',
        conf_POWER_OFF: config.conf_POWER_OFF || 'false',
        conf_MAIL_NOTIFICATIONS: config.conf_MAIL_NOTIFICATIONS || 'false',
      };
      const configString = JSON.stringify(newConfig);
      
      if (pendingSaveConfig.current) {
        if (pendingSaveConfig.current === configString) {
          isSyncingFromServer.current = true;
          setDefaultBackupConfig(newConfig);
          lastSavedConfig.current = configString;
          pendingSaveConfig.current = null;
          setTimeout(() => {
            isSyncingFromServer.current = false;
          }, 0);
        }
      } else {
        const currentConfigString = JSON.stringify(defaultBackupConfig);
        if (currentConfigString !== configString) {
          isSyncingFromServer.current = true;
          setDefaultBackupConfig(newConfig);
          lastSavedConfig.current = configString;
          setTimeout(() => {
            isSyncingFromServer.current = false;
          }, 0);
        }
      }
    }
  }, [config]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (isSaving.current) {
      return;
    }

    if (isSyncingFromServer.current) {
      return;
    }

    if (!config || !configInitialized.current) {
      return;
    }

    const configString = JSON.stringify(defaultBackupConfig);
    if (lastSavedConfig.current === configString) {
      return;
    }
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      isSaving.current = true;
      const configToSave = JSON.stringify(defaultBackupConfig);
      pendingSaveConfig.current = configToSave;
      try {
        await updateConfig(defaultBackupConfig);
        lastSavedConfig.current = configToSave;
      } catch (error) {
        console.error('Failed to save default backup config:', error);
        pendingSaveConfig.current = null;
      } finally {
        isSaving.current = false;
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [defaultBackupConfig, updateConfig, config]);

  const loadServices = async () => {
    try {
      const response = await api.get('/backup/services');
      if (response.data && response.data.sourceServices && response.data.targetServices) {
        setServices(response.data);
      } else {
        console.error('Invalid services response:', response.data);
        setServices({ sourceServices: {}, targetServices: {}, nvmeAvailable: false });
      }
    } catch (error) {
      console.error('Failed to load services:', error);
      setServices({ sourceServices: {}, targetServices: {}, nvmeAvailable: false });
    } finally {
      setLoading(false);
    }
  };

  const loadPartitions = async () => {
    try {
      const response = await api.get('/backup/partitions');
      setPartitions(response.data?.partitions || []);
    } catch (error) {
      console.error('Failed to load partitions:', error);
      setPartitions([]);
    }
  };

  const loadRunningBackups = async () => {
    try {
      const response = await api.get('/backup/running');
      const currentBackups = response.data?.backups || [];
      
      if (previousRunningBackups.length > 0 && currentBackups.length < previousRunningBackups.length) {
        const finishedBackups = previousRunningBackups.filter(
          prev => !currentBackups.some(curr => curr.pid === prev.pid)
        );
        if (finishedBackups.length > 0) {
          setToastSeverity('success');
          setToastMessage(t('box.backup.complete') || 'Backup complete');
        }
      }
      
      setPreviousRunningBackups(currentBackups);
      setRunningBackups(currentBackups);
    } catch (error) {
      console.error('Failed to load running backups:', error);
      setRunningBackups([]);
      setPreviousRunningBackups([]);
    }
  };

  const loadBackupHistory = async () => {
    try {
      const response = await api.get('/backup/history');
      setBackupHistory(response.data?.history || []);
    } catch (error) {
      console.error('Failed to load backup history:', error);
      setBackupHistory([]);
    }
  };

  const handleStartBackup = async () => {
    if (!formData.sourceDevice || !formData.targetDevice) {
      setMessage(t('main.backup_error') || 'Please select source and target');
      return;
    }
    
    if (getDisallowedReason(formData.sourceDevice, formData.targetDevice)) {
      setMessage(t('main.backup_error') || 'Invalid source/target combination');
      return;
    }
    
    try {
      await api.post('/backup/start', buildBackupPayload(formData));
      setToastSeverity('success');
      setToastMessage(t('main.backup.initiated'));
      setTimeout(() => {
        loadRunningBackups();
        loadBackupHistory();
      }, 1000);
    } catch (error) {
      console.error('Failed to start backup:', error);
      if (error.response?.status === 409) {
        setMessage(t('main.backup_error') || 'A backup with this configuration is already running');
      } else {
        setMessage(t('main.backup_error') || 'Backup error');
      }
    }
  };

  const handleSourceChange = (sourceDevice) => {
    setFormData((prev) => ({
      ...prev,
      sourceDevice,
      // Drop a target that the new source cannot back up to (PHP HideDisallowedButtons).
      targetDevice: getDisallowedReason(sourceDevice, prev.targetDevice) ? '' : prev.targetDevice,
    }));
  };

  // Source and target partition presets must differ (scripts/js/partition_presets.js).
  const handlePresetChange = (field, value) => {
    setFormData((prev) => {
      const other = field === 'presetSource' ? 'presetTarget' : 'presetSource';
      const next = { ...prev, [field]: value };
      if (value && prev[other] === value) next[other] = '';
      return next;
    });
  };

  const handleStopBackup = async (pid) => {
    try {
      await api.post('/backup/stop', pid ? { pid } : {});
      setToastSeverity('info');
      setToastMessage(t('main.stopbackup_m'));
      setTimeout(() => loadRunningBackups(), 500);
    } catch (error) {
      console.error('Failed to stop backup:', error);
      setToastSeverity('error');
      setToastMessage(t('main.backup_error') || 'Failed to stop backup');
    }
  };

  const handleSaveAsDefaults = async () => {
    const newDefaults = {
      conf_BACKUP_MOVE_FILES: formData.moveFiles === 'move' ? 'true' : 'false',
      conf_BACKUP_RENAME_FILES: formData.renameFiles ? 'true' : 'false',
      conf_BACKUP_GENERATE_THUMBNAILS: formData.generateThumbnails ? 'true' : 'false',
      conf_BACKUP_UPDATE_EXIF: formData.updateExif ? 'true' : 'false',
      conf_BACKUP_CHECKSUM: formData.checksum === 'checksum' ? 'true' : 'false',
      conf_POWER_OFF: formData.powerOff ? 'true' : 'false',
      conf_MAIL_NOTIFICATIONS: defaultBackupConfig.conf_MAIL_NOTIFICATIONS || 'false',
    };
    
    try {
      await updateConfig(newDefaults);
      setDefaultBackupConfig(newDefaults);
      setToastSeverity('success');
      setToastMessage(t('main.backup.defaults_saved') || 'Defaults saved successfully');
    } catch (error) {
      console.error('Failed to save defaults:', error);
      setToastSeverity('error');
      setToastMessage(t('main.backup.defaults_save_error') || 'Failed to save defaults');
    }
  };

  const isBackupRunning = () => {
    return runningBackups.some(backup => 
      backup.sourceDevice === formData.sourceDevice &&
      backup.targetDevice === formData.targetDevice &&
      (backup.presetSource || '') === (formData.presetSource || '') &&
      (backup.presetTarget || '') === (formData.presetTarget || '') &&
      backup.moveFiles === (formData.moveFiles === 'move') &&
      backup.renameFiles === formData.renameFiles &&
      backup.generateThumbnails === formData.generateThumbnails &&
      backup.updateExif === formData.updateExif &&
      backup.checksum === (formData.checksum === 'checksum') &&
      backup.powerOff === formData.powerOff
    );
  };

  const hasMissingEmailServerConfig = () => {
    if (!config) return true;
    const password = config.conf_MAIL_PASSWORD?.trim() || '';
    let decodedPassword = '';
    if (password) {
      try {
        decodedPassword = atob(password);
      } catch (e) {
        decodedPassword = '';
      }
    }
    return !(
      config.conf_SMTP_SERVER?.trim() &&
      config.conf_SMTP_PORT?.trim() &&
      config.conf_MAIL_SECURITY &&
      config.conf_MAIL_USER?.trim() &&
      decodedPassword?.trim() &&
      config.conf_MAIL_FROM?.trim() &&
      config.conf_MAIL_TO?.trim()
    );
  };

  const getServiceColor = (service) => {
    if (service.includes('usb')) return 'primary';
    if (service.includes('camera')) return 'warning';
    if (service.includes('cloud')) return 'info';
    if (service.includes('social')) return 'secondary';
    if (service.includes('anyusb')) return 'warning';
    return 'primary';
  };

  const sourceGroups = groupServices(services.sourceServices, { includeSocial: false });
  const targetGroups = groupServices(services.targetServices, { includeSocial: true });

  const localOptionsDisabled = Boolean(formData.targetDevice) && !isLocalStorageTarget(formData.targetDevice);

  const configuredTelegramChat =
    config?.conf_SOCIAL_TELEGRAM_CHAT_IDENTIFIER || config?.conf_SOCIAL_TELEGRAM_CHAT_ID || '';
  const selectedTelegramChat = telegramChats.find((chat) => String(chat.id) === formData.telegramChatId);

  let targetHelperText = '';
  if (formData.targetDevice === 'social:telegram') {
    const chatName = selectedTelegramChat
      ? `${selectedTelegramChat.name} (${selectedTelegramChat.type})`
      : configuredTelegramChat;
    if (chatName) targetHelperText = `${t('main.backup.target_chat')}: ${chatName}`;
  } else if (formData.targetDevice === 'social:matrix' && config?.conf_SOCIAL_MATRIX_ROOM_IDENTIFIER) {
    targetHelperText = `${t('main.backup.target_room')}: ${config.conf_SOCIAL_MATRIX_ROOM_IDENTIFIER}`;
  }

  const hasServices = services && services.sourceServices && services.targetServices && 
    Object.keys(services.sourceServices).length > 0 && Object.keys(services.targetServices).length > 0;
  
  if (loading || !hasServices) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {message && (
        <Alert 
          severity={message.includes('error') ? 'error' : 'info'} 
          sx={{ mb: 3 }}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      <Box>
        <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <FormLabel id="backup-source-label">{t('main.source')}</FormLabel>
                <Select
                  labelId="backup-source-label"
                  data-testid="backup-source-select"
                  value={formData.sourceDevice}
                  renderValue={(value) => getServiceLabel(value, t)}
                  onChange={(e) => handleSourceChange(e.target.value)}
                >
                  {renderServiceOptions(sourceGroups, t)}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <FormLabel id="backup-target-label">{t('main.target')}</FormLabel>
                <Select
                  labelId="backup-target-label"
                  data-testid="backup-target-select"
                  value={formData.targetDevice}
                  displayEmpty
                  renderValue={(value) => getServiceLabel(value, t)}
                  onChange={(e) => setFormData({ ...formData, targetDevice: e.target.value })}
                >
                  {renderServiceOptions(targetGroups, t, (service) =>
                    getDisallowedReason(formData.sourceDevice, service),
                  )}
                </Select>
                {targetHelperText && (
                  <FormHelperText data-testid="backup-target-helper">{targetHelperText}</FormHelperText>
                )}
              </FormControl>
            </Grid>
          </Grid>

          <PageSection
            variant="accordion"
            title={(() => {
              const translation = t('main.backup.options');
              return translation !== 'main.backup.options' ? translation : 'Options';
            })()}
            localStorageKey="lbb-accordion-backup-options"
            legacyLocalStorageKey="accordion-home-options"
            sx={{ mt: 3 }}
          >
              <Stack spacing={3}>
                <Box>
                  <SectionHeader level={3} title={t('main.backup.general')} sx={{ mb: 1 }} />
                  <Box sx={{ mt: 1 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={formData.powerOff}
                          onChange={(e) => setFormData({ ...formData, powerOff: e.target.checked })}
                        />
                      }
                      label={t('main.backup.power_off_checkbox_label')}
                    />
                  </Box>
                </Box>

                <Box>
                  <SectionHeader level={3} title={t('main.backup.primary')} sx={{ mb: 1 }} />
                  <Stack spacing={1} sx={{ mt: 1 }}>
                    <FormControl sx={{ maxWidth: 400 }}>
                      <FormLabel>{t('config.backup.file_operation_label') || 'File operation'}</FormLabel>
                      <Select
                        value={formData.moveFiles}
                        onChange={(e) => setFormData({ ...formData, moveFiles: e.target.value })}
                      >
                        <MenuItem value="copy">
                          {t('config.backup.file_operation_copy') || 'Copy files'}
                        </MenuItem>
                        <MenuItem value="move">
                          {t('config.backup.file_operation_move') || 'Move files'}
                        </MenuItem>
                      </Select>
                    </FormControl>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <FormControlLabel
                        disabled={localOptionsDisabled}
                        control={
                          <Checkbox
                            checked={formData.renameFiles}
                            onChange={(e) => setFormData({ ...formData, renameFiles: e.target.checked })}
                          />
                        }
                        label={t('main.backup.rename_checkbox_label')}
                        sx={{ mr: 0, ml: 0 }}
                      />
                      <Tooltip title={t('config.backup.rename.warning')} enterTouchDelay={0} leaveTouchDelay={6000}>
                        <IconButton
                          aria-label={t('main.backup.rename_warning_info')}
                          data-testid="rename-warning-info"
                          sx={{ minWidth: 44, minHeight: 44 }}
                        >
                          <InfoOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                    <FormControlLabel
                      disabled={localOptionsDisabled}
                      control={
                        <Checkbox
                          checked={formData.generateThumbnails}
                          onChange={(e) => setFormData({ ...formData, generateThumbnails: e.target.checked })}
                        />
                      }
                      label={t('main.backup.generate_thumbnails_checkbox_label')}
                    />
                    <FormControlLabel
                      disabled={localOptionsDisabled}
                      control={
                        <Checkbox
                          checked={formData.updateExif}
                          onChange={(e) => setFormData({ ...formData, updateExif: e.target.checked })}
                        />
                      }
                      label={t('main.backup.update_exif_checkbox_label')}
                    />
                    {localOptionsDisabled && (
                      <FormHelperText sx={{ mt: 0 }}>
                        {t('main.backup.local_options_not_applicable')}
                      </FormHelperText>
                    )}
                    <FormControl sx={{ maxWidth: 400 }}>
                      <FormLabel>{t('main.backup.comparison_method_label') || 'Comparison method'}</FormLabel>
                      <Select
                        value={formData.checksum}
                        onChange={(e) => setFormData({ ...formData, checksum: e.target.value })}
                      >
                        <MenuItem value="file_size_timestamp">
                          {t('main.backup.comparison_file_size_timestamp') || 'File size and timestamp'}
                        </MenuItem>
                        <MenuItem value="checksum">
                          {t('main.backup.comparison_checksum') || 'Checksum'}
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth disabled={formData.sourceDevice !== 'usb'}>
                        <FormLabel id="preset-source-label">{t('main.backup.preset_source_label')}</FormLabel>
                        <Select
                          labelId="preset-source-label"
                          data-testid="preset-source-select"
                          value={formData.sourceDevice === 'usb' ? formData.presetSource : ''}
                          displayEmpty
                          onChange={(e) => handlePresetChange('presetSource', e.target.value)}
                        >
                          {renderPartitionOptions(partitions, t)}
                        </Select>
                        {formData.sourceDevice !== 'usb' && (
                          <FormHelperText>{t('main.backup.preset_source_usb_only')}</FormHelperText>
                        )}
                      </FormControl>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <FormControl fullWidth>
                        <FormLabel id="preset-target-label">{t('main.backup.preset_target_label')}</FormLabel>
                        <Select
                          labelId="preset-target-label"
                          data-testid="preset-target-select"
                          value={formData.presetTarget}
                          displayEmpty
                          onChange={(e) => handlePresetChange('presetTarget', e.target.value)}
                        >
                          {renderPartitionOptions(partitions, t)}
                        </Select>
                      </FormControl>
                    </Grid>
                    {formData.targetDevice === 'social:telegram' && (
                      <Grid item xs={12} md={4}>
                        <FormControl fullWidth>
                          <FormLabel id="telegram-chat-label">{t('main.backup.telegram_chat_label')}</FormLabel>
                          <Select
                            labelId="telegram-chat-label"
                            data-testid="telegram-chat-select"
                            value={formData.telegramChatId}
                            displayEmpty
                            onChange={(e) => setFormData({ ...formData, telegramChatId: e.target.value })}
                          >
                            <MenuItem value="">
                              {configuredTelegramChat
                                ? `${configuredTelegramChat} (${t('main.backup.telegram_chat_default')})`
                                : t('main.backup.telegram_chat_default')}
                            </MenuItem>
                            {telegramChats.map((chat) => (
                              <MenuItem key={chat.id} value={String(chat.id)}>
                                {`${chat.name} (${chat.type}) — ${chat.id}`}
                              </MenuItem>
                            ))}
                          </Select>
                          {telegramChatsError && (
                            <FormHelperText error>{t('main.backup.telegram_chats_error')}</FormHelperText>
                          )}
                        </FormControl>
                      </Grid>
                    )}
                  </Grid>

                </Box>

                <Box>
                  <SectionHeader level={3} title={t('main.backup.secondary')} sx={{ mb: 1 }} />
                  <Box sx={{ mt: 1 }}>
                    <FormControl sx={{ maxWidth: 400 }}>
                    <FormLabel>{t('main.backup.secondary_label')}</FormLabel>
                    <Select
                      value={`${formData.secSourceName} ${formData.secTargetName}`}
                      onChange={(e) => {
                        const parts = e.target.value.split(' ');
                        setFormData({
                          ...formData,
                          secSourceName: parts[0] || 'none',
                          secTargetName: parts[1] || 'none'
                        });
                      }}
                    >
                      <MenuItem value="none none">
                        {t('config.backup.none') || 'no automatic backup'}
                      </MenuItem>
                      {services.targetServices?.cloud?.includes('cloud_rsync') && (
                        <>
                          <ListSubheader>
                            → {t('main.rsync_button') || 'rsync server'}
                          </ListSubheader>
                          <MenuItem value="usb cloud_rsync">
                            {t('main.usb_button') || 'USB storage'} → {t('main.rsync_button') || 'rsync server'}
                          </MenuItem>
                          {services.nvmeAvailable && (
                            <MenuItem value="nvme cloud_rsync">
                              {t('main.nvme_button') || 'NVMe SSD'} → {t('main.rsync_button') || 'rsync server'}
                            </MenuItem>
                          )}
                          <MenuItem value="internal cloud_rsync">
                            {t('main.internal_button') || 'Int. storage'} → {t('main.rsync_button') || 'rsync server'}
                          </MenuItem>
                        </>
                      )}
                      {services.targetServices?.cloud
                        ?.filter(service => service !== 'cloud_rsync' && service.startsWith('cloud:'))
                        .map((cloudService) => {
                          const serviceName = cloudService.replace('cloud:', '');
                          return (
                            <React.Fragment key={cloudService}>
                              <ListSubheader>
                                → {serviceName}
                              </ListSubheader>
                              <MenuItem value={`usb ${cloudService}`}>
                                {t('main.usb_button') || 'USB storage'} → {serviceName}
                              </MenuItem>
                              {services.nvmeAvailable && (
                                <MenuItem value={`nvme ${cloudService}`}>
                                  {t('main.nvme_button') || 'NVMe SSD'} → {serviceName}
                                </MenuItem>
                              )}
                              <MenuItem value={`internal ${cloudService}`}>
                                {t('main.internal_button') || 'Int. storage'} → {serviceName}
                              </MenuItem>
                            </React.Fragment>
                          );
                        })}
                    </Select>
                  </FormControl>
                  </Box>
                </Box>

                <Box>
                  <SectionHeader level={3} title={t('config.mail.section') || 'Email'} sx={{ mb: 1 }} />
                  <Box sx={{ mt: 1 }}>
                    {hasMissingEmailServerConfig() && (
                    <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
                      {t('config.mail.server_settings_notice') || 'Server settings must be configured before email notifications can be sent.'}
                    </Alert>
                  )}
                  <Stack spacing={1.5}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={['1', 'true'].includes(String(defaultBackupConfig.conf_MAIL_NOTIFICATIONS))}
                          onChange={(e) => setDefaultBackupConfig({ ...defaultBackupConfig, conf_MAIL_NOTIFICATIONS: e.target.checked ? 'true' : 'false' })}
                        />
                      }
                      label={t('config.mail.notify_backup_label') || 'If possible, send backup reports via email?'}
                    />
                  </Stack>
                  </Box>
                </Box>
              </Stack>
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="outlined"
                  onClick={handleSaveAsDefaults}
                >
                  {t('main.backup.save_as_defaults') || 'Save as defaults'}
                </Button>
              </Box>
          </PageSection>

          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<PlayArrowIcon />}
              onClick={handleStartBackup}
              disabled={!formData.sourceDevice || !formData.targetDevice || isBackupRunning()}
            >
              {t('main.backup.start') || 'Start Backup'}
            </Button>
          </Box>
          {runningBackups.length > 0 && (
            <Typography
              variant="body2"
              color="text.secondary"
              align="center"
              sx={{ mt: 1 }}
              data-testid="start-stops-running-hint"
            >
              {t('main.backup.start_stops_running')}
            </Typography>
          )}

          {backupHistory.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <SectionHeader level={2} title={t('main.backup.previous_runs') || 'Previous Backup Runs'} sx={{ mb: 2 }} />
              <List>
                {backupHistory.map((backup, index) => (
                  <ListItem
                    key={index}
                    secondaryAction={
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<ReplayIcon />}
                        onClick={async () => {
                          const rerunData = {
                            ...formData,
                            sourceDevice: backup.sourceDevice,
                            targetDevice: backup.targetDevice,
                            moveFiles: backup.moveFiles ? 'move' : 'copy',
                            renameFiles: backup.renameFiles || false,
                            generateThumbnails: backup.generateThumbnails || false,
                            updateExif: backup.updateExif || false,
                            checksum: backup.checksum ? 'checksum' : 'file_size_timestamp',
                            powerOff: backup.powerOff || false,
                            presetSource: backup.presetSource || '',
                            presetTarget: backup.presetTarget || '',
                            telegramChatId: backup.telegramChatId || '',
                          };
                          setFormData(rerunData);
                          
                          try {
                            await api.post('/backup/start', buildBackupPayload(rerunData));
                            setToastSeverity('success');
                            setToastMessage(t('main.backup.initiated'));
                            setTimeout(() => {
                              loadRunningBackups();
                              loadBackupHistory();
                            }, 1000);
                          } catch (error) {
                            console.error('Failed to start backup:', error);
                            if (error.response?.status === 409) {
                              setMessage(t('main.backup_error') || 'A backup with this configuration is already running');
                            } else {
                              setMessage(t('main.backup_error') || 'Backup error');
                            }
                          }
                        }}
                      >
                        {t('main.backup.rerun') || 'Rerun'}
                      </Button>
                    }
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                          <Typography variant="body2">
                            {getServiceLabel(backup.sourceDevice, t)} → {getServiceLabel(backup.targetDevice, t)}
                          </Typography>
                          {backup.timestamp && (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(backup.timestamp).toLocaleString()}
                            </Typography>
                          )}
                        </Box>
                      }
                      secondary={
                        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                          {backup.presetSource && (
                            <Chip label={`Source: ${backup.presetSource}`} size="small" variant="outlined" />
                          )}
                          {backup.presetTarget && (
                            <Chip label={`Target: ${backup.presetTarget}`} size="small" variant="outlined" />
                          )}
                          {backup.moveFiles && <Chip label="Move" size="small" variant="outlined" />}
                          {backup.renameFiles && <Chip label="Rename" size="small" variant="outlined" />}
                          {backup.generateThumbnails && <Chip label="Thumbnails" size="small" variant="outlined" />}
                          {backup.updateExif && <Chip label="EXIF" size="small" variant="outlined" />}
                          {backup.checksum && <Chip label={t('main.backup.comparison_checksum') || 'Checksum'} size="small" variant="outlined" />}
                          {backup.powerOff && <Chip label="Power Off" size="small" variant="outlined" color="warning" />}
                        </Stack>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
      </Box>

      <Box sx={{ mt: 4 }}>
        <SectionHeader
          level={2}
          title={t('main.backup.running') || 'Running Backups'}
          sx={{ mb: 2 }}
          action={
            <Button
              variant="outlined"
              color="error"
              startIcon={<WarningAmberIcon />}
              onClick={() => handleStopBackup()}
              sx={{ minHeight: 44, whiteSpace: 'nowrap', flexShrink: 0 }}
              data-testid="stop-all-backups"
            >
              {t('main.backup.stop_all')}
            </Button>
          }
        />
        <Box sx={{ mt: 2 }}>
          {runningBackups.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              {t('main.backup.none_running')}
            </Typography>
          )}
          {runningBackups.length > 0 && (
            <List>
              {runningBackups.map((backup) => (
                <ListItem
                  key={backup.pid}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="stop"
                      onClick={() => handleStopBackup(backup.pid)}
                      color="error"
                    >
                      <StopIcon />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {getServiceLabel(backup.sourceDevice, t)} → {getServiceLabel(backup.targetDevice, t)}
                        </Typography>
                        <Chip label={`PID: ${backup.pid}`} size="small" />
                      </Box>
                    }
                    secondary={
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        {backup.presetSource && (
                          <Chip label={`Source: ${backup.presetSource}`} size="small" variant="outlined" />
                        )}
                        {backup.presetTarget && (
                          <Chip label={`Target: ${backup.presetTarget}`} size="small" variant="outlined" />
                        )}
                        {backup.moveFiles && <Chip label="Move" size="small" variant="outlined" />}
                        {backup.renameFiles && <Chip label="Rename" size="small" variant="outlined" />}
                        {backup.generateThumbnails && <Chip label="Thumbnails" size="small" variant="outlined" />}
                        {backup.updateExif && <Chip label="EXIF" size="small" variant="outlined" />}
                        {backup.checksum && <Chip label={t('main.backup.comparison_checksum') || 'Checksum'} size="small" variant="outlined" />}
                        {!backup.checksum && <Chip label={t('main.backup.comparison_file_size_timestamp') || 'File size and timestamp'} size="small" variant="outlined" />}
                        {backup.powerOff && <Chip label="Power Off" size="small" variant="outlined" color="warning" />}
                      </Stack>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Box>
      <Box sx={{ mt: 4 }}>
        <PageSection
          variant="accordion"
          title={t('main.backup.logs') || 'Backup logs'}
          localStorageKey="lbb-accordion-backup-logs"
        >
          <LogMonitor />
        </PageSection>
      </Box>

      <Box sx={{ mt: 4 }}>
        <PageSection
          variant="accordion"
          title={t('main.backup.help')}
          localStorageKey="lbb-accordion-backup-help"
        >
          <Typography
            component="div"
            variant="body2"
            data-testid="backup-help-text"
            sx={{ '& a': { color: 'primary.main' }, '& ul': { pl: 3, mt: 0 } }}
            // Static, translated help text from public/lang (ported from PHP L::main_help_txt).
            dangerouslySetInnerHTML={{ __html: t('main.backup.help_txt') }}
          />
        </PageSection>
      </Box>

      <Snackbar
        open={!!toastMessage}
        autoHideDuration={3000}
        onClose={() => setToastMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setToastMessage('')} 
          severity={toastSeverity}
          sx={{ width: '100%' }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

// Order of the LOCAL group, mirroring the PHP source/target lists (index.php:60-74).
const LOCAL_SERVICE_ORDER = ['anyusb', 'usb', 'internal', 'nvme', 'camera', 'ftp'];

function getServiceKind(service) {
  if (service.startsWith('social:')) return 'social';
  if (service === 'cloud_rsync' || service.startsWith('cloud:')) return 'network';
  return 'local';
}

// Regroup the /backup/services lists into LOCAL / NETWORK / SOCIAL MEDIA.
function groupServices(serviceGroups, { includeSocial }) {
  const all = [...new Set(Object.values(serviceGroups || {}).flat())];
  const local = all
    .filter((service) => getServiceKind(service) === 'local')
    .sort((a, b) => {
      const ia = LOCAL_SERVICE_ORDER.indexOf(a);
      const ib = LOCAL_SERVICE_ORDER.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    });
  const network = [
    ...all.filter((service) => service === 'cloud_rsync'),
    ...all.filter((service) => service.startsWith('cloud:')),
  ];
  const social = includeSocial ? all.filter((service) => getServiceKind(service) === 'social') : [];
  return [
    { key: 'local', label: 'main.backup.group_local', items: local },
    { key: 'network', label: 'main.backup.group_network', items: network },
    { key: 'social', label: 'main.backup.group_social', items: social },
  ].filter((group) => group.items.length > 0);
}

// Children for a grouped <Select>. MUI needs a flat array (no fragments).
function renderServiceOptions(groups, t, getReason = () => null) {
  return groups.flatMap((group) => [
    <ListSubheader key={`header-${group.key}`}>{t(group.label)}</ListSubheader>,
    ...group.items.map((service) => {
      const reasonKey = getReason(service);
      return (
        <MenuItem key={service} value={service} disabled={Boolean(reasonKey)} data-service={service}>
          <ListItemText
            primary={getServiceLabel(service, t)}
            secondary={reasonKey ? t(reasonKey) : null}
            sx={{ my: 0 }}
          />
        </MenuItem>
      );
    }),
  ]);
}

// Partition preset options, labelled like PHP (index.php:346-352).
function renderPartitionOptions(partitions, t) {
  return [
    <MenuItem key="auto" value="">
      {t('main.backup.preset_partition_auto')}
    </MenuItem>,
    ...partitions
      .filter((p) => p.identifier)
      .map((p) => (
        <MenuItem key={`${p.lum}-${p.identifier}`} value={p.identifier}>
          {`${p.lum} (${p.identifier.replace(/^-+|-+$/g, '')})`}
        </MenuItem>
      )),
  ];
}

function buildBackupPayload(data) {
  const payload = {
    ...data,
    moveFiles: data.moveFiles === 'move',
    checksum: data.checksum === 'checksum',
    // PHP (index.php:484-486) ignores the source preset unless the source is 'usb'.
    presetSource: data.sourceDevice === 'usb' ? data.presetSource || '' : '',
    presetTarget: data.presetTarget || '',
  };
  if (data.targetDevice !== 'social:telegram' || !data.telegramChatId) {
    delete payload.telegramChatId;
  }
  return payload;
}

function getServiceLabel(service, t) {
  if (!service) return '';

  const parts = service.split(':');
  const type = parts[0];
  const name = parts[parts.length - 1];

  if (type === 'cloud' && parts.length > 1) {
    return `${t('box.backup.mode.cloud')} · ${parts.slice(1).join(':')}`;
  }

  if (type === 'social' && parts.length > 1) {
    const socialName = parts[1];
    return t(`box.backup.mode.${socialName}`) || socialName;
  }

  const labels = {
    anyusb: t('box.backup.mode.anyusb') || 'any USB',
    usb: t('box.backup.mode.usb') || 'USB storage',
    internal: t('box.backup.mode.internal') || 'Int. storage',
    nvme: t('box.backup.mode.nvme') || 'NVMe SSD',
    camera: t('box.backup.mode.cameras') || 'Cameras',
    cloud_rsync: t('box.backup.mode.cloud_rsync') || 'rsync server',
    ftp: t('box.backup.mode.ftp') || 'LBBs FTP server',
  };

  return labels[name] || name;
}

function isLocalStorageTarget(target) {
  if (!target) return false;
  return ['usb', 'internal', 'nvme'].includes(target);
}

// Disallowed source/target combinations, mirroring HideDisallowedButtons in
// scripts/index.php:113-142. Returns the translation key of the reason, or null.
function getDisallowedReason(source, target) {
  if (!source || !target) return null;
  if (target === source && target !== 'usb') return 'main.backup.disallowed_same';
  const noDirectNetwork = ['anyusb', 'camera', 'ftp'].includes(source);
  if (noDirectNetwork && target === 'cloud_rsync') return 'main.backup.disallowed_rsync';
  if ((noDirectNetwork || source.startsWith('cloud')) && target.startsWith('social')) {
    return 'main.backup.disallowed_social';
  }
  return null;
}

export default Backup;
