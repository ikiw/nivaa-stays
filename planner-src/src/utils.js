// Pure helpers for the planner: HTML escaping, visit-duration lookups, time math,
// map links, the timeline role tagger, GA4 tracking and the shareable-URL parser.
// No React — safe to import anywhere.
import { DUR_OVERRIDE, DUR_FOOD, DUR_SUB, DUR_CAT, BREAK_DUR, MEAL_DUR } from './constants.js';

/** Escape a string for safe interpolation into HTML/attributes. */
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/** Session cache: placeId → { url, author } for lazily-fetched Google photos.
 *  NB: `Map` is the vis.gl component in this app, so use the global constructor. */
export const photoCache = new globalThis.Map();

/**
 * Visit-duration triple [min, ideal, max] (minutes) for a place, from its name
 * override, else its Food/Attraction sub-type, else its category default.
 * @param {{name:string, cat:string, sub?:string}} p
 * @returns {number[]} [min, ideal, max]
 */
export function placeDur(p) {
  return DUR_OVERRIDE[p.name] || (p.cat === 'Food' ? (DUR_FOOD[p.sub] || [30, 45, 70])
    : p.cat === 'Attraction' ? (DUR_SUB[p.sub] || [30, 45, 75]) : (DUR_CAT[p.cat] || [30, 45, 60]));
}
/** Default ("ideal") stay in minutes for a place. */
export const idealStay = (p) => placeDur(p)[1];
/** True for a no-place stop (free time / a meal of your choosing). */
export const isPseudo = (s) => s.brk || s.meal;
/** Duration triple for a stop: break, meal, or its place's duration. */
export const stopDur = (s, places) => s.brk ? BREAK_DUR : s.meal ? MEAL_DUR : placeDur(places[s.idx]);

/** Minutes → compact human duration, e.g. 95 → "1h 35m". */
export const fmtDur = (m) => { const h = Math.floor(m / 60), mm = m % 60; return (h ? h + 'h' : '') + (mm ? (h ? ' ' : '') + mm + 'm' : (h ? '' : '0m')); };
/** "HH:MM" → minutes since midnight. */
export const parseTime = (s) => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
/** Minutes since midnight → 12-hour clock, e.g. 545 → "9:05 AM". */
export const fmtClock = (t) => { t = ((Math.round(t) % 1440) + 1440) % 1440; const h = Math.floor(t / 60), m = t % 60, ap = h < 12 ? 'AM' : 'PM', hh = h % 12 || 12; return `${hh}:${String(m).padStart(2, '0')} ${ap}`; };
/** Minutes since midnight → "HH:MM" (for time inputs). */
export const toHHMM = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
/** A place's Google Maps link, falling back to a name search. */
export const mapLink = (p) => p.map || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name + ', Pondicherry'));

/**
 * Role tag for a timeline stop, from category + arrival time (minutes since midnight).
 * @returns {string|null} e.g. 'Breakfast', 'Drinks', 'Shopping', or null.
 */
export function mealTag(cat, arrive) {
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

/** Fire a GA4 custom event (gtag is loaded in index.html). No-op if gtag is
 *  blocked/absent, so analytics never affects the planner's behaviour. */
export const track = (event, params) => { try { window.gtag && window.gtag('event', event, params || {}); } catch (e) { /* analytics blocked */ } };

/**
 * Read the shareable plan out of the URL query (?s=start &st/&et=window &p=stop-idxs &v=view).
 * Per-stop stay durations are intentionally not encoded — they fall back to the defaults.
 * @returns {{itinerary:string|null, start:number|null, startTime:string|null, endTime:string|null, stops:object[], view:string|null}}
 */
export function parseSearch() {
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
