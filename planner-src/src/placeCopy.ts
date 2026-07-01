import type { Place } from './types';

export function itineraryNote(place: Place): string {
  if (place.cat === 'Food') return 'A natural food pause so the day does not feel like back-to-back sightseeing.';
  if (place.cat === 'Beach') return 'Keep this one slower: walk, sit, and leave room for the sea breeze.';
  if (place.cat === 'Attraction' && place.sub === 'spiritual') return 'A calm cultural stop that works well between busier streets and beaches.';
  if (place.cat === 'Attraction') return 'A good anchor stop with enough buffer for photos, entry queues, or a slower family pace.';
  if (place.cat === 'Shopping') return 'Best near the end of the day, when browsing will not rush the route.';
  if (place.cat === 'Social') return 'Good evening energy if you want the plan to feel less checklist-like.';
  if (place.cat === 'Area' || place.cat === 'Stay') return 'Use this as the day anchor and tune nearby stops around it.';
  return place.desc || 'A useful stop to balance the route.';
}

export function detailPlanTip(place: Place): string {
  if (place.cat === 'Food') return 'Use this as a meal pause and keep the next stop close by.';
  if (place.cat === 'Beach') return 'Best with a little unplanned time. Do not compress it too tightly.';
  if (place.cat === 'Attraction' && place.sub === 'spiritual') return 'Plan a quieter pace here; it pairs well before lunch or late afternoon.';
  if (place.cat === 'Attraction') return 'Give this stop enough buffer for photos, tickets, and slower groups.';
  if (place.cat === 'Shopping') return 'Put this after the main sights so browsing does not break the day.';
  if (place.cat === 'Social') return 'Works well as an evening stop after the major sightseeing is done.';
  return 'Use this as an anchor and tune nearby stops around it.';
}
