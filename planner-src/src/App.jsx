import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar, Toolbar, Box, Stack, Paper, Card, CardActionArea, Chip, Button, IconButton,
  TextField, MenuItem, Typography, BottomNavigation, BottomNavigationAction, Drawer,
  Snackbar, CircularProgress, Divider, useMediaQuery, InputAdornment, Tooltip, Slider,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import BeachAccessRounded from '@mui/icons-material/BeachAccessRounded';
import AccountBalanceRounded from '@mui/icons-material/AccountBalanceRounded';
import RestaurantRounded from '@mui/icons-material/RestaurantRounded';
import LocalBarRounded from '@mui/icons-material/LocalBarRounded';
import ShoppingBagRounded from '@mui/icons-material/ShoppingBagRounded';
import FlagRounded from '@mui/icons-material/FlagRounded';
import DirectionsCarRounded from '@mui/icons-material/DirectionsCarRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import AddRounded from '@mui/icons-material/AddRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import KeyboardArrowUpRounded from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import RouteRounded from '@mui/icons-material/RouteRounded';
import ExploreRounded from '@mui/icons-material/ExploreRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import { Map, AdvancedMarker, InfoWindow, useMap, useMapsLibrary } from '@vis.gl/react-google-maps';
import { MAP_ID } from './config.js';

const DATA_URL = '/data/pondicherry-itinerary.json';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CAT_ICON = { Beach: BeachAccessRounded, Attraction: AccountBalanceRounded, Food: RestaurantRounded, Social: LocalBarRounded, Shopping: ShoppingBagRounded, Stay: FlagRounded, Area: FlagRounded };
// Per-category colours, shared by the map markers, the picker icons and the day dots.
const CAT_HEX = { Stay: '#F59E0B', Area: '#F59E0B', Beach: '#38BDF8', Attraction: '#2DD4BF', Food: '#FB923C', Social: '#F472B6', Shopping: '#A78BFA' };
// Distinct colour per route leg (start→1, 1→2, …) — cycles if there are more legs.
const LEG_COLORS = ['#2563EB', '#EA580C', '#059669', '#DB2777', '#7C3AED', '#D97706', '#0891B2', '#DC2626', '#65A30D', '#0D9488'];
const CAT_LABEL = { Beach: 'Beaches', Attraction: 'Things to See', Food: 'Food & Drink', Social: 'Bars & Nightlife', Shopping: 'Shopping' };
const PICK_ORDER = ['Beach', 'Attraction', 'Food', 'Social', 'Shopping'];
const SUB_ORDER = {
  Attraction: ['heritage', 'nature', 'spiritual', 'adventure'],
  Food: ['south-indian', 'north-indian', 'multicuisine', 'continental', 'asian', 'cafe', 'dessert', 'fine'],
};
const SUB_LABEL = {
  heritage: 'Heritage & Museums', nature: 'Nature & Outdoors', spiritual: 'Spiritual', adventure: 'Adventure & Diving',
  'south-indian': 'South Indian', 'north-indian': 'North Indian', multicuisine: 'Multi-cuisine',
  continental: 'Continental', asian: 'Asian', cafe: 'Cafés & Bakeries', dessert: 'Desserts & Ice Cream', fine: 'Fine Dining',
};
const DEFAULT_STAY = { Beach: 60, Food: 60, Attraction: 30, Social: 45, Shopping: 30, Stay: 0 };
const STAY_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240];
const fmtDur = (m) => { const h = Math.floor(m / 60), mm = m % 60; return (h ? h + 'h' : '') + (mm ? (h ? ' ' : '') + mm + 'm' : (h ? '' : '0m')); };

const parseTime = (s) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const fmtClock = (t) => { t = ((Math.round(t) % 1440) + 1440) % 1440; const h = Math.floor(t / 60), m = t % 60, ap = h < 12 ? 'AM' : 'PM', hh = h % 12 || 12; return `${hh}:${String(m).padStart(2, '0')} ${ap}`; };
const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const mapLink = (p) => p.map || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name + ', Pondicherry'));

// Read the shareable plan out of the URL query (?s=start &st/&et=window &p=stop-idxs &v=view).
// Per-stop stay durations are intentionally not encoded — they fall back to the defaults.
function parseSearch() {
  const q = new URLSearchParams(window.location.search);
  const s = q.get('s'), st = q.get('st'), et = q.get('et'), p = q.get('p'), v = q.get('v');
  return {
    start: s != null && /^\d+$/.test(s) ? +s : null,
    startTime: /^\d{1,2}:\d{2}$/.test(st || '') ? st : null,
    endTime: /^\d{1,2}:\d{2}$/.test(et || '') ? et : null,
    stopIdxs: p ? p.split('-').map(x => +x).filter(n => Number.isInteger(n) && n >= 0) : [],
    view: v === 'places' || v === 'day' ? v : null,
  };
}

