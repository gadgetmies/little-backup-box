import { createTheme } from '@mui/material/styles';

const sepiaTheme = {
  mode: 'light',
  background: {
    default: '#f5f0e8',
    paper: '#ede8d8',
  },
  text: {
    primary: '#3c2f1e',
    secondary: '#6b5744',
  },
  primary: {
    main: '#8b6f47',
  },
};

export const createAppTheme = (themeMode = 'dark') => {
  if (themeMode === 'sepia') {
    return createTheme({
      palette: sepiaTheme,
      typography: {
        h1: {
          fontSize: '2rem',
          fontWeight: 500,
          lineHeight: 1.2,
        },
        h2: {
          fontSize: '1.5rem',
          fontWeight: 500,
          lineHeight: 1.3,
        },
        h3: {
          fontSize: '1.25rem',
          fontWeight: 500,
          lineHeight: 1.4,
        },
        h4: {
          fontSize: '1.125rem',
          fontWeight: 500,
          lineHeight: 1.4,
        },
        h5: {
          fontSize: '1rem',
          fontWeight: 500,
          lineHeight: 1.5,
        },
        h6: {
          fontSize: '0.875rem',
          fontWeight: 500,
          lineHeight: 1.5,
        },
      },
    });
  }

  return createTheme({
    palette: {
      mode: themeMode,
    },
    typography: {
      h1: {
        fontSize: '2rem', // ~32px - matches Material-UI docs page titles
        fontWeight: 500,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '1.5rem', // ~24px - matches Material-UI docs section headers
        fontWeight: 500,
        lineHeight: 1.3,
      },
      h3: {
        fontSize: '1.25rem', // ~20px - matches Material-UI docs subsection headers
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h4: {
        fontSize: '1.125rem', // ~18px
        fontWeight: 500,
        lineHeight: 1.4,
      },
      h5: {
        fontSize: '1rem', // ~16px
        fontWeight: 500,
        lineHeight: 1.5,
      },
      h6: {
        fontSize: '0.875rem', // ~14px
        fontWeight: 500,
        lineHeight: 1.5,
      },
    },
  });
};
