import { describe, it, expect } from 'vitest';
import { scheduleStays, computeSchedule } from './scheduler';
import { stopDur } from './utils';

// ---- a tiny fake world: catalog + symmetric drive matrices -------------------
// 0 = start (Area, zero duration), 1 = Beach (flexible), 2 = Temple (rigid), 3 = Cafe.
const places = [
  { name: 'Bus Stand', cat: 'Area' },
  { name: 'A Beach', cat: 'Beach' },                              // DUR_CAT.Beach   [45,75,160]
  { name: 'A Temple', cat: 'Attraction', sub: 'spiritual' },     // DUR_SUB.spiritual [20,30,50]
  { name: 'A Cafe', cat: 'Food', sub: 'cafe' },                  // DUR_FOOD.cafe    [30,40,70]
];
const minutes = [
  [0, 10, 12, 8],
  [10, 0, 6, 5],
  [12, 6, 0, 4],
  [8, 5, 4, 0],
];
const km = [
  [0, 6, 7, 5],
  [6, 0, 4, 3],
  [7, 4, 0, 2],
  [5, 3, 2, 0],
];
const driveMin = (a, b) => (minutes[a]?.[b] ?? 0);
const driveKm = (a, b) => (km[a]?.[b] ?? 0);

const multipleOf5 = (n) => n % 5 === 0;

describe('scheduleStays', () => {
  it('empty plan → empty array', () => {
    expect(scheduleStays(0, [], places, driveMin)).toEqual([]);
  });

  it('one stay per item, every value a multiple of 5 within [min, max]', () => {
    const items = [{ idx: 1 }, { idx: 2 }, { idx: 3 }];
    const stays = scheduleStays(0, items, places, driveMin);
    expect(stays).toHaveLength(3);
    items.forEach((it, k) => {
      const [min, , max] = stopDur(it, places);
      expect(multipleOf5(stays[k])).toBe(true);
      expect(stays[k]).toBeGreaterThanOrEqual(min);
      expect(stays[k]).toBeLessThanOrEqual(max);
    });
  });

  it('fills a short day by stretching the FLEXIBLE place more than the rigid one', () => {
    // Beach (range 115) is far more flexible than the temple (range 30) → absorbs more slack.
    const items = [{ idx: 1 }, { idx: 2 }];
    const stays = scheduleStays(0, items, places, driveMin);
    const beachGain = stays[0] - 75;   // beach ideal 75
    const templeGain = stays[1] - 30;  // temple ideal 30
    expect(beachGain).toBeGreaterThan(templeGain);
  });

  it('shrinks toward the minimums when the day overflows', () => {
    // 6 adventure attractions (min 150, ideal 180) = 900 min of minimums alone, well past
    // the internal ~825-min day window → stays must compress below their ideal toward the min.
    const longPlaces = [{ name: 'base', cat: 'Area' }, { name: 'Dive', cat: 'Attraction', sub: 'adventure' }];
    const noDrive = () => 0;
    const items = Array.from({ length: 6 }, () => ({ idx: 1 }));
    const stays = scheduleStays(0, items, longPlaces, noDrive);
    stays.forEach((s) => {
      expect(s).toBeGreaterThanOrEqual(150); // never below the adventure minimum
      expect(s).toBeLessThanOrEqual(180);    // and pulled in from the 180 ideal
    });
  });

  it('schedules pseudo items (break/meal) using their fixed triples', () => {
    const stays = scheduleStays(0, [{ brk: true }, { meal: 'Lunch' }], places, driveMin);
    expect(stays).toHaveLength(2);
    expect(stays[0]).toBeGreaterThanOrEqual(30); // BREAK_DUR min
    expect(stays[1]).toBeGreaterThanOrEqual(40); // MEAL_DUR min
  });
});

