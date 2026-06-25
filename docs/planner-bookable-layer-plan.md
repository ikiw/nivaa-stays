# Planner "Book it" layer — implementation plan (parked)

> Status: **planned, not built.** Researched + audited 2026-06-26 via workflow. Pick up later.
> Goal: make the planner *actionable* — let users book the things in their plan.
> Two enhancements share **one** additive change.

## TL;DR

1. **Nivaa Stays as the trip's home base** — it's *already* `places[0]` (`cat:'Stay'`, `origin:0`) in the data; it's just not used as the start today. Make it the default start + give it a "Book your stay" CTA. **This is the booking funnel.**
2. **"Book it" links on bookable stops** — Matrimandir, scuba, surf, the Paradise Beach ferry, etc.

Both are delivered by adding **one optional field** to the `Place` type. No scheduler / routing / NxN-matrix / share-URL changes — `book` is purely presentational.

## Verified booking links (researched by fetching each operator)

| Stop | Itinerary idx | Link | Type | Confidence / note |
|---|---|---|---|---|
| **Nivaa Stays** (home base) | 0 | `https://nivaastays.com/booking` | stay | High — rate-picker → WhatsApp (`wa.me/919620364554`, code NIVAA10). No instant checkout. |
| **Matrimandir (Auroville)** | 62 | `https://matrimandir.org/how-to-visit/` | ticket | High. Free Viewing-Point pass in person at the Visitors Centre **+** Inner-Chamber **advance online pass** (`mmaccess.auroville.org.in`, time-gated 7am–12pm IST, closed Sun/Tue, maintenance May 18–Jun 14 2026). ⚠️ Do **not** use `auroville.org/page/matrimandir-pass` — returns HTTP 500. |
| **Auroville Visitor Centre** | 106 | `https://matrimandir.org/how-to-visit/` | ticket | High — where the free viewing pass is collected; same link. |
| **Scuba** (Temple Adventures) | 19 | `https://www.templeadventures.com/book-appointments/` | activity | High operator. **Contact-to-book** by phone (+91 99402 19449) / email (`bookings@templeadventures.com`), not instant checkout. ⚠️ `templeadventures.in` is down. |
| **Surf** (Kallialay, Serenity) | 109 | `https://surfschoolindia.com/contact-booking/` | activity | High. Book via WhatsApp/phone +91 94429 92874, **advance (1+ day) required**. ⚠️ `kallialaysurfschool.com` / `surfschoolpondicherry.com` are defunct; `surfingindia.net` is a **different operator in Karnataka** — do not use. |
| **Chunnambar Boat House** | 10 | `https://pondicherrytourism.co.in/chunnambar-boat-house-parking-puducherry` | ferry | **Medium** — on-site ticket counter only, no online booking. Official `.gov` (`tourism.py.gov.in`, `pondicherry.gov.in`) was unreachable; this is a content-accurate tourism portal. Phone 0413 260 2444. **Re-verify before shipping.** |
| **Paradise Beach** | 3 | (same as Chunnambar) | ferry | Reached only via the Chunnambar ferry — share the ferry link. Same medium-confidence caveat. |
| **Pondicherry Heritage Walk (INTACH)** | — | `https://intachpondicherry.org/heritage_tours_french.php` | tour | High operator (phone 0091-413-2225991 / `intachpondy@gmail.com`), **but NO matching place in the catalog** → can't get a node CTA without first adding a new place (which needs the external coord-enrichment step). Park it. |

## Data model change

`planner-src/src/types.ts` — add **one** nested optional field to the `Place` interface (after `reviews?`, line ~19):

```ts
book?: { url: string; type: 'stay' | 'ticket' | 'ferry' | 'tour' | 'activity'; note?: string };
```

- No new `Category` — `'Stay'` already exists and Nivaa is already `cat:'Stay'`.
- No change to `ItineraryData`, the NxN matrices, `Stop`, or the share-URL encoding (unknown Place fields are ignored).

