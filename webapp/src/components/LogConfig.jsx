import React, { useEffect, useRef, useState } from 'react';
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import { isConfigTrue, toConfigBool } from '../utils/configValue';

// Keys as written by scripts/setup.php (note the PHP spelling conf_DIPLAY_IMAGES_KEEP).
const LOG_KEYS = ['conf_LOGLEVEL', 'conf_LOG_SYNC', 'conf_DIPLAY_IMAGES_KEEP'];

// setup.php:1860-1880: 1 = minimum, 2 = medium, 3 = maximum.
const LOG_LEVELS = [
  { value: '1', labelKey: 'config.log_level_minimum' },
  { value: '2', labelKey: 'config.log_level_medium' },
  { value: '3', labelKey: 'config.log_level_maximum' },
];

function LogConfig() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [formData, setFormData] = useState({});
  const isInitialMount = useRef(true);
  const saveTimeoutRef = useRef(null);
  const lastSavedConfig = useRef(null);
  const isSaving = useRef(false);

  useEffect(() => {
    if (!config) return;
    const subset = Object.fromEntries(
      Object.entries(config).filter(([k]) => LOG_KEYS.includes(k)),
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
      } catch (error) {
        console.error('Failed to save log config:', error);
      } finally {
        isSaving.current = false;
      }
    }, 500);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [formData, updateConfig]);

  return (
    <Stack spacing={2}>
      <FormControl sx={{ maxWidth: 400 }}>
        <InputLabel>{t('config.log_level')}</InputLabel>
        <Select
          value={formData.conf_LOGLEVEL || '1'}
          onChange={(e) => setFormData({ ...formData, conf_LOGLEVEL: e.target.value })}
          label={t('config.log_level')}
        >
          {LOG_LEVELS.map((level) => (
            <MenuItem key={level.value} value={level.value}>
              {level.value}, {t(level.labelKey)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <FormControlLabel
        control={
          <Checkbox
            checked={isConfigTrue(formData.conf_LOG_SYNC)}
            onChange={(e) =>
              setFormData({ ...formData, conf_LOG_SYNC: toConfigBool(e.target.checked) })
            }
          />
        }
        label={t('config.log_sync')}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={isConfigTrue(formData.conf_DIPLAY_IMAGES_KEEP)}
            onChange={(e) =>
              setFormData({ ...formData, conf_DIPLAY_IMAGES_KEEP: toConfigBool(e.target.checked) })
            }
          />
        }
        label={t('config.display_images_keep')}
      />
    </Stack>
  );
}

export default LogConfig;