export default function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:900px)');
  const [data, setData] = useState(null);
  const [err, setErr] = useState(false);
  const [start, setStart] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');
  const [stops, setStops] = useState([]); // [{ idx, stay }]
  const [filter, setFilter] = useState('All');
  const [subFilter, setSubFilter] = useState('All');
  const [mobView, setMobView] = useState('map'); // map | places | day (mobile)
  const [deskTab, setDeskTab] = useState('places'); // places | day (desktop rail)
  const [aiQuery, setAiQuery] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [snack, setSnack] = useState('');
  // Defer mounting the interactive Google Map until the visitor actually engages
  // (adds a place / plans a day / taps "Load map") — a Map mount is a billed
  // Dynamic-Maps load, so bounce visitors who never interact cost nothing.
  const [mapActive, setMapActive] = useState(false);
  useEffect(() => { if (stops.length > 0) setMapActive(true); }, [stops.length]);

  // ---------- shareable URL state (query params) ----------
  const hydrated = useRef(false);
  const defaultStartRef = useRef(0);              // the no-op start (bus stand) — omitted from the URL
  const initialUrl = useRef(null);
  if (initialUrl.current === null) initialUrl.current = parseSearch();
  const stateRef = useRef(null);                  // latest itinerary, readable from history callbacks
  stateRef.current = { start, startTime, endTime, stops };
  const viewRef = useRef('map');
  viewRef.current = isMobile ? mobView : deskTab;

  const buildSearch = (viewOverride) => {
    const { start, startTime, endTime, stops } = stateRef.current;
    const view = viewOverride !== undefined ? viewOverride : viewRef.current;
    const q = new URLSearchParams();
    if (start != null && start !== defaultStartRef.current) q.set('s', String(start));
    if (startTime && startTime !== '09:00') q.set('st', startTime);
    if (endTime && endTime !== '19:00') q.set('et', endTime);
    if (stops.length) q.set('p', stops.map(s => s.idx).join('-'));
    if (view === 'day') q.set('v', 'day');
    else if (view === 'places' && isMobile) q.set('v', 'places');   // desktop 'places' is the default, keep it clean
    const qs = q.toString();
    return window.location.pathname + (qs ? '?' + qs : '');
  };

  // Open a panel ("Add places" / "Your day"). On mobile, opening from the map pushes a
  // history entry so the phone back button closes the panel instead of leaving the app.
  const openView = (v) => {
    const wasPanelOpen = isMobile ? mobView !== 'map' : true;
    setMobView(v); setDeskTab(v === 'day' ? 'day' : 'places');
    const url = buildSearch(v);
    if (isMobile && !wasPanelOpen) window.history.pushState({ planner: true }, '', url);
    else window.history.replaceState(window.history.state, '', url);
  };
  const closeView = () => { if (isMobile && mobView !== 'map') window.history.back(); };

  useEffect(() => {
    fetch(DATA_URL).then(r => r.json()).then(d => {
      setData(d);
      const bus = d.places.findIndex(p => /bus stand/i.test(p.name));
      defaultStartRef.current = bus >= 0 ? bus : 0;
      // Hydrate from a shared link if present, else fall back to the bus-stand default.
      const u = initialUrl.current;
      const startIdx = u.start != null && d.places[u.start] ? u.start : (bus >= 0 ? bus : 0);
      setStart(startIdx);
      if (u.startTime) setStartTime(u.startTime);
      if (u.endTime) setEndTime(u.endTime);
      if (u.stopIdxs.length) {
        const seen = new Set();
        setStops(u.stopIdxs
          .filter(i => d.places[i] && i !== startIdx && !seen.has(i) && seen.add(i))
          .map(i => ({ idx: i, stay: DEFAULT_STAY[d.places[i].cat] ?? 45 })));
      }
      if (u.view) { setMobView(u.view); setDeskTab(u.view); }
      hydrated.current = true;
    }).catch(() => setErr(true));
  }, []);

  // Keep the URL in sync with the itinerary (always shareable) — replace, never push.
  useEffect(() => {
    if (hydrated.current) window.history.replaceState(window.history.state, '', buildSearch());
  }, [start, startTime, endTime, stops]);

  // Phone back/forward → restore the open view without rolling back the live plan.
  useEffect(() => {
    const onPop = () => {
      const v = parseSearch().view;
      if (isMobile) setMobView(v || 'map'); else setDeskTab(v === 'day' ? 'day' : 'places');
      if (hydrated.current) window.history.replaceState(window.history.state, '', buildSearch(v || (isMobile ? 'map' : 'places')));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isMobile]);

  const driveMin = (a, b) => { const v = data?.minutes?.[a]?.[b]; return v == null ? 0 : v; };
  const driveKm = (a, b) => { const v = data?.km?.[a]?.[b]; return v == null ? 0 : v; };
  const isStop = (i) => stops.some(s => s.idx === i);

  const starts = useMemo(() => data ? data.places.map((p, i) => ({ p, i })).filter(x => x.p.cat === 'Stay' || x.p.cat === 'Area') : [], [data]);

  // group selectable places by category for the picker
  const byCat = useMemo(() => {
    const m = {};
    if (data) data.places.forEach((p, i) => { if (i !== start && PICK_ORDER.includes(p.cat)) (m[p.cat] = m[p.cat] || []).push(i); });
    return m;
  }, [data, start]);

  const addToggle = (i) => {
    setStops(prev => prev.some(s => s.idx === i)
      ? prev.filter(s => s.idx !== i)
      : [...prev, { idx: i, stay: DEFAULT_STAY[data.places[i].cat] ?? 45 }]);
  };
  const removeStop = (i) => setStops(prev => prev.filter(s => s.idx !== i));
  const move = (n, dir) => setStops(prev => { const a = prev.slice(); const j = n + dir; if (j < 0 || j >= a.length) return prev; [a[n], a[j]] = [a[j], a[n]]; return a; });
  const setStay = (n, v) => setStops(prev => prev.map((s, k) => k === n ? { ...s, stay: Math.max(0, +v || 0) } : s));

  function optimize() {
    setStops(prev => {
      if (prev.length < 2) return prev;
      const remaining = prev.slice(), ordered = []; let cur = start;
      while (remaining.length) {
        let best = 0, bestMin = Infinity;
        remaining.forEach((s, i) => { const m = driveMin(cur, s.idx); if (m < bestMin) { bestMin = m; best = i; } });
        const nx = remaining.splice(best, 1)[0]; ordered.push(nx); cur = nx.idx;
      }
      return ordered;
    });
  }

  async function aiPlan() {
    const q = aiQuery.trim(); if (!q || aiBusy) return;
    setAiBusy(true);
    const hadStops = stops.length > 0;
    const prevStay = {}; stops.forEach(s => { prevStay[s.idx] = s.stay; });
    try {
      const res = await fetch('/api/plan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, startTime, current: { start, stops: stops.map(s => s.idx) } }),
      });
      const d = await res.json();
      if (!res.ok || !Array.isArray(d.stops) || !d.stops.length) throw new Error('no_plan');
      let nextStart = start;
      if (typeof d.start === 'number' && data.places[d.start] && ['Area', 'Stay'].includes(data.places[d.start].cat)) nextStart = d.start;
      setStart(nextStart);
      let next = d.stops.filter(i => data.places[i] && i !== nextStart)
        .map(i => ({ idx: i, stay: prevStay[i] ?? (DEFAULT_STAY[data.places[i].cat] ?? 45) }));
      if (!hadStops && next.length >= 2) {
        const remaining = next.slice(), ordered = []; let cur = nextStart;
        while (remaining.length) { let b = 0, bm = Infinity; remaining.forEach((s, i) => { const m = driveMin(cur, s.idx); if (m < bm) { bm = m; b = i; } }); const nx = remaining.splice(b, 1)[0]; ordered.push(nx); cur = nx.idx; }
        next = ordered;
      }
      setStops(next);
      openView('day');
      setSnack(d.note ? '✨ ' + d.note : '✨ Here’s a suggested day — tweak it freely.');
    } catch {
      setSnack('Couldn’t auto-plan just now — add places manually, or try rephrasing.');
    } finally { setAiBusy(false); }
  }

  const gmapsUrl = () => {
    const pt = i => `${data.places[i].lat},${data.places[i].lng}`;
    let u = `https://www.google.com/maps/dir/?api=1&origin=${pt(start)}&destination=${pt(start)}&travelmode=driving`;
    const wps = stops.map(s => pt(s.idx)).join('|');
    if (wps) u += `&waypoints=${encodeURIComponent(wps)}`;
    return u;
  };

  if (err) return <Centered>Could not load the places data. Please refresh.</Centered>;
  if (!data) return <Centered><CircularProgress /></Centered>;

  // ---------- timeline computation ----------
  const timeline = [];
  let clock = parseTime(startTime), totalDrive = 0, totalKm = 0, prev = start;
  stops.forEach((s, n) => {
    const dm = driveMin(prev, s.idx), dk = driveKm(prev, s.idx);
    totalDrive += dm; totalKm += dk; clock += dm;
    const arrive = clock; clock += s.stay; const depart = clock;
    timeline.push({ n, idx: s.idx, dm, dk, arrive, depart, stay: s.stay });
    prev = s.idx;
  });
  const rMin = driveMin(prev, start), rKm = driveKm(prev, start);
  totalDrive += rMin; totalKm += rKm; clock += rMin;

  // ---------- render helpers ----------
  const categoryChips = () => (
    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
      {[['All', 'All places', Object.values(byCat).reduce((a, b) => a + b.length, 0)],
        ...PICK_ORDER.filter(c => byCat[c]).map(c => [c, CAT_LABEL[c], byCat[c].length])].map(([key, label, n]) => {
        const Icon = key === 'All' ? null : CAT_ICON[key];
        return (
          <Chip key={key} label={`${label} ${n}`} icon={Icon ? <Icon /> : undefined} size="small"
            color={filter === key ? 'primary' : 'default'} variant={filter === key ? 'filled' : 'outlined'}
            onClick={() => { setFilter(key); setSubFilter('All'); }} sx={{ fontWeight: 600 }} />
        );
      })}
    </Stack>
  );
  const subChips = () => {
    if (!SUB_ORDER[filter]) return null;
    const counts = {}; (byCat[filter] || []).forEach(i => { const sub = data.places[i].sub || ''; counts[sub] = (counts[sub] || 0) + 1; });
    const subs = SUB_ORDER[filter].filter(s => counts[s]).concat(Object.keys(counts).filter(s => s && !SUB_ORDER[filter].includes(s)));
    return (
      <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
        {[['All', 'All', Object.values(counts).reduce((a, b) => a + b, 0)], ...subs.map(s => [s, SUB_LABEL[s] || s, counts[s]])].map(([key, label, n]) => (
          <Chip key={key} label={`${label} ${n}`} size="small" onClick={() => setSubFilter(key)}
            color={subFilter === key ? 'primary' : 'default'} variant={subFilter === key ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
        ))}
      </Stack>
    );
  };
  const FilterChips = () => (
    <Box>{categoryChips()}{SUB_ORDER[filter] && <Box sx={{ mt: 1 }}>{subChips()}</Box>}</Box>
  );

  const PlaceCard = (i) => {
    const p = data.places[i], added = isStop(i), Icon = CAT_ICON[p.cat];
    return (
      <Card key={i} variant="outlined" sx={{ borderColor: added ? 'primary.main' : 'divider', bgcolor: added ? 'rgba(33,150,243,0.16)' : 'background.paper', '&:hover': { borderColor: 'primary.main', boxShadow: '0 0 0 1px rgba(33,150,243,0.5), 0 8px 22px rgba(0,0,0,0.4)' } }}>
        <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
          <CardActionArea onClick={(e) => { addToggle(i); e.currentTarget.blur(); }} sx={{ p: 1.1, display: 'flex', alignItems: 'flex-start', gap: 1, '& .MuiCardActionArea-focusHighlight': { opacity: 0 } }}>
            <Icon sx={{ fontSize: 18, color: CAT_HEX[p.cat] || 'text.secondary', mt: '2px', flexShrink: 0 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: 'text.primary', lineHeight: 1.2 }}>{p.name}</Typography>
              {p.desc && <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.desc}</Typography>}
            </Box>
            <Chip size="small" label={added ? 'Added' : 'Add'} icon={added ? <CheckRounded /> : <AddRounded />}
              color={added ? 'primary' : 'default'} variant={added ? 'filled' : 'outlined'} sx={{ alignSelf: 'center', fontWeight: 700 }} />
          </CardActionArea>
          <Tooltip title="Google Maps">
            <IconButton size="small" component="a" href={mapLink(p)} target="_blank" rel="noopener" sx={{ borderLeft: '1px solid', borderColor: 'divider', borderRadius: 0, color: 'text.secondary' }}>
              <OpenInNewRounded fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Card>
    );
  };

  const PlacesPanel = () => {
    const cats = filter === 'All' ? PICK_ORDER : PICK_ORDER.filter(c => c === filter);
    return (
      <Box>
        {cats.map(cat => {
          const items = byCat[cat]; if (!items) return null;
          const blocks = [];
          if (filter === 'All') blocks.push(<CatHead key={'h' + cat} cat={cat} />);
          if (SUB_ORDER[cat]) {
            const bySub = {}; items.forEach(i => { const s = data.places[i].sub || ''; (bySub[s] = bySub[s] || []).push(i); });
            let subs = SUB_ORDER[cat].filter(s => bySub[s]).concat(Object.keys(bySub).filter(s => !SUB_ORDER[cat].includes(s)));
            const single = filter === cat && subFilter !== 'All';
            if (single) subs = subs.filter(s => s === subFilter);
            subs.forEach(s => {
              if (s && !single) blocks.push(<Typography key={cat + s} sx={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', mt: 1, mb: 0.5 }}>{SUB_LABEL[s] || s}</Typography>);
              blocks.push(<Grid key={cat + s + 'g'}>{bySub[s].map(PlaceCard)}</Grid>);
            });
          } else {
            blocks.push(<Grid key={cat + 'g'}>{items.map(PlaceCard)}</Grid>);
          }
          return <Box key={cat} sx={{ mb: 1.5 }}>{blocks}</Box>;
        })}
      </Box>
    );
  };

  const DayPanel = () => (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
        <Button size="small" variant="outlined" startIcon={<RouteRounded />} disabled={stops.length < 2} onClick={optimize}>Optimize</Button>
        <Button size="small" variant="outlined" color="inherit" disabled={!stops.length} onClick={() => setStops([])}>Clear</Button>
        <Button size="small" variant="contained" color="secondary" startIcon={<OpenInNewRounded />} disabled={!stops.length} component="a" href={stops.length ? gmapsUrl() : undefined} target="_blank" rel="noopener">Open in Maps</Button>
      </Stack>
      {!stops.length
        ? <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center', fontSize: '0.9rem' }}>Add places to build your day.</Typography>
        : (<>
            <Stack direction="row" spacing={2} sx={{ mb: 1.5, fontSize: '0.82rem', flexWrap: 'wrap' }} useFlexGap>
              <span><b>{stops.length}</b> stops</span>
              <span><DirectionsCarRounded sx={{ fontSize: 15, verticalAlign: '-3px' }} /> <b>{totalDrive} min</b> · {totalKm.toFixed(1)} km</span>
              <span>Back by <b>{fmtClock(clock)}</b></span>
              {(() => { const over = Math.round(clock) - parseTime(endTime); return (
                <Chip size="small" variant="outlined" color={over > 0 ? 'warning' : 'success'}
                  label={over > 0 ? `over by ${Math.floor(over / 60) ? Math.floor(over / 60) + 'h ' : ''}${over % 60}m` : 'fits your window'} />
              ); })()}
            </Stack>
            {Node({ icon: FlagRounded, title: data.places[start].name, sub: `Depart ${fmtClock(parseTime(startTime))}`, dot: 'S',
              legColor: LEG_COLORS[0], drive: `${timeline[0].dm} min · ${timeline[0].dk} km` })}
            {timeline.map(t => {
              const lastStop = t.n === stops.length - 1;
              return <Fragment key={t.n}>{Node({
                idx: t.idx, dot: t.n + 1, title: data.places[t.idx].name, cat: data.places[t.idx].cat,
                sub: `${fmtClock(t.arrive)} – ${fmtClock(t.depart)}`, stay: t.stay, n: t.n,
                legColor: lastStop ? '#64748B' : LEG_COLORS[(t.n + 1) % LEG_COLORS.length],
                drive: lastStop ? `${rMin} min · ${rKm} km · back to start` : `${timeline[t.n + 1].dm} min · ${timeline[t.n + 1].dk} km`,
              })}</Fragment>;
            })}
            {Node({ icon: FlagRounded, title: `Back at ${data.places[start].name}`, sub: `Arrive ${fmtClock(clock)}`, dot: 'S', last: true })}
          </>)}
    </Box>
  );

  // connected timeline row: coloured dot + a leg-coloured line to the next dot,
  // the place card, and the drive label sitting on the connector.
  function Node({ icon, idx, cat, dot, title, sub, stay, n, last, legColor, drive }) {
    const Icon = icon || (cat && CAT_ICON[cat]);
    const catColor = cat ? (CAT_HEX[cat] || '#94A3B8') : '#F59E0B';   // match the map markers
    return (
      <Stack direction="row" spacing={1.2} alignItems="stretch">
        <Box sx={{ width: 26, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box sx={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            bgcolor: catColor, color: '#0B1020', fontSize: '0.72rem', fontWeight: 700 }}>{dot}</Box>
          {!last && <Box sx={{ flex: 1, width: 3, bgcolor: legColor || 'divider', borderRadius: 2, mt: 0.4, minHeight: 22 }} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, pb: last ? 0 : 1.2 }}>
          <Paper variant="outlined" sx={{ p: 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.6, minWidth: 0 }}>
                {Icon && <Icon sx={{ fontSize: 16, color: catColor, flexShrink: 0 }} />}<span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
              </Typography>
              {typeof n === 'number' && (
                <Stack direction="row" spacing={0.2} sx={{ flexShrink: 0 }}>
                  <IconButton size="small" disabled={n === 0} onClick={() => move(n, -1)}><KeyboardArrowUpRounded fontSize="small" /></IconButton>
                  <IconButton size="small" disabled={n === stops.length - 1} onClick={() => move(n, 1)}><KeyboardArrowDownRounded fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => removeStop(idx)}><DeleteOutlineRounded fontSize="small" /></IconButton>
                </Stack>
              )}
            </Stack>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 0.4, fontSize: '0.78rem', color: 'text.secondary' }}>
              <span>{sub}</span>
              {typeof n === 'number' && (
                <TextField select size="small" value={stay} onChange={e => setStay(n, e.target.value)} sx={{ width: 118 }}
                  InputProps={{ startAdornment: <AccessTimeRounded sx={{ fontSize: 16, color: 'text.secondary', mr: 0.6 }} /> }}
                  SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 300 } } } }}>
                  {(STAY_OPTIONS.includes(stay) ? STAY_OPTIONS : [...STAY_OPTIONS, stay].sort((a, b) => a - b)).map(m => (
                    <MenuItem key={m} value={m}>{fmtDur(m)}</MenuItem>
                  ))}
                </TextField>
              )}
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

  const MapView = () => (
    <Box sx={{ height: '100%', minHeight: 0, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative', bgcolor: '#0d0d10' }}>
      {mapActive ? (
        <>
          <RouteMap data={data} start={start} stops={stops} />
          {!stops.length && (
            <Paper sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 2, px: 2, py: 1, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: 'rgba(18,20,26,0.9)', backdropFilter: 'blur(8px)', boxShadow: '0 6px 22px rgba(0,0,0,0.4)', color: 'text.secondary', fontSize: '0.85rem', maxWidth: 'calc(100% - 32px)', pointerEvents: 'none' }}>
              <PlaceRounded sx={{ fontSize: 18, flexShrink: 0 }} /> Add places to start building your itinerary.
            </Paper>
          )}
        </>
      ) : (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', p: { xs: 2.5, md: 3.5 },
          backgroundImage: 'linear-gradient(0deg, rgba(10,10,12,0.92) 0%, rgba(10,10,12,0.35) 38%, rgba(10,10,12,0) 70%), url(/images/pondy-planner-bg.avif)',
          backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ gap: 1.5 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <MapRounded sx={{ fontSize: 20, color: 'primary.light' }} /> {isMobile ? 'Pick places to map your day' : 'Your live map appears here'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.4 }}>
                Add a place or ask the planner — the map and driving route load the moment you start.
              </Typography>
            </Box>
            <Button variant="contained" size="small" startIcon={<MapRounded />} onClick={() => setMapActive(true)} sx={{ flexShrink: 0 }}>Load map now</Button>
          </Stack>
        </Box>
      )}
    </Box>
  );

  const AiBar = () => (
    <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', px: 0.6, py: 0.4, borderRadius: 999, border: '1px solid', borderColor: 'divider', boxShadow: '0 6px 24px rgba(0,0,0,0.45)' }}>
      <TextField fullWidth variant="standard" placeholder={isMobile ? 'Prompt your ideal day…' : 'Prompt your ideal day — e.g. “beaches & filter coffee, relaxed pace”'}
        value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') aiPlan(); }}
        InputProps={{ disableUnderline: true, startAdornment: <AutoAwesomeRounded sx={{ color: 'secondary.main', ml: 0.8, mr: 1 }} />, sx: { fontSize: '0.95rem' } }} />
      <Button variant="contained" color="primary" onClick={aiPlan} disabled={aiBusy} startIcon={aiBusy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRounded />} sx={{ borderRadius: 999, flexShrink: 0 }}>
        {aiBusy ? 'Planning…' : 'Plan my day'}
      </Button>
    </Paper>
  );

  const Controls = () => {
    const sMin = parseTime(startTime), eMin = parseTime(endTime);
    return (
      <Stack direction="row" spacing={2} alignItems="center" sx={{ flexWrap: 'wrap' }} useFlexGap>
        <TextField select size="small" label="Start from" value={start} onChange={e => { const v = +e.target.value; setStart(v); setStops(p => p.filter(s => s.idx !== v)); }} sx={{ minWidth: 190 }}>
          {starts.map(({ p, i }) => <MenuItem key={i} value={i}>{p.name}</MenuItem>)}
        </TextField>
        <Stack sx={{ minWidth: 210 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
            Day window · {fmtClock(sMin)} – {fmtClock(eMin)}
          </Typography>
          <Slider size="small" value={[sMin, eMin]} min={300} max={1380} step={30} disableSwap
            onChange={(_, v) => { setStartTime(toHHMM(v[0])); setEndTime(toHHMM(v[1])); }}
            valueLabelDisplay="auto" valueLabelFormat={(m) => fmtClock(m)} getAriaLabel={() => 'Day window'} sx={{ mt: -0.2 }} />
        </Stack>
      </Stack>
    );
  };

  // ---------- layouts ----------
  const Brand = (
    <Stack direction="row" spacing={1.3} alignItems="center" sx={{ minWidth: 0 }}>
      <Box sx={{ width: 38, height: 38, borderRadius: 2.5, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'text.primary', color: 'primary.contrastText', boxShadow: '0 0 16px rgba(45,212,191,0.35)' }}>
        <ExploreRounded />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.05, letterSpacing: '-0.01em' }}>Pondicherry Planner</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>Plan a day trip · driving times · r/pondicherry picks</Typography>
      </Box>
    </Stack>
  );

  if (isMobile) {
    return (
      <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        <Box sx={{ px: 1.5, pt: 1.5 }}>
          <Box sx={{ mb: 1.2 }}>{Brand}</Box>
          <Box sx={{ mb: 1 }}>{AiBar()}</Box>
          {Controls()}
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, p: 1.5, pt: 1 }}>{MapView()}</Box>
        <Drawer anchor="bottom" open={mobView === 'places'} onClose={closeView} PaperProps={{ sx: { height: 'calc(100dvh - 56px)', borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
          <Sheet title="Add places" onClose={closeView}><Box sx={{ mb: 1 }}>{FilterChips()}</Box>{PlacesPanel()}</Sheet>
        </Drawer>
        <Drawer anchor="bottom" open={mobView === 'day'} onClose={closeView} PaperProps={{ sx: { height: 'calc(100dvh - 56px)', borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
          <Sheet title="Your day" onClose={closeView}>{DayPanel()}</Sheet>
        </Drawer>
        <BottomNavigation showLabels value={mobView === 'map' ? false : mobView}
          onChange={(_, v) => { if (mobView === v) closeView(); else openView(v); }} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <BottomNavigationAction value="places" label="Add places" icon={<PlaceRounded />} />
          <BottomNavigationAction value="day" label={`Your day${stops.length ? ` (${stops.length})` : ''}`} icon={<CalendarMonthRounded />} />
        </BottomNavigation>
        <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ mb: 7 }} />
      </Box>
    );
  }

  // desktop — top search bar + two pane (rail + inset map)
  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* top bar with search — Pondicherry French-quarter vibe behind a dark scrim */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, px: 2, py: 1, borderBottom: '1px solid', borderColor: 'divider', flexShrink: 0,
        backgroundImage: 'linear-gradient(90deg, rgba(10,10,12,0.96) 28%, rgba(10,10,12,0.72) 60%, rgba(10,10,12,0.84)), url(/images/pondy-planner-bg.avif)',
        backgroundSize: 'cover', backgroundPosition: 'center 28%', backgroundRepeat: 'no-repeat' }}>
        {Brand}
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: 720, mx: 'auto' }}>{AiBar()}</Box>
      </Box>
      {/* body */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* left rail */}
        <Box sx={{ width: 470, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', borderRight: '1px solid', borderColor: 'divider' }}>
          <Box sx={{ p: 2, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            {Controls()}
            <ToggleButtonGroup exclusive fullWidth size="small" value={deskTab} onChange={(_, v) => v && openView(v)} color="primary">
              <ToggleButton value="places" sx={{ fontWeight: 700, py: 0.6 }}>Add places</ToggleButton>
              <ToggleButton value="day" sx={{ fontWeight: 700, py: 0.6 }}>Your day{stops.length ? ` (${stops.length})` : ''}</ToggleButton>
            </ToggleButtonGroup>
            {deskTab === 'places' && SUB_ORDER[filter] && subChips()}
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
            {deskTab === 'places' ? PlacesPanel() : DayPanel()}
          </Box>
        </Box>
        {/* right map (inset) */}
        <Box sx={{ flex: 1, minWidth: 0, height: '100%', position: 'relative', p: 1.5 }}>
          {deskTab === 'places' && (
            <Paper sx={{ position: 'absolute', top: 26, left: 26, zIndex: 3, p: 0.7, borderRadius: 999, maxWidth: 'calc(70% - 52px)',
              bgcolor: 'rgba(18,20,26,0.86)', backdropFilter: 'blur(10px)', boxShadow: '0 6px 22px rgba(0,0,0,0.4)' }}>
              {categoryChips()}
            </Paper>
          )}
          {/* floating "Your day" overview on the sea — alternate entry point while browsing */}
          {deskTab === 'places' && stops.length > 0 && (
            <Paper sx={{ position: 'absolute', top: 26, right: 26, zIndex: 3, width: 300, maxHeight: 'calc(100% - 52px)', display: 'flex', flexDirection: 'column',
              bgcolor: 'rgba(18,20,26,0.93)', backdropFilter: 'blur(12px)', border: '1px solid', borderColor: 'divider', borderRadius: 3, boxShadow: '0 10px 34px rgba(0,0,0,0.55)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.7 }}><CalendarMonthRounded sx={{ fontSize: 18, color: 'primary.main' }} /> Your day</Typography>
                <Button size="small" variant="outlined" onClick={() => openView('day')} sx={{ py: 0.2 }}>Edit</Button>
              </Stack>
              <Stack direction="row" sx={{ px: 1.5, py: 0.8, gap: '2px 12px', flexWrap: 'wrap', fontSize: '0.76rem', color: 'text.secondary' }}>
                <span><b style={{ color: '#ECEDEE' }}>{stops.length}</b> stops</span>
                <span>{totalDrive} min · {totalKm.toFixed(1)} km</span>
                <span>back {fmtClock(clock)}</span>
              </Stack>
              <Box sx={{ overflowY: 'auto', px: 1.5, pb: 1, minHeight: 0 }}>
                <GlanceRow color="#F59E0B" dot="S" name={data.places[start].name} time={fmtClock(parseTime(startTime))}
                  legColor={LEG_COLORS[0]} drive={`${timeline[0].dm} min · ${timeline[0].dk} km`} />
                {timeline.map(t => {
                  const lastStop = t.n === stops.length - 1;
                  return <GlanceRow key={t.n} color={CAT_HEX[data.places[t.idx].cat] || '#2196F3'} dot={t.n + 1} name={data.places[t.idx].name} time={fmtClock(t.arrive)}
                    last={lastStop} legColor={LEG_COLORS[(t.n + 1) % LEG_COLORS.length]}
                    drive={lastStop ? null : `${timeline[t.n + 1].dm} min · ${timeline[t.n + 1].dk} km`} />;
                })}
              </Box>
            </Paper>
          )}
          {MapView()}
        </Box>
      </Box>
      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

// ---------- interactive Google map ----------
function RouteMap({ data, start, stops }) {
  return (
    <Map mapId={MAP_ID} defaultCenter={{ lat: 11.934, lng: 79.83 }} defaultZoom={12} gestureHandling="greedy"
      mapTypeControl={false} streetViewControl={false} fullscreenControl={false} clickableIcons={false}
      style={{ width: '100%', height: '100%' }}>
      <RouteLayer data={data} start={start} stops={stops} />
    </Map>
  );
}

function RouteLayer({ data, start, stops }) {
  const map = useMap();
  const [selected, setSelected] = useState(null);
  const order = useMemo(() => [start, ...stops.map(s => s.idx)], [start, stops]);

  // Centre on the start when there's no route (Directions auto-fits otherwise).
  useEffect(() => {
    if (!map || stops.length || !data.places[start]) return;
    map.setCenter({ lat: data.places[start].lat, lng: data.places[start].lng });
    map.setZoom(13);
  }, [map, start, stops.length, data]);

  const sel = selected != null ? data.places[selected] : null;
  return (
    <>
      {order.map((idx, i) => {
        const p = data.places[idx]; if (!p) return null;
        const isStart = i === 0;
        return (
          <AdvancedMarker key={idx + '-' + i} position={{ lat: p.lat, lng: p.lng }} zIndex={isStart ? 9999 : 100 + i} onClick={() => setSelected(idx)}>
            <PinChip label={isStart ? 'S' : String(i)} name={p.name} color={isStart ? '#F59E0B' : (CAT_HEX[p.cat] || '#2196F3')} />
          </AdvancedMarker>
        );
      })}
      {sel && (
        <InfoWindow position={{ lat: sel.lat, lng: sel.lng }} onCloseClick={() => setSelected(null)}>
          <div style={{ minWidth: 160, maxWidth: 230, fontFamily: 'Inter, system-ui, sans-serif', color: '#1b1b1b' }}>
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{sel.name}</div>
            <div style={{ fontSize: 11.5, color: '#666', margin: '3px 0' }}>{(CAT_LABEL[sel.cat] || sel.cat || 'Start') + (sel.sub ? ' · ' + (SUB_LABEL[sel.sub] || sel.sub) : '')}</div>
            {sel.desc && <div style={{ fontSize: 12, color: '#333', marginBottom: 5 }}>{sel.desc}</div>}
            <a href={mapLink(sel)} target="_blank" rel="noopener" style={{ fontSize: 12, color: '#1976d2', textDecoration: 'none', fontWeight: 600 }}>Open in Google Maps ↗</a>
          </div>
        </InfoWindow>
      )}
      <DirectionsRoute data={data} start={start} stops={stops} />
    </>
  );
}

// A pill marker: coloured numbered badge + the place name, sitting above its point.
function PinChip({ label, name, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 9px 3px 3px', transform: 'translateY(-6px)',
      background: '#15171c', border: '1px solid rgba(255,255,255,0.16)', borderRadius: 999, boxShadow: '0 3px 12px rgba(0,0,0,0.5)', whiteSpace: 'nowrap', cursor: 'pointer' }}>
      <span style={{ width: 20, height: 20, borderRadius: '50%', background: color, color: '#0B1020', fontWeight: 800, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{label}</span>
      <span style={{ color: '#ECEDEE', fontSize: 12.5, fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
    </div>
  );
}

// Real driving route along roads (one Directions request), drawn as per-leg
// polylines coloured by each leg's destination category — so segments stay distinct.
function DirectionsRoute({ data, start, stops }) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const linesRef = useRef([]);
  useEffect(() => {
    if (!map || !routesLib) return;
    const clear = () => { linesRef.current.forEach(l => l.setMap(null)); linesRef.current = []; };
    clear();
    if (!stops.length || !data.places[start]) return;
    const g = window.google.maps;
    const pt = i => ({ lat: data.places[i].lat, lng: data.places[i].lng });
    const stopIdxs = stops.map(s => s.idx);
    const last = stopIdxs[stopIdxs.length - 1];
    new routesLib.DirectionsService().route({   // forward journey only (no loop back to start)
      origin: pt(start), destination: pt(last),
      waypoints: stopIdxs.slice(0, -1).map(idx => ({ location: pt(idx), stopover: true })),
      travelMode: g.TravelMode.DRIVING, optimizeWaypoints: false,
    }, (res, status) => {
      if (status !== 'OK' || !res.routes[0]) return;
      const bounds = new g.LatLngBounds();
      res.routes[0].legs.forEach((leg, i) => {
        const path = [];
        leg.steps.forEach(st => (st.path || []).forEach(q => { path.push(q); bounds.extend(q); }));
        const color = LEG_COLORS[i % LEG_COLORS.length];   // distinct colour per leg
        linesRef.current.push(new g.Polyline({ path, map, strokeColor: color, strokeOpacity: 0.95, strokeWeight: 5 }));
      });
      if (!bounds.isEmpty()) map.fitBounds(bounds, 60);
    });
    return clear;
  }, [map, routesLib, data, start, stops]);
  return null;
}

// compact connected day-glance row (used in the on-map floating card) — dot + a
// leg-coloured line down to the next dot, with the drive label on the connector.
function GlanceRow({ color, dot, name, time, legColor, drive, last }) {
  return (
    <Stack direction="row" spacing={1} alignItems="stretch">
      <Box sx={{ width: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, bgcolor: color, color: '#0B1020', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{dot}</Box>
        {!last && <Box sx={{ flex: 1, width: 2.5, bgcolor: legColor || 'divider', borderRadius: 2, mt: 0.3, minHeight: 14 }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, pb: last ? 0.4 : 0.8 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.1 }}>
          <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.82rem', fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', flexShrink: 0 }}>{time}</Typography>
        </Stack>
        {!last && drive && (
          <Box sx={{ mt: 0.3, fontSize: '0.7rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <DirectionsCarRounded sx={{ fontSize: 13, color: legColor || 'inherit' }} />{drive}
          </Box>
        )}
      </Box>
    </Stack>
  );
}

// small shared bits
function Centered({ children }) { return <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>{children}</Box>; }
function Grid({ children }) { return <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 0.8 }}>{children}</Box>; }
function CatHead({ cat }) { const Icon = CAT_ICON[cat]; return <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', mb: 0.6, display: 'flex', alignItems: 'center', gap: 0.5 }}><Icon sx={{ fontSize: 15 }} />{CAT_LABEL[cat]}</Typography>; }
function Sheet({ title, onClose, children }) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ position: 'sticky', top: 0, zIndex: 1, bgcolor: 'background.paper', px: 2, py: 1.2, borderBottom: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{title}</Typography>
        <Button size="small" onClick={onClose} endIcon={<CloseRounded />}>Done</Button>
      </Box>
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>{children}</Box>
    </Box>
  );
}
