import { describe, it, expect, afterEach } from 'vitest';
import {
  esc, placeDur, idealStay, isPseudo, stopDur,
  fmtDur, parseTime, fmtClock, toHHMM, mapLink, mealTag, mealTagsForDay, track, parseSearch,
  weatherInfo, addDaysISO,
} from '../src/utils';
import { BREAK_DUR, MEAL_DUR } from '../src/constants';
import type { Place, Category } from '../src/types';

/** Build a full Place from the minimal fields these pure-logic tests care about. */
const mk = (name: string, cat: Category, sub?: string): Place => ({ name, cat, sub, lat: 0, lng: 0 });

describe('time math', () => {
  it('parseTime: "HH:MM" → minutes since midnight', () => {
    expect(parseTime('00:00')).toBe(0);
    expect(parseTime('09:00')).toBe(540);
    expect(parseTime('22:45')).toBe(1365);
    expect(parseTime('23:00')).toBe(1380);
  });
  it('parseTime: tolerates junk → 0', () => {
    expect(parseTime('')).toBe(0);
    expect(parseTime('nope')).toBe(0);
  });
  it('fmtClock: minutes → 12-hour clock, wrapping and rounding', () => {
    expect(fmtClock(540)).toBe('9:00 AM');
    expect(fmtClock(0)).toBe('12:00 AM');
    expect(fmtClock(720)).toBe('12:00 PM');
    expect(fmtClock(1365)).toBe('10:45 PM');
    expect(fmtClock(1440)).toBe('12:00 AM');   // wraps past midnight
    expect(fmtClock(-60)).toBe('11:00 PM');    // negative wraps back
    expect(fmtClock(545.6)).toBe('9:06 AM');   // rounds to the minute
  });
  it('toHHMM: minutes → zero-padded "HH:MM"', () => {
    expect(toHHMM(540)).toBe('09:00');
    expect(toHHMM(75)).toBe('01:15');
    expect(toHHMM(1380)).toBe('23:00');
  });
  it('parseTime ∘ toHHMM round-trips', () => {
    for (const m of [0, 75, 540, 1005, 1380]) expect(parseTime(toHHMM(m))).toBe(m);
  });
  it('fmtDur: minutes → compact human duration', () => {
    expect(fmtDur(0)).toBe('0m');
    expect(fmtDur(45)).toBe('45m');
    expect(fmtDur(60)).toBe('1h');
    expect(fmtDur(95)).toBe('1h 35m');
    expect(fmtDur(120)).toBe('2h');
  });
});

describe('stop classification & durations', () => {
  const beach = mk('Some Beach', 'Beach');
  const overridden = mk('Paradise Beach', 'Beach');
  const spiritual = mk('A Temple', 'Attraction', 'spiritual');
  const cafe = mk('A Cafe', 'Food', 'cafe');

  it('placeDur: name override wins over category default', () => {
    expect(placeDur(beach)).toEqual([45, 75, 160]);       // DUR_CAT.Beach
    expect(placeDur(overridden)).toEqual([90, 120, 150]); // DUR_OVERRIDE
  });
  it('placeDur: falls back through sub-type then category', () => {
    expect(placeDur(spiritual)).toEqual([20, 30, 50]);    // DUR_SUB.spiritual
    expect(placeDur(cafe)).toEqual([30, 40, 70]);         // DUR_FOOD.cafe
    expect(placeDur(mk('X', 'Mystery' as Category))).toEqual([30, 45, 60]); // DUR_CAT fallback
  });
  it('idealStay: the middle of the duration triple', () => {
    expect(idealStay(beach)).toBe(75);
    expect(idealStay(overridden)).toBe(120);
  });
  it('isPseudo: true only for breaks and meals', () => {
    expect(isPseudo({ brk: true })).toBeTruthy();
    expect(isPseudo({ meal: 'Lunch' })).toBeTruthy();
    expect(isPseudo({ idx: 3 })).toBeFalsy();
  });
  it('stopDur: pseudo stops use the fixed break/meal triples', () => {
    const places = [beach, spiritual];
    expect(stopDur({ brk: true }, places)).toEqual(BREAK_DUR);
    expect(stopDur({ meal: 'Lunch' }, places)).toEqual(MEAL_DUR);
    expect(stopDur({ idx: 0 }, places)).toEqual([45, 75, 160]);
  });
});

describe('mealTag: timeline role from category + arrival', () => {
  it('tags Food by time of day', () => {
    expect(mealTag('Food', parseTime('09:00'))).toBe('Breakfast');
    expect(mealTag('Food', parseTime('13:00'))).toBe('Lunch');
    expect(mealTag('Food', parseTime('17:00'))).toBe('Snack');
    expect(mealTag('Food', parseTime('20:00'))).toBe('Dinner');
  });
  it('tags Social and Shopping; null for everything else', () => {
    expect(mealTag('Social', parseTime('17:00'))).toBe('Drinks');
    expect(mealTag('Social', parseTime('19:00'))).toBe('Dinner & drinks');
    expect(mealTag('Shopping', parseTime('15:00'))).toBe('Shopping');
    expect(mealTag('Beach', parseTime('15:00'))).toBeNull();
  });
});

