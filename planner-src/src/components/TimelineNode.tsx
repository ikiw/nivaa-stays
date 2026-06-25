// One row of the itinerary timeline: a coloured dot + a leg-coloured connector down to
// the next dot, the place/break/meal card (rating, tag, stay picker, reorder/delete),
// and the drive label on the connector. App injects `data` + the edit handlers.
import { Stack, Box, Paper, Typography, IconButton, TextField, MenuItem } from '@mui/material';
import RestaurantRounded from '@mui/icons-material/RestaurantRounded';
import SelfImprovementRounded from '@mui/icons-material/SelfImprovementRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import KeyboardArrowUpRounded from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import DirectionsCarRounded from '@mui/icons-material/DirectionsCarRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import { STAY_OPTIONS, TAG_COLOR, CAT_ICON, CAT_HEX } from '../constants';
import { fmtDur, weatherInfo } from '../utils';
import type { Category, ItineraryData, HourWeather } from '../types';

export interface TimelineNodeProps {
  icon?: SvgIconComponent;
  idx?: number;
  cat?: Category;
  dot?: string | number;
  title?: string;
  sub?: string;
  stay?: number;
  gi?: number;
  last?: boolean;
  legColor?: string;
  drive?: string | null;
  tag?: string | null;
  day?: number;
  upDisabled?: boolean;
  downDisabled?: boolean;
  brk?: true;
  meal?: string;
  wx?: HourWeather | null;   // forecast at this stop's arrival hour
  data: ItineraryData;
  setStay: (gi: number, v: string | number) => void;
  move: (gi: number, dir: number) => void;
  removeAt: (gi: number) => void;
  selectPlace: (idx: number) => void;
}

