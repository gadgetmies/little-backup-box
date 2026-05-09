import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Checkbox,
  FormControlLabel,
  Alert,
  Snackbar,
  CircularProgress,
  Stack,
  TextField,
  RadioGroup,
  Radio,
  FormLabel,
  InputAdornment,
  Tabs,
  Tab,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import EmailIcon from '@mui/icons-material/Email';
import SaveIcon from '@mui/icons-material/Save';
import ServerIcon from '@mui/icons-material/Dns';
import PortIcon from '@mui/icons-material/Numbers';
import LockIcon from '@mui/icons-material/Lock';
import PersonIcon from '@mui/icons-material/Person';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import { useDrawer } from '../contexts/DrawerContext';
import { drawerWidth, drawerCollapsedWidth } from '../components/Menu';
import api from '../utils/api';
import SocialMediaConfig from '../components/SocialMediaConfig';
import CloudConfig from '../components/CloudConfig';
import SectionHeader from '../components/SectionHeader';
import PageSaveBar from '../components/PageSaveBar';

function TabPanel({ children, value, index, ...other }) {
  const needsBottomPadding = value === index && (index === 0 || index === 1 || index === 2 || index === 3);
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`integrations-tabpanel-${index}`}
      aria-labelledby={`integrations-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3, pb: needsBottomPadding ? 10 : 0 }}>{children}</Box>}
    </div>
  );
}

function Connections() {
  const { t } = useLanguage();
  const { config, updateConfig } = useConfig();
  const { desktopOpen } = useDrawer();
  const currentDrawerWidth = desktopOpen ? drawerWidth : drawerCollapsedWidth;
  const [mailFormData, setMailFormData] = useState({});
  const [passwordError, setPasswordError] = useState('');
  const [rsyncFormData, setRsyncFormData] = useState({});
  const [rsyncPasswordError, setRsyncPasswordError] = useState('');
  const rsyncLastSavedConfig = useRef(null);
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentTab, setCurrentTab] = useState(() => {
    if (typeof window === 'undefined') return 0;
    const saved = window.localStorage.getItem('lbb-tabs-integrations');
    const map = { cloud: 0, social: 1, mail: 2 };
    return saved && map[saved] !== undefined ? map[saved] : 0;
  });
  const mailLastSavedConfig = useRef(null);
  const [mailIsSaved, setMailIsSaved] = useState(true);
  const [rsyncIsSaved, setRsyncIsSaved] = useState(true);
  const [socialMediaState, setSocialMediaState] = useState({ isSaved: true, save: null });
  const [cloudConfigState, setCloudConfigState] = useState({ isSaved: true, save: null });
  const [socialGeneralFormData, setSocialGeneralFormData] = useState({});
  const socialGeneralLastSaved = useRef(null);
  const [socialGeneralIsSaved, setSocialGeneralIsSaved] = useState(true);
  const [cloudRemotes, setCloudRemotes] = useState([]);
  const [cloudRemoteFormData, setCloudRemoteFormData] = useState({});
  const cloudRemoteLastSaved = useRef(null);
  const [cloudRemoteIsSaved, setCloudRemoteIsSaved] = useState(true);

  useEffect(() => {
    if (config) {
      const mailConfig = {
        conf_MAIL_IP: config.conf_MAIL_IP || '0',
        conf_MAIL_HTML: config.conf_MAIL_HTML || '0',
        conf_SMTP_SERVER: config.conf_SMTP_SERVER || '',
        conf_SMTP_PORT: config.conf_SMTP_PORT || '',
        conf_MAIL_SECURITY: config.conf_MAIL_SECURITY || 'STARTTLS',
        conf_MAIL_USER: config.conf_MAIL_USER || '',
        conf_MAIL_PASSWORD: config.conf_MAIL_PASSWORD && config.conf_MAIL_PASSWORD.trim() ? (() => {
          try {
            return atob(config.conf_MAIL_PASSWORD);
          } catch (e) {
            return '';
          }
        })() : '',
        conf_MAIL_FROM: config.conf_MAIL_FROM || '',
        conf_MAIL_TO: config.conf_MAIL_TO || '',
        conf_MAIL_TIMEOUT_SEC: config.conf_MAIL_TIMEOUT_SEC || '30',
      };
      setMailFormData(mailConfig);
      mailLastSavedConfig.current = JSON.stringify(mailConfig);
      setMailIsSaved(true);

      const rsyncConfig = {
        conf_RSYNC_SERVER: config.conf_RSYNC_SERVER || '',
        conf_RSYNC_PORT: config.conf_RSYNC_PORT || '',
        conf_RSYNC_USER: config.conf_RSYNC_USER || '',
        conf_RSYNC_PASSWORD: config.conf_RSYNC_PASSWORD && config.conf_RSYNC_PASSWORD.trim() ? (() => {
          try {
            return atob(config.conf_RSYNC_PASSWORD);
          } catch (e) {
            return '';
          }
        })() : '',
        conf_RSYNC_SERVER_MODULE: config.conf_RSYNC_SERVER_MODULE || '',
      };
      setRsyncFormData(rsyncConfig);
      rsyncLastSavedConfig.current = JSON.stringify(rsyncConfig);
      setRsyncIsSaved(true);

      const socialGeneralConfig = {
        conf_social_publish_date: config.conf_social_publish_date || '',
        conf_social_publish_filename: config.conf_social_publish_filename || 'false',
      };
      setSocialGeneralFormData(socialGeneralConfig);
      socialGeneralLastSaved.current = JSON.stringify(socialGeneralConfig);
    }
  }, [config]);

  // Track rsync dirty state (no autosave)
  useEffect(() => {
    if (Object.keys(rsyncFormData).length === 0) return;
    const formDataString = JSON.stringify(rsyncFormData);
    setRsyncIsSaved(rsyncLastSavedConfig.current === formDataString);
  }, [rsyncFormData]);

  // Track mail saved state
  useEffect(() => {
    if (Object.keys(mailFormData).length === 0) {
      return;
    }
    const formDataString = JSON.stringify(mailFormData);
    const isSaved = mailLastSavedConfig.current === formDataString;
    setMailIsSaved(isSaved);
  }, [mailFormData]);

  const handleCloudConfigState = useCallback((isSaved, save) => {
    setCloudConfigState({ isSaved, save });
  }, []);
  const handleSocialMediaState = useCallback((isSaved, save) => {
    setSocialMediaState({ isSaved, save });
  }, []);

  const handleSaveMail = useCallback(async () => {
    if (mailFormData.conf_MAIL_PASSWORD && !validatePassword(mailFormData.conf_MAIL_PASSWORD)) {
      throw new Error('Password validation failed');
    }
    const mailConfigToSave = {
      conf_MAIL_IP: mailFormData.conf_MAIL_IP || '0',
      conf_MAIL_HTML: mailFormData.conf_MAIL_HTML || '0',
      conf_SMTP_SERVER: mailFormData.conf_SMTP_SERVER || '',
      conf_SMTP_PORT: mailFormData.conf_SMTP_PORT || '',
      conf_MAIL_SECURITY: mailFormData.conf_MAIL_SECURITY || 'STARTTLS',
      conf_MAIL_USER: mailFormData.conf_MAIL_USER || '',
      conf_MAIL_PASSWORD: mailFormData.conf_MAIL_PASSWORD ? btoa(mailFormData.conf_MAIL_PASSWORD) : '',
      conf_MAIL_FROM: mailFormData.conf_MAIL_FROM || '',
      conf_MAIL_TO: mailFormData.conf_MAIL_TO || '',
      conf_MAIL_TIMEOUT_SEC: mailFormData.conf_MAIL_TIMEOUT_SEC || '30',
    };
    await updateConfig(mailConfigToSave);
    mailLastSavedConfig.current = JSON.stringify(mailFormData);
    setMailIsSaved(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mailFormData, updateConfig]);

  const handleSaveRsync = useCallback(async () => {
    if (rsyncFormData.conf_RSYNC_PASSWORD && !validateRsyncPassword(rsyncFormData.conf_RSYNC_PASSWORD)) {
      throw new Error('Password validation failed');
    }
    const rsyncConfigToSave = {
      conf_RSYNC_SERVER: rsyncFormData.conf_RSYNC_SERVER || '',
      conf_RSYNC_PORT: rsyncFormData.conf_RSYNC_PORT || '',
      conf_RSYNC_USER: rsyncFormData.conf_RSYNC_USER || '',
      conf_RSYNC_PASSWORD: rsyncFormData.conf_RSYNC_PASSWORD ? btoa(rsyncFormData.conf_RSYNC_PASSWORD) : '',
      conf_RSYNC_SERVER_MODULE: rsyncFormData.conf_RSYNC_SERVER_MODULE || '',
    };
    await updateConfig(rsyncConfigToSave);
    rsyncLastSavedConfig.current = JSON.stringify(rsyncFormData);
    setRsyncIsSaved(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rsyncFormData, updateConfig]);

  const handleSaveSocialGeneral = useCallback(async () => {
    await updateConfig(socialGeneralFormData);
    socialGeneralLastSaved.current = JSON.stringify(socialGeneralFormData);
    setSocialGeneralIsSaved(true);
  }, [socialGeneralFormData, updateConfig]);

  const handleSaveCloudRemote = useCallback(async () => {
    const configToSave = {};
    Object.entries(cloudRemoteFormData).forEach(([name, values]) => {
      const key = name.toLowerCase().replace(/\s+/g, '_');
      configToSave[`conf_cloud_${key}_target_dir`] = values.target_dir || '';
      configToSave[`conf_cloud_${key}_sync_method`] = values.sync_method || 'rclone';
      configToSave[`conf_cloud_${key}_files_stay`] = values.files_stay || 'false';
    });
    await updateConfig(configToSave);
    cloudRemoteLastSaved.current = JSON.stringify(cloudRemoteFormData);
    setCloudRemoteIsSaved(true);
  }, [cloudRemoteFormData, updateConfig]);

  const isAnyDirty =
    !mailIsSaved ||
    !rsyncIsSaved ||
    !socialGeneralIsSaved ||
    !cloudRemoteIsSaved ||
    !cloudConfigState.isSaved ||
    !socialMediaState.isSaved;

  const handleSavePage = async () => {
    setIsSaving(true);
    const tasks = [];
    if (!mailIsSaved) tasks.push(['Mail', handleSaveMail]);
    if (!rsyncIsSaved) tasks.push(['Rsync', handleSaveRsync]);
    if (!socialGeneralIsSaved) tasks.push(['Social', handleSaveSocialGeneral]);
    if (!cloudRemoteIsSaved) tasks.push(['Cloud remotes', handleSaveCloudRemote]);
    if (!cloudConfigState.isSaved && cloudConfigState.save) tasks.push(['Cloud', cloudConfigState.save]);
    if (!socialMediaState.isSaved && socialMediaState.save) tasks.push(['Social media', socialMediaState.save]);
    const results = await Promise.allSettled(tasks.map(([, fn]) => fn()));
    const failures = results
      .map((r, i) => (r.status === 'rejected' ? `${tasks[i][0]}: ${r.reason?.message || 'error'}` : null))
      .filter(Boolean);
    if (failures.length === 0 && tasks.length > 0) {
      setMessage(t('config.message_settings_saved') || 'Settings saved');
    } else if (failures.length > 0) {
      setMessage(`${t('config.save_partial_error') || 'Some settings failed to save'}: ${failures.join('; ')}`);
    }
    setIsSaving(false);
  };

  // Track social-general dirty state (no autosave)
  useEffect(() => {
    if (Object.keys(socialGeneralFormData).length === 0) return;
    const formDataString = JSON.stringify(socialGeneralFormData);
    setSocialGeneralIsSaved(socialGeneralLastSaved.current === formDataString);
  }, [socialGeneralFormData]);

  // Load cloud remotes on mount; seed last-saved snapshot from current config so the page is clean on load
  useEffect(() => {
    const loadCloudRemotes = async () => {
      try {
        const response = await api.get('/cloud/remotes');
        const remotes = response.data.remotes || [];
        setCloudRemotes(remotes);
        if (config) {
          const formData = {};
          remotes.forEach((name) => {
            const key = name.toLowerCase().replace(/\s+/g, '_');
            formData[name] = {
              target_dir: config[`conf_cloud_${key}_target_dir`] || '',
              sync_method: config[`conf_cloud_${key}_sync_method`] || 'rclone',
              files_stay: config[`conf_cloud_${key}_files_stay`] || 'false',
            };
          });
          setCloudRemoteFormData(formData);
          cloudRemoteLastSaved.current = JSON.stringify(formData);
        }
      } catch (error) {
        console.error('Failed to load cloud remotes:', error);
      }
    };
    loadCloudRemotes();
  }, [config]);

  // Track cloud-remote dirty state (no autosave)
  useEffect(() => {
    if (Object.keys(cloudRemoteFormData).length === 0) return;
    const formDataString = JSON.stringify(cloudRemoteFormData);
    setCloudRemoteIsSaved(cloudRemoteLastSaved.current === formDataString);
  }, [cloudRemoteFormData]);

  const validatePassword = (password) => {
    if (!password) {
      setPasswordError('');
      return true;
    }
    if (password.length < 5) {
      setPasswordError(t('config.alert_password_too_short') || 'Password must be at least 5 characters long.');
      return false;
    }
    if (/[\\'" ]/.test(password)) {
      setPasswordError('Password cannot contain backslash, single quote, double quote, or space.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const validateRsyncPassword = (password) => {
    if (!password) {
      setRsyncPasswordError('');
      return true;
    }
    if (password.length < 5) {
      setRsyncPasswordError(t('config.alert_password_too_short') || 'Password must be at least 5 characters long.');
      return false;
    }
    if (/[\\'" ]/.test(password)) {
      setRsyncPasswordError('Password cannot contain backslash, single quote, double quote, or space.');
      return false;
    }
    setRsyncPasswordError('');
    return true;
  };

  const handleTabChange = (event, newValue) => {
    setCurrentTab(newValue);
    const reverseMap = { 0: 'cloud', 1: 'social', 2: 'mail' };
    localStorage.setItem('lbb-tabs-integrations', reverseMap[newValue] || 'cloud');
  };

  const areAllMailFieldsFilled = () => {
    return !!(
      mailFormData.conf_SMTP_SERVER?.trim() &&
      mailFormData.conf_SMTP_PORT?.trim() &&
      mailFormData.conf_MAIL_SECURITY &&
      mailFormData.conf_MAIL_USER?.trim() &&
      mailFormData.conf_MAIL_PASSWORD?.trim() &&
      mailFormData.conf_MAIL_FROM?.trim() &&
      mailFormData.conf_MAIL_TO?.trim()
    );
  };

  const hasMissingEmailServerConfig = () => {
    if (!config) return true;
    const password = config.conf_MAIL_PASSWORD?.trim() || '';
    let decodedPassword = '';
    if (password) {
      try {
        decodedPassword = atob(password);
      } catch (e) {
        decodedPassword = '';
      }
    }
    return !(
      config.conf_SMTP_SERVER?.trim() &&
      config.conf_SMTP_PORT?.trim() &&
      config.conf_MAIL_SECURITY &&
      config.conf_MAIL_USER?.trim() &&
      decodedPassword?.trim() &&
      config.conf_MAIL_FROM?.trim() &&
      config.conf_MAIL_TO?.trim()
    );
  };

  const handleTestMail = async () => {
    try {
      await api.post('/setup/test-mail');
      setMessage(t('config.mail.testmail_sent') || 'Test mail sent');
    } catch (error) {
      console.error('Failed to send test mail:', error);
      const errorMessage = error.response?.data?.error || error.message || t('config.mail.testmail_error') || 'Failed to send test mail';
      setMessage(errorMessage);
    }
  };


  if (!config) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 10 }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          aria-label="connections tabs"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
        >
          <Tab
            label={t('integrations.tab.cloud') || 'Cloud'}
            id="integrations-tab-0"
            aria-controls="integrations-tabpanel-0"
          />
          <Tab
            label={t('integrations.tab.social') || 'Social'}
            id="integrations-tab-1"
            aria-controls="integrations-tabpanel-1"
          />
          <Tab
            label={t('integrations.tab.mail') || 'Mail'}
            id="integrations-tab-2"
            aria-controls="integrations-tabpanel-2"
          />
        </Tabs>
      </Box>

      {/* Mail panel — was index 0, now 2 */}
      <TabPanel value={currentTab} index={2}>
              {hasMissingEmailServerConfig() && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {t('config.mail.server_settings_notice') || 'Server settings must be configured before email notifications can be sent.'}
                </Alert>
              )}
              <Stack spacing={1.5} sx={{ mt: 3, mb: 4 }}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={mailFormData.conf_MAIL_IP === '1'}
                          onChange={(e) => setMailFormData({ ...mailFormData, conf_MAIL_IP: e.target.checked ? '1' : '0' })}
                        />
                      }
                      label={t('config.mail.notify_ip_label') || 'If possible, send the current links of this Little Backup Box via email?'}
                    />
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={mailFormData.conf_MAIL_HTML === '1'}
                          onChange={(e) => setMailFormData({ ...mailFormData, conf_MAIL_HTML: e.target.checked ? '1' : '0' })}
                        />
                      }
                      label={t('config.mail.html_label') || 'Format emails in HTML?'}
                    />
                  </Stack>
                  
                  <SectionHeader level={3} title={t('config.mail.smtp_header') || 'SMTP Configuration'} sx={{ mt: 3, mb: 2 }} />

                  <Stack spacing={3} sx={{ mb: 4 }}>
                    <TextField
                      required
                      variant="outlined"
                      label={t('config.mail.smtp_label') || 'Address of the SMTP-mailserver'}
                      value={mailFormData.conf_SMTP_SERVER || ''}
                      onChange={(e) => setMailFormData({ ...mailFormData, conf_SMTP_SERVER: e.target.value })}
                      sx={{ maxWidth: 500 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <ServerIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      required
                      variant="outlined"
                      type="number"
                      label={t('config.mail.port_label') || 'Port of the SMTP-Mailserver'}
                      value={mailFormData.conf_SMTP_PORT || ''}
                      onChange={(e) => setMailFormData({ ...mailFormData, conf_SMTP_PORT: e.target.value })}
                      sx={{ maxWidth: 200 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PortIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <FormControl component="fieldset">
                      <FormLabel component="legend">{t('config.mail.security_header') || 'Connection security'}</FormLabel>
                      <RadioGroup
                        row
                        value={mailFormData.conf_MAIL_SECURITY || 'STARTTLS'}
                        onChange={(e) => setMailFormData({ ...mailFormData, conf_MAIL_SECURITY: e.target.value })}
                      >
                        <FormControlLabel value="STARTTLS" control={<Radio />} label="STARTTLS" />
                        <FormControlLabel value="SSL" control={<Radio />} label="SSL" />
                      </RadioGroup>
                    </FormControl>

                    <TextField
                      required
                      variant="outlined"
                      label={t('config.mail.user_label') || 'Username for the mailserver'}
                      value={mailFormData.conf_MAIL_USER || ''}
                      onChange={(e) => setMailFormData({ ...mailFormData, conf_MAIL_USER: e.target.value })}
                      sx={{ maxWidth: 400 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      required
                      variant="outlined"
                      type="password"
                      label={t('config.mail.password_label') || 'Password for the mailserver'}
                      value={mailFormData.conf_MAIL_PASSWORD || ''}
                      onChange={(e) => {
                        setMailFormData({ ...mailFormData, conf_MAIL_PASSWORD: e.target.value });
                        validatePassword(e.target.value);
                      }}
                      error={!!passwordError}
                      helperText={passwordError || ''}
                      sx={{ maxWidth: 400 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      required
                      variant="outlined"
                      type="email"
                      label={t('config.mail.sender_label') || 'Mailaddress of the sender'}
                      value={mailFormData.conf_MAIL_FROM || ''}
                      onChange={(e) => setMailFormData({ ...mailFormData, conf_MAIL_FROM: e.target.value })}
                      sx={{ maxWidth: 400 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <MailOutlineIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      required
                      variant="outlined"
                      type="email"
                      label={t('config.mail.recipient_label') || 'Mailaddress of the recipient'}
                      value={mailFormData.conf_MAIL_TO || ''}
                      onChange={(e) => setMailFormData({ ...mailFormData, conf_MAIL_TO: e.target.value })}
                      sx={{ maxWidth: 400 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <MailOutlineIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <FormControl sx={{ maxWidth: 400 }}>
                      <InputLabel>{t('config.mail.timeout_header') || 'Mail timeout'}</InputLabel>
                      <Select
                        value={mailFormData.conf_MAIL_TIMEOUT_SEC || '30'}
                        onChange={(e) => setMailFormData({ ...mailFormData, conf_MAIL_TIMEOUT_SEC: e.target.value })}
                        label={t('config.mail.timeout_header') || 'Mail timeout'}
                      >
                        <MenuItem value="5">5 {t('seconds_short') || 's'}</MenuItem>
                        <MenuItem value="10">10 {t('seconds_short') || 's'}</MenuItem>
                        <MenuItem value="20">20 {t('seconds_short') || 's'}</MenuItem>
                        <MenuItem value="30">30 {t('seconds_short') || 's'}</MenuItem>
                        <MenuItem value="40">40 {t('seconds_short') || 's'}</MenuItem>
                        <MenuItem value="50">50 {t('seconds_short') || 's'}</MenuItem>
                        <MenuItem value="60">60 {t('seconds_short') || 's'}</MenuItem>
                        <MenuItem value="90">90 {t('seconds_short') || 's'}</MenuItem>
                        <MenuItem value="120">120 {t('seconds_short') || 's'}</MenuItem>
                        <MenuItem value="300">300 {t('seconds_short') || 's'}</MenuItem>
                        <MenuItem value="600">600 {t('seconds_short') || 's'}</MenuItem>
                      </Select>
                    </FormControl>
                  </Stack>

                  <Stack direction="row" spacing={2} sx={{ mt: 4 }}>
                    <Button
                      variant="outlined"
                      startIcon={<EmailIcon />}
                      onClick={handleTestMail}
                      disabled={!areAllMailFieldsFilled()}
                    >
                      {t('config.mail.testmail_header') || 'Send Test Mail'}
                    </Button>
                  </Stack>
      </TabPanel>

      <TabPanel value={currentTab} index={1}>
              <SectionHeader level={2} title={t('integrations.social_general')} sx={{ mb: 2 }} />
              <Stack spacing={2} sx={{ mb: 3 }}>
                <TextField
                  label={t('integrations.social_publish_date')}
                  helperText={t('integrations.social_publish_date_help')}
                  value={socialGeneralFormData.conf_social_publish_date || ''}
                  onChange={(e) =>
                    setSocialGeneralFormData({
                      ...socialGeneralFormData,
                      conf_social_publish_date: e.target.value,
                    })
                  }
                  sx={{ maxWidth: 400 }}
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={socialGeneralFormData.conf_social_publish_filename === 'true'}
                      onChange={(e) =>
                        setSocialGeneralFormData({
                          ...socialGeneralFormData,
                          conf_social_publish_filename: e.target.checked ? 'true' : 'false',
                        })
                      }
                    />
                  }
                  label={t('integrations.social_publish_filename')}
                />
              </Stack>
              <Divider sx={{ mb: 3 }} />
              <SocialMediaConfig onSavedStateChange={handleSocialMediaState} onMessage={setMessage} />
      </TabPanel>

      {/* Cloud panel — was index 2, now 0; absorbs the rsync panel */}
      <TabPanel value={currentTab} index={0}>
              {cloudRemotes.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  {cloudRemotes.map((remoteName) => (
                    <Accordion key={remoteName}>
                      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>{remoteName}</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Stack spacing={2}>
                          <TextField
                            label={t('integrations.cloud_target_dir')}
                            value={cloudRemoteFormData[remoteName]?.target_dir || ''}
                            onChange={(e) =>
                              setCloudRemoteFormData((prev) => ({
                                ...prev,
                                [remoteName]: { ...prev[remoteName], target_dir: e.target.value },
                              }))
                            }
                            sx={{ maxWidth: 500 }}
                          />
                          <FormControl sx={{ maxWidth: 300 }}>
                            <InputLabel>{t('integrations.cloud_sync_method')}</InputLabel>
                            <Select
                              value={cloudRemoteFormData[remoteName]?.sync_method || 'rclone'}
                              onChange={(e) =>
                                setCloudRemoteFormData((prev) => ({
                                  ...prev,
                                  [remoteName]: { ...prev[remoteName], sync_method: e.target.value },
                                }))
                              }
                              label={t('integrations.cloud_sync_method')}
                            >
                              <MenuItem value="rclone">{t('integrations.cloud_sync_rclone')}</MenuItem>
                              <MenuItem value="rsync">{t('integrations.cloud_sync_rsync')}</MenuItem>
                            </Select>
                          </FormControl>
                          <FormControlLabel
                            control={
                              <Checkbox
                                checked={cloudRemoteFormData[remoteName]?.files_stay === 'true'}
                                onChange={(e) =>
                                  setCloudRemoteFormData((prev) => ({
                                    ...prev,
                                    [remoteName]: {
                                      ...prev[remoteName],
                                      files_stay: e.target.checked ? 'true' : 'false',
                                    },
                                  }))
                                }
                              />
                            }
                            label={t('integrations.cloud_files_stay')}
                          />
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  ))}
                  <Divider sx={{ mt: 3, mb: 3 }} />
                </Box>
              )}
              <CloudConfig onSavedStateChange={handleCloudConfigState} onMessage={setMessage} />

              <Divider sx={{ my: 4 }} />

              <SectionHeader level={2} title={t('network.rsync_config.title') || 'rsync server'} sx={{ mb: 2 }} />
              <Stack spacing={3}>
                    <TextField
                      variant="outlined"
                      label={t('config.rsync_server_label') || 'Address of the rsync-server'}
                      value={rsyncFormData.conf_RSYNC_SERVER || ''}
                      onChange={(e) => setRsyncFormData({ ...rsyncFormData, conf_RSYNC_SERVER: e.target.value })}
                      sx={{ maxWidth: 500 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <ServerIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      variant="outlined"
                      type="number"
                      label={t('config.rsync_port_label') || 'Port of the rsync-server'}
                      value={rsyncFormData.conf_RSYNC_PORT || ''}
                      onChange={(e) => setRsyncFormData({ ...rsyncFormData, conf_RSYNC_PORT: e.target.value })}
                      sx={{ maxWidth: 200 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PortIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      variant="outlined"
                      label={t('config.rsync_user_label') || 'Username for the rsync-server'}
                      value={rsyncFormData.conf_RSYNC_USER || ''}
                      onChange={(e) => setRsyncFormData({ ...rsyncFormData, conf_RSYNC_USER: e.target.value })}
                      sx={{ maxWidth: 400 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <PersonIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      variant="outlined"
                      type="password"
                      label={t('config.rsync_password_label') || 'Password for the rsync-server'}
                      value={rsyncFormData.conf_RSYNC_PASSWORD || ''}
                      onChange={(e) => {
                        setRsyncFormData({ ...rsyncFormData, conf_RSYNC_PASSWORD: e.target.value });
                        validateRsyncPassword(e.target.value);
                      }}
                      error={!!rsyncPasswordError}
                      helperText={rsyncPasswordError || ''}
                      sx={{ maxWidth: 400 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon sx={{ color: 'text.secondary' }} />
                          </InputAdornment>
                        ),
                      }}
                    />

                    <TextField
                      variant="outlined"
                      label={t('config.rsync_module_label1') || 'Module name on the rsync server'}
                      value={rsyncFormData.conf_RSYNC_SERVER_MODULE || ''}
                      onChange={(e) => setRsyncFormData({ ...rsyncFormData, conf_RSYNC_SERVER_MODULE: e.target.value })}
                      sx={{ maxWidth: 400 }}
                    />

              </Stack>
      </TabPanel>

      <Snackbar
        open={!!message}
        autoHideDuration={3000}
        onClose={() => setMessage('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={() => setMessage('')} 
          severity={message.includes('Error') ? 'error' : 'success'}
          sx={{ width: '100%' }}
        >
          {message}
        </Alert>
      </Snackbar>

      <PageSaveBar
        isDirty={isAnyDirty}
        isSaving={isSaving}
        onSave={handleSavePage}
        drawerWidth={currentDrawerWidth}
      />
    </Box>
  );
}

export default Connections;

