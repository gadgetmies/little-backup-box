import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  InputLabel,
  ListSubheader,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import { useDrawer } from '../contexts/DrawerContext';
import { drawerWidth, drawerCollapsedWidth } from '../components/Menu';
import SectionHeader from '../components/SectionHeader';
import PageSaveBar from '../components/PageSaveBar';
import DevicePasswordSettings from '../components/DevicePasswordSettings';
import usePopupMessages from '../hooks/usePopupMessages';
import { isConfigTrue, toConfigBool } from '../utils/configValue';
import api from '../utils/api';

// conf_* keys edited on this page, with the defaults of scripts/lib_setup.py.
const PREFERENCES_DEFAULTS = {
  conf_LANGUAGE: '',
  conf_THEME: 'dark',
  conf_TIME_ZONE: 'Europe/London',
  conf_BACKGROUND_IMAGE: '',
  conf_POPUP_MESSAGES: 'true',
  conf_VIRTUAL_KEYBOARD_ENABLED: 'true',
  conf_BACKUP_DEFAULT_SOURCE: 'none',
  conf_BACKUP_DEFAULT_TARGET: 'none',
  conf_BACKUP_DEFAULT_MOVE_FILES: 'false',
  conf_BACKUP_DEFAULT_SOURCE2: 'none',
  conf_BACKUP_DEFAULT_TARGET2: 'none',
  conf_BACKUP_DEFAULT2_MOVE_FILES: 'false',
  conf_VIEW_WRITE_RATING_EXIF: 'false',
  conf_VIEW_CONVERT_HEIC: 'true',
  conf_BACKUP_TARGET_SIZE_MIN: '0',
  conf_POWER_OFF_IDLE_TIME: '0',
  conf_BACKUP_CAMERA_FOLDER_MASK: '*:DCIM',
};

const BOOLEAN_KEYS = [
  'conf_POPUP_MESSAGES',
  'conf_VIRTUAL_KEYBOARD_ENABLED',
  'conf_BACKUP_DEFAULT_MOVE_FILES',
  'conf_BACKUP_DEFAULT2_MOVE_FILES',
  'conf_VIEW_WRITE_RATING_EXIF',
  'conf_VIEW_CONVERT_HEIC',
];

const TAB_NAMES = ['display', 'locale', 'backup', 'security'];

// setup.php:683-715 — minimum free space on the target.
const TARGET_SIZE_OPTIONS = [
  { value: '0', label: null },
  { value: String(100 * 1024 ** 2), label: '100 MB' },
  { value: String(512 * 1024 ** 2), label: '512 MB' },
  { value: String(1024 ** 3), label: '1 GB' },
  { value: String(512 * 1024 ** 3), label: '512 GB' },
  { value: String(1024 ** 4), label: '1 TB' },
];

// setup.php:846-860 — idle power-off in minutes (0 = never).
const IDLE_TIME_OPTIONS = ['0', '2', '5', '10', '15', '20', '30'];

// The default-backup selector of setup.php:724-841: groups by target, each
// with the sources PHP offers for it.
function buildDefaultBackupGroups({ nvme, clouds, rsync }) {
  const groups = [];
  groups.push({
    target: 'usb',
    sources: ['anyusb', 'usb', ...(nvme ? ['nvme'] : []), 'internal', 'camera', 'ftp'],
  });
  if (nvme) {
    groups.push({ target: 'nvme', sources: ['anyusb', 'usb', 'internal', 'camera', 'ftp'] });
  }
  groups.push({
    target: 'internal',
    sources: ['anyusb', 'usb', ...(nvme ? ['nvme'] : []), 'camera', 'ftp'],
  });
  if (rsync) {
    groups.push({ target: 'cloud_rsync', sources: ['usb', ...(nvme ? ['nvme'] : []), 'internal'] });
  }
  clouds.forEach((cloud) => {
    groups.push({
      target: `cloud:${cloud}`,
      sources: ['anyusb', 'usb', ...(nvme ? ['nvme'] : []), 'internal', 'camera', 'ftp'],
    });
  });
  return groups;
}

