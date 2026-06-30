#!/usr/bin/env node
// Hotel-finder for the planner's "Hotels" browse feature.
//
// Resolves a curated candidate pool (POOL below) to LIVE Google data via the Places API
// (New) Text Search — place id, current rating, review count, price level, coords, address —
// downloads one photo each as an AVIF under images/hotels/, and writes the combined list to
// data/pondicherry-hotels.json. The UI derives the three tiers from this one file:
//   Top rated = sort by rating · Under ₹6k = nightlyFrom<=6000 · Under ₹3k = nightlyFrom<=3000
//
// `nightlyFrom` is a curated approximate off-peak OTA rate (Google does NOT expose nightly
// hotel rates via the Places API) — edit it in POOL as rates change. Everything else is live.
//
//   PLACES_API_KEY=xxx node scripts/fetch-hotels.mjs            # incremental (skips resolved)
//   PLACES_API_KEY=xxx node scripts/fetch-hotels.mjs --force    # re-resolve everything
//   PLACES_API_KEY=xxx node scripts/fetch-hotels.mjs --limit 3  # smoke test the first 3
//
// Needs a server-side Places-API-(New) key with billing (the rank tracker's key works — an
// HTTP-referrer-restricted browser key will be rejected from Node) and `avifenc`. Run from
// the site root; eyeball console output (verify each match), then commit images/hotels/ + data/.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// ───────────────────────── candidate pool (edit freely) ─────────────────────────
// cohorts: family | couples | bachelors | solo | jipmer (a stay may sit in several).
// nightlyFrom: approximate off-peak ₹ "from" rate — drives the ₹6k / ₹3k tiers only.
const POOL = [
  // Family
  { name: 'Le Pondy', q: 'Le Pondy resort Pondicherry', cohorts: ['family'], area: 'ECR / Chunnambar', nightlyFrom: 7000 },
  { name: 'Accord Puducherry', q: 'Accord Puducherry hotel', cohorts: ['family'], area: 'Anna Salai (central)', nightlyFrom: 6500 },
  { name: 'Le Royal Park Puducherry', q: 'Le Royal Park Puducherry hotel', cohorts: ['family'], area: 'Central / French Quarter', nightlyFrom: 5500 },
  { name: 'The Promenade', q: 'The Promenade hotel Pondicherry Beach Road', cohorts: ['family', 'couples'], area: 'Beach Road, White Town', nightlyFrom: 5600 },
  { name: 'The Dune Eco Village & Spa', q: 'The Dune Eco Village and Spa Pondicherry', cohorts: ['family'], area: 'Pudukuppam, ECR', nightlyFrom: 6000 },
  { name: 'Ginger Pondicherry', q: 'Ginger Pondicherry hotel', cohorts: ['family'], area: 'Central', nightlyFrom: 3500 },
  { name: 'Kailash Beach Resort', q: 'Kailash Beach Resort Pondicherry', cohorts: ['family'], area: 'ECR / Periamudaliarchavady', nightlyFrom: 4500 },
  { name: 'Sunway Manor', q: 'Sunway Manor hotel Pondicherry', cohorts: ['family'], area: 'Anna Salai (central)', nightlyFrom: 3000 },
  { name: 'Sea Side Guest House', q: 'Sea Side Guest House Goubert Avenue Pondicherry', cohorts: ['family', 'couples'], area: 'Goubert Ave (Beach Rd), White Town', nightlyFrom: 2500 },
  { name: 'Ajantha Guest House', q: 'Ajantha Sea View Guest House Pondicherry', cohorts: ['family'], area: 'Central / near Promenade', nightlyFrom: 1700 },
  // Couples
  { name: 'Le Dupleix', q: 'Le Dupleix Pondicherry hotel', cohorts: ['couples'], area: 'White Town', nightlyFrom: 9000 },
  { name: 'Villa Shanti', q: 'Villa Shanti Pondicherry', cohorts: ['couples'], area: 'White Town', nightlyFrom: 10000 },
  { name: 'Maison Perumal', q: 'Maison Perumal Pondicherry CGH Earth', cohorts: ['couples'], area: 'Tamil Quarter', nightlyFrom: 7500 },
  { name: 'Palais de Mahe', q: 'Palais de Mahe Pondicherry', cohorts: ['couples'], area: 'White Town', nightlyFrom: 9000 },
  { name: 'Les Hibiscus', q: 'Les Hibiscus Pondicherry guest house', cohorts: ['couples'], area: 'French Quarter', nightlyFrom: 2800 },
  { name: 'Gratitude Heritage', q: 'Gratitude Heritage Pondicherry', cohorts: ['couples'], area: 'French Quarter', nightlyFrom: 4500 },
  { name: 'Villa Helios', q: 'Villa Helios Pondicherry Auroville', cohorts: ['couples'], area: 'Auroville / Edayanchavadi', nightlyFrom: 4862 },
  { name: 'Coloniale Heritage Guest House', q: 'Coloniale Heritage Guest House Pondicherry', cohorts: ['couples'], area: 'Pondicherry Bazaar (central)', nightlyFrom: 2300 },
  { name: 'Hotel Karai', q: 'Hotel Karai Pondicherry', cohorts: ['couples'], area: 'Central / heritage quarter', nightlyFrom: 2000 },
  { name: 'Treebo Trend B Coral', q: 'Treebo Trend B Coral Pondicherry', cohorts: ['couples'], area: 'Central', nightlyFrom: 1800 },
  // Bachelors / Solo (social hostels — mostly shared)
  { name: 'Ostel', q: 'Ostel hostel Pondicherry Auroville Beach', cohorts: ['bachelors', 'solo'], area: 'Auroville Beach', nightlyFrom: 999 },
  { name: 'Zostel Pondicherry', q: 'Zostel Pondicherry', cohorts: ['bachelors', 'solo'], area: 'Auroville Road', nightlyFrom: 824 },
  { name: 'Nomad House', q: 'Nomad House hostel Pondicherry', cohorts: ['bachelors', 'solo'], area: 'Central / near Bus Terminal', nightlyFrom: 300 },
  { name: 'Unpack Hostel', q: 'Unpack Hostel Pondicherry', cohorts: ['bachelors', 'solo'], area: 'Muthialpet', nightlyFrom: 599 },
  { name: 'Micasa Hostel', q: 'Micasa Hostel Pondicherry', cohorts: ['bachelors', 'solo'], area: 'Central', nightlyFrom: 589 },
  { name: 'The Last Stop Backpackers Hostel', q: 'The Last Stop Backpackers Hostel Pondicherry', cohorts: ['bachelors'], area: 'Auroville Beach', nightlyFrom: 700 },
  { name: 'Bay Stays', q: 'Bay Stays hostel Pondicherry White Town', cohorts: ['bachelors'], area: 'White Town', nightlyFrom: 900 },
  { name: 'Funk Monk Hostel', q: 'Funk Monk Hostel Pondicherry Auroville', cohorts: ['solo'], area: 'Auroville (Kottakarai)', nightlyFrom: 800 },
  { name: 'ENESS Hostel', q: 'ENESS Hostel Pondicherry White Town', cohorts: ['solo'], area: 'White Town', nightlyFrom: 700 },
  // JIPMER (Nivaa featured first)
  { name: 'Nivaa Stays', q: 'Nivaa Stays Pondicherry', cohorts: ['jipmer'], area: 'Gorimedu / Dhanvantri Nagar', nightlyFrom: 2500, featured: true },
  { name: 'Ashwini Residency', q: 'Ashwini Residency Pondicherry JIPMER', cohorts: ['jipmer'], area: 'Gorimedu (JIPMER check-post)', nightlyFrom: 1500 },
  { name: 'Rani Residency', q: 'Rani Residency Pondicherry JIPMER', cohorts: ['jipmer'], area: 'Pattanur (JIPMER service rd)', nightlyFrom: 1578 },
  { name: 'Harkesh Residency', q: 'Harkesh Residency Pondicherry JIPMER Gorimedu', cohorts: ['jipmer'], area: 'Gorimedu', nightlyFrom: 1295 },
  { name: 'Le Royal Villa', q: 'Le Royal Villa Pondicherry Gorimedu', cohorts: ['jipmer'], area: 'Kamaraj Nagar, Gorimedu', nightlyFrom: 1010 },
];
// ─────────────────────────────────────────────────────────────────────────────────

