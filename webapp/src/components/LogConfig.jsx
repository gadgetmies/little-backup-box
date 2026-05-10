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

const LOG_KEYS = ['conf_log_level', 'conf_log_sync', 'conf_display_images_keep'];

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
          value={formData.conf_log_level || 'ERROR'}
          onChange={(e) => setFormData({ ...formData, conf_log_level: e.target.value })}
          label={t('config.log_level')}
        >
          <MenuItem value="ERROR">ERROR</MenuItem>
          <MenuItem value="WARNING">WARNING</MenuItem>
          <MenuItem value="INFO">INFO</MenuItem>
          <MenuItem value="DEBUG">DEBUG</MenuItem>
        </Select>
      </FormControl>
      <FormControlLabel
        control={
          <Checkbox
            checked={formData.conf_log_sync === 'true'}
            onChange={(e) =>
              setFormData({ ...formData, conf_log_sync: e.target.checked ? 'true' : 'false' })
            }
          />
        }
        label={t('config.log_sync')}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={formData.conf_display_images_keep === 'true'}
            onChange={(e) =>
              setFormData({ ...formData, conf_display_images_keep: e.target.checked ? 'true' : 'false' })
            }
          />
        }
        label={t('config.display_images_keep')}
      />
    </Stack>
  );
}

export default LogConfig;
