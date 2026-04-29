import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  Paper,
  Stack,
  IconButton,
  Tooltip,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import api from '../utils/api';

function View() {
  const { t } = useLanguage();
  useConfig();

  // Grid / pagination state
  const [storagePath, setStoragePath] = useState('');
  const [images, setImages] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [imagesPerPage] = useState(50);
  const [orderBy] = useState('ID');
  const [orderDir] = useState('ASC');

  // View mode & selection
  const [viewMode, setViewMode] = useState('grid');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Slideshow state
  const [isPlaying, setIsPlaying] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(5);

  // Zoom state
  const [zoomMode, setZoomMode] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [fullResUrl, setFullResUrl] = useState(null);
  const [fullResFailed, setFullResFailed] = useState(false);
  const [fullResLoading, setFullResLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // Touch pinch state
  const [lastPinchDistance, setLastPinchDistance] = useState(null);

  const selectedImage = images[selectedIndex] || null;

  const loadImages = useCallback(
    async (pageOffset = 0) => {
      try {
        const response = await api.get('/view/images', {
          params: {
            storagePath,
            selectOffset: pageOffset * imagesPerPage,
            filterImagesPerPage: imagesPerPage,
            orderBy,
            orderDir,
          },
        });
        setImages(response.data.images || []);
        setTotalCount(response.data.count || 0);
      } catch (error) {
        console.error('Failed to load images:', error);
      }
    },
    [storagePath, imagesPerPage, orderBy, orderDir]
  );

  useEffect(() => {
    if (storagePath) {
      loadImages(page);
    }
  }, [storagePath, page, loadImages]);

  const handleInit = async () => {
    try {
      await api.get('/view/init', { params: { mountpoint: storagePath } });
      setPage(0);
      loadImages(0);
    } catch (error) {
      console.error('Failed to initialize view:', error);
    }
  };

  const resetZoomState = useCallback(() => {
    setZoomMode(false);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
    setZoomOrigin({ x: 0, y: 0 });
    setFullResUrl(null);
    setFullResFailed(false);
    setFullResLoading(false);
  }, []);

  const goToImage = useCallback(
    (newIndex) => {
      setSelectedIndex(newIndex);
      resetZoomState();
    },
    [resetZoomState]
  );

  const handleNext = useCallback(async () => {
    setIsPlaying(false);
    if (selectedIndex < images.length - 1) {
      goToImage(selectedIndex + 1);
    } else if ((page + 1) * imagesPerPage < totalCount) {
      const nextPage = page + 1;
      setPage(nextPage);
      // Images will be reloaded by the effect; select first image
      setSelectedIndex(0);
      resetZoomState();
    }
  }, [selectedIndex, images.length, page, imagesPerPage, totalCount, goToImage, resetZoomState]);

  const handlePrev = useCallback(() => {
    setIsPlaying(false);
    if (selectedIndex > 0) {
      goToImage(selectedIndex - 1);
    }
  }, [selectedIndex, goToImage]);

  const handleBackToGrid = useCallback(() => {
    setIsPlaying(false);
    setViewMode('grid');
    resetZoomState();
  }, [resetZoomState]);

  // Slideshow effect
  useEffect(() => {
    if (!isPlaying) return;

    const advance = async () => {
      if (selectedIndex < images.length - 1) {
        goToImage(selectedIndex + 1);
      } else if ((page + 1) * imagesPerPage < totalCount) {
        // Advance to next page, then select first image
        const nextPage = page + 1;
        setPage(nextPage);
        setSelectedIndex(0);
        resetZoomState();
      } else {
        // Wrap around to the beginning
        setPage(0);
        setSelectedIndex(0);
        resetZoomState();
      }
    };

    const timer = setInterval(advance, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [
    isPlaying,
    selectedIndex,
    images.length,
    page,
    imagesPerPage,
    totalCount,
    intervalSeconds,
    goToImage,
    resetZoomState,
  ]);

  // Escape key to exit zoom
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && zoomMode) {
        setZoomMode(false);
        setZoomLevel(1);
        setPanOffset({ x: 0, y: 0 });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoomMode]);

  const handleZoomClick = async () => {
    if (zoomMode) {
      setZoomMode(false);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      return;
    }

    if (!selectedImage) return;

    if (fullResUrl) {
      setZoomMode(true);
      return;
    }

    setFullResLoading(true);
    try {
      const response = await api.get('/view/image', {
        params: { medium: storagePath, id: selectedImage.ID },
      });
      const url = response.data?.url || `/api/view/image?medium=${encodeURIComponent(storagePath)}&id=${selectedImage.ID}`;
      setFullResUrl(url);
      setZoomMode(true);
    } catch (err) {
      if (err.response?.data?.error === 'file_missing') {
        setFullResFailed(true);
      } else {
        console.error('Failed to load full-res image:', err);
      }
    } finally {
      setFullResLoading(false);
    }
  };

  const clampZoom = (level) => Math.max(1, Math.min(8, level));

  const handleWheel = (e) => {
    if (!zoomMode) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setZoomOrigin({ x, y });
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
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setPanOffset({ x: panStart.x + dx, y: panStart.y + dy });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pinch handlers
  const getPinchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e) => {
    if (!zoomMode || e.touches.length !== 2) return;
    setLastPinchDistance(getPinchDistance(e.touches));
  };

  const handleTouchMove = (e) => {
    if (!zoomMode || e.touches.length !== 2 || lastPinchDistance === null) return;
    e.preventDefault();
    const distance = getPinchDistance(e.touches);
    const scale = distance / lastPinchDistance;
    setZoomLevel((prev) => clampZoom(prev * scale));
    setLastPinchDistance(distance);
  };

  const handleTouchEnd = () => {
    setLastPinchDistance(null);
  };

  const totalPages = Math.ceil(totalCount / imagesPerPage);

  return (
    <Box>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
      >
        <TextField
          label={t('view.filter.medium') || 'Storage medium'}
          value={storagePath}
          onChange={(e) => setStoragePath(e.target.value)}
          sx={{ maxWidth: 500 }}
        />
        <Button variant="contained" onClick={handleInit}>
          {t('view.images.back_to_grid') || 'Initialize'}
        </Button>
        <IconButton
          onClick={() => {
            setViewMode(viewMode === 'grid' ? 'single' : 'grid');
            if (viewMode === 'single') {
              setIsPlaying(false);
              resetZoomState();
            }
          }}
          color="primary"
          aria-label="toggle view mode"
        >
          {viewMode === 'grid' ? <ViewListIcon /> : <GridViewIcon />}
        </IconButton>
      </Stack>

      {viewMode === 'grid' ? (
        <>
          <Grid container spacing={2}>
            {images.map((image, idx) => (
              <Grid item xs={6} sm={4} md={3} lg={2} key={image.ID}>
                <Card
                  sx={{ cursor: 'pointer' }}
                  onClick={() => {
                    setSelectedIndex(idx);
                    resetZoomState();
                    setViewMode('single');
                  }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={`${storagePath}/${image.Directory}/${image.File_Name}`}
                    alt={image.File_Name}
                  />
                  <CardContent>
                    <Typography variant="caption" noWrap>
                      {image.File_Name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {totalPages > 1 && (
            <Stack direction="row" spacing={2} sx={{ mt: 2 }} alignItems="center">
              <Button
                variant="outlined"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                &lt;
              </Button>
              <Typography>
                {t('view.images.page') || 'Page'} {page + 1} / {totalPages}
              </Typography>
              <Button
                variant="outlined"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                &gt;
              </Button>
            </Stack>
          )}
        </>
      ) : (
        selectedImage && (
          <Paper sx={{ p: 3 }}>
            {/* Toolbar */}
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}
            >
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleBackToGrid}
                size="small"
              >
                {t('view.images.back_to_grid') || 'Back to grid'}
              </Button>

              <IconButton onClick={handlePrev} disabled={selectedIndex === 0 && page === 0}>
                <ArrowBackIcon />
              </IconButton>

              <IconButton
                onClick={handleNext}
                disabled={
                  selectedIndex >= images.length - 1 &&
                  (page + 1) * imagesPerPage >= totalCount
                }
              >
                <ArrowForwardIcon />
              </IconButton>

              {/* Slideshow controls */}
              <Tooltip title={t('view.slideshow_interval') || 'Interval (seconds)'}>
                <TextField
                  type="number"
                  value={intervalSeconds}
                  onChange={(e) =>
                    setIntervalSeconds(
                      Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 5))
                    )
                  }
                  inputProps={{ min: 1, max: 60 }}
                  sx={{ width: 70 }}
                  size="small"
                  disabled={isPlaying}
                  aria-label={t('view.slideshow_interval') || 'Interval (seconds)'}
                />
              </Tooltip>

              <Tooltip
                title={
                  isPlaying
                    ? t('view.slideshow_stop') || 'Stop slideshow'
                    : t('view.slideshow_play') || 'Play slideshow'
                }
              >
                <IconButton
                  onClick={() => setIsPlaying((p) => !p)}
                  color={isPlaying ? 'error' : 'primary'}
                  aria-label={
                    isPlaying
                      ? t('view.slideshow_stop') || 'Stop slideshow'
                      : t('view.slideshow_play') || 'Play slideshow'
                  }
                >
                  {isPlaying ? <StopIcon /> : <PlayArrowIcon />}
                </IconButton>
              </Tooltip>

              {/* Zoom controls */}
              {zoomMode && (
                <>
                  <Tooltip title={t('view.zoom_out') || 'Zoom out'}>
                    <IconButton
                      onClick={() => setZoomLevel((z) => clampZoom(z - 0.5))}
                      size="small"
                      aria-label={t('view.zoom_out') || 'Zoom out'}
                      data-testid="zoom-out-button"
                    >
                      <ZoomOutIcon />
                    </IconButton>
                  </Tooltip>
                  <Typography
                    variant="caption"
                    sx={{ minWidth: 40, textAlign: 'center' }}
                    data-testid="zoom-level-indicator"
                  >
                    {zoomLevel.toFixed(1)}x
                  </Typography>
                  <Tooltip title={t('view.zoom_in') || 'Zoom in'}>
                    <IconButton
                      onClick={() => setZoomLevel((z) => clampZoom(z + 0.5))}
                      size="small"
                      aria-label={t('view.zoom_in') || 'Zoom in'}
                      data-testid="zoom-in-button"
                    >
                      <ZoomInIcon />
                    </IconButton>
                  </Tooltip>
                </>
              )}

              <Tooltip
                title={
                  fullResFailed
                    ? t('view.zoom_file_missing') || 'Original file not available'
                    : zoomMode
                      ? t('view.zoom_out') || 'Zoom out'
                      : t('view.zoom_in') || 'Zoom in'
                }
              >
                <span>
                  <IconButton
                    onClick={handleZoomClick}
                    disabled={fullResFailed || fullResLoading}
                    color={zoomMode ? 'primary' : 'default'}
                    aria-label={t('view.zoom_in') || 'Zoom'}
                    data-testid="zoom-button"
                  >
                    <ZoomInIcon />
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>

            {/* File missing warning */}
            {fullResFailed && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                {t('view.zoom_file_missing') || 'Original file not available'}
              </Alert>
            )}

            {/* Image display */}
            <Box
              sx={{
                textAlign: 'center',
                overflow: 'hidden',
                cursor: zoomMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
                userSelect: 'none',
              }}
              onWheel={handleWheel}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <img
                src={
                  zoomMode && fullResUrl
                    ? fullResUrl
                    : `${storagePath}/${selectedImage.Directory}/${selectedImage.File_Name}`
                }
                alt={selectedImage.File_Name}
                style={{
                  maxWidth: zoomMode ? 'none' : '100%',
                  height: 'auto',
                  transform: zoomMode
                    ? `scale(${zoomLevel}) translate(${panOffset.x / zoomLevel}px, ${panOffset.y / zoomLevel}px)`
                    : 'none',
                  transformOrigin: `${zoomOrigin.x}px ${zoomOrigin.y}px`,
                  transition: isDragging ? 'none' : 'transform 0.1s ease',
                  display: 'block',
                  margin: '0 auto',
                  pointerEvents: 'none',
                }}
                draggable={false}
              />
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h4" gutterBottom>
                {selectedImage.File_Name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {selectedImage.Create_Date}
              </Typography>
            </Box>
          </Paper>
        )
      )}

      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography
            variant="body2"
            dangerouslySetInnerHTML={{
              __html:
                t('view.footer.footer') ||
                'Warning, only images that have thumbnails are displayed here. Generate them either automatically (Settings, Backup) or via the Backup page.<br>\nSee the <a href="https://github.com/outdoorbits/little-backup-box/wiki/05a.-view-image-viewer">Wiki</a> for more information.',
            }}
          />
        </CardContent>
      </Card>
    </Box>
  );
}

export default View;
