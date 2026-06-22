# Nivaa Stays — Local Rank Diagnosis & Plan

> **Status:** parked for later action. Diagnosis only — no code/GBP changes made yet.
> **Data snapshot:** pulled 2026-06-22 from the rank Apps Script (`?rankData=1`, `?compData=1`, `?gbpAudit=1`).
> **Coverage:** 7 weekly scans (2026-06-06 → 06-22), 14 keywords, 5×5 geo-grid (1.2 km step) centred on Nivaa/JIPMER.
> **Method:** 5 independent analytical lenses + adversarial verification of every claim against the raw data (17-agent workflow).

---

## 1. The underlying gap

**Nivaa is under-prominent as an entity — not under-reviewed, not mis-categorized.** It sits at the exact centre of the grid yet ranks only #7–#10 on its two best terms and is invisible (0/25 cells) on more than half its keywords — while a *same-typed* Guest House peer (Ashwini Residency, 3.9★/102 reviews) wins **96 top-10 cell-slots to Nivaa's 19**. Google doesn't yet consider Nivaa relevant/authoritative enough to surface, and that prominence ceiling is what's holding rank flat.

## 2. Why "more reviews + posts" hasn't moved the needle

In this market, **review count does not drive rank — it's negatively correlated with it** (reviews vs Share-of-Voice: Spearman **−0.46**; rating correlation ~0). Le Royal Villa wins #1-in-cell on **24–25 of 25 cells** on every hotel keyword Nivaa competes on, with **20 reviews**. The 5,000+-review giants (Promenade, Annamalai, Accord) sit at the *bottom* of the board (~14% SoV).

Two more reasons the effort is invisible:
- **Below the pack reviews would help.** Reviews lift you *within* a pack you already appear in. Nivaa is top-10 in only **19/350 cells (5.4%)** and **0/350 top-3** — almost nothing for reputation signals to act on.
- **The metric averages real wins away** (see §4).

Correction to an internal assumption: Nivaa is **not** the top-rated property in the field — Harkesh (5.0) and GATEWAY (4.9) beat 4.8; Pondicherry Comfort Rooms ties it. **Rating is not the moat.**

## 3. Ranked contributing causes

| # | Cause | Evidence | Confidence |
|---|---|---|---|
| 1 | **Low entity prominence** — ranks #7/#10 even at its own centre pin; never top-3 anywhere | bathtub #7, budget #10; absent from centre on 8/14 keywords; 0/350 top-3 | **High** |
| 2 | **Same-class peers out-rank you on prominence, not type** | Ashwini (identical Guest House type, 3.9★) holds 96 top-10 slots vs Nivaa's 19 (5×) | **High** |
| 3 | **Top-3 gated by full-grid relevance dominance** | Le Royal Villa #1 in 24–25/25 cells on every competing hotel term, on 20 reviews | **High** |
| 4 | **On-category term abandoned** — 0/25 on "guest house near JIPMER" despite *being* a Guest House | 0/25 cells, ARP flat 21 across all 7 scans | **High** |
| 5 | **Name carries zero query keywords** — "Nivaa Stays / Le Affordable Luxury" matches no intent token | 20/24 competitors embed "Guest House"/"Rooms"/"JIPMER" | **Medium** |
| 6 | **Blank priceLevel** in GBP | empty (all 9 audited are blank — opportunity, not penalty) | **Medium** |

**Do NOT chase (refuted / unsupported):**
- ❌ **"Reviews will lift rank."** Negative correlation; exhausted as a tactic.
- ❌ **"Eligible keywords improving ~2.4× faster."** Cherry-picked off the worst baseline; eligible-6 blend is statistically flat. Only **one** keyword genuinely improving.
- ❌ **"Bathtub term at its best, trending up."** It *regressed* from 8.52 (06-08) → 9.44. Strongest term, wrong direction.
- ⚠️ **"The Hotel category change is the problem."** Counter-indicated: Nivaa is live as **Guest House** (no hotel type) yet ranks best on hotel-intent terms and 0/25 on guest-house terms. **Confirm live category in GBP dashboard before acting** — don't flip-flop.

## 4. The metric is lying to you

Headline ARP (19.35 → 18.84 over 7 scans, range **0.72**) reads "nothing moving" — a measurement artifact:
- **254/350 cells (72.6%)** pinned at the not-found value (21). Six keywords dead in *every* scan.
- A 1-rank gain on a 25/25 keyword moves the all-14 ARP by only **1/14 = 0.07** — the blend is **~14× damped**.

**What is actually working:**
- **budget hotel near JIPMER: 14.8 → 11.84 (all-time best)**, 25/25 cells, cracking #10. The one durable, genuine win.
- **hotel with bathtub near JIPMER:** strongest term (best #7, 16/25 top-10) but **regressing** from its 8.52 peak — defend it.
- Everything else is weekly noise.

## 5. Action plan, prioritized

### Do this week
1. **Confirm the live GBP primary category** (data says Guest House — no hotel type). Decide deliberately; stop flip-flopping.
2. **Set priceLevel** in GBP (blank now; tag "budget/value" to match where Nivaa wins).
3. **Add bathtub as a structured amenity attribute** (not just review text) — #1 term and slipping.
4. **Fix the dashboard metric** — kill the single all-14 ARP headline; show per-keyword **#cells-in-top-10** + **avg-rank-where-found**, split competing (6) vs zero-coverage (8). → code change in `js/rank.js`.
5. **Honest relevance in GBP description / services / posts** — "guest house," "rooms near JIPMER," "near JIPMER hospital."

### Do this quarter
6. **Focus the winnable JIPMER-proximity wedge — 4 terms:** budget hotel near JIPMER (push wider), hotel with bathtub (stop the regression), hotels near JIPMER (#13 → top-10 conversion), guest house near JIPMER (0/25 reclaim — beaten by *smaller* peers, so winnable with relevance work).
7. **Build prominence, not review volume:** local citations, links from Pondicherry/JIPMER-adjacent directories, complete structured attributes, steady GBP activity. ~100 reviews = *parity with Ashwini*, **not** the lever. Out-reviewing Accord (8,108) is irrelevant.

### Stop doing
8. Treating review velocity as the fix.
9. **Cut 6 dead terms from tracking** (hotels in Pondicherry, hotels-with-bathtub-in-Pondicherry, guest house in Pondicherry, pet-friendly-stay Pondicherry, premium hotels near JIPMER, service apartment near JIPMER) — *keep* "stay near JIPMER Pondicherry" (#4–5). Dropping the 6 dead terms alone lifts blended ARP **18.84 → 17.21**. → edit `RANK_KEYWORDS` in `apps-script/rank-app-script.js` (also cuts ~150 → ~90 Places API calls/week).
10. Optimizing for "premium" (0/25). Winnability is the **budget/amenity** niche.

**Bottom line:** the strategy isn't failing — it's *measuring the wrong thing and pulling the wrong lever*. Reviews are maxed as a tactic. Win by getting **more relevant and prominent in the ~1–2 km JIPMER patient-family wedge**, tracking per-keyword top-10 cells, and protecting the budget-hotel win already in hand.

---

## Concrete code follow-ups (when we pick this up)
- **`js/rank.js`** — replace the all-14 ARP headline with per-keyword top-10-cell-count + avg-rank-where-found; split "competing" vs "zero-coverage" keyword groups.
- **`apps-script/rank-app-script.js`** — trim `RANK_KEYWORDS` to the winnable wedge (cut the 6 dead terms above; keep "stay near JIPMER Pondicherry").
