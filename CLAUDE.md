# Nivaa Stays — Site Repo

Marketing + guest-utility site for **Nivaa Stays**, a premium 2-room guest house near JIPMER in Puducherry. Brand tagline: *Le Affordable Luxury*. Contact: `+91 96203 64554`.

- Live: https://nivaastays.com
- Repo: `ikiw/nivaa-stays` on GitHub (push as the `ikiw` user, **not** `selango_LinkedIn` — `gh auth switch --user ikiw` before pushing)
- Hosting: **Cloudflare Workers + Static Assets** (not Pages). Auto-deploys on push to `main`.

## Stack

Static HTML, vanilla CSS/JS. No build step in the traditional sense. Edits go straight to `.html` / `js/*.js` / `css/styles.css`.

- **Tailwind v4**: pre-compiled to static CSS at `css/tailwind.css` (~24 KB min / ~5 KB gzip), loaded via `<link rel="stylesheet" href="css/tailwind.css">` in every page `<head>`, before `styles.css`. Build with `npm run build:css` (input: `css/tailwind-src.css`; toolchain in `node_modules`, Node 20 auto-selected via the `volta` field in `package.json`). **Re-run the build after adding markup with a brand-new utility class** — reusing existing classes needs no rebuild. The old 273 KB `js/tailwind.js` Play-CDN runtime was removed (it shipped the whole engine to every visitor). Custom brand classes (`.bg-teal`, `.text-gold`, etc.) are hand-written in `styles.css`, not Tailwind-generated.
- **Cloudflare**: hybrid Worker + static assets via `_worker.js` + `wrangler.jsonc`. The Worker handles dynamic routes (`/api/geo` today); everything else falls through to static-asset serving.
- **PWA**: `manifest.json` + `sw.js` make `admin.html` installable as "Nivaa Admin". The service worker is admin-shell-focused — network-first for HTML, cache-first for static assets, pass-through for Apps Script. **Registered only on the admin pages** (`admin.html` / `admin-rank.html` / `admin-competitors.html`). Public pages do NOT register the SW — they rely on Cloudflare's CDN + the cache-busting build for caching/freshness (the SW's stale-while-revalidate was overkill there and caused stale-asset-after-deploy issues).

## Cloudflare Workers + Assets — IMPORTANT

This is **Workers + Static Assets**, not Pages. The Pages-only `functions/` directory convention does NOT work here. Any dynamic endpoint goes inside `_worker.js`.

- `_worker.js` — Worker entry. Routes `/api/geo` to a handler that returns `request.cf` data; everything else does `env.ASSETS.fetch(request)`.
- `wrangler.jsonc` — Worker + assets config. Key fields: `main: "./_worker.js"`, `assets.directory: "."`, `assets.binding: "ASSETS"`, `assets.run_worker_first: false`.
- `.assetsignore` — excludes `_worker.js`, `wrangler.jsonc`, `node_modules`, etc. from the static-asset upload. Without this, wrangler errors with *"Uploading a Pages _worker.js file as an asset"*.

To add a new dynamic endpoint, add another `if (url.pathname === '/api/xyz') { ... }` branch inside `_worker.js`. Don't create a `functions/` directory.

## Pages

**SEO landing pages** (indexable, in `sitemap.xml`):

- `index.html` — homepage with rate-picker calendar, full LodgingBusiness + HotelRoom×2 + FAQPage + Review + AggregateRating + ReserveAction JSON-LD
- `gallery.html`, `booking.html`
- JIPMER cluster: `guest-house-near-jipmer.html`, `patient-family-stay-jipmer.html`, `student-family-stay-jipmer.html`, `conference-stay-jipmer.html`
- Pondicherry cluster: `celebration-stay-pondicherry.html`, `pet-friendly-stay-pondicherry.html`, `full-house-stay-pondicherry.html`, `work-from-home-pondicherry.html`
- `guides.html` — hub for content articles (CollectionPage schema)

**Content guides** (indexable, in `guides/` directory):

- Live at `/guides/<slug>` (extensionless). Currently published:
  - `guides/where-to-stay-near-jipmer.html` — comparison table of 5 OTA-listed nearby stays + Nivaa
