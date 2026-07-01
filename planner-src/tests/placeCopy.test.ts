import { describe, expect, it } from 'vitest';
import { detailPlanTip, itineraryNote } from '../src/placeCopy';
import type { Place } from '../src/types';

const place = (cat: Place['cat'], sub?: string): Place => ({
  name: `${cat} stop`,
  cat,
  sub,
  desc: 'Fallback description',
  lat: 11.9,
  lng: 79.8,
});

describe('placeCopy', () => {
  it('writes itinerary notes in a local trip-planning voice', () => {
    expect(itineraryNote(place('Beach'))).toContain('sea breeze');
    expect(itineraryNote(place('Food'))).toContain('food pause');
    expect(itineraryNote(place('Attraction', 'spiritual'))).toContain('calm cultural stop');
  });

  it('writes drawer tips that are more action oriented', () => {
    expect(detailPlanTip(place('Shopping'))).toContain('after the main sights');
    expect(detailPlanTip(place('Social'))).toContain('evening stop');
  });
});
