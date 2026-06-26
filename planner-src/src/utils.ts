// Pure helpers for the planner: HTML escaping, visit-duration lookups, time math,
// map links, the timeline role tagger, GA4 tracking and the shareable-URL parser.
// No React — safe to import anywhere.
import { DUR_OVERRIDE, DUR_FOOD, DUR_SUB, DUR_CAT, BREAK_DUR, MEAL_DUR } from './constants';
import type { Place, Stop, SchedItem, DurTriple, Pseudoable, ParsedSearch, ParsedStop, Weather, HourWeather, WeatherKind } from './types';

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

// ---- trip date + weather (Open-Meteo, free, no API key) ----

/** Local calendar date as "YYYY-MM-DD" (avoids toISOString()'s UTC day-shift). */
export const todayISO = (): string => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
/** Shift a "YYYY-MM-DD" date by n calendar days (handles month/year rollover). */
export const addDaysISO = (iso: string, n: number): string => { const [y, m, d] = iso.split('-').map(Number); const t = new Date(y, m - 1, d + n); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };

/** WMO weather code → a short label, an icon family and a colour (rendered by WeatherIcon). */
export function weatherInfo(code: number): { label: string; icon: WeatherKind; color: string } {
  if (code === 0) return { label: 'Clear sky', icon: 'sun', color: '#F6B73C' };
  if (code <= 2) return { label: 'Partly cloudy', icon: 'partly', color: '#E2C275' };
  if (code === 3) return { label: 'Overcast', icon: 'cloud', color: '#9AA7B4' };
  if (code <= 48) return { label: 'Fog', icon: 'fog', color: '#94A3B8' };
  if (code <= 57) return { label: 'Drizzle', icon: 'drizzle', color: '#7DD3FC' };
  if (code <= 67) return { label: 'Rain', icon: 'rain', color: '#60A5FA' };
  if (code <= 77) return { label: 'Snow', icon: 'snow', color: '#BAE6FD' };
  if (code <= 82) return { label: 'Rain showers', icon: 'showers', color: '#60A5FA' };
  if (code <= 86) return { label: 'Snow showers', icon: 'snow', color: '#BAE6FD' };
  if (code <= 99) return { label: 'Thunderstorm', icon: 'storm', color: '#A78BFA' };
  return { label: 'Weather', icon: 'cloud', color: '#9AA7B4' };
}

/** Pondicherry's daily forecast for `date` from Open-Meteo. Returns null on error or
 *  when the date is outside the model's range. No API key; safe to call from the browser. */
export async function fetchWeather(date: string, signal?: AbortSignal): Promise<Weather | null> {
  // Pondicherry centre (White Town); hardcoded — name-geocoding "Pondicherry" is ambiguous
  // (Open-Meteo's geocoder returns the airport, even a Cherry Mountain in New Hampshire).
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=11.934&longitude=79.83'
    + '&hourly=temperature_2m,weather_code,precipitation_probability'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset'
    + `&timezone=Asia%2FKolkata&start_date=${date}&end_date=${date}`;
  try {
    const r = await fetch(url, { signal });
    if (!r.ok) return null;
    const j = await r.json();
    const d = j?.daily, h = j?.hourly;
    if (!d || !d.time?.length || d.temperature_2m_max?.[0] == null) return null;
    return {
      date, code: d.weather_code[0],
      tMax: Math.round(d.temperature_2m_max[0]), tMin: Math.round(d.temperature_2m_min[0]),
      precip: d.precipitation_probability_max?.[0] ?? 0,
      sunrise: d.sunrise?.[0] ?? '', sunset: d.sunset?.[0] ?? '',
      hourly: h?.time?.length ? {
        temp: (h.temperature_2m as number[]).map((v) => Math.round(v)),
        code: h.weather_code as number[],
        precip: (h.precipitation_probability ?? []) as number[],
      } : undefined,
    };
  } catch { return null; }
}

/** Forecast at a stop's arrival time (minutes since midnight), from the day's hourly data.
 *  Returns null when there's no hourly data (e.g. the fetch only had the daily summary). */
export function weatherAtHour(w: Weather | null, minutes: number): HourWeather | null {
  if (!w?.hourly?.temp?.length) return null;
  const h = Math.min(w.hourly.temp.length - 1, Math.max(0, Math.floor(minutes / 60)));
  const temp = w.hourly.temp[h];
  if (temp == null) return null;
  return { code: w.hourly.code[h] ?? w.code, temp, precip: w.hourly.precip[h] ?? 0 };
}

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
  const s = q.get('s'), st = q.get('st'), et = q.get('et'), p = q.get('p'), v = q.get('v'), dt = q.get('d');
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
    date: /^\d{4}-\d{2}-\d{2}$/.test(dt || '') ? dt : null,
  };
}
