import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar, Toolbar, Box, Stack, Paper, Card, CardActionArea, Chip, Button, IconButton,
  TextField, MenuItem, Typography, BottomNavigation, BottomNavigationAction, Drawer,
  Snackbar, CircularProgress, Divider, useMediaQuery, InputAdornment, Tooltip, Slider,
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

const DATA_URL = '/data/pondicherry-itinerary.json';
const MAPS_KEY = 'AIzaSyApP7gtPnoI2D571tCjW3ANxIXTmcD3ECU';

const CAT_ICON = { Beach: BeachAccessRounded, Attraction: AccountBalanceRounded, Food: RestaurantRounded, Social: LocalBarRounded, Shopping: ShoppingBagRounded, Stay: FlagRounded, Area: FlagRounded };
const CAT_COLOR = { Stay: '0xF59E0B', Area: '0xF59E0B', Beach: '0x38BDF8', Attraction: '0x2DD4BF', Food: '0xFB923C', Social: '0xF472B6', Shopping: '0xA78BFA' };
// CSS-hex twins of CAT_COLOR — used for the in-app category icons + day dots so they
// match the map markers exactly and keep categories visually distinguishable.
const CAT_HEX = { Stay: '#F59E0B', Area: '#F59E0B', Beach: '#38BDF8', Attraction: '#2DD4BF', Food: '#FB923C', Social: '#F472B6', Shopping: '#A78BFA' };
// Dark "Midnight" static-map style (navy to match the app; markers/route pop on top).
const DARK_MAP_STYLE = [
  'element:geometry|color:0x0f0f12',
  'element:labels.text.stroke|color:0x000000',
  'element:labels.text.fill|color:0x8a8f98',
  'feature:administrative|element:geometry|color:0x26272b',
  'feature:administrative.locality|element:labels.text.fill|color:0xb8bcc4',
  'feature:poi|element:labels.text.fill|color:0x8a8f98',
  'feature:poi.park|element:geometry|color:0x14241e',
  'feature:poi.park|element:labels.text.fill|color:0x4e9b86',
  'feature:road|element:geometry|color:0x1c1d22',
  'feature:road|element:labels.text.fill|color:0x9aa0aa',
  'feature:road.highway|element:geometry|color:0x2a2c33',
  'feature:transit|element:geometry|color:0x1a1b1f',
  'feature:water|element:geometry|color:0x050509',
  'feature:water|element:labels.text.fill|color:0x4a4f5e',
].map(s => 'style=' + s);
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

