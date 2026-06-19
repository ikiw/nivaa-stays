import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppBar, Toolbar, Box, Stack, Paper, Card, CardActionArea, Chip, Button, IconButton,
  TextField, MenuItem, Typography, BottomNavigation, BottomNavigationAction,
  Snackbar, CircularProgress, Divider, useMediaQuery, InputAdornment, Tooltip, Slider,
  ToggleButton, ToggleButtonGroup, Collapse, Menu,
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
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import LightbulbOutlinedRounded from '@mui/icons-material/LightbulbOutlined';
import SelfImprovementRounded from '@mui/icons-material/SelfImprovementRounded';
import ShareRounded from '@mui/icons-material/ShareRounded';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import WhatsApp from '@mui/icons-material/WhatsApp';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import KeyboardArrowUpRounded from '@mui/icons-material/KeyboardArrowUpRounded';
import KeyboardArrowDownRounded from '@mui/icons-material/KeyboardArrowDownRounded';
import DeleteOutlineRounded from '@mui/icons-material/DeleteOutlineRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import RouteRounded from '@mui/icons-material/RouteRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import MoreVertRounded from '@mui/icons-material/MoreVertRounded';
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
// Realistic per-place visit durations [min, ideal, max] in minutes — sub-category
// defaults with name overrides for places that differ from their type. Drives the
// default stay AND how curated days are spread (flexible places absorb the slack).
const DUR_SUB = { spiritual: [20, 30, 50], nature: [60, 90, 180], heritage: [30, 45, 90], adventure: [150, 180, 300] };
const DUR_FOOD = { 'south-indian': [30, 45, 75], 'north-indian': [30, 45, 75], multicuisine: [35, 50, 90], cafe: [30, 40, 70], continental: [40, 60, 100], fine: [60, 90, 150], dessert: [15, 25, 45], asian: [30, 40, 70] };
const DUR_CAT = { Beach: [45, 75, 160], Social: [60, 105, 210], Shopping: [30, 50, 100], Stay: [0, 0, 0], Area: [0, 0, 0] };
const DUR_OVERRIDE = {
  'Chunnambar Boat House': [75, 110, 150], 'Paradise Beach': [90, 120, 150], 'Matrimandir (Auroville)': [60, 90, 170],
  'Botanical Garden': [45, 60, 120], 'Puducherry Museum': [45, 60, 100], 'Promenade Beach': [45, 75, 140],
  'Bharathi Park (White Town)': [25, 40, 70], 'Serenity Beach': [45, 80, 150], 'Eden Beach': [40, 60, 120],
};
const BREAK_DUR = [30, 60, 240];   // a "Free time" filler: highly flexible so it soaks up the day's slack
const MEAL_DUR = [40, 55, 80];     // a meal stop without a fixed place ("Lunch nearby")
const MEAL_LABELS = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];   // tokens usable in a curated plan
function placeDur(p) {
  return DUR_OVERRIDE[p.name] || (p.cat === 'Food' ? (DUR_FOOD[p.sub] || [30, 45, 70])
    : p.cat === 'Attraction' ? (DUR_SUB[p.sub] || [30, 45, 75]) : (DUR_CAT[p.cat] || [30, 45, 60]));
}
const idealStay = (p) => placeDur(p)[1];
const isPseudo = (s) => s.brk || s.meal;            // a no-place stop (free time / a meal of your choosing)
const stopDur = (s, places) => s.brk ? BREAK_DUR : s.meal ? MEAL_DUR : placeDur(places[s.idx]);
const STAY_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240];
const fmtDur = (m) => { const h = Math.floor(m / 60), mm = m % 60; return (h ? h + 'h' : '') + (mm ? (h ? ' ' : '') + mm + 'm' : (h ? '' : '0m')); };

const parseTime = (s) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
const fmtClock = (t) => { t = ((Math.round(t) % 1440) + 1440) % 1440; const h = Math.floor(t / 60), m = t % 60, ap = h < 12 ? 'AM' : 'PM', hh = h % 12 || 12; return `${hh}:${String(m).padStart(2, '0')} ${ap}`; };
const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const mapLink = (p) => p.map || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name + ', Pondicherry'));

// Role tag for a timeline stop, from category + arrival time (minutes since midnight).
function mealTag(cat, arrive) {
  if (cat === 'Food') {
    if (arrive < 11 * 60) return 'Breakfast';
    if (arrive < 16 * 60) return 'Lunch';
    if (arrive < 18.5 * 60) return 'Snack';
    return 'Dinner';
  }
  if (cat === 'Social') return arrive < 18 * 60 ? 'Drinks' : 'Dinner & drinks';
  if (cat === 'Shopping') return 'Shopping';
  return null;
}
const TAG_COLOR = { Breakfast: '#F59E0B', Lunch: '#FB923C', Snack: '#FBBF24', Dinner: '#F472B6', 'Dinner & drinks': '#F472B6', Drinks: '#A78BFA', Shopping: '#A78BFA' };

