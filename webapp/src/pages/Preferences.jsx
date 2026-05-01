import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import PageSection from '../components/PageSection';
import SectionHeader from '../components/SectionHeader';

const PREFERENCES_KEYS = [
  'conf_LANGUAGE',
  'conf_THEME',
  'conf_timezone',
  'conf_background_image',
  'conf_popup_messages',
  'conf_VIRTUAL_KEYBOARD_ENABLED',
  'conf_camera_folder_mask',
  'conf_target_size_minimum',
  'conf_idle_power_off',
  'conf_write_rating_to_exif',
];

function Preferences() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState('');
  const [cameraFolderMaskError, setCameraFolderMaskError] = useState(false);
  const [backgroundImageError, setBackgroundImageError] = useState(false);
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef(null);
  const lastSavedConfig = useRef(null);
  const isSaving = useRef(false);

  useEffect(() => {
    if (!config) return;
    const subset = Object.fromEntries(
      Object.entries(config).filter(
        ([k]) => PREFERENCES_KEYS.includes(k) || k.startsWith('conf_default_backup_'),
      ),
    );
    const subsetString = JSON.stringify(subset);
    if (lastSavedConfig.current !== subsetString) {
      setFormData(subset);
      lastSavedConfig.current = subsetString;
      isInitialMount.current = true;
      isSaving.current = false;
    }
  }, [config]);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (isSaving.current) return;
    if (Object.keys(formData).length === 0) return;
    const formDataString = JSON.stringify(formData);
    if (lastSavedConfig.current === formDataString) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      isSaving.current = true;
      try {
        await updateConfig(formData);
        lastSavedConfig.current = JSON.stringify(formData);
        setMessage(t('config.message_settings_saved') || 'Settings saved');
      } catch (error) {
        console.error('Failed to save preferences:', error);
        setMessage('Error saving settings');
      } finally {
        isSaving.current = false;
      }
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [formData, updateConfig, t]);

  if (!config) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <PageSection variant="card" title={t('config.backup.general_settings_header') || 'Display'}>
        <Stack spacing={3}>
          <FormControl sx={{ maxWidth: 400 }}>
            <InputLabel>{t('config.lang_header') || 'Language'}</InputLabel>
            <Select
              value={formData.conf_LANGUAGE || 'en'}
              onChange={(e) => setFormData({ ...formData, conf_LANGUAGE: e.target.value })}
              label={t('config.lang_header') || 'Language'}
            >
              <MenuItem value="en">English</MenuItem>
              <MenuItem value="de">Deutsch</MenuItem>
              <MenuItem value="es">Español</MenuItem>
              <MenuItem value="fr">Français</MenuItem>
              <MenuItem value="fi">Suomi</MenuItem>
            </Select>
          </FormControl>

          <FormControl sx={{ maxWidth: 400 }}>
            <InputLabel>{t('config.view_theme_header') || 'Theme'}</InputLabel>
            <Select
              value={formData.conf_THEME || 'system'}
              onChange={(e) => setFormData({ ...formData, conf_THEME: e.target.value })}
              label={t('config.view_theme_header') || 'Theme'}
            >
              <MenuItem value="light">Light</MenuItem>
              <MenuItem value="dark">Dark</MenuItem>
              <MenuItem value="system">System</MenuItem>
              <MenuItem value="sepia">{t('config.view_theme_sepia')}</MenuItem>
            </Select>
          </FormControl>

          <Autocomplete
            sx={{ maxWidth: 400 }}
            options={Intl.supportedValuesOf('timeZone')}
            value={formData.conf_timezone || Intl.DateTimeFormat().resolvedOptions().timeZone}
            onChange={(_e, newValue) => {
              if (newValue) setFormData({ ...formData, conf_timezone: newValue });
            }}
            renderInput={(params) => <TextField {...params} label={t('config.timezone')} />}
          />

          <Box>
            <TextField
              sx={{ maxWidth: 400 }}
              fullWidth
              label={t('config.background_image')}
              helperText={backgroundImageError ? undefined : t('config.background_image_help')}
              value={formData.conf_background_image || ''}
              error={backgroundImageError}
              onChange={(e) => {
                const val = e.target.value;
                if (val.includes('..')) {
                  setBackgroundImageError(true);
                } else {
                  setBackgroundImageError(false);
                  setFormData({ ...formData, conf_background_image: val });
                }
              }}
            />
            {backgroundImageError && (
              <Alert severity="error" sx={{ mt: 1, maxWidth: 400 }}>
                {t('config.background_image_path_traversal') || 'Path traversal not allowed'}
              </Alert>
            )}
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.conf_popup_messages !== 'false'}
                onChange={(e) => setFormData({ ...formData, conf_popup_messages: e.target.checked ? 'true' : 'false' })}
              />
            }
            label={t('config.popup_messages')}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.conf_VIRTUAL_KEYBOARD_ENABLED === '1' || formData.conf_VIRTUAL_KEYBOARD_ENABLED === true}
                onChange={(e) =>
                  setFormData({ ...formData, conf_VIRTUAL_KEYBOARD_ENABLED: e.target.checked ? '1' : '0' })
                }
              />
            }
            label={t('config.screen.virtual_keyboard_enable_label') || 'Enable virtual keyboard'}
          />
        </Stack>
      </PageSection>

      <PageSection variant="card" title={t('config.backup.section') || 'Backup defaults'}>
        <Stack spacing={3}>
          <Box>
            <TextField
              sx={{ maxWidth: 400 }}
              fullWidth
              label={t('config.camera_folder_mask')}
              helperText={cameraFolderMaskError ? undefined : t('config.camera_folder_mask_help')}
              value={formData.conf_camera_folder_mask || 'DCIM'}
              error={cameraFolderMaskError}
              onChange={(e) => {
                const val = e.target.value;
                if (val.includes('/')) {
                  setCameraFolderMaskError(true);
                } else {
                  setCameraFolderMaskError(false);
                  setFormData({ ...formData, conf_camera_folder_mask: val });
                }
              }}
            />
            {cameraFolderMaskError && (
              <Alert severity="error" sx={{ mt: 1, maxWidth: 400 }}>
                {t('config.camera_folder_mask_no_slash') || 'Folder mask must not contain /'}
              </Alert>
            )}
          </Box>

          <TextField
            sx={{ maxWidth: 400 }}
            fullWidth
            type="number"
            label={t('config.target_size_minimum')}
            helperText={t('config.target_size_minimum_help')}
            value={formData.conf_target_size_minimum || '0'}
            onChange={(e) => setFormData({ ...formData, conf_target_size_minimum: e.target.value })}
          />

          <TextField
            sx={{ maxWidth: 400 }}
            fullWidth
            type="number"
            label={t('config.idle_power_off')}
            helperText={t('config.idle_power_off_help')}
            value={formData.conf_idle_power_off || '0'}
            onChange={(e) => setFormData({ ...formData, conf_idle_power_off: e.target.value })}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={formData.conf_write_rating_to_exif === 'true'}
                onChange={(e) =>
                  setFormData({ ...formData, conf_write_rating_to_exif: e.target.checked ? 'true' : 'false' })
                }
              />
            }
            label={t('config.write_rating_to_exif')}
          />

          <Box>
            <SectionHeader level={3} title={t('config.default_backup_mode_section')} sx={{ mb: 1 }} />
            <Box sx={{ overflowX: 'auto' }}>
              {(() => {
                const sources = ['camera', 'usb', 'internal', 'nvme'];
                const targets = ['usb', 'internal', 'nvme', 'cloud', 'rsync'];
                const validCombinations = new Set([
                  'camera-usb', 'camera-internal', 'camera-nvme',
                  'usb-internal', 'usb-nvme', 'usb-cloud', 'usb-rsync',
                  'internal-usb', 'internal-nvme', 'internal-cloud',
                  'nvme-usb', 'nvme-internal', 'nvme-cloud',
                ]);
                return (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell />
                        {targets.map((target) => (
                          <TableCell key={target} align="center">
                            {t(`config.target_${target}`)}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sources.map((source) => (
                        <TableRow key={source}>
                          <TableCell>{t(`config.source_${source}`)}</TableCell>
                          {targets.map((target) => {
                            const key = `${source}-${target}`;
                            const configKey = `conf_default_backup_${source}_${target}`;
                            if (!validCombinations.has(key)) {
                              return <TableCell key={target} />;
                            }
                            return (
                              <TableCell key={target} align="center">
                                <FormControl size="small">
                                  <Select
                                    value={formData[configKey] || 'copy'}
                                    onChange={(e) =>
                                      setFormData({ ...formData, [configKey]: e.target.value })
                                    }
                                    sx={{ fontSize: '0.75rem' }}
                                  >
                                    <MenuItem value="copy">{t('config.backup_mode_copy')}</MenuItem>
                                    <MenuItem value="move">{t('config.backup_mode_move')}</MenuItem>
                                  </Select>
                                </FormControl>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
              })()}
            </Box>
          </Box>
        </Stack>
      </PageSection>

      <Snackbar
        open={!!message}
        autoHideDuration={3000}
        onClose={() => setMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setMessage('')}
          severity={message.includes('Error') ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

export default Preferences;
