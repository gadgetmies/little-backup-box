import React, { useState } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import ProtectedCommandDialog from './ProtectedCommandDialog';

// cmd.php:115-121, 309-313 — password protected, runs in the background
// into the command log, optional mail result.
function LibRawUpdater() {
  const { t } = useLanguage();
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <Box>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {t('maintenance.libraw_description')}
      </Typography>
      <Alert severity="warning" sx={{ mb: 2 }}>
        {t('maintenance.libraw_warning')}
      </Alert>

      <Button
        variant="contained"
        color="error"
        startIcon={<WarningAmberIcon />}
        onClick={() => setDialogOpen(true)}
        sx={{ minHeight: 44 }}
      >
        {t('maintenance.libraw_button')}
      </Button>

      <ProtectedCommandDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={t('cmd.libraw_confirm_title')}
        consequence={t('maintenance.libraw_warning')}
        actionLabel={t('maintenance.libraw_button')}
        onConfirm={(body) => api.post('/setup/update/libraw', body)}
      />
    </Box>
  );
}

export default LibRawUpdater;
