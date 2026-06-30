// ---------------------------------------------------------------------------
// Planner theme tokens — the single source of every identity colour.
// A theme is one PlannerTokens object; switch the whole look by changing ACTIVE
// (the picker saves a key to localStorage and reloads). Components read these via
// the derived exports in constants.ts / the MUI palette in main.tsx, so NO colour
// should be hard-coded in a component.
// ---------------------------------------------------------------------------
import type { Category } from '../types';

export interface PlannerTokens {
  name: string;
  mode: 'light' | 'dark';
  // surfaces + text
  bg: string;            // app background
  surface: string;       // cards / paper
  border: string;        // dividers / card borders
  textPrimary: string;
  textSecondary: string;
  // roles
  interactive: string;      // primary — tabs, slider, selected, links
  interactiveInk: string;   // ink on a filled interactive surface
  highlight: string;        // secondary — AI / "Plan my day" / today / hero accents
  highlightInk: string;
  pop: string;              // rare emphasis
  success: string;          // "fits" chip
  warning: string;          // "over by" chip
  // map + itinerary
  route: string;            // single route line + timeline rail (must read on a light map)
  start: string;            // the "S" start marker
  day: [string, string];    // Day 1 / Day 2
  pinBg: string;            // map pin chip background
  pinBgActive: string;
  pinInk: string;           // map pin name text (must read on pinBg)
  bgImage: string;          // hero / map-teaser background photo
  // data palettes
  cat: Record<Category, string>;       // place categories (wayfinding)
  cohort: Record<string, string>;      // ready-made trip cohorts
}

// ---- Heritage White: white-dominant, lime-washed plaster + teak woodwork, restrained. ----
export const heritageWhite: PlannerTokens = {
  name: 'Heritage White',
  mode: 'light',
  bg: '#F6F3EB',
  surface: '#FFFFFF',
  border: 'rgba(90,70,40,0.16)',
  textPrimary: '#2C2419',
  textSecondary: '#6E6149',
  interactive: '#9A5B25',       // teak
  interactiveInk: '#FFF4E6',
  highlight: '#D99A12',         // marigold CTA
  highlightInk: '#332300',
  pop: '#B23A4E',
  success: '#5E8C3E',
  warning: '#C2761A',
  route: '#8A5A2C',
  start: '#9A5B25',
  day: ['#9A5B25', '#5E7E8C'],
  pinBg: '#FFFFFF',
  pinBgActive: '#F3E6D2',
  pinInk: '#2C2419',
  bgImage: '/images/pondicherry-street.jpg',
  cat: { Stay: '#9A5B25', Area: '#9A5B25', Beach: '#5E7E8C', Attraction: '#4E8C5A', Food: '#C8901A', Social: '#A8506A', Shopping: '#7E5A86' },
  cohort: { family: '#C8901A', couples: '#A8506A', bachelors: '#7E5A86', solo: '#5E7E8C' },
};

// ---- Studio Dark: cool indigo + coral on near-black, modern editorial. Refined — deeper
// base with a clearer elevation step, and the 6-colour category rainbow harmonised into one
// softer, lower-saturation family so nothing screams against the indigo identity. ----
export const studioDark: PlannerTokens = {
  name: 'Studio Dark',
  mode: 'dark',
  bg: '#101218',                // deeper, richer near-black (was #121317)
  surface: '#191C24',           // clearer step up from bg = better elevation (was #1C1E25)
  border: 'rgba(255,255,255,0.09)',
  textPrimary: '#ECEEF2',
  textSecondary: '#A2AAB8',     // a touch brighter for readability (was #9AA3B2)
  interactive: '#5B8AC7',       // muted MUI-ish blue — subtler primary, sits back on the dark base (was #7C83FF / #7E87C7)
  interactiveInk: '#0C0E1A',
  highlight: '#FF7A66',         // coral — kept
  highlightInk: '#2A0A04',
  pop: '#34D399',               // emerald
  success: '#34D399',
  warning: '#F5B544',           // softened amber
  route: '#5180C4',
  start: '#5B8AC7',
  day: ['#5B8AC7', '#FF7A66'],
  pinBg: '#191C24',
  pinBgActive: '#262A35',
  pinInk: '#ECEEF2',
  bgImage: '/images/pondy-planner-bg.avif',
  // Harmonised category family: all ~equal saturation/brightness, cohesive (was a neon rainbow).
  cat: { Stay: '#5B8AC7', Area: '#5B8AC7', Beach: '#54C3DE', Attraction: '#A78BFA', Food: '#F2B45C', Social: '#F47A9A', Shopping: '#5FD0A6' },
  cohort: { family: '#F2B45C', couples: '#F47A9A', bachelors: '#A78BFA', solo: '#54C3DE' },
};

export const THEMES: Record<string, PlannerTokens> = { heritageWhite, studioDark };
export const DEFAULT_THEME = 'studioDark';      // dark by default; Heritage White via the toggle
const STORE_KEY = 'nivaa.planner.theme';

function activeKey(): string {
  try { const k = localStorage.getItem(STORE_KEY); if (k && THEMES[k]) return k; } catch { /* no storage */ }
  return DEFAULT_THEME;
}

// The live theme — resolved once per page load from the saved choice.
export const ACTIVE_KEY = activeKey();
export const ACTIVE: PlannerTokens = THEMES[ACTIVE_KEY];

/** Persist the chosen theme and reload so every colour (incl. the module-load map/route
 *  tokens) re-resolves cleanly. The plan is in the URL, so it survives. */
export function setTheme(key: string): void {
  try { localStorage.setItem(STORE_KEY, key); } catch { /* ignore */ }
  window.location.reload();
}
