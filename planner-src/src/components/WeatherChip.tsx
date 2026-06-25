// A compact weather pill for the selected trip date: condition emoji + high/low °C,
// a rain chance when it's worth a raincoat, the short label, and Pondicherry's sunrise
// (a nice nudge for the Rock Beach sunrise crowd). Pure view — App feeds it the forecast.
import { Box, Typography, CircularProgress } from '@mui/material';
import { weatherInfo } from '../utils';
import type { Weather } from '../types';

interface WeatherChipProps {
  weather: Weather | null;
  loading: boolean;
  outOfRange: boolean;   // date is beyond the ~16-day forecast horizon (or in the past)
}

const chipSx = {
  display: 'inline-flex', alignItems: 'center', gap: 0.7, px: 1, py: 0.4,
  borderRadius: 999, border: '1px solid', borderColor: 'divider',
  bgcolor: 'rgba(255,255,255,0.04)', whiteSpace: 'nowrap', flexShrink: 0,
} as const;

export default function WeatherChip({ weather, loading, outOfRange }: WeatherChipProps) {
  if (loading) return (
    <Box sx={chipSx}>
      <CircularProgress size={12} thickness={6} sx={{ color: 'text.secondary' }} />
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Checking weather…</Typography>
    </Box>
  );
  if (outOfRange) return (
    <Box sx={chipSx}>
      <span style={{ fontSize: 14 }} aria-hidden>🗓️</span>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Forecast nearer the date</Typography>
    </Box>
  );
  if (!weather) return null;   // transient fetch error — show nothing rather than a broken chip

  const { label, emoji } = weatherInfo(weather.code);
  const rise = weather.sunrise ? weather.sunrise.slice(11, 16).replace(/^0/, '') : '';
  return (
    <Box sx={chipSx} aria-label={`${label}, ${weather.tMax} to ${weather.tMin} degrees`}>
      <span style={{ fontSize: 16, lineHeight: 1 }} aria-hidden>{emoji}</span>
      <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
        {weather.tMax}°<Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>/{weather.tMin}°</Box>
      </Typography>
      {weather.precip >= 30 && (
        <Typography sx={{ fontSize: '0.72rem', color: '#60A5FA', fontWeight: 600 }}>💧{weather.precip}%</Typography>
      )}
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }} noWrap>{label}</Typography>
      {rise && <Typography sx={{ fontSize: '0.72rem', color: '#E6C35A' }} noWrap>🌅 {rise}</Typography>}
    </Box>
  );
}
