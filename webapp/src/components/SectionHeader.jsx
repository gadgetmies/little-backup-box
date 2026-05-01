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
        gap: 1,
        ...sx,
      }}
    >
      {icon ? (
        <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
          {icon}
        </Box>
      ) : null}
      <Typography variant={variant} component={component} sx={{ flexGrow: 1 }}>
        {title}
      </Typography>
      {action ? <Box sx={{ display: 'flex', alignItems: 'center' }}>{action}</Box> : null}
    </Box>
  );
}

export default SectionHeader;
