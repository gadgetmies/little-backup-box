import React from 'react';
import { Box, Typography } from '@mui/material';

function SectionHeader({ level = 2, title, icon, action, sx }) {
  const variant = level === 3 ? 'h3' : 'h2';
  const component = level === 3 ? 'h3' : 'h2';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        // Long (e.g. Finnish) titles next to an action must not widen the page:
        // the action wraps below the title on narrow screens.
        flexWrap: 'wrap',
        gap: 1,
        ...sx,
      }}
    >
      {icon ? (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
          {icon}
        </Box>
      ) : null}
      <Typography
        variant={variant}
        component={component}
        sx={{ flexGrow: 1, minWidth: 0, overflowWrap: 'anywhere' }}
      >
        {title}
      </Typography>
      {action ? <Box sx={{ display: 'flex', alignItems: 'center', maxWidth: '100%' }}>{action}</Box> : null}
    </Box>
  );
}

export default SectionHeader;
