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
import BeachAccessRounded from '@mui/icons-material/BeachAccessRounded';
import LocalActivityRounded from '@mui/icons-material/LocalActivityRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import { STAY_OPTIONS, TAG_COLOR, CAT_ICON, NODE_BG, NODE_INK } from '../constants';
import { fmtDur, weatherInfo, track } from '../utils';
import { itineraryNote } from '../placeCopy';
import WeatherIcon from './WeatherIcon';
import PlaceThumb from './PlaceThumb';
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
  readOnly?: boolean;        // clean itinerary mode: hide edit controls and show richer copy
  active?: boolean;          // synced with the map/detail selection
  data: ItineraryData;
  setStay: (gi: number, v: string | number) => void;
  move: (gi: number, dir: number) => void;
  removeAt: (gi: number) => void;
  selectPlace: (idx: number, source?: string) => void;
}

/** One timeline row: a place stop, or a break/meal pseudo-row. App injects `data` + handlers. */
export default function TimelineNode({ icon, idx, cat, dot, title, sub, stay = 0, gi, last, legColor, drive, tag, day, upDisabled, downDisabled, brk, meal, wx, readOnly = false, active = false, data, setStay, move, removeAt, selectPlace }: TimelineNodeProps) {
  const scrollActiveRow = (el: HTMLDivElement | null) => {
    if (active && el) window.setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0);
  };
  const stayField = !readOnly && gi != null && (
    <TextField select size="small" value={stay} onChange={e => setStay(gi, e.target.value)} sx={{ width: 118, '& .MuiSelect-select': { fontSize: '0.78rem' } }}
      InputProps={{ startAdornment: <AccessTimeRounded sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} /> }}
      SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 300 } } } }}>
      {(STAY_OPTIONS.includes(stay) ? STAY_OPTIONS : [...STAY_OPTIONS, stay].sort((a, b) => a - b)).map(m => (<MenuItem key={m} value={m}>{fmtDur(m)}</MenuItem>))}
    </TextField>
  );
  // tiny forecast for this stop's arrival hour — condition icon + temp, plus an umbrella +
  // rain chance when notable (amber = likely, "carry an umbrella")
  const wxBit = wx ? (
    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, flexShrink: 0, fontSize: '0.74rem', color: 'text.secondary' }}>
      <WeatherIcon code={wx.code} size={14} title={`${weatherInfo(wx.code).label} at this time`} />
      <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>{wx.temp}°</Box>
      {wx.precip >= 40 && (
        <Box component="span" title={`${wx.precip}% chance of rain — carry an umbrella`} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.15, fontWeight: 700, color: wx.precip >= 60 ? '#F59E0B' : '#60A5FA' }}>
          <BeachAccessRounded sx={{ fontSize: 12 }} /> {wx.precip}%
        </Box>
      )}
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
              {!readOnly && gi != null && (
                <Stack direction="row" spacing={0.2} sx={{ flexShrink: 0 }}>
                  <IconButton size="small" disabled={upDisabled} onClick={() => move(gi, -1)}><KeyboardArrowUpRounded fontSize="small" /></IconButton>
                  <IconButton size="small" disabled={downDisabled} onClick={() => move(gi, 1)}><KeyboardArrowDownRounded fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => removeAt(gi)}><DeleteOutlineRounded fontSize="small" /></IconButton>
                </Stack>
              )}
            </Stack>
            <Stack direction="row" alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 0.4, columnGap: 1, rowGap: 0.5, fontSize: '0.78rem', color: 'text.secondary' }}>
              <span>{sub} · {meal ? 'grab a bite nearby' : 'relax or explore on your own'}</span>
              <Stack direction="row" alignItems="center" spacing={0.8} sx={{ flexShrink: 0, ml: 'auto' }}>{wxBit}{stayField}</Stack>
            </Stack>
          </Paper>
          {!last && drive && (<Box sx={{ mt: 0.7, fontSize: '0.76rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}><DirectionsCarRounded sx={{ fontSize: 15, color: legColor || 'inherit' }} />{drive}</Box>)}
        </Box>
      </Stack>
    );
  }
  const Icon = icon || (cat && CAT_ICON[cat]);
  const catColor = NODE_BG;   // single theme accent — no per-category rainbow
  const p = idx != null ? data.places[idx] : null;   // for rating/reviews + tap-for-details
  const hasThumb = !!(p && p.img);                   // committed photo → lead the row with it (static, no API call)
  const readableDesc = readOnly && p ? itineraryNote(p) : null;
  return (
    <Stack ref={scrollActiveRow} direction="row" spacing={1.2} alignItems="stretch">
      <Box sx={{ width: 26, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: catColor, color: NODE_INK, fontSize: '0.72rem', fontWeight: 700 }}>{dot}</Box>
        {!last && <Box sx={{ flex: 1, width: 3, bgcolor: legColor || 'divider', borderRadius: 2, mt: 0.4, minHeight: 22 }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, pb: last ? 0 : 1.2 }}>
        <Paper variant="outlined" onClick={idx != null ? () => selectPlace(idx, 'timeline') : undefined}
          sx={{ p: readOnly ? 1.15 : 1, borderRadius: readOnly ? '13px' : undefined, bgcolor: active ? 'rgba(91,138,199,0.16)' : readOnly ? 'rgba(255,255,255,0.025)' : undefined, borderColor: active ? 'primary.main' : undefined, ...(idx != null && { cursor: 'pointer', transition: 'background-color .12s, border-color .12s', '&:hover': { bgcolor: active ? 'rgba(91,138,199,0.20)' : 'action.hover', borderColor: active ? 'primary.main' : 'divider' }, '&:active': { bgcolor: 'action.selected' } }) }}>
          <Stack direction="row" spacing={readOnly ? 1.35 : 1.1} alignItems="stretch">
          {p?.img && <PlaceThumb place={p} size={readOnly ? 64 : 46} tint={catColor} radius={readOnly ? '10px' : '8px'} iconSize={readOnly ? 22 : 20} />}
          <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={0.5}>
            <Box sx={{ minWidth: 0, flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: 0.6, rowGap: 0.3, pt: 0.2 }}>
              {!hasThumb && Icon && <Icon sx={{ fontSize: readOnly ? 17 : 16, color: catColor, flexShrink: 0 }} />}<Typography component="span" sx={{ fontWeight: 700, fontSize: readOnly ? '0.96rem' : '0.9rem', lineHeight: 1.24, color: 'text.primary', minWidth: 0, maxWidth: '100%', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{title}</Typography>
              {tag && <Box component="span" sx={{ flexShrink: 0, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', px: 0.6, py: '1px', borderRadius: '6px', bgcolor: `${TAG_COLOR[tag] || '#94A3B8'}26`, color: TAG_COLOR[tag] || '#94A3B8' }}>{tag}</Box>}
              {p?.book && <Box component="a" href={p.book.url} target="_blank" rel="noopener" title={p.book.label} onClick={(e) => { e.stopPropagation(); track('place_book', { name: title, source: 'timeline' }); }} sx={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 0.25, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', px: 0.6, py: '1px', borderRadius: '6px', bgcolor: 'rgba(251,191,36,0.18)', color: '#FBBF24', textDecoration: 'none', '&:hover': { bgcolor: 'rgba(251,191,36,0.32)' } }}><LocalActivityRounded sx={{ fontSize: 11 }} /> Book</Box>}
              {idx != null && <ChevronRightRounded sx={{ fontSize: 18, color: 'text.disabled', flexShrink: 0 }} />}
            </Box>
            {!readOnly && gi != null && (
              <Stack direction="row" spacing={0.2} sx={{ flexShrink: 0 }}>
                <IconButton size="small" disabled={upDisabled} onClick={(e) => { e.stopPropagation(); move(gi, -1); }}><KeyboardArrowUpRounded fontSize="small" /></IconButton>
                <IconButton size="small" disabled={downDisabled} onClick={(e) => { e.stopPropagation(); move(gi, 1); }}><KeyboardArrowDownRounded fontSize="small" /></IconButton>
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeAt(gi); }}><DeleteOutlineRounded fontSize="small" /></IconButton>
              </Stack>
            )}
          </Stack>
          {readableDesc && <Typography sx={{ mt: 0.45, fontSize: '0.78rem', lineHeight: 1.45, color: 'text.secondary', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{readableDesc}</Typography>}
          <Stack direction="row" alignItems="center" useFlexGap flexWrap="wrap" sx={{ mt: 0.4, columnGap: 1, rowGap: 0.5, fontSize: '0.78rem', color: 'text.secondary' }}>
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
            <Stack direction="row" alignItems="center" spacing={0.8} sx={{ flexShrink: 0, ml: 'auto' }}>
              {wxBit}
              {!readOnly && gi != null && (
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
          </Box>
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
