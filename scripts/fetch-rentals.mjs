#!/usr/bin/env node
// Rental-finder for the planner's "Rentals" browse feature (bikes + cars).
//
// DISCOVERY-based (unlike the named hotel pool): runs a handful of Places API (New) Text
// Searches biased to Pondicherry, collects every rental business they surface, dedupes,
// filters to real rental shops, ranks by a review-weighted score, and keeps the top N per
// type. Writes the combined list to data/pondicherry-rentals.json and one photo each to
// images/rentals/. Live rating / reviews / phone / place-id come from Google; `dailyFrom`
// is a curated ₹/day estimate per query group (Google doesn't expose rental rates).
//
//   PLACES_API_KEY=xxx node scripts/fetch-rentals.mjs            # full run (re-discovers)
//   PLACES_API_KEY=xxx node scripts/fetch-rentals.mjs --force    # also re-download photos
//
// Needs a server-side Places-API-(New) key with billing (the rank tracker's key works) and
// `avifenc`. Run from the site root; eyeball the console (verify the matches), then commit
// data/pondicherry-rentals.json + images/rentals/.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Discovery queries — each surfaces up to ~20 live results, tagged with a vehicle type +
// a curated ₹/day. Add/remove queries to widen or narrow the net.
const QUERIES = [
  { type: 'bike', q: 'scooter rental Pondicherry', dailyFrom: 350 },
  { type: 'bike', q: 'two wheeler bike rental Pondicherry', dailyFrom: 350 },
  { type: 'bike', q: 'Royal Enfield motorcycle rental Pondicherry', dailyFrom: 800 },
  { type: 'car', q: 'self drive car rental Pondicherry', dailyFrom: 1800 },
  { type: 'car', q: 'car rental with driver Pondicherry', dailyFrom: 2500 },
  { type: 'car', q: 'tour taxi rental Pondicherry', dailyFrom: 2500 },
];
const PONDY = { latitude: 11.9416, longitude: 79.8083 };
const PER_TYPE = 12;          // keep this many best per type (UI shows ~10)
const MIN_REVIEWS = 5;
const RENTAL_RE = /rent|bike|scooter|scooty|moped|self.?drive|two.?wheeler|automobile|vehicle|enfield|activa|travels|taxi|car\b/i;
const DROP_TYPES = ['lodging', 'hotel', 'restaurant', 'cafe', 'bar', 'food', 'tourist_attraction', 'park'];

const KEY = process.env.PLACES_API_KEY;
if (!KEY) { console.error('✗ Set PLACES_API_KEY (a server-side Places-API-New key with billing). Aborting.'); process.exit(1); }
const FORCE = process.argv.includes('--force');

const OUT_JSON = 'data/pondicherry-rentals.json';
const IMG_DIR = 'images/rentals';
const MAXW = 800, Q = 60;
const tmp = tmpdir();
if (!existsSync(IMG_DIR)) mkdirSync(IMG_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);
const C = 30, M = 4.0;
const score = (r) => ((r.reviews || 0) * (r.rating || 0) + C * M) / ((r.reviews || 0) + C);

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.rating', 'places.userRatingCount', 'places.nationalPhoneNumber', 'places.googleMapsUri',
  'places.types', 'places.primaryType', 'places.photos.name', 'places.photos.authorAttributions',
].join(',');

// 1) Discover — collect every candidate across all queries, deduped by place id.
const found = new Map();
for (const Qy of QUERIES) {
  try {
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify({ textQuery: Qy.q, regionCode: 'IN', maxResultCount: 20, locationBias: { circle: { center: PONDY, radius: 9000 } } }),
    });
    if (!r.ok) { console.log(`  ✗ query "${Qy.q}": ${r.status}`); continue; }
    const places = (await r.json()).places || [];
    for (const p of places) {
      if (!p.id || found.has(p.id)) continue;
      found.set(p.id, { p, type: Qy.type, dailyFrom: Qy.dailyFrom });
    }
    console.log(`  · "${Qy.q}" → ${places.length} results`);
  } catch (e) { console.log(`  ✗ query "${Qy.q}": ${String(e.message).slice(0, 80)}`); }
  await sleep(200);
}

