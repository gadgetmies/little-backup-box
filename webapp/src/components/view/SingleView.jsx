import React from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import FilterAltIcon from '@mui/icons-material/FilterAlt';
import { useLanguage } from '../../contexts/LanguageContext';
import PageSection from '../PageSection';
import RatingWidget from '../RatingWidget';
import SocialPublishPanel from '../SocialPublishPanel';
import MediaStage from './MediaStage';
import FileInfo from './FileInfo';
import { mediaUrl, SLIDESHOW_INTERVALS } from './viewMedia';

const navButtonSx = { width: 44, height: 44 };

/**
 * Library single view ("2 · Library single view" artboard): header bar,
 * centre media stage, right info panel (stacks below on phones), and a
 * full-window overlay that also hosts the slideshow.
 */
function SingleView({
  medium,
  image,
  media,
  position,
  total,
  filtered,
  maxZoom,
  onBack,
  onFirst,
  onPrev,
  onNext,
  onLast,
  isPlaying,
  onTogglePlay,
  intervalSeconds,
  onIntervalChange,
  fullscreenOpen,
  onOpenFullscreen,
  onCloseFullscreen,
  onRate,
  ratingError,
  onDismissRatingError,
  comment,
  onCommentChange,
  commentError,
  onDismissCommentError,
  saved,
  socialServices,
  socialBits,
  onSocialToggle,
}) {
  const { t } = useLanguage();
  if (!image) return null;

  const atStart = position <= 1;
  const atEnd = position >= total;
  const downloadHref = mediaUrl(medium, image, 'original', { download: true });

  const navButtons = (
    <Stack direction="row" alignItems="center" spacing={0.5}>
      <Tooltip title={t('view.single.first')}>
        <span>
          <IconButton onClick={onFirst} disabled={atStart} aria-label={t('view.single.first')} sx={navButtonSx}>
            <SkipPreviousIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('view.single.previous')}>
        <span>
          <IconButton onClick={onPrev} disabled={atStart} aria-label={t('view.single.previous')} sx={navButtonSx}>
            <NavigateBeforeIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('view.single.next')}>
        <span>
          <IconButton onClick={onNext} disabled={atEnd} aria-label={t('view.single.next')} sx={navButtonSx}>
            <NavigateNextIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title={t('view.single.last')}>
        <span>
          <IconButton onClick={onLast} disabled={atEnd} aria-label={t('view.single.last')} sx={navButtonSx}>
            <SkipNextIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );

  const playButton = (
    <Tooltip title={isPlaying ? t('view.slideshow_stop') : t('view.slideshow_play')}>
      <IconButton
        onClick={onTogglePlay}
        color={isPlaying ? 'error' : 'primary'}
        aria-label={isPlaying ? t('view.slideshow_stop') : t('view.slideshow_play')}
        data-testid="slideshow-toggle"
        sx={navButtonSx}
      >
        {isPlaying ? <StopIcon /> : <PlayArrowIcon />}
      </IconButton>
    </Tooltip>
  );

  const positionLabel = (
    <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }} data-testid="single-position">
      {position} / {total}
    </Typography>
  );

  return (
    <Box data-testid="single-view">
      {/* Header bar */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
          <Button startIcon={<ArrowBackIcon />} onClick={onBack} sx={{ minHeight: 44 }}>
            {t('view.images.back_to_grid')}
          </Button>
          <Box sx={{ flex: '1 1 160px', minWidth: 0 }}>
            <Typography variant="subtitle1" component="p" noWrap title={image.File_Name} data-testid="single-filename">
              {image.File_Name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              {positionLabel}
              {filtered && (
                <Chip
                  size="small"
                  icon={<FilterAltIcon />}
                  label={t('view.single.filtered_hint')}
                  variant="outlined"
                  data-testid="filtered-hint"
                />
              )}
            </Stack>
          </Box>
          {navButtons}
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel id="slideshow-interval-label">{t('view.slideshow_interval')}</InputLabel>
              <Select
                labelId="slideshow-interval-label"
                value={intervalSeconds}
                label={t('view.slideshow_interval')}
                onChange={(e) => onIntervalChange(Number(e.target.value))}
                inputProps={{ 'aria-label': t('view.slideshow_interval') }}
                data-testid="slideshow-interval"
              >
                {SLIDESHOW_INTERVALS.map((s) => (
                  <MenuItem key={s} value={s}>
                    {`${s} ${t('seconds_short')}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {playButton}
          </Stack>
          <Tooltip title={t('view.single.fullscreen')}>
            <IconButton onClick={onOpenFullscreen} aria-label={t('view.single.fullscreen')} data-testid="fullscreen-button" sx={navButtonSx}>
              <OpenInFullIcon />
            </IconButton>
          </Tooltip>
          <Button
            component="a"
            href={downloadHref}
            target="_blank"
            rel="noopener"
            download={image.File_Name}
            startIcon={<DownloadIcon />}
            sx={{ minHeight: 44 }}
            data-testid="download-original"
          >
            {t('view.single.download')}
          </Button>
        </Stack>
      </Paper>

      <Grid container spacing={2}>
        {/* Stage */}
        <Grid item xs={12} md={8}>
          <MediaStage
            key={image.ID}
            medium={medium}
            image={image}
            media={media}
            autoPlay={!isPlaying}
            maxZoom={maxZoom}
          />
          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
            <RatingWidget size="normal" value={Number(image.LbbRating) || 0} onChange={(r) => onRate(image.ID, r)} />
            <Box sx={{ minWidth: 150, display: 'flex', alignItems: 'center' }} aria-live="polite">
              {saved && (
                <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }} data-testid="saved-indicator">
                  <CheckCircleOutlineIcon fontSize="small" />
                  {t('view.single.saved')}
                </Typography>
              )}
            </Box>
          </Stack>
          {ratingError && (
            <Alert severity="error" onClose={onDismissRatingError} sx={{ mt: 1 }}>
              {ratingError}
            </Alert>
          )}
        </Grid>

        {/* Info panel */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>
            <PageSection variant="card" title={t('view.single.comment_title')}>
              <TextField
                multiline
                fullWidth
                minRows={3}
                label={t('view.images.comment')}
                placeholder={t('view.comment_placeholder')}
                value={comment}
                onChange={onCommentChange}
                helperText={t('view.single.characters').replace('{count}', String(comment.length))}
                inputProps={{ 'data-testid': 'comment-input' }}
              />
              {commentError && (
                <Alert severity="error" onClose={onDismissCommentError} sx={{ mt: 1 }}>
                  {commentError}
                </Alert>
              )}
            </PageSection>
            <PageSection variant="card" title={t('view.single.social_title')}>
              <SocialPublishPanel services={socialServices} bits={socialBits} image={image} onToggle={onSocialToggle} />
            </PageSection>
            <PageSection variant="card" title={t('view.single.info_title')}>
              <FileInfo image={image} />
            </PageSection>
          </Stack>
        </Grid>
      </Grid>

      {/* Full-window overlay (view.php:383-387 + js/slideshow.js) */}
      <Dialog
        fullScreen
        open={fullscreenOpen}
        onClose={onCloseFullscreen}
        PaperProps={{ sx: { bgcolor: 'common.black', color: 'common.white' } }}
        aria-label={image.File_Name}
      >
        <Box
          onClick={(e) => {
            if (e.target === e.currentTarget) onCloseFullscreen();
          }}
          data-testid="fullscreen-overlay"
          sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2, minHeight: 0 }}
        >
          <MediaStage key={image.ID} medium={medium} image={image} media={media} autoPlay fullscreen />
        </Box>
        <IconButton
          onClick={onCloseFullscreen}
          aria-label={t('view.single.close')}
          data-testid="fullscreen-close"
          sx={{ position: 'absolute', top: 8, right: 8, color: 'common.white', bgcolor: 'rgba(0,0,0,0.5)', ...navButtonSx }}
        >
          <CloseIcon />
        </IconButton>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="center"
          spacing={1}
          sx={{ py: 1, color: 'common.white', '& .MuiIconButton-root': { color: 'common.white' }, '& .Mui-disabled': { color: 'grey.700' } }}
        >
          <IconButton onClick={onPrev} disabled={atStart} aria-label={t('view.single.previous')} sx={navButtonSx}>
            <NavigateBeforeIcon />
          </IconButton>
          {playButton}
          <IconButton onClick={onNext} disabled={atEnd} aria-label={t('view.single.next')} sx={navButtonSx}>
            <NavigateNextIcon />
          </IconButton>
          {positionLabel}
        </Stack>
      </Dialog>
    </Box>
  );
}

export default SingleView;
