import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import { downloadText, fetchLog, LOG_FILES } from '../utils/logs';


function LogMonitor({ file = 'main', title }) {
  const { t } = useLanguage();
  const [logContent, setLogContent] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const refreshLog = useCallback(async () => {
    try {
      setLogContent(await fetchLog(file));
    } catch (error) {
      console.error('Failed to refresh log:', error);
    }
  }, [file]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshLog();
    if (!autoRefresh) return undefined;
    const interval = setInterval(refreshLog, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshLog]);

  // sub-logmonitor.php:45-52 — clearing recreates the log with a header line.
  const clearLog = async () => {
    setConfirmClearOpen(false);
    try {
      await api.post('/log/clear', { file });
      await refreshLog();
    } catch (error) {
      console.error('Failed to clear log:', error);
    }
  };

  return (
    <Card sx={{ mt: 3, mb: 2 }} data-testid={`log-monitor-${file}`}>
      <CardContent>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 1,
            mb: 2,
          }}
        >
          <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
            {title || t('log.logmonitor')}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={refreshLog} sx={{ minHeight: 44 }}>
              {t('log.refresh_button')}
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => downloadText(LOG_FILES[file] || 'log.txt', logContent)}
              sx={{ minHeight: 44 }}
            >
              {t('log.download_button')}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<WarningAmberIcon />}
              onClick={() => setConfirmClearOpen(true)}
              sx={{ minHeight: 44 }}
            >
              {t('log.clear_button')}
            </Button>
            <FormControlLabel
              control={
                <Checkbox checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
              }
              label={t('log.auto_refresh')}
            />
          </Stack>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <Paper elevation={0} sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
          <Typography
            component="pre"
            variant="body2"
            sx={{
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              margin: 0,
            }}
          >
            {logContent || t('log.empty')}
          </Typography>
        </Paper>
      </CardContent>

      <Dialog open={confirmClearOpen} onClose={() => setConfirmClearOpen(false)}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon color="error" />
          {t('log.clear_confirm_title')}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>{t('log.clear_confirm_body')}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearOpen(false)} sx={{ minHeight: 44 }}>
            {t('main.cancel_button')}
          </Button>
          <Button
            onClick={clearLog}
            color="error"
            variant="contained"
            startIcon={<WarningAmberIcon />}
            sx={{ minHeight: 44 }}
          >
            {t('log.clear_button')}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

export default LogMonitor;
