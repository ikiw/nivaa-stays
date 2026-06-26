// A compact weather pill for the selected trip date: a coloured condition icon + high/low
// °C, the condition label, and — when rain is likely — an umbrella + chance, amber as a
// "carry an umbrella" warning. Pure view — App feeds it the forecast.
import { Box, Typography, CircularProgress, Tooltip } from '@mui/material';
import UmbrellaRounded from '@mui/icons-material/UmbrellaRounded';
import WbTwilightRounded from '@mui/icons-material/WbTwilightRounded';
import { weatherInfo } from '../utils';
import WeatherIcon from './WeatherIcon';
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
      <WbTwilightRounded sx={{ fontSize: 14, color: 'text.secondary' }} />
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>Forecast nearer the date</Typography>
    </Box>
  );
  if (!weather) return null;   // transient fetch error — show nothing rather than a broken chip

  const { label } = weatherInfo(weather.code);
  const rise = weather.sunrise ? weather.sunrise.slice(11, 16).replace(/^0/, '') : '';
  const rain = weather.precip;          // day's max chance of rain, %
  const wet = rain >= 60, damp = rain >= 35;
  return (
    <Box sx={chipSx} aria-label={`${label}, high ${weather.tMax}, low ${weather.tMin} degrees, ${rain}% chance of rain`}>
      <WeatherIcon code={weather.code} size={17} />
      <Typography sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
        {weather.tMax}°<Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>/{weather.tMin}°</Box>
      </Typography>
      <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }} noWrap>{label}</Typography>
      {damp && (
        <Tooltip arrow title={`${rain}% chance of rain${wet ? ' — carry an umbrella' : ''}`}>
          <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, fontWeight: 700, color: wet ? '#F59E0B' : '#60A5FA' }}>
            <UmbrellaRounded sx={{ fontSize: 13 }} /> {rain}%
          </Box>
        </Tooltip>
      )}
      {rise && (
        <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25, fontSize: '0.72rem', color: '#E6C35A' }}>
          <WbTwilightRounded sx={{ fontSize: 13 }} /> {rise}
        </Box>
      )}
    </Box>
  );
}
