import React from 'react';
import { Box, Card, CardActionArea, CardMedia, Stack, Tooltip, Typography } from '@mui/material';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import { useLanguage } from '../../contexts/LanguageContext';
import RatingWidget from '../RatingWidget';
import SocialServiceIcon from './SocialServiceIcon';
import { mediaUrl, ratingBorderSx, socialState, UNKNOWN_THUMB } from './viewMedia';
import { classifyMedia } from '../../utils/viewMediaKinds';

/**
 * One grid card (view.php:1196-1243): thumbnail with rating-coloured border,
 * fallback /img/unknown.JPG, rating widget, comment indicator with a
 * filename/comment tooltip, and the social state icons of every configured
 * service.
 */
function GridCard({ image, medium, constants, socialServices, socialBits, onOpen, onRate }) {
  const { t } = useLanguage();
  const kind = classifyMedia(image.File_Name, constants);
  const hasComment = Boolean(image.Comment && String(image.Comment).trim());
  const tooltip = hasComment ? `${image.File_Name}\n${image.Comment}` : image.File_Name;

  return (
    <Card
      data-testid="image-card"
      data-image-id={image.ID}
      data-rating={image.LbbRating}
      sx={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}
    >
      <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>} placement="top" enterDelay={600}>
        <CardActionArea onClick={onOpen} aria-label={image.File_Name}>
          <Box sx={{ p: 0.5, position: 'relative' }}>
            <CardMedia
              component="img"
              image={mediaUrl(medium, image, 'thumb') || UNKNOWN_THUMB}
              alt={image.File_Name}
              loading="lazy"
              sx={{
                height: 150,
                objectFit: 'cover',
                backgroundColor: 'action.hover',
                borderRadius: 1,
                boxSizing: 'border-box',
                ...ratingBorderSx(image.LbbRating),
              }}
              onError={(e) => {
                if (!e.currentTarget.src.endsWith(UNKNOWN_THUMB)) e.currentTarget.src = UNKNOWN_THUMB;
              }}
            />
            {kind === 'video' && (
              <PlayCircleOutlineIcon
                sx={{ position: 'absolute', right: 10, bottom: 10, color: 'common.white', filter: 'drop-shadow(0 0 2px #000)' }}
              />
            )}
          </Box>
        </CardActionArea>
      </Tooltip>
      <Box sx={{ px: 1, pb: 1, pt: 0.5, display: 'flex', flexDirection: 'column', gap: 0.5, flexGrow: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap>
          <RatingWidget size="small" value={Number(image.LbbRating) || 0} onChange={(r) => onRate(image.ID, r)} />
          {hasComment && (
            <Tooltip title={<span style={{ whiteSpace: 'pre-line' }}>{tooltip}</span>}>
              <ChatBubbleOutlineIcon
                fontSize="small"
                color="action"
                aria-label={t('view.grid.comment_indicator')}
                data-testid="comment-indicator"
              />
            </Tooltip>
          )}
          <Box sx={{ display: 'flex', gap: 0.25, ml: 'auto' }}>
            {(socialServices || []).map((service) => {
              const bit = socialBits?.[service];
              if (bit === undefined) return null;
              const state = socialState(image.social_publish, image.social_published, bit);
              const label = `${t(`view.social_services.${service}`)}: ${t(`view.single.social_state_${state}`)}`;
              return (
                <Tooltip key={service} title={label}>
                  <span>
                    <SocialServiceIcon service={service} state={state} size={20} title={label} />
                  </span>
                </Tooltip>
              );
            })}
          </Box>
        </Stack>
        <Typography variant="caption" noWrap display="block" title={image.File_Name}>
          {image.File_Name}
        </Typography>
      </Box>
    </Card>
  );
}

export default GridCard;