const KEY = process.env.PLACES_API_KEY;
if (!KEY) { console.error('✗ Set PLACES_API_KEY (a server-side Places-API-New key with billing). Aborting.'); process.exit(1); }
const FORCE = process.argv.includes('--force');
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); return i > -1 ? Number(process.argv[i + 1]) : Infinity; })();

const OUT_JSON = 'data/pondicherry-hotels.json';
const IMG_DIR = 'images/hotels';
const MAXW = 800;
const Q = 60;
const tmp = tmpdir();
if (!existsSync(IMG_DIR)) mkdirSync(IMG_DIR, { recursive: true });

// keep any already-resolved records so re-runs are incremental
const prev = existsSync(OUT_JSON) ? JSON.parse(readFileSync(OUT_JSON, 'utf8')) : { hotels: [] };
const prevByName = new Map((prev.hotels || []).map((h) => [h.name, h]));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.rating', 'places.userRatingCount', 'places.priceLevel', 'places.googleMapsUri',
  'places.photos.name', 'places.photos.authorAttributions',
].join(',');

const out = [];
let resolved = 0, skipped = 0, noPhoto = 0, failed = 0;
const misses = [];
const targets = POOL.slice(0, LIMIT === Infinity ? POOL.length : LIMIT);
console.log(`Resolving ${targets.length} of ${POOL.length} candidate stays via Places API (New)…\n`);

