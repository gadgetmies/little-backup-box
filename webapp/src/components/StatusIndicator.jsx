import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Popover, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';

const POLL_INTERVAL_MS = 1000;

function StatusIndicator() {
  const { t } = useLanguage();
  const [data, setData] = useState({ status: '', severity: 'ready' });
  const [visible, setVisible] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    const tick = async () => {
      try {
        const response = await api.get('/display/status');
        if (cancelledRef.current) return;
        const next = response.data || {};
        setData({
          status: typeof next.status === 'string' ? next.status : '',
          severity: next.severity === 'info' ? 'info' : 'ready',
        });
        setVisible(true);
      } catch (error) {
        if (cancelledRef.current) return;
        console.error('Failed to get display status:', error);
        setVisible(false);
      }
    };
    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      clearInterval(interval);
    };
  }, []);

  if (!visible) return null;

  const Icon = data.severity === 'ready' ? CheckCircleOutlineIcon : InfoOutlinedIcon;
  const tooltipText = t('status.tooltip') || 'Device status';
  const popoverText = data.status.trim() === '' ? t('status.ready') || 'Ready' : data.status;

  return (
    <>
      <Tooltip title={tooltipText}>
        <IconButton
          color="inherit"
          size="small"
          onClick={(event) => setAnchorEl(event.currentTarget)}
          aria-label={tooltipText}
          aria-haspopup="true"
          aria-expanded={Boolean(anchorEl)}
        >
          <Icon />
        </IconButton>
      </Tooltip>
      <Popover
        open={Boolean(anchorEl)}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disableScrollLock
      >
        <Box sx={{ p: 2, minWidth: 200, maxWidth: 360 }}>
          <Stack direction="row" alignItems="flex-start" spacing={1.5}>
            <Icon fontSize="small" color={data.severity === 'ready' ? 'success' : 'info'} />
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {popoverText}
            </Typography>
          </Stack>
        </Box>
      </Popover>
    </>
  );
}

export default StatusIndicator;
