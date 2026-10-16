import React, { useEffect, useRef, useState } from 'react';
import { Box, IconButton, Popover, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import api from '../utils/api';
import { mockDisplayImageUrl } from '../utils/mockApi';

const POLL_INTERVAL_MS = 1000;
const DISPLAY_IMAGE_REFRESH_MS = 2000;
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true';

// sub-display.php:28-34 — the rendered display image is shown when the
// display is enabled and a resolution is configured.
function displayImageEnabled(config) {
  if (!config) return false;
  const enabled = config.conf_DISP === '1' || config.conf_DISP === 'true' || config.conf_DISP === true;
  return enabled
    && parseInt(config.conf_DISP_RESOLUTION_X, 10) > 0
    && parseInt(config.conf_DISP_RESOLUTION_Y, 10) > 0;
}

function StatusIndicator() {
  const { t } = useLanguage();
  const { config, constants } = useConfig();
  const [data, setData] = useState({ status: '', severity: 'ready' });
  const [imageTick, setImageTick] = useState(() => Date.now());
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

  const showImage = displayImageEnabled(config);
  const popoverOpen = Boolean(anchorEl);

  // Refresh the display image every ~2 s while the popover is open.
  useEffect(() => {
    if (!popoverOpen || !showImage) return undefined;
    const interval = setInterval(() => setImageTick(Date.now()), DISPLAY_IMAGE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [popoverOpen, showImage]);

  if (!visible) return null;

  const imageWidth = parseInt(constants?.const_DISPLAY_SIZE_UI_X, 10) || 200;
  const imageHeight = parseInt(constants?.const_DISPLAY_SIZE_UI_Y, 10) || 100;
  const imageSrc = USE_MOCK_API
    ? mockDisplayImageUrl(data.status)
    : `/api/display/image?t=${imageTick}`;

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
          {showImage && (
            <Box
              component="img"
              src={imageSrc}
              alt={t('menu.display_image')}
              data-testid="display-image"
              sx={{
                display: 'block',
                width: imageWidth,
                maxWidth: '100%',
                height: 'auto',
                aspectRatio: `${imageWidth} / ${imageHeight}`,
                bgcolor: '#000',
                borderRadius: 0.5,
                mb: 1.5,
                imageRendering: 'pixelated',
              }}
            />
          )}
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