- Each guide is built from `guides/_template.html` — duplicate the file, replace every `{{PLACEHOLDER}}` marker, **remove the `<meta robots="noindex,nofollow">` line** before publishing.
- Article schema (`Article` + `WebPage` + `BreadcrumbList`) shares the same `@id` (`https://nivaastays.com/#lodging`) as the rest of the site so Google consolidates to one entity.
- Publish checklist: (1) add `<url>` to `sitemap.xml`, (2) add a card to `#guide-list` in `guides.html`, (3) cross-link from ≥2 other pages.

**Guest-only utility pages** (`<meta robots="noindex,follow">`, NOT in sitemap):

- `order.html` — food ordering cart (sends order via WhatsApp + logs to Apps Script if `?id=` present)
- `stay-guide.html` — local Pondicherry guide for current guests
- `welcome.html` — post-booking hub (loads via `?id=...`, fetches booking + invoice from Apps Script)
- `checkin.html` — self check-in form (submits to Apps Script `doPost`, uploads ID file)
- `receipt.html` — printable advance receipt
- `404.html` — fallback

**Admin pages** (`<meta robots="noindex">`):

- `admin.html` + `js/admin.js` — Google Sign-In gated dashboard. Lists active bookings (Leaving today / Arriving today / In-house / Upcoming). Each row links to hub / add food / receipt / printable invoice.
- `/admin-analytics/` — booking analytics dashboard, a **standalone React + MUI SPA** (source `analytics-src/`, built into the served `admin-analytics/` folder). See **Admin analytics dashboard** below.
- `admin-rank.html`, `admin-competitors.html` — local-rank + competitor tools (see **Local rank tracker**).
- PWA-installable on Android Chrome and via Safari Share→Add to Home Screen.

## Cloudflare — `.html` stripping convention

Cloudflare **307-redirects** `/foo.html` → `/foo`. This causes Google "redirect error" if the sitemap or canonical points at the `.html` form. Therefore:

- **`sitemap.xml` entries**: extensionless (`https://nivaastays.com/conference-stay-jipmer`)
- **`<link rel="canonical">` on every page**: extensionless
- **Internal `href`s**: still `.html` is fine — users get one transparent redirect; only Google needs canonical/sitemap

If adding a new page, follow the same convention: extensionless in sitemap and canonical, `.html` for the actual file.

## SEO conventions

- **JSON-LD on every landing page** uses a `@graph` of `LodgingBusiness` (`@id: https://nivaastays.com/#lodging` — shared across the site for entity consolidation) + page-specific `WebPage` + `BreadcrumbList`. Niche pages add extras (e.g. `petsAllowed: true` on `pet-friendly-stay-pondicherry`, `amenityFeature` array on `work-from-home-pondicherry`).
- **"Related stays" 3-card cluster** appears at the bottom of each landing page just before the footer. Each card links to a sibling landing page — kills orphan pages and builds the topical cluster signal.
- **Greeting-toast personalization** (see below) does NOT change canonical content — it's a JS overlay, safe for SEO.
- **Internal-link graph**: footer "Stays By Purpose" lists all 8 landing pages on `index.html`. Each landing page also has 2-3 contextual inline body links to siblings.

## Geo personalization (greeting toast)

- `_worker.js` exposes `/api/geo` returning `{ country, city, region, timezone }` from `request.cf` — free, edge-rendered, no third-party API.
- `js/greeting.js` fetches `/api/geo`, matches the visitor's city against an allowlist (Chennai / Bangalore / Pondicherry / Madurai / Salem / Coimbatore / Hyderabad / Mumbai), and shows a styled bottom-right toast 2.5s after load.
  - Chennai → *"Whistle Podu!"* lead
  - Bangalore → *"Hi RCBian!"* lead
  - Pondicherry → *"Hi localite!"* lead
  - Madurai → *"Vanakkam Madurai-kaara!"* lead
  - Salem → *"Hello, Mango City!"* lead
  - Coimbatore (Kovai) → *"Namma Kovai!"* lead
  - Hyderabad (Secunderabad) → *"Adaab, Hyderabad!"* lead
  - Mumbai (Bombay) → *"Aamchi Mumbai!"* lead
- Dismissal is permanent per browser (localStorage `nivaa.greeting.dismissed`).
- Local-dev override: append `?greet=Chennai` (or Bangalore / Pondicherry / Madurai / Salem / Coimbatore / Hyderabad / Mumbai) to any URL — bypasses both the geo fetch and the dismissed flag, so you can preview each variant.
- Loaded on the 11 public pages (index + gallery + booking + 8 SEO landing pages) via `<script defer src="/js/greeting.js">` right after the `css/tailwind.css` link.
- Toast styling lives in `css/styles.css` under `.greeting-toast` — gold accent strip, cream gradient, Playfair lead phrase, pill CTAs.

