import React, { useState, useEffect, useMemo } from 'react';
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
  Alert,
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

function ButtonHardwareConfig() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const [actions, setActions] = useState(FALLBACK_ACTIONS);
  const [localCombinations, setLocalCombinations] = useState(null);
  const [message, setMessage] = useState('');

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

  // Derive combinations from config unless the user has made local edits
  const combinations = useMemo(() => {
    if (localCombinations !== null) return localCombinations;
    try {
      const raw = config?.conf_MENU_BUTTON_COMBINATION;
      if (raw && typeof raw === 'string' && raw.startsWith('[')) {
        return JSON.parse(raw);
      }
    } catch {
      // ignore parse errors
    }
    return [];
  }, [config, localCombinations]);

  const handleChange = (key, value) => {
    updateConfig({ ...config, [key]: value }).catch((err) => {
      console.error('Failed to save button config:', err);
      setMessage('Error saving button settings');
      setTimeout(() => setMessage(''), 3000);
    });
  };

  const saveCombinations = (newCombinations) => {
    setLocalCombinations(newCombinations);
    handleChange('conf_MENU_BUTTON_COMBINATION', JSON.stringify(newCombinations));
  };

  const handleAddRow = () => {
    saveCombinations([...combinations, { buttons: '', action: '' }]);
  };

  const handleDeleteRow = (index) => {
    const updated = combinations.filter((_, i) => i !== index);
    saveCombinations(updated);
  };

  const handleRowChange = (index, field, value) => {
    const updated = combinations.map((row, i) =>
      i === index ? { ...row, [field]: value } : row,
    );
    saveCombinations(updated);
  };

  return (
    <Box>
      {message && (
        <Alert
          severity={message.includes('Error') ? 'error' : 'success'}
          sx={{ mb: 2 }}
          onClose={() => setMessage('')}
        >
          {message}
        </Alert>
      )}

      <Stack spacing={3}>
        <FormControlLabel
          control={
            <Checkbox
              checked={config?.conf_MENU_ENABLED === '1' || config?.conf_MENU_ENABLED === true}
              onChange={(e) => handleChange('conf_MENU_ENABLED', e.target.checked ? '1' : '0')}
            />
          }
          label={t('hardware.button_enabled')}
        />

        <FormControl sx={{ maxWidth: 400 }}>
          <InputLabel>{t('hardware.button_rotation')}</InputLabel>
          <Select
            value={config?.conf_MENU_BUTTON_ROTATE || '2'}
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
          value={config?.conf_MENU_BUTTON_BOUNCETIME || '200'}
          onChange={(e) => handleChange('conf_MENU_BUTTON_BOUNCETIME', e.target.value)}
          inputProps={{ min: 0 }}
        />

        <FormControl sx={{ maxWidth: 400 }}>
          <InputLabel>{t('hardware.button_edge')}</InputLabel>
          <Select
            value={config?.conf_MENU_BUTTON_EDGE_DETECTION || 'RISING'}
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
            value={config?.conf_MENU_BUTTON_RESISTOR_PULL || 'DOWN'}
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
