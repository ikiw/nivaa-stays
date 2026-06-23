import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box, Stack, Paper, Card, CardActionArea, Chip, Button, IconButton,
  TextField, MenuItem, Typography, BottomNavigation, BottomNavigationAction,
  Snackbar, CircularProgress, useMediaQuery, Tooltip, Slider,
  ToggleButton, ToggleButtonGroup, Collapse, Menu, Link, Dialog, DialogContent,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import BeachAccessRounded from '@mui/icons-material/BeachAccessRounded';
import FlagRounded from '@mui/icons-material/FlagRounded';
import DirectionsCarRounded from '@mui/icons-material/DirectionsCarRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import CalendarMonthRounded from '@mui/icons-material/CalendarMonthRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import LightbulbOutlinedRounded from '@mui/icons-material/LightbulbOutlined';
import SelfImprovementRounded from '@mui/icons-material/SelfImprovementRounded';
import ShareRounded from '@mui/icons-material/ShareRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import RouteRounded from '@mui/icons-material/RouteRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import InfoOutlinedRounded from '@mui/icons-material/InfoOutlined';
import TuneRounded from '@mui/icons-material/TuneRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { Map } from '@vis.gl/react-google-maps';

// ---- planner modules (extracted from this file; behaviour unchanged) ----
import { DATA_URL, CAT_ICON, CAT_HEX, LEG_COLORS, CAT_LABEL, PICK_ORDER, SUB_ORDER, SUB_LABEL, BREAK_DUR, MEAL_DUR, MEAL_LABELS, DAY_COLORS } from './constants';
import { idealStay, isPseudo, parseTime, fmtClock, toHHMM, mapLink, mealTag, track, parseSearch } from './utils';
import { CURATED } from './curated';
import AboutPanel from './components/AboutPanel';
import RouteMap from './components/RouteMap';
import PlaceInfoCard from './components/PlaceInfoCard';
import { GlanceRow, Centered, Grid, CatHead } from './components/Bits';
import { computeSchedule, scheduleStays } from './scheduler';
import TimelineNode from './components/TimelineNode';
import type { TimelineNodeProps } from './components/TimelineNode';
import type { ReactNode, TouchEvent } from 'react';
import type { ItineraryData, Place, Stop, PlaceStop, SchedItem, ParsedSearch, Curated, Category } from './types';

/** State snapshot read from history callbacks. */
type StateSnap = { start: number; startTime: string; endTime: string; stops: Stop[]; loadedId: string | null };
/** The row-field subset App passes to the timeline (handlers/data are injected by the Node wrapper). */
type NodeProps = Omit<TimelineNodeProps, 'data' | 'setStay' | 'move' | 'removeAt' | 'selectPlace'>;

