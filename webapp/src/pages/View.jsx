import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  Link,
  MenuItem,
  Pagination,
  Select,
  Typography,
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import api from '../utils/api';
import useAsyncAction from '../hooks/useAsyncAction';
import PageSection from '../components/PageSection';
import FilterBar, { DEFAULT_FILTERS } from '../components/FilterBar';
import GridCard from '../components/view/GridCard';
import SingleView from '../components/view/SingleView';
import { countActiveFilters, SLIDESHOW_INTERVALS } from '../components/view/viewMedia';
import {
  classifyMedia,
  createDay,
  formatCreateDate,
  perPageOptions,
  showsLowResImageNotice,
} from '../utils/viewMediaKinds';

// Filter state <-> URL search params <-> API query params.
const FILTER_FIELDS = [
  { key: 'ratings', url: 'ratings', api: 'rating', list: true },
  { key: 'date', url: 'date', api: 'date' },
  { key: 'dateFrom', url: 'dateFrom', api: 'date_from' },
  { key: 'dateTo', url: 'dateTo', api: 'date_to' },
  { key: 'filename', url: 'filename', api: 'filename' },
  { key: 'camera', url: 'camera', api: 'camera' },
  { key: 'fileType', url: 'fileType', api: 'file_type' },
  { key: 'directory', url: 'directory', api: 'directory' },
  { key: 'extension', url: 'extension', api: 'extension', list: true },
  { key: 'socialPublish', url: 'socialPublish', api: 'social_publish', list: true },
  { key: 'socialPublished', url: 'socialPublished', api: 'social_published', list: true },
  { key: 'varField', url: 'varField', api: 'var_field' },
  { key: 'varValue', url: 'varValue', api: 'var_value' },
];

function filtersToParams(filters) {
  const params = {};
  for (const f of FILTER_FIELDS) {
    const v = filters[f.key];
    if (f.list ? v && v.length > 0 : v) params[f.api] = f.list ? v.join(',') : v;
  }
  return params;
}

function filtersToSearch(filters) {
  const params = {};
  for (const f of FILTER_FIELDS) {
    const v = filters[f.key];
    if (f.list ? v && v.length > 0 : v) params[f.url] = f.list ? v.join(',') : v;
  }
  return params;
}

function searchToFilters(searchParams) {
  const filters = { ...DEFAULT_FILTERS };
  for (const f of FILTER_FIELDS) {
    const v = searchParams.get(f.url);
    if (v) filters[f.key] = f.list ? v.split(',') : v;
  }
  return filters;
}

const PREFS_KEY = 'lbb-view-preferences';
const SCROLL_KEY = 'lbb-view-scroll';
const SAVED_FLASH_MS = 2500;

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

const COLUMN_OPTIONS = [1, 2, 3, 4, 6];
const COLUMN_SIZES = { 1: 12, 2: 6, 3: 4, 4: 3, 6: 2 };

