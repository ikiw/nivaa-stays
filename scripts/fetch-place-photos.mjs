#!/usr/bin/env node
// One-time (monthly) place-photo fetcher for the Pondicherry planner.
//
// We already store a Google `placeId` for ~104 of the 112 places. This script pulls ONE
// photo per place via the Places API (New) — Place Details for the photo reference, then
// Place Photo for the bytes — downsizes it to a small AVIF thumb under images/places/, and
// writes `img` (the served path) + `imgBy` (the contributor, for attribution) back into
// data/pondicherry-itinerary.json. The committed AVIFs are then served as static site
// assets (Cloudflare), so the planner makes ZERO Google calls at runtime.
//
//   PLACES_API_KEY=xxx node scripts/fetch-place-photos.mjs            # incremental (skips done)
//   PLACES_API_KEY=xxx node scripts/fetch-place-photos.mjs --force    # re-fetch everything
//   PLACES_API_KEY=xxx node scripts/fetch-place-photos.mjs --limit 5  # try the first 5
//
// Needs: a Places API (New)-enabled key with billing on, and `avifenc` (brew install libavif).
// Run from the site root. Eyeball the result on the local server, then commit images/ + data/.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const KEY = process.env.PLACES_API_KEY;
if (!KEY) {
  console.error('✗ Set PLACES_API_KEY (a Places-API-New key with billing). Aborting.');
  process.exit(1);
}
const FORCE = process.argv.includes('--force');
const LIMIT = (() => { const i = process.argv.indexOf('--limit'); return i > -1 ? Number(process.argv[i + 1]) : Infinity; })();

const DATA = 'data/pondicherry-itinerary.json';
const OUTDIR = 'images/places';
const MAXW = 640;          // photo pixel width fetched + thumbnail target
const Q = 60;              // avifenc quality (matches the site's image convention)
const tmp = tmpdir();

const raw = readFileSync(DATA, 'utf8');
const data = JSON.parse(raw);
if (!existsSync(OUTDIR)) mkdirSync(OUTDIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const usedSlugs = new Set();
function slugFor(name) {
  let s = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'place';
  let base = s, n = 2;
  while (usedSlugs.has(s)) s = `${base}-${n++}`;
  usedSlugs.add(s);
  return s;
}

// Reserve slugs already baked into the data so re-runs stay stable.
for (const p of data.places) if (p.img) usedSlugs.add(p.img.split('/').pop().replace(/\.avif$/, ''));

let done = 0, fetched = 0, noPhoto = 0, failed = 0, skipped = 0;
const misses = [];
const targets = data.places.filter((p) => p.placeId);
console.log(`${targets.length} places with a placeId (of ${data.places.length} total).\n`);

for (const p of targets) {
  if (done >= LIMIT) break;
  done++;
  const slug = p.img ? p.img.split('/').pop().replace(/\.avif$/, '') : slugFor(p.name);
  const out = join(OUTDIR, `${slug}.avif`);
  if (!FORCE && p.img && existsSync(out)) { skipped++; continue; }

  try {
    // 1) Place Details (New) → photo resource name + contributor.
    const det = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(p.placeId)}`, {
      headers: { 'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'photos' },
    });
    if (!det.ok) throw new Error(`details ${det.status} ${(await det.text()).slice(0, 120)}`);
    const photo = (await det.json()).photos?.[0];
    if (!photo?.name) { noPhoto++; misses.push(`${p.name} (no photo)`); console.log(`  –  ${p.name}: no photo`); await sleep(120); continue; }
    const by = photo.authorAttributions?.[0]?.displayName || '';

    // 2) Place Photo (New) → bytes (follows the 302 to the image).
    const media = await fetch(`https://places.googleapis.com/v1/${photo.name}/media?maxWidthPx=${MAXW}`, {
      headers: { 'X-Goog-Api-Key': KEY },
    });
    if (!media.ok) throw new Error(`media ${media.status}`);
    const inFile = join(tmp, `place_${slug}.bin`);
    const jpg = join(tmp, `place_${slug}.jpg`);
    writeFileSync(inFile, Buffer.from(await media.arrayBuffer()));

    // 3) Normalise → JPEG (sips) → AVIF (avifenc), same pipeline as the rest of the site.
    execFileSync('sips', ['-s', 'format', 'jpeg', '-Z', String(MAXW), inFile, '--out', jpg], { stdio: 'ignore' });
    execFileSync('avifenc', ['-q', String(Q), '-s', '6', jpg, out], { stdio: 'ignore' });

    p.img = `/${OUTDIR}/${slug}.avif`;
    p.imgBy = by;
    fetched++;
    console.log(`  ✓  ${p.name}  →  ${slug}.avif${by ? `  (© ${by})` : ''}`);
  } catch (e) {
    failed++;
    misses.push(`${p.name} (${String(e.message).slice(0, 60)})`);
    console.log(`  ✗  ${p.name}: ${String(e.message).slice(0, 80)}`);
  }
  await sleep(150);                       // be polite to the API
}

// Write the data back minified (matches the existing single-line format).
writeFileSync(DATA, JSON.stringify(data));

const withImg = data.places.filter((x) => x.img).length;
console.log(`\n──────── coverage ────────`);
console.log(`fetched now : ${fetched}`);
console.log(`skipped(had): ${skipped}`);
console.log(`no photo    : ${noPhoto}`);
console.log(`failed      : ${failed}`);
console.log(`total w/ img: ${withImg} / ${data.places.length}`);
if (misses.length) console.log(`\nmisses:\n  - ${misses.join('\n  - ')}`);
console.log(`\nimages → ${OUTDIR}/   ·   data updated → ${DATA}`);
console.log(`Next: eyeball on localhost, then commit images/places/ + the data file.`);
