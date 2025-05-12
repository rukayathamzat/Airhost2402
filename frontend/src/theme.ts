import { createTheme } from '@mui/material/styles';

// Définition des couleurs selon la charte graphique
const colors = {
  bluePrimary: '#48A8EF',    // Bleu clair - pour les accents et les boutons
  blueDark: '#18374D',       // Bleu foncé - pour les textes principaux et les titres
  white: '#FFFFFF',          // Blanc - pour le fond principal
  blueMedium1: '#3173A3',    // Bleu moyen - pour des éléments secondaires
  blueMedium2: '#3275A5',    // Bleu moyen - pour des éléments secondaires
  grey: {
    100: '#F8F9FA',
    200: '#E9ECEF',
    300: '#DEE2E6',
    400: '#CED4DA',
    500: '#ADB5BD',
    600: '#6C757D',
    700: '#495057',
    800: '#343A40',
    900: '#212529',
  }
};

// Création du thème Material UI
const theme = createTheme({
  palette: {
    primary: {
      main: colors.bluePrimary,
      dark: colors.blueMedium1,
      contrastText: colors.white,
    },
    secondary: {
      main: colors.blueDark,
      light: colors.blueMedium2,
      contrastText: colors.white,
    },
    background: {
      default: colors.white,
      paper: colors.white,
    },
    text: {
      primary: colors.blueDark,
      secondary: colors.blueMedium1,
    },
  },
  typography: {
    fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      color: colors.blueDark,
      fontWeight: 600,
    },
    h2: {
      color: colors.blueDark,
      fontWeight: 600,
    },
    h3: {
      color: colors.blueDark,
      fontWeight: 500,
    },
    h4: {
      color: colors.blueDark,
      fontWeight: 500,
    },
    h5: {
      color: colors.blueDark,
      fontWeight: 500,
    },
    h6: {
      color: colors.blueDark,
      fontWeight: 500,
    },
    subtitle1: {
      color: colors.blueMedium1,
    },
    subtitle2: {
      color: colors.blueMedium1,
    },
    body1: {
      color: colors.blueDark,
    },
    body2: {
      color: colors.blueMedium1,
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
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
          },
        },
        contained: {
          backgroundColor: colors.bluePrimary,
          '&:hover': {
            backgroundColor: colors.blueMedium1,
          },
        },
        outlined: {
          borderColor: colors.bluePrimary,
          color: colors.bluePrimary,
          '&:hover': {
            borderColor: colors.blueMedium1,
            backgroundColor: 'rgba(72, 168, 239, 0.04)',
          },
        },
        text: {
          color: colors.bluePrimary,
          '&:hover': {
            backgroundColor: 'rgba(72, 168, 239, 0.04)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.bluePrimary,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: colors.bluePrimary,
            },
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: colors.bluePrimary,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: colors.white,
          color: colors.blueDark,
          boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 16,
        },
        colorPrimary: {
          backgroundColor: colors.bluePrimary,
          color: colors.white,
        },
        colorSecondary: {
          backgroundColor: colors.blueDark,
          color: colors.white,
        },
      },
    },
  },
});

export default theme;
