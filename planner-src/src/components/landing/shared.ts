// Shared data + helpers for the landing panels (Hero / Itineraries / Info / Stepper).
import { CURATED } from '../../curated';
import { cohortKey } from '../CohortIcon';
import type { Curated, ItineraryData } from '../../types';

export const COHORT_ORDER = [...new Set(CURATED.map(c => c.cohort))];
export const HERO_IMAGE = '/images/pondy-hero-faded.jpg';

// Curated scenic cover per cohort (real committed Pondicherry photos) — beaches & monuments
// read far better on the cards than each plan's first café (what placeImage returns).
export const COHORT_COVER: Record<string, string> = {
  family: '/images/itinerary-family-day-out.jpg',
  couples: '/images/itinerary-couples-getaway.jpg',
  bachelors: '/images/itinerary-bachelors-trip.jpg',
  solo: '/images/itinerary-solo-explorer.jpg',
};

// Punchy one-line blurb per cohort (mock style), replacing the longer plan tag on cards.
export const COHORT_BLURB: Record<string, string> = {
  family: 'Kid-friendly · Beach + lunch · Easy pace',
  couples: 'White Town cafés · Promenade · Sunset',
  bachelors: 'Surf · Beaches · Nightlife',
  solo: 'Heritage streets · Cafés · Auroville',
};

export function planFor(cohort: string, len: 1 | 2): Curated {
  const oneDay = CURATED.find(c => c.cohort === cohort && c.plan.length === 1);
  const twoDay = CURATED.find(c => c.cohort === cohort && c.plan.length === 2);
  return (len === 2 ? twoDay : oneDay) || oneDay || (twoDay as Curated);
}

export function placeImage(data: ItineraryData | null, c: Curated): string | null {
  if (!data) return null;
  const names = c.plan.flat().filter(n => n !== 'Break');
  const p = names.map(name => data.places.find(x => x.name === name)).find(x => x?.img);
  return p?.img || null;
}

export function coverFor(cohort: string, data: ItineraryData | null, c: Curated): string | null {
  return COHORT_COVER[cohortKey(cohort)] || placeImage(data, c);
}

export function blurbFor(cohort: string, c: Curated): string {
  return COHORT_BLURB[cohortKey(cohort)] || c.tag;
}
