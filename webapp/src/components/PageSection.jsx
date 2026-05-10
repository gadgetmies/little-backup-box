import React, { useEffect, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Card,
  CardContent,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SectionHeader from './SectionHeader';

const ACCORDION_KEY_PATTERN = /^lbb-accordion-[a-z0-9-]+-[a-z0-9-]+$/;

function readPersistedExpanded(key, fallback, legacyKey) {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return JSON.parse(value);
    if (legacyKey) {
      const legacy = window.localStorage.getItem(legacyKey);
      if (legacy !== null) return JSON.parse(legacy);
    }
  } catch {
    // localStorage may be unavailable or contain invalid JSON; fall through to default
  }
  return fallback;
}

function PageSection({
  variant = 'plain',
  title,
  icon,
  action,
  children,
  defaultExpanded = false,
  localStorageKey,
  legacyLocalStorageKey,
  sx,
}) {
  if (variant === 'accordion') {
    if (!localStorageKey) {
      throw new Error(
        'PageSection variant="accordion" requires a localStorageKey (lbb-accordion-<page>-<section>)',
      );
    }
    if (!ACCORDION_KEY_PATTERN.test(localStorageKey)) {
      throw new Error(
        `PageSection localStorageKey "${localStorageKey}" must match lbb-accordion-<page>-<section>`,
      );
    }
  }

  const [expanded, setExpanded] = useState(() =>
    variant === 'accordion'
      ? readPersistedExpanded(localStorageKey, defaultExpanded, legacyLocalStorageKey)
      : true,
  );

  useEffect(() => {
    if (variant !== 'accordion') return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(localStorageKey, JSON.stringify(expanded));
    } catch {
      // ignore quota / availability failures
    }
  }, [variant, localStorageKey, expanded]);

  if (variant === 'accordion') {
    return (
      <Accordion
        expanded={expanded}
        onChange={(_, isExpanded) => setExpanded(isExpanded)}
        sx={sx}
        disableGutters
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          {title ? (
            <SectionHeader level={2} title={title} icon={icon} action={action} sx={{ flexGrow: 1, mr: 1 }} />
          ) : null}
        </AccordionSummary>
        <AccordionDetails>{children}</AccordionDetails>
      </Accordion>
    );
  }

  if (variant === 'card') {
    return (
      <Card sx={sx}>
        <CardContent>
          {title ? (
            <SectionHeader level={2} title={title} icon={icon} action={action} sx={{ mb: 2 }} />
          ) : null}
          {children}
        </CardContent>
      </Card>
    );
  }

  // variant === 'plain'
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, ...sx }}>
      {title ? <SectionHeader level={2} title={title} icon={icon} action={action} /> : null}
      {children}
    </Box>
  );
}

PageSection.Subsection = function PageSectionSubsection({ title, icon, action, children, sx }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ...sx }}>
      {title ? <SectionHeader level={3} title={title} icon={icon} action={action} /> : null}
      {children}
    </Box>
  );
};

export default PageSection;
