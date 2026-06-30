# Nivaa Stays — repo guide (handoff for GitHub Copilot)

Marketing + guest-utility site for **Nivaa Stays**, a premium 2-room guest house near JIPMER in Puducherry (brand: *Le Affordable Luxury*), **plus** a standalone React day-trip **planner** SPA. Live: https://nivaastays.com · Repo: `ikiw/nivaa-stays` · Hosting: **Cloudflare Workers + Static Assets** (auto-deploys on push to `main`).

> **`CLAUDE.md` in the repo root is the full, authoritative reference.** Read the relevant section there before changing any subsystem (SEO conventions, Apps Script backends, pricing, rank tracker, analytics app, planner). This file is the quick map + the must-not-break rules + where work currently stands.

## Must-not-break conventions

- **Push as the `ikiw` GitHub account**, never `selango_LinkedIn`. Run `gh auth switch --user ikiw` first (`gh auth status` to check). **Open a PR and merge it** — don't push straight to `main` (it auto-deploys to production).
- **Validate locally before committing.** The owner runs `python3 -m http.server 8765` from the site root and eyeballs changes first. Planner lives at http://localhost:8765/pondicherry-itinerary/. Don't commit/push proactively — wait for "looks good / commit".
- **Avoid a full `npm run build` for a focused change** — `build:css` rewrites `css/tailwind.css` with non-semantic churn. Instead: for a `js/`/`css/` change run `npm run cache-bust` (+ `inline-css` if `styles.css` changed); for a React-app change run only `npm run build:planner` (or `build:analytics`) and commit the content-hashed output folder.
- **`.html` stripping:** Cloudflare 307-redirects `/foo.html` → `/foo`. So `sitemap.xml` entries + every `<link rel="canonical">` are **extensionless**; internal `href`s may keep `.html`.
- **Cloudflare Workers + Assets, NOT Pages.** Dynamic endpoints go inside `_worker.js` (`if (url.pathname === '/api/xyz')`), never a `functions/` dir.
- Commit messages end with `Co-Authored-By: ...` and PR bodies with the generated-with line only if continuing that style — optional for Copilot.

## Architecture map

- **Static site** — vanilla HTML/CSS/JS. Tailwind v4 **pre-compiled** to `css/tailwind.css` (rebuild with `npm run build:css` only when adding a brand-new utility class). SEO landing pages + content guides (`guides/`) + guest-utility pages + admin pages.
- **`_worker.js`** — Cloudflare Worker entry; routes `/api/geo`, applies security headers, else serves static assets.
- **Two React + MUI SPAs**, each isolated (own `*-src/` source + committed build output, `noindex`, never referenced by public pages):
  - **Planner** — `planner-src/` → built into `pondicherry-itinerary/`. Build: `npm run build:planner`. *(Most active area — see below.)*
  - **Admin analytics** — `analytics-src/` → `admin-analytics/`. Build: `npm run build:analytics`. Booking analytics dashboard (Chart.js), Google-Sign-In gated.
- **Backends = two Google Apps Script projects** (mirrored in `apps-script/`): the **Bookings** script (`?analytics=1`, check-in, orders, hub) and a **separate Rankings** script (`rank-app-script.js`) for the local-rank + competitor tools. Apps Script edits need a manual redeploy; the `/exec` URLs stay stable. `npm run test:apps-script` before re-pasting.

## The planner (`/pondicherry-itinerary/`)

Standalone **React 18 + MUI 6 + Vite + TypeScript** SPA. Catalog fetched at runtime from `data/pondicherry-itinerary.json` (112 places + an NxN driving matrix). Typecheck: `npm --prefix planner-src run typecheck`. Build: `npm run build:planner` (Vite content-hashes its own assets; **not** touched by `cache-bust`).

