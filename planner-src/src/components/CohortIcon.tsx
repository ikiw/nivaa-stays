// Bespoke per-cohort glyphs — hand-drawn line SVGs (intentionally NOT stock MUI
// icons) so each ready-made trip is distinct at a glance, plus the accent colour
// each cohort is themed with.
import type { ReactNode } from 'react';
import { ACTIVE } from '../theme/tokens';

export const COHORT_COLORS: Record<string, string> = ACTIVE.cohort;

export function cohortKey(cohort: string): string {
  const c = cohort.toLowerCase();
  return /famil/.test(c) ? 'family' : /couple/.test(c) ? 'couples' : /bachelor/.test(c) ? 'bachelors' : 'solo';
}

// adult + child figures · a heart · a martini · a compass
const GLYPH: Record<string, ReactNode> = {
  family: (<>
    <circle cx="8.5" cy="6" r="2.4" />
    <path d="M4 19v-3a4.5 4.5 0 0 1 9 0v3" />
    <circle cx="16.5" cy="8.6" r="1.8" />
    <path d="M13.6 19v-2a3 3 0 0 1 6 0v2" />
  </>),
  couples: (<path d="M12 20.3 4.7 13a4.5 4.5 0 1 1 6.4-6.3l.9.9.9-.9A4.5 4.5 0 1 1 19.3 13Z" />),
  bachelors: (<>
    <path d="M5.5 6h13l-6.5 7Z" />
    <path d="M12 13v5.5" />
    <path d="M8.5 18.5h7" />
    <path d="M14.6 6.4 17.2 4.1" />
    <circle cx="17.9" cy="3.4" r="1.05" />
  </>),
  solo: (<>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 7.6 13.8 12 12 16.4 10.2 12Z" />
    <circle cx="12" cy="12" r="0.85" />
  </>),
};

export default function CohortIcon({ cohort, size = 23 }: { cohort: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {GLYPH[cohortKey(cohort)]}
    </svg>
  );
}
