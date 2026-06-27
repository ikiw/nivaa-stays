# Nivaa Stays — SEO Action Plan (Website · Maps · Planner)

> **Date:** 2026-06-27 · **Status:** analysis only (nothing built) · **Method:** 6-analyst deep SEO audit (keyword/on-page, maps-local under the category constraint, planner, AEO, technical/schema, off-page), grounded against the live repo + site.
>
> Property: 2-room owner-run guest house, ~1.5 km / ~5 min from JIPMER, Gorimedu, Puducherry. "Le Affordable Luxury." Both rooms have private bathtubs. Static HTML + Cloudflare Workers; React planner at `/pondicherry-itinerary`.
>
> **Target keywords** (from `apps-script/rank-app-script.js`): *hotel intent (primary)* — hotels near JIPMER, hotel near JIPMER, premium hotels near JIPMER, hotels in Pondicherry, budget hotel near JIPMER, rooms near JIPMER · *bathtub niche* — hotels with bathtub in Pondicherry, hotel with bathtub near JIPMER · *guest-house (legacy)* — guest house near JIPMER + JIPMER patient/student variants.

## 1. Bottom line

**Stop appealing the "Hotel" GBP primary category — it is unwinnable for a 2-room owner-run property and the appeal churn is actively destabilizing the listing.** Google's Hotel vertical expects front-desk / room-feed / aggregator signals a 2-room place structurally lacks, and the live rank data already proves you rank on hotel-intent terms *as a Guest house* (bathtub #7, "budget hotel near JIPMER" #10). Accept **Guest house as primary**, add approvable lodging-intent secondaries (Bed & breakfast, Serviced/Extended stay, Inn).

**Two-track strategy that respects the constraint:**
- **Maps track (category-gated):** you cannot enter the hotel *local pack* — don't fight it. Win the buckets you can: set `priceLevel` budget/value (where "budget hotel near JIPMER" already ranks), enable the **bathtub amenity attribute** (your strongest term, currently regressing — defend it), fix the **Vanur→Gorimedu NAP conflict**, and run a sustainable Posts/photos/Q&A/reviews cadence.
- **Organic + AI track (NOT category-gated):** this is where you actually capture "hotel near JIPMER" demand. Your on-page schema can legitimately keep `["LodgingBusiness","Hotel"]` — the GBP rejection doesn't touch organic/AI. Make `hotels-near-jipmer.html` + `hotel-with-bathtub-pondicherry.html` the real hotel-intent capture pages.

**Schema @type ruling:** all lodging pages already carry `["LodgingBusiness","Hotel"]`. **Keep the Hotel type** — it's the one legal lever to assert hotel-intent for organic, costs nothing, independent of the rejected GBP category. Just never add a front-desk claim anywhere.

**Highest-leverage cluster:** cheap copy+schema on the static stack — dedupe hotel vs guest-house pages, add FAQs to the 4 landing pages (currently zero), fix the AVIF social-image bug, resolve the 4.8/4.9 rating drift. None need a build step.

## 2. Top moves (ranked by impact ÷ effort)

| # | Move | Surface | Impact | Effort |
|---|------|---------|--------|--------|
| 1 | Set GBP primary = **Guest house**, stop appealing Hotel; add approvable lodging secondaries | Maps | High | S |
| 2 | Fix **AVIF og:image** → 1200×630 JPEG on 17 pages (WhatsApp/FB/LinkedIn previews broken) | Website | High | M |
| 3 | Fix **Vanur→Gorimedu** NAP conflict across GBP, site, Justdial, OTAs, rank script | Maps | High | S |
| 4 | Add **FAQ block + FAQPage schema** to the 4 JIPMER/bathtub landing pages (currently 0) | Website/AEO | High | M |
| 5 | Resolve **rating drift** — banner + all JSON-LD a single value (4.8) | Website/Tech | High | S |
| 6 | Add **review CTA** to welcome.html / checkin / post-checkout flow (velocity leak) | Maps | High | S |
| 7 | Enable **bathtub structured amenity** in GBP + set **priceLevel = budget** | Maps | High | S |
| 8 | Differentiate hotel vs guest-house page + **rebalance internal links** to hotel page | Website | High | M |
| 9 | Add **plural/budget keywords** ("budget hotel near JIPMER", "hotels in Pondicherry", "premium hotels") to hotels-near-jipmer | Website | High | S |
| 10 | **Prerender 8 planner cohort pages** + add booking/hotel CTA into planner | Planner | High | M |
| 11 | Claim **Tripadvisor** (B&B/Specialty Lodging — no Hotel gate) + add to sameAs | Off-page | High | M |
| 12 | Add **llms.txt** + AI-crawler Allow rules in robots.txt | AEO/cross | Med | S |

