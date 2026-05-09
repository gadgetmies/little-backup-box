import React, { useCallback, useState } from 'react';
import { Alert, Box, Snackbar, Tab, Tabs } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import { useDrawer } from '../contexts/DrawerContext';
import { drawerWidth, drawerCollapsedWidth } from '../components/Menu';
import DisplayConfig from '../components/DisplayConfig';
import ButtonHardwareConfig from '../components/ButtonHardwareConfig';
import FanConfig from '../components/FanConfig';
import PageSaveBar from '../components/PageSaveBar';

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
  const { desktopOpen } = useDrawer();
  const currentDrawerWidth = desktopOpen ? drawerWidth : drawerCollapsedWidth;
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = window.localStorage.getItem('lbb-tabs-hardware');
    const idx = TAB_NAMES.indexOf(saved);
    return idx >= 0 ? idx : 0;
  });
  const [displayState, setDisplayState] = useState({ isSaved: true, save: null });
  const [buttonsState, setButtonsState] = useState({ isSaved: true, save: null });
  const [fanState, setFanState] = useState({ isSaved: true, save: null });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleTabChange = (_event, newValue) => {
    setCurrentTab(newValue);
    if (TAB_NAMES[newValue]) {
      localStorage.setItem('lbb-tabs-hardware', TAB_NAMES[newValue]);
    }
  };

  const handleDisplayState = useCallback((isSaved, save) => {
    setDisplayState({ isSaved, save });
  }, []);
  const handleButtonsState = useCallback((isSaved, save) => {
    setButtonsState({ isSaved, save });
  }, []);
  const handleFanState = useCallback((isSaved, save) => {
    setFanState({ isSaved, save });
  }, []);

  const isAnyDirty = !displayState.isSaved || !buttonsState.isSaved || !fanState.isSaved;

  const handleSavePage = async () => {
    setIsSaving(true);
    const dirty = [
      ['Display', displayState],
      ['Buttons', buttonsState],
      ['Fan', fanState],
    ].filter(([, s]) => !s.isSaved && s.save);
    const results = await Promise.allSettled(dirty.map(([, s]) => s.save()));
    const failures = results
      .map((r, i) => (r.status === 'rejected' ? `${dirty[i][0]}: ${r.reason?.message || 'error'}` : null))
      .filter(Boolean);
    if (failures.length === 0) {
      setMessage(t('config.message_settings_saved') || 'Settings saved');
    } else {
      setMessage(`${t('config.save_partial_error') || 'Some settings failed to save'}: ${failures.join('; ')}`);
    }
    setIsSaving(false);
  };

  return (
    <Box sx={{ pb: 10 }}>
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
        <DisplayConfig onSavedStateChange={handleDisplayState} />
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        <ButtonHardwareConfig onSavedStateChange={handleButtonsState} />
      </TabPanel>
      <TabPanel value={currentTab} index={2}>
        <FanConfig onSavedStateChange={handleFanState} />
      </TabPanel>

      <PageSaveBar
        isDirty={isAnyDirty}
        isSaving={isSaving}
        onSave={handleSavePage}
        drawerWidth={currentDrawerWidth}
      />

      <Snackbar
        open={!!message}
        autoHideDuration={3000}
        onClose={() => setMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setMessage('')}
          severity={message.includes('Error') || message.includes('failed') ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Hardware;
