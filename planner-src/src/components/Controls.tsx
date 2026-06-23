// Trip controls: the "Start from" place selector + the day-window (start/end time)
// range slider. Presentational — the parent owns the state and edit handlers.
import { Stack, TextField, MenuItem, Typography, Slider } from '@mui/material';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import { parseTime, fmtClock, toHHMM } from '../utils';
import type { Place } from '../types';

interface ControlsProps {
  start: number;
  startTime: string;
  endTime: string;
  starts: { p: Place; i: number }[];
  onStartChange: (v: number) => void;
  onWindowChange: (startTime: string, endTime: string) => void;
}

export default function Controls({ start, startTime, endTime, starts, onStartChange, onWindowChange }: ControlsProps) {
  const sMin = parseTime(startTime), eMin = parseTime(endTime);
  return (
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
  );
}