## 3. Website SEO

*All static-stack copy/schema — no build beyond cache-bust.*

**Do first (S, high impact):**
1. **Fix the AVIF social-preview bug (17 pages).** og:image + twitter:image point at `.avif` (WhatsApp/FB/LinkedIn/X can't decode → blank cards). Generate a 1200×630 JPEG per page (the planner page already does this with `pondicherry-street.jpg`); point only social meta at `.jpg`, keep on-page `<img>` as AVIF.
2. **Resolve rating drift.** `index.html:1682` shows "4.8 · Rated on Google"; all JSON-LD says `4.9/42`. Make banner + every JSON-LD identical (use the true live value, 4.8). Visible/markup mismatch risks star-snippet suppression sitewide.
3. **Add missing plural/budget keywords to `hotels-near-jipmer.html`.** "budget hotel near JIPMER" = 0 pages; "premium hotels" (plural) = nowhere; "hotels in Pondicherry" only on bathtub page. Add H2s ("A premium hotel near JIPMER — without hotel prices"), work in "budget hotels near JIPMER", "hotels in Pondicherry near the hospital", "rooms near JIPMER from ₹2,000/night". Tie "Affordable Luxury" to budget intent.

**Do next (M, high impact):**
4. **Add FAQ + FAQPage schema to all 4 landing pages** (confirmed zero on hotels-near-jipmer, hotel-with-bathtub, guest-house, patient-family; index has 18). The `.faq-item` CSS already ships. Phrase questions as literal queries with self-contained citable answers (AI engines lift verbatim Q&A). Bump sitemap `<lastmod>` on every edit.
5. **Differentiate hotel vs guest-house pages + rebalance internal links.** Near-duplicate templates competing for the same SERP; link graph points the wrong way (guest-house-near-jipmer = 9 inbound, hotels-near-jipmer = 3, bathtub = 2). Make hotels-near-jipmer the canonical hotel page (hotel-vs-guest-house comparison, check-in, parking). Switch "Related stays" cards + footer anchors to point a meaningful share at the hotel/bathtub pages with varied descriptive anchors. Add an inline link from the index hero/intro.
6. **Own the bathtub niche fully.** Lowest-competition winnable term but the thinnest page (~637 words, no FAQ, no price). Expand to ~900–1,100 words with keyword-bearing H2s, the rate, and a bolded atomic fact ("Both of Nivaa's 2 rooms have a private spa bathtub…") mirrored into the FAQ + llms.txt. Confirm a `LocationFeatureSpecification: Bathtub` node. Cross-link from celebration/patient-family/homepage with anchor "hotel with bathtub in Pondicherry".

**Schema / technical hygiene:**
7. **Fix AggregateRating support.** hotels-near-jipmer, bathtub, guest-house emit 4.9/42 with zero on-page reviews (policy risk + snippet suppression). Surface 2–3 real review excerpts (reuse index Review nodes) on each so the rating is page-supported.
8. **Strip lodging AggregateRating off the 5 itinerary/travel-guide pages** — a 4.9/42 lodging rating on review-less informational content can flag the legitimate stars on the room pages. Keep only a lightweight `@id` LodgingBusiness reference.
9. **Promote the full `#lodging` node onto every landing page** (sameAs, description, ≥1 review) — AI crawlers often land deep without fetching the homepage. Keep `["LodgingBusiness","Hotel"]`; add `checkinTime`, `checkoutTime`, `numberOfRooms:2`, `petsAllowed`, `priceRange:"₹2000-₹3000"`, business-level `amenityFeature` (Wi-Fi, free parking, **bathtub**, AC, home-cooked meals), self-assessed `starRating`. **No 24/7-front-desk claim.**
10. **Hero LCP on landing pages.** Above-fold hero AVIF carries `loading="lazy"` with no preload/`fetchpriority`. Drop `lazy` from the single hero, add `fetchpriority="high"` + `<link rel=preload as=image>` matching the rendered variant. Fix the index preload href to match the rendered `-sm.avif`.
11. **Resolve the two travel-guide pages** (`stay-guide.html` vs `pondicherry-travel-guide.html`) cannibalizing the same query. Keep `pondicherry-travel-guide.html` public; retarget `stay-guide.html` to an in-stay guest angle + noindex; re-point internal links.
12. **Add Speakable spec** to the FAQ answer block + headline fact on index/hotels-near-jipmer/bathtub (pure JSON-LD).
13. **Add llms.txt + AI-crawler `Allow`** (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, CCBot). Entity card: one-line definition, NAP, "~5 min / 1.5 km from JIPMER", "2 rooms both with private bathtubs", rates, phone, booking link, canonical page links + OTA listings. Add to `.assetsignore` exceptions so it serves.

## 4. Maps / Local SEO

*Category-constrained; realistic lever set in order.*

**Strategic (do first):**
1. **Accept Guest house as primary; stop appealing Hotel.** Confirmed live as Guest house yet ranking on hotel-intent terms — the appeal is unnecessary and the flip-flopping destabilizes the listing. Add approvable secondaries: Bed & breakfast, Serviced/Extended stay, Inn. Never add Hotel.
2. **Fix the Vanur→Gorimedu NAP conflict** (highest-leverage Maps fix). PostalAddress locality says "Vanur" (~18 km south) while geo (11.96232, 79.79309), pincode 605009, footer, Justdial say Gorimedu/JIPMER. Pick **Gorimedu / Dhanvantri Nagar** as canonical visible locality everywhere. Fix `rank-app-script.js:152` `resolvePlaceId()` → "Nivaa Stays, near JIPMER, Puducherry".
3. **Defend the bathtub term structurally — strongest, and regressing.** GBP local relevance reads GBP's own attributes, not site schema. Enable every bathtub/private-bathroom/hot-tub amenity the Guest house category exposes. Pair with 1–2 bathtub Posts/month + seed "spa bathtub" into solicited review text.
4. **Set GBP `priceLevel` = budget/value (₹–₹₹).** Currently blank (all 9 peers blank — opportunity). Aligns with "budget hotel near JIPMER" (your durable all-time-best, #10). Keep site `priceRange` consistent.

**Velocity & prominence (cheap, repeatable, category-agnostic):**
5. **Plug the review-velocity leak.** The g.page CTA reaches only 2 of 14 pages, absent from welcome.html / checkin / post-checkout. Add a one-tap review button to welcome.html (per-booking via `?id=`) + departure flow. Owner replies to every review embedding "guest house near JIPMER" / "rooms near JIPMER".
6. **Sustainable freshness cadence:** 1 Post/week (bathtub / JIPMER-proximity / budget-rate / home-cooked, each with "near JIPMER" text); geo-tagged photos/short videos monthly; seed 4–6 owner Q&A pairs injecting target tokens.
7. **Capture hotel-intent OFF the local pack.** Keep hotels-near-jipmer + bathtub pages as primary capture (organic + AI). Ensure Booking/Agoda/MMT listings are complete (your proxy into the hotel vertical / Google Hotels). Enrol GBP in **Google Hotels free booking links** (free, no Hotel category) so nivaastays.com shows as direct-booking alongside OTAs. Re-scope the rank tracker: the 6 hotel-pack keywords are organic/OTA plays, not Maps-pack.
8. **Business name:** do NOT keyword-stuff (suspension risk > gain for 2 rooms). Use the real signage/legal name. Capture tokens via description, services, Posts.

## 5. Planner SEO

*`/pondicherry-itinerary` React tool — top-of-funnel acquisition that currently dead-ends and is invisible per-cohort.*

1. **Prerender the 8 cohort pages (keystone).** Confirmed: `?itinerary=couples-1d` serves the SAME generic HTML as the bare planner (one canonical, cohort applied client-side only). Add an SSG step looping `CURATED` → 8 static deep-link pages (e.g. `/pondicherry-itinerary/couples-1-day/`), each with cohort `<title>`/`<h1>`, the "why" paragraph + ordered stop list as visible HTML, self-canonical, React mount reading the slug. Repoint guide-article buttons from `?itinerary=` to clean URLs. 1 thin page → 9 indexable pages. *(Everything below depends on this.)*
2. **Add the booking/hotel CTA into the planner.** The static fallback has one buried footer link and ZERO links to the hotel cluster. Add a persistent "Stay near JIPMER / book your base" CTA (static fallback + React shell) → booking + hotels-near-jipmer + hotel-with-bathtub. On each cohort page add "Where to stay for this trip". Builds conversion + pushes link equity into the hotel cluster.
3. **Emit per-cohort TouristTrip schema** (name = cohort title, `itinerary` = `ItemList`→`TouristAttraction` from `curated.ts`, `provider` = the LodgingBusiness, `@id` tied to `#lodging`).
4. **Add the 8 cohort pages to sitemap.xml** (extensionless, `<lastmod>`); resubmit + Request Indexing. Do NOT add `?itinerary=` URLs.
5. **Add reciprocal planner→guide links** (couples→`-for-couples`, family→`-for-families`, bachelors→`-for-friends`, solo→`-for-solo-travellers`).
6. **De-conflict the duplicate FAQPage** (planner emits byte-identical Q&As to `/guides/pondicherry-itinerary`). Keep FAQPage on the long-form guide; give the planner tool-specific questions.
7. **Fix the cohort naming fork** (`curated.ts` "Bachelors' Trip"/`bachelors-Nd` vs the indexed `…-for-friends`). Lead visible labels with "Friends / Group Trip"; keep `bachelors-Nd` as internal key only.
8. *(Low)* code-split the 598 KB planner bundle only if touched.

## 6. Off-page authority & citations

1. **Claim Tripadvisor** (absent from sameAs) under B&B / Specialty Lodging — sidesteps the Hotel block, highest-authority travel citation, ranks on "best stays near JIPMER", reviews still help there. Canonical NAP, add URL to sameAs + OTA strip + footer; seed 5–10 reviews via post-checkout WhatsApp.
2. **Add India directories:** Goibibo, Sulekha, AsiaRooms (accept guest houses). Maintain a one-row NAP-of-record, paste verbatim everywhere; add verified URLs to sameAs + footer.
3. **Diversify the review ask off Google** — rotate the post-checkout CTA across Airbnb/Booking/MMT/Tripadvisor matched to the channel each guest booked through.
4. **Upgrade `where-to-stay-near-jipmer.html` into a linkable asset** (it has zero outbound links). Add a JIPMER appointment + stay-logistics table + honest outbound links; pitch to JIPMER patient/student forums, regional bloggers, INTACH as link bait.
5. **Hyper-local patient-family outreach (L, high value):** JIPMER social-work-desk handouts / patient-support NGO "where to stay" pages; referral arrangements with local cab operators + overflow guesthouses. 5–10 hyper-relevant citations move prominence more than dozens of generic directories.

## 7. Quick wins this week (S-effort, high impact)

1. Rating drift → single value (4.8) in banner + all JSON-LD.
2. Vanur→Gorimedu locality fixed across GBP, site, footer, Justdial, rank script.
3. GBP: primary = Guest house (stop appealing), enable bathtub amenity, set priceLevel = budget, add lodging secondaries.
4. Review CTA into welcome.html + checkin + departure flow.
5. Plural/budget keywords into hotels-near-jipmer.
6. llms.txt + AI-crawler Allow rules.
7. *(Spills to M, start now)* AVIF→JPEG og:image on the 17 pages — biggest single ROI given WhatsApp distribution.

## 8. Sequenced roadmap

- **Week 1 — Trust, NAP & the WhatsApp bug (all S):** GBP category decision + priceLevel + bathtub attribute → rating drift → Vanur/Gorimedu NAP → review CTA in guest flow → llms.txt + robots AI rules. Kick off AVIF→JPEG og:image in parallel. *Foundations every other surface inherits; stops the destabilizing appeal churn.*
- **Week 2 — On-page money pages (M):** FAQ + FAQPage on the 4 pages → differentiate hotel vs guest-house + rebalance links → plural/budget keywords → expand bathtub page → enrich/standardize the `#lodging` node (keep Hotel type) → support/strip AggregateRating per page → hero LCP → resolve the two travel-guide pages. Bump sitemap lastmod on every edit.
- **Week 3 — Planner acquisition engine (M):** prerender 8 cohort pages → booking/hotel CTA in planner → TouristTrip schema → sitemap + index → reciprocal guide links → FAQPage de-conflict → naming fork fix.
- **Ongoing (start Week 1):** Tripadvisor + Goibibo/Sulekha/AsiaRooms citations → diversified off-Google review asks → weekly GBP Post + monthly geo-photo + owner Q&A/review replies → patient-family network outreach.

---

**Repo-relevant files:** `index.html` (rating drift ~line 1682, PostalAddress locality), the JIPMER cluster pages, `hotel-with-bathtub-pondicherry.html`, `robots.txt`, `sitemap.xml`, `_worker.js`/`.assetsignore` (llms.txt serving), `apps-script/rank-app-script.js` (`resolvePlaceId`), `planner-src/src/curated.ts`, `welcome.html`/`checkin.html`/`js/hub.js` (review CTA), `where-to-stay-near-jipmer.html`. GBP/Tripadvisor/citation items are dashboard work, not repo.
