import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import useAsyncAction from '../hooks/useAsyncAction';

const PREFS_KEY = 'lbb-view-preferences';

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
  const fetchImagesFn = useCallback(
    async (med, pg, pp, sf, sd) => {
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
    },
    []
  );

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

  const handleMediumChange = (e) => {
    setMedium(e.target.value);
    setPage(1);
  };

  const handleColumnChange = (e) => {
    setColumns(Number(e.target.value));
  };

  // Compute xs grid size from column count
  const colSizes = { 1: 12, 2: 6, 3: 4, 4: 3, 6: 2 };
  const xs = colSizes[columns] || 4;

  const isLoading = isFetchingMedia || isFetchingImages;

  // Determine empty-state type
  const notMounted =
    (mediaError && mediaError.includes('not_mounted')) ||
    (imagesError && imagesError.includes('not_mounted'));
  const noImages = !notMounted && total === 0 && dbExists;
  const dbNotInitialised = !notMounted && total === 0 && !dbExists;

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

        <FormControl size="small" sx={{ minWidth: 120 }} disabled={isLoading}>
          <InputLabel>{t('view.columns')}</InputLabel>
          <Select
            value={columns}
            label={t('view.columns')}
            onChange={handleColumnChange}
          >
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
        <Grid container spacing={2}>
          {images.map((image, idx) => (
            <Grid item xs={xs} key={image.ID}>
              <Card
                sx={{ cursor: 'pointer' }}
                onClick={() => {
                  setSelectedIndex(idx);
                  setViewMode('single');
                }}
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
      )}

      {/* Single image view — full implementation in Slice 5 */}
      {!isLoading && viewMode === 'single' && images[selectedIndex] && (
        <Box>
          <Box sx={{ textAlign: 'center' }}>
            <img
              src={`https://placehold.co/800x600?text=${encodeURIComponent(images[selectedIndex].File_Name)}`}
              alt={images[selectedIndex].File_Name}
              style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
            />
          </Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {images[selectedIndex].File_Name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {images[selectedIndex].Create_Date}
          </Typography>
        </Box>
      )}
    </Box>
  );
}
