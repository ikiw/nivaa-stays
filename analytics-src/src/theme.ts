import { createTheme } from '@mui/material';

// Brand light theme — teal + gold on cream, Fraunces display + Inter body.
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0E3B35', dark: '#082623', light: '#14524a', contrastText: '#ffffff' },
    secondary: { main: '#C9A227', dark: '#a8851a', light: '#E6C35A', contrastText: '#231A00' },
    success: { main: '#1a7a44' },
    warning: { main: '#b8860b' },
    error: { main: '#c45a3a' },
    background: { default: '#FAF6EC', paper: '#ffffff' },
    text: { primary: '#14201E', secondary: '#5B6B68' },
    divider: 'rgba(14,59,53,0.12)',
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    h4: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600, letterSpacing: '-0.01em' },
    h5: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h6: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    subtitle2: { fontWeight: 700 },
    overline: { fontWeight: 700, letterSpacing: '0.16em' },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { border: '1px solid rgba(14,59,53,0.10)', backgroundImage: 'none' } },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none', fontWeight: 700, borderRadius: 999, paddingTop: 5, paddingBottom: 5,
          '&.Mui-selected': { backgroundColor: '#0E3B35', color: '#fff', '&:hover': { backgroundColor: '#082623' } },
        },
      },
    },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});