## Backend (Google Apps Script)

The script lives in a Google Apps Script project bound to the Bookings Google Sheet. **Source is mirrored** at `apps-script/app-script.js` for version history. The deployed web-app URL is hard-coded into client pages (`checkin.html`, `welcome.html`/`hub.js`, `order.html`, `admin.html`/`admin.js`). Don't change the URL unless redeploying — and even on redeploy, Apps Script keeps the URL stable across versions.

**Endpoints exposed (`doGet?action=...`):**

- `lookup` — find a booking by `?id=` for the check-in form
- `hub` — full guest hub data (booking + invoice + food/rentals/add-ons) for `welcome.html?id=`
- `activeBookings` — host dashboard feed for `admin.html` (Leaving today / Arriving today / In-house / Upcoming)
- `analytics` (`?analytics=1`) — booking-analytics JSON for `/admin-analytics/`: per-month occupancy/ADR/RevPAR (night-accurate, stays split across month boundaries), channel mix, repeat guests, payments, current-month day-grid + ₹1L target, and `leadTime` + `pace` (lead-time distribution + pickup-pace forecast from the booking-made `Date` column)
- `tabsdebug` (`?tabsdebug=1`) — read-only probe (every sheet: detected-as-booking-tab? header row? Check-In parse stats) to debug "missing months"

**Endpoints exposed (`doPost?action=...`):**

- *default / no action* — self check-in form submission (creates row in `Check-ins` sheet, uploads ID to Drive folder)
- `order` — food order from `order.html` cart (creates row in `Orders` sheet)
- `rental` — bike rental request from `welcome.html` (creates row in `Bike Rentals` sheet)
- `addon` — generic add-on (e.g. late-checkout fee) (creates row in `Add-ons` sheet)

**Scheduled triggers:**

- `dailyDigest` — host email summary at 9 AM IST, installed by running `installDailyTrigger()` once

**Important Apps Script quirks:**

- `doPost` returns a 302 to `script.googleusercontent.com/macros/echo` with a single-use `user_content_key`. Some clients re-fire the GET and the second one 404s — **the data is already in the sheet, so clients treat a 404/unreadable response as success**.
- Sheets parses cell values starting with `=`, `+`, `-`, `@` as formulas. The `safeForSheet_()` helper prefixes any such user-provided string with an apostrophe. Use it for every guest-supplied field.
- The Drive upload `ID_FOLDER_ID` must be shared with the deployment's "Execute as" identity. If you redeploy from a different Google account, re-share the folder.

