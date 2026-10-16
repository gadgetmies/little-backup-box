import React, { useEffect } from 'react';
import { Box, Container, Toolbar } from '@mui/material';
import { useLocation } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';
import { useDrawer } from '../contexts/DrawerContext';
import Menu, { drawerWidth, drawerCollapsedWidth } from './Menu';

function Layout({ children }) {
  const { config } = useConfig();
  const { desktopOpen } = useDrawer();
  const location = useLocation();
  const currentDrawerWidth = desktopOpen ? drawerWidth : drawerCollapsedWidth;

  // conf_BACKGROUND_IMAGE is relative to <const_MEDIA_DIR>/<const_BACKGROUND_IMAGES_DIR>
  // (setup.php:30). The backend serves the file, since /media is not web-accessible.
  const backgroundImage = config?.conf_BACKGROUND_IMAGE;
  const background = backgroundImage
    ? `/api/config/background-image?file=${encodeURIComponent(backgroundImage)}`
    : '';

  useEffect(() => {
    document.documentElement.setAttribute('lang', config?.conf_LANGUAGE || 'en');
  }, [config]);

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        margin: 0,
        padding: 0,
        backgroundImage: background ? `url(${background})` : 'none',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed',
      }}
    >
      <Menu />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${currentDrawerWidth}px)` },
          display: 'flex',
          flexDirection: 'column',
          transition: (theme) =>
            theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
        }}
      >
        <Toolbar />
        <Container maxWidth="xl" sx={{ flex: 1, py: 3 }}>
          {children}
        </Container>
      </Box>
    </Box>
  );
}

export default Layout;
