import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  Button,
  Stack,
  Alert,
  CircularProgress,
  Snackbar,
  Box,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import useAsyncAction from '../hooks/useAsyncAction';
import BackupTargetSelector from './BackupTargetSelector';

function DatabaseOperations() {
  const { t } = useLanguage();
  const [form, setForm] = useState({
    target: 'usb',
    presetSource: '',
    presetTarget: '',
    powerOff: false,
  });
  const [toastMessage, setToastMessage] = useState('');

  // Keep a ref to current form values so async callbacks always see fresh state
  const formRef = useRef(form);
  useEffect(() => {
    formRef.current = form;
  }, [form]);

  const callGenerateThumbnails = useCallback(async () => {
    const f = formRef.current;
    return api.post('/backup/function', {
      function: 'generate_thumbnails',
      target: f.target,
      presetSource: f.presetSource,
      presetTarget: f.presetTarget,
      powerOff: f.powerOff,
    });
  }, []);

  const callSyncDatabase = useCallback(async () => {
    const f = formRef.current;
    return api.post('/backup/function', {
      function: 'sync',
      target: f.target,
      presetSource: f.presetSource,
      presetTarget: f.presetTarget,
      powerOff: f.powerOff,
    });
  }, []);

  const callUpdateExif = useCallback(async () => {
    const f = formRef.current;
    return api.post('/backup/function', {
      function: 'update_exif',
      target: f.target,
      presetSource: f.presetSource,
      presetTarget: f.presetTarget,
      powerOff: f.powerOff,
    });
  }, []);

  const generateThumbnails = useAsyncAction(callGenerateThumbnails);
  const syncDatabase = useAsyncAction(callSyncDatabase);
  const updateExif = useAsyncAction(callUpdateExif);

  const anyExecuting =
    generateThumbnails.isExecuting || syncDatabase.isExecuting || updateExif.isExecuting;

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

  return (
    <Stack spacing={3}>
      <BackupTargetSelector value={form} onChange={setForm} disabled={anyExecuting} />

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

      <Snackbar
        open={!!toastMessage}
        autoHideDuration={4000}
        onClose={() => setToastMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setToastMessage('')} severity="success" sx={{ width: '100%' }}>
          {toastMessage}
        </Alert>
      </Snackbar>
    </Stack>
  );
}

export default DatabaseOperations;
