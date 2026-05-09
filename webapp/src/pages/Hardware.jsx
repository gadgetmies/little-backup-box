import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import DisplayConfig from '../components/DisplayConfig';
import ButtonHardwareConfig from '../components/ButtonHardwareConfig';
import FanConfig from '../components/FanConfig';

const TAB_NAMES = ['display', 'buttons', 'fan'];

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`hardware-tabpanel-${index}`}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function Hardware() {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = window.localStorage.getItem('lbb-tabs-hardware');
    const idx = TAB_NAMES.indexOf(saved);
    return idx >= 0 ? idx : 0;
  });

  const handleTabChange = (_event, newValue) => {
    setCurrentTab(newValue);
    if (TAB_NAMES[newValue]) {
      localStorage.setItem('lbb-tabs-hardware', TAB_NAMES[newValue]);
    }
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="hardware tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab
            label={t('hardware.tab.display') || 'Display'}
            id="hardware-tab-0"
            aria-controls="hardware-tabpanel-0"
          />
          <Tab
            label={t('hardware.tab.buttons') || 'Buttons'}
            id="hardware-tab-1"
            aria-controls="hardware-tabpanel-1"
          />
          <Tab
            label={t('hardware.tab.fan') || 'Fan'}
            id="hardware-tab-2"
            aria-controls="hardware-tabpanel-2"
          />
        </Tabs>
      </Box>

      <TabPanel value={currentTab} index={0}>
        <DisplayConfig />
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        <ButtonHardwareConfig />
      </TabPanel>
      <TabPanel value={currentTab} index={2}>
        <FanConfig />
      </TabPanel>
    </Box>
  );
}

export default Hardware;