for (const c of targets) {
  const s = slug(c.name);
  const img = `/${IMG_DIR}/${s}.avif`;
  const have = prevByName.get(c.name);
  if (!FORCE && have && have.placeId && existsSync(`.${img}`)) { out.push(have); skipped++; console.log(`  ·  ${c.name}: kept (already resolved)`); continue; }

  try {
    // 1) Text Search (New) → best match + live atmosphere data.
    const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify({ textQuery: c.q, regionCode: 'IN', maxResultCount: 1 }),
    });
    if (!r.ok) throw new Error(`search ${r.status} ${(await r.text()).slice(0, 140)}`);
    const place = (await r.json()).places?.[0];
    if (!place?.id) { failed++; misses.push(`${c.name} (no match)`); console.log(`  ✗  ${c.name}: no Places match for "${c.q}"`); await sleep(150); continue; }

    // 2) Photo → AVIF (best-effort).
    let imgPath = '', imgBy = '';
    const photo = place.photos?.[0];
    if (photo?.name) {
      try {
        const media = await fetch(`https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${MAXW}`, { headers: { 'X-Goog-Api-Key': KEY } });
        if (media.ok) {
          const bin = join(tmp, `hotel_${s}.bin`), jpg = join(tmp, `hotel_${s}.jpg`);
          writeFileSync(bin, Buffer.from(await media.arrayBuffer()));
          execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', String(MAXW), bin, '--out', jpg], { stdio: 'ignore' });
          execFileSync('avifenc', ['-q', String(Q), '-s', '6', jpg, `.${img}`], { stdio: 'ignore' });
          imgPath = img;
          imgBy = photo.authorAttributions?.[0]?.displayName || '';
        }
      } catch { /* keep going without a photo */ }
    }
    if (!imgPath) noPhoto++;

    out.push({
      name: c.name,
      slug: s,
      cohorts: c.cohorts,
      featured: !!c.featured,
      nightlyFrom: c.nightlyFrom,          // curated approx (not from Google)
      area: c.area,
      placeId: place.id,
      matchedName: place.displayName?.text || '',
      rating: place.rating ?? null,         // LIVE
      reviews: place.userRatingCount ?? null, // LIVE
      priceLevel: place.priceLevel || '',   // LIVE coarse band
      address: place.formattedAddress || '',
      lat: place.location?.latitude ?? null,
      lng: place.location?.longitude ?? null,
      mapsUrl: place.googleMapsUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
      img: imgPath,
      imgBy,
    });
    resolved++;
    const warn = place.displayName?.text && place.displayName.text.toLowerCase().slice(0, 6) !== c.name.toLowerCase().slice(0, 6) ? `  ⚠ matched "${place.displayName.text}" — VERIFY` : '';
    console.log(`  ✓  ${c.name}  →  ⭐${place.rating ?? '?'} (${place.userRatingCount ?? '?'})  ${place.priceLevel || ''}${imgPath ? '  +photo' : '  (no photo)'}${warn}`);
  } catch (e) {
    failed++;
    misses.push(`${c.name} (${String(e.message).slice(0, 60)})`);
    console.log(`  ✗  ${c.name}: ${String(e.message).slice(0, 90)}`);
  }
  await sleep(200);
}

writeFileSync(OUT_JSON, JSON.stringify({ generated: new Date().toISOString().slice(0, 10), cap6k: 6000, cap3k: 3000, hotels: out }, null, 2));

console.log(`\n──────── summary ────────`);
console.log(`resolved : ${resolved}`);
console.log(`kept     : ${skipped}`);
console.log(`no photo : ${noPhoto}`);
console.log(`failed   : ${failed}`);
console.log(`total    : ${out.length} hotels → ${OUT_JSON}`);
if (misses.length) console.log(`\nmisses / to fix:\n  - ${misses.join('\n  - ')}`);
console.log(`\nimages → ${IMG_DIR}/   ·   eyeball the ⚠ matches, then commit data/ + images/hotels/.`);
