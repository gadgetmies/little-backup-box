import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Slider,
  Select,
  MenuItem,
  FormControl,
  FormLabel,
  IconButton,
  Collapse,
  Stack,
  TextField,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useLanguage } from '../contexts/LanguageContext';
import { MOCK_FAILURE_MODES } from '../utils/mockFailures';

const STORAGE_KEY = 'lbb-mock-controls';

const DEFAULT_DISPLAY_STATUS = { mode: 'ready', custom: '' };

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { delay: 0, failureMode: '', displayStatus: { ...DEFAULT_DISPLAY_STATUS } };
    const parsed = JSON.parse(raw);
    const ds = parsed.displayStatus || {};
    return {
      delay: typeof parsed.delay === 'number' ? parsed.delay : 0,
      failureMode: parsed.failureMode || '',
      displayStatus: {
        mode: ['ready', 'info', 'custom'].includes(ds.mode) ? ds.mode : 'ready',
        custom: typeof ds.custom === 'string' ? ds.custom : '',
      },
    };
  } catch {
    return { delay: 0, failureMode: '', displayStatus: { ...DEFAULT_DISPLAY_STATUS } };
  }
}

function MockControls() {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const handleDelayChange = (_event, value) => {
    setSettings((prev) => ({ ...prev, delay: value }));
  };

  const handleFailureModeChange = (event) => {
    setSettings((prev) => ({ ...prev, failureMode: event.target.value }));
  };

  const handleDisplayStatusModeChange = (event) => {
    setSettings((prev) => ({
      ...prev,
      displayStatus: { ...prev.displayStatus, mode: event.target.value },
    }));
  };

  const handleDisplayStatusCustomChange = (event) => {
    setSettings((prev) => ({
      ...prev,
      displayStatus: { ...prev.displayStatus, custom: event.target.value },
    }));
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
      }}
    >
      <Paper elevation={4} sx={{ minWidth: 220 }}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 2,
            py: 1,
          }}
        >
          <Typography variant="caption" fontWeight="bold">
            {t('mock_controls.title')}
          </Typography>
          <IconButton
            size="small"
            onClick={() => setExpanded((prev) => !prev)}
            aria-label={expanded ? 'collapse mock controls' : 'expand mock controls'}
          >
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
        </Box>
        <Collapse in={expanded}>
          <Stack spacing={2} sx={{ px: 2, pb: 2 }}>
            <FormControl fullWidth size="small">
              <FormLabel sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                {t('mock_controls.delay')} ({settings.delay}ms)
              </FormLabel>
              <Slider
                value={settings.delay}
                onChange={handleDelayChange}
                min={0}
                max={5000}
                step={100}
                valueLabelDisplay="auto"
                size="small"
                aria-label="mock delay"
              />
            </FormControl>
            <FormControl fullWidth size="small">
              <FormLabel sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                {t('mock_controls.failure_mode')}
              </FormLabel>
              <Select
                value={settings.failureMode}
                onChange={handleFailureModeChange}
                displayEmpty
              >
                <MenuItem value="">{t('mock_controls.failure_none')}</MenuItem>
                {Object.entries(MOCK_FAILURE_MODES).map(([key, label]) => (
                  <MenuItem key={key} value={key}>
                    {label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <FormLabel sx={{ mb: 0.5, fontSize: '0.75rem' }}>
                {t('mock_controls.display_status')}
              </FormLabel>
              <Select
                value={settings.displayStatus.mode}
                onChange={handleDisplayStatusModeChange}
              >
                <MenuItem value="ready">{t('mock_controls.display_status_ready')}</MenuItem>
                <MenuItem value="info">{t('mock_controls.display_status_info')}</MenuItem>
                <MenuItem value="custom">{t('mock_controls.display_status_custom')}</MenuItem>
              </Select>
              {settings.displayStatus.mode === 'custom' && (
                <TextField
                  size="small"
                  value={settings.displayStatus.custom}
                  onChange={handleDisplayStatusCustomChange}
                  placeholder="Status text"
                  sx={{ mt: 1 }}
                />
              )}
            </FormControl>
          </Stack>
        </Collapse>
      </Paper>
    </Box>
  );
}

// Only render when VITE_USE_MOCK_API is true
export default function MockControlsWrapper() {
  if (import.meta.env.VITE_USE_MOCK_API !== 'true') {
    return null;
  }
  return <MockControls />;
}
