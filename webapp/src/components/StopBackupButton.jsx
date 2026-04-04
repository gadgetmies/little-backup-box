import React from 'react';
import { Button } from '@mui/material';
import StopIcon from '@mui/icons-material/Stop';
import { useLanguage } from '../contexts/LanguageContext';

const StopBackupButton = ({ onClick, disabled, fullWidth = false, size = 'large' }) => {
  const { t } = useLanguage();

  return (
    <Button
      variant="contained"
      color="error"
      size={size}
      fullWidth={fullWidth}
      startIcon={<StopIcon />}
      onClick={onClick}
      disabled={disabled}
      sx={{
        fontWeight: 'bold',
        px: 4,
        py: 1.5,
        '&:hover': {
          backgroundColor: 'error.dark',
        },
      }}
    >
      {t('main.stopbackup_button') || 'Stop Backup'}
    </Button>
  );
};

export default StopBackupButton;