describe('computeSchedule', () => {
  it('no stops → a single empty Day 1', () => {
    const r = computeSchedule([], 0, '09:00', driveMin, driveKm);
    expect(r.tripDays).toEqual([1]);
    expect(r.dayData).toHaveLength(1);
    expect(r.dayData[0].tl).toEqual([]);
    expect(r.tripDrive).toBe(0);
    expect(r.tripKm).toBe(0);
  });

  it('one real stop: out-and-back drive/distance and the running clock', () => {
    const r = computeSchedule([{ idx: 1, stay: 60, day: 1 }], 0, '09:00', driveMin, driveKm);
    const d = r.dayData[0];
    expect(d.tl).toHaveLength(1);
    expect(d.tl[0]).toMatchObject({ gi: 0, idx: 1, dm: 10, dk: 6, arrive: 550, depart: 610 });
    expect(d.rMin).toBe(10);                 // back to start
    expect(d.clock).toBe(620);               // 540 +10 +60 +10
    expect(r.tripDrive).toBe(20);            // 10 out + 10 back
    expect(r.tripKm).toBe(12);               // 6 + 6
  });

  it('real entries carry idx; pseudo entries carry brk/meal and NO idx (the guard contract)', () => {
    // This is exactly the shape the timeline + overview must handle without indexing
    // data.places[t.idx] for a break/meal — the bug that crashed "Add places".
    const stops = [
      { idx: 1, stay: 60, day: 1 },
      { meal: 'Lunch', stay: 45, day: 1 },
      { brk: true, stay: 30, day: 1 },
      { idx: 2, stay: 30, day: 1 },
    ];
    const tl = computeSchedule(stops, 0, '09:00', driveMin, driveKm).dayData[0].tl;
    expect(tl).toHaveLength(4);

    const meal = tl[1], brk = tl[2];
    expect(meal).toMatchObject({ gi: 1, meal: 'Lunch', dm: 0, dk: 0 });
    expect(meal.idx).toBeUndefined();
    expect(brk).toMatchObject({ gi: 2, brk: true, dm: 0, dk: 0 });
    expect(brk.idx).toBeUndefined();

    // pseudo stops add no travel and don't move "prev": leg into stop 2 is 1→2, not Lunch→2
    expect(tl[3]).toMatchObject({ idx: 2, dm: 6, dk: 4 });
  });

  it('gi is the index into the ORIGINAL stops array (so reorder/remove hit the right one)', () => {
    const stops = [
      { idx: 1, stay: 60, day: 1 },
      { idx: 2, stay: 30, day: 2 },  // different day
      { idx: 3, stay: 30, day: 1 },
    ];
    const r = computeSchedule(stops, 0, '09:00', driveMin, driveKm);
    expect(r.tripDays).toEqual([1, 2]);
    expect(r.dayData[0].tl.map((t) => t.gi)).toEqual([0, 2]); // day-1 stops keep global indices 0 and 2
    expect(r.dayData[1].tl.map((t) => t.gi)).toEqual([1]);
  });

  it('each day loops independently from the start', () => {
    const stops = [
      { idx: 1, stay: 60, day: 1 },
      { idx: 2, stay: 30, day: 2 },
    ];
    const r = computeSchedule(stops, 0, '09:00', driveMin, driveKm);
    // Day 2 starts from 0 again: 0→2 (12) out, 2→0 (12) back.
    expect(r.dayData[1].tl[0]).toMatchObject({ idx: 2, dm: 12 });
    expect(r.dayData[1].drive).toBe(24);
    expect(r.tripDrive).toBe(20 + 24);
  });

  it('totals sum the per-day drive and distance', () => {
    const stops = [
      { idx: 1, stay: 30, day: 1 },
      { idx: 2, stay: 30, day: 1 },
    ];
    const r = computeSchedule(stops, 0, '09:00', driveMin, driveKm);
    // 0→1 (10) + 1→2 (6) + 2→0 (12) = 28 min ; 6 + 4 + 7 = 17 km
    expect(r.tripDrive).toBe(28);
    expect(r.tripKm).toBe(17);
  });
});
