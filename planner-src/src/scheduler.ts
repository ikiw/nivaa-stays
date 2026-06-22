// The planner's day-layout maths — pure functions of the stops + the pre-computed
// driving matrix (passed in as driveMin/driveKm, so this stays React- and data-free
// and easy to reason about).
import { stopDur, isPseudo, parseTime } from './utils';
import type { Place, Stop, SchedItem, DriveFn, Schedule, TimelineEntry, DayData } from './types';

/**
 * Distribute realistic stay durations across one day's items, filling the day toward
 * ~10:45 PM by stretching ONLY the flexible places (beaches, boating, nightlife) up to
 * their max — so quick stops (temples, museums) stay short and long experiences soak up
 * the slack. If the day overflows, it shrinks stays toward their minimums instead.
 * @returns stay minutes per item (rounded to 5)
 */
export function scheduleStays(startIdx: number, items: SchedItem[], places: Place[], driveMin: DriveFn): number[] {
  const n = items.length; if (!n) return [];
  const D = items.map(it => stopDur(it, places));
  const stays = D.map(x => x[1]);
  // breaks add 0 drive and don't move you — carry the previous real place through them
  const driveAt = (k: number): number => {
    const item = items[k];
    if (isPseudo(item)) return 0;
    let prev = startIdx;
    for (let j = 0; j < k; j++) { const it = items[j]; if (!isPseudo(it)) prev = it.idx; }
    return driveMin(prev, item.idx);
  };
  let lastReal = startIdx;
  for (let j = n - 1; j >= 0; j--) { const it = items[j]; if (!isPseudo(it)) { lastReal = it.idx; break; } }
  let drive = driveMin(lastReal, startIdx);
  for (let k = 0; k < n; k++) drive += driveAt(k);
  const target = parseTime('22:45');
  const backBy = (): number => parseTime('09:00') + drive + stays.reduce((a, b) => a + b, 0);
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
}

/**
 * Lay out the day-by-day timeline from the current stops: each day loops from `start`,
 * accumulating drive time, distance and the running clock (arrive/depart per stop).
 */
export function computeSchedule(stops: Stop[], start: number, startTime: string, driveMin: DriveFn, driveKm: DriveFn): Schedule {
  const tripDays = stops.length ? [...new Set(stops.map(s => s.day || 1))].sort((a, b) => a - b) : [1];
  const dayData: DayData[] = tripDays.map(dn => {
    const tl: TimelineEntry[] = []; let clock = parseTime(startTime), drive = 0, km = 0, prev = start;
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
  return { tripDays, dayData, tripDrive, tripKm };
}