- **Themes** — all identity colour comes from `planner-src/src/theme/tokens.ts` (a `PlannerTokens` object per theme; **no colour hard-coded in components**). Two themes: **Studio Dark** (default) + **Heritage White**, flipped by a sun/moon toggle (`components/ThemePicker.tsx`). Switching saves to `localStorage` and **reloads** (colours resolve at module-load via `ACTIVE`; the plan survives in the URL). Components read derived constants from `constants.ts` + the MUI palette in `main.tsx`, all from `ACTIVE`. Timeline + map pins use a single brand accent.
- **State** lives in `usePlanner.ts` (one big hook); `App.tsx` renders mobile + desktop layouts from it. The plan is encoded in the URL query (`buildSearch()`), kept in sync by a `replaceState` effect — shareable links.
- **Place photos** — committed static AVIFs in `images/places/` referenced by `img`/`imgBy` in the catalog; served as site assets → **zero runtime Google calls**. `PlaceThumb` prefers `img`, with a viewport-gated live Places fetch only as a fallback.
- **Hotels browse ("Stays")** — browse-only directory (NOT part of the itinerary), opened from the top-bar **Stays** button / mobile 🛏 header icon → `components/HotelsDialog.tsx`: cohort tabs (Family/Couples/Bachelors/Solo/Near JIPMER) + a **Top-rated / Under-₹6k / Under-₹3k** toggle, all derived from one pool `data/pondicherry-hotels.json`, ranked by a review-weighted (Bayesian) score; Nivaa is `featured`, leads JIPMER, links Book-direct. Data fetched lazily on open.

## Data refresh scripts (manual; need a **server-side** `PLACES_API_KEY`)

The Places API key must be server-side usable (the rank tracker's key works) — an HTTP-referrer-restricted browser key is rejected from Node. Both scripts use `sips`+`avifenc` (`brew install libavif`), are incremental, support `--force`/`--limit N`, and you eyeball locally then commit `images/...` + the data file.

- `npm run fetch:photos` (`scripts/fetch-place-photos.mjs`) — one Google photo per place `placeId` → `images/places/` + `img`/`imgBy` in the catalog. ~210 calls, free tier.
- `npm run fetch:hotels` (`scripts/fetch-hotels.mjs`) — resolves the **editable `POOL` array** (name + cohorts + approx `nightlyFrom` ₹, since Google can't give nightly rates) to live rating/reviews/place-id/photo → `data/pondicherry-hotels.json` + `images/hotels/`. Edit `POOL` to add/remove stays; **fabricated names simply won't resolve**, so the API is the truth filter.

> Storing Google photos is a Maps-Platform-ToS gray area — accepted deliberately; **no Search-ranking impact** (Search and the Maps API are separate systems). Keep attribution (`imgBy`).

## Current status & open items (as of 2026-07-01 — Claude → Copilot handoff)

**Recently shipped** (merged PRs): #24 declutter mobile planner landing + demote AI · #25 light/dark theme system + single-colour pins + baked place photos · #26 muted-blue primary + theme-driven date chip + Itinerary-tab-first + mobile row fixes · #27 "Stays" hotel browse.

**Landed in the final session** (in the handoff commit): two planner bug fixes — (1) **"Back to itinerary" now resets the URL** to the bare planner path (the URL-sync effect in `usePlanner.ts` is browsing-aware); (2) **clicking the logo resets the planner** (`resetPlanner` in `usePlanner.ts`, wired via `Brand`'s `onClick`).

**Open decisions to pick up (all small, mostly data/ranking — no UI rebuild needed):**
1. **Hotels — Bachelors vs Solo**: currently identical (same social hostels; price tiers collapse since all hostels are <₹3k). Decide to **merge** them or **repoint Bachelors to group-friendly hotels/villas**. Change is just the cohort tags + `nightlyFrom` in `scripts/fetch-hotels.mjs` `POOL`, then re-run `fetch:hotels`.
2. **Hotels — Couples "Top rated" ranking**: pure Google rating surfaces budget boutiques (Villa Helios 4.9, Les Hibiscus 4.7) above the heritage icons (Le Dupleix 4.2/3.7k, Villa Shanti 4.3/8.9k). Decide pure-rating vs heavier review-weighting — tune `PRIOR_N` (currently 50) in `HotelsDialog.tsx` `score()`.
3. **Hotels — verify Villa Helios**: it matched "Helios Private Villa" (a whole 3BR villa, not per-room) and currently tops Couples — confirm it's the intended place or drop it from `POOL`.
4. **"Create itinerary" entry point** (idea, not decided): today the "Add places" tab carries forward the places already selected in the viewed itinerary. The owner floated making the Places tab list places **fresh** with an explicit **"Create itinerary"** entry point, while **"Customize"** keeps the selected places. Current behaviour was deemed acceptable ("current one looks fine too") — treat as an enhancement to scope, not a bug.

**Parked (older, unrelated to the planner):** WhatsApp Cloud API reminder automation (blocked on WhatsApp Business Account unlock) · GBP category rank recovery experiment (revisit ~2026-07-05). See `CLAUDE.md` → Parked work / Future ideas.
