import React, { useEffect, useState } from 'react';
import { Alert, Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import SearchIcon from '@mui/icons-material/Search';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { useLanguage } from '../../contexts/LanguageContext';
import { isImageKind } from '../../utils/viewMediaKinds';
import { mediaUrl, ratingBorderSx, UNKNOWN_THUMB } from './viewMedia';

const ZOOM_STEP = 0.5;

/**
 * Renders one EXIF_DATA row the way scripts/view.php:1249-1368 does:
 *  - images: the original for web formats, the tims/ preview for RAW/HEIC/TIF
 *    (with a low-resolution notice for RAW/TIF), with zoom & pan on the same
 *    loaded image;
 *  - video: <video controls>, GoPro H.265 via the .LRV proxy (+ notice);
 *  - audio: the thumbnail plus <audio controls>;
 *  - text: the thumbnail.
 *
 * `fullscreen` renders the bare media for the overlay (no zoom, no notices).
 * Render it with key={image.ID} so zoom/error state resets per image.
 */
function MediaStage({ medium, image, media, autoPlay = false, fullscreen = false, maxZoom = 8, onEnded }) {
  const { t } = useLanguage();
  const kind = media?.kind || 'other';
  const src = mediaUrl(medium, image, 'display');
  const thumb = mediaUrl(medium, image, 'thumb') || UNKNOWN_THUMB;

  const [failed, setFailed] = useState(false);
  const [zoomMode, setZoomMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [lastPinchDistance, setLastPinchDistance] = useState(null);

  useEffect(() => {
    if (!zoomMode) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setZoomMode(false);
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomMode]);

  const clampZoom = (level) => Math.max(1, Math.min(maxZoom, level));

  const toggleZoom = () => {
    if (zoomMode) {
      setZoomMode(false);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    } else {
      setZoomMode(true);
      setZoomLevel(clampZoom(2));
    }
  };

  const handleWheel = (e) => {
    if (!zoomMode) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    setZoomOrigin({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    const delta = e.deltaY < 0 ? 0.25 : -0.25;
    setZoomLevel((prev) => clampZoom(prev + delta));
  };
  const handleMouseDown = (e) => {
    if (!zoomMode) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ ...panOffset });
  };
  const handleMouseMove = (e) => {
    if (!isDragging || !zoomMode) return;
    setPanOffset({ x: panStart.x + (e.clientX - dragStart.x), y: panStart.y + (e.clientY - dragStart.y) });
  };
  const handleMouseUp = () => setIsDragging(false);
  const pinchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };
  const handleTouchStart = (e) => {
    if (!zoomMode || e.touches.length !== 2) return;
    setLastPinchDistance(pinchDistance(e.touches));
  };
  const handleTouchMove = (e) => {
    if (!zoomMode || e.touches.length !== 2 || lastPinchDistance === null) return;
    const distance = pinchDistance(e.touches);
    setZoomLevel((prev) => clampZoom(prev * (distance / lastPinchDistance)));
    setLastPinchDistance(distance);
  };

  const mediaMaxHeight = fullscreen ? 'calc(100vh - 96px)' : '70vh';
  const borderSx = fullscreen ? {} : ratingBorderSx(image?.LbbRating);

  if (!image) return null;

  let content;
  if (isImageKind(kind)) {
    content = (
      <Box
        sx={{
          overflow: 'hidden',
          cursor: zoomMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
          userSelect: 'none',
          touchAction: zoomMode ? 'none' : 'auto',
          display: 'flex',
          justifyContent: 'center',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={() => setLastPinchDistance(null)}
        data-testid={fullscreen ? 'fullscreen-media' : 'stage-media'}
      >
        <Box
          component="img"
          src={failed ? UNKNOWN_THUMB : src}
          alt={image.File_Name}
          draggable={false}
          onError={() => setFailed(true)}
          data-testid={fullscreen ? 'fullscreen-image' : 'stage-image'}
          sx={{
            display: 'block',
            maxWidth: '100%',
            maxHeight: mediaMaxHeight,
            objectFit: 'contain',
            borderRadius: 1,
            boxSizing: 'border-box',
            ...borderSx,
            transform: zoomMode
              ? `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`
              : 'none',
            transformOrigin: `${zoomOrigin.x}px ${zoomOrigin.y}px`,
            transition: isDragging ? 'none' : 'transform 0.1s ease',
            pointerEvents: 'none',
          }}
        />
      </Box>
    );
  } else if (kind === 'video') {
    content = (
      <Box
        component="video"
        key={src}
        src={src}
        controls
        autoPlay={autoPlay}
        playsInline
        onError={() => setFailed(true)}
        onEnded={onEnded}
        data-testid={fullscreen ? 'fullscreen-video' : 'stage-video'}
        sx={{ display: 'block', width: '100%', maxHeight: mediaMaxHeight, borderRadius: 1, bgcolor: 'common.black', boxSizing: 'border-box', ...borderSx }}
      />
    );
  } else if (kind === 'audio') {
    content = (
      <Stack spacing={1} alignItems="center">
        <Box
          component="img"
          src={thumb}
          alt={image.File_Name}
          onError={(e) => {
            if (!e.currentTarget.src.endsWith(UNKNOWN_THUMB)) e.currentTarget.src = UNKNOWN_THUMB;
          }}
          sx={{ display: 'block', maxWidth: '100%', maxHeight: fullscreen ? '60vh' : '40vh', borderRadius: 1, boxSizing: 'border-box', ...borderSx }}
        />
        <Box
          component="audio"
          key={src}
          src={src}
          controls
          autoPlay={autoPlay}
          onError={() => setFailed(true)}
          onEnded={onEnded}
          data-testid={fullscreen ? 'fullscreen-audio' : 'stage-audio'}
          sx={{ width: '100%', maxWidth: 480 }}
        />
      </Stack>
    );
  } else {
    // text and anything else: the thumbnail (view.php:1354-1368)
    content = (
      <Box
        component="img"
        src={src || thumb}
        alt={image.File_Name}
        data-testid={fullscreen ? 'fullscreen-image' : 'stage-image'}
        onError={(e) => {
          if (!e.currentTarget.src.endsWith(UNKNOWN_THUMB)) e.currentTarget.src = UNKNOWN_THUMB;
        }}
        sx={{ display: 'block', mx: 'auto', maxWidth: '100%', maxHeight: mediaMaxHeight, borderRadius: 1, boxSizing: 'border-box', ...borderSx }}
      />
    );
  }

  if (fullscreen) return content;

  return (
    <Stack spacing={1.5}>
      {media?.lowResImage && (
        <Alert severity="info" data-testid="lowres-image-notice">
          {t('view.single.low_res_image')}
        </Alert>
      )}
      {media?.lowResVideo && (
        <Alert severity="info" data-testid="lowres-video-notice">
          {t('view.single.low_res_video')}
        </Alert>
      )}
      <Box sx={{ position: 'relative' }}>
        {content}
        {isImageKind(kind) && !failed && (
          <Stack
            direction="row"
            alignItems="center"
            sx={{
              position: 'absolute',
              right: 8,
              bottom: 8,
              bgcolor: 'rgba(0,0,0,0.55)',
              color: 'common.white',
              borderRadius: 6,
              px: 0.5,
            }}
          >
            {zoomMode && (
              <>
                <Tooltip title={t('view.zoom_out')}>
                  <IconButton
                    onClick={() => setZoomLevel((z) => clampZoom(z - ZOOM_STEP))}
                    aria-label={t('view.zoom_out')}
                    data-testid="zoom-out-button"
                    sx={{ color: 'inherit', width: 44, height: 44 }}
                  >
                    <ZoomOutIcon />
                  </IconButton>
                </Tooltip>
                <Typography variant="caption" sx={{ minWidth: 36, textAlign: 'center' }} data-testid="zoom-level-indicator">
                  {zoomLevel.toFixed(1)}x
                </Typography>
                <Tooltip title={t('view.zoom_in')}>
                  <IconButton
                    onClick={() => setZoomLevel((z) => clampZoom(z + ZOOM_STEP))}
                    aria-label={t('view.zoom_in')}
                    data-testid="zoom-in-button"
                    sx={{ color: 'inherit', width: 44, height: 44 }}
                  >
                    <ZoomInIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}
            <Tooltip title={zoomMode ? t('view.single.zoom_exit') : t('view.single.zoom')}>
              <IconButton
                onClick={toggleZoom}
                aria-label={zoomMode ? t('view.single.zoom_exit') : t('view.single.zoom')}
                aria-pressed={zoomMode}
                data-testid="zoom-button"
                sx={{ color: 'inherit', width: 44, height: 44 }}
              >
                {zoomMode ? <SearchOffIcon /> : <SearchIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>
      {failed && (
        <Alert severity="warning" data-testid="media-load-error">
          {t('view.zoom_file_missing')}
        </Alert>
      )}
      {kind === 'other' && (
        <Alert severity="info">{t('view.single.unsupported')}</Alert>
      )}
    </Stack>
  );
}

export default MediaStage;
