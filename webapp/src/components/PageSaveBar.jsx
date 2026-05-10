import React from 'react';
import { Box, Button, CircularProgress, Stack } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useLanguage } from '../contexts/LanguageContext';

function PageSaveBar({ isDirty, isSaving, onSave, drawerWidth = 0, secondaryAction = null, label }) {
  const { t } = useLanguage();
  const buttonLabel = label || t('config.save_button') || 'Save';

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: { xs: 0, md: `${drawerWidth}px` },
        right: 0,
        zIndex: 1000,
        p: 2,
        backgroundColor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
        transition: (theme) =>
          theme.transitions.create('left', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
      }}
    >
      <Stack direction="row" spacing={2} justifyContent="center">
        <Button
          variant="contained"
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
          onClick={onSave}
          disabled={!isDirty || isSaving}
          size="large"
        >
          {buttonLabel}
        </Button>
        {secondaryAction}
      </Stack>
    </Box>
  );
}

export default PageSaveBar;
