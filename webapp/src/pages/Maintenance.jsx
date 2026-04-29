import React from 'react';
import { Box, Grid } from '@mui/material';
import UpdateManager from '../components/UpdateManager';
import SettingsOperations from '../components/SettingsOperations';
import LibRawUpdater from '../components/LibRawUpdater';

function Maintenance() {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <UpdateManager />
        </Grid>

        <Grid item xs={12}>
          <LibRawUpdater />
        </Grid>

        <Grid item xs={12}>
          <SettingsOperations />
        </Grid>
      </Grid>
    </Box>
  );
}

export default Maintenance;