// get_secondary_backup_selector() in scripts/sub-common.php.
function buildSecondaryBackupGroups({ nvme, clouds, rsync }) {
  const groups = [];
  if (rsync) {
    groups.push({ target: 'cloud_rsync', sources: ['usb', ...(nvme ? ['nvme'] : []), 'internal'] });
  }
  clouds.forEach((cloud) => {
    groups.push({ target: `cloud:${cloud}`, sources: ['usb', ...(nvme ? ['nvme'] : []), 'internal'] });
  });
  return groups;
}

function cameraMaskToText(mask) {
  return (mask || '').split(';').join('\n');
}

function textToCameraMask(text) {
  return text.split(/\r?\n/).join(';');
}

function cleanCameraMask(mask) {
  return (mask || '')
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .join(';');
}

function TabPanel({ children, value, index }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`preferences-tabpanel-${index}`}
      aria-labelledby={`preferences-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function BackupModeSelect({ id, label, helperText, value, groups, onChange, t, storageLabel }) {
  const values = new Set(['none none']);
  groups.forEach((group) => group.sources.forEach((source) => values.add(`${source} ${group.target}`)));
  const [currentSource, currentTarget] = value.split(' ');
  const unknown = !values.has(value);

  const items = [
    <MenuItem key="none" value="none none">
      {t('config.backup.none')}
    </MenuItem>,
  ];
  groups.forEach((group) => {
    items.push(
      <ListSubheader key={`group-${group.target}`}>→ {storageLabel(group.target)}</ListSubheader>,
    );
    group.sources.forEach((source) => {
      items.push(
        <MenuItem key={`${source} ${group.target}`} value={`${source} ${group.target}`} sx={{ pl: 4 }}>
          {storageLabel(source)} → {storageLabel(group.target)}
        </MenuItem>,
      );
    });
  });
  if (unknown) {
    items.push(
      <MenuItem key="current" value={value}>
        {storageLabel(currentSource)} → {storageLabel(currentTarget || 'none')}
      </MenuItem>,
    );
  }

  return (
    <FormControl fullWidth>
      <InputLabel id={`${id}-label`}>{label}</InputLabel>
      <Select
        labelId={`${id}-label`}
        id={id}
        label={label}
        value={value}
        onChange={(e) => {
          const [source, ...rest] = e.target.value.split(' ');
          onChange(source, rest.join(' ') || 'none');
        }}
        MenuProps={{ PaperProps: { sx: { maxHeight: 420 } } }}
      >
        {items}
      </Select>
      {helperText && <FormHelperText>{helperText}</FormHelperText>}
    </FormControl>
  );
}

function Preferences() {
  const { t } = useLanguage();
  const { config, constants, updateConfig } = useConfig();
  const { desktopOpen } = useDrawer();
  const { notifyInfo } = usePopupMessages();
  const currentDrawerWidth = desktopOpen ? drawerWidth : drawerCollapsedWidth;
  const [formData, setFormData] = useState({});
  const lastSaved = useRef('');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', severity: 'success' });
  const [services, setServices] = useState({ nvme: false, clouds: [], rsync: false });
  const [backgroundImages, setBackgroundImages] = useState([]);
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = window.localStorage.getItem('lbb-tabs-preferences');
    const idx = TAB_NAMES.indexOf(saved);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    if (!config) return;
    const initial = {};
    Object.entries(PREFERENCES_DEFAULTS).forEach(([key, fallback]) => {
      const value = config[key];
      initial[key] = value === undefined || value === null ? fallback : String(value);
      if (BOOLEAN_KEYS.includes(key)) initial[key] = toConfigBool(isConfigTrue(initial[key]));
    });
    setFormData(initial);
    lastSaved.current = JSON.stringify(initial);
  }, [config]);

  useEffect(() => {
    let cancelled = false;
    api
      .get('/backup/services')
      .then((response) => {
        if (cancelled) return;
        const cloudTargets = response.data?.targetServices?.cloud || [];
        setServices({
          nvme: Boolean(response.data?.nvmeAvailable),
          clouds: cloudTargets.filter((s) => s.startsWith('cloud:')).map((s) => s.slice('cloud:'.length)),
          rsync: cloudTargets.includes('cloud_rsync'),
        });
      })
      .catch((error) => console.error('Failed to load backup services:', error));
    api
      .get('/config/background-images')
      .then((response) => {
        if (!cancelled) setBackgroundImages(response.data?.images || []);
      })
      .catch((error) => console.error('Failed to load background images:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty = Object.keys(formData).length > 0 && JSON.stringify(formData) !== lastSaved.current;

  const set = (key, value) => setFormData((prev) => ({ ...prev, [key]: value }));
  const setBool = (key) => (e) => set(key, toConfigBool(e.target.checked));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updates = {
        ...formData,
        conf_BACKUP_CAMERA_FOLDER_MASK: cleanCameraMask(formData.conf_BACKUP_CAMERA_FOLDER_MASK),
      };
      await updateConfig(updates);
      lastSaved.current = JSON.stringify(formData);
      notifyInfo(setMessage, { text: t('config.message_settings_saved'), severity: 'success' });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      setMessage({
        text: error?.response?.data?.error || t('config.save_partial_error'),
        severity: 'error',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = (_event, newValue) => {
    setCurrentTab(newValue);
    if (TAB_NAMES[newValue]) {
      try {
        localStorage.setItem('lbb-tabs-preferences', TAB_NAMES[newValue]);
      } catch {
        // localStorage unavailable
      }
    }
  };

  const storageLabel = (id) => {
    if (!id || id === 'none') return t('config.backup.none');
    if (id.startsWith('cloud:')) return id.slice('cloud:'.length);
    if (id === 'camera') return t('preferences.backup.camera');
    return t(`box.backup.mode.${id}`);
  };

  const defaultGroups = useMemo(() => buildDefaultBackupGroups(services), [services]);
  const secondaryGroups = useMemo(() => buildSecondaryBackupGroups(services), [services]);

  const timeZones = useMemo(() => {
    try {
      return Intl.supportedValuesOf('timeZone');
    } catch {
      return [];
    }
  }, []);

  if (!config || Object.keys(formData).length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const backgroundDir = constants
    ? `${constants.const_MEDIA_DIR}/${constants.const_BACKGROUND_IMAGES_DIR}`
    : '';
  const backgroundOptions = [
    ...backgroundImages,
    ...(formData.conf_BACKGROUND_IMAGE && !backgroundImages.includes(formData.conf_BACKGROUND_IMAGE)
      ? [formData.conf_BACKGROUND_IMAGE]
      : []),
  ];
  const targetSizeOptions = TARGET_SIZE_OPTIONS.some((o) => o.value === formData.conf_BACKUP_TARGET_SIZE_MIN)
    ? TARGET_SIZE_OPTIONS
    : [
        ...TARGET_SIZE_OPTIONS,
        {
          value: formData.conf_BACKUP_TARGET_SIZE_MIN,
          label: `${Math.round(Number(formData.conf_BACKUP_TARGET_SIZE_MIN) / 1024 ** 2)} MB`,
        },
      ];
  const idleOptions = IDLE_TIME_OPTIONS.includes(formData.conf_POWER_OFF_IDLE_TIME)
    ? IDLE_TIME_OPTIONS
    : [...IDLE_TIME_OPTIONS, formData.conf_POWER_OFF_IDLE_TIME];

  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="preferences tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab label={t('preferences.tab.display')} id="preferences-tab-0" aria-controls="preferences-tabpanel-0" />
          <Tab label={t('preferences.tab.locale')} id="preferences-tab-1" aria-controls="preferences-tabpanel-1" />
          <Tab label={t('preferences.tab.backup')} id="preferences-tab-2" aria-controls="preferences-tabpanel-2" />
          <Tab label={t('preferences.tab.security')} id="preferences-tab-3" aria-controls="preferences-tabpanel-3" />
        </Tabs>
      </Box>

      <TabPanel value={currentTab} index={0}>
        <Stack spacing={3} sx={{ maxWidth: 480 }}>
          <FormControl fullWidth>
            <InputLabel id="pref-theme-label">{t('config.view_theme_header')}</InputLabel>
            <Select
              labelId="pref-theme-label"
              value={formData.conf_THEME || 'dark'}
              onChange={(e) => set('conf_THEME', e.target.value)}
              label={t('config.view_theme_header')}
            >
              <MenuItem value="light">{t('config.view_theme_light')}</MenuItem>
              <MenuItem value="dark">{t('config.view_theme_dark')}</MenuItem>
              <MenuItem value="sepia">{t('config.view_theme_sepia')}</MenuItem>
              <MenuItem value="system">{t('config.view_theme_system')}</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel id="pref-background-label" shrink>{t('preferences.display.background_label')}</InputLabel>
            <Select
              labelId="pref-background-label"
              value={formData.conf_BACKGROUND_IMAGE || ''}
              onChange={(e) => set('conf_BACKGROUND_IMAGE', e.target.value)}
              label={t('preferences.display.background_label')}
              displayEmpty
              notched
            >
              <MenuItem value="">{t('preferences.display.background_none')}</MenuItem>
              {backgroundOptions.map((image) => (
                <MenuItem key={image} value={image}>
                  {image}
                </MenuItem>
              ))}
            </Select>
            <FormHelperText>
              {t('preferences.display.background_help')} {backgroundDir}
            </FormHelperText>
          </FormControl>

          <FormControlLabel
            sx={{ minHeight: 44 }}
            control={
              <Checkbox
                checked={isConfigTrue(formData.conf_POPUP_MESSAGES)}
                onChange={setBool('conf_POPUP_MESSAGES')}
              />
            }
            label={t('preferences.display.popup_label')}
          />

          <FormControlLabel
            sx={{ minHeight: 44 }}
            control={
              <Checkbox
                checked={isConfigTrue(formData.conf_VIRTUAL_KEYBOARD_ENABLED)}
                onChange={setBool('conf_VIRTUAL_KEYBOARD_ENABLED')}
              />
            }
            label={t('config.screen.virtual_keyboard_enable_label')}
          />
        </Stack>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
        <Stack spacing={3} sx={{ maxWidth: 480 }}>
          <FormControl fullWidth>
            <InputLabel id="pref-language-label" shrink>{t('config.lang_header')}</InputLabel>
            <Select
              labelId="pref-language-label"
              value={formData.conf_LANGUAGE || ''}
              onChange={(e) => set('conf_LANGUAGE', e.target.value)}
              label={t('config.lang_header')}
              displayEmpty
              notched
            >
              <MenuItem value="">{t('config.lang_browser_detect')}</MenuItem>
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="de">Deutsch</MenuItem>
              <MenuItem value="es">Español</MenuItem>
              <MenuItem value="fr">Français</MenuItem>
              <MenuItem value="fi">Suomi</MenuItem>
            </Select>
          </FormControl>

          <Autocomplete
            options={timeZones}
            value={formData.conf_TIME_ZONE || null}
            onChange={(_e, newValue) => {
              if (newValue) set('conf_TIME_ZONE', newValue);
            }}
            renderInput={(params) => <TextField {...params} label={t('config.timezone')} />}
          />
        </Stack>
      </TabPanel>

      <TabPanel value={currentTab} index={2}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr)', md: 'repeat(2, minmax(0, 1fr))' },
            columnGap: 5,
            rowGap: 4,
          }}
        >
          <Box>
            <Stack spacing={2.5}>
              <SectionHeader level={2} title={t('preferences.backup.startup_header')} />
              <BackupModeSelect
                id="pref-default-backup"
                label={t('preferences.backup.default_label')}
                helperText={t('preferences.backup.default_help')}
                value={`${formData.conf_BACKUP_DEFAULT_SOURCE} ${formData.conf_BACKUP_DEFAULT_TARGET}`}
                groups={defaultGroups}
                storageLabel={storageLabel}
                t={t}
                onChange={(source, target) =>
                  setFormData((prev) => ({
                    ...prev,
                    conf_BACKUP_DEFAULT_SOURCE: source,
                    conf_BACKUP_DEFAULT_TARGET: target,
                  }))
                }
              />
              <FormControlLabel
                sx={{ minHeight: 44 }}
                control={
                  <Checkbox
                    checked={isConfigTrue(formData.conf_BACKUP_DEFAULT_MOVE_FILES)}
                    onChange={setBool('conf_BACKUP_DEFAULT_MOVE_FILES')}
                  />
                }
                label={t('preferences.backup.move_files')}
              />
              <BackupModeSelect
                id="pref-secondary-backup"
                label={t('preferences.backup.second_label')}
                helperText={t('preferences.backup.second_help')}
                value={`${formData.conf_BACKUP_DEFAULT_SOURCE2} ${formData.conf_BACKUP_DEFAULT_TARGET2}`}
                groups={secondaryGroups}
                storageLabel={storageLabel}
                t={t}
                onChange={(source, target) =>
                  setFormData((prev) => ({
                    ...prev,
                    conf_BACKUP_DEFAULT_SOURCE2: source,
                    conf_BACKUP_DEFAULT_TARGET2: target,
                  }))
                }
              />
              <FormControlLabel
                sx={{ minHeight: 44 }}
                control={
                  <Checkbox
                    checked={isConfigTrue(formData.conf_BACKUP_DEFAULT2_MOVE_FILES)}
                    onChange={setBool('conf_BACKUP_DEFAULT2_MOVE_FILES')}
                  />
                }
                label={t('preferences.backup.second_move_files')}
              />

              <SectionHeader level={2} title={t('preferences.library.header')} sx={{ pt: 2 }} />
              <FormControlLabel
                sx={{ minHeight: 44 }}
                control={
                  <Checkbox
                    checked={isConfigTrue(formData.conf_VIEW_WRITE_RATING_EXIF)}
                    onChange={setBool('conf_VIEW_WRITE_RATING_EXIF')}
                  />
                }
                label={t('preferences.library.write_rating')}
              />
              <FormControlLabel
                sx={{ minHeight: 44 }}
                control={
                  <Checkbox
                    checked={isConfigTrue(formData.conf_VIEW_CONVERT_HEIC)}
                    onChange={setBool('conf_VIEW_CONVERT_HEIC')}
                  />
                }
                label={t('preferences.library.convert_heic')}
              />
            </Stack>
          </Box>

          <Box>
            <Stack spacing={2.5}>
              <SectionHeader level={2} title={t('preferences.limits.header')} />
              <FormControl fullWidth>
                <InputLabel id="pref-target-size-label">{t('preferences.limits.target_size_label')}</InputLabel>
                <Select
                  labelId="pref-target-size-label"
                  value={formData.conf_BACKUP_TARGET_SIZE_MIN}
                  onChange={(e) => set('conf_BACKUP_TARGET_SIZE_MIN', e.target.value)}
                  label={t('preferences.limits.target_size_label')}
                >
                  {targetSizeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label
                        ? `${option.label} ${t('preferences.limits.free')}`
                        : t('preferences.limits.target_size_ignore')}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="pref-idle-label">{t('preferences.limits.idle_label')}</InputLabel>
                <Select
                  labelId="pref-idle-label"
                  value={formData.conf_POWER_OFF_IDLE_TIME}
                  onChange={(e) => set('conf_POWER_OFF_IDLE_TIME', e.target.value)}
                  label={t('preferences.limits.idle_label')}
                >
                  {idleOptions.map((minutes) => (
                    <MenuItem key={minutes} value={minutes}>
                      {minutes === '0'
                        ? t('preferences.limits.idle_never')
                        : `${minutes} ${t('preferences.limits.minutes')}`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <SectionHeader level={2} title={t('preferences.camera.header')} sx={{ pt: 2 }} />
              <TextField
                label={t('preferences.camera.label')}
                helperText={t('preferences.camera.help')}
                value={cameraMaskToText(formData.conf_BACKUP_CAMERA_FOLDER_MASK)}
                onChange={(e) => set('conf_BACKUP_CAMERA_FOLDER_MASK', textToCameraMask(e.target.value))}
                multiline
                minRows={4}
                fullWidth
                inputProps={{ spellCheck: false, style: { fontFamily: 'monospace' } }}
              />
            </Stack>
          </Box>
        </Box>
      </TabPanel>

      <TabPanel value={currentTab} index={3}>
        <DevicePasswordSettings onMessage={(text) => setMessage({ text, severity: 'success' })} />
      </TabPanel>

      <Snackbar
        open={!!message.text}
        autoHideDuration={4000}
        onClose={() => setMessage({ text: '', severity: 'success' })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setMessage({ text: '', severity: 'success' })}
          severity={message.severity}
          sx={{ width: '100%' }}
        >
          {message.text}
        </Alert>
      </Snackbar>

      <PageSaveBar
        isDirty={isDirty}
        isSaving={isSaving}
        onSave={handleSave}
        drawerWidth={currentDrawerWidth}
      />
    </Box>
  );
}

export default Preferences;