/** One timeline row: a place stop, or a break/meal pseudo-row. App injects `data` + handlers. */
export default function TimelineNode({ icon, idx, cat, dot, title, sub, stay = 0, gi, last, legColor, drive, tag, day, upDisabled, downDisabled, brk, meal, wx, data, setStay, move, removeAt, selectPlace }: TimelineNodeProps) {
  const stayField = gi != null && (
    <TextField select size="small" value={stay} onChange={e => setStay(gi, e.target.value)} sx={{ width: 118, '& .MuiSelect-select': { fontSize: '0.78rem' } }}
      InputProps={{ startAdornment: <AccessTimeRounded sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} /> }}
      SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 300 } } } }}>
      {(STAY_OPTIONS.includes(stay) ? STAY_OPTIONS : [...STAY_OPTIONS, stay].sort((a, b) => a - b)).map(m => (<MenuItem key={m} value={m}>{fmtDur(m)}</MenuItem>))}
    </TextField>
  );
  // tiny forecast for this stop's arrival hour — emoji + temp, rain % only when notable
  const wxBit = wx ? (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, flexShrink: 0, fontSize: '0.74rem', color: 'text.secondary' }}>
      <Box component="span" sx={{ fontSize: 13, lineHeight: 1 }} aria-hidden>{weatherInfo(wx.code).emoji}</Box>
      <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{wx.temp}°</Box>
      {wx.precip >= 40 && <Box component="span" sx={{ color: '#60A5FA', fontWeight: 600 }}>{wx.precip}%</Box>}
    </Box>
  ) : null;
  if (brk || meal) {
    const PIcon = meal ? RestaurantRounded : SelfImprovementRounded;
    const pColor = (meal && TAG_COLOR[meal]) || '#94A3B8';   // only read on meal rows
    return (
      <Stack direction="row" spacing={1.2} alignItems="stretch">
        <Box sx={{ width: 26, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: meal ? `${pColor}22` : 'rgba(255,255,255,0.10)', color: meal ? pColor : 'text.secondary' }}><PIcon sx={{ fontSize: 15 }} /></Box>
          {!last && <Box sx={{ flex: 1, width: 3, bgcolor: legColor || 'divider', borderRadius: 2, mt: 0.4, minHeight: 22, opacity: 0.55 }} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, pb: last ? 0 : 1.2 }}>
          <Paper variant="outlined" sx={{ p: 1, borderStyle: 'dashed', bgcolor: 'transparent' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.6 }}>
                <PIcon sx={{ fontSize: 16, color: meal ? pColor : 'inherit' }} /> {meal || 'Free time'}
                {meal && <Box component="span" sx={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', px: 0.6, py: '1px', borderRadius: '6px', bgcolor: `${pColor}26`, color: pColor }}>{meal}</Box>}
              </Typography>
              {gi != null && (
                <Stack direction="row" spacing={0.2} sx={{ flexShrink: 0 }}>
                  <IconButton size="small" disabled={upDisabled} onClick={() => move(gi, -1)}><KeyboardArrowUpRounded fontSize="small" /></IconButton>
                  <IconButton size="small" disabled={downDisabled} onClick={() => move(gi, 1)}><KeyboardArrowDownRounded fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => removeAt(gi)}><DeleteOutlineRounded fontSize="small" /></IconButton>
                </Stack>
              )}
            </Stack>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 0.4, fontSize: '0.78rem', color: 'text.secondary' }}>
              <span>{sub} · {meal ? 'grab a bite nearby' : 'relax or explore on your own'}</span>
              <Stack direction="row" alignItems="center" spacing={0.8} sx={{ flexShrink: 0 }}>{wxBit}{stayField}</Stack>
            </Stack>
          </Paper>
          {!last && drive && (<Box sx={{ mt: 0.7, fontSize: '0.76rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}><DirectionsCarRounded sx={{ fontSize: 15, color: legColor || 'inherit' }} />{drive}</Box>)}
        </Box>
      </Stack>
    );
  }
  const Icon = icon || (cat && CAT_ICON[cat]);
  const catColor = cat ? (CAT_HEX[cat] || '#94A3B8') : '#F59E0B';   // match the map markers
  const p = idx != null ? data.places[idx] : null;   // for rating/reviews + tap-for-details
  return (
    <Stack direction="row" spacing={1.2} alignItems="stretch">
      <Box sx={{ width: 26, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: catColor, color: '#0B1020', fontSize: '0.72rem', fontWeight: 700 }}>{dot}</Box>
        {!last && <Box sx={{ flex: 1, width: 3, bgcolor: legColor || 'divider', borderRadius: 2, mt: 0.4, minHeight: 22 }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, pb: last ? 0 : 1.2 }}>
        <Paper variant="outlined" onClick={idx != null ? () => selectPlace(idx) : undefined}
          sx={{ p: 1, ...(idx != null && { cursor: 'pointer', transition: 'background-color .12s, border-color .12s', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.22)' }, '&:active': { bgcolor: 'rgba(255,255,255,0.09)' } }) }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
              {Icon && <Icon sx={{ fontSize: 16, color: catColor, flexShrink: 0 }} />}<Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</Box>
              {tag && <Box component="span" sx={{ flexShrink: 0, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', px: 0.6, py: '1px', borderRadius: '6px', bgcolor: `${TAG_COLOR[tag] || '#94A3B8'}26`, color: TAG_COLOR[tag] || '#94A3B8' }}>{tag}</Box>}
              {idx != null && <ChevronRightRounded sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />}
            </Typography>
            {gi != null && (
              <Stack direction="row" spacing={0.2} sx={{ flexShrink: 0 }}>
                <IconButton size="small" disabled={upDisabled} onClick={(e) => { e.stopPropagation(); move(gi, -1); }}><KeyboardArrowUpRounded fontSize="small" /></IconButton>
                <IconButton size="small" disabled={downDisabled} onClick={(e) => { e.stopPropagation(); move(gi, 1); }}><KeyboardArrowDownRounded fontSize="small" /></IconButton>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeAt(gi); }}><DeleteOutlineRounded fontSize="small" /></IconButton>
              </Stack>
            )}
          </Stack>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 0.4, fontSize: '0.78rem', color: 'text.secondary' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
              {p && p.rating ? (
                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, flexShrink: 0 }}>
                  <StarRounded sx={{ fontSize: 13, color: '#FBBF24' }} />
                  <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{p.rating}</Box>
                  {p.reviews ? <Box component="span">({Number(p.reviews).toLocaleString()})</Box> : null}
                </Box>
              ) : null}
              {p && p.rating && sub ? <Box component="span" sx={{ opacity: 0.45, flexShrink: 0 }}>·</Box> : null}
              {sub ? <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</Box> : null}
            </Box>
            <Stack direction="row" alignItems="center" spacing={0.8} sx={{ flexShrink: 0 }}>
              {wxBit}
              {gi != null && (
                <TextField select size="small" value={stay} onClick={(e) => e.stopPropagation()} onChange={e => setStay(gi, e.target.value)} sx={{ width: 118, flexShrink: 0, '& .MuiSelect-select': { fontSize: '0.78rem' } }}
                  InputProps={{ startAdornment: <AccessTimeRounded sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} /> }}
                  SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 300 } } } }}>
                  {(STAY_OPTIONS.includes(stay) ? STAY_OPTIONS : [...STAY_OPTIONS, stay].sort((a, b) => a - b)).map(m => (
                    <MenuItem key={m} value={m}>{fmtDur(m)}</MenuItem>
                  ))}
                </TextField>
              )}
            </Stack>
          </Stack>
        </Paper>
        {!last && drive && (
          <Box sx={{ mt: 0.7, fontSize: '0.76rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <DirectionsCarRounded sx={{ fontSize: 15, color: legColor || 'inherit' }} />{drive}
          </Box>
        )}
      </Box>
    </Stack>
  );
}
