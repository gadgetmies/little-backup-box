import React, { useState, useCallback } from 'react';
import { Alert, Chip, Stack, Typography } from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import SocialServiceIcon from './view/SocialServiceIcon';
import { socialState } from './view/viewMedia';

/**
 * Per-image "publish to social media" marking (scripts/view.php:293-339).
 *
 * One toggle chip per CONFIGURED service. Toggling flips the service bit in
 * EXIF_DATA.social_publish; nothing is posted from here — the next backup run
 * (scripts/backup.py) posts queued images and sets social_published.
 *
 * Props:
 *   services   string[]  configured services, display order
 *   bits       object    service -> bit number
 *   image      object    EXIF_DATA row (social_publish, social_published)
 *   onToggle   (service, publish:boolean) => Promise
 */
function SocialPublishPanel({ services = [], bits = {}, image, onToggle }) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);

  const handleToggle = useCallback(
    async (service, queued) => {
      if (!onToggle) return;
      setBusy(service);
      setError(null);
      try {
        await onToggle(service, !queued);
      } catch (err) {
        setError(err?.response?.data?.error || t('view.single.social_error'));
      } finally {
        setBusy(null);
      }
    },
    [onToggle, t]
  );

  if (!services.length) {
    return (
      <Typography variant="body2" color="text.secondary" data-testid="social-none">
        {t('view.single.social_none')}
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5} data-testid="social-publish-panel">
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {services.map((service) => {
          const bit = bits[service];
          if (bit === undefined) return null;
          const state = socialState(image?.social_publish, image?.social_published, bit);
          const queued = state === 'publish' || state === 'combined';
          const name = t(`view.social_services.${service}`);
          const stateLabel = t(`view.single.social_state_${state}`);
          return (
            <Chip
              key={service}
              icon={<SocialServiceIcon service={service} state={state} size={22} />}
              label={`${name} · ${stateLabel}`}
              color={queued ? 'primary' : 'default'}
              variant={queued ? 'filled' : 'outlined'}
              onClick={() => handleToggle(service, queued)}
              disabled={busy === service}
              aria-pressed={queued}
              aria-label={(queued ? t('view.single.social_toggle_off') : t('view.single.social_toggle_on')).replace('{service}', name)}
              data-testid={`social-toggle-${service}`}
              data-state={state}
              sx={{ minHeight: 44, borderRadius: 22, '& .MuiChip-icon': { ml: 1 } }}
            />
          );
        })}
      </Stack>
      <Typography variant="caption" color="text.secondary">
        {t('view.single.social_caption')}
      </Typography>
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}

export default SocialPublishPanel;