// Spread near-coincident markers into a small ring so they don't stack on the static map.
function fanOut(pos) {
  const n = pos.length; if (n < 2) return;
  let mnLat = Infinity, mxLat = -Infinity, mnLng = Infinity, mxLng = -Infinity;
  pos.forEach(q => { mnLat = Math.min(mnLat, q.lat); mxLat = Math.max(mxLat, q.lat); mnLng = Math.min(mnLng, q.lng); mxLng = Math.max(mxLng, q.lng); });
  const span = Math.max(mxLat - mnLat, mxLng - mnLng, 0.01), unit = span * 0.045;
  const dist = (a, b) => Math.hypot(a.lat - b.lat, a.lng - b.lng), used = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (used[i]) continue; const cl = [i]; used[i] = true;
    for (let j = i + 1; j < n; j++) if (!used[j] && dist(pos[i], pos[j]) < unit) { cl.push(j); used[j] = true; }
    if (cl.length > 1) {
      const cx = cl.reduce((s, k) => s + pos[k].lat, 0) / cl.length, cy = cl.reduce((s, k) => s + pos[k].lng, 0) / cl.length;
      cl.forEach((k, m) => { const a = 2 * Math.PI * m / cl.length; pos[k] = { lat: cx + unit * Math.sin(a), lng: cy + unit * Math.cos(a) }; });
    }
  }
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
  const [mobView, setMobView] = useState('map'); // map | places | day
  const [aiQuery, setAiQuery] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [snack, setSnack] = useState('');
  const [mapDims, setMapDims] = useState({ w: 0, h: 0 });
  const mapBoxRef = useRef(null);

  useEffect(() => {
    fetch(DATA_URL).then(r => r.json()).then(d => {
      setData(d);
      const bus = d.places.findIndex(p => /bus stand/i.test(p.name));
      if (bus >= 0) setStart(bus);
    }).catch(() => setErr(true));
  }, []);

  // Measure the map container so the static map is requested at its real aspect
  // (matches object-fit, so the auto-fit frames all markers without cropping).
  useEffect(() => {
    const el = mapBoxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const measure = () => setMapDims({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isMobile, data]);

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
      setMobView('day');
      setSnack(d.note ? '✨ ' + d.note : '✨ Here’s a suggested day — tweak it freely.');
    } catch {
      setSnack('Couldn’t auto-plan just now — add places manually, or try rephrasing.');
    } finally { setAiBusy(false); }
  }

  // ----- static map -----
  function mapSize() {
    let { w, h } = mapDims;
    if (w < 80 || h < 80) { w = 520; h = isMobile ? 640 : 760; }
    const s = Math.min(1, 640 / Math.max(w, h));
    return Math.round(w * s) + 'x' + Math.round(h * s);
  }
  function routeMapUrl() {
    const order = [start, ...stops.map(s => s.idx)];
    const pos = order.map(i => ({ lat: data.places[i].lat, lng: data.places[i].lng }));
    fanOut(pos);
    const fmt = q => q.lat.toFixed(6) + ',' + q.lng.toFixed(6);
    const p = [`https://maps.googleapis.com/maps/api/staticmap?key=${MAPS_KEY}`, 'size=' + mapSize(), 'scale=2'];
    p.push('markers=' + encodeURIComponent('color:0xF59E0B|label:S|' + fmt(pos[0])));
    stops.forEach((s, n) => {
      const label = (n + 1) <= 9 ? 'label:' + (n + 1) + '|' : '';
      const color = CAT_COLOR[data.places[s.idx].cat] || '0x0E3B35';
      p.push('markers=' + encodeURIComponent('color:' + color + '|' + label + fmt(pos[n + 1])));
    });
    p.push('path=' + encodeURIComponent('color:0x2196F3ee|weight:4|' + pos.map(fmt).concat(fmt(pos[0])).join('|')));
    return p.join('&');
  }
  const defaultMapUrl = () => `https://maps.googleapis.com/maps/api/staticmap?key=${MAPS_KEY}&size=${mapSize()}&scale=2&center=11.9340,79.8300&zoom=12`;
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
  const FilterChips = () => (
    <Box>
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
      {SUB_ORDER[filter] && (
        <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap" sx={{ mt: 1 }}>
          {(() => {
            const counts = {}; (byCat[filter] || []).forEach(i => { const sub = data.places[i].sub || ''; counts[sub] = (counts[sub] || 0) + 1; });
            const subs = SUB_ORDER[filter].filter(s => counts[s]).concat(Object.keys(counts).filter(s => s && !SUB_ORDER[filter].includes(s)));
            return [['All', 'All', Object.values(counts).reduce((a, b) => a + b, 0)], ...subs.map(s => [s, SUB_LABEL[s] || s, counts[s]])].map(([key, label, n]) => (
              <Chip key={key} label={`${label} ${n}`} size="small" onClick={() => setSubFilter(key)}
                color={subFilter === key ? 'primary' : 'default'} variant={subFilter === key ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
            ));
          })()}
        </Stack>
      )}
    </Box>
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
            {Node({ icon: FlagRounded, title: data.places[start].name, sub: `Depart ${fmtClock(parseTime(startTime))}`, dot: 'S' })}
            {timeline.map(t => (
              <Box key={t.n}>
                <Seg>{t.dm} min · {t.dk} km</Seg>
                {Node({ idx: t.idx, dot: t.n + 1, title: data.places[t.idx].name, cat: data.places[t.idx].cat,
                  sub: `${fmtClock(t.arrive)} – ${fmtClock(t.depart)}`, stay: t.stay, n: t.n, last: t.n === stops.length - 1 })}
              </Box>
            ))}
            <Seg>{rMin} min · {rKm} km · back to start</Seg>
            {Node({ icon: FlagRounded, title: `Back at ${data.places[start].name}`, sub: `Arrive ${fmtClock(clock)}`, dot: 'S' })}
          </>)}
    </Box>
  );

  // node row in the timeline
  function Node({ icon, idx, cat, dot, title, sub, stay, n, last }) {
    const Icon = icon || (cat && CAT_ICON[cat]);
    const catColor = cat ? (CAT_HEX[cat] || '#94A3B8') : '#F59E0B';   // match the map markers
    return (
      <Stack direction="row" spacing={1.2} alignItems="flex-start">
        <Box sx={{ width: 26, height: 26, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          bgcolor: catColor, color: '#0B1020', fontSize: '0.72rem', fontWeight: 700 }}>{dot}</Box>
        <Paper variant="outlined" sx={{ flex: 1, p: 1, mb: 0.3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
            <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary', display: 'flex', alignItems: 'center', gap: 0.6 }}>
              {Icon && <Icon sx={{ fontSize: 16, color: catColor }} />}{title}
            </Typography>
            {typeof n === 'number' && (
              <Stack direction="row" spacing={0.2} sx={{ flexShrink: 0 }}>
                <IconButton size="small" disabled={n === 0} onClick={() => move(n, -1)}><KeyboardArrowUpRounded fontSize="small" /></IconButton>
                <IconButton size="small" disabled={last} onClick={() => move(n, 1)}><KeyboardArrowDownRounded fontSize="small" /></IconButton>
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
      </Stack>
    );
  }

  const MapView = () => {
    const src = stops.length ? routeMapUrl() : defaultMapUrl();
    return (
      <Box ref={mapBoxRef} sx={{ height: isMobile ? '100%' : 'calc(100vh - 110px)', minHeight: isMobile ? 0 : 320, borderRadius: 3, overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative', bgcolor: '#0d0d10' }}>
        <Box component="img" src={src} alt="Route map" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {!stops.length && (
          <Box sx={{ position: 'absolute', left: 0, right: 0, top: 0, bgcolor: 'rgba(10,10,12,0.92)', py: 0.8, px: 1, textAlign: 'center', fontSize: '0.8rem', color: 'text.secondary' }}>
            <PlaceRounded sx={{ fontSize: 16, verticalAlign: '-3px' }} /> Add places to start building your itinerary.
          </Box>
        )}
      </Box>
    );
  };

  const AiBar = () => (
    <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, maxWidth: 820, mx: 'auto', mb: 1.5, px: 0.6, py: 0.4, borderRadius: 999, border: '1px solid', borderColor: 'divider', boxShadow: '0 6px 24px rgba(0,0,0,0.45)' }}>
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
        <Drawer anchor="bottom" open={mobView === 'places'} onClose={() => setMobView('map')} PaperProps={{ sx: { height: 'calc(100dvh - 56px)', borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
          <Sheet title="Add places" onClose={() => setMobView('map')}><Box sx={{ mb: 1 }}>{FilterChips()}</Box>{PlacesPanel()}</Sheet>
        </Drawer>
        <Drawer anchor="bottom" open={mobView === 'day'} onClose={() => setMobView('map')} PaperProps={{ sx: { height: 'calc(100dvh - 56px)', borderTopLeftRadius: 16, borderTopRightRadius: 16 } }}>
          <Sheet title="Your day" onClose={() => setMobView('map')}>{DayPanel()}</Sheet>
        </Drawer>
        <BottomNavigation showLabels value={mobView === 'map' ? false : mobView}
          onChange={(_, v) => setMobView(mobView === v ? 'map' : v)} sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
          <BottomNavigationAction value="places" label="Add places" icon={<PlaceRounded />} />
          <BottomNavigationAction value="day" label={`Your day${stops.length ? ` (${stops.length})` : ''}`} icon={<CalendarMonthRounded />} />
        </BottomNavigation>
        <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ mb: 7 }} />
      </Box>
    );
  }

  // desktop
  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <AppBar position="sticky" color="default" elevation={0} sx={{ bgcolor: 'rgba(12,12,14,0.74)', backdropFilter: 'blur(10px)', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 2, py: 1 }}>
          {Brand}
          <Box sx={{ flexGrow: 1 }} />
          {Controls()}
        </Toolbar>
      </AppBar>
      <Box sx={{ maxWidth: 1660, mx: 'auto', p: 2.5 }}>
        <Box sx={{ mb: 2.5 }}>{AiBar()}</Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: stops.length ? '1.1fr 1.2fr 0.9fr' : '1fr 1.4fr', gap: 2, alignItems: 'start' }}>
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
            <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>Add places</Typography>
            <Box sx={{ mb: 1.5 }}>{FilterChips()}</Box>
            {PlacesPanel()}
          </Paper>
          <Box sx={{ position: 'sticky', top: 88 }}>{MapView()}</Box>
          {stops.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, position: 'sticky', top: 88 }}>
              <Typography sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>Your day</Typography>
              {DayPanel()}
            </Paper>
          )}
        </Box>
      </Box>
      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}

// small shared bits
function Centered({ children }) { return <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>{children}</Box>; }
function Grid({ children }) { return <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 0.8 }}>{children}</Box>; }
function CatHead({ cat }) { const Icon = CAT_ICON[cat]; return <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', mb: 0.6, display: 'flex', alignItems: 'center', gap: 0.5 }}><Icon sx={{ fontSize: 15 }} />{CAT_LABEL[cat]}</Typography>; }
function Seg({ children }) { return <Box sx={{ ml: '13px', pl: 1.6, py: 0.4, borderLeft: '2px dashed', borderColor: 'divider', fontSize: '0.78rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.6 }}><DirectionsCarRounded sx={{ fontSize: 15 }} />{children}</Box>; }
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
