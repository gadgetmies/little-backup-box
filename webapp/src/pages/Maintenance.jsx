import React from 'react';
import { Stack } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import PageSection from '../components/PageSection';
import DatabaseOperations from '../components/DatabaseOperations';
import FileOperations from '../components/FileOperations';
import SettingsOperations from '../components/SettingsOperations';

function Maintenance() {
  const { t } = useLanguage();

  return (
    <Stack spacing={3}>
      <PageSection
        variant="accordion"
        title={t('maintenance.database.section') || 'Database operations'}
        localStorageKey="lbb-accordion-maintenance-database"
        legacyLocalStorageKey="accordion-database-operations"
      >
        <DatabaseOperations />
      </PageSection>

      <PageSection
        variant="accordion"
        title={t('main.file_operations') || 'File operations'}
        localStorageKey="lbb-accordion-maintenance-files"
        legacyLocalStorageKey="accordion-file-operations"
      >
        <FileOperations />
      </PageSection>

      <PageSection
        variant="accordion"
        title={t('config.save_settings_section') || 'Settings backup'}
        localStorageKey="lbb-accordion-maintenance-settings"
      >
        <SettingsOperations />
      </PageSection>
    </Stack>
  );
}

export default Maintenance;
