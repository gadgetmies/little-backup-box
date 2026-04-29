import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Pagination,
  Select,
  TextField,
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
import RatingWidget from '../components/RatingWidget';

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

  // Rating / comment / delete-rejected state
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState(null);
  const [commentError, setCommentError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogError, setDeleteDialogError] = useState(null);
  const [deleteDialogWarning, setDeleteDialogWarning] = useState(null);
  const ratingDebounceRef = useRef({});
  const commentDebounceRef = useRef(null);

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

  // ---- rating / delete-rejected ----
  const saveRatingFn = useCallback(
    async ({ imageId, rating, comment: cmt }) => {
      return api.post('/view/rating', { medium, imageId, rating, comment: cmt });
    },
    [medium]
  );

  const deleteRejectedFn = useCallback(async () => {
    return api.post('/view/delete-rejected', { medium });
  }, [medium]);

  const { execute: executeDeleteRejected, isExecuting: isDeletingRejected } =
    useAsyncAction(deleteRejectedFn);

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

  // ---- Rating / comment handlers ----

  const handleRatingChange = useCallback(
    (imageId, newRating) => {
      const prevRating = images.find((img) => img.ID === imageId)?.rating ?? 0;
      setImages((prev) =>
        prev.map((img) => (img.ID === imageId ? { ...img, rating: newRating } : img))
      );
      setRatingError(null);

      if (ratingDebounceRef.current[imageId]) {
        clearTimeout(ratingDebounceRef.current[imageId]);
      }
      ratingDebounceRef.current[imageId] = setTimeout(async () => {
        try {
          await saveRatingFn({ imageId, rating: newRating });
        } catch (err) {
          setRatingError(
            err?.response?.data?.error || err?.message || t('view.rating_save_error')
          );
          setImages((prev) =>
            prev.map((img) => (img.ID === imageId ? { ...img, rating: prevRating } : img))
          );
        }
      }, 800);
    },
    [images, saveRatingFn, t]
  );

  const handleCommentChange = useCallback(
    (e) => {
      const val = e.target.value;
      setComment(val);
      setCommentError(null);

      const currentImage = images[selectedIndex];
      if (!currentImage) return;
      const imageId = currentImage.ID;
      const prevComment = currentImage.comment ?? '';

      setImages((prev) =>
        prev.map((img) => (img.ID === imageId ? { ...img, comment: val } : img))
      );

      if (commentDebounceRef.current) clearTimeout(commentDebounceRef.current);
      commentDebounceRef.current = setTimeout(async () => {
        try {
          await saveRatingFn({ imageId, comment: val });
        } catch (err) {
          setCommentError(
            err?.response?.data?.error || err?.message || t('view.rating_save_error')
          );
          setComment(prevComment);
          setImages((prev) =>
            prev.map((img) => (img.ID === imageId ? { ...img, comment: prevComment } : img))
          );
        }
      }, 1200);
    },
    [images, selectedIndex, saveRatingFn, t]
  );

  const rejectedCount = images.filter((img) => img.rating === -1).length;

  const handleDeleteRejectedConfirm = async () => {
    setDeleteDialogError(null);
    setDeleteDialogWarning(null);
    try {
      const response = await executeDeleteRejected();
      const data = response?.data;
      if (data && !data.success) {
        setDeleteDialogWarning(data.error || t('view.delete_rejected_partial'));
        fetchImages(medium, page, perPage, sortField, sortDir)
          .then((d) => {
            setImages(d.images || []);
            setTotal(d.total || 0);
          })
          .catch(() => {});
        setTimeout(() => setDeleteDialogOpen(false), 3000);
      } else {
        setDeleteDialogOpen(false);
        fetchImages(medium, page, perPage, sortField, sortDir)
          .then((d) => {
            setImages(d.images || []);
            setTotal(d.total || 0);
          })
          .catch(() => {});
      }
    } catch (err) {
      setDeleteDialogError(
        err?.response?.data?.error || err?.message || 'Failed to delete rejected images'
      );
    }
  };

  // When opening single-image, sync comment state
  const handleOpenSingleWithComment = (idx) => {
    const img = images[idx];
    if (img) setComment(img.comment ?? '');
    setRatingError(null);
    setCommentError(null);
    handleOpenSingle(idx);
  };

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

        {viewMode === 'grid' && rejectedCount > 0 && (
          <Button
            variant="outlined"
            color="error"
            disabled={isLoading}
            onClick={() => {
              setDeleteDialogError(null);
              setDeleteDialogWarning(null);
              setDeleteDialogOpen(true);
            }}
          >
            {t('view.delete_rejected_button')}
          </Button>
        )}
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
                  data-testid="image-card"
                  sx={{ cursor: 'pointer', position: 'relative' }}
                  onClick={() => handleOpenSingleWithComment(idx)}
                >
                  <CardMedia
                    component="img"
                    height="150"
                    image={`https://placehold.co/200x150?text=${encodeURIComponent(image.File_Name)}`}
                    alt={image.File_Name}
                    sx={{ objectFit: 'cover' }}
                  />
                  <Box
                    sx={{
                      position: 'absolute',
                      bottom: 32,
                      left: 0,
                      right: 0,
                      bgcolor: 'rgba(0,0,0,0.55)',
                      display: 'flex',
                      justifyContent: 'center',
                      p: 0.5,
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <RatingWidget
                      size="small"
                      value={image.rating ?? 0}
                      onChange={(r) => handleRatingChange(image.ID, r)}
                    />
                  </Box>
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

          {/* Rating + comment */}
          <Box sx={{ mt: 3, maxWidth: 600, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
              <RatingWidget
                size="normal"
                value={currentImage.rating ?? 0}
                onChange={(r) => handleRatingChange(currentImage.ID, r)}
              />
            </Box>
            {ratingError && (
              <Alert severity="error" onClose={() => setRatingError(null)} sx={{ mb: 1 }}>
                {ratingError}
              </Alert>
            )}
            <TextField
              multiline
              fullWidth
              minRows={2}
              label={t('view.images.comment')}
              placeholder={t('view.comment_placeholder')}
              value={comment}
              onChange={handleCommentChange}
              inputProps={{ maxLength: 500 }}
              helperText={`${comment.length} / 500`}
            />
            {commentError && (
              <Alert severity="error" onClose={() => setCommentError(null)} sx={{ mt: 1 }}>
                {commentError}
              </Alert>
            )}
          </Box>
        </Box>
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
          <Typography>
            {(t('view.delete_rejected_confirm') || 'Delete {count} rejected images from {medium}? This cannot be undone.')
              .replace('{count}', String(rejectedCount))
              .replace('{medium}', medium || 'selected medium')}
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
            {t('cancel') || 'Cancel'}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteRejectedConfirm}
            disabled={isDeletingRejected}
          >
            {isDeletingRejected ? '…' : (t('view.delete_rejected_button') || 'Delete rejected')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