// Curated starter itineraries — authored by us, by place name (resolved to catalog
// indices at load time so they survive catalog reordering). Shown when "Your day" is empty.
// Full 9am–10pm day-outs, breakfast → lunch → dinner woven through (meals ordered by time of day).
// `plan` is an array of days; each day is an ordered list of place names. 1-day plans
// have one day, 2-day plans two. Each day is its own loop from the start (you return to base).
const CURATED = [
  // orders are opening-hours-aware + grouped by area; see `why`. Re-authored against the expanded catalog.
  // ---------- 1-day ----------
  { id: "family-1d", cohort: "Family Day Out", tag: "Boat, beaches & market", start: "Pondicherry Bus Stand",
    why: "Start with a quick south-Indian breakfast, then drive south for the Chunnambar backwater boat to Paradise Beach. A real sit-down lunch at Jallikattu (opposite the boat house) fuels the crossing; kids snack on momos at Daddy Amma after the beach. Back in town for the evening: Manakula temple (reopens 4pm), Goubert Market, a sunset stroll on Promenade Beach, free time, then dinner at Copper Kitchen.",
    plan: [["Sri Murugan Cafe", "Chunnambar Boat House", "Jallikattu Restaurant", "Paradise Beach", "Daddy Amma Momo Shop", "Manakula Vinayagar Temple", "Goubert Market", "Promenade Beach", "Break", "Copper Kitchen"]] },
  { id: "couples-1d", cohort: "Couples Getaway", tag: "White Town & Serenity Beach", start: "Pondicherry Bus Stand",
    why: "A slow-romance White Town morning: a courtyard breakfast, the Ashram's calm, then the blush-pink Our Lady of Angels church and a leafy stroll through Bharathi Park. Heritage lunch at Maison Perumal, then scenic Serenity Beach to unwind. Back for a shared Zuka dessert, golden hour by the Old Lighthouse and Promenade Beach, and a rooftop dinner under the stars at Bay of Buddha.",
    plan: [["Cafe des Arts", "Sri Aurobindo Ashram", "Our Lady of Angels Church", "Bharathi Park (White Town)", "Maison Perumal Hotel & Restaurant", "Serenity Beach", "Zuka", "Old Lighthouse", "Promenade Beach", "Bay of Buddha"]] },
  { id: "bachelors-1d", cohort: "Bachelors' Trip", tag: "Surf beaches & nightlife", start: "Pondicherry Bus Stand",
    why: "Fuel up at Baker Street, then hit the north surf belt while you're fresh: a morning lesson at Kallialay Surf School on Serenity, beach time, a well-earned lunch at Terrassen, and a second dip at Auroville Beach. Roll back into White Town for shopping at Casablanca and sunset on Promenade, then close the night with craft beers at Catamaran Brewing Company.",
    plan: [["Baker Street", "Kallialay Surf School", "Serenity Beach", "Terrassen Cafe", "Auroville Beach", "Casablanca", "Promenade Beach", "Catamaran Brewing Company"]] },
  { id: "solo-1d", cohort: "Solo Explorer", tag: "Slow town culture", start: "Pondicherry Bus Stand",
    why: "A slow, walkable White Town arc for one. Coffee at Cafe des Arts, the hush of the Ashram, then two new gems: Aurodhan's contemporary art and the 1827 Romain Rolland Library. Lunch at Kasha Ki Aasha, the pink Our Lady of Angels church, Aayi Mandapam's white monument, a promenade coffee at Le Café, golden-hour Promenade Beach, dinner at La Terrace.",
    plan: [["Cafe des Arts", "Sri Aurobindo Ashram", "Aurodhan Art Gallery", "Romain Rolland Library", "Kasha Ki Aasha", "Our Lady of Angels Church", "Aayi Mandapam", "Le Café", "Promenade Beach", "La Terrace"]] },
  // ---------- 2-day ----------
  { id: "family-2d", cohort: "Family Day Out", tag: "Town day + a boat-&-beach day", start: "Pondicherry Bus Stand",
    why: "Day 1 is a relaxed town loop the kids will love: tiffin breakfast, the basilica, lunch, then Botanical Garden and the free Jawahar Toy Museum, sunset on the Promenade, the lamp-lit Manakula temple (after its 4pm reopening), and a heritage-courtyard dinner at Le Dupleix. Day 2 heads south: backwater boat house, a proper sit-down lunch at Jallikattu opposite the jetty, the boat to Paradise (before the 2:30 last boat), Eden Beach, momos as a snack, then back to town for the promenade and dinner.",
    plan: [
      ["Sri Murugan Cafe", "Sacred Heart Basilica", "Hotel Atithi", "Botanical Garden", "Jawahar Toy Museum", "Promenade Beach", "Manakula Vinayagar Temple", "Le Dupleix"],
      ["Hot Breads", "Chunnambar Boat House", "Jallikattu Restaurant", "Paradise Beach", "Eden Beach", "Daddy Amma Momo Shop", "Promenade Beach", "Copper Kitchen"]
    ] },
  { id: "couples-2d", cohort: "Couples Getaway", tag: "White Town, then Auroville", start: "Pondicherry Bus Stand",
    why: "Day 1 is a slow White Town romance: the Ashram, a leafy Bharathi Park stroll, lunch at Maison Perumal, the pink Our Lady of Angels church and Sacred Heart Basilica, a shared Zuka dessert, a Promenade sunset, then a candlelit dinner in Le Dupleix's heritage courtyard. Day 2 loops Auroville: collect your Matrimandir pass at the Visitor Centre first, view the gold dome, shop the Boutique, lunch at The Groves, then the beach, bakery and a relaxed dinner at Terrassen.",
    plan: [
      ["Cafe des Arts", "Sri Aurobindo Ashram", "Bharathi Park (White Town)", "Maison Perumal Hotel & Restaurant", "Our Lady of Angels Church", "Sacred Heart Basilica", "Kalki", "Zuka", "Promenade Beach", "Le Dupleix"],
      ["Marc's Café", "Auroville Visitor Centre", "Matrimandir (Auroville)", "Boutique d'Auroville", "The Groves", "Auroville Beach", "Auroville Bakery", "Break", "Terrassen Cafe"]
    ] },
  { id: "bachelors-2d", cohort: "Bachelors' Trip", tag: "Surf day, then a boat day", start: "Pondicherry Bus Stand",
    why: "Day 1 is your north surf day: coffee at Baker Street, then a proper surf lesson at Kallialay (Serenity Beach), chill on the same sand, Auroville lunch and beaches, then promenade sunset and craft beer at Bike & Barrel. Day 2 heads south for the boat: a real sit-down lunch at Jallikattu right by the jetty, the boat to Paradise, Eden Beach, momos as a snack, then drinks at Cantos.",
    plan: [
      ["Baker Street", "Kallialay Surf School", "Serenity Beach", "Terrassen Cafe", "Auroville Beach", "Boutique d'Auroville", "Promenade Beach", "Break", "Bike & Barrel"],
      ["Hot Breads", "Chunnambar Boat House", "Jallikattu Restaurant", "Paradise Beach", "Eden Beach", "Daddy Amma Momo Shop", "Break", "Cantos Social House"]
    ] },
  { id: "solo-2d", cohort: "Solo Explorer", tag: "Town culture, then Auroville", start: "Pondicherry Bus Stand",
    why: "Day 1 is a slow town-culture arc: the Ashram before its midday close, the Bharathiyar memorial and Aurodhan's contemporary art, lunch at Kasha Ki Aasha, a Bharathi Park pause, a boutique browse and a Promenade sunset before dinner at La Terrace. Day 2 is one calm Auroville loop: collect the Matrimandir pass at the Visitor Centre, lunch at Conscious Cafe, then the gold dome, the reflective Savitri Bhavan, a boutique stop, Auroville Beach and an easy dinner at Terrassen.",
    plan: [
      ["Coromandel Café", "Sri Aurobindo Ashram", "Mahakavi Bharathiyar Memorial Centre", "Aurodhan Art Gallery", "Kasha Ki Aasha", "Bharathi Park (White Town)", "Kalki", "Promenade Beach", "La Terrace"],
      ["Auroville Bakery", "Auroville Visitor Centre", "Conscious Cafe", "Matrimandir (Auroville)", "Savitri Bhavan", "Boutique d'Auroville", "Auroville Beach", "Terrassen Cafe"]
    ] },
];
const DAY_COLORS = ['#2563EB', '#EA580C'];   // route colour per trip day (Day 1 blue, Day 2 orange)