export default function App() {
  const theme = useTheme();
  const isMobile = useMediaQuery('(max-width:900px)');
  const [data, setData] = useState<ItineraryData | null>(null);
  const [err, setErr] = useState(false);
  const [start, setStart] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');
  const [stops, setStops] = useState<Stop[]>([]); // [{ idx, stay, day }]
  const [activeDay, setActiveDay] = useState(1); // which day's tab is shown (2-day curated plans)
  const [loadedId, setLoadedId] = useState<string | null>(null); // id of a pristine curated plan → readable ?itinerary= URL
  const [pendingCurated, setPendingCurated] = useState<string | null>(null); // ?itinerary=<id> to load once data is ready
  const [filter, setFilter] = useState('All');
  const [subFilter, setSubFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState<string | number>('all'); // ready-made plans: 'all' | 1 | 2 days
  const [browsing, setBrowsing] = useState(false); // viewing the plan list while a plan is loaded
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(PICK_ORDER.slice(1))); // only the first section (Beaches) open by default
  const toggleCat = (cat: string) => setCollapsed(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  const [shareAnchor, setShareAnchor] = useState<HTMLElement | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);   // place shown in the info card
  const [mobView, setMobView] = useState('itinerary'); // itinerary | places (mobile bottom tabs)
  const [itinView, setItinView] = useState('timeline'); // timeline | map (toggle inside the Itinerary tab)
  const [aboutOpen, setAboutOpen] = useState(false); // desktop About dialog
  const [deskTab, setDeskTab] = useState('day'); // places | day (desktop rail) — plan-first
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
  const initialUrl = useRef<ParsedSearch | null>(null);
  if (initialUrl.current === null) initialUrl.current = parseSearch();
  const stateRef = useRef<StateSnap | null>(null);                  // latest itinerary, readable from history callbacks
  stateRef.current = { start, startTime, endTime, stops, loadedId };
  const touchStartX = useRef<number | null>(null);               // mobile swipe-between-days
  const viewRef = useRef('itinerary');
  viewRef.current = isMobile ? mobView : deskTab;

  const buildSearch = (viewOverride?: string) => {
    const { start, startTime, endTime, stops, loadedId } = stateRef.current!;
    const view = viewOverride !== undefined ? viewOverride : viewRef.current;
    const q = new URLSearchParams();
    if (loadedId) {
      q.set('itinerary', loadedId);                                 // readable URL for an unmodified curated plan
    } else {
      if (start != null && start !== defaultStartRef.current) q.set('s', String(start));
      if (startTime && startTime !== '09:00') q.set('st', startTime);
      if (endTime && endTime !== '19:00') q.set('et', endTime);
      const enc = (s: Stop) => { if (s.brk) return 'b' + s.stay; if (s.meal) return 'm' + s.meal[0] + s.stay; const idx = (s as PlaceStop).idx; const def = data && data.places[idx] ? idealStay(data.places[idx]) : 45; return s.stay === def ? String(idx) : `${idx}.${s.stay}`; };
      if (stops.length) {
        const days = [...new Set(stops.map(s => s.day || 1))].sort((a, b) => a - b);
        q.set('p', days.length > 1                                 // 2-day plans → day groups split by "~"
          ? days.map(dn => stops.filter(s => (s.day || 1) === dn).map(enc).join('-')).join('~')
          : stops.map(enc).join('-'));
      }
    }
    if (view === 'places') q.set('v', 'places');                    // itinerary/day is the default view — keep it out of the URL
    const qs = q.toString();
    return window.location.pathname + (qs ? '?' + qs : '');
  };

  // Switch the active panel. Mobile: 'day' → the Itinerary tab (timeline), 'places' → Places tab.
  const openView = (v: string) => {
    setDeskTab(v === 'day' ? 'day' : 'places');
    if (isMobile) {
      if (v === 'places') setMobView('places');
      else { setMobView('itinerary'); setItinView('timeline'); }
    }
    window.history.replaceState(window.history.state, '', buildSearch(v));
  };

  // Open the place info card. On mobile, flip the Itinerary tab to the map so the card is visible.
  const selectPlace = (i: number) => { setSelectedIdx(i); };   // card pops over the current view; map is opt-in

  useEffect(() => {
    fetch(DATA_URL).then(r => r.json()).then((d: ItineraryData) => {
      setData(d);
      const bus = d.places.findIndex(p => /bus stand/i.test(p.name));
      defaultStartRef.current = bus >= 0 ? bus : 0;
      // Hydrate from a shared link if present, else fall back to the bus-stand default.
      const u = initialUrl.current!;
      const curated = u.itinerary && CURATED.find(c => c.id === u.itinerary);
      const startIdx = u.start != null && d.places[u.start] ? u.start : (bus >= 0 ? bus : 0);
      setStart(startIdx);
      if (curated) {
        setPendingCurated(curated.id);                  // load it once `data` state is committed (needs the matrix)
      } else {
        if (u.startTime) setStartTime(u.startTime);
        if (u.endTime) setEndTime(u.endTime);
        if (u.stops.length) {
          const seen = new Set<number>();
          setStops(u.stops
            .filter(o => o.brk || o.meal || (o.idx != null && d.places[o.idx] && o.idx !== startIdx && !seen.has(o.idx) && seen.add(o.idx)))
            .map((o): Stop => o.brk ? { brk: true, stay: o.stay ?? BREAK_DUR[1], day: o.day || 1 }
              : o.meal ? { meal: o.meal, stay: o.stay ?? MEAL_DUR[1], day: o.day || 1 }
              : { idx: o.idx!, stay: o.stay ?? idealStay(d.places[o.idx!]), day: o.day || 1 }));
        }
      }
      if (u.view === 'places') { setMobView('places'); setDeskTab('places'); }
      else if (u.view === 'day') setDeskTab('day');
      hydrated.current = true;
    }).catch(() => setErr(true));
  }, []);

  // Load a shared ?itinerary=<id> once the catalog/matrix is available.
  useEffect(() => {
    if (data && pendingCurated) {
      const c = CURATED.find(x => x.id === pendingCurated);
      if (c) loadCurated(c, true);
      setPendingCurated(null);
    }
  }, [data, pendingCurated]);

  // Keep the URL in sync with the itinerary (always shareable) — replace, never push.
  useEffect(() => {
    if (hydrated.current && !pendingCurated) window.history.replaceState(window.history.state, '', buildSearch());
  }, [start, startTime, endTime, stops, loadedId]);

  // Phone back/forward → restore the open view without rolling back the live plan.
  useEffect(() => {
    const onPop = () => {
      const v = parseSearch().view;
      if (isMobile) setMobView(v === 'places' ? 'places' : 'itinerary'); else setDeskTab(v === 'places' ? 'places' : 'day');
      if (hydrated.current) window.history.replaceState(window.history.state, '', buildSearch(v || (isMobile ? 'day' : 'places')));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [isMobile]);

  const driveMin = (a: number, b: number) => { const v = data?.minutes?.[a]?.[b]; return v == null ? 0 : v; };
  const driveKm = (a: number, b: number) => { const v = data?.km?.[a]?.[b]; return v == null ? 0 : v; };
  const isStop = (i: number) => stops.some(s => s.idx === i);

  const starts = useMemo(() => data ? data.places.map((p, i) => ({ p, i })).filter(x => x.p.cat === 'Stay' || x.p.cat === 'Area') : [], [data]);

  // group selectable places by category for the picker
  const byCat = useMemo(() => {
    const m: Record<string, number[]> = {};
    if (data) data.places.forEach((p, i) => { if (i !== start && PICK_ORDER.includes(p.cat)) (m[p.cat] = m[p.cat] || []).push(i); });
    return m;
  }, [data, start]);

  const sortByDay = (a: Stop[]): Stop[] => a.map((s, i): [Stop, number] => [s, i]).sort((x, y) => ((x[0].day || 1) - (y[0].day || 1)) || (x[1] - y[1])).map(p => p[0]);
  const touched = () => setLoadedId(null);   // any manual edit drops the readable ?itinerary= URL
  const addToggle = (i: number) => {
    if (!data) return;
    touched();
    track('plan_edit', { kind: stops.some(s => s.idx === i) ? 'remove_place' : 'add_place' });
    setStops(prev => prev.some(s => s.idx === i)
      ? prev.filter(s => s.idx !== i)
      : sortByDay([...prev, { idx: i, stay: idealStay(data.places[i]), day: activeDay }]));   // add to the day you're viewing
  };
  const removeStop = (i: number) => { touched(); track('plan_edit', { kind: 'remove_place' }); setStops(prev => prev.filter(s => s.idx !== i)); };
  const removeAt = (gi: number) => { touched(); track('plan_edit', { kind: 'remove' }); setStops(prev => prev.filter((_, k) => k !== gi)); };   // gi-based (also removes breaks)
  const addBreak = () => { touched(); track('plan_edit', { kind: 'add_break' }); setStops(prev => sortByDay([...prev, { brk: true, stay: 60, day: activeDay }])); };
  const move = (gi: number, dir: number) => { touched(); track('plan_edit', { kind: 'reorder' }); setStops(prev => { const a = prev.slice(); const j = gi + dir; if (j < 0 || j >= a.length) return prev; if ((a[gi].day || 1) !== (a[j].day || 1)) return prev; [a[gi], a[j]] = [a[j], a[gi]]; return a; }); };
  const setStay = (gi: number, v: string | number) => { touched(); setStops(prev => prev.map((s, k) => k === gi ? { ...s, stay: Math.max(0, +v || 0) } : s)); };

  function optimize() {
    touched();
    track('plan_optimize', { stops: stops.length });
    setStops(prev => {
      if (prev.length < 2) return prev;
      const days = [...new Set(prev.map(s => s.day || 1))].sort((a, b) => a - b);
      const ordered: Stop[] = [];
      days.forEach(dn => {                                 // nearest-neighbour within each day
        const remaining = prev.filter(s => (s.day || 1) === dn); let cur = start;
        while (remaining.length) {
          let best = 0, bestMin = Infinity;
          remaining.forEach((s, i) => { const m = driveMin(cur, s.idx as number); if (m < bestMin) { bestMin = m; best = i; } });
          const nx = remaining.splice(best, 1)[0]; ordered.push(nx); cur = nx.idx as number;
        }
      });
      return ordered;
    });
  }

  async function aiPlan() {
    const q = aiQuery.trim(); if (!q || aiBusy || !data) return;
    setAiBusy(true);
    const hadStops = stops.length > 0;
    track('plan_ai_request', { has_stops: hadStops, query_len: q.length });
    const prevStay: Record<number, number> = {}; stops.forEach(s => { if (s.idx != null) prevStay[s.idx] = s.stay; });
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
      let next = (d.stops as number[]).filter((i: number) => data.places[i] && i !== nextStart)
        .map((i: number) => ({ idx: i, stay: prevStay[i] ?? idealStay(data.places[i]), day: 1 }));
      if (!hadStops && next.length >= 2) {
        const remaining = next.slice(); const ordered: typeof next = []; let cur = nextStart;
        while (remaining.length) { let b = 0, bm = Infinity; remaining.forEach((s, i) => { const m = driveMin(cur, s.idx); if (m < bm) { bm = m; b = i; } }); const nx = remaining.splice(b, 1)[0]; ordered.push(nx); cur = nx.idx; }
        next = ordered;
      }
      setActiveDay(1);
      setLoadedId(null);
      setStops(next);
      track('plan_ai_result', { ok: true, stops: next.length });
      openView('day');
      setSnack(d.note ? '✨ ' + d.note : '✨ Here’s a suggested day — tweak it freely.');
    } catch {
      track('plan_ai_result', { ok: false });
      setSnack('Couldn’t auto-plan just now — add places manually, or try rephrasing.');
    } finally { setAiBusy(false); }
  }

  const gmapsUrl = () => {
    if (!data) return '';
    const pt = (i: number) => `${data.places[i].lat},${data.places[i].lng}`;
    let u = `https://www.google.com/maps/dir/?api=1&origin=${pt(start)}&destination=${pt(start)}&travelmode=driving`;
    const wps = stops.filter(s => !isPseudo(s)).map(s => pt(s.idx)).join('|');
    if (wps) u += `&waypoints=${encodeURIComponent(wps)}`;
    return u;
  };

  // load a curated starter plan (resolve names → catalog indices, then open the day view)

  const loadCurated = (c: Curated, silent?: boolean) => {
    if (!data) return;
    const find = (n: string) => data.places.findIndex(p => p.name === n);
    const s = find(c.start), startIdx = s >= 0 ? s : start;
    const all: Stop[] = [];
    c.plan.forEach((dayNames, di) => {                 // each plan day scheduled independently
      const items = dayNames.map((n): SchedItem => n === 'Break' ? { brk: true } : MEAL_LABELS.includes(n) ? { meal: n } : { idx: find(n) }).filter(it => it.brk || it.meal || (it.idx ?? -1) >= 0);
      const stays = scheduleStays(startIdx, items, data.places, driveMin);
      items.forEach((it, k) => all.push(it.brk ? { brk: true, stay: stays[k], day: di + 1 } : it.meal ? { meal: it.meal, stay: stays[k], day: di + 1 } : { idx: it.idx!, stay: stays[k], day: di + 1 }));
    });
    setStart(startIdx);
    setStartTime('09:00'); setEndTime('23:00');
    setActiveDay(1);
    setStops(all);
    setLoadedId(c.id);                                 // pristine curated → readable ?itinerary= URL
    setBrowsing(false);
    if (!silent) {
      track('itinerary_open', { itinerary_id: c.id, cohort: c.cohort, days: c.plan.length });
      openView('day');
      setSnack(`✨ Loaded “${c.cohort}” — ${c.plan.length > 1 ? `${c.plan.length}-day trip` : 'a full day out'}, tweak it freely.`);
    }
  };

  // share the current plan (the URL already encodes it)
  const shareWhatsApp = () => { track('plan_share', { method: 'whatsapp' }); window.open('https://wa.me/?text=' + encodeURIComponent('Check out this Pondicherry day plan ✨\n' + window.location.href), '_blank', 'noopener'); setShareAnchor(null); };
  const copyShareLink = async () => {
    track('plan_share', { method: 'copy' });
    try { await navigator.clipboard.writeText(window.location.href); setSnack('Link copied to clipboard'); }
    catch { setSnack('Couldn’t copy — copy it from the address bar.'); }
    setShareAnchor(null);
  };

  if (err) return <Centered>Could not load the places data. Please refresh.</Centered>;
  if (!data) return <Centered><CircularProgress /></Centered>;

  // ---------- timeline computation (extracted to scheduler.js; each day loops from start) ----------
  const { tripDays, dayData, tripDrive, tripKm } = computeSchedule(stops, start, startTime, driveMin, driveKm);
  const curDay = tripDays.includes(activeDay) ? activeDay : tripDays[0];   // active day tab
  const mapStops = stops.filter((s): s is PlaceStop => !isPseudo(s) && (s.day || 1) === curDay);   // map shows only the active day's real stops

  // ---------- render helpers ----------
  const categoryChips = () => {
    const rows: [string, string, number][] = [
      ['All', 'All places', Object.values(byCat).reduce((a, b) => a + b.length, 0)],
      ...PICK_ORDER.filter(c => byCat[c]).map((c): [string, string, number] => [c, CAT_LABEL[c] || c, byCat[c].length]),
    ];
    return (
    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
      {rows.map(([key, label, n]) => {
        const Icon = key === 'All' ? null : CAT_ICON[key as Category];
        return (
          <Chip key={key} label={`${label} ${n}`} icon={Icon ? <Icon /> : undefined} size="small"
            color={filter === key ? 'primary' : 'default'} variant={filter === key ? 'filled' : 'outlined'}
            onClick={() => { setFilter(key); setSubFilter('All'); }} sx={{ fontWeight: 600 }} />
        );
      })}
    </Stack>
    );
  };
  const planChips = () => {
    const opts: [string | number, string][] = [['all', 'All'], [1, '1 Day Itinerary'], [2, '2 Day Itinerary']];
    return (
    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
      {opts.map(([key, label]) => (
        <Chip key={key} label={label} size="small"
          color={planFilter === key ? 'primary' : 'default'} variant={planFilter === key ? 'filled' : 'outlined'}
          onClick={() => setPlanFilter(key)} sx={{ fontWeight: 600 }} />
      ))}
    </Stack>
    );
  };
  const subChips = () => {
    const subOrder = SUB_ORDER[filter];
    if (!subOrder) return null;
    const counts: Record<string, number> = {}; (byCat[filter] || []).forEach(i => { const sub = data.places[i].sub || ''; counts[sub] = (counts[sub] || 0) + 1; });
    const subs = subOrder.filter(s => counts[s]).concat(Object.keys(counts).filter(s => s && !subOrder.includes(s)));
    const rows: [string, string, number][] = [['All', 'All', Object.values(counts).reduce((a, b) => a + b, 0)], ...subs.map((s): [string, string, number] => [s, SUB_LABEL[s] || s, counts[s]])];
    return (
      <Stack direction="row" spacing={0.6} useFlexGap flexWrap="wrap">
        {rows.map(([key, label, n]) => (
          <Chip key={key} label={`${label} ${n}`} size="small" onClick={() => setSubFilter(key)}
            color={subFilter === key ? 'primary' : 'default'} variant={subFilter === key ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, fontSize: '0.7rem' }} />
        ))}
      </Stack>
    );
  };

  const PlaceCard = (i: number) => {
    const p = data.places[i], added = isStop(i), Icon = CAT_ICON[p.cat];
    const cat = CAT_HEX[p.cat] || '#94A3B8';
    const dm = driveMin(start, i), dk = driveKm(start, i);
    return (
      <Card key={i} variant="outlined" sx={{ borderColor: added ? 'primary.main' : 'rgba(255,255,255,0.10)', bgcolor: added ? 'rgba(33,150,243,0.16)' : 'background.paper', transition: 'border-color .15s ease, box-shadow .15s ease', '&:hover': { borderColor: 'primary.main', boxShadow: '0 0 0 1px rgba(33,150,243,0.5), 0 8px 22px rgba(0,0,0,0.45)' }, '&:hover .map-ghost': { opacity: 1 } }}>
        <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
          <CardActionArea onClick={(e) => { addToggle(i); e.currentTarget.blur(); }} sx={{ flex: 1, minWidth: 0, p: 1.25, display: 'flex', alignItems: 'center', gap: 1.25, '& .MuiCardActionArea-focusHighlight': { opacity: 0 } }}>
            <Box sx={{ width: 38, height: 38, borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${cat}22`, color: cat }}>
              <Icon sx={{ fontSize: 20 }} />
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'text.primary', lineHeight: 1.25, letterSpacing: '-0.01em' }}>{p.name}</Typography>
              {p.desc && <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.desc}</Typography>}
              {dm > 0 && (
                <Box sx={{ mt: 0.4, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }}>
                  <DirectionsCarRounded sx={{ fontSize: 13 }} /> {dm} min · {dk.toFixed(1)} km
                </Box>
              )}
            </Box>
            <Tooltip title={added ? 'Remove from day' : 'Add to day'}>
              <Box component="span" sx={{ flexShrink: 0, display: 'flex' }}>
                {added
                  ? <CheckCircleRounded sx={{ fontSize: 25, color: 'primary.main' }} />
                  : <AddCircleOutlineRounded sx={{ fontSize: 25, color: 'text.secondary' }} />}
              </Box>
            </Tooltip>
          </CardActionArea>
          <Tooltip title="Open in Google Maps">
            <IconButton size="small" component="a" href={mapLink(p)} target="_blank" rel="noopener" className="map-ghost"
              sx={{ flexShrink: 0, alignSelf: 'center', mr: 0.5, color: 'text.secondary', opacity: { xs: 0.65, md: 0 }, transition: 'opacity .15s ease, color .15s ease', '&:hover': { opacity: 1, color: 'primary.light' } }}>
              <OpenInNewRounded sx={{ fontSize: 17 }} />
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
          const collapsible = filter === 'All';
          const isCollapsed = collapsible && collapsed.has(cat);
          const inner: ReactNode[] = [];
          const subOrder = SUB_ORDER[cat];
          if (subOrder) {
            const bySub: Record<string, number[]> = {}; items.forEach(i => { const s = data.places[i].sub || ''; (bySub[s] = bySub[s] || []).push(i); });
            let subs = subOrder.filter(s => bySub[s]).concat(Object.keys(bySub).filter(s => !subOrder.includes(s)));
            const single = filter === cat && subFilter !== 'All';
            if (single) subs = subs.filter(s => s === subFilter);
            subs.forEach(s => {
              if (s && !single) inner.push(<Typography key={cat + s} sx={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'text.secondary', mt: 1, mb: 0.5 }}>{SUB_LABEL[s] || s}</Typography>);
              inner.push(<Grid key={cat + s + 'g'}>{bySub[s].map(PlaceCard)}</Grid>);
            });
          } else {
            inner.push(<Grid key={cat + 'g'}>{items.map(PlaceCard)}</Grid>);
          }
          return (
            <Box key={cat} sx={{ mb: 1.5 }}>
              {collapsible
                ? <CatHead cat={cat} count={items.length} collapsed={isCollapsed} onToggle={() => toggleCat(cat)} />
                : null}
              {collapsible
                ? <Collapse in={!isCollapsed} timeout="auto" unmountOnExit><Box sx={{ mt: 0.6 }}>{inner}</Box></Collapse>
                : <Box>{inner}</Box>}
            </Box>
          );
        })}
      </Box>
    );
  };

  const DayPanel = ({ hideBack }: { hideBack?: boolean } = {}) => {
    const showList = !stops.length || browsing;          // browse the ready-made list (current plan kept)
    const loadedC = CURATED.find(c => c.id === loadedId);
    return (
    <Box>
      {!showList && (<>
        {!hideBack && <Button size="small" startIcon={<ArrowBackRounded />} onClick={() => { setBrowsing(true); track('itinerary_list_open', {}); }} sx={{ mb: 1, px: 0.6, color: 'text.secondary' }}>Itineraries</Button>}
        <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
          {!loadedId && <Button size="small" variant="outlined" startIcon={<RouteRounded />} disabled={stops.length < 2} onClick={optimize}>Optimize</Button>}
          <Button size="small" variant="outlined" startIcon={<SelfImprovementRounded />} onClick={addBreak}>Free time</Button>
          <Button size="small" variant="outlined" startIcon={<ShareRounded />} onClick={(e) => {
            if (isMobile && navigator.share) { navigator.share({ title: 'Pondicherry day plan', text: 'Check out this Pondicherry day plan ✨', url: window.location.href }).then(() => track('plan_share', { method: 'native' })).catch(() => {}); }
            else setShareAnchor(e.currentTarget);
          }}>Share</Button>
          <Button size="small" variant="outlined" color="inherit" startIcon={<MoreVertRounded />} onClick={(e) => setMoreAnchor(e.currentTarget)}>More</Button>
          <Menu anchorEl={shareAnchor} open={!!shareAnchor} onClose={() => setShareAnchor(null)}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }} anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}>
            <MenuItem onClick={shareWhatsApp}><WhatsApp sx={{ fontSize: 18, mr: 1, color: '#25D366' }} /> Share on WhatsApp</MenuItem>
            <MenuItem onClick={copyShareLink}><ContentCopyRounded sx={{ fontSize: 17, mr: 1 }} /> Copy link</MenuItem>
          </Menu>
          <Menu anchorEl={moreAnchor} open={!!moreAnchor} onClose={() => setMoreAnchor(null)}
            transformOrigin={{ horizontal: 'left', vertical: 'top' }} anchorOrigin={{ horizontal: 'left', vertical: 'bottom' }}>
            <MenuItem component="a" href={gmapsUrl()} target="_blank" rel="noopener" onClick={() => { track('plan_open_maps', { stops: stops.filter(s => !isPseudo(s)).length }); setMoreAnchor(null); }}><OpenInNewRounded sx={{ fontSize: 17, mr: 1 }} /> Open in Google Maps</MenuItem>
            <MenuItem onClick={() => { track('plan_clear', {}); setStops([]); setActiveDay(1); setLoadedId(null); setBrowsing(false); setMoreAnchor(null); }}><DeleteOutlineRounded sx={{ fontSize: 17, mr: 1 }} /> Clear itinerary</MenuItem>
          </Menu>
        </Stack>
        {loadedC?.why && (
          <Box sx={{ display: 'flex', gap: 0.9, p: 1.1, mb: 1.5, borderRadius: '10px', bgcolor: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.28)' }}>
            <LightbulbOutlinedRounded sx={{ fontSize: 18, color: 'secondary.main', mt: '1px', flexShrink: 0 }} />
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', lineHeight: 1.5 }}>
              <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>Why this order — </Box>{loadedC.why}
            </Typography>
          </Box>
        )}
      </>)}
      {showList
        ? (
          <Box sx={{ pt: 0.5 }}>
            {browsing && stops.length > 0 && (
              <Button size="small" startIcon={<ArrowBackRounded />} onClick={() => setBrowsing(false)} sx={{ mb: 1, px: 0.6 }}>Back to your itinerary</Button>
            )}
            <Typography sx={{ fontWeight: 700, fontSize: '0.92rem' }}>Start from a ready-made plan</Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mb: 1.1 }}>Pick a trip — tap to load, then tweak it your way.</Typography>
            {isMobile && <Box sx={{ mb: 1.4 }}>{planChips()}</Box>}
            {[[1, '1-Day Itineraries'], [2, '2-Day Itineraries']].filter(([len]) => planFilter === 'all' || planFilter === len).map(([len, label]) => (
              <Box key={len} sx={{ mb: 1.5 }}>
                {planFilter === 'all' && <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'text.secondary', mb: 0.7 }}>{label}</Typography>}
                <Stack spacing={1}>
                  {CURATED.filter(c => c.plan.length === len).map(c => {
                    const count = c.plan.reduce((a, d) => a + d.length, 0);
                    return (
                      <Card key={c.id} variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.10)', transition: 'border-color .15s ease, box-shadow .15s ease', '&:hover': { borderColor: 'secondary.main', boxShadow: '0 6px 18px rgba(0,0,0,0.4)' } }}>
                        <CardActionArea onClick={() => loadCurated(c)} sx={{ p: 1.25, display: 'flex', alignItems: 'center', gap: 1.25 }}>
                          <Box sx={{ width: 38, height: 38, borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(251,191,36,0.16)', color: 'secondary.main' }}>
                            <RouteRounded sx={{ fontSize: 20 }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem' }}>{c.cohort}</Typography>
                            <Typography sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>{c.tag} · {count} stops</Typography>
                          </Box>
                          <ChevronRightRounded sx={{ fontSize: 20, color: 'text.secondary', flexShrink: 0 }} />
                        </CardActionArea>
                      </Card>
                    );
                  })}
                </Stack>
              </Box>
            ))}
          </Box>
        )
        : (() => {
            const d = dayData.find(x => x.day === curDay) || dayData[0];
            const over = Math.round(d.clock) - parseTime(endTime);
            return (<>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1.25, fontSize: '0.82rem', flexWrap: 'wrap' }} useFlexGap>
                <span><b>{stops.filter(s => !isPseudo(s)).length}</b> stops{tripDays.length > 1 ? ` · ${tripDays.length} days` : ''}</span>
                <span><DirectionsCarRounded sx={{ fontSize: 15, verticalAlign: '-3px' }} /> <b>{tripDrive} min</b> · {tripKm.toFixed(1)} km</span>
              </Stack>
              {tripDays.length > 1 && (
                <ToggleButtonGroup exclusive fullWidth size="small" value={curDay} onChange={(_, v) => { if (v) { setActiveDay(v); track('day_switch', { day: v }); } }} sx={{ mb: 1.25 }}>
                  {tripDays.map(dn => (
                    <ToggleButton key={dn} value={dn} sx={{ fontWeight: 700, py: 0.55 }}>
                      <Box component="span" sx={{ width: 9, height: 9, borderRadius: '50%', bgcolor: DAY_COLORS[(dn - 1) % DAY_COLORS.length], mr: 0.8 }} /> Day {dn}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25, fontSize: '0.8rem', color: 'text.secondary', flexWrap: 'wrap' }} useFlexGap>
                <span>{d.drive} min · {d.km.toFixed(1)} km</span>
                <span>back <b style={{ color: '#ECEDEE' }}>{fmtClock(d.clock)}</b></span>
                <Chip size="small" variant="outlined" color={over > 0 ? 'warning' : 'success'} label={over > 0 ? `over by ${Math.floor(over / 60) ? Math.floor(over / 60) + 'h ' : ''}${over % 60}m` : 'fits'} />
              </Stack>
              {!d.tl.length
                ? <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary', py: 1.5, textAlign: 'center' }}>No stops on Day {d.day} yet — add places.</Typography>
                : (<>
                    {Node({ icon: FlagRounded, title: data.places[start].name, sub: `Depart ${fmtClock(parseTime(startTime))}`, dot: 'S',
                      legColor: LEG_COLORS[0], drive: `${d.tl[0].dm} min · ${d.tl[0].dk} km` })}
                    {(() => { let rn = 0; return d.tl.map((t, ti) => {
                      const lastStop = ti === d.tl.length - 1;
                      const legColor = lastStop ? '#64748B' : LEG_COLORS[(ti + 1) % LEG_COLORS.length];
                      const drive = lastStop ? `${d.rMin} min · ${d.rKm} km · back to start` : `${d.tl[ti + 1].dm} min · ${d.tl[ti + 1].dk} km`;
                      if (t.brk || t.meal) return <Fragment key={t.gi}>{Node({ gi: t.gi, brk: t.brk, meal: t.meal, sub: `${fmtClock(t.arrive)} – ${fmtClock(t.depart)}`, stay: t.stay, day: d.day, upDisabled: ti === 0, downDisabled: lastStop, legColor, drive })}</Fragment>;
                      rn++;
                      const place = data.places[t.idx!];
                      return <Fragment key={t.gi}>{Node({
                        idx: t.idx, gi: t.gi, dot: rn, title: place.name, cat: place.cat, day: d.day,
                        tag: mealTag(place.cat, t.arrive),
                        sub: `${fmtClock(t.arrive)} – ${fmtClock(t.depart)}`, stay: t.stay,
                        upDisabled: ti === 0, downDisabled: lastStop, legColor, drive,
                      })}</Fragment>;
                    }); })()}
                    {Node({ icon: FlagRounded, title: `Back at ${data.places[start].name}`, sub: `Arrive ${fmtClock(d.clock)}`, dot: 'S', last: true })}
                  </>)}
            </>);
          })()}
    </Box>
    );
  };

  // Timeline row — rendering lives in components/TimelineNode.tsx; inject App data + handlers.
  const Node = (props: NodeProps) => TimelineNode({ ...props, data, setStay, move, removeAt, selectPlace });

  const MapView = () => (
    <Box sx={{ height: '100%', minHeight: 0, borderRadius: '14px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative', bgcolor: '#0d0d10' }}>
      {mapActive ? (
        <>
          <RouteMap data={data} start={start} stops={mapStops} selected={selectedIdx} onSelect={setSelectedIdx} />
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
    <Paper elevation={0} sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 0.5, width: '100%', px: 0.6, py: 0.4, borderRadius: 999,
      backgroundColor: 'rgba(18,19,22,0.42)', backdropFilter: 'blur(14px)',
      boxShadow: '0 0 14px rgba(251,191,36,0.16), 0 4px 18px rgba(0,0,0,0.4)', transition: 'box-shadow .18s ease',
      '&::before': { content: '""', position: 'absolute', inset: 0, borderRadius: 'inherit', padding: '1.5px', pointerEvents: 'none',
        background: 'linear-gradient(90deg, #0A0A0C 0%, #5B4A12 45%, #FBBF24 100%)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)', WebkitMaskComposite: 'xor', maskComposite: 'exclude' },
      '&:focus-within': { boxShadow: '0 0 0 3px rgba(251,191,36,0.20), 0 0 22px rgba(251,191,36,0.40), 0 4px 18px rgba(0,0,0,0.45)' } }}>
      <TextField fullWidth variant="standard" placeholder={isMobile ? 'Describe your ideal day…' : 'Prompt your ideal day — e.g. “beaches & filter coffee, relaxed pace”'}
        value={aiQuery} onChange={e => setAiQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') aiPlan(); }}
        InputProps={{ disableUnderline: true, startAdornment: <AutoAwesomeRounded sx={{ color: 'secondary.main', ml: 0.8, mr: 1 }} />, sx: { fontSize: '0.95rem' } }} />
      <Button variant="contained" color="secondary" onClick={aiPlan} disabled={aiBusy} aria-label="Plan my day"
        startIcon={isMobile ? undefined : (aiBusy ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeRounded />)}
        sx={{ borderRadius: 999, flexShrink: 0, minWidth: isMobile ? 44 : undefined, px: isMobile ? 0 : 2 }}>
        {isMobile ? (aiBusy ? <CircularProgress size={18} color="inherit" /> : <AutoAwesomeRounded />) : (aiBusy ? 'Planning…' : 'Plan my day')}
      </Button>
    </Paper>
  );

  const Controls = () => {
    const sMin = parseTime(startTime), eMin = parseTime(endTime);
    return (
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flexWrap: { xs: 'wrap', md: 'nowrap' } }} useFlexGap>
        <TextField select size="small" label="Start from" value={start} onChange={e => { const v = +e.target.value; touched(); setStart(v); setStops(p => p.filter(s => s.idx !== v)); }}
          sx={{ flex: '1 1 0', minWidth: { xs: '46%', md: 0 }, '& .MuiInputBase-input': { fontSize: '0.85rem', fontWeight: 600 } }}>
          {starts.map(({ p, i }) => <MenuItem key={i} value={i}>{p.name}</MenuItem>)}
        </TextField>
        <Stack sx={{ flex: '1 1 0', minWidth: { xs: 150, md: 0 } }}>
          <Typography variant="caption" noWrap sx={{ color: 'text.secondary', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <AccessTimeRounded sx={{ fontSize: 14 }} /> {fmtClock(sMin)} – {fmtClock(eMin)}
          </Typography>
          <Slider size="small" value={[sMin, eMin]} min={300} max={1380} step={30} disableSwap
            onChange={(_, v) => { touched(); const r = v as number[]; setStartTime(toHHMM(r[0])); setEndTime(toHHMM(r[1])); }}
            valueLabelDisplay="auto" valueLabelFormat={(m) => fmtClock(m)} getAriaLabel={() => 'Day window'} sx={{ mt: -0.2, py: 0.5 }} />
        </Stack>
      </Stack>
    );
  };

  // ---------- layouts ----------
  const Brand = (
    <Stack direction="row" spacing={1.3} alignItems="center" sx={{ minWidth: 0 }}>
      <Box sx={{ width: 40, height: 40, borderRadius: '11px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)', color: '#231A00', boxShadow: '0 4px 14px rgba(245,158,11,0.45)' }}>
        <BeachAccessRounded />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.05, letterSpacing: '-0.01em' }}>Pondicherry Planner</Typography>
        <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>Plan a day trip · driving times · r/pondicherry picks</Typography>
      </Box>
    </Stack>
  );

  if (isMobile) {
    const loadedC = CURATED.find(c => c.id === loadedId);
    const showList = !stops.length || browsing;          // browsing the ready-made list
    const planView = mobView === 'itinerary' && !showList; // a loaded plan is on screen
    const swipeDays = (e: TouchEvent) => {                            // swipe left/right between Day 1 / Day 2
      const x0 = touchStartX.current; touchStartX.current = null;
      if (x0 == null || tripDays.length < 2) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) < 60) return;
      const i = tripDays.indexOf(curDay);
      const ni = dx < 0 ? Math.min(tripDays.length - 1, i + 1) : Math.max(0, i - 1);
      if (ni !== i) { setActiveDay(tripDays[ni]); track('day_switch', { day: tripDays[ni] }); }
    };
    return (
      <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
        {planView ? (
          // ---- sticky plan header: back + customize + name + Timeline/Map toggle ----
          <Box sx={{ px: 1.5, pt: 'calc(env(safe-area-inset-top) + 8px)', pb: 1, flexShrink: 0, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 40 }}>
              <IconButton onClick={() => { setBrowsing(true); track('itinerary_list_open', {}); }} sx={{ ml: -1, color: 'text.primary' }} aria-label="Back to itineraries"><ArrowBackRounded /></IconButton>
              <Typography sx={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', maxWidth: '54%', textAlign: 'center', fontWeight: 700, fontSize: '0.98rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{loadedC ? loadedC.cohort : 'Your itinerary'}</Typography>
              <Button size="small" startIcon={<TuneRounded />} onClick={() => openView('places')} sx={{ ml: 'auto', px: 0.6 }}>Customize</Button>
            </Box>
            <ToggleButtonGroup exclusive fullWidth size="small" value={itinView} onChange={(_, v) => { if (v) { setItinView(v); if (v === 'map') setMapActive(true); } }} sx={{ mt: 0.8 }}>
              <ToggleButton value="timeline" sx={{ fontWeight: 700, py: 0.4 }}><CalendarMonthRounded sx={{ fontSize: 17, mr: 0.6 }} /> Timeline</ToggleButton>
              <ToggleButton value="map" sx={{ fontWeight: 700, py: 0.4 }}><MapRounded sx={{ fontSize: 17, mr: 0.6 }} /> Map</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        ) : (
          // ---- itinerary list / places: brand + AI prompt (+ start/window only on Places) ----
          <Box sx={{ px: 1.5, pt: 'calc(env(safe-area-inset-top) + 8px)', flexShrink: 0 }}>
            <Box sx={{ mb: 1 }}>{Brand}</Box>
            {mobView !== 'about' && <Box sx={{ mb: 1 }}>{AiBar()}</Box>}
            {mobView === 'places' && <Box sx={{ mb: 0.5 }}>{Controls()}</Box>}
          </Box>
        )}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {mobView === 'about' ? null : mobView === 'places' ? (
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{PlacesPanel()}</Box>
          ) : planView && itinView === 'map' ? (
            <Box sx={{ flex: 1, minHeight: 0, p: 1.5, pt: 1 }}>{MapView()}</Box>
          ) : (
            <Box onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }} onTouchEnd={swipeDays}
              sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{DayPanel({ hideBack: true })}</Box>
          )}
          {/* About — always mounted (in the DOM for crawlers), shown only when its tab is active */}
          <Box sx={{ display: mobView === 'about' ? 'block' : 'none', flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{AboutPanel()}</Box>
        </Box>
        {planView && selectedIdx != null && data.places[selectedIdx] && (
          <PlaceInfoCard key={selectedIdx} place={data.places[selectedIdx]} onClose={() => setSelectedIdx(null)} isMobile
            onShowOnMap={() => { setItinView('map'); setMapActive(true); }} />
        )}
        <Box sx={{ flexShrink: 0, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', pb: 'env(safe-area-inset-bottom)' }}>
          <BottomNavigation showLabels value={mobView}
            onChange={(_, v) => { if (!v) return; if (v === 'about') setMobView('about'); else if (v === 'itinerary') { setBrowsing(false); openView('day'); } else openView('places'); }} sx={{ bgcolor: 'transparent' }}>
            <BottomNavigationAction value="itinerary" label={`Itinerary${stops.length ? ` (${stops.filter(s => !isPseudo(s)).length})` : ''}`} icon={<CalendarMonthRounded />} />
            <BottomNavigationAction value="places" label="Places" icon={<PlaceRounded />} />
            <BottomNavigationAction value="about" label="About" icon={<InfoOutlinedRounded />} />
          </BottomNavigation>
        </Box>
        <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} sx={{ mb: 7 }} />
      </Box>
    );
  }

  // desktop — top search bar + two pane (rail + inset map)
  return (
    <Box sx={{ height: '100dvh', display: 'flex', flexDirection: 'column', gap: 1.25, p: 1.25, overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* top bar card — Pondicherry French-quarter vibe behind a dark scrim */}
      <Paper elevation={0} sx={{ display: 'flex', alignItems: 'center', gap: 2.5, px: 2, py: 1, flexShrink: 0, borderRadius: '14px', border: '1px solid', borderColor: 'divider',
        backgroundImage: 'linear-gradient(90deg, rgba(10,10,12,0.96) 28%, rgba(10,10,12,0.72) 60%, rgba(10,10,12,0.84)), url(/images/pondy-planner-bg.avif)',
        backgroundSize: 'cover', backgroundPosition: 'center 28%', backgroundRepeat: 'no-repeat' }}>
        {Brand}
        <Box sx={{ flex: 1, minWidth: 0, maxWidth: 720, mx: 'auto' }}>{AiBar()}</Box>
        <Button size="small" startIcon={<InfoOutlinedRounded />} onClick={() => setAboutOpen(true)} sx={{ flexShrink: 0, color: 'text.secondary' }}>About</Button>
      </Paper>
      <Dialog open={aboutOpen} onClose={() => setAboutOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { backgroundImage: 'none' } }}>
        <DialogContent sx={{ position: 'relative' }}>
          <IconButton onClick={() => setAboutOpen(false)} sx={{ position: 'absolute', top: 8, right: 8 }} aria-label="Close"><CloseRounded /></IconButton>
          <AboutPanel />
        </DialogContent>
      </Dialog>
      {/* body */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 1.25 }}>
        {/* left rail card */}
        <Paper elevation={0} sx={{ width: 510, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '14px', border: '1px solid', borderColor: 'divider',
          background: 'linear-gradient(180deg, #1C1A16 0%, #16161A 22%, #101013 100%)' }}>
          <Box sx={{ p: 2, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
            {Controls()}
            <ToggleButtonGroup exclusive fullWidth size="small" value={deskTab} onChange={(_, v) => v && openView(v)} color="primary">
              <ToggleButton value="places" sx={{ fontWeight: 700, py: 0.6 }}>Add places</ToggleButton>
              <ToggleButton value="day" sx={{ fontWeight: 700, py: 0.6 }}>Itinerary{stops.length ? ` (${stops.length})` : ''}</ToggleButton>
            </ToggleButtonGroup>
            {deskTab === 'places' && SUB_ORDER[filter] && subChips()}
          </Box>
          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 2 }}>
            {deskTab === 'places' ? PlacesPanel() : DayPanel()}
          </Box>
        </Paper>
        {/* map card */}
        <Box sx={{ flex: 1, minWidth: 0, height: '100%', position: 'relative' }}>
          {deskTab === 'places' && (
            <Paper sx={{ position: 'absolute', top: 16, left: 16, zIndex: 3, p: 0.7, borderRadius: 999, maxWidth: 'calc(70% - 32px)',
              bgcolor: 'rgba(18,20,26,0.86)', backdropFilter: 'blur(10px)', boxShadow: '0 6px 22px rgba(0,0,0,0.4)' }}>
              {categoryChips()}
            </Paper>
          )}
          {/* itinerary length filter floats over the map while picking a ready-made plan */}
          {deskTab === 'day' && (!stops.length || browsing) && (
            <Paper sx={{ position: 'absolute', top: 16, left: 16, zIndex: 3, p: 0.7, borderRadius: 999,
              bgcolor: 'rgba(18,20,26,0.86)', backdropFilter: 'blur(10px)', boxShadow: '0 6px 22px rgba(0,0,0,0.4)' }}>
              {planChips()}
            </Paper>
          )}
          {/* floating "Your day" overview on the sea — alternate entry point while browsing */}
          {deskTab === 'places' && stops.length > 0 && (
            <Paper sx={{ position: 'absolute', top: 16, right: 16, zIndex: 3, width: 300, maxHeight: 'calc(100% - 32px)', display: 'flex', flexDirection: 'column',
              bgcolor: 'rgba(18,20,26,0.93)', backdropFilter: 'blur(12px)', border: '1px solid', borderColor: 'divider', borderRadius: '14px', boxShadow: '0 10px 34px rgba(0,0,0,0.55)' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 1.5, py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.7 }}><CalendarMonthRounded sx={{ fontSize: 18, color: 'primary.main' }} /> Itinerary</Typography>
                <Button size="small" variant="outlined" onClick={() => openView('day')} sx={{ py: 0.2 }}>Edit</Button>
              </Stack>
              <Stack direction="row" sx={{ px: 1.5, py: 0.8, gap: '2px 12px', flexWrap: 'wrap', fontSize: '0.76rem', color: 'text.secondary' }}>
                <span><b style={{ color: '#ECEDEE' }}>{stops.length}</b> stops{tripDays.length > 1 ? ` · ${tripDays.length} days` : ''}</span>
                <span>{tripDrive} min · {tripKm.toFixed(1)} km</span>
              </Stack>
              <Box sx={{ overflowY: 'auto', px: 1.5, pb: 1, minHeight: 0 }}>
                {dayData.map(d => d.tl.length > 0 && (
                  <Box key={d.day} sx={{ mb: tripDays.length > 1 ? 0.8 : 0 }}>
                    {tripDays.length > 1 && <Typography sx={{ fontSize: '0.66rem', fontWeight: 800, color: DAY_COLORS[(d.day - 1) % DAY_COLORS.length], mt: 0.6, mb: 0.4 }}>DAY {d.day} · back {fmtClock(d.clock)}</Typography>}
                    <GlanceRow color="#F59E0B" dot="S" name={data.places[start].name} time={fmtClock(parseTime(startTime))}
                      legColor={LEG_COLORS[0]} drive={`${d.tl[0].dm} min · ${d.tl[0].dk} km`} />
                    {(() => { let rn = 0; return d.tl.map((t, ti) => {
                      const lastStop = ti === d.tl.length - 1;
                      const legColor = lastStop ? '#64748B' : LEG_COLORS[(ti + 1) % LEG_COLORS.length];
                      const drive = lastStop ? null : `${d.tl[ti + 1].dm} min · ${d.tl[ti + 1].dk} km`;
                      if (t.brk || t.meal)   // free time / meal — no place lookup (matches the main timeline guard)
                        return <GlanceRow key={t.gi} color="#64748B" dot="•" name={t.meal || 'Free time'} time={fmtClock(t.arrive)} last={lastStop} legColor={legColor} drive={drive} />;
                      rn++;
                      const place = data.places[t.idx!];
                      return <GlanceRow key={t.gi} color={CAT_HEX[place.cat] || '#2196F3'} dot={rn} name={place.name} time={fmtClock(t.arrive)} last={lastStop} legColor={legColor} drive={drive} />;
                    }); })()}
                  </Box>
                ))}
              </Box>
            </Paper>
          )}
          {MapView()}
          {selectedIdx != null && data.places[selectedIdx] && (
            <PlaceInfoCard key={selectedIdx} place={data.places[selectedIdx]} onClose={() => setSelectedIdx(null)} />
          )}
        </Box>
      </Box>
      <Snackbar open={!!snack} autoHideDuration={5000} onClose={() => setSnack('')} message={snack} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} />
    </Box>
  );
}