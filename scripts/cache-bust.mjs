// Cache-busting: stamp a content-hash query (?v=<hash>) on every local js/css
// reference in the HTML files, and set the service-worker cache version to a
// global build hash. A file's URL changes only when its bytes change, so the
// browser + service worker fetch the new version immediately after a deploy
// (no hard refresh) while unchanged files stay cached.
//
// Run via `npm run build` (after the CSS compile). Idempotent: re-running with
// no asset changes produces no diff.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { join, dirname, resolve } from 'path';

const ROOT = process.cwd();
const hashes = new Map();

function assetHash(absPath) {
  if (hashes.has(absPath)) return hashes.get(absPath);
  let h = '';
  try { h = createHash('sha256').update(readFileSync(absPath)).digest('hex').slice(0, 8); } catch { /* missing file */ }
  hashes.set(absPath, h);
  return h;
}

function htmlFiles() {
  const out = [];
  for (const dir of ['.', 'guides']) {
    let entries = [];
    try { entries = readdirSync(join(ROOT, dir)); } catch { continue; }
    for (const f of entries) {
      const p = join(ROOT, dir, f);
      if (f.endsWith('.html') && statSync(p).isFile()) out.push(p);
    }
  }
  return out;
}

// src|href="<optional ./ ../ />js|css/....js|css" with an optional existing ?v=
const REF = /\b(src|href)="((?:\/|\.\.\/|\.\/)?(?:js|css)\/[^"?]+\.(?:js|css))(?:\?v=[^"]*)?"/g;

let changed = 0;
for (const file of htmlFiles()) {
  const html = readFileSync(file, 'utf8');
  const out = html.replace(REF, (m, attr, ref) => {
    const abs = ref.startsWith('/') ? join(ROOT, ref) : resolve(dirname(file), ref);
    const h = assetHash(abs);
    return h ? `${attr}="${ref}?v=${h}"` : m;
  });
  if (out !== html) { writeFileSync(file, out); changed++; }
}

// Service worker: derive a stable cache version from all stamped asset hashes
// so a deploy invalidates the SW's old cache too.
const swPath = join(ROOT, 'sw.js');
try {
  const all = [...hashes.entries()].filter(([, h]) => h).sort().map(([k, h]) => `${k}:${h}`).join('|');
  const ver = 'nivaa-' + createHash('sha256').update(all).digest('hex').slice(0, 8);
  const sw = readFileSync(swPath, 'utf8');
  const next = sw.replace(/const CACHE_VERSION = '[^']*';/, `const CACHE_VERSION = '${ver}';`);
  if (next !== sw) { writeFileSync(swPath, next); console.log(`cache-bust: sw CACHE_VERSION -> ${ver}`); }
} catch { /* no sw.js */ }

console.log(`cache-bust: stamped ${changed} html file(s), ${[...hashes.values()].filter(Boolean).length} asset(s) hashed`);
