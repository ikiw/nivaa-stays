// Authored content: the ready-made starter itineraries and the FAQ shown in the
// About panel. Pure data.
import type { Curated, Faq } from './types';

/**
 * Curated starter itineraries — authored by us, by place name (resolved to catalog
 * indices at load time so they survive catalog reordering). Shown when "Your day" is empty.
 * Full 9am–10pm day-outs, breakfast → lunch → dinner woven through (meals ordered by time of day).
 * `plan` is an array of days; each day is an ordered list of place names. 1-day plans
 * have one day, 2-day plans two. Each day is its own loop from the start (you return to base).
 * @type {{id:string, cohort:string, tag:string, start:string, why:string, plan:string[][]}[]}
 */
export const CURATED: Curated[] = [
  // orders are opening-hours-aware + grouped by area; see `why`. Re-authored against the expanded catalog.
  // ---------- 1-day ----------
  { id: "family-1d", cohort: "Family Day Out", tag: "Boat, beaches & market", start: "Pondicherry Bus Stand",
    why: "Start with a quick south-Indian breakfast, then drive south for the Chunnambar backwater boat to Paradise Beach. A real sit-down lunch at Jallikattu (opposite the boat house) fuels the crossing; kids snack on momos at Daddy Amma after the beach. Back in town for the evening: Manakula temple (reopens 4pm), Goubert Market, a sunset stroll on Promenade Beach, free time, then dinner at Copper Kitchen.",
    plan: [["Sri Murugan Cafe", "Chunnambar Boat House", "Jallikattu Restaurant", "Paradise Beach", "Daddy Amma Momo Shop", "Manakula Vinayagar Temple", "Goubert Market", "Promenade Beach", "Break", "Copper Kitchen"]] },
  { id: "couples-1d", cohort: "Couples Getaway", tag: "White Town & Serenity Beach", start: "Pondicherry Bus Stand",
    why: "A slow-romance White Town morning: a courtyard breakfast, the Ashram's calm, then the blush-pink Our Lady of Angels church and a leafy stroll through Bharathi Park. Heritage lunch at Maison Perumal, then scenic Serenity Beach to unwind. Back for a shared Zuka dessert, golden hour by the Old Lighthouse and Promenade Beach, and a rooftop dinner under the stars at Bay of Buddha.",
    plan: [["Cafe des Arts", "Sri Aurobindo Ashram", "Our Lady of Angels Church", "Bharathi Park (White Town)", "Maison Perumal Hotel & Restaurant", "Serenity Beach", "Zuka", "Old Lighthouse", "Promenade Beach", "Bay of Buddha"]] },
  { id: "bachelors-1d", cohort: "Bachelors' Trip", tag: "Surf beaches & nightlife", start: "Pondicherry Bus Stand",
    why: "Fuel up at Baker Street, then hit the north surf belt while you're fresh: a morning lesson at Kallialay Surf School on Serenity, beach time, a well-earned lunch at Terrassen, and a second dip at Auroville Beach. Roll back into White Town for shopping at Casablanca and sunset on Promenade, then close the night with craft beers at Catamaran Brewing Company.",
    plan: [["Baker Street", "Kallialay Surf School", "Serenity Beach", "Terrassen Cafe", "Auroville Beach", "Casablanca", "Promenade Beach", "Catamaran Brewing Company"]] },
  { id: "solo-1d", cohort: "Solo Explorer", tag: "Slow town culture", start: "Pondicherry Bus Stand",
    why: "A slow, walkable White Town arc for one. Coffee at Cafe des Arts, the hush of the Ashram, then two new gems: Aurodhan's contemporary art and the 1827 Romain Rolland Library. Lunch at Kasha Ki Aasha, the pink Our Lady of Angels church, Aayi Mandapam's white monument, a promenade coffee at Le Café, golden-hour Promenade Beach, dinner at La Terrace.",
    plan: [["Cafe des Arts", "Sri Aurobindo Ashram", "Aurodhan Art Gallery", "Romain Rolland Library", "Kasha Ki Aasha", "Our Lady of Angels Church", "Aayi Mandapam", "Le Café", "Promenade Beach", "La Terrace"]] },
  // ---------- 2-day ----------
  { id: "family-2d", cohort: "Family Day Out", tag: "Town day + a boat-&-beach day", start: "Pondicherry Bus Stand",
    why: "Day 1 is a relaxed town loop the kids will love: tiffin breakfast, the basilica, lunch, then Botanical Garden and the free Jawahar Toy Museum, sunset on the Promenade, the lamp-lit Manakula temple (after its 4pm reopening), and a heritage-courtyard dinner at Le Dupleix. Day 2 heads south: backwater boat house, a proper sit-down lunch at Jallikattu opposite the jetty, the boat to Paradise (before the 2:30 last boat), Eden Beach, momos as a snack, then back to town for the promenade and dinner.",
    plan: [
      ["Sri Murugan Cafe", "Sacred Heart Basilica", "Hotel Atithi", "Botanical Garden", "Jawahar Toy Museum", "Promenade Beach", "Manakula Vinayagar Temple", "Le Dupleix"],
      ["Hot Breads", "Chunnambar Boat House", "Jallikattu Restaurant", "Paradise Beach", "Eden Beach", "Daddy Amma Momo Shop", "Promenade Beach", "Copper Kitchen"]
    ] },
  { id: "couples-2d", cohort: "Couples Getaway", tag: "White Town, then Auroville", start: "Pondicherry Bus Stand",
    why: "Day 1 is a slow White Town romance: the Ashram, a leafy Bharathi Park stroll, lunch at Maison Perumal, the pink Our Lady of Angels church and Sacred Heart Basilica, a shared Zuka dessert, a Promenade sunset, then a candlelit dinner in Le Dupleix's heritage courtyard. Day 2 loops Auroville: collect your Matrimandir pass at the Visitor Centre first, view the gold dome, shop the Boutique, lunch at The Groves, then the beach, bakery and a relaxed dinner at Terrassen.",
    plan: [
      ["Cafe des Arts", "Sri Aurobindo Ashram", "Bharathi Park (White Town)", "Maison Perumal Hotel & Restaurant", "Our Lady of Angels Church", "Sacred Heart Basilica", "Kalki", "Zuka", "Promenade Beach", "Le Dupleix"],
      ["Marc's Café", "Auroville Visitor Centre", "Matrimandir (Auroville)", "Boutique d'Auroville", "The Groves", "Auroville Beach", "Auroville Bakery", "Break", "Terrassen Cafe"]
    ] },
  { id: "bachelors-2d", cohort: "Bachelors' Trip", tag: "Surf day, then a boat day", start: "Pondicherry Bus Stand",
    why: "Day 1 is your north surf day: coffee at Baker Street, then a proper surf lesson at Kallialay (Serenity Beach), chill on the same sand, Auroville lunch and beaches, then promenade sunset and craft beer at Bike & Barrel. Day 2 heads south for the boat: a real sit-down lunch at Jallikattu right by the jetty, the boat to Paradise, Eden Beach, momos as a snack, then drinks at Cantos.",
    plan: [
      ["Baker Street", "Kallialay Surf School", "Serenity Beach", "Terrassen Cafe", "Auroville Beach", "Boutique d'Auroville", "Promenade Beach", "Break", "Bike & Barrel"],
      ["Hot Breads", "Chunnambar Boat House", "Jallikattu Restaurant", "Paradise Beach", "Eden Beach", "Daddy Amma Momo Shop", "Break", "Cantos Social House"]
    ] },
  { id: "solo-2d", cohort: "Solo Explorer", tag: "Town culture, then Auroville", start: "Pondicherry Bus Stand",
    why: "Day 1 is a slow town-culture arc: the Ashram before its midday close, the Bharathiyar memorial and Aurodhan's contemporary art, lunch at Kasha Ki Aasha, a Bharathi Park pause, a boutique browse and a Promenade sunset before dinner at La Terrace. Day 2 is one calm Auroville loop: collect the Matrimandir pass at the Visitor Centre, lunch at Conscious Cafe, then the gold dome, the reflective Savitri Bhavan, a boutique stop, Auroville Beach and an easy dinner at Terrassen.",
    plan: [
      ["Coromandel Café", "Sri Aurobindo Ashram", "Mahakavi Bharathiyar Memorial Centre", "Aurodhan Art Gallery", "Kasha Ki Aasha", "Bharathi Park (White Town)", "Kalki", "Promenade Beach", "La Terrace"],
      ["Auroville Bakery", "Auroville Visitor Centre", "Conscious Cafe", "Matrimandir (Auroville)", "Savitri Bhavan", "Boutique d'Auroville", "Auroville Beach", "Terrassen Cafe"]
    ] },
];

/** FAQ shown in the About panel (also strong SEO content). */
export const FAQ: Faq[] = [
  { q: 'How many days do you need in Pondicherry?', a: "One to two days covers the highlights. A single day fits White Town's French Quarter, the Promenade, the Sri Aurobindo Ashram and a beach; add a second day for Auroville and Matrimandir, or the Chunnambar backwater boat to Paradise Beach." },
  { q: 'What is a good one-day Pondicherry itinerary?', a: 'Spend the cool morning in White Town — the Ashram before its midday close, Bharathi Park and a heritage café — then lunch, an afternoon at Serenity or Paradise Beach, a Promenade sunset and dinner. The planner sequences the stops by opening hours and driving time.' },
  { q: 'Best Pondicherry itinerary for couples, families or solo travellers?', a: 'Couples enjoy a slow White-Town-and-beach day ending with a rooftop dinner; families do well with the Chunnambar boat, Paradise Beach and Goubert Market; solo travellers like a culture trail of the Ashram, galleries and the heritage library. The planner has a ready-made plan for each.' },
  { q: 'Is the Pondicherry itinerary planner free?', a: 'Yes. Pick your stops, set a start time, and get a routed day plan with driving times and a live map — free, with no sign-up.' },
];
