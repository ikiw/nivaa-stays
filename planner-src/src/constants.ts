// Static configuration for the planner: category metadata, colours, the car SVG, and
// per-place visit-duration tables. Pure data — no React, no state. Imported by the
// utils, the components and App.
import BeachAccessRounded from '@mui/icons-material/BeachAccessRounded';
import AccountBalanceRounded from '@mui/icons-material/AccountBalanceRounded';
import RestaurantRounded from '@mui/icons-material/RestaurantRounded';
import LocalBarRounded from '@mui/icons-material/LocalBarRounded';
import ShoppingBagRounded from '@mui/icons-material/ShoppingBagRounded';
import FlagRounded from '@mui/icons-material/FlagRounded';
import type { SvgIconComponent } from '@mui/icons-material';
import type { Category, DurTriple } from './types';
import { ACTIVE } from './theme/tokens';

/** Where the baked itinerary catalog is fetched from. */
export const DATA_URL = '/data/pondicherry-itinerary.json';

/** Category → MUI icon component (markers, picker, place cards). */
export const CAT_ICON: Record<Category, SvgIconComponent> = { Beach: BeachAccessRounded, Attraction: AccountBalanceRounded, Food: RestaurantRounded, Social: LocalBarRounded, Shopping: ShoppingBagRounded, Stay: FlagRounded, Area: FlagRounded };
/** Identity colours — all sourced from the active theme (theme/tokens.ts). */
export const CAT_HEX: Record<Category, string> = ACTIVE.cat;
export const ROUTE_HEX = ACTIVE.route;        // single route line + timeline rail
export const START_HEX = ACTIVE.start;        // the "S" start marker
export const PIN_BG = ACTIVE.pinBg;           // map pin chip background
export const PIN_BG_ACTIVE = ACTIVE.pinBgActive;
export const PIN_INK = ACTIVE.pinInk;         // map pin name text
export const NODE_BG = ACTIVE.interactive;    // single colour for itinerary stop numbers (was per-category)
export const NODE_INK = ACTIVE.interactiveInk;
/** Top-down car (points north at 0°); rotated to the travel heading as it runs the route. */
export const CAR_SVG = '<svg width="22" height="22" viewBox="0 0 22 22" style="display:block;filter:drop-shadow(0 1px 2px rgba(0,0,0,.55))"><rect x="6" y="2.5" width="10" height="17" rx="3.6" fill="#FBBF24" stroke="#1A1300" stroke-width="1.2"/><rect x="7.6" y="4.2" width="6.8" height="3.4" rx="1.3" fill="#0B1020" opacity="0.82"/><rect x="7.6" y="13.8" width="6.8" height="3" rx="1.3" fill="#0B1020" opacity="0.6"/></svg>';
/** Category → plural label used as the picker section headings. */
export const CAT_LABEL: Partial<Record<Category, string>> = { Beach: 'Beaches', Attraction: 'Things to See', Food: 'Food & Drink', Social: 'Bars & Nightlife', Shopping: 'Shopping' };
/** Order the picker shows its category sections in. */
export const PICK_ORDER: Category[] = ['Beach', 'Attraction', 'Food', 'Social', 'Shopping'];
/** Per-category ordering of sub-types within a section. */
export const SUB_ORDER: Record<string, string[]> = {
  Attraction: ['heritage', 'nature', 'spiritual', 'adventure'],
  Food: ['south-indian', 'north-indian', 'multicuisine', 'continental', 'asian', 'cafe', 'dessert', 'fine'],
};
/** Sub-type → human label. */
export const SUB_LABEL: Record<string, string> = {
  heritage: 'Heritage & Museums', nature: 'Nature & Outdoors', spiritual: 'Spiritual', adventure: 'Adventure & Diving',
  'south-indian': 'South Indian', 'north-indian': 'North Indian', multicuisine: 'Multi-cuisine',
  continental: 'Continental', asian: 'Asian', cafe: 'Cafés & Bakeries', dessert: 'Desserts & Ice Cream', fine: 'Fine Dining',
};

// Realistic per-place visit durations [min, ideal, max] in minutes — sub-category
// defaults with name overrides for places that differ from their type. Drives the
// default stay AND how curated days are spread (flexible places absorb the slack).
/** Attraction sub-type → [min, ideal, max] minutes. */
export const DUR_SUB: Record<string, DurTriple> = { spiritual: [20, 30, 50], nature: [60, 90, 180], heritage: [30, 45, 90], adventure: [150, 180, 300] };
/** Food sub-type → [min, ideal, max] minutes. */
export const DUR_FOOD: Record<string, DurTriple> = { 'south-indian': [30, 45, 75], 'north-indian': [30, 45, 75], multicuisine: [35, 50, 90], cafe: [30, 40, 70], continental: [40, 60, 100], fine: [60, 90, 150], dessert: [15, 25, 45], asian: [30, 40, 70] };
/** Category (non Food/Attraction) → [min, ideal, max] minutes. */
export const DUR_CAT: Partial<Record<Category, DurTriple>> = { Beach: [45, 75, 160], Social: [60, 105, 210], Shopping: [30, 50, 100], Stay: [0, 0, 0], Area: [0, 0, 0] };
/** Specific places that differ from their type's default duration. */
export const DUR_OVERRIDE: Record<string, DurTriple> = {
  'Chunnambar Boat House': [75, 110, 150], 'Paradise Beach': [90, 120, 150], 'Matrimandir (Auroville)': [60, 90, 170],
  'Botanical Garden': [45, 60, 120], 'Puducherry Museum': [45, 60, 100], 'Promenade Beach': [45, 75, 140],
  'Bharathi Park (White Town)': [25, 40, 70], 'Serenity Beach': [45, 80, 150], 'Eden Beach': [40, 60, 120],
};
/** A "Free time" filler: highly flexible so it soaks up the day's slack. */
export const BREAK_DUR: DurTriple = [30, 60, 240];
/** A meal stop without a fixed place ("Lunch nearby"). */
export const MEAL_DUR: DurTriple = [40, 55, 80];
/** Meal tokens usable in a curated plan. */
export const MEAL_LABELS: string[] = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];
/** Timeline role tag → colour. */
export const TAG_COLOR: Record<string, string> = { Breakfast: '#F59E0B', Lunch: '#FB923C', Snack: '#FBBF24', Dinner: '#F472B6', 'Dinner & drinks': '#F472B6', Drinks: '#A78BFA', Shopping: '#A78BFA' };
/** Stay-duration options (minutes) offered per stop. */
export const STAY_OPTIONS: number[] = [15, 30, 45, 60, 75, 90, 105, 120, 150, 180, 210, 240];
/** Colour per trip day — from the active theme. */
export const DAY_COLORS: string[] = ACTIVE.day;