**Booking-tab detection + tests:** booking tabs are auto-detected by row 1 containing `Name` + `Check-In` + `Check-Out` + **`Amount`** (`REQ_HEADERS`). `Amount` (not `Mobile`) is the discriminator — older monthly tabs predate the `Mobile` column, and the `Check-ins`/`Orders`/`Rentals` logs have no `Amount`, so the revenue ledgers are detected and the logs excluded. Check-In/out are stored as **text** like `1-Jun-2026`; the top-level `parseDate_` handles Date cells + `1-Jun-2026` / `2026-06-01` / `1/6/2026`. **`npm run test:apps-script`** (Node's built-in runner, no deps) loads the *unmodified* `app-script.js` in a `vm` sandbox with mocked GAS globals and asserts the `doGet` read paths — run it before re-pasting an edited script. See `apps-script/tests/`. **Apps Script edits require a manual redeploy** (paste into the project → Manage deployments → ✏️ → New version → Deploy); the `/exec` URL stays stable.

## Brand

- Teal `#0E3B35` (primary), teal-dark `#082623`
- Gold `#C9A227`, gold-soft `#E6C35A`
- Cream `#FAF6EC`, ink `#14201E`, muted `#5B6B68`
- Fonts: **Playfair Display** for headings, **Inter** for body, **Cormorant Garamond** (italic, used only on the celebration page)
- Contact: `+91 96203 64554` (WhatsApp + call); host email `nivaastays@gmail.com`

## Images

All photos live in `images/` as **AVIF** (small + sharp). Source JPEGs from WhatsApp/phone live in `../new-image/` (outside the repo) and get converted with:

```bash
sips -s format jpeg -Z 1600 "$SRC" --out /tmp/tmp.jpg
avifenc -q 60 -s 6 /tmp/tmp.jpg images/<descriptive-name>.avif
```

`avifenc` comes from `brew install libavif`. Naming: kebab-case, descriptive (`bedroom-king-warm-lit.avif`, not `IMG_1234.avif`).

**Lazy-loading:** every below-fold `<img>` should have `loading="lazy" decoding="async"`. Hero images stay eager (no `loading=lazy`) to keep LCP fast.

A couple legacy files still need conversion to AVIF: `food-dosa.webp` (564 KB), `bike-vespa-whitetown.jpg` (439 KB).

## Carousels

Room booking cards on `index.html` use a small vanilla JS carousel: `[data-carousel] > .rc-track > img` with prev/next/dots and 5-second autoplay. CSS in `styles.css` under `.room-carousel`. Pause on hover, touch, and via `IntersectionObserver` when off-screen. To add slides: append `<img>` tags inside `.rc-track`.

## Pricing config

Live rates and the inline rate-picker calendar on `index.html` are driven by `pricing.json`. Three tiers:

| Tier | Default rate | Days |
|---|---|---|
| Weekday | ₹2,000 | Mon–Thu nights |
| Weekend | ₹2,500 | Fri/Sat/Sun nights |
| Long weekend | ₹3,000 | Full Fri+Sat+Sun block when a holiday in `holidays[]` falls on Mon or Fri |

Files:
- `data/pricing.json` — tiers, weekend day indices, holiday list, manual long-weekend overrides, advance-payment policy, auto-discounts (4+ nights = 5%), transit/late-checkout fees, bike rental rates.
- `js/pricing.js` — pure logic module: `rateForDate()`, `quoteForRange()`, `formatINR()`, transit/late-checkout fee math. No DOM access. Cache-friendly: pass the same `config` across calls and the long-weekend set is memoized.
- `js/calendar-picker.js` — UI module that fetches `pricing.json`, renders a 2-month grid into `<div id="rate-picker">`, and emits a WhatsApp deep link with the booking summary.

Long-weekend trigger logic:
- Holiday on **Friday** → bump that Fri/Sat/Sun.
- Holiday on **Monday** → bump the prior Fri/Sat/Sun.
- Holiday on Tue/Wed/Thu/Sat/Sun → no auto-bump (use `manualLongWeekends` if needed).

Hardcoded price text on landing pages (`*-stay-*.html`, `guest-house-near-jipmer.html`) needs to stay in sync with `pricing.json` manually — the picker only lives on `index.html`. Standard line is `Weekday ₹2,000* · Weekend ₹2,500* · Long weekend ₹3,000*.`

Edit `pricing.json` when:
- A holiday year rolls over (add the next year's holidays).
- A Tue/Wed/Thu holiday should bump rates (won't auto-trigger, add to `manualLongWeekends`).
- Rates change (edit `tiers`).

## Order page (`order.html`)

Food ordering cart with WhatsApp handoff:

- Menu data in `MENU` object (inline JS) — each item has `id`, `name`, `desc`, `price`, `veg` (boolean).
- Renders menu cards with FSSAI-standard veg/non-veg square indicator, gold pill price chip, qty stepper.
- Active (in-cart) cards switch to a cream-gold gradient + left accent strip + filled gold price chip for clear visual feedback.
- Cart panel: sticky on desktop, fixed bottom-sheet on mobile (≤900px) with trimmed padding so the menu lands visible.
- "Send Order via WhatsApp" button: if URL has `?id=<bookingId>`, POSTs to Apps Script `?action=order` first to log the order to the `Orders` sheet, then opens WhatsApp with a pre-filled message. If no booking ID, just opens WhatsApp.
- Empty cart state: small gold cart SVG + warm copy ("Your basket is empty — start with an idly combo?").

## Local preview

```bash
cd /Users/selango/Documents/stays/website/site
python3 -m http.server 8765
# open http://localhost:8765/
```

Caveats:
- `/api/geo` does NOT work locally (it's a Cloudflare Worker route). The greeting toast won't appear under normal conditions. Use `?greet=Chennai` (or Bangalore / Pondicherry) to force-render.
- Apps Script POSTs from `checkin.html`, `welcome.html`, `order.html` will succeed end-to-end against the live script — be careful: a local checkin submission writes a real row to the production Sheet.
- Cloudflare's `.html`-stripping redirect does NOT happen locally, so links work as-is.

## Cache-busting / build

Assets are **content-hash versioned** to defeat browser + service-worker caching (the SW serves JS/CSS stale-while-revalidate, which otherwise needs a hard refresh after each deploy). `npm run cache-bust` (`scripts/cache-bust.mjs`) stamps `?v=<hash>` on every local `js/`/`css/` reference across all HTML and sets `sw.js`'s `CACHE_VERSION` to a global build hash. It's **idempotent** — re-running with no asset changes makes no diff.

- **`npm run build`** = `build:css` → `build:planner` → `build:analytics` → `cache-bust` → `inline-css`. ⚠️ **Avoid a full `npm run build` for a focused change** — `build:css` rewrites `tailwind.css` with non-semantic churn, and `build:planner`/`build:analytics` reinstall + rebuild the React apps. Instead: for a `js/*.js` or `css/*` change run just **`npm run cache-bust`** (+ `inline-css` if `styles.css` changed); for a React-app change run just **`npm run build:analytics`** (or `build:planner`) and commit the content-hashed output folder.
- A file's `?v=` only changes when its bytes change, so unchanged assets stay cached.

## Deploy / push checklist

1. Make edits, validate locally (the user prefers to eyeball changes before push).
2. **If any `js`/`css` changed: `npm run build`** (stamps cache-bust hashes), then `git -C site add -A && git -C site commit -m "..."`
3. **Push as `ikiw`**: `gh auth switch --user ikiw` if needed (`gh auth status` to verify), then `git push origin main`.
4. Cloudflare auto-deploys in ~1-2 min. Workers + Assets builds occasionally take longer than pure static deploys.
5. If sitemap/SEO touched: resubmit sitemap in Search Console and use URL Inspection → Request Indexing on changed pages.
6. If `_worker.js` or `wrangler.jsonc` changed: tail the build log in Cloudflare dashboard — Worker build errors block the entire deploy (including static-only file changes).

## Tracking

The shared gtag block (right after the viewport meta) configures **two** products, on all 20 visitor-facing pages (everything **except `admin.html`**, which has no tracking at all — keeps host sessions out):
- **Google Ads** `AW-18059444069`
- **GA4** `G-4SHCZ8DF76`

If adding a new HTML page, copy the gtag block from `index.html` (it has both `config` lines).

**Conversion events** — `js/track.js` (loaded on the 14 marketing pages: index, gallery, booking, 8 landing pages, guides + 2 guide articles; NOT guest pages, to keep data clean). A single delegated click listener fires a GA4 `generate_lead` event (`lead_source`: whatsapp / phone / booking) + a Google Ads `conversion` on WhatsApp / Call / Book clicks. Also exposes `window.nivaaTrack(action, source)` for manual calls (e.g. form submits).
- Google Ads side is dormant until conversion **labels** are pasted into `ADS_LABELS` at the top of `track.js` (create the actions in Google Ads → Goals → Conversions).
- GA4 side works once `generate_lead` is marked a **Key event** in GA4 (Admin → Events). Link GA4 ↔ Ads to import conversions + build remarketing audiences.

## Local rank tracker (admin)

Admin-only Google Maps local-rank tracker — geo-grid method (à la Local Falcon), scoped to Nivaa.

- **Page:** `admin-rank.html` + `js/rank.js`, gated by `NivaaAuth.isAdmin()` exactly like `admin.html` (linked from the admin nav). Heatmap = pure CSS grid; trend = inline SVG; cards reuse `.adm-*` classes. No charting library.
- **Data source:** Google **Places API (New)** Text Search, queried across a 5×5 geo-grid (~1.2 km step) around the JIPMER/Nivaa point for ~7 keywords, recording Nivaa's position (1–20, or 0 = not in top 20) at each point. Ranking is a **trend-grade proxy**, not the pixel-exact Maps pack.
- **Backend — SEPARATE Apps Script** (`apps-script/rank-app-script.js`), deliberately **not** the Bookings script: a standalone project bound to its own **"Nivaa Rankings"** spreadsheet, with its own `/exec` deployment URL. This keeps the unauthenticated rank endpoint + Places API key away from all booking/guest PII. `js/rank.js` calls it via its own `RANK_SCRIPT_URL` const (not the Bookings `APPS_SCRIPT_URL`). Functions: `rankScan()` (weekly trigger → `Rank Scans` sheet), `rankData_()` (`doGet?rankData=1`), `resolvePlaceId()` + `installRankTrigger()`. Config consts (`RANK_KEYWORDS`, `RANK_GRID`) at the top.
- **One-time setup:** create the "Nivaa Rankings" sheet → Extensions → Apps Script → paste `rank-app-script.js`; enable Places API (New) in Google Cloud (billing on); add **Script Properties** `PLACES_API_KEY` + `NIVAA_PLACE_ID` (run `resolvePlaceId()` for the id); run `rankScan()` once to seed; run `installRankTrigger()`; deploy as a web app and paste the `/exec` URL into `RANK_SCRIPT_URL` in `js/rank.js`. Cost ≈ 175 calls/week (~760/mo) with a `places.id`-only field mask — usually within the free tier.
- **ARP** = Average Rank Position across the grid (not-found counts as 21). Lower is better.
- **Competitor Share of Voice** (`admin-competitors.html` + `js/competitors.js`): `rankScan()` stores the top-N ranked place ids per cell in the `Top IDs` column (near-zero extra cost — we already fetch them). `resolveCompetitors()` resolves the most-common ids → names/ratings via Place Details into a `Competitors` sheet (run after `rankScan()`). `compData_()` (`doGet?compData=1`) computes SoV (% of grid points × keywords each business is top-3 / top-10) + per-competitor grids. The page shows a SoV leaderboard (Nivaa highlighted) + a per-competitor heatmap. **Setup:** after pasting the updated script, re-run `rankScan()` (adds the `Top IDs` column), then `resolveCompetitors()`.

## Admin analytics dashboard

Booking analytics for the host — a **standalone React + MUI SPA**, deliberately separate from the static site (mirrors how the planner is built/isolated).

- **Source:** `analytics-src/` — Vite + React 18 + MUI 6 + Chart.js, TypeScript. Mirrors `planner-src/` (same toolchain/tsconfig).
- **Build:** `npm run build:analytics` (Vite `base: '/admin-analytics/'`, `outDir: '../admin-analytics'`) → emits the served `admin-analytics/` folder. **Both source and build output are committed.** `analytics-src/` is in `.assetsignore` (source not uploaded); Cloudflare serves the built `admin-analytics/index.html` + Vite-content-hashed `admin-analytics/assets/` at **`/admin-analytics/`**. There is no `admin-analytics.html` — the folder index is the page.
- **Isolation (keep it this way):** `noindex`, not in `sitemap.xml`, untouched by `cache-bust`/`inline-css` (scoped to root + `guides/` / an explicit page list), no service-worker registration, and **never referenced by the public pages**. The 11 public pages load none of its bytes.
- **Auth:** reuses the shared `/js/auth.js` (`window.NivaaAuth`) — same Google Sign-In admin gate as `admin.html`. `analytics-src/index.html` injects `/js/auth.js` + the GSI client at runtime via an inline script (root-absolute paths, so Vite's base-rewrite can't touch them); `src/useAuth.ts` reads `NivaaAuth` + listens for `nivaa-auth-change`. Sign-in only completes on the live domain (OAuth authorized origins).
- **Data:** the Bookings Apps Script `?analytics=1` (same `APPS_SCRIPT_URL` as `admin.js`). Views (switcher, default = This month): **This month** (₹1L target deep-dive + weekly split + open slots + suggestions), **Insights** (pace forecast + lead-time profile + fill-this-month action plan, from `leadTime`/`pace`), **each past month**, **All months** (revenue/occupancy + channel-mix charts + month table). KPIs compare to the all-months average; values colour-coded by occupancy + revenue-target thresholds (`src/lib.ts` `occLevel`/`tgtLevel`).
- **Dev / checks:** `npm --prefix analytics-src run dev` (proxies `/js` → production for auth) · `npm --prefix analytics-src run typecheck`. For an analytics-only change, just `npm run build:analytics` + commit the `admin-analytics/` output (no `cache-bust` needed — assets are already content-hashed).

## Pondicherry planner (`/pondicherry-itinerary/`)

Standalone **React 18 + MUI 6 + Vite** SPA (source `planner-src/`, built into the served `pondicherry-itinerary/` folder — both committed; mirrors the analytics app's isolation). Catalog is fetched at runtime from `data/pondicherry-itinerary.json` (112 places + an NxN driving matrix). Build: **`npm run build:planner`** (not touched by `cache-bust` — Vite content-hashes its own assets). Typecheck: `npm --prefix planner-src run typecheck`.

- **Themes** — all identity colour comes from `planner-src/src/theme/tokens.ts` (a `PlannerTokens` object per theme; NO colour hard-coded in components). Two themes: **Heritage White** (light) and **Studio Dark** (dark, the **default**), flipped by a single sun/moon toggle (`components/ThemePicker.tsx`). Switching saves a key to `localStorage` (`nivaa.planner.theme`) and **reloads** — colours resolve at module-load (`ACTIVE`), and the plan survives in the URL. Components read derived constants from `constants.ts` (`CAT_HEX`, `ROUTE_HEX`, `NODE_BG`, …) and the MUI palette in `main.tsx`, all built from `ACTIVE`. Itinerary timeline + map pins use a single brand accent (not a per-category rainbow).
- **Place photos** — committed as static AVIFs under `images/places/<slug>.avif`, referenced by `img` (+ `imgBy` attribution) on each place in the catalog. Served as normal site assets, so the planner makes **zero Google calls at runtime** (picker rows, info card, timeline rows all use `PlaceThumb`, which prefers `img`; a viewport-gated live Places-API fetch is kept only as a fallback for places without a baked image).
- **Refreshing photos (monthly, manual)** — `npm run fetch:photos` (`scripts/fetch-place-photos.mjs`): pulls one Google photo per `placeId` via the Places API (New) → `sips`+`avifenc` → `images/places/`, and writes `img`/`imgBy` back into the catalog. Incremental (re-runs skip done; `--force` re-fetches, `--limit N` to test). **Needs a server-side `PLACES_API_KEY`** (the rank tracker's key works — an HTTP-referrer-restricted browser key will be rejected from Node). ~210 calls total, inside the free tier. Eyeball locally, then commit `images/places/` + the data file. (Storing Google photos is a Maps-Platform-ToS gray area — accepted deliberately; no Search-ranking impact.)
- **Hotels browse ("Stays")** — a browse-only hotel directory (NOT part of the itinerary), opened from the top-bar **Stays** button / mobile 🛏 header icon → a "Where to stay" overlay (`components/HotelsDialog.tsx`) with **cohort tabs** (Family / Couples / Bachelors / Solo / Near JIPMER) and a **Top-rated / Under-₹6k / Under-₹3k** tier toggle. All three tiers derive from one pool — `data/pondicherry-hotels.json` (one record per hotel: live Google rating/reviews/place-id + a *curated* `nightlyFrom` ₹, since the Places API doesn't expose nightly hotel rates), ranked by a review-weighted (Bayesian, prior 4.0/n=50) score; Nivaa is `featured` and leads JIPMER with a Book-direct link. Photos in `images/hotels/`. The data is fetched **lazily** (only when the overlay opens), so it costs nothing on planner load.
- **Refreshing hotels (manual)** — `npm run fetch:hotels` (`scripts/fetch-hotels.mjs`): resolves the editable `POOL` array (name + cohorts + approx `nightlyFrom`) to live Places-API data + one photo each. Same server-side `PLACES_API_KEY`. **Edit `POOL`** to add/remove stays or adjust prices (fabricated names simply won't resolve — the API is the truth filter); incremental, `--force`/`--limit N` supported.
- **Rentals browse** — bike & car rental directory (also browse-only), opened from the top-bar **Rentals** button / mobile 🛵 icon → `components/RentalsDialog.tsx` (a **Bikes / Cars** toggle, top-10 each by review-weighted score, **Call** (tel:) + Maps — no cohorts/price-tiers). Data: `data/pondicherry-rentals.json` (live Google rating/reviews/**phone**/place-id + a curated `dailyFrom` ₹). Lazily fetched on open; SEO-stuffed Google names trimmed for display.
- **Refreshing rentals (manual)** — `npm run fetch:rentals` (`scripts/fetch-rentals.mjs`): **discovery-based** (not a named pool) — runs ~6 Places **Text Searches** (bike + car angles) biased to Pondicherry, filters to real rental shops, ranks by reviews, keeps the top 12/type → `data/pondicherry-rentals.json` + `images/rentals/`. Edit the `QUERIES` array to widen/narrow. Same `PLACES_API_KEY`.

## Conventions for the user

- The user pushes via the **`ikiw`** GitHub account (not `selango_LinkedIn`). Always `gh auth switch --user ikiw` before pushing if status shows a different active account.
- The user **validates changes locally** before approving commit + push. Don't push proactively — wait for explicit "yes, commit and push" or similar.
- Tone: keep commit messages and Claude responses concise. The user is technical and time-pressed.

## Parked work

> **Handoff (2026-07-01):** active development moved from Claude Code to **GitHub Copilot**. The planner's current status + open decisions live in **`.github/copilot-instructions.md`** (the Copilot guide). The list below is the older parked backlog.

These were discussed and partially set up; resume when the user comes back to them:

- **WhatsApp Cloud API automation** (3 reminder templates: check-in morning, check-out morning, post-checkout review). Templates designed, Meta app + phone wiring partially done. Blocked on the user's WhatsApp Business Account unlock. Resume by: get account unlocked → submit the 3 templates → generate a permanent System User token → add `sendWA_()` helper + `dailyWhatsAppSweep_()` + 9 AM IST trigger to `apps-script/app-script.js`.

## Future ideas (discussed, not built)

In rough priority order:

1. **Public availability calendar** — live read-only calendar on `booking.html` showing 90-day greens/reds from the Bookings sheet, to cut the "is the room free on Dec 15?" WhatsApp pings.
2. **Gmail OTA importer** — Apps Script trigger that parses Airbnb / Booking.com / MMT / Agoda confirmation emails and appends rows to the Bookings sheet. Replaces the manual re-entry step (and obsoletes the Chrome-extension idea).
3. **Sitemap `<lastmod>` entries** — currently bare; adding ISO dates helps Google re-crawl after edits.
4. **Analytics — demand-pattern + channel/pricing modules** — deferred extensions to the analytics dashboard: occupancy/ADR by day-of-week + seasonality, per-channel lead time, weekend-vs-weekday pricing/underpricing flags. Needs one more `?analytics=1` backend pass + redeploy.
5. **Planner — explicit "Create itinerary" entry point** — today the "Add places" tab carries forward the places already selected in the viewed itinerary. Idea: make Places list places *fresh* with an explicit **"Create itinerary"** CTA, while **"Customize"** (from a loaded plan) keeps the selection. The owner deemed the current behaviour acceptable — this is an enhancement, not a bug.
6. **Hotels — cohort/ranking tuning** — Bachelors and Solo currently resolve to the same social hostels (decide: merge, or repoint Bachelors at group-friendly hotels/villas); Couples "Top rated" by pure Google rating surfaces budget boutiques over the heritage icons (tune the review-weighting `PRIOR_N` in `HotelsDialog.tsx`); verify the Villa Helios match. All are data/ranking tweaks in `scripts/fetch-hotels.mjs` `POOL` / the `score()` fn — no UI rebuild.

## Done (was "Future ideas")

- **Pre-compiled Tailwind to static CSS** — dropped the 273 KB `js/tailwind.js` runtime; biggest LCP win. See the Tailwind bullet under **Stack**.
- **Security headers** — HSTS / X-Content-Type-Options / X-Frame-Options / Referrer-Policy / Permissions-Policy are set in `_worker.js` via `withSecurityHeaders()` (Workers + Assets ignores a `_headers` file, so they're applied in code on every response).
- **Admin analytics dashboard** — built as a standalone React + MUI SPA at `/admin-analytics/` (Chart.js), with a pace/lead-time **Insights** view and an Apps Script test harness. See **Admin analytics dashboard** + the `analytics`/`tabsdebug` endpoints under **Backend**.
- **Planner theming + photos + Hotels** (PRs #24–#27) — token-driven light/dark **theme system** (`planner-src/src/theme/tokens.ts`, Studio Dark default + Heritage White, sun/moon toggle), single-colour timeline/map pins, **baked place photos** (`npm run fetch:photos` → `images/places/`, served statically), and a browse-only **"Stays" hotel directory** (`npm run fetch:hotels` → `data/pondicherry-hotels.json` + `images/hotels/`, `components/HotelsDialog.tsx`, cohort tabs + price-tier toggle, Nivaa featured). See the **Pondicherry planner** section.
- **Planner UX fixes** — "Back to itinerary" resets the URL to the bare planner path (browsing-aware URL sync); clicking the logo resets the planner (`resetPlanner`).
