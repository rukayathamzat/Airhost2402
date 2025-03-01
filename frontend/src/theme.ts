import { createTheme } from '@mui/material/styles';

// Définition des couleurs selon la nouvelle charte graphique
const colors = {
  gray: {
    50: '#F9FAFB',  // bg-gray-50 (fond général)
    100: '#F3F4F6', // hover:bg-gray-100 (hover)
    900: '#111827', // bg-gray-900 (fond sidebar et texte principal)
  },
  white: '#FFFFFF',   // text-white (texte dans la sidebar)
  blue: {
    400: '#60A5FA', // text-blue-400 (icônes)
  }
};

// Création du thème Material UI
const theme = createTheme({
  palette: {
    primary: {
      main: colors.blue[400],
      contrastText: colors.white,
    },
    secondary: {
      main: colors.gray[100],
      contrastText: colors.gray[900],
    },
    background: {
      default: colors.gray[50],
      paper: colors.white,
    },
    text: {
      primary: colors.gray[900],
      secondary: colors.white,
    },
  },
  typography: {
    // Police par défaut de Tailwind (font-sans)
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '1.25rem', // text-xl
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.125rem', // text-lg
    },
    h3: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '0.875rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '0.75rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '0.75rem',
    },
    subtitle1: {
      color: colors.gray[900],
    },
    subtitle2: {
      color: colors.gray[900],
    },
    body1: {
      color: colors.gray[900],
    },
    body2: {
      color: colors.gray[900],
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem', // rounded-lg
          padding: '0.5rem 1rem', // px-4 py-2
          boxShadow: 'none',
          '&:hover': {
            backgroundColor: colors.gray[100],
            boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.05)',
          },
        },
        contained: {
          backgroundColor: colors.blue[400],
          '&:hover': {
            backgroundColor: '#3b82f6', // Légèrement plus foncé au survol
          },
        },
        outlined: {
          borderColor: colors.blue[400],
          color: colors.blue[400],
          '&:hover': {
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(96, 165, 250, 0.04)',
          },
        },
        text: {
          color: colors.blue[400],
          '&:hover': {
            backgroundColor: 'rgba(96, 165, 250, 0.04)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem', // rounded-lg
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '0.375rem', // rounded-md
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.blue[400],
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.blue[400],
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: colors.blue[400],
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.white,
          color: colors.gray[900],
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '0.5rem', // rounded-lg
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1), 0px 1px 2px rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '9999px', // rounded-full
        },
        colorPrimary: {
          backgroundColor: colors.blue[400],
          color: colors.white,
        },
        colorSecondary: {
          backgroundColor: colors.gray[100],
          color: colors.gray[900],
        },
      },
    },
  },
});

export default theme;
