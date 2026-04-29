import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import api from '../utils/api';
import RatingWidget from '../components/RatingWidget';
import useAsyncAction from '../hooks/useAsyncAction';

function View() {
  const { t } = useLanguage();
  useConfig();
  const [storagePath, setStoragePath] = useState('');
  const [images, setImages] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [selectedImage, setSelectedImage] = useState(null);
  const [comment, setComment] = useState('');
  const [ratingError, setRatingError] = useState(null);
  const [commentError, setCommentError] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogError, setDeleteDialogError] = useState(null);
  const [deleteDialogWarning, setDeleteDialogWarning] = useState(null);

  const ratingDebounceRef = useRef({});
  const commentDebounceRef = useRef(null);

  // ── API actions ─────────────────────────────────────────────────────────

  const saveRatingFn = useCallback(
    async ({ imageId, rating, comment: cmt }) => {
      return api.post('/view/rating', {
        storagePath,
        imageId,
        rating,
        comment: cmt,
      });
    },
    [storagePath]
  );

  const deleteRejectedFn = useCallback(async () => {
    return api.post('/view/delete-rejected', { storagePath });
  }, [storagePath]);

  const { execute: executeDeleteRejected, isExecuting: isDeletingRejected } =
    useAsyncAction(deleteRejectedFn);

  // ── Load images ──────────────────────────────────────────────────────────

  const loadImages = useCallback(async () => {
    try {
      const response = await api.get('/view/images', {
        params: { storagePath },
      });
      setImages(response.data.images || []);
    } catch (error) {
      console.error('Failed to load images:', error);
    }
  }, [storagePath]);

  useEffect(() => {
    if (storagePath) {
      loadImages();
    }
  }, [storagePath, loadImages]);

  const handleInit = async () => {
    try {
      await api.get('/view/init', { params: { mountpoint: storagePath } });
      loadImages();
    } catch (error) {
      console.error('Failed to initialize view:', error);
    }
  };

  // ── Rating change with optimistic update ────────────────────────────────

  const handleRatingChange = useCallback(
    (imageId, newRating) => {
      // Optimistic update
      setImages((prev) =>
        prev.map((img) => (img.ID === imageId ? { ...img, rating: newRating } : img))
      );
      if (selectedImage?.ID === imageId) {
        setSelectedImage((prev) => (prev ? { ...prev, rating: newRating } : prev));
      }
      setRatingError(null);

      const prevRating =
        images.find((img) => img.ID === imageId)?.rating ?? 0;

      // Clear existing debounce for this image
      if (ratingDebounceRef.current[imageId]) {
        clearTimeout(ratingDebounceRef.current[imageId]);
      }

      ratingDebounceRef.current[imageId] = setTimeout(async () => {
        try {
          await saveRatingFn({ imageId, rating: newRating });
        } catch (err) {
          // Rollback
          const msg =
            err?.response?.data?.error ||
            err?.message ||
            t('view.rating_save_error');
          setRatingError(msg);
          setImages((prev) =>
            prev.map((img) => (img.ID === imageId ? { ...img, rating: prevRating } : img))
          );
          if (selectedImage?.ID === imageId) {
            setSelectedImage((prev) => (prev ? { ...prev, rating: prevRating } : prev));
          }
        }
      }, 800);
    },
    [images, selectedImage, saveRatingFn, t]
  );

  // ── Comment change with optimistic update ───────────────────────────────

  const handleCommentChange = useCallback(
    (e) => {
      const val = e.target.value;
      setComment(val);
      setCommentError(null);

      if (!selectedImage) return;

      const imageId = selectedImage.ID;
      const prevComment = selectedImage.comment ?? '';

      // Optimistic update
      setSelectedImage((prev) => (prev ? { ...prev, comment: val } : prev));
      setImages((prev) =>
        prev.map((img) => (img.ID === imageId ? { ...img, comment: val } : img))
      );

      if (commentDebounceRef.current) {
        clearTimeout(commentDebounceRef.current);
      }

      commentDebounceRef.current = setTimeout(async () => {
        try {
          await saveRatingFn({ imageId, comment: val });
        } catch (err) {
          const msg =
            err?.response?.data?.error ||
            err?.message ||
            t('view.rating_save_error');
          setCommentError(msg);
          // Rollback
          setComment(prevComment);
          setSelectedImage((prev) => (prev ? { ...prev, comment: prevComment } : prev));
          setImages((prev) =>
            prev.map((img) =>
              img.ID === imageId ? { ...img, comment: prevComment } : img
            )
          );
        }
      }, 1200);
    },
    [selectedImage, saveRatingFn, t]
  );

  // When opening a single image, sync comment state
  const openSingleImage = (image) => {
    setSelectedImage(image);
    setComment(image.comment ?? '');
    setRatingError(null);
    setCommentError(null);
    setViewMode('single');
  };

  // ── Delete rejected ──────────────────────────────────────────────────────

  const rejectedCount = images.filter((img) => img.rating === -1).length;

  const handleDeleteRejectedConfirm = async () => {
    setDeleteDialogError(null);
    setDeleteDialogWarning(null);
    try {
      const response = await executeDeleteRejected();
      const data = response?.data;
      if (data && !data.success) {
        setDeleteDialogWarning(data.error || t('view.delete_rejected_partial'));
        // Refresh list but keep dialog open briefly to show warning
        await loadImages();
        setTimeout(() => setDeleteDialogOpen(false), 3000);
      } else {
        setDeleteDialogOpen(false);
        await loadImages();
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        'Failed to delete rejected images';
      setDeleteDialogError(msg);
      // Keep dialog open
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

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
          onClick={() => setViewMode(viewMode === 'grid' ? 'single' : 'grid')}
          color="primary"
          aria-label="toggle view mode"
        >
          {viewMode === 'grid' ? <ViewListIcon /> : <GridViewIcon />}
        </IconButton>

        {/* Delete rejected button — only visible when rejected images exist */}
        {viewMode === 'grid' && rejectedCount > 0 && (
          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              setDeleteDialogError(null);
              setDeleteDialogWarning(null);
              setDeleteDialogOpen(true);
            }}
          >
            {t('view.delete_rejected_button')}
          </Button>
        )}
      </Stack>

      {viewMode === 'grid' ? (
        <Grid container spacing={2}>
          {images.map((image) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={image.ID}>
              <Card
                data-testid="image-card"
                sx={{ cursor: 'pointer', position: 'relative' }}
                onClick={() => openSingleImage(image)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={`${storagePath}/${image.Directory}/${image.File_Name}`}
                  alt={image.File_Name}
                />
                {/* Rating widget overlay at the bottom of the card */}
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 0,
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
                <CardContent sx={{ pb: '8px !important' }}>
                  <Typography variant="caption" noWrap>
                    {image.File_Name}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        selectedImage && (
          <Paper sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={`${storagePath}/${selectedImage.Directory}/${selectedImage.File_Name}`}
                alt={selectedImage.File_Name}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                }}
              />
              <Box sx={{ mt: 3 }}>
                <Typography variant="h4" gutterBottom>
                  {selectedImage.File_Name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedImage.Create_Date}
                </Typography>

                {/* Rating widget */}
                <Box sx={{ mt: 2, mb: 1 }}>
                  <RatingWidget
                    size="normal"
                    value={selectedImage.rating ?? 0}
                    onChange={(r) => handleRatingChange(selectedImage.ID, r)}
                  />
                </Box>

                {/* Rating save error */}
                {ratingError && (
                  <Alert
                    severity="error"
                    onClose={() => setRatingError(null)}
                    sx={{ mt: 1, mb: 1, textAlign: 'left' }}
                  >
                    {ratingError}
                  </Alert>
                )}

                {/* Comment field */}
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
                  sx={{ mt: 2 }}
                />

                {/* Comment save error */}
                {commentError && (
                  <Alert
                    severity="error"
                    onClose={() => setCommentError(null)}
                    sx={{ mt: 1, textAlign: 'left' }}
                  >
                    {commentError}
                  </Alert>
                )}
              </Box>
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
            {t('view.delete_rejected_confirm')
              .replace('{count}', String(rejectedCount))
              .replace('{medium}', storagePath || 'selected medium')}
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
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isDeletingRejected}
          >
            {t('cancel') || 'Cancel'}
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={handleDeleteRejectedConfirm}
            disabled={isDeletingRejected}
          >
            {isDeletingRejected ? '...' : t('view.delete_rejected_button')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default View;
