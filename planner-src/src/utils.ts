// Pure helpers for the planner: HTML escaping, visit-duration lookups, time math,
// map links, the timeline role tagger, GA4 tracking and the shareable-URL parser.
// No React — safe to import anywhere.
import { DUR_OVERRIDE, DUR_FOOD, DUR_SUB, DUR_CAT, BREAK_DUR, MEAL_DUR } from './constants';
import type { Place, Stop, SchedItem, DurTriple, Pseudoable, ParsedSearch, ParsedStop } from './types';

/** Escape a string for safe interpolation into HTML/attributes. */
export const esc = (s: unknown): string => {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => map[c]);
};

/** Session cache: placeId → { url, author } for lazily-fetched Google photos.
 *  NB: `Map` is the vis.gl component in this app, so use the global constructor. */
export const photoCache = new globalThis.Map<string, { url: string; author: string }>();

/**
 * Visit-duration triple [min, ideal, max] (minutes) for a place, from its name
 * override, else its Food/Attraction sub-type, else its category default.
 */
export function placeDur(p: Place): DurTriple {
  return DUR_OVERRIDE[p.name] || (p.cat === 'Food' ? (DUR_FOOD[p.sub || ''] || [30, 45, 70])
    : p.cat === 'Attraction' ? (DUR_SUB[p.sub || ''] || [30, 45, 75]) : (DUR_CAT[p.cat] || [30, 45, 60]));
}
/** Default ("ideal") stay in minutes for a place. */
export const idealStay = (p: Place): number => placeDur(p)[1];
/** True for a no-place stop (free time / a meal of your choosing) — narrows the type. */
export function isPseudo<T extends Pseudoable>(s: T): s is T & ({ brk: true } | { meal: string }) {
  return !!(s.brk || s.meal);
}
/** Duration triple for a stop: break, meal, or its place's duration. */
export const stopDur = (s: Stop | SchedItem, places: Place[]): DurTriple =>
  isPseudo(s) ? (s.brk ? BREAK_DUR : MEAL_DUR) : placeDur(places[s.idx]);

/** Minutes → compact human duration, e.g. 95 → "1h 35m". */
export const fmtDur = (m: number): string => { const h = Math.floor(m / 60), mm = m % 60; return (h ? h + 'h' : '') + (mm ? (h ? ' ' : '') + mm + 'm' : (h ? '' : '0m')); };
/** "HH:MM" → minutes since midnight. */
export const parseTime = (s: string): number => { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); };
/** Minutes since midnight → 12-hour clock, e.g. 545 → "9:05 AM". */
export const fmtClock = (t: number): string => { t = ((Math.round(t) % 1440) + 1440) % 1440; const h = Math.floor(t / 60), m = t % 60, ap = h < 12 ? 'AM' : 'PM', hh = h % 12 || 12; return `${hh}:${String(m).padStart(2, '0')} ${ap}`; };
/** Minutes since midnight → "HH:MM" (for time inputs). */
export const toHHMM = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
/** A place's Google Maps link, falling back to a name search. */
export const mapLink = (p: { name: string; map?: string }): string => p.map || ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(p.name + ', Pondicherry'));

/**
 * Role tag for a timeline stop, from category + arrival time (minutes since midnight).
 * Returns e.g. 'Breakfast', 'Drinks', 'Shopping', or null.
 */
export function mealTag(cat: string, arrive: number): string | null {
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

const MEAL_ORDER = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
/** Food meal slot from arrival minutes: 0 Breakfast · 1 Lunch · 2 Snack · 3 Dinner. */
function foodSlot(arrive: number): number {
  if (arrive < 11 * 60) return 0;
  if (arrive < 16 * 60) return 1;
  if (arrive < 18.5 * 60) return 2;
  return 3;
}
/**
 * Sequence-aware meal tags for a day's stops, in chronological order. A Food stop normally
 * takes its time-of-day slot, but if that slot is already used it's bumped to the next one —
 * so a second lunch-window meal becomes a Snack (then Dinner), never a duplicate "Lunch".
 * Non-food stops (Social / Shopping) keep their plain time-based tag.
 * @param stops ordered [{ cat, arrive }] for the day's real stops
 * @returns the tag (or null) per stop, aligned by index
 */
export function mealTagsForDay(stops: { cat: string; arrive: number }[]): (string | null)[] {
  let last = -1;   // index in MEAL_ORDER of the last meal assigned this day
  return stops.map(s => {
    if (s.cat !== 'Food') return mealTag(s.cat, s.arrive);
    const slot = Math.min(3, Math.max(foodSlot(s.arrive), last + 1));
    last = slot;
    return MEAL_ORDER[slot];
  });
}

/** Fire a GA4 custom event (gtag is loaded in index.html). No-op if gtag is
 *  blocked/absent, so analytics never affects the planner's behaviour. */
export const track = (event: string, params?: Record<string, unknown>): void => {
  try { if (window.gtag) window.gtag('event', event, params || {}); } catch { /* analytics blocked */ }
};

/**
 * Read the shareable plan out of the URL query (?s=start &st/&et=window &p=stop-idxs &v=view).
 * Per-stop stay durations are intentionally not encoded — they fall back to the defaults.
 */
export function parseSearch(): ParsedSearch {
  const q = new URLSearchParams(window.location.search);
  const s = q.get('s'), st = q.get('st'), et = q.get('et'), p = q.get('p'), v = q.get('v');
  const mealMap: Record<string, string> = { B: 'Breakfast', L: 'Lunch', S: 'Snack', D: 'Dinner' };
  return {
    itinerary: q.get('itinerary'),
    start: s != null && /^\d+$/.test(s) ? +s : null,
    startTime: /^\d{1,2}:\d{2}$/.test(st || '') ? st : null,
    endTime: /^\d{1,2}:\d{2}$/.test(et || '') ? et : null,
    // p = day groups separated by "~"; within a day, stops by "-"; each stop "idx" / "idx.stay" / "b<stay>" (break)
    stops: p ? p.split('~').flatMap((grp, di): ParsedStop[] => grp.split('-').map((seg): ParsedStop | null => {
      if (!seg) return null;
      if (/^b\d*$/.test(seg)) return { brk: true, stay: seg.length > 1 ? +seg.slice(1) : null, day: di + 1 };
      const mm = seg.match(/^m([BLSD])(\d*)$/);
      if (mm) return { meal: mealMap[mm[1]], stay: mm[2] ? +mm[2] : null, day: di + 1 };
      const [a, b] = seg.split('.');
      const idx = +a;
      return Number.isInteger(idx) && idx >= 0 ? { idx, stay: b != null && /^\d+$/.test(b) ? +b : null, day: di + 1 } : null;
    }).filter((x): x is ParsedStop => x != null)) : [],
    view: v === 'places' || v === 'day' ? v : null,
  };
}