// Fire a GA4 custom event (gtag is loaded in index.html). No-op if gtag is
// blocked/absent, so analytics never affects the planner's behaviour.
const track = (event, params) => { try { window.gtag && window.gtag('event', event, params || {}); } catch (e) {} };

// Read the shareable plan out of the URL query (?s=start &st/&et=window &p=stop-idxs &v=view).
// Per-stop stay durations are intentionally not encoded — they fall back to the defaults.
function parseSearch() {
  const q = new URLSearchParams(window.location.search);
  const s = q.get('s'), st = q.get('st'), et = q.get('et'), p = q.get('p'), v = q.get('v');
  return {
    itinerary: q.get('itinerary'),
    start: s != null && /^\d+$/.test(s) ? +s : null,
    startTime: /^\d{1,2}:\d{2}$/.test(st || '') ? st : null,
    endTime: /^\d{1,2}:\d{2}$/.test(et || '') ? et : null,
    // p = day groups separated by "~"; within a day, stops by "-"; each stop "idx" / "idx.stay" / "b<stay>" (break)
    stops: p ? p.split('~').flatMap((grp, di) => grp.split('-').map(seg => {
      if (!seg) return null;
      if (/^b\d*$/.test(seg)) return { brk: true, stay: seg.length > 1 ? +seg.slice(1) : null, day: di + 1 };
      const mm = seg.match(/^m([BLSD])(\d*)$/);
      if (mm) return { meal: { B: 'Breakfast', L: 'Lunch', S: 'Snack', D: 'Dinner' }[mm[1]], stay: mm[2] ? +mm[2] : null, day: di + 1 };
      const [a, b] = seg.split('.');
      const idx = +a;
      return Number.isInteger(idx) && idx >= 0 ? { idx, stay: b != null && /^\d+$/.test(b) ? +b : null, day: di + 1 } : null;
    }).filter(Boolean)) : [],
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
  const [stops, setStops] = useState([]); // [{ idx, stay, day }]
  const [activeDay, setActiveDay] = useState(1); // which day's tab is shown (2-day curated plans)
  const [loadedId, setLoadedId] = useState(null); // id of a pristine curated plan → readable ?itinerary= URL
  const [pendingCurated, setPendingCurated] = useState(null); // ?itinerary=<id> to load once data is ready
  const [filter, setFilter] = useState('All');
  const [subFilter, setSubFilter] = useState('All');
  const [planFilter, setPlanFilter] = useState('all'); // ready-made plans: 'all' | 1 | 2 days
  const [browsing, setBrowsing] = useState(false); // viewing the plan list while a plan is loaded
  const [collapsed, setCollapsed] = useState(() => new Set(PICK_ORDER.slice(1))); // only the first section (Beaches) open by default
  const toggleCat = (cat) => setCollapsed(prev => { const n = new Set(prev); n.has(cat) ? n.delete(cat) : n.add(cat); return n; });
  const [shareAnchor, setShareAnchor] = useState(null);
  const [moreAnchor, setMoreAnchor] = useState(null);
  const [mobView, setMobView] = useState('itinerary'); // itinerary | places (mobile bottom tabs)
  const [itinView, setItinView] = useState('timeline'); // timeline | map (toggle inside the Itinerary tab)
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
  const initialUrl = useRef(null);
  if (initialUrl.current === null) initialUrl.current = parseSearch();
  const stateRef = useRef(null);                  // latest itinerary, readable from history callbacks
  stateRef.current = { start, startTime, endTime, stops, loadedId };
  const touchStartX = useRef(null);               // mobile swipe-between-days
  const viewRef = useRef('itinerary');
  viewRef.current = isMobile ? mobView : deskTab;

  const buildSearch = (viewOverride) => {
    const { start, startTime, endTime, stops, loadedId } = stateRef.current;
    const view = viewOverride !== undefined ? viewOverride : viewRef.current;
    const q = new URLSearchParams();
    if (loadedId) {
      q.set('itinerary', loadedId);                                 // readable URL for an unmodified curated plan
    } else {
      if (start != null && start !== defaultStartRef.current) q.set('s', String(start));
      if (startTime && startTime !== '09:00') q.set('st', startTime);
      if (endTime && endTime !== '19:00') q.set('et', endTime);
      const enc = s => { if (s.brk) return 'b' + s.stay; if (s.meal) return 'm' + s.meal[0] + s.stay; const def = data?.places?.[s.idx] ? idealStay(data.places[s.idx]) : 45; return s.stay === def ? String(s.idx) : `${s.idx}.${s.stay}`; };
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
  const openView = (v) => {
    setDeskTab(v === 'day' ? 'day' : 'places');
    if (isMobile) {
      if (v === 'places') setMobView('places');
      else { setMobView('itinerary'); setItinView('timeline'); }
    }
    window.history.replaceState(window.history.state, '', buildSearch(v));
  };

  useEffect(() => {
    fetch(DATA_URL).then(r => r.json()).then(d => {
      setData(d);
      const bus = d.places.findIndex(p => /bus stand/i.test(p.name));
      defaultStartRef.current = bus >= 0 ? bus : 0;
      // Hydrate from a shared link if present, else fall back to the bus-stand default.
      const u = initialUrl.current;
      const curated = u.itinerary && CURATED.find(c => c.id === u.itinerary);
      const startIdx = u.start != null && d.places[u.start] ? u.start : (bus >= 0 ? bus : 0);
      setStart(startIdx);
      if (curated) {
        setPendingCurated(curated.id);                  // load it once `data` state is committed (needs the matrix)
      } else {
        if (u.startTime) setStartTime(u.startTime);
        if (u.endTime) setEndTime(u.endTime);
        if (u.stops.length) {
          const seen = new Set();
          setStops(u.stops
            .filter(o => o.brk || o.meal || (d.places[o.idx] && o.idx !== startIdx && !seen.has(o.idx) && seen.add(o.idx)))
            .map(o => o.brk ? { brk: true, stay: o.stay ?? BREAK_DUR[1], day: o.day || 1 }
              : o.meal ? { meal: o.meal, stay: o.stay ?? MEAL_DUR[1], day: o.day || 1 }
              : { idx: o.idx, stay: o.stay ?? idealStay(d.places[o.idx]), day: o.day || 1 }));
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

  const sortByDay = (a) => a.map((s, i) => [s, i]).sort((x, y) => ((x[0].day || 1) - (y[0].day || 1)) || (x[1] - y[1])).map(p => p[0]);
  const touched = () => setLoadedId(null);   // any manual edit drops the readable ?itinerary= URL
  const addToggle = (i) => {
    touched();
    track('plan_edit', { kind: stops.some(s => s.idx === i) ? 'remove_place' : 'add_place' });
    setStops(prev => prev.some(s => s.idx === i)
      ? prev.filter(s => s.idx !== i)
      : sortByDay([...prev, { idx: i, stay: idealStay(data.places[i]), day: activeDay }]));   // add to the day you're viewing
  };
  const removeStop = (i) => { touched(); track('plan_edit', { kind: 'remove_place' }); setStops(prev => prev.filter(s => s.idx !== i)); };
  const removeAt = (gi) => { touched(); track('plan_edit', { kind: 'remove' }); setStops(prev => prev.filter((_, k) => k !== gi)); };   // gi-based (also removes breaks)
  const addBreak = () => { touched(); track('plan_edit', { kind: 'add_break' }); setStops(prev => sortByDay([...prev, { brk: true, stay: 60, day: activeDay }])); };
  const move = (gi, dir) => { touched(); track('plan_edit', { kind: 'reorder' }); setStops(prev => { const a = prev.slice(); const j = gi + dir; if (j < 0 || j >= a.length) return prev; if ((a[gi].day || 1) !== (a[j].day || 1)) return prev; [a[gi], a[j]] = [a[j], a[gi]]; return a; }); };
  const setStay = (gi, v) => { touched(); setStops(prev => prev.map((s, k) => k === gi ? { ...s, stay: Math.max(0, +v || 0) } : s)); };

  function optimize() {
    touched();
    track('plan_optimize', { stops: stops.length });
    setStops(prev => {
      if (prev.length < 2) return prev;
      const days = [...new Set(prev.map(s => s.day || 1))].sort((a, b) => a - b);
      const ordered = [];
      days.forEach(dn => {                                 // nearest-neighbour within each day
        const remaining = prev.filter(s => (s.day || 1) === dn); let cur = start;
        while (remaining.length) {
          let best = 0, bestMin = Infinity;
          remaining.forEach((s, i) => { const m = driveMin(cur, s.idx); if (m < bestMin) { bestMin = m; best = i; } });
          const nx = remaining.splice(best, 1)[0]; ordered.push(nx); cur = nx.idx;
        }
      });
      return ordered;
    });
  }

  async function aiPlan() {
    const q = aiQuery.trim(); if (!q || aiBusy) return;
    setAiBusy(true);
    const hadStops = stops.length > 0;
    track('plan_ai_request', { has_stops: hadStops, query_len: q.length });
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
        .map(i => ({ idx: i, stay: prevStay[i] ?? idealStay(data.places[i]), day: 1 }));
      if (!hadStops && next.length >= 2) {
        const remaining = next.slice(), ordered = []; let cur = nextStart;
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
    const pt = i => `${data.places[i].lat},${data.places[i].lng}`;
    let u = `https://www.google.com/maps/dir/?api=1&origin=${pt(start)}&destination=${pt(start)}&travelmode=driving`;
    const wps = stops.filter(s => !isPseudo(s)).map(s => pt(s.idx)).join('|');
    if (wps) u += `&waypoints=${encodeURIComponent(wps)}`;
    return u;
  };

  // load a curated starter plan (resolve names → catalog indices, then open the day view)
  // Give every stop its realistic ideal duration, then fill the day toward ~10 PM by
  // stretching only the FLEXIBLE places (beaches, boating, nightlife) up to their max —
  // so quick stops (temples, museums) stay short and the long experiences soak up the slack.
  // items: array of { idx } (a place) or { brk:true } (free time). Returns a stay per item.
  const scheduleStays = (startIdx, items) => {
    const n = items.length; if (!n) return [];
    const D = items.map(it => stopDur(it, data.places));
    const stays = D.map(x => x[1]);
    // breaks add 0 drive and don't move you — carry the previous real place through them
    const driveAt = k => { if (isPseudo(items[k])) return 0; let prev = startIdx; for (let j = 0; j < k; j++) if (!isPseudo(items[j])) prev = items[j].idx; return driveMin(prev, items[k].idx); };
    let lastReal = startIdx; for (let j = n - 1; j >= 0; j--) if (!isPseudo(items[j])) { lastReal = items[j].idx; break; }
    let drive = driveMin(lastReal, startIdx);
    for (let k = 0; k < n; k++) drive += driveAt(k);
    const target = parseTime('22:45');
    const backBy = () => parseTime('09:00') + drive + stays.reduce((a, b) => a + b, 0);
    let slack = target - backBy();
    if (slack > 0) {
      for (let pass = 0; pass < 6 && slack > 5; pass++) {
        const head = stays.map((s, k) => D[k][2] - s), tot = head.reduce((a, b) => a + b, 0);
        if (tot <= 0) break;
        stays.forEach((s, k) => { stays[k] = s + Math.min(head[k], slack * head[k] / tot); });
        slack = target - backBy();
      }
    } else if (slack < 0) {
      const head = stays.map((s, k) => s - D[k][0]), tot = head.reduce((a, b) => a + b, 0);
      if (tot > 0) stays.forEach((s, k) => { stays[k] = s - Math.min(head[k], (-slack) * head[k] / tot); });
    }
    return stays.map((s, k) => Math.max(D[k][0], Math.round(s / 5) * 5));
  };

  const loadCurated = (c, silent) => {
    const find = n => data.places.findIndex(p => p.name === n);
    const s = find(c.start), startIdx = s >= 0 ? s : start;
    const all = [];
    c.plan.forEach((dayNames, di) => {                 // each plan day scheduled independently
      const items = dayNames.map(n => n === 'Break' ? { brk: true } : MEAL_LABELS.includes(n) ? { meal: n } : { idx: find(n) }).filter(it => it.brk || it.meal || it.idx >= 0);
      const stays = scheduleStays(startIdx, items);
      items.forEach((it, k) => all.push(it.brk ? { brk: true, stay: stays[k], day: di + 1 } : it.meal ? { meal: it.meal, stay: stays[k], day: di + 1 } : { idx: it.idx, stay: stays[k], day: di + 1 }));
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

  // ---------- timeline computation (per day; each day loops from the start) ----------
  const tripDays = stops.length ? [...new Set(stops.map(s => s.day || 1))].sort((a, b) => a - b) : [1];
  const dayData = tripDays.map(dn => {
    const tl = []; let clock = parseTime(startTime), drive = 0, km = 0, prev = start;
    stops.forEach((s, gi) => {
      if ((s.day || 1) !== dn) return;
      if (isPseudo(s)) {                                 // free time / a meal of your choosing — no travel
        const arrive = clock; clock += s.stay;
        tl.push({ gi, brk: s.brk, meal: s.meal, dm: 0, dk: 0, arrive, depart: clock, stay: s.stay });
        return;
      }
      const dm = driveMin(prev, s.idx), dk = driveKm(prev, s.idx);
      drive += dm; km += dk; clock += dm;
      const arrive = clock; clock += s.stay; const depart = clock;
      tl.push({ gi, idx: s.idx, dm, dk, arrive, depart, stay: s.stay });
      prev = s.idx;
    });
    const rMin = driveMin(prev, start), rKm = driveKm(prev, start);
    if (tl.length) { drive += rMin; km += rKm; clock += rMin; }
    return { day: dn, tl, drive, km, clock, rMin, rKm };
  });
  const tripDrive = dayData.reduce((a, d) => a + d.drive, 0);
  const tripKm = dayData.reduce((a, d) => a + d.km, 0);
  const curDay = tripDays.includes(activeDay) ? activeDay : tripDays[0];   // active day tab
  const mapStops = stops.filter(s => !isPseudo(s) && (s.day || 1) === curDay);   // map shows only the active day's real stops

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
  const planChips = () => (
    <Stack direction="row" spacing={0.8} useFlexGap flexWrap="wrap">
      {[['all', 'All'], [1, '1 Day Itinerary'], [2, '2 Day Itinerary']].map(([key, label]) => (
        <Chip key={key} label={label} size="small"
          color={planFilter === key ? 'primary' : 'default'} variant={planFilter === key ? 'filled' : 'outlined'}
          onClick={() => setPlanFilter(key)} sx={{ fontWeight: 600 }} />
      ))}
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

  const PlaceCard = (i) => {
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
          const inner = [];
          if (SUB_ORDER[cat]) {
            const bySub = {}; items.forEach(i => { const s = data.places[i].sub || ''; (bySub[s] = bySub[s] || []).push(i); });
            let subs = SUB_ORDER[cat].filter(s => bySub[s]).concat(Object.keys(bySub).filter(s => !SUB_ORDER[cat].includes(s)));
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

  const DayPanel = ({ hideBack } = {}) => {
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
                      return <Fragment key={t.gi}>{Node({
                        idx: t.idx, gi: t.gi, dot: rn, title: data.places[t.idx].name, cat: data.places[t.idx].cat, day: d.day,
                        tag: mealTag(data.places[t.idx].cat, t.arrive),
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

  // connected timeline row: coloured dot + a leg-coloured line to the next dot,
  // the place card, and the drive label sitting on the connector.
  function Node({ icon, idx, cat, dot, title, sub, stay, gi, last, legColor, drive, tag, day, upDisabled, downDisabled, brk, meal }) {
    const editable = typeof gi === 'number';
    const stayField = editable && (
      <TextField select size="small" value={stay} onChange={e => setStay(gi, e.target.value)} sx={{ width: 118 }}
        InputProps={{ startAdornment: <AccessTimeRounded sx={{ fontSize: 16, color: 'text.secondary', mr: 0.6 }} /> }}
        SelectProps={{ MenuProps: { PaperProps: { sx: { maxHeight: 300 } } } }}>
        {(STAY_OPTIONS.includes(stay) ? STAY_OPTIONS : [...STAY_OPTIONS, stay].sort((a, b) => a - b)).map(m => (<MenuItem key={m} value={m}>{fmtDur(m)}</MenuItem>))}
      </TextField>
    );
    if (brk || meal) {
      const PIcon = meal ? RestaurantRounded : SelfImprovementRounded;
      const pColor = meal ? (TAG_COLOR[meal] || '#94A3B8') : null;
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
                {editable && (
                  <Stack direction="row" spacing={0.2} sx={{ flexShrink: 0 }}>
                    <IconButton size="small" disabled={upDisabled} onClick={() => move(gi, -1)}><KeyboardArrowUpRounded fontSize="small" /></IconButton>
                    <IconButton size="small" disabled={downDisabled} onClick={() => move(gi, 1)}><KeyboardArrowDownRounded fontSize="small" /></IconButton>
                    <IconButton size="small" onClick={() => removeAt(gi)}><DeleteOutlineRounded fontSize="small" /></IconButton>
                  </Stack>
                )}
              </Stack>
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 0.4, fontSize: '0.78rem', color: 'text.secondary' }}>
                <span>{sub} · {meal ? 'grab a bite nearby' : 'relax or explore on your own'}</span>{stayField}
              </Stack>
            </Paper>
            {!last && drive && (<Box sx={{ mt: 0.7, fontSize: '0.76rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}><DirectionsCarRounded sx={{ fontSize: 15, color: legColor || 'inherit' }} />{drive}</Box>)}
          </Box>
        </Stack>
      );
    }
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
                {tag && <Box component="span" sx={{ flexShrink: 0, fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', px: 0.6, py: '1px', borderRadius: '6px', bgcolor: `${TAG_COLOR[tag] || '#94A3B8'}26`, color: TAG_COLOR[tag] || '#94A3B8' }}>{tag}</Box>}
              </Typography>
              {editable && (
                <Stack direction="row" spacing={0.2} sx={{ flexShrink: 0 }}>
                  <IconButton size="small" disabled={upDisabled} onClick={() => move(gi, -1)}><KeyboardArrowUpRounded fontSize="small" /></IconButton>
                  <IconButton size="small" disabled={downDisabled} onClick={() => move(gi, 1)}><KeyboardArrowDownRounded fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => removeAt(gi)}><DeleteOutlineRounded fontSize="small" /></IconButton>
                </Stack>
              )}
            </Stack>
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 0.4, fontSize: '0.78rem', color: 'text.secondary' }}>
              <span>{sub}</span>
              {editable && (
                <TextField select size="small" value={stay} onChange={e => setStay(gi, e.target.value)} sx={{ width: 118 }}
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
    <Box sx={{ height: '100%', minHeight: 0, borderRadius: '14px', overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative', bgcolor: '#0d0d10' }}>
      {mapActive ? (
        <>
          <RouteMap data={data} start={start} stops={mapStops} />
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
            onChange={(_, v) => { touched(); setStartTime(toHHMM(v[0])); setEndTime(toHHMM(v[1])); }}
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
    const swipeDays = (e) => {                            // swipe left/right between Day 1 / Day 2
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
            <Box sx={{ mb: 1 }}>{AiBar()}</Box>
            {mobView === 'places' && <Box sx={{ mb: 0.5 }}>{Controls()}</Box>}
          </Box>
        )}
        <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {mobView === 'places' ? (
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{PlacesPanel()}</Box>
          ) : planView && itinView === 'map' ? (
            <Box sx={{ flex: 1, minHeight: 0, p: 1.5, pt: 1 }}>{MapView()}</Box>
          ) : (
            <Box onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }} onTouchEnd={swipeDays}
              sx={{ flex: 1, minHeight: 0, overflowY: 'auto', p: 1.5, pt: 1 }}>{DayPanel({ hideBack: true })}</Box>
          )}
        </Box>
        <Box sx={{ flexShrink: 0, bgcolor: 'background.paper', borderTop: '1px solid', borderColor: 'divider', pb: 'env(safe-area-inset-bottom)' }}>
          <BottomNavigation showLabels value={mobView}
            onChange={(_, v) => { if (!v) return; if (v === 'itinerary') { setBrowsing(false); openView('day'); } else openView('places'); }} sx={{ bgcolor: 'transparent' }}>
            <BottomNavigationAction value="itinerary" label={`Itinerary${stops.length ? ` (${stops.filter(s => !isPseudo(s)).length})` : ''}`} icon={<CalendarMonthRounded />} />
            <BottomNavigationAction value="places" label="Places" icon={<PlaceRounded />} />
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
      </Paper>
      {/* body */}
      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', gap: 1.25 }}>
        {/* left rail card */}
        <Paper elevation={0} sx={{ width: 470, flexShrink: 0, height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '14px', border: '1px solid', borderColor: 'divider',
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
                    {d.tl.map((t, ti) => {
                      const lastStop = ti === d.tl.length - 1;
                      return <GlanceRow key={t.gi} color={CAT_HEX[data.places[t.idx].cat] || '#2196F3'} dot={ti + 1} name={data.places[t.idx].name} time={fmtClock(t.arrive)}
                        last={lastStop} legColor={LEG_COLORS[(ti + 1) % LEG_COLORS.length]}
                        drive={lastStop ? null : `${d.tl[ti + 1].dm} min · ${d.tl[ti + 1].dk} km`} />;
                    })}
                  </Box>
                ))}
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
  // markers: start (S) + each stop numbered within its day; coloured by day when 2 days.
  const markers = useMemo(() => {
    const out = [{ idx: start, label: 'S', color: '#F59E0B', isStart: true }];
    const days = [...new Set(stops.map(s => s.day || 1))].sort((a, b) => a - b);
    const multi = days.length > 1;
    days.forEach(dn => {
      stops.filter(s => (s.day || 1) === dn).forEach((s, k) => {
        out.push({ idx: s.idx, label: (multi ? `${dn}·` : '') + (k + 1), color: multi ? DAY_COLORS[(dn - 1) % DAY_COLORS.length] : (CAT_HEX[data.places[s.idx]?.cat] || '#2196F3') });
      });
    });
    return out;
  }, [start, stops, data]);

  // Centre on the start when there's no route (Directions auto-fits otherwise).
  useEffect(() => {
    if (!map || stops.length || !data.places[start]) return;
    map.setCenter({ lat: data.places[start].lat, lng: data.places[start].lng });
    map.setZoom(13);
  }, [map, start, stops.length, data]);

  const sel = selected != null ? data.places[selected] : null;
  return (
    <>
      {markers.map((m, i) => {
        const p = data.places[m.idx]; if (!p) return null;
        return (
          <AdvancedMarker key={m.idx + '-' + i} position={{ lat: p.lat, lng: p.lng }} zIndex={m.isStart ? 9999 : 100 + i} onClick={() => setSelected(m.idx)}>
            <PinChip label={m.label} name={p.name} color={m.color} />
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
    const days = [...new Set(stops.map(s => s.day || 1))].sort((a, b) => a - b);
    const multi = days.length > 1;
    const bounds = new g.LatLngBounds();
    let pending = days.length;
    const done = () => { if (--pending <= 0 && !bounds.isEmpty()) map.fitBounds(bounds, 60); };
    days.forEach(dn => {                                  // one Directions request per day (each loops from start)
      const idxs = stops.filter(s => (s.day || 1) === dn).map(s => s.idx);
      if (!idxs.length) { done(); return; }
      const last = idxs[idxs.length - 1];
      new routesLib.DirectionsService().route({
        origin: pt(start), destination: pt(last),
        waypoints: idxs.slice(0, -1).map(idx => ({ location: pt(idx), stopover: true })),
        travelMode: g.TravelMode.DRIVING, optimizeWaypoints: false,
      }, (res, status) => {
        if (status === 'OK' && res.routes[0]) {
          res.routes[0].legs.forEach((leg, li) => {
            const path = [];
            leg.steps.forEach(st => (st.path || []).forEach(q => { path.push(q); bounds.extend(q); }));
            const color = multi ? DAY_COLORS[(dn - 1) % DAY_COLORS.length] : LEG_COLORS[li % LEG_COLORS.length];
            linesRef.current.push(new g.Polyline({ path, map, strokeColor: color, strokeOpacity: 0.92, strokeWeight: 5 }));
          });
        }
        done();
      });
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
function Grid({ children }) { return <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1 }}>{children}</Box>; }
function CatHead({ cat, count, collapsed, onToggle }) {
  const Icon = CAT_ICON[cat];
  return (
    <Box onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.(); } }}
      sx={{ display: 'flex', alignItems: 'center', gap: 0.6, py: 0.5, cursor: 'pointer', userSelect: 'none', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
      <Icon sx={{ fontSize: 15, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>{CAT_LABEL[cat]}</Typography>
      <Typography component="span" sx={{ fontSize: '0.72rem', fontWeight: 700 }}>{count}</Typography>
      <ExpandMoreRounded sx={{ fontSize: 18, transition: 'transform .2s ease', transform: collapsed ? 'rotate(-90deg)' : 'none' }} />
    </Box>
  );
}
