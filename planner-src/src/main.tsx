import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { APIProvider } from '@vis.gl/react-google-maps';
import App from './App';
import { MAPS_KEY } from './config';
import { ACTIVE } from './theme/tokens';

// The MUI palette is built from the active theme tokens (theme/tokens.ts) — the
// single source of every identity colour. Swap ACTIVE there to re-theme the app.
const theme = createTheme({
  palette: {
    mode: ACTIVE.mode,
    primary: { main: ACTIVE.interactive, contrastText: ACTIVE.interactiveInk },
    secondary: { main: ACTIVE.highlight, contrastText: ACTIVE.highlightInk },
    success: { main: ACTIVE.success },
    warning: { main: ACTIVE.warning },
    background: { default: ACTIVE.bg, paper: ACTIVE.surface },
    text: { primary: ACTIVE.textPrimary, secondary: ACTIVE.textSecondary },
    divider: ACTIVE.border,
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 800, letterSpacing: '-0.015em' },
    subtitle1: { fontWeight: 700 },
    subtitle2: { fontWeight: 700, letterSpacing: '0.01em' },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiCssBaseline: { styleOverrides: { body: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale', textRendering: 'optimizeLegibility' } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 9 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none', transition: 'box-shadow .18s ease, border-color .18s ease' } } },
    MuiAppBar: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 9 } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiMenuItem: { styleOverrides: { root: { fontSize: '0.85rem', minHeight: 'auto', paddingTop: 5, paddingBottom: 5 } } },
    MuiMenu: { styleOverrides: { paper: { borderRadius: 10 } } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <APIProvider apiKey={MAPS_KEY}>
          <App />
        </APIProvider>
      </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>
);
