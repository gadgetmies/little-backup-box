import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Chip,
  Button,
  Alert,
  Stack,
  CircularProgress,
} from '@mui/material';
import TelegramIcon from '@mui/icons-material/Telegram';
import PublicIcon from '@mui/icons-material/Public';
import SendIcon from '@mui/icons-material/Send';
import { useLanguage } from '../contexts/LanguageContext';
import { useConfig } from '../contexts/ConfigContext';
import api from '../utils/api';

function SocialPublishPanel({ medium, imageId, image, onPublished }) {
  const { t } = useLanguage();
  const { config } = useConfig();
  const [selected, setSelected] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const telegramEnabled =
    config?.conf_SOCIAL_TELEGRAM_TOKEN && config.conf_SOCIAL_TELEGRAM_TOKEN.trim() !== '';
  const mastodonEnabled =
    config?.conf_SOCIAL_MASTODON_TOKEN && config.conf_SOCIAL_MASTODON_TOKEN.trim() !== '';

  const hasPlatforms = telegramEnabled || mastodonEnabled;

  const togglePlatform = useCallback((platform) => {
    setSelected((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
    setResult(null);
    setError(null);
  }, []);

  const handlePublish = useCallback(async () => {
    if (selected.length === 0) return;
    setIsPublishing(true);
    setResult(null);
    setError(null);
    try {
      const response = await api.post('/social/publish', {
        medium,
        imageId,
        platforms: selected,
      });
      setResult(response.data.results || {});
      if (onPublished) onPublished(response.data);
    } catch (err) {
      const errCode = err.response?.data?.error;
      if (errCode === 'social_auth_failed') {
        setError(t('view.social.auth_failed'));
      } else if (errCode === 'social_rate_limit') {
        setError(t('view.social.rate_limit'));
      } else {
        setError(err.response?.data?.error || t('view.social.publish_error'));
      }
    } finally {
      setIsPublishing(false);
    }
  }, [selected, medium, imageId, t, onPublished]);

  if (!hasPlatforms) return null;

  const publishedTelegram = image?.publish_telegram === '1' || image?.publish_telegram === 1;
  const publishedMastodon = image?.publish_mastodon === '1' || image?.publish_mastodon === 1;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        {t('view.social.publish')}
      </Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {telegramEnabled && (
          <Chip
            icon={<TelegramIcon />}
            label={
              publishedTelegram
                ? `${t('view.social.telegram')} (${t('view.social.published')})`
                : t('view.social.telegram')
            }
            color={selected.includes('telegram') ? 'primary' : 'default'}
            variant={selected.includes('telegram') ? 'filled' : 'outlined'}
            onClick={() => togglePlatform('telegram')}
            size="small"
          />
        )}
        {mastodonEnabled && (
          <Chip
            icon={<PublicIcon />}
            label={
              publishedMastodon
                ? `${t('view.social.mastodon')} (${t('view.social.published')})`
                : t('view.social.mastodon')
            }
            color={selected.includes('mastodon') ? 'primary' : 'default'}
            variant={selected.includes('mastodon') ? 'filled' : 'outlined'}
            onClick={() => togglePlatform('mastodon')}
            size="small"
          />
        )}
      </Stack>

      <Button
        variant="contained"
        size="small"
        startIcon={isPublishing ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
        onClick={handlePublish}
        disabled={selected.length === 0 || isPublishing}
        data-testid="social-publish-button"
      >
        {t('view.social.publish')}
      </Button>

      {result && (
        <Alert severity="success" sx={{ mt: 1 }}>
          {Object.entries(result)
            .map(([platform, ok]) => `${platform}: ${ok ? t('view.social.published') : t('view.social.publish_error')}`)
            .join(', ')}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
    </Box>
  );
}

export default SocialPublishPanel;
