// Trip controls: the "Start from" place selector + day-window slider, then the trip-date
// day-strip with the selected day's weather chip. Presentational — the parent owns state.
import { Stack, TextField, MenuItem, Typography, Slider, Box } from '@mui/material';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import { parseTime, fmtClock, toHHMM, todayISO, addDaysISO } from '../utils';
import WeatherChip from './WeatherChip';
import DateStrip from './DateStrip';
import type { Place, Weather } from '../types';

interface ControlsProps {
  start: number;
  startTime: string;
  endTime: string;
  tripDate: string;
  weather: Weather | null;
  weatherLoading: boolean;
  starts: { p: Place; i: number }[];
  onStartChange: (v: number) => void;
  onWindowChange: (startTime: string, endTime: string) => void;
  onDateChange: (date: string) => void;
}

export default function Controls({ start, startTime, endTime, tripDate, weather, weatherLoading, starts, onStartChange, onWindowChange, onDateChange }: ControlsProps) {
  const sMin = parseTime(startTime), eMin = parseTime(endTime);
  const outOfRange = tripDate < todayISO() || tripDate > addDaysISO(todayISO(), 15);
  return (
    <Stack spacing={1.1}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' } }} useFlexGap>
        <TextField select size="small" label="Start from" value={start} onChange={e => onStartChange(+e.target.value)}
          sx={{ flex: '1 1 0', minWidth: { xs: '46%', md: 0 }, '& .MuiInputBase-input': { fontSize: '0.85rem', fontWeight: 600 } }}>
          {starts.map(({ p, i }) => <MenuItem key={i} value={i}>{p.name}</MenuItem>)}
        </TextField>
        <Stack sx={{ flex: '1 1 0', minWidth: { xs: 150, md: 0 } }}>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <AccessTimeRounded sx={{ fontSize: 14 }} /> {fmtClock(sMin)} – {fmtClock(eMin)}
          </Typography>
          <Slider size="small" value={[sMin, eMin]} min={300} max={1380} step={30} disableSwap
            onChange={(_, v) => { const r = v as number[]; onWindowChange(toHHMM(r[0]), toHHMM(r[1])); }}
            valueLabelDisplay="auto" valueLabelFormat={(m) => fmtClock(m)} getAriaLabel={() => 'Day window'} sx={{ mt: -0.2, py: 0.5 }} />
        </Stack>
      </Stack>
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 0.6 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trip date</Typography>
          <WeatherChip weather={weather} loading={weatherLoading} outOfRange={outOfRange} />
        </Stack>
        <DateStrip value={tripDate} onChange={onDateChange} />
      </Box>
    </Stack>
  );
}