describe('mealTagsForDay: sequence-aware meal tags', () => {
  const t = (h: number, m = 0) => h * 60 + m;
  it('bumps a second lunch-window food to Snack (the Daddy Amma momo case)', () => {
    expect(mealTagsForDay([
      { cat: 'Food', arrive: t(9, 30) },   // Breakfast
      { cat: 'Food', arrive: t(12, 30) },  // Lunch
      { cat: 'Food', arrive: t(14, 30) },  // lunch window, but lunch is taken → Snack
      { cat: 'Food', arrive: t(20) },      // Dinner
    ])).toEqual(['Breakfast', 'Lunch', 'Snack', 'Dinner']);
  });
  it('leaves a single food per slot unchanged', () => {
    expect(mealTagsForDay([
      { cat: 'Food', arrive: t(9) }, { cat: 'Food', arrive: t(13) }, { cat: 'Food', arrive: t(20) },
    ])).toEqual(['Breakfast', 'Lunch', 'Dinner']);
  });
  it('three lunch-window foods cascade Lunch → Snack → Dinner', () => {
    expect(mealTagsForDay([
      { cat: 'Food', arrive: t(12) }, { cat: 'Food', arrive: t(13) }, { cat: 'Food', arrive: t(14) },
    ])).toEqual(['Lunch', 'Snack', 'Dinner']);
  });
  it('non-food stops keep their time-based tag and consume no meal slot', () => {
    expect(mealTagsForDay([
      { cat: 'Food', arrive: t(13) },      // Lunch
      { cat: 'Shopping', arrive: t(15) },  // Shopping
      { cat: 'Social', arrive: t(19) },    // Dinner & drinks
      { cat: 'Food', arrive: t(20) },      // still free → Dinner
    ])).toEqual(['Lunch', 'Shopping', 'Dinner & drinks', 'Dinner']);
  });
});

describe('weatherInfo: WMO code → label + emoji', () => {
  it('buckets the common codes', () => {
    expect(weatherInfo(0).label).toBe('Clear sky');
    expect(weatherInfo(2).label).toBe('Partly cloudy');
    expect(weatherInfo(3).label).toBe('Overcast');
    expect(weatherInfo(61).label).toBe('Rain');
    expect(weatherInfo(80).label).toBe('Rain showers');
    expect(weatherInfo(95).label).toBe('Thunderstorm');
  });
  it('always returns a non-empty emoji', () => {
    for (const c of [0, 2, 45, 51, 65, 80, 95, 999]) expect(weatherInfo(c).emoji.length).toBeGreaterThan(0);
  });
});

describe('addDaysISO: calendar date math', () => {
  it('adds days within a month', () => { expect(addDaysISO('2026-06-26', 15)).toBe('2026-07-11'); });
  it('+0 is identity', () => { expect(addDaysISO('2026-06-26', 0)).toBe('2026-06-26'); });
  it('rolls over a year boundary', () => { expect(addDaysISO('2026-12-30', 5)).toBe('2027-01-04'); });
});

describe('misc helpers', () => {
  it('esc: escapes HTML-significant characters', () => {
    expect(esc(`<a href="x">&'`)).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
    expect(esc(null)).toBe('');
  });
  it('mapLink: explicit map URL wins, else a name search', () => {
    expect(mapLink({ name: '', map: 'https://maps.example/x' })).toBe('https://maps.example/x');
    const link = mapLink({ name: 'Paradise Beach' });
    expect(link).toContain('google.com/maps/search');
    expect(link).toContain(encodeURIComponent('Paradise Beach, Pondicherry'));
  });
  it('track: never throws even when gtag/window is absent', () => {
    expect(() => track('unit_test', { a: 1 })).not.toThrow();
  });
});

describe('parseSearch: shareable-URL decoding', () => {
  const prev = globalThis.window;
  afterEach(() => { (globalThis as any).window = prev; });
  const parse = (search: string) => { (globalThis as any).window = { location: { search } }; return parseSearch(); };

  it('empty query → empty plan', () => {
    expect(parse('')).toEqual({ itinerary: null, start: null, startTime: null, endTime: null, stops: [], view: null, date: null });
  });
  it('decodes a valid trip date and rejects junk', () => {
    expect(parse('?d=2026-06-28').date).toBe('2026-06-28');
    expect(parse('?d=June').date).toBeNull();
    expect(parse('?d=2026-6-8').date).toBeNull();   // must be zero-padded YYYY-MM-DD
  });
  it('decodes start, window and view', () => {
    const r = parse('?s=3&st=10:00&et=20:30&v=places');
    expect(r).toMatchObject({ start: 3, startTime: '10:00', endTime: '20:30', view: 'places' });
  });
  it('rejects malformed start/time/view', () => {
    const r = parse('?s=x&st=bad&v=nope');
    expect(r.start).toBeNull();
    expect(r.startTime).toBeNull();
    expect(r.view).toBeNull();
  });
  it('decodes stops with idx, idx.stay and breaks', () => {
    expect(parse('?p=1-2.90-b30').stops).toEqual([
      { idx: 1, stay: null, day: 1 },
      { idx: 2, stay: 90, day: 1 },
      { brk: true, stay: 30, day: 1 },
    ]);
  });
  it('decodes meal tokens', () => {
    expect(parse('?p=mL45').stops).toEqual([{ meal: 'Lunch', stay: 45, day: 1 }]);
  });
  it('splits "~" into per-day groups', () => {
    expect(parse('?p=1-2~3').stops).toEqual([
      { idx: 1, stay: null, day: 1 },
      { idx: 2, stay: null, day: 1 },
      { idx: 3, stay: null, day: 2 },
    ]);
  });
  it('reads a curated itinerary id', () => {
    expect(parse('?itinerary=first-timer').itinerary).toBe('first-timer');
  });
});
