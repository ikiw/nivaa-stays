// Inline Tailwind + core styles.css into landing pages' <head> so first paint needs
// zero render-blocking CSS round-trip (LCP). Idempotent: replaces the content between
// `<style id="inline-css">` and its closing `</style>`. Run AFTER build:css in the build.
//
// styles.css uses root-absolute url('/images/...') so the hero bg resolves correctly
// whether the sheet is loaded externally (from /css/) or inlined into a root HTML.

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const css =
  readFileSync(join(ROOT, 'css/tailwind.css'), 'utf8').trim() + '\n' +
  readFileSync(join(ROOT, 'css/styles.css'), 'utf8').trim();

const PAGES = [
  'index.html', '404.html', 'gallery.html', 'guides.html',
  'celebration-stay-pondicherry.html', 'full-house-stay-pondicherry.html',
  'work-from-home-pondicherry.html', 'pet-friendly-stay-pondicherry.html',
  'conference-stay-jipmer.html', 'marine-training-stay-jipmer.html',
  'patient-family-stay-jipmer.html', 'student-family-stay-jipmer.html',
  'guest-house-near-jipmer.html', 'hotels-near-jipmer.html',
  'hotel-with-bathtub-pondicherry.html', 'pondicherry-travel-guide.html',
  'stay-guide.html',
];
const START = '<style id="inline-css">';

for (const p of PAGES) {
  const file = join(ROOT, p);
  let html;
  try { html = readFileSync(file, 'utf8'); } catch { console.log('inline-css: missing', p); continue; }
  const s = html.indexOf(START);
  if (s < 0) { console.log('inline-css: no marker in', p); continue; }
  const cs = s + START.length;
  const e = html.indexOf('</style>', cs);
  if (e < 0) { console.log('inline-css: no closing </style> in', p); continue; }
  writeFileSync(file, html.slice(0, cs) + '\n' + css + '\n' + html.slice(e));
  console.log(`inline-css: inlined ${(css.length / 1024).toFixed(0)}KB into ${p}`);
}