### ⚠️ Critical data constraint

There is **no enrichment/build script in this repo** (only `scripts/cache-bust.mjs` + `inline-css.mjs`). Coordinates are resolved externally. Therefore `book` **must be hand-added directly to `data/pondicherry-itinerary.json`** (the file the app fetches at runtime) — editing only `data/pondicherry-places.json` will NOT reach runtime. `book` carries no coordinates, so hand-editing the baked JSON is safe. Mirror into `pondicherry-places.json` too for any future rebake (and confirm the rebake carries `book` through — see open questions).

## Render points (audited)

- **Primary CTA → `components/PlaceInfoCard.tsx` (~lines 82–85):** the tapped-place detail card's action `Stack` already holds *Map* + *Google Maps* buttons and receives the full `place`. Add a conditional Book `<Button>`. **This one change covers both enhancements** — tapping a bookable pin *or* the home-base `S` marker opens this card.
- **Home-base affordance → `components/DayPanel.tsx` (~line 134, the "Depart …" row)** and the desktop `GlanceRow` in `App.tsx:167`: append a "Book your stay" link when `data.places[start].cat === 'Stay'`.
- **Default start → `usePlanner.ts` (lines ~103–108):** today it defaults to the bus stand; change to prefer the `cat:'Stay'` node and set `defaultStartRef` so the share URL stays clean. The `starts` picker (`usePlanner.ts:159`) already lists Nivaa, so users can still switch base.
- **Optional mirrors (low-risk, later):** small Book chip in `TimelineNode.tsx` (uses existing `p`, line 88); mirrored `IconButton` in `PlaceCard.tsx` (mirror the `mapLink` button, lines 47–52).
- **Skip:** the map marker info-window (`RouteMap.tsx`) — most invasive; the marker click already routes to `PlaceInfoCard`.

## Tracking

Fire `window.gtag('event','generate_lead', { lead_source })` on Book click — `'booking'` for the Nivaa stay (merges with the site's existing Book conversions), `'experience'` for paid activities. Google Ads conversion only on the Nivaa stay.

## Build order

0. **Type:** add `book` to `Place` in `types.ts`.
1. **Data (load-bearing):** hand-add `book` to `data/pondicherry-itinerary.json` at the verified indices (0, 62, 106, 10, 3, 19, 109; optionally 4 Serenity). Mirror into `pondicherry-places.json`.
2. **Primary CTA:** conditional Book `<Button>` in `PlaceInfoCard.tsx` + the gtag fire. (Delivers both enhancements.)
3. **Home-base default:** prefer `cat:'Stay'` start in `usePlanner.ts` + `defaultStartRef`.
4. **Home-base affordance:** "Book your stay" link in the Depart row (`DayPanel.tsx`) + desktop `GlanceRow` (`App.tsx`).
5. **Optional mirrors:** `TimelineNode.tsx` chip + `PlaceCard.tsx` button.
6. **Build + ship:** `cd planner-src && npm run build` → emits to `pondicherry-itinerary/`; then site `npm run build` for cache-bust. Commit + PR as `ikiw`.

## Recommended first-PR scope

Home base (Nivaa) + the **high-confidence** links (Matrimandir, scuba, surf) + the Chunnambar/Paradise ferry as an *info* link with honest "tickets at the boat house" copy. **Skip INTACH** (no catalog entry); **no** surf CTA on the public Serenity Beach node.

## Open questions

1. **Chunnambar (medium confidence):** ship with expectation-setting copy, or hold until the `.gov` page is reachable?
2. **Beaches:** put the ferry CTA on Paradise Beach (only reachable by that ferry — useful) but not a surf CTA on Serenity? (recommended)
3. **gtag granularity** + whether the Ads conversion fires on activity clicks or only the Nivaa stay.
4. **Rebake contract:** if the external script rebakes `pondicherry-itinerary.json` from `pondicherry-places.json`, will hand-added `book` fields survive? Confirm before relying on the itinerary-JSON edit long-term.
