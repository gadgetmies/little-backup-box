import React from 'react';
import {
  Box,
  Typography,
  Stack,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';

function BackupConfig({ formData, onChange }) {
  const { t } = useLanguage();

  const handleCheckboxChange = (key) => (event) => {
    onChange(key, event.target.checked ? '1' : '0');
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('config.backup.general_settings_header') || 'Defaults'}
      </Typography>
      <Stack spacing={3} sx={{ mt: 2 }}>
        {/* Checksum */}
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.conf_BACKUP_CHECKSUM === '1' || formData.conf_BACKUP_CHECKSUM === true}
                onChange={handleCheckboxChange('conf_BACKUP_CHECKSUM')}
              />
            }
            label={t('config.backup.checksum.header') || 'Compare checksum?'}
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mb: 1 }}>
            {t('config.backup.checksum.label')}
          </Typography>
          {(formData.conf_BACKUP_CHECKSUM === '1' || formData.conf_BACKUP_CHECKSUM === true) && (
            <Alert severity="warning" sx={{ ml: 4, mt: 1 }}>
              {t('config.backup.checksum.warning')}
            </Alert>
          )}
        </Box>

        {/* Move Files */}
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.conf_BACKUP_MOVE_FILES === '1' || formData.conf_BACKUP_MOVE_FILES === true}
                onChange={handleCheckboxChange('conf_BACKUP_MOVE_FILES')}
              />
            }
            label={t('config.backup.move_files_label') || 'Move files instead of copying them?'}
          />
        </Box>

        {/* Rename Files */}
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.conf_BACKUP_RENAME_FILES === '1' || formData.conf_BACKUP_RENAME_FILES === true}
                onChange={handleCheckboxChange('conf_BACKUP_RENAME_FILES')}
              />
            }
            label={t('config.backup.rename.header') || 'Rename files'}
          />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ ml: 4, mb: 1 }}
            dangerouslySetInnerHTML={{ __html: t('config.backup.rename.desc') }}
          />
          {(formData.conf_BACKUP_RENAME_FILES === '1' || formData.conf_BACKUP_RENAME_FILES === true) && (
            <Alert severity="warning" sx={{ ml: 4, mt: 1 }}>
              {t('config.backup.rename.warning')}
            </Alert>
          )}
        </Box>

        {/* Power Off */}
        <Box>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.conf_POWER_OFF === '1' || formData.conf_POWER_OFF === true}
                onChange={handleCheckboxChange('conf_POWER_OFF')}
              />
            }
            label={t('config.backup.power_off_label') || 'Power down after backup'}
          />
        </Box>
      </Stack>
    </Box>
  );
}

export default BackupConfig;