// 2) Filter to real rental businesses + rank by review-weighted score, top N per type.
const all = [...found.values()]
  .map(({ p, type, dailyFrom }) => ({
    name: p.displayName?.text || '', type, dailyFrom,
    rating: p.rating ?? null, reviews: p.userRatingCount ?? 0,
    placeId: p.id, address: p.formattedAddress || '', area: (p.formattedAddress || '').split(',').slice(0, 2).join(',').trim(),
    lat: p.location?.latitude ?? null, lng: p.location?.longitude ?? null,
    phone: p.nationalPhoneNumber || '', mapsUrl: p.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${p.id}`,
    types: p.types || [], primaryType: p.primaryType || '', photoName: p.photos?.[0]?.name || '',
    photoBy: p.photos?.[0]?.authorAttributions?.[0]?.displayName || '',
  }))
  .filter((r) => r.rating != null && r.reviews >= MIN_REVIEWS
    && RENTAL_RE.test(r.name)
    && !r.types.some((t) => DROP_TYPES.includes(t)));

const kept = [];
for (const type of ['bike', 'car']) {
  kept.push(...all.filter((r) => r.type === type).sort((a, b) => score(b) - score(a)).slice(0, PER_TYPE));
}

// 3) Photo each kept rental → AVIF.
let withPhoto = 0;
for (const r of kept) {
  const s = slug(r.name);
  const img = `/${IMG_DIR}/${s}.avif`;
  r.slug = s; r.img = '';
  if (r.photoName) {
    if (!FORCE && existsSync(`.${img}`)) { r.img = img; withPhoto++; }
    else {
      try {
        const media = await fetch(`https://places.googleapis.com/v1/${r.photoName}/media?maxWidthPx=${MAXW}`, { headers: { 'X-Goog-Api-Key': KEY } });
        if (media.ok) {
          const bin = join(tmp, `rental_${s}.bin`), jpg = join(tmp, `rental_${s}.jpg`);
          writeFileSync(bin, Buffer.from(await media.arrayBuffer()));
          execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', String(MAXW), bin, '--out', jpg], { stdio: 'ignore' });
          execFileSync('avifenc', ['-q', String(Q), '-s', '6', jpg, `.${img}`], { stdio: 'ignore' });
          r.img = img; withPhoto++;
        }
      } catch { /* keep without photo */ }
    }
  }
  await sleep(120);
}

// 4) Write the clean list (drop scratch fields).
const rentals = kept.map((r) => ({
  name: r.name, slug: r.slug, vtype: r.type, dailyFrom: r.dailyFrom, area: r.area,
  placeId: r.placeId, rating: r.rating, reviews: r.reviews, phone: r.phone,
  mapsUrl: r.mapsUrl, img: r.img, imgBy: r.photoBy,
}));
writeFileSync(OUT_JSON, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), rentals }, null, 2));

console.log(`\n──────── ${rentals.length} rentals (${rentals.filter((r) => r.vtype === 'bike').length} bike · ${rentals.filter((r) => r.vtype === 'car').length} car) · ${withPhoto} photos ────────`);
for (const type of ['bike', 'car']) {
  console.log(`\n${type.toUpperCase()}:`);
  rentals.filter((r) => r.vtype === type).forEach((r, i) => console.log(`  ${i + 1}. ⭐${r.rating}(${r.reviews}) · ~₹${r.dailyFrom}/day · ${r.name}${r.img ? ' 📷' : ''}${r.phone ? ' ☎' : ''}  — ${r.area}`));
}
console.log(`\n→ ${OUT_JSON}  ·  images → ${IMG_DIR}/   ·  eyeball the matches, then commit data/ + images/rentals/.`);
