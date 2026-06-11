import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Divider,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import SpeedIcon from '@mui/icons-material/Speed';
import { useLanguage } from '../contexts/LanguageContext';
import PageSection from '../components/PageSection';

function Welcome() {
  const { t } = useLanguage();

  return (
    <Box>
      <Paper elevation={0} sx={{ p: 4, mb: 4, bgcolor: 'action.hover', borderRadius: 2 }}>
        <Typography variant="h3" component="h1" gutterBottom color="primary">
          {t('welcome.title')}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          {t('welcome.about_text')}
        </Typography>
      </Paper>

      <Stack spacing={4}>
        <PageSection
          title={t('welcome.about_title')}
          icon={<InfoIcon />}
        >
          <Typography variant="body1" paragraph>
            {t('welcome.about_text_2')}
          </Typography>
        </PageSection>

        <PageSection
          title={t('welcome.features_title')}
          icon={<SettingsIcon />}
        >
          <List sx={{ pt: 0 }}>
            <ListItem disableGutters alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                <CheckCircleOutlineIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={t('welcome.features_backup_from')}
                secondary={t('welcome.features_backup_from_list')}
              />
            </ListItem>
            <ListItem disableGutters alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                <CheckCircleOutlineIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={t('welcome.features_backup_to')}
                secondary={t('welcome.features_backup_to_list')}
              />
            </ListItem>
            <ListItem disableGutters alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                <CheckCircleOutlineIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={t('welcome.features_tools')}
                secondary={t('welcome.features_tools_list')}
              />
            </ListItem>
            <ListItem disableGutters alignItems="flex-start">
              <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                <CheckCircleOutlineIcon color="primary" fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={t('welcome.features_other')}
                secondary={t('welcome.features_other_list')}
              />
            </ListItem>
          </List>
        </PageSection>

        <Divider />

        <PageSection
          title={t('welcome.status_title')}
          icon={<SpeedIcon />}
        >
          <Typography variant="body1" paragraph>
            {t('welcome.status_text')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('welcome.status_text_2')}
          </Typography>
        </PageSection>
      </Stack>
    </Box>
  );
}

export default Welcome;
