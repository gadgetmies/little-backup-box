import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, Stack, TextField } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';

function FanConfig({ onSavedStateChange }) {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [formData, setFormData] = useState({});
  const [fanTempError, setFanTempError] = useState('');
  const lastSavedConfig = useRef(null);

  useEffect(() => {
    if (!config) return;
    const initial = {
      conf_FAN_PWM_TEMP_C: config.conf_FAN_PWM_TEMP_C ?? '',
      conf_FAN_GPIO_PIN: config.conf_FAN_GPIO_PIN ?? '',
    };
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(initial);
    lastSavedConfig.current = JSON.stringify(initial);
  }, [config]);

  const handleFanTempChange = (value) => {
    setFormData((prev) => ({ ...prev, conf_FAN_PWM_TEMP_C: value }));
    const num = Number(value);
    if (value !== '' && (isNaN(num) || num < 0 || num > 100)) {
      setFanTempError(t('hardware.fan_temp_out_of_range'));
    } else {
      setFanTempError('');
    }
  };

  const handleFanGpioChange = (value) => {
    setFormData((prev) => ({ ...prev, conf_FAN_GPIO_PIN: value }));
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

  return (
    <Stack spacing={3}>
      <Box>
        <TextField
          label={t('hardware.fan_temp_threshold')}
          helperText={fanTempError || t('hardware.fan_temp_threshold_help')}
          error={!!fanTempError}
          type="number"
          sx={{ maxWidth: 400 }}
          value={formData.conf_FAN_PWM_TEMP_C ?? ''}
          onChange={(e) => handleFanTempChange(e.target.value)}
          inputProps={{ min: 0, max: 100 }}
        />
      </Box>
      <Box>
        <TextField
          label={t('hardware.fan_gpio_pin')}
          helperText={t('hardware.fan_gpio_pin_help')}
          type="number"
          sx={{ maxWidth: 400 }}
          value={formData.conf_FAN_GPIO_PIN ?? ''}
          onChange={(e) => handleFanGpioChange(e.target.value)}
          inputProps={{ min: 2, max: 27 }}
        />
      </Box>
    </Stack>
  );
}

export default FanConfig;
