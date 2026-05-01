import React, { useEffect, useState } from 'react';
import { Alert, Box, Stack, TextField } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';

function FanConfig() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [fanTempValue, setFanTempValue] = useState('');
  const [fanGpioValue, setFanGpioValue] = useState('');
  const [fanTempError, setFanTempError] = useState('');
  const [fanGpioError, setFanGpioError] = useState('');

  useEffect(() => {
    if (!config) return;
    if (fanTempValue === '') setFanTempValue(config.conf_FAN_PWM_TEMP_C ?? '');
    if (fanGpioValue === '') setFanGpioValue(config.conf_FAN_PWM_GPIO ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const handleFanTempChange = (value) => {
    setFanTempValue(value);
    const num = Number(value);
    if (value !== '' && (isNaN(num) || num < 0 || num > 100)) {
      setFanTempError(t('hardware.fan_temp_out_of_range'));
      return;
    }
    setFanTempError('');
    updateConfig({ ...config, conf_FAN_PWM_TEMP_C: value }).catch((err) => {
      const errMsg =
        err?.response?.data?.error === 'GPIO pin already in use'
          ? 'GPIO pin already in use'
          : 'Error saving fan settings';
      setFanTempError(errMsg);
    });
  };

  const handleFanGpioChange = (value) => {
    setFanGpioValue(value);
    setFanGpioError('');
    updateConfig({ ...config, conf_FAN_GPIO_PIN: value }).catch((err) => {
      const errMsg =
        err?.response?.data?.error === 'GPIO pin already in use'
          ? 'GPIO pin already in use'
          : 'Error saving fan settings';
      setFanGpioError(errMsg);
    });
  };

  return (
    <Stack spacing={3}>
      <Box>
        <TextField
          label={t('hardware.fan_temp_threshold')}
          helperText={fanTempError || t('hardware.fan_temp_threshold_help')}
          error={!!fanTempError}
          type="number"
          sx={{ maxWidth: 400 }}
          value={fanTempValue}
          onChange={(e) => handleFanTempChange(e.target.value)}
          inputProps={{ min: 0, max: 100 }}
        />
        {fanTempError && (
          <Alert severity="error" sx={{ mt: 1, maxWidth: 400 }}>
            {fanTempError}
          </Alert>
        )}
      </Box>
      <Box>
        <TextField
          label={t('hardware.fan_gpio_pin')}
          helperText={fanGpioError || t('hardware.fan_gpio_pin_help')}
          error={!!fanGpioError}
          type="number"
          sx={{ maxWidth: 400 }}
          value={fanGpioValue}
          onChange={(e) => handleFanGpioChange(e.target.value)}
          inputProps={{ min: 2, max: 27 }}
        />
        {fanGpioError && (
          <Alert severity="error" sx={{ mt: 1, maxWidth: 400 }}>
            {fanGpioError}
          </Alert>
        )}
      </Box>
    </Stack>
  );
}

export default FanConfig;
