import React from 'react';
import { Stack } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import PageSection from '../components/PageSection';
import DisplayConfig from '../components/DisplayConfig';
import ButtonHardwareConfig from '../components/ButtonHardwareConfig';
import FanConfig from '../components/FanConfig';

function Hardware() {
  const { t } = useLanguage();

  return (
    <Stack spacing={3}>
      <PageSection variant="card" title={t('config.display.section') || 'Display'}>
        <DisplayConfig />
      </PageSection>

      <PageSection variant="card" title={t('hardware.button_section') || 'Buttons'}>
        <ButtonHardwareConfig />
      </PageSection>

      <PageSection variant="card" title={t('hardware.fan_section') || 'Fan'}>
        <FanConfig />
      </PageSection>
    </Stack>
  );
}

export default Hardware;