export default function View() {
  const { t } = useLanguage();
  const { constants } = useConfig();
  const [searchParams, setSearchParams] = useSearchParams();

  const prefs = useMemo(() => loadPreferences(), []);
  const gridColumnsConst = constants?.const_VIEW_GRID_COLUMNS;
  const perPageChoices = useMemo(() => perPageOptions(gridColumnsConst), [gridColumnsConst]);
  const defaultColumns = parseInt(String(gridColumnsConst || '3').replace(/'/g, ''), 10) || 3;
  const maxZoom = parseFloat(String(constants?.const_VIEW_MAGNIFYING_GLASS_ZOOM || '').replace(/'/g, '')) || 8;

  const [mediaInfo, setMediaInfo] = useState({ media: [], mounted: {} });
  const [medium, setMedium] = useState(null);
  const [readyMedium, setReadyMedium] = useState(null);
  const [images, setImages] = useState([]);
  const [total, setTotal] = useState(0);
  const [dbExists, setDbExists] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(prefs.perPage || null);
  const [sortField, setSortField] = useState(prefs.sortField || 'date');
  const [sortDir, setSortDir] = useState(prefs.sortDir || 'desc');
  const [columns, setColumns] = useState(prefs.columns || null);
  const [filters, setFilters] = useState(() => searchToFilters(searchParams));
  const [viewStats, setViewStats] = useState(null);
  const [social, setSocial] = useState({ configured: [], bits: {} });
  const [details, setDetails] = useState(null);

  // Rating / comment / delete-rejected state
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState(null);
  const [commentError, setCommentError] = useState(null);
  const [savedVisible, setSavedVisible] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogError, setDeleteDialogError] = useState(null);
  const [deleteDialogWarning, setDeleteDialogWarning] = useState(null);
  const ratingDebounceRef = useRef({});
  const commentPendingRef = useRef(null); // { imageId, value, timer }
  const savedTimerRef = useRef(null);
  const pendingIndexRef = useRef(null);
  const requestSeqRef = useRef(0);

  // Slideshow / fullscreen state
  const [isPlaying, setIsPlaying] = useState(false);
  const [intervalSeconds, setIntervalSeconds] = useState(() =>
    SLIDESHOW_INTERVALS.includes(prefs.slideshowInterval) ? prefs.slideshowInterval : 3
  );
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  // Effective per-page / columns once constants are known (view.php:488-495).
  const effectivePerPage = perPage && perPageChoices.includes(perPage) ? perPage : perPageChoices[1];
  const effectiveColumns = columns && COLUMN_OPTIONS.includes(columns) ? columns : COLUMN_OPTIONS.includes(defaultColumns) ? defaultColumns : 3;

  // Ref with the latest state for callbacks/timers without stale closures.
  const stateRef = useRef({});
  useEffect(() => {
    stateRef.current = { images, selectedIndex, page, perPage: effectivePerPage, total };
  });

  // ---- API ----
  const fetchMediaFn = useCallback(async () => (await api.get('/view/media')).data, []);
  const { execute: fetchMedia, isExecuting: isFetchingMedia, error: mediaError } = useAsyncAction(fetchMediaFn);

  const fetchImagesFn = useCallback(async (params) => (await api.get('/view/images', { params })).data, []);
  const { execute: fetchImages, isExecuting: isFetchingImages, error: imagesError } = useAsyncAction(fetchImagesFn);

  const deleteRejectedFn = useCallback(async (ids) => api.post('/view/delete-rejected', { medium, ids }), [medium]);
  const { execute: executeDeleteRejected, isExecuting: isDeletingRejected } = useAsyncAction(deleteRejectedFn);

  // Media list + default medium (view.php:563-573) and configured social services.
  useEffect(() => {
    fetchMedia()
      .then((data) => {
        const list = data.media || [];
        setMediaInfo({ media: list, mounted: data.mounted || {} });
        const fromUrl = searchParams.get('medium');
        setMedium(fromUrl && list.includes(fromUrl) ? fromUrl : data.default || list[0] || null);
      })
      .catch(() => {
        // error is tracked in mediaError
      });
    api
      .get('/view/social-services')
      .then((res) => setSocial({ configured: res.data.configured || [], bits: res.data.bits || {} }))
      .catch(() => {});
    // Only on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchMedia]);

  // Opening a medium runs lib_view.py --action init first (view.php:644-646).
  useEffect(() => {
    if (!medium) return undefined;
    let cancelled = false;
    setReadyMedium(null);
    api
      .get('/view/init', { params: { medium } })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReadyMedium(medium);
      });
    return () => {
      cancelled = true;
    };
  }, [medium]);

  const filterParams = useMemo(() => filtersToParams(filters), [filters]);

  // Load images when medium / page / sort / perPage / filters change.
  useEffect(() => {
    if (!readyMedium) return;
    const seq = ++requestSeqRef.current;
    fetchImages({
      medium: readyMedium,
      page,
      per_page: effectivePerPage,
      sort: sortField,
      dir: sortDir,
      ...filterParams,
    })
      .then((data) => {
        if (seq !== requestSeqRef.current) return;
        const list = data.images || [];
        setImages(list);
        setTotal(data.total || 0);
        setDbExists(data.dbExists !== false);
        if (pendingIndexRef.current !== null) {
          setSelectedIndex(Math.max(0, Math.min(pendingIndexRef.current, list.length - 1)));
          pendingIndexRef.current = null;
        }
      })
      .catch(() => {
        if (seq !== requestSeqRef.current) return;
        setImages([]);
        setTotal(0);
      });
  }, [readyMedium, page, effectivePerPage, sortField, sortDir, filterParams, fetchImages]);

  // Faceted filter counts follow the active filters (view.php:763-827).
  useEffect(() => {
    if (!readyMedium) return undefined;
    let cancelled = false;
    api
      .get('/view/stats', { params: { medium: readyMedium, ...filterParams } })
      .then((res) => {
        if (!cancelled) setViewStats(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [readyMedium, filterParams]);

  // Persist preferences
  useEffect(() => {
    savePreferences({ perPage, sortField, sortDir, columns, slideshowInterval: intervalSeconds });
  }, [perPage, sortField, sortDir, columns, intervalSeconds]);

  const currentImage = viewMode === 'single' ? images[selectedIndex] : null;
  const currentImageId = currentImage?.ID;

  // Media details for the single view (kind, GoPro LRV proxy notice).
  useEffect(() => {
    if (!currentImageId || !readyMedium) return undefined;
    let cancelled = false;
    api
      .get('/view/details', { params: { medium: readyMedium, id: currentImageId } })
      .then((res) => {
        if (!cancelled) setDetails({ id: currentImageId, media: res.data.media });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentImageId, readyMedium]);

  const currentMedia = useMemo(() => {
    if (!currentImage) return null;
    if (details && details.id === currentImage.ID) return details.media;
    const kind = classifyMedia(currentImage.File_Name, constants);
    return { kind, lowResImage: showsLowResImageNotice(kind), lowResVideo: false };
  }, [currentImage, details, constants]);

  // ---- Saving (rating / comment / social) ----
  const flashSaved = useCallback(() => {
    setSavedVisible(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setSavedVisible(false), SAVED_FLASH_MS);
  }, []);

  const saveMetadata = useCallback(
    (payload) => api.post('/view/rating', { medium, ...payload }),
    [medium]
  );

  const updateImage = useCallback((imageId, patch) => {
    setImages((prev) => prev.map((img) => (img.ID === imageId ? { ...img, ...patch } : img)));
  }, []);

  const handleRatingChange = useCallback(
    (imageId, newRating) => {
      const prevRating = stateRef.current.images.find((img) => img.ID === imageId)?.LbbRating ?? 0;
      updateImage(imageId, { LbbRating: newRating });
      setRatingError(null);

      if (ratingDebounceRef.current[imageId]) clearTimeout(ratingDebounceRef.current[imageId]);
      ratingDebounceRef.current[imageId] = setTimeout(async () => {
        delete ratingDebounceRef.current[imageId];
        try {
          await saveMetadata({ imageId, rating: newRating });
          flashSaved();
        } catch (err) {
          setRatingError(err?.response?.data?.error || err?.message || t('view.rating_save_error'));
          updateImage(imageId, { LbbRating: prevRating });
        }
      }, 800);
    },
    [saveMetadata, updateImage, flashSaved, t]
  );

  const saveComment = useCallback(
    async ({ imageId, value, previous }) => {
      try {
        await saveMetadata({ imageId, comment: value });
        flashSaved();
      } catch (err) {
        setCommentError(err?.response?.data?.error || err?.message || t('view.rating_save_error'));
        updateImage(imageId, { Comment: previous });
        if (stateRef.current.images[stateRef.current.selectedIndex]?.ID === imageId) setComment(previous ?? '');
      }
    },
    [saveMetadata, updateImage, flashSaved, t]
  );

  // Save a pending (debounced) comment right away, e.g. before navigating.
  const flushComment = useCallback(() => {
    const pending = commentPendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    commentPendingRef.current = null;
    saveComment(pending);
  }, [saveComment]);

  const handleCommentChange = useCallback(
    (e) => {
      const value = e.target.value;
      const img = stateRef.current.images[stateRef.current.selectedIndex];
      if (!img) return;
      setComment(value);
      setCommentError(null);
      const previous = commentPendingRef.current?.imageId === img.ID ? commentPendingRef.current.previous : img.Comment ?? '';
      if (commentPendingRef.current) clearTimeout(commentPendingRef.current.timer);
      updateImage(img.ID, { Comment: value });
      const pending = { imageId: img.ID, value, previous };
      pending.timer = setTimeout(() => {
        commentPendingRef.current = null;
        saveComment(pending);
      }, 1200);
      commentPendingRef.current = pending;
    },
    [updateImage, saveComment]
  );

  // Sync the comment box with the shown image.
  useEffect(() => {
    if (!currentImageId) return;
    flushComment();
    const img = stateRef.current.images.find((i) => i.ID === currentImageId);
    setComment(img?.Comment ?? '');
    setCommentError(null);
    setRatingError(null);
  }, [currentImageId, flushComment]);

  const handleSocialToggle = useCallback(
    async (service, publish) => {
      const img = stateRef.current.images[stateRef.current.selectedIndex];
      if (!img) return;
      const res = await api.post('/view/social-publish', { medium, imageId: img.ID, service, publish });
      updateImage(img.ID, {
        social_publish: res.data.social_publish,
        social_published: res.data.social_published ?? img.social_published,
      });
      flashSaved();
    },
    [medium, updateImage, flashSaved]
  );

  // ---- Navigation (keeps all filters; view.php keeps them in GET_PARAMETER) ----
  const navigateToAbsolute = useCallback((absIdx) => {
    const { perPage: pp, page: currentPage, total: tot } = stateRef.current;
    if (tot <= 0) return;
    const idx = Math.max(0, Math.min(absIdx, tot - 1));
    const targetPage = Math.floor(idx / pp) + 1;
    const targetIdx = idx % pp;
    if (targetPage !== currentPage) {
      pendingIndexRef.current = targetIdx;
      setPage(targetPage);
    } else {
      setSelectedIndex(targetIdx);
    }
  }, []);

  const currentAbsoluteIndex = (page - 1) * effectivePerPage + selectedIndex;
  const absIndex = () => (stateRef.current.page - 1) * stateRef.current.perPage + stateRef.current.selectedIndex;

  const goFirst = useCallback(() => {
    setIsPlaying(false);
    navigateToAbsolute(0);
  }, [navigateToAbsolute]);
  const goLast = useCallback(() => {
    setIsPlaying(false);
    navigateToAbsolute(stateRef.current.total - 1);
  }, [navigateToAbsolute]);
  const goPrev = useCallback(() => {
    setIsPlaying(false);
    const abs = absIndex();
    if (abs > 0) navigateToAbsolute(abs - 1);
  }, [navigateToAbsolute]);
  const goNext = useCallback(() => {
    setIsPlaying(false);
    const abs = absIndex();
    if (abs < stateRef.current.total - 1) navigateToAbsolute(abs + 1);
  }, [navigateToAbsolute]);

  // Slideshow: wraps from the last image to the first (view.php:196).
  const slideshowAdvance = useCallback(() => {
    const abs = absIndex();
    navigateToAbsolute(abs < stateRef.current.total - 1 ? abs + 1 : 0);
  }, [navigateToAbsolute]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    const timer = setInterval(slideshowAdvance, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [isPlaying, intervalSeconds, slideshowAdvance]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((playing) => {
      if (!playing) setFullscreenOpen(true); // the slideshow runs in the overlay
      return !playing;
    });
  }, []);

  const handleCloseFullscreen = useCallback(() => {
    setFullscreenOpen(false);
    setIsPlaying(false);
  }, []);

  // Keyboard navigation in single view (not while typing).
  useEffect(() => {
    const handler = (e) => {
      if (viewMode !== 'single') return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target?.isContentEditable) return;
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [viewMode, goPrev, goNext]);

  // ---- Filters ----
  const handleFiltersChange = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      setPage(1);
      const urlParams = filtersToSearch(newFilters);
      if (medium) urlParams.medium = medium;
      setSearchParams(urlParams);
    },
    [setSearchParams, medium]
  );

  // ---- Delete rejected (view.php:180-182, 718-735) ----
  // Only offered when the rating filter is exactly "rejected"; deletes the
  // rejected files on the current page.
  const rejectedFilterOnly = filters.ratings.length === 1 && filters.ratings[0] === '-1';
  const rejectedOnPage = images.filter((img) => Number(img.LbbRating) === -1);

  const handleDeleteRejectedConfirm = async () => {
    setDeleteDialogError(null);
    setDeleteDialogWarning(null);
    try {
      const response = await executeDeleteRejected(rejectedOnPage.map((img) => img.ID));
      const data = response?.data;
      // PHP drops the rating filter after deleting (view.php:600).
      const afterDelete = () => handleFiltersChange({ ...filters, ratings: [] });
      if (data && !data.success) {
        setDeleteDialogWarning(t('view.delete_rejected_partial').replace('{error}', data.error || ''));
        setTimeout(() => {
          setDeleteDialogOpen(false);
          afterDelete();
        }, 3000);
      } else {
        setDeleteDialogOpen(false);
        afterDelete();
      }
    } catch (err) {
      setDeleteDialogError(err?.response?.data?.error || err?.message || t('view.delete_rejected_partial').replace('{error}', ''));
    }
  };

  // ---- Grid / single view switching ----
  const handleOpenSingle = (idx) => {
    try {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    } catch {
      // ignore
    }
    setSelectedIndex(idx);
    setViewMode('single');
    window.scrollTo(0, 0);
  };

  const handleBackToGrid = () => {
    flushComment();
    setIsPlaying(false);
    setFullscreenOpen(false);
    setViewMode('grid');
    try {
      const saved = sessionStorage.getItem(SCROLL_KEY);
      if (saved) requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
    } catch {
      // ignore
    }
  };

  const handleMediumChange = (e) => {
    const next = e.target.value;
    setMedium(next);
    setPage(1);
    setViewMode('grid');
    setSearchParams({ ...filtersToSearch(filters), medium: next });
  };

  const isLoading = isFetchingMedia || isFetchingImages || (medium && !readyMedium);
  const pageCount = Math.ceil(total / effectivePerPage) || 1;
  const xs = COLUMN_SIZES[effectiveColumns] || 4;

  const notMounted =
    (mediaError && mediaError.includes('not_mounted')) ||
    (imagesError && imagesError.includes('not_mounted'));
  const noImages = !notMounted && total === 0 && dbExists;
  const dbNotInitialised = !notMounted && total === 0 && !dbExists;
  const filtered = countActiveFilters(filters) > 0;

  const dateFormat = (() => {
    const f = t('view.date_format');
    return f && f !== 'view.date_format' ? f : 'Y-m-d';
  })();

  // Grid items with date headers when sorted by date (view.php:1200-1203).
  const gridItems = [];
  let lastDay = null;
  images.forEach((image, idx) => {
    if (sortField === 'date') {
      const day = createDay(image.Create_Date);
      if (day !== lastDay) {
        gridItems.push(
          <Grid item xs={12} key={`day-${day}-${idx}`}>
            <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600, mt: idx === 0 ? 0 : 1 }} data-testid="date-header">
              {formatCreateDate(image.Create_Date, dateFormat)}
            </Typography>
          </Grid>
        );
        lastDay = day;
      }
    }
    gridItems.push(
      <Grid item xs={Math.max(xs, 6)} sm={xs} key={image.ID}>
        <GridCard
          image={image}
          medium={medium}
          constants={constants}
          socialServices={social.configured}
          socialBits={social.bits}
          onOpen={() => handleOpenSingle(idx)}
          onRate={handleRatingChange}
        />
      </Grid>
    );
  });

  return (
    <Box>
      {isLoading && viewMode === 'single' && <LinearProgress sx={{ mb: 1 }} />}

      {viewMode === 'single' && currentImage ? (
        <SingleView
          medium={medium}
          image={currentImage}
          media={currentMedia}
          position={currentAbsoluteIndex + 1}
          total={total}
          filtered={filtered}
          maxZoom={maxZoom}
          onBack={handleBackToGrid}
          onFirst={goFirst}
          onPrev={goPrev}
          onNext={goNext}
          onLast={goLast}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          intervalSeconds={intervalSeconds}
          onIntervalChange={setIntervalSeconds}
          fullscreenOpen={fullscreenOpen}
          onOpenFullscreen={() => setFullscreenOpen(true)}
          onCloseFullscreen={handleCloseFullscreen}
          onRate={handleRatingChange}
          ratingError={ratingError}
          onDismissRatingError={() => setRatingError(null)}
          comment={comment}
          onCommentChange={handleCommentChange}
          commentError={commentError}
          onDismissCommentError={() => setCommentError(null)}
          saved={savedVisible}
          socialServices={social.configured}
          socialBits={social.bits}
          onSocialToggle={handleSocialToggle}
        />
      ) : (
        <PageSection variant="plain">
          {/* Controls */}
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 190 }} disabled={isFetchingMedia}>
              <InputLabel id="view-medium-label">{t('view.medium_selector')}</InputLabel>
              <Select
                labelId="view-medium-label"
                value={medium || ''}
                label={t('view.medium_selector')}
                onChange={handleMediumChange}
                data-testid="medium-select"
              >
                {mediaInfo.media.map((m) => (
                  <MenuItem key={m} value={m}>
                    {t(`view.medium_options.${m}`)}
                    {mediaInfo.mounted[m] === false ? ` (${t('view.medium_options.not_mounted')})` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel id="view-sort-label">{t('view.sort_by')}</InputLabel>
              <Select
                labelId="view-sort-label"
                value={sortField}
                label={t('view.sort_by')}
                onChange={(e) => {
                  setSortField(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="date">{t('view.filter.date')}</MenuItem>
                <MenuItem value="filename">{t('view.filter.order_by_filename')}</MenuItem>
                <MenuItem value="id">{t('view.filter.order_by_id')}</MenuItem>
              </Select>
            </FormControl>

            <IconButton
              onClick={() => {
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                setPage(1);
              }}
              aria-label={sortDir === 'asc' ? t('view.grid.sort_descending') : t('view.grid.sort_ascending')}
              sx={{ width: 44, height: 44 }}
            >
              {sortDir === 'asc' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
            </IconButton>

            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel id="view-perpage-label">{t('view.per_page')}</InputLabel>
              <Select
                labelId="view-perpage-label"
                value={effectivePerPage}
                label={t('view.per_page')}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
              >
                {perPageChoices.map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 110 }}>
              <InputLabel id="view-columns-label">{t('view.columns')}</InputLabel>
              <Select
                labelId="view-columns-label"
                value={effectiveColumns}
                label={t('view.columns')}
                onChange={(e) => setColumns(Number(e.target.value))}
              >
                {COLUMN_OPTIONS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {rejectedFilterOnly && (
              <Button
                variant="outlined"
                color="error"
                disabled={isLoading || rejectedOnPage.length === 0}
                startIcon={<WarningAmberIcon />}
                onClick={() => {
                  setDeleteDialogError(null);
                  setDeleteDialogWarning(null);
                  setDeleteDialogOpen(true);
                }}
                sx={{ minHeight: 44 }}
                data-testid="delete-rejected-button"
              >
                {t('view.delete_rejected_button')}
              </Button>
            )}

            {!isLoading && total > 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ ml: { sm: 'auto' } }} data-testid="grid-summary">
                {t('view.grid.summary')
                  .replace('{count}', String(total))
                  .replace('{page}', String(page))
                  .replace('{pages}', String(pageCount))}
              </Typography>
            )}
          </Box>

          {/* Filter bar */}
          <FilterBar filters={filters} onFiltersChange={handleFiltersChange} stats={viewStats} />

          {/* Loading */}
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Error / empty states */}
          {!isLoading && notMounted && <Alert severity="warning">{t('view.not_mounted')}</Alert>}
          {!isLoading && noImages && medium && <Alert severity="info">{t('view.no_images')}</Alert>}
          {!isLoading && dbNotInitialised && medium && (
            <Alert severity="info">
              {t('view.no_database')}{' '}
              <Link component={RouterLink} to="/">
                {t('view.go_to_backup')}
              </Link>
            </Alert>
          )}

          {/* Thumbnail grid */}
          {!isLoading && !notMounted && images.length > 0 && (
            <>
              <Grid container spacing={2}>
                {gridItems}
              </Grid>
              {pageCount > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
                  <Pagination count={pageCount} page={page} onChange={(_e, value) => setPage(value)} disabled={isLoading} />
                </Box>
              )}
            </>
          )}
        </PageSection>
      )}

      {/* Delete rejected dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !isDeletingRejected && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('view.delete_rejected_title')}</DialogTitle>
        <DialogContent>
          <Typography data-testid="delete-rejected-message">
            {t('view.delete_rejected_page_confirm')
              .replace('{count}', String(rejectedOnPage.length))
              .replace('{medium}', medium ? t(`view.medium_options.${medium}`) : '')}
          </Typography>
          {deleteDialogWarning && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              {deleteDialogWarning}
            </Alert>
          )}
          {deleteDialogError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {deleteDialogError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} disabled={isDeletingRejected}>
            {t('cancel')}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteRejectedConfirm}
            disabled={isDeletingRejected}
            startIcon={<WarningAmberIcon />}
            data-testid="delete-rejected-confirm"
          >
            {isDeletingRejected ? '…' : t('view.delete_rejected_button')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
