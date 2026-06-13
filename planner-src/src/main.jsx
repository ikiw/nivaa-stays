import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import App from './App.jsx';

// Standalone app theme (deliberately NOT the nivaastays brand) — a fresh,
// premium "coastal" system: vivid teal + warm amber, soft elevation, big radius.
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#2196F3', dark: '#1976D2', light: '#64B5F6', contrastText: '#ffffff' },
    secondary: { main: '#FBBF24', dark: '#F59E0B', light: '#FCD34D', contrastText: '#231A00' },
    success: { main: '#34D399' },
    background: { default: '#0A0A0C', paper: '#161719' },
    text: { primary: '#ECEDEE', secondary: '#9BA1A6' },
    divider: 'rgba(255,255,255,0.09)',
  },
  shape: { borderRadius: 16 },
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
    h5: { fontWeight: 800, letterSpacing: '-0.02em' },
    h6: { fontWeight: 800, letterSpacing: '-0.015em' },
    subtitle1: { fontWeight: 700 },
    subtitle2: { fontWeight: 700, letterSpacing: '0.01em' },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { borderRadius: 12 } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: 'none', transition: 'box-shadow .18s ease, border-color .18s ease' } } },
    MuiAppBar: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 12 } } },
    MuiTextField: { defaultProps: { size: 'small' } },
    MuiTooltip: { defaultProps: { arrow: true } },
  },
});

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <App />
      </LocalizationProvider>
    </ThemeProvider>
  </React.StrictMode>
);
