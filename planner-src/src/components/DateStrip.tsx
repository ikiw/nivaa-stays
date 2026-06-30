// A horizontal strip of selectable day chips across the forecast window (Today, Tmrw,
// then weekday + date). Lighter than a full calendar popover and a natural fit for the
// ~16-day range the weather forecast covers. Parent owns the selected value.
import { Box, Typography } from '@mui/material';
import { todayISO, addDaysISO } from '../utils';

const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DateStripProps {
  value: string;                       // YYYY-MM-DD
  onChange: (date: string) => void;
  days?: number;                       // how many days forward to offer
}

export default function DateStrip({ value, onChange, days = 16 }: DateStripProps) {
  const today = todayISO();
  return (
    <Box role="group" aria-label="Trip date"
      sx={{ display: 'flex', gap: 0.6, overflowX: 'auto', pb: 0.5, scrollSnapType: 'x proximity',
        '&::-webkit-scrollbar': { height: 5 }, '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.18)', borderRadius: 3 } }}>
      {Array.from({ length: days }, (_, i) => {
        const iso = addDaysISO(today, i);
        const sel = iso === value;
        const [y, m, d] = iso.split('-').map(Number);
        const wd = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : WD[new Date(y, m - 1, d).getDay()];
        return (
          <Box key={iso} role="button" tabIndex={0} aria-pressed={sel} aria-label={iso}
            onClick={() => onChange(iso)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onChange(iso); } }}
            sx={{ flex: '0 0 auto', scrollSnapAlign: 'start', cursor: 'pointer', userSelect: 'none',
              minWidth: 44, px: 1, py: 0.6, borderRadius: '10px', textAlign: 'center',
              transition: 'background-color .12s, border-color .12s',
              border: '1px solid', borderColor: sel ? 'transparent' : 'divider',
              bgcolor: sel ? 'primary.main' : 'action.hover', color: sel ? 'primary.contrastText' : 'text.primary',
              '&:hover': sel ? {} : { borderColor: 'text.disabled' } }}>
            <Typography sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1.4, color: sel ? 'primary.contrastText' : 'text.secondary', opacity: sel ? 0.72 : 1 }}>{wd}</Typography>
            <Typography sx={{ fontSize: '0.92rem', fontWeight: 700, lineHeight: 1.1 }}>{d}</Typography>
          </Box>
        );
      })}
    </Box>
  );
}
