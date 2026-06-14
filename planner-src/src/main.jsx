import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { APIProvider } from '@vis.gl/react-google-maps';
import App from './App.jsx';
import { MAPS_KEY } from './config.js';

// Standalone app theme (deliberately NOT the nivaastays brand) — a fresh,
// premium "coastal" system: vivid teal + warm amber, soft elevation, big radius.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#2196F3', dark: '#1976D2', light: '#64B5F6', contrastText: '#ffffff' },
    secondary: { main: '#FBBF24', dark: '#F59E0B', light: '#FCD34D', contrastText: '#231A00' },
    success: { main: '#34D399' },
    background: { default: '#0A0A0C', paper: '#1A1C20' },
    text: { primary: '#F3F4F6', secondary: '#A7ADB5' },
    divider: 'rgba(255,255,255,0.13)',
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
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});

createRoot(document.getElementById('root')).render(
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
