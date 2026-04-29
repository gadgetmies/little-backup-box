import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Pagination,
  Select,
  Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import { Link as RouterLink } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import useAsyncAction from '../hooks/useAsyncAction';

const PREFS_KEY = 'lbb-view-preferences';
const SCROLL_KEY = 'lbb-view-scroll';

function loadPreferences() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
}

function savePreferences(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export default function View() {
  const { t } = useLanguage();

  // Load persisted preferences
  const prefs = loadPreferences();

  const [availableMedia, setAvailableMedia] = useState([]);
  const [medium, setMedium] = useState(null);
  const [images, setImages] = useState([]);
  const [total, setTotal] = useState(0);
  const [dbExists, setDbExists] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(prefs.perPage || 25);
  const [sortField, setSortField] = useState(prefs.sortField || 'date');
  const [sortDir, setSortDir] = useState(prefs.sortDir || 'desc');
  const [columns, setColumns] = useState(prefs.columns || 3);

  // Ref to track current images/page for keyboard handler without stale closures
  const stateRef = useRef({ images, selectedIndex, page, perPage, total, medium, sortField, sortDir });

  useEffect(() => {
    stateRef.current = { images, selectedIndex, page, perPage, total, medium, sortField, sortDir };
  });

  // ---- fetch available media ----
  const fetchMediaFn = useCallback(async () => {
    const res = await api.get('/view/media');
    return res.data;
  }, []);

  const {
    execute: fetchMedia,
    isExecuting: isFetchingMedia,
    error: mediaError,
  } = useAsyncAction(fetchMediaFn);

  // ---- fetch images ----
  const fetchImagesFn = useCallback(async (med, pg, pp, sf, sd) => {
    const res = await api.get('/view/images', {
      params: {
        medium: med,
        page: pg,
        per_page: pp,
        sort: sf,
        dir: sd,
      },
    });
    return res.data;
  }, []);

  const {
    execute: fetchImages,
    isExecuting: isFetchingImages,
    error: imagesError,
  } = useAsyncAction(fetchImagesFn);

  // Load media on mount
  useEffect(() => {
    fetchMedia()
      .then((data) => {
        const available = data.available || {};
        const list = (data.media || []).filter((m) => available[m]);
        setAvailableMedia(list);
        if (list.length > 0) {
          setMedium(list[0]);
        }
      })
      .catch(() => {
        // error is tracked in mediaError
      });
  }, [fetchMedia]);

  // Load images when medium / page / sort / perPage changes
  useEffect(() => {
    if (!medium) return;
    fetchImages(medium, page, perPage, sortField, sortDir)
      .then((data) => {
        setImages(data.images || []);
        setTotal(data.total || 0);
        setDbExists(data.dbExists !== false);
      })
      .catch(() => {
        setImages([]);
        setTotal(0);
      });
  }, [medium, page, perPage, sortField, sortDir, fetchImages]);

  // Persist preferences
  useEffect(() => {
    savePreferences({ perPage, sortField, sortDir, columns });
  }, [perPage, sortField, sortDir, columns]);

  // ---- Navigation helpers ----

  // Navigate to a specific absolute index (0-based across all pages)
  const navigateToAbsolute = useCallback(
    (absIdx) => {
      const { medium: med, perPage: pp, sortField: sf, sortDir: sd } = stateRef.current;
      const targetPage = Math.floor(absIdx / pp) + 1;
      const targetIdx = absIdx % pp;

      if (targetPage !== stateRef.current.page) {
        fetchImages(med, targetPage, pp, sf, sd)
          .then((data) => {
            setImages(data.images || []);
            setTotal(data.total || 0);
            setDbExists(data.dbExists !== false);
            setPage(targetPage);
            setSelectedIndex(targetIdx);
          })
          .catch(() => {});
      } else {
        setSelectedIndex(targetIdx);
      }
    },
    [fetchImages]
  );

  const currentAbsoluteIndex = (page - 1) * perPage + selectedIndex;

  const goFirst = useCallback(() => {
    navigateToAbsolute(0);
  }, [navigateToAbsolute]);

  const goLast = useCallback(() => {
    navigateToAbsolute(stateRef.current.total - 1);
  }, [navigateToAbsolute]);

  const goPrev = useCallback(() => {
    const abs = stateRef.current.page * stateRef.current.perPage - stateRef.current.perPage + stateRef.current.selectedIndex;
    if (abs > 0) navigateToAbsolute(abs - 1);
  }, [navigateToAbsolute]);

  const goNext = useCallback(() => {
    const abs = stateRef.current.page * stateRef.current.perPage - stateRef.current.perPage + stateRef.current.selectedIndex;
    if (abs < stateRef.current.total - 1) navigateToAbsolute(abs + 1);
  }, [navigateToAbsolute]);

  // Keyboard navigation in single-image mode
  useEffect(() => {
    const handler = (e) => {
      if (viewMode !== 'single') return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode, goPrev, goNext]);

  // ---- Event handlers ----

  const handleMediumChange = (e) => {
    setMedium(e.target.value);
    setPage(1);
  };

  const handleColumnChange = (e) => {
    setColumns(Number(e.target.value));
  };

  const handleSortFieldChange = (e) => {
    setSortField(e.target.value);
    setPage(1);
  };

  const handleSortDirToggle = () => {
    setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    setPage(1);
  };

  const handlePerPageChange = (e) => {
    setPerPage(Number(e.target.value));
    setPage(1);
  };

  const handlePageChange = (_e, value) => {
    setPage(value);
  };

  const handleOpenSingle = (idx) => {
    try {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    } catch {
      // ignore
    }
    setSelectedIndex(idx);
    setViewMode('single');
  };

  const handleBackToGrid = () => {
    setViewMode('grid');
    try {
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved) {
        requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
      }
    } catch {
      // ignore
    }
  };

  // Compute xs grid size from column count
  const colSizes = { 1: 12, 2: 6, 3: 4, 4: 3, 6: 2 };
  const xs = colSizes[columns] || 4;

  const isLoading = isFetchingMedia || isFetchingImages;
  const pageCount = Math.ceil(total / perPage) || 1;

  // Determine empty-state type
  const notMounted =
    (mediaError && mediaError.includes('not_mounted')) ||
    (imagesError && imagesError.includes('not_mounted'));
  const noImages = !notMounted && total === 0 && dbExists;
  const dbNotInitialised = !notMounted && total === 0 && !dbExists;

  const currentImage = images[selectedIndex];

  return (
    <Box>
      {/* Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }} disabled={isLoading}>
          <InputLabel>{t('view.medium_selector')}</InputLabel>
          <Select
            value={medium || ''}
            label={t('view.medium_selector')}
            onChange={handleMediumChange}
          >
            {availableMedia.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 130 }} disabled={isLoading}>
          <InputLabel>{t('view.sort_by')}</InputLabel>
          <Select value={sortField} label={t('view.sort_by')} onChange={handleSortFieldChange}>
            <MenuItem value="date">{t('view.filter.date')}</MenuItem>
            <MenuItem value="filename">{t('view.filter.order_by_filename')}</MenuItem>
            <MenuItem value="id">{t('view.filter.order_by_id')}</MenuItem>
          </Select>
        </FormControl>

        <IconButton
          onClick={handleSortDirToggle}
          disabled={isLoading}
          aria-label={sortDir === 'asc' ? 'sort descending' : 'sort ascending'}
        >
          {sortDir === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
        </IconButton>

        <FormControl size="small" sx={{ minWidth: 110 }} disabled={isLoading}>
          <InputLabel>{t('view.per_page')}</InputLabel>
          <Select value={perPage} label={t('view.per_page')} onChange={handlePerPageChange}>
            {[10, 25, 50, 100, 200].map((n) => (
              <MenuItem key={n} value={n}>
                {n}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }} disabled={isLoading}>
          <InputLabel>{t('view.columns')}</InputLabel>
          <Select value={columns} label={t('view.columns')} onChange={handleColumnChange}>
            {[1, 2, 3, 4, 6].map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {/* Loading */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Error / empty states */}
      {!isLoading && notMounted && (
        <Alert severity="warning">{t('view.not_mounted')}</Alert>
      )}
      {!isLoading && noImages && medium && (
        <Alert severity="info">{t('view.no_images')}</Alert>
      )}
      {!isLoading && dbNotInitialised && medium && (
        <Alert severity="info">
          {t('view.no_database')}{' '}
          <Link component={RouterLink} to="/">
            {t('view.go_to_backup')}
          </Link>
        </Alert>
      )}

      {/* Thumbnail grid */}
      {!isLoading && !notMounted && images.length > 0 && viewMode === 'grid' && (
        <>
          <Grid container spacing={2}>
            {images.map((image, idx) => (
              <Grid item xs={xs} key={image.ID}>
                <Card
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleOpenSingle(idx)}
                >
                  <CardMedia
                    component="img"
                    height="150"
                    image={`https://placehold.co/200x150?text=${encodeURIComponent(image.File_Name)}`}
                    alt={image.File_Name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="caption" noWrap display="block">
                      {image.File_Name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {pageCount > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Pagination
                count={pageCount}
                page={page}
                onChange={handlePageChange}
                disabled={isLoading}
              />
            </Box>
          )}
        </>
      )}

      {/* Single image view */}
      {!isLoading && viewMode === 'single' && currentImage && (
        <Box>
          {/* Back to grid */}
          <Box sx={{ mb: 2 }}>
            <Button variant="outlined" onClick={handleBackToGrid}>
              {t('view.images.back_to_grid')}
            </Button>
          </Box>

          {/* Image */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <img
              src={`https://placehold.co/800x600?text=${encodeURIComponent(currentImage.File_Name)}`}
              alt={currentImage.File_Name}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          </Box>

          {/* Filename + date */}
          <Typography variant="body2" sx={{ textAlign: 'center' }}>
            {currentImage.File_Name}
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ textAlign: 'center', mb: 2 }}>
            {currentImage.Create_Date}
          </Typography>

          {/* Navigation toolbar */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <IconButton onClick={goFirst} disabled={currentAbsoluteIndex === 0} aria-label="first">
              <SkipPreviousIcon />
            </IconButton>
            <IconButton
              onClick={goPrev}
              disabled={currentAbsoluteIndex === 0}
              aria-label="previous"
            >
              <NavigateBeforeIcon />
            </IconButton>

            <Typography variant="body2" sx={{ minWidth: 80, textAlign: 'center' }}>
              {currentAbsoluteIndex + 1} / {total}
            </Typography>

            <IconButton
              onClick={goNext}
              disabled={currentAbsoluteIndex >= total - 1}
              aria-label="next"
            >
              <NavigateNextIcon />
            </IconButton>
            <IconButton
              onClick={goLast}
              disabled={currentAbsoluteIndex >= total - 1}
              aria-label="last"
            >
              <SkipNextIcon />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
}
