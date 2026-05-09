import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Typography,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  TextField,
  IconButton,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import api from '../utils/api';

const FALLBACK_ACTIONS = [
  'backup_start',
  'backup_stop',
  'view_next',
  'view_prev',
  'shutdown',
  'reboot',
];

const DEFAULTS = {
  conf_MENU_ENABLED: '0',
  conf_MENU_BUTTON_ROTATE: '2',
  conf_MENU_BUTTON_BOUNCETIME: '200',
  conf_MENU_BUTTON_EDGE_DETECTION: 'RISING',
  conf_MENU_BUTTON_RESISTOR_PULL: 'DOWN',
  conf_MENU_BUTTON_COMBINATION: '[]',
};

function ButtonHardwareConfig({ onSavedStateChange }) {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [actions, setActions] = useState(FALLBACK_ACTIONS);
  const [formData, setFormData] = useState({});
  const lastSavedConfig = useRef(null);

  useEffect(() => {
    api
      .get('/config/button-actions')
      .then((res) => {
        if (res.data && Array.isArray(res.data.actions)) {
          setActions(res.data.actions);
        }
      })
      .catch(() => {
        // fall back to hard-coded list — already set as default state
      });
  }, []);

  useEffect(() => {
    if (config) {
      const initial = Object.fromEntries(
        Object.entries(DEFAULTS).map(([k, def]) => [k, config[k] ?? def]),
      );
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData(initial);
      lastSavedConfig.current = JSON.stringify(initial);
    }
  }, [config]);

  const combinations = (() => {
    try {
      const raw = formData.conf_MENU_BUTTON_COMBINATION;
      if (raw && typeof raw === 'string' && raw.startsWith('[')) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore parse errors
    }
    return [];
  })();

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const setCombinations = (newCombinations) => {
    handleChange('conf_MENU_BUTTON_COMBINATION', JSON.stringify(newCombinations));
  };

  const handleAddRow = () => {
    setCombinations([...combinations, { buttons: '', action: '' }]);
  };

  const handleDeleteRow = (index) => {
    setCombinations(combinations.filter((_, i) => i !== index));
  };

  const handleRowChange = (index, field, value) => {
    setCombinations(
      combinations.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
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
    <Box>
      <Stack spacing={3}>
        <FormControlLabel
          control={
            <Checkbox
              checked={formData.conf_MENU_ENABLED === '1' || formData.conf_MENU_ENABLED === true}
              onChange={(e) => handleChange('conf_MENU_ENABLED', e.target.checked ? '1' : '0')}
            />
          }
          label={t('hardware.button_enabled')}
        />

        <FormControl sx={{ maxWidth: 400 }}>
          <InputLabel>{t('hardware.button_rotation')}</InputLabel>
          <Select
            value={formData.conf_MENU_BUTTON_ROTATE || '2'}
            onChange={(e) => handleChange('conf_MENU_BUTTON_ROTATE', e.target.value)}
            label={t('hardware.button_rotation')}
          >
            <MenuItem value="2">0°</MenuItem>
            <MenuItem value="0">180°</MenuItem>
          </Select>
        </FormControl>

        <TextField
          label={t('hardware.button_bouncetime')}
          helperText="ms"
          type="number"
          sx={{ maxWidth: 400 }}
          value={formData.conf_MENU_BUTTON_BOUNCETIME || '200'}
          onChange={(e) => handleChange('conf_MENU_BUTTON_BOUNCETIME', e.target.value)}
          inputProps={{ min: 0 }}
        />

        <FormControl sx={{ maxWidth: 400 }}>
          <InputLabel>{t('hardware.button_edge')}</InputLabel>
          <Select
            value={formData.conf_MENU_BUTTON_EDGE_DETECTION || 'RISING'}
            onChange={(e) => handleChange('conf_MENU_BUTTON_EDGE_DETECTION', e.target.value)}
            label={t('hardware.button_edge')}
          >
            <MenuItem value="RISING">{t('hardware.button_edge_rising')}</MenuItem>
            <MenuItem value="FALLING">{t('hardware.button_edge_falling')}</MenuItem>
            <MenuItem value="BOTH">{t('hardware.button_edge_both')}</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ maxWidth: 400 }}>
          <InputLabel>{t('hardware.button_pull')}</InputLabel>
          <Select
            value={formData.conf_MENU_BUTTON_RESISTOR_PULL || 'DOWN'}
            onChange={(e) => handleChange('conf_MENU_BUTTON_RESISTOR_PULL', e.target.value)}
            label={t('hardware.button_pull')}
          >
            <MenuItem value="UP">{t('hardware.button_pull_up')}</MenuItem>
            <MenuItem value="DOWN">{t('hardware.button_pull_down')}</MenuItem>
          </Select>
        </FormControl>

        <Box>
          <Typography variant="subtitle1" gutterBottom>
            {t('hardware.button_combinations')}
          </Typography>
          <Table size="small" sx={{ mb: 1 }}>
            <TableHead>
              <TableRow>
                <TableCell>{t('hardware.button_combinations')}</TableCell>
                <TableCell>{t('hardware.button_action')}</TableCell>
                <TableCell sx={{ width: 48 }} />
              </TableRow>
            </TableHead>
            <TableBody data-testid="combinations-table-body">
              {combinations.map((row, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <TextField
                      size="small"
                      value={row.buttons || ''}
                      onChange={(e) => handleRowChange(index, 'buttons', e.target.value)}
                      placeholder="e.g. 17,27"
                      fullWidth
                    />
                  </TableCell>
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={row.action || ''}
                        onChange={(e) => handleRowChange(index, 'action', e.target.value)}
                        displayEmpty
                      >
                        <MenuItem value="">
                          <em>—</em>
                        </MenuItem>
                        {actions.map((a) => (
                          <MenuItem key={a} value={a}>
                            {a}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteRow(index)}
                      aria-label="delete row"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button variant="outlined" size="small" onClick={handleAddRow}>
            {t('hardware.button_add_combination')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

export default ButtonHardwareConfig;
