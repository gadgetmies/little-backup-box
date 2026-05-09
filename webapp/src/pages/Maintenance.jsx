import React, { useState } from 'react';
import { Box, Tab, Tabs } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import DatabaseOperations from '../components/DatabaseOperations';
import FileOperations from '../components/FileOperations';
import SettingsOperations from '../components/SettingsOperations';

const TAB_NAMES = ['database', 'files', 'settings'];

function TabPanel({ children, value, index }) {
  return (
    <div role="tabpanel" hidden={value !== index} id={`maintenance-tabpanel-${index}`}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function Maintenance() {
  const { t } = useLanguage();
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = window.localStorage.getItem('lbb-tabs-maintenance');
    const idx = TAB_NAMES.indexOf(saved);
    return idx >= 0 ? idx : 0;
  });

  const handleTabChange = (_event, newValue) => {
    setCurrentTab(newValue);
    if (TAB_NAMES[newValue]) {
      localStorage.setItem('lbb-tabs-maintenance', TAB_NAMES[newValue]);
    }
  };

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="maintenance tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab
            label={t('maintenance.tab.database') || 'Database'}
            id="maintenance-tab-0"
            aria-controls="maintenance-tabpanel-0"
          />
          <Tab
            label={t('maintenance.tab.files') || 'Files'}
            id="maintenance-tab-1"
            aria-controls="maintenance-tabpanel-1"
          />
          <Tab
            label={t('maintenance.tab.settings') || 'Settings'}
            id="maintenance-tab-2"
            aria-controls="maintenance-tabpanel-2"
          />
        </Tabs>
      </Box>

      <TabPanel value={currentTab} index={0}>
        <DatabaseOperations />
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        <FileOperations />
      </TabPanel>
      <TabPanel value={currentTab} index={2}>
        <SettingsOperations />
      </TabPanel>
    </Box>
  );
}

export default Maintenance;
