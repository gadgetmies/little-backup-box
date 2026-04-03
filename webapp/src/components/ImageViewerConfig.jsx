import React from 'react';
import {
  Box,
  Typography,
  Stack,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';

function ImageViewerConfig({ formData, onChange }) {
  const { t } = useLanguage();

  const handleCheckboxChange = (key) => (event) => {
    onChange(key, event.target.checked ? '1' : '0');
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        {t('config.imageviewer.section') || 'Image viewer View'}
      </Typography>
      <Stack spacing={3} sx={{ mt: 2 }}>
        {/* Generate Thumbnails */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {t('config.backup.generate_thumbnails_header') || 'Thumbnails'}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.conf_BACKUP_GENERATE_THUMBNAILS === '1' || formData.conf_BACKUP_GENERATE_THUMBNAILS === true}
                onChange={handleCheckboxChange('conf_BACKUP_GENERATE_THUMBNAILS')}
              />
            }
            label={t('config.backup.generate_thumbnails_label') || 'Create thumbnails for View after backup? (Local storages only)'}
          />
        </Box>

        {/* Convert HEIC */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {t('config.imageviewer.convert_heic_header') || 'Convert heic images to jpeg'}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.conf_VIEW_CONVERT_HEIC === '1' || formData.conf_VIEW_CONVERT_HEIC === true}
                onChange={handleCheckboxChange('conf_VIEW_CONVERT_HEIC')}
              />
            }
            label={t('config.imageviewer.convert_heic_label') || 'Create jpeg images from heic (heif) format images'}
          />
        </Box>

        {/* Update EXIF */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {t('config.backup.update_exif_header') || 'Automatically adjust EXIF data of media files on import'}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.conf_BACKUP_UPDATE_EXIF === '1' || formData.conf_BACKUP_UPDATE_EXIF === true}
                onChange={handleCheckboxChange('conf_BACKUP_UPDATE_EXIF')}
              />
            }
            label={t('config.backup.update_exif_label') || 'Adjust EXIF ​​data during import'}
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
            {t('config.backup.update_exif_desc')}
          </Typography>
        </Box>

        {/* Write Rating EXIF */}
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            {t('config.imageviewer.write_rating_exif_header') || 'Write changed ratings to original files immediately'}
          </Typography>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.conf_VIEW_WRITE_RATING_EXIF === '1' || formData.conf_VIEW_WRITE_RATING_EXIF === true}
                onChange={handleCheckboxChange('conf_VIEW_WRITE_RATING_EXIF')}
              />
            }
            label={t('config.imageviewer.write_rating_exif_label') || 'Write the reviews directly into the file'}
          />
          <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
            {t('config.imageviewer.write_rating_exif_desc')}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}

export default ImageViewerConfig;
