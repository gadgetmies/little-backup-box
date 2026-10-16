import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box, FormControl, FormHelperText, InputLabel, MenuItem, Select, Stack, TextField } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';

// GPIO pins offered by scripts/setup.php:1822 ('-' = fan control off).
const FAN_GPIO_OPTIONS = ['-', '14', '15', '18', '23', '24'];

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
      conf_FAN_PWM_GPIO: config.conf_FAN_PWM_GPIO ?? '-',
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
    setFormData((prev) => ({ ...prev, conf_FAN_PWM_GPIO: value }));
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
        <FormControl sx={{ minWidth: 200, maxWidth: 400 }}>
          <InputLabel id="fan-gpio-label">{t('hardware.fan_gpio_pin')}</InputLabel>
          <Select
            labelId="fan-gpio-label"
            label={t('hardware.fan_gpio_pin')}
            value={formData.conf_FAN_PWM_GPIO ?? '-'}
            onChange={(e) => handleFanGpioChange(e.target.value)}
          >
            {[
              ...FAN_GPIO_OPTIONS,
              ...(formData.conf_FAN_PWM_GPIO && !FAN_GPIO_OPTIONS.includes(formData.conf_FAN_PWM_GPIO)
                ? [formData.conf_FAN_PWM_GPIO]
                : []),
            ].map((pin) => (
              <MenuItem key={pin} value={pin}>
                {pin === '-' ? t('config.fan_gpio_off') : `GPIO ${pin}`}
              </MenuItem>
            ))}
          </Select>
          <FormHelperText>{t('hardware.fan_gpio_pin_help')}</FormHelperText>
        </FormControl>
      </Box>
    </Stack>
  );
}

export default FanConfig;
