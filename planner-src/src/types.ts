// Core data model for the Pondicherry planner. The live tool fetches a baked JSON
// catalog (data/pondicherry-itinerary.json) and works over these shapes. Keeping the
// contracts here (not in scattered JSDoc) is what makes the planner safely extensible.

/** Place categories present in the catalog. */
export type Category = 'Stay' | 'Area' | 'Beach' | 'Attraction' | 'Food' | 'Social' | 'Shopping';

/** One place in the catalog. */
export interface Place {
  name: string;
  cat: Category;
  sub?: string;
  desc?: string;
  map?: string;
  lat: number;
  lng: number;
  placeId?: string;
  rating?: number;
  reviews?: number;
  img?: string;                             // committed thumbnail path (/images/places/<slug>.avif)
  imgBy?: string;                           // photo contributor (Google attribution)
  book?: { url: string; label: string };   // optional booking / tickets / visit-info link
}

/** The baked catalog + driving matrices. `minutes[a][b]` / `km[a][b]` are indexed by
 *  catalog position; both are NxN where N = places.length. */
export interface ItineraryData {
  generated: string;
  origin: number;
  places: Place[];
  minutes: number[][];
  km: number[][];
}

/** Visit-duration triple — [min, ideal, max] in minutes. */
export type DurTriple = [number, number, number];

/** Drive lookup: minutes (or km) between two catalog indices. */
export type DriveFn = (a: number, b: number) => number;

// ---- Stops: a planned item is a real place, a free-time break, or a meal-of-choice.
// Modelled as a discriminated union so reading `.idx` is only legal once `brk`/`meal`
// have been ruled out (use isPseudo()). This is what catches "data.places[t.idx]" on a
// pseudo row at compile time.

/** A real place stop. */
export interface PlaceStop { idx: number; brk?: undefined; meal?: undefined; stay: number; day: number; }
/** A free-time break (no place). */
export interface BreakStop { idx?: undefined; brk: true; meal?: undefined; stay: number; day: number; }
/** A meal-of-your-choosing stop (no place). */
export interface MealStop { idx?: undefined; brk?: undefined; meal: string; stay: number; day: number; }
export type Stop = PlaceStop | BreakStop | MealStop;

// ---- Scheduler pre-stay items: same discriminants, but before stays are assigned.
export interface PlaceItem { idx: number; brk?: undefined; meal?: undefined; }
export interface BreakItem { idx?: undefined; brk: true; meal?: undefined; }
export interface MealItem { idx?: undefined; brk?: undefined; meal: string; }
export type SchedItem = PlaceItem | BreakItem | MealItem;

/** Anything carrying the pseudo discriminants — the common base of Stop/SchedItem. */
export type Pseudoable = { idx?: number; brk?: true; meal?: string };

/** One rendered timeline row (output of computeSchedule). A real row has `idx`; a
 *  pseudo row has `brk`/`meal` and no `idx`. */
export interface TimelineEntry {
  gi: number;
  idx?: number;
  brk?: true;
  meal?: string;
  dm: number;
  dk: number;
  arrive: number;
  depart: number;
  stay: number;
}

/** A single trip-day's computed timeline + totals. */
export interface DayData {
  day: number;
  tl: TimelineEntry[];
  drive: number;
  km: number;
  clock: number;
  rMin: number;
  rKm: number;
}

/** Full schedule across the trip's days. */
export interface Schedule {
  tripDays: number[];
  dayData: DayData[];
  tripDrive: number;
  tripKm: number;
}

/** A day's weather for the trip date (Open-Meteo). Temps are rounded °C. `hourly` holds
 *  24 values indexed by hour-of-day, used to tag each timeline stop at its arrival hour. */
export interface Weather {
  date: string;       // YYYY-MM-DD
  code: number;       // WMO weather code (daily)
  tMax: number;
  tMin: number;
  precip: number;     // max precipitation probability, %
  sunrise: string;    // ISO local, e.g. "2026-06-26T05:54"
  sunset: string;
  hourly?: { temp: number[]; code: number[]; precip: number[] };   // per hour-of-day (0–23)
}

/** Weather at one moment (a stop's arrival hour). */
export interface HourWeather { code: number; temp: number; precip: number; }

/** Condition icon family a WMO code maps to (→ a coloured MUI icon in WeatherIcon). */
export type WeatherKind = 'sun' | 'partly' | 'cloud' | 'fog' | 'drizzle' | 'rain' | 'showers' | 'snow' | 'storm';

/** A curated starter itinerary (curated.ts). `plan` is one array of place names per day. */
export interface Curated {
  id: string;
  cohort: string;
  tag: string;
  start: string;
  plan: string[][];
  why?: string;
}

/** One About-panel FAQ entry. */
export interface Faq {
  q: string;
  a: string;
}

/** One parsed stop from a shared URL (stays may be absent → null → default later). */
export interface ParsedStop { idx?: number; brk?: true; meal?: string; stay: number | null; day: number; }

/** Decoded shareable-plan URL state. */
export interface ParsedSearch {
  itinerary: string | null;
  start: number | null;
  startTime: string | null;
  endTime: string | null;
  stops: ParsedStop[];
  view: 'places' | 'day' | null;
  date: string | null;   // selected trip date (YYYY-MM-DD), for the weather forecast
}

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}
