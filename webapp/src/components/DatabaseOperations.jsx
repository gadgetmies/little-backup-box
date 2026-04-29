import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Typography,
  Button,
  Stack,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Snackbar,
  Box,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import api from '../utils/api';
import useAsyncAction from '../hooks/useAsyncAction';

// Fetch helpers defined outside the component to avoid hook-ordering lint issues
async function fetchPartitions() {
  const response = await api.get('/backup/partitions');
  return response.data?.partitions || [];
}

async function fetchNVMeAvailable() {
  const response = await api.get('/backup/services');
  return response.data?.nvmeAvailable || false;
}

function DatabaseOperations() {
  const { t } = useLanguage();
  const { constants: _constants } = useConfig();
  const [partitions, setPartitions] = useState([]);
  const [target, setTarget] = useState('usb');
  const [presetSource, setPresetSource] = useState('');
  const [presetTarget, setPresetTarget] = useState('');
  const [powerOff, setPowerOff] = useState(false);
  const [nvmeAvailable, setNvmeAvailable] = useState(false);
  const [accordionExpanded, setAccordionExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('accordion-database-operations');
      return saved !== null ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });
  const [toastMessage, setToastMessage] = useState('');

  // Keep a ref to current form values so async callbacks always see fresh state
  const formRef = useRef({ target, presetSource, presetTarget, powerOff });

  useEffect(() => {
    formRef.current = { target, presetSource, presetTarget, powerOff };
  }, [target, presetSource, presetTarget, powerOff]);

  useEffect(() => {
    fetchPartitions()
      .then(setPartitions)
      .catch((err) => console.error('Failed to load partitions:', err));
    fetchNVMeAvailable()
      .then(setNvmeAvailable)
      .catch((err) => console.error('Failed to check NVMe:', err));
  }, []);

  const callGenerateThumbnails = useCallback(async () => {
    const { target: tgt, presetSource: ps, presetTarget: pt, powerOff: po } = formRef.current;
    return api.post('/backup/function', {
      function: 'generate_thumbnails',
      target: tgt,
      presetSource: ps,
      presetTarget: pt,
      powerOff: po,
    });
  }, []);

  const callSyncDatabase = useCallback(async () => {
    const { target: tgt, presetSource: ps, presetTarget: pt, powerOff: po } = formRef.current;
    return api.post('/backup/function', {
      function: 'sync',
      target: tgt,
      presetSource: ps,
      presetTarget: pt,
      powerOff: po,
    });
  }, []);

  const callUpdateExif = useCallback(async () => {
    const { target: tgt, presetSource: ps, presetTarget: pt, powerOff: po } = formRef.current;
    return api.post('/backup/function', {
      function: 'update_exif',
      target: tgt,
      presetSource: ps,
      presetTarget: pt,
      powerOff: po,
    });
  }, []);

  const generateThumbnails = useAsyncAction(callGenerateThumbnails);
  const syncDatabase = useAsyncAction(callSyncDatabase);
  const updateExif = useAsyncAction(callUpdateExif);

  const anyExecuting =
    generateThumbnails.isExecuting || syncDatabase.isExecuting || updateExif.isExecuting;

  const handleAccordionChange = (_event, isExpanded) => {
    setAccordionExpanded(isExpanded);
    localStorage.setItem('accordion-database-operations', JSON.stringify(isExpanded));
  };

  const handleAction = async (action) => {
    try {
      const response = await action.execute();
      if (response?.data?.warnings?.length) {
        setToastMessage(t('maintenance.database.partial_success'));
      } else {
        setToastMessage(t('maintenance.database.success'));
      }
    } catch {
      // error is displayed inline via action.error
    }
  };

  const getTargetLabel = (targetType) => {
    const labels = {
      usb: t('box.backup.mode.usb') || 'USB storage',
      internal: t('box.backup.mode.internal') || 'Int. storage',
      nvme: t('box.backup.mode.nvme') || 'NVMe SSD',
    };
    return labels[targetType] || targetType;
  };

  return (
    <Accordion expanded={accordionExpanded} onChange={handleAccordionChange}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="h5">
          {t('maintenance.database.section') || 'Database Operations'}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Stack spacing={3}>
          <FormControl sx={{ maxWidth: 400 }}>
            <FormLabel>{t('maintenance.database.target') || 'Target Storage'}</FormLabel>
            <Select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={anyExecuting}
            >
              <MenuItem value="usb">{getTargetLabel('usb')}</MenuItem>
              <MenuItem value="internal">{getTargetLabel('internal')}</MenuItem>
              {nvmeAvailable && <MenuItem value="nvme">{getTargetLabel('nvme')}</MenuItem>}
            </Select>
          </FormControl>

          <FormControl sx={{ maxWidth: 400 }}>
            <FormLabel>{t('main.backup.preset_source_label') || 'Set source partition'}</FormLabel>
            <Select
              value={presetSource}
              onChange={(e) => setPresetSource(e.target.value)}
              disabled={anyExecuting}
            >
              <MenuItem value="">
                {t('main.backup.preset_partition_auto') || 'automatic selection'}
              </MenuItem>
              {partitions.map((p, i) => (
                <MenuItem key={i} value={p.identifier}>
                  {p.lum} {p.identifier ? `(${p.identifier})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ maxWidth: 400 }}>
            <FormLabel>{t('main.backup.preset_target_label') || 'Set target partition'}</FormLabel>
            <Select
              value={presetTarget}
              onChange={(e) => setPresetTarget(e.target.value)}
              disabled={anyExecuting}
            >
              <MenuItem value="">
                {t('main.backup.preset_partition_auto') || 'automatic selection'}
              </MenuItem>
              {partitions.map((p, i) => (
                <MenuItem key={i} value={p.identifier}>
                  {p.lum} {p.identifier ? `(${p.identifier})` : ''}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Checkbox
                checked={powerOff}
                onChange={(e) => setPowerOff(e.target.checked)}
                disabled={anyExecuting}
              />
            }
            label={t('main.backup.power_off_checkbox_label') || 'Turn off after run'}
          />

          <Box>
            <Stack direction="row" spacing={2} flexWrap="wrap">
              <Box>
                <Button
                  variant="outlined"
                  onClick={() => handleAction(generateThumbnails)}
                  disabled={generateThumbnails.isExecuting}
                  startIcon={
                    generateThumbnails.showSpinner ? <CircularProgress size={18} /> : null
                  }
                >
                  {t('maintenance.database.generate_thumbnails')}
                </Button>
                {generateThumbnails.error && (
                  <Alert
                    severity="error"
                    onClose={generateThumbnails.clearError}
                    sx={{ mt: 1 }}
                  >
                    {generateThumbnails.error}
                  </Alert>
                )}
              </Box>

              <Box>
                <Button
                  variant="outlined"
                  onClick={() => handleAction(syncDatabase)}
                  disabled={syncDatabase.isExecuting}
                  startIcon={syncDatabase.showSpinner ? <CircularProgress size={18} /> : null}
                >
                  {t('maintenance.database.sync')}
                </Button>
                {syncDatabase.error && (
                  <Alert severity="error" onClose={syncDatabase.clearError} sx={{ mt: 1 }}>
                    {syncDatabase.error}
                  </Alert>
                )}
              </Box>

              <Box>
                <Button
                  variant="outlined"
                  onClick={() => handleAction(updateExif)}
                  disabled={updateExif.isExecuting}
                  startIcon={updateExif.showSpinner ? <CircularProgress size={18} /> : null}
                >
                  {t('maintenance.database.update_exif')}
                </Button>
                {updateExif.error && (
                  <Alert severity="error" onClose={updateExif.clearError} sx={{ mt: 1 }}>
                    {updateExif.error}
                  </Alert>
                )}
              </Box>
            </Stack>
          </Box>
        </Stack>

        <Snackbar
          open={!!toastMessage}
          autoHideDuration={4000}
          onClose={() => setToastMessage('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={() => setToastMessage('')}
            severity="success"
            sx={{ width: '100%' }}
          >
            {toastMessage}
          </Alert>
        </Snackbar>
      </AccordionDetails>
    </Accordion>
  );
}

export default DatabaseOperations;
