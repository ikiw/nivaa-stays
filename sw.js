// Nivaa Stays — service worker (admin PWA shell).
// Strategy:
//   • HTML pages: network-first, fall back to cache when offline
//   • Same-origin static assets (CSS / JS / fonts / icons): cache-first with
//     background refresh
//   • Apps Script API requests: never cached (always live data)
//   • External CDN (google fonts, GSI): pass through (browser cache)

const CACHE_VERSION = 'nivaa-7c121de2';
const SHELL_ASSETS = [
  '/admin.html',
  '/admin-rank.html',
  '/admin-competitors.html',
  '/booking.html',
  '/welcome.html',
  '/receipt.html',
  '/index.html',
  '/css/tailwind.css',
  '/css/styles.css',
  '/js/admin.js',
  '/js/rank.js',
  '/js/competitors.js',
  '/js/auth.js',
  '/js/pricing.js',
  '/js/calendar-picker.js',
  '/js/hub.js',
  '/js/receipt.js',
  '/data/pricing.json',
  '/assets/logo.png',
  '/assets/pwa/icon-192.png',
  '/assets/pwa/icon-512.png',
  '/images/qr/wifi-room-1.png',
  '/images/qr/wifi-room-2.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  // Pre-cache the admin shell so first offline open works
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache =>
      cache.addAll(SHELL_ASSETS).catch(() => { /* tolerate partial failures */ })
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Drop old caches
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never cache Apps Script API calls — admin needs live data
  if (url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com') {
    return;  // browser default
  }

  // Pass through other cross-origin (Google Fonts, Tailwind CDN, gtag, GSI)
  if (url.origin !== self.location.origin) return;

  // HTML pages: network-first
  const isHtml = req.headers.get('accept')?.includes('text/html') ||
                 url.pathname.endsWith('.html') ||
                 url.pathname === '/';
  if (isHtml) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() =>
        caches.match(req).then(c => c || caches.match('/admin.html'))
      )
    );
    return;
  }

  // Static assets: cache-first, refresh in the background
  event.respondWith(
    caches.match(req).then(cached => {
      const network = fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
