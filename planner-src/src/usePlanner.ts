// The planner's controller — all state, refs, effects, handlers and derived memos.
// App.tsx is now just the view: it calls usePlanner(), guards on load, computes the
// timeline, and renders. Extracted so the panels can become dumb components.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMediaQuery, Link } from '@mui/material';

import { Map } from '@vis.gl/react-google-maps';

// ---- planner modules (extracted from this file; behaviour unchanged) ----
import { DATA_URL, PICK_ORDER, BREAK_DUR, MEAL_DUR, MEAL_LABELS } from './constants';
import { idealStay, isPseudo, track, parseSearch, todayISO, addDaysISO, fetchWeather, fmtClock, parseTime, fmtDur, weatherInfo, umbrellaAdvisory } from './utils';
import { CURATED } from './curated';

import { scheduleStays, computeSchedule } from './scheduler';
import { itineraryNote } from './placeCopy';

import type { ItineraryData, Stop, PlaceStop, SchedItem, ParsedSearch, Curated, Weather } from './types';

type StateSnap = { start: number; startTime: string; endTime: string; stops: Stop[]; loadedId: string | null; tripDate: string };

export function usePlanner() {
  const isMobile = useMediaQuery('(max-width:900px)');
  const [data, setData] = useState<ItineraryData | null>(null);
  const [err, setErr] = useState(false);
  const [start, setStart] = useState(0);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('19:00');
  const [stops, setStops] = useState<Stop[]>([]); // [{ idx, stay, day }]
  const [tripDate, setTripDate] = useState(todayISO());  // date the plan is for → drives the weather chip
  const [weather, setWeather] = useState<Weather | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
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
  const [hotelsOpen, setHotelsOpen] = useState(false); // "Where to stay" hotels overlay
  const [rentalsOpen, setRentalsOpen] = useState(false); // bike & car rentals overlay
  const [deskTab, setDeskTab] = useState('day'); // places | day (desktop rail) — plan-first
  const [aiQuery, setAiQuery] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [snack, setSnack] = useState('');
  // Defer mounting the interactive Google Map until the visitor actually engages
  // (adds a place / plans a day / taps "Load map") — a Map mount is a billed
  // Dynamic-Maps load, so bounce visitors who never interact cost nothing.
  const [mapActive, setMapActive] = useState(false);
  const mapTracked = useRef(false);
  // Mount the (billed) live map; fire map_open once per session with how it was triggered.
  const activateMap = (trigger: string) => { if (!mapTracked.current) { mapTracked.current = true; track('map_open', { trigger }); } setMapActive(true); };
  useEffect(() => { if (stops.length > 0) activateMap('auto'); }, [stops.length]);

  // Top-of-funnel: fire once per load with device + referrer source (direct / google / internal / host).
  useEffect(() => {
    let source = 'direct';
    const ref = document.referrer || '';
    if (ref) {
      try {
        const host = new URL(ref).hostname.replace(/^www\./, '');
        const self = window.location.hostname.replace(/^www\./, '');
        source = host === self ? 'internal' : /(^|\.)google\./.test(host) ? 'google' : host;
      } catch { source = 'other'; }
    }
    track('planner_open', { device: isMobile ? 'mobile' : 'desktop', source });
  }, []);

  // ---------- shareable URL state (query params) ----------
  const hydrated = useRef(false);
  const defaultStartRef = useRef(0);              // the no-op start (bus stand) — omitted from the URL
  const initialUrl = useRef<ParsedSearch | null>(null);
  if (initialUrl.current === null) initialUrl.current = parseSearch();
  const stateRef = useRef<StateSnap | null>(null);                  // latest itinerary, readable from history callbacks
  stateRef.current = { start, startTime, endTime, stops, loadedId, tripDate };
  const touchStartX = useRef<number | null>(null);               // mobile swipe-between-days
  const viewRef = useRef('itinerary');
  viewRef.current = isMobile ? mobView : deskTab;

  const buildSearch = (viewOverride?: string) => {
    const { start, startTime, endTime, stops, loadedId, tripDate } = stateRef.current!;
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
    if (tripDate && tripDate !== todayISO()) q.set('d', tripDate);  // only a non-today date is worth sharing
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
  const selectPlace = (i: number, source: string = 'timeline') => {
    const p = data?.places[i];
    if (p) track('place_view', { name: p.name, category: p.cat, source });   // source: timeline | map
    setSelectedIdx(i);   // card pops over the current view; map is opt-in
  };
  // Category / sub-type filter chips in the places picker → one place_filter event.
  const selectFilter = (cat: string) => { track('place_filter', { category: cat }); setFilter(cat); setSubFilter('All'); };
  const selectSubFilter = (sub: string) => { track('place_filter', { category: filter, sub }); setSubFilter(sub); };
  // User-initiated panel switch (places ↔ itinerary). Programmatic openView calls stay untracked.
  const switchView = (v: string) => { track('view_switch', { view: v === 'day' ? 'itinerary' : 'places' }); openView(v); };

  // Reset to the fresh landing — clear the plan, restore defaults, drop back to the ready-made
  // list. The URL-sync effect then clears the query (empty plan → bare path).
  const resetPlanner = () => {
    track('planner_reset', {});
    setBrowsing(false);
    setLoadedId(null);
    setStops([]);
    setSelectedIdx(null);
    setStart(defaultStartRef.current);
    setStartTime('09:00');
    setEndTime('19:00');
    setTripDate(todayISO());
    setFilter('All');
    setSubFilter('All');
    setMobView('itinerary');
    setDeskTab('day');
  };

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
      if (u.date) { const t = todayISO(); if (u.date >= t && u.date <= addDaysISO(t, 15)) setTripDate(u.date); }   // honour a shared date, but only if still in forecast range
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
  // While browsing the ready-made list the URL drops back to the bare planner path, so "back
  // to itinerary" (and the logo reset) leave a clean URL instead of a stale plan link.
  useEffect(() => {
    if (hydrated.current && !pendingCurated) window.history.replaceState(window.history.state, '', browsing ? window.location.pathname : buildSearch());
  }, [start, startTime, endTime, stops, loadedId, tripDate, browsing]);

  // Fetch Pondicherry's forecast for the selected date (skip dates outside the model's ~16-day range).
  useEffect(() => {
    const t = todayISO();
    if (tripDate < t || tripDate > addDaysISO(t, 15)) { setWeather(null); setWeatherLoading(false); return; }
    const ctrl = new AbortController();
    setWeatherLoading(true);
    fetchWeather(tripDate, ctrl.signal).then(w => { if (!ctrl.signal.aborted) { setWeather(w); setWeatherLoading(false); } });
    return () => ctrl.abort();
  }, [tripDate]);

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
    const removing = stops.some(s => s.idx === i), p = data.places[i];
    track('plan_edit', { kind: removing ? 'remove_place' : 'add_place', name: p?.name, category: p?.cat, day: activeDay });
    setStops(prev => prev.some(s => s.idx === i)
      ? prev.filter(s => s.idx !== i)
      : sortByDay([...prev, { idx: i, stay: idealStay(data.places[i]), day: activeDay }]));   // add to the day you're viewing
  };
  const editName_ = (s?: Stop) => s == null ? undefined : (s.idx != null ? data?.places[s.idx]?.name : (s.brk ? 'Free time' : s.meal));
  const removeStop = (i: number) => { touched(); track('plan_edit', { kind: 'remove_place', name: data?.places[i]?.name, category: data?.places[i]?.cat }); setStops(prev => prev.filter(s => s.idx !== i)); };
  const removeAt = (gi: number) => { touched(); track('plan_edit', { kind: 'remove', name: editName_(stops[gi]), day: stops[gi]?.day }); setStops(prev => prev.filter((_, k) => k !== gi)); };   // gi-based (also removes breaks)
  const addBreak = () => { touched(); track('plan_edit', { kind: 'add_break', name: 'Free time', day: activeDay }); setStops(prev => sortByDay([...prev, { brk: true, stay: 60, day: activeDay }])); };
  const move = (gi: number, dir: number) => { touched(); track('plan_edit', { kind: 'reorder', name: editName_(stops[gi]), day: stops[gi]?.day }); setStops(prev => { const a = prev.slice(); const j = gi + dir; if (j < 0 || j >= a.length) return prev; if ((a[gi].day || 1) !== (a[j].day || 1)) return prev; [a[gi], a[j]] = [a[j], a[gi]]; return a; }); };
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


  // ---------- derived: the day-by-day timeline (recomputed each render from stops) ----------
  const { tripDays, dayData, tripDrive, tripKm } = computeSchedule(stops, start, startTime, driveMin, driveKm);
  const curDay = tripDays.includes(activeDay) ? activeDay : tripDays[0];   // active day tab
  const mapStops = stops.filter((s): s is PlaceStop => !isPseudo(s) && (s.day || 1) === curDay);   // map = active day's real stops

  // Render the whole plan as clean plain text — for pasting into WhatsApp / notes / email.
  const planText = (): string => {
    if (!data) return '';
    const home = data.places[start].name;
    const [y, mo, dd] = tripDate.split('-').map(Number);
    const niceDate = new Date(y, mo - 1, dd).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    const total = stops.filter(s => !isPseudo(s)).length;
    const L: string[] = [`Pondicherry itinerary — ${niceDate}`];
    if (weather) {
      L.push(`Weather: ${weatherInfo(weather.code).label} · ${weather.tMax}°/${weather.tMin}° · ${weather.precip}% chance of rain`);
      const adv = umbrellaAdvisory(weather);
      if (adv) L.push(`☔ ${adv}`);
    }
    L.push('');
    tripDays.forEach(dn => {
      const d = dayData.find(x => x.day === dn);
      if (!d || !d.tl.length) return;
      if (tripDays.length > 1) L.push(`— Day ${dn} —`);
      L.push(`${fmtClock(parseTime(startTime))}  Depart ${home}`);
      let rn = 0;
      d.tl.forEach(t => {
        const time = fmtClock(t.arrive);
        if (t.brk) L.push(`${time}  Free time · ${fmtDur(t.stay)}`);
        else if (t.meal) L.push(`${time}  ${t.meal} · ${fmtDur(t.stay)}`);
        else {
          rn++;
          const place = data.places[t.idx!];
          L.push(`${time}  ${rn}. ${place.name} · ${fmtDur(t.stay)}`);
          L.push(`      ${itineraryNote(place)}`);
        }
      });
      L.push(`${fmtClock(d.clock)}  Back at ${home}`, '');
    });
    L.push(`${total} stop${total === 1 ? '' : 's'} · ${tripDrive} min drive · ${tripKm.toFixed(1)} km`);
    L.push(`Plan & customise: ${window.location.href}`);
    return L.join('\n');
  };
  const copyPlanText = async () => {
    track('plan_share', { method: 'copy_text' });
    try { await navigator.clipboard.writeText(planText()); setSnack('Itinerary copied as text ✓'); }
    catch { setSnack('Couldn’t copy — try again.'); }
    setShareAnchor(null); setMoreAnchor(null);
  };

  return { isMobile, data, setData, err, setErr, start, setStart, startTime, setStartTime, endTime, setEndTime, stops, setStops, tripDate, setTripDate, weather, weatherLoading, activeDay, setActiveDay, loadedId, setLoadedId, pendingCurated, setPendingCurated, filter, setFilter, subFilter, setSubFilter, planFilter, setPlanFilter, browsing, setBrowsing, collapsed, setCollapsed, toggleCat, shareAnchor, setShareAnchor, moreAnchor, setMoreAnchor, selectedIdx, setSelectedIdx, mobView, setMobView, itinView, setItinView, aboutOpen, setAboutOpen, hotelsOpen, setHotelsOpen, rentalsOpen, setRentalsOpen, deskTab, setDeskTab, aiQuery, setAiQuery, aiBusy, setAiBusy, snack, setSnack, mapActive, setMapActive, hydrated, defaultStartRef, initialUrl, stateRef, touchStartX, viewRef, buildSearch, openView, selectPlace, selectFilter, selectSubFilter, activateMap, switchView, resetPlanner, driveMin, driveKm, isStop, starts, byCat, sortByDay, touched, addToggle, removeStop, removeAt, addBreak, move, setStay, optimize, aiPlan, gmapsUrl, loadCurated, shareWhatsApp, copyShareLink, copyPlanText, tripDays, dayData, tripDrive, tripKm, curDay, mapStops };
}

/** Everything the planner exposes — panels receive this as a single `planner` prop. */
export type Planner = ReturnType<typeof usePlanner>;
