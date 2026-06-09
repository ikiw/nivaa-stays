// =====================================================
// Nivaa Stays — Local Rank Tracker (STANDALONE Apps Script)
// Separate from the Bookings script: keeps the unauthenticated rank endpoint
// and the Places API key away from all booking/guest data.
//
// SETUP:
//   1. Create a new Google Sheet "Nivaa Rankings" → Extensions → Apps Script.
//   2. Paste this whole file in (replacing Code.gs).
//   3. Google Cloud → enable "Places API (New)", create an API key (billing on).
//   4. Project Settings → Script Properties → add:
//        PLACES_API_KEY = <your key>
//   5. Run resolvePlaceId() once → copy the logged id into a Script Property:
//        NIVAA_PLACE_ID = <Nivaa's place id>
//   6. Run rankScan() once to seed the first week.
//   7. Run installRankTrigger() once (weekly Mon 06:00 IST).
//   8. Deploy → New deployment → Web app → Execute as "Me", Access "Anyone".
//      Copy the /exec URL into RANK_SCRIPT_URL in site/js/rank.js.
//
// NOTE: bound to its own sheet, so getActiveSpreadsheet() works as-is. If you
// run this as a STANDALONE (unbound) script instead, set RANK_SHEET_ID below
// and the code uses openById().
// =====================================================

const TZ = 'Asia/Kolkata';

const RANK_KEYWORDS = [
  // Hotel intent — primary focus after the Hotel primary-category change
  'hotels near JIPMER',
  'hotel near JIPMER',
  'premium hotels near JIPMER',
  'hotels in Pondicherry',
  'budget hotel near JIPMER',
  'rooms near JIPMER',
  // Bathtub niche — strong, low-competition differentiator
  'hotels with bathtub in Pondicherry',
  'hotel with bathtub near JIPMER',
  // Guest-house intent — keep, to watch for any drop
  'guest house near JIPMER',
  'guest house in Pondicherry',
  'stay near JIPMER Pondicherry',
  'family stay near JIPMER',
  'pet friendly stay Pondicherry',
  'service apartment near JIPMER'
];
const RANK_GRID    = { centerLat: 11.96232, centerLng: 79.79309, size: 5, stepKm: 1.2 };
const RANK_SHEET   = 'Rank Scans';
const RANK_HEADERS = ['Scan Date', 'Keyword', 'Row', 'Col', 'Lat', 'Lng', 'Rank', 'Top IDs'];
const RANK_TOPN    = 20;                 // how deep we read each result list
const NOT_FOUND_RANK = RANK_TOPN + 1;    // rank value used in ARP math when absent

// Competitor Share-of-Voice: we already fetch the full ranked list per cell —
// store the top-N ids ('Top IDs' column) and resolve their names/ratings into a
// Competitors sheet for the SoV dashboard (?compData=1).
const COMP_TOPN    = 20;                  // ids stored per cell (we fetch RANK_TOPN anyway)
const COMP_SHEET   = 'Competitors';
const COMP_HEADERS = ['Place ID', 'Name', 'Rating', 'Reviews', 'Type', 'Updated'];
const COMP_MAX     = 40;                  // cap competitors resolved per run (cost control)
const RANK_SHEET_ID = '';                // leave '' if bound; set if standalone

// ---------- helpers ----------

function rankSpreadsheet_() {
  return RANK_SHEET_ID
    ? SpreadsheetApp.openById(RANK_SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function ymd_(d) {
  if (!d) return '';
  if (Object.prototype.toString.call(d) === '[object Date]') {
    return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
  }
  const parsed = new Date(d);
  if (!isNaN(parsed)) return Utilities.formatDate(parsed, TZ, 'yyyy-MM-dd');
  return String(d);
}

function getOrCreateSheet_(name, headers) {
  const ss = rankSpreadsheet_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.appendRow(headers);
    sh.setFrozenRows(1);
  }
  return sh;
}

// ---------- web app ----------

function doGet(e) {
  const params = (e && e.parameter) || {};
  if (params.rankData != null) return rankData_();
  if (params.compData != null) return compData_();
  if (params.gbpAudit != null) return gbpAudit_();
  if (params.itinData != null) return itinData_();
  return jsonOut_({ ok: true, service: 'nivaa-rank' });
}

// ---------- geo-grid rank tracker ----------

// size×size grid centered on the business; stepKm spacing between points.
function rankGridPoints_() {
  const { centerLat, centerLng, size, stepKm } = RANK_GRID;
  const half = (size - 1) / 2;
  const dLat = stepKm / 110.574;                                          // km per ° latitude
  const dLng = stepKm / (111.320 * Math.cos(centerLat * Math.PI / 180));  // km per ° longitude
  const pts = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      pts.push({
        row: r, col: c,
        lat: Number((centerLat + (r - half) * dLat).toFixed(6)),
        lng: Number((centerLng + (c - half) * dLng).toFixed(6))
      });
    }
  }
  return pts;
}

// Places API (New) Text Search biased to a lat/lng → ordered array of place ids.
function placesTextSearch_(keyword, lat, lng) {
  const key = PropertiesService.getScriptProperties().getProperty('PLACES_API_KEY');
  if (!key) throw new Error('PLACES_API_KEY script property not set');
  const res = UrlFetchApp.fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'post',
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id' },
    payload: JSON.stringify({
      textQuery: keyword,
      pageSize: RANK_TOPN,
      locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: 1500.0 } }
    })
  });
  if (res.getResponseCode() !== 200) {
    Logger.log('Places error %s: %s', res.getResponseCode(), res.getContentText().slice(0, 200));
    return [];
  }
  const body = JSON.parse(res.getContentText() || '{}');
  return (body.places || []).map(p => p.id);
}

// Run ONCE from the editor; paste the logged id into the NIVAA_PLACE_ID property.
function resolvePlaceId() {
  const ids = placesTextSearch_('Nivaa Stays, Vanur, Puducherry', RANK_GRID.centerLat, RANK_GRID.centerLng);
  Logger.log('Top place ids (the first should be Nivaa Stays): %s', JSON.stringify(ids.slice(0, 5)));
  Logger.log('→ paste the Nivaa id into Script Properties as NIVAA_PLACE_ID');
  return ids[0] || '';
}

// Weekly geo-grid scan — one row per keyword×point into the Rank Scans sheet.
// Trigger target; also safe to run manually from the editor.
function rankScan() {
  const placeId = PropertiesService.getScriptProperties().getProperty('NIVAA_PLACE_ID');
  if (!placeId) throw new Error('NIVAA_PLACE_ID not set — run resolvePlaceId() first');
  const sh = getOrCreateSheet_(RANK_SHEET, RANK_HEADERS);
  sh.getRange(1, 1, 1, RANK_HEADERS.length).setValues([RANK_HEADERS]); // keep header current (adds 'Top IDs')
  const scanDate = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const points = rankGridPoints_();
  const rows = [];
  for (const kw of RANK_KEYWORDS) {
    for (const pt of points) {
      const ids = placesTextSearch_(kw, pt.lat, pt.lng);
      const idx = ids.indexOf(placeId);
      const rank = idx === -1 ? 0 : idx + 1;     // 0 = not found in top N
      rows.push([scanDate, kw, pt.row, pt.col, pt.lat, pt.lng, rank, ids.slice(0, COMP_TOPN).join(',')]);
      Utilities.sleep(120);                       // gentle throttle
    }
  }
  // Idempotent per day: drop any existing rows for today's scan date, keep prior
  // days, then write today's fresh rows. So a manual re-run (or an accidental
  // double trigger) overwrites today's scan instead of duplicating it.
  const lastRow = sh.getLastRow();
  let kept = [];
  if (lastRow > 1) {
    kept = sh.getRange(2, 1, lastRow - 1, RANK_HEADERS.length).getValues()
             .filter(r => ymd_(r[0]) !== scanDate);
    sh.getRange(2, 1, lastRow - 1, RANK_HEADERS.length).clearContent();
  }
  const out = kept.concat(rows);
  if (out.length) sh.getRange(2, 1, out.length, RANK_HEADERS.length).setValues(out);
  Logger.log('rankScan %s: wrote %s rows (%s kept from prior days)', scanDate, rows.length, kept.length);
}

// doGet?rankData=1 — aggregated scan history for the admin dashboard.
function rankData_() {
  const sh = rankSpreadsheet_().getSheetByName(RANK_SHEET);
  if (!sh || sh.getLastRow() < 2) return jsonOut_({ scans: [], keywords: [], gridSize: RANK_GRID.size });
  const data = sh.getDataRange().getValues();
  const H = data[0].map(c => String(c).trim());
  const ix = h => H.indexOf(h);
  const rows = data.slice(1).map(r => ({
    date: ymd_(r[ix('Scan Date')]),
    keyword: String(r[ix('Keyword')]),
    row: Number(r[ix('Row')]), col: Number(r[ix('Col')]),
    lat: Number(r[ix('Lat')]), lng: Number(r[ix('Lng')]),
    rank: Number(r[ix('Rank')])
  })).filter(r => r.keyword);

  const scans = Array.from(new Set(rows.map(r => r.date))).sort();
  const latest = scans[scans.length - 1];
  const keywords = Array.from(new Set(rows.map(r => r.keyword)));

  const arp = rs => {
    if (!rs.length) return null;
    const vals = rs.map(r => (r.rank === 0 ? NOT_FOUND_RANK : r.rank));
    return Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2));
  };

  const out = keywords.map(kw => {
    const kwRows = rows.filter(r => r.keyword === kw);
    const latestRows = kwRows.filter(r => r.date === latest);
    const top3 = latestRows.filter(r => r.rank >= 1 && r.rank <= 3).length;
    const ranked = latestRows.filter(r => r.rank >= 1).map(r => r.rank);
    return {
      keyword: kw,
      latestGrid: latestRows.map(r => ({ row: r.row, col: r.col, lat: r.lat, lng: r.lng, rank: r.rank })),
      arpHistory: scans.map(d => ({ date: d, arp: arp(kwRows.filter(r => r.date === d)) })),
      currentArp: arp(latestRows),
      bestRank: ranked.length ? Math.min.apply(null, ranked) : 0,
      top3Coverage: latestRows.length ? Number((100 * top3 / latestRows.length).toFixed(0)) : 0
    };
  });
  return jsonOut_({ scans, latest, gridSize: RANK_GRID.size, notFoundRank: NOT_FOUND_RANK, keywords: out });
}

// Run ONCE from the editor — weekly Monday 06:00 IST scan. Idempotent.
function installRankTrigger() {
  const FN = 'rankScan';
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === FN) ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger(FN).timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(6).inTimezone(TZ).create();
  Logger.log('Installed weekly trigger for %s (Mon 06:00 %s)', FN, TZ);
}

// ============================================================
// Competitor Share-of-Voice — built on the ranked lists already captured by
// rankScan() in the 'Top IDs' column. resolveCompetitors() turns place ids into
// names/ratings; compData_() (?compData=1) computes SoV + per-competitor grids.
// ============================================================

// Place Details (New) for one place id → { name, rating, reviews, type }.
function placeDetails_(id) {
  const key = PropertiesService.getScriptProperties().getProperty('PLACES_API_KEY');
  const res = UrlFetchApp.fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(id), {
    method: 'get',
    muteHttpExceptions: true,
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount,primaryTypeDisplayName' }
  });
  if (res.getResponseCode() !== 200) {
    Logger.log('Place Details %s for %s → %s', res.getResponseCode(), id, res.getContentText().slice(0, 250));
    return { name: '', rating: '', reviews: '', type: '' };
  }
  const b = JSON.parse(res.getContentText() || '{}');
  return {
    name:    (b.displayName && b.displayName.text) || '',
    rating:  b.rating || '',
    reviews: b.userRatingCount || '',
    type:    (b.primaryTypeDisplayName && b.primaryTypeDisplayName.text) || ''
  };
}

// Resolve the most-common competitor place ids from the latest scan into names +
// ratings. Run after rankScan() (cheap: Place Details on up to COMP_MAX ids).
function resolveCompetitors() {
  const nivaa = PropertiesService.getScriptProperties().getProperty('NIVAA_PLACE_ID');
  const sh = rankSpreadsheet_().getSheetByName(RANK_SHEET);
  if (!sh || sh.getLastRow() < 2) { Logger.log('No scans yet.'); return; }
  const data = sh.getDataRange().getValues();
  const H = data[0].map(c => String(c).trim());
  const dCol = H.indexOf('Scan Date'), tCol = H.indexOf('Top IDs');
  if (tCol === -1) { Logger.log('No Top IDs column — re-run rankScan() with the updated script first.'); return; }
  const dates = data.slice(1).map(r => ymd_(r[dCol])).filter(Boolean).sort();
  const latest = dates[dates.length - 1];
  const freq = {};
  data.slice(1).forEach(r => {
    if (ymd_(r[dCol]) !== latest) return;
    String(r[tCol] || '').split(',').filter(Boolean).forEach(id => {
      if (id !== nivaa) freq[id] = (freq[id] || 0) + 1;
    });
  });
  const ids = Object.keys(freq).sort((a, b) => freq[b] - freq[a]).slice(0, COMP_MAX);
  const out = [];
  ids.forEach(id => {
    const d = placeDetails_(id);
    out.push([id, d.name, d.rating, d.reviews, d.type, latest]);
    Utilities.sleep(80);
  });
  const cs = getOrCreateSheet_(COMP_SHEET, COMP_HEADERS);
  cs.getRange(1, 1, 1, COMP_HEADERS.length).setValues([COMP_HEADERS]);
  if (cs.getLastRow() > 1) cs.getRange(2, 1, cs.getLastRow() - 1, COMP_HEADERS.length).clearContent();
  if (out.length) cs.getRange(2, 1, out.length, COMP_HEADERS.length).setValues(out);
  const named = out.filter(r => r[1]).length;
  Logger.log('Resolved %s competitors (%s with names) for %s. First id tried: %s', out.length, named, latest, ids[0] || '(none)');
}

// doGet?compData=1 — Share of Voice leaderboard + per-keyword grids (latest scan).
function compData_() {
  const nivaa = PropertiesService.getScriptProperties().getProperty('NIVAA_PLACE_ID');
  const sh = rankSpreadsheet_().getSheetByName(RANK_SHEET);
  if (!sh || sh.getLastRow() < 2) return jsonOut_({ ready: false });
  const data = sh.getDataRange().getValues();
  const H = data[0].map(c => String(c).trim());
  const ix = h => H.indexOf(h);
  if (ix('Top IDs') === -1) return jsonOut_({ ready: false, reason: 'no Top IDs — re-run rankScan()' });

  const rows = data.slice(1).map(r => ({
    date: ymd_(r[ix('Scan Date')]), keyword: String(r[ix('Keyword')]),
    row: Number(r[ix('Row')]), col: Number(r[ix('Col')]),
    ids: String(r[ix('Top IDs')] || '').split(',').filter(Boolean)
  })).filter(r => r.keyword && r.ids.length);
  if (!rows.length) return jsonOut_({ ready: false });

  const scans = Array.from(new Set(rows.map(r => r.date))).sort();
  const latest = scans[scans.length - 1];
  const latestRows = rows.filter(r => r.date === latest);
  const total = latestRows.length;
  const keywords = Array.from(new Set(latestRows.map(r => r.keyword)));

  // appearance counts in top-3 / top-10, and average position, across all cells
  const f3 = {}, f10 = {}, sumRank = {}, cnt = {};
  latestRows.forEach(r => {
    r.ids.slice(0, 3).forEach(id => f3[id] = (f3[id] || 0) + 1);
    r.ids.slice(0, 10).forEach(id => f10[id] = (f10[id] || 0) + 1);
    r.ids.forEach((id, i) => { sumRank[id] = (sumRank[id] || 0) + (i + 1); cnt[id] = (cnt[id] || 0) + 1; });
  });

  // names/ratings lookup from the Competitors sheet
  const cs = rankSpreadsheet_().getSheetByName(COMP_SHEET);
  const meta = {};
  if (cs && cs.getLastRow() > 1) {
    const cd = cs.getDataRange().getValues();
    const CH = cd[0].map(c => String(c).trim());
    const cix = h => CH.indexOf(h);
    cd.slice(1).forEach(r => {
      meta[String(r[cix('Place ID')])] = {
        name: r[cix('Name')], rating: r[cix('Rating')], reviews: r[cix('Reviews')], type: r[cix('Type')]
      };
    });
  }

  const board = Object.keys(f10).map(id => ({
    id,
    isNivaa: id === nivaa,
    name: (meta[id] && meta[id].name) || (id === nivaa ? 'Nivaa Stays' : '(unresolved)'),
    rating: meta[id] ? meta[id].rating : '',
    reviews: meta[id] ? meta[id].reviews : '',
    sov10: Math.round(100 * (f10[id] || 0) / total),
    sov3: Math.round(100 * (f3[id] || 0) / total),
    avgRank: cnt[id] ? Number((sumRank[id] / cnt[id]).toFixed(1)) : null
  })).sort((a, b) => b.sov10 - a.sov10).slice(0, 25);

  // per-keyword grids (top-10 ids per cell) for client-side competitor heatmaps
  const grids = {};
  latestRows.forEach(r => {
    (grids[r.keyword] = grids[r.keyword] || []).push({ row: r.row, col: r.col, ids: r.ids.slice(0, 10) });
  });

  return jsonOut_({ ready: true, latest, gridSize: RANK_GRID.size, nivaaId: nivaa, keywords, competitors: board, grids });
}

// Rich Place Details for the GBP audit (category/types/price/reviews).
function auditDetails_(id) {
  const key = PropertiesService.getScriptProperties().getProperty('PLACES_API_KEY');
  const res = UrlFetchApp.fetch('https://places.googleapis.com/v1/places/' + encodeURIComponent(id), {
    method: 'get',
    muteHttpExceptions: true,
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'id,displayName,primaryTypeDisplayName,types,rating,userRatingCount,priceLevel,businessStatus' }
  });
  if (res.getResponseCode() !== 200) { Logger.log('audit %s for %s', res.getResponseCode(), id); return null; }
  const b = JSON.parse(res.getContentText() || '{}');
  return {
    id: id,
    name:        (b.displayName && b.displayName.text) || '',
    primaryType: (b.primaryTypeDisplayName && b.primaryTypeDisplayName.text) || '',
    types:       b.types || [],
    rating:      b.rating || '',
    reviews:     b.userRatingCount || '',
    priceLevel:  b.priceLevel || '',
    status:      b.businessStatus || ''
  };
}

// doGet?gbpAudit=1 — Nivaa vs top competitors: category, types, price, reviews.
function gbpAudit_() {
  const nivaa = PropertiesService.getScriptProperties().getProperty('NIVAA_PLACE_ID');
  const cs = rankSpreadsheet_().getSheetByName(COMP_SHEET);
  const compIds = [];
  if (cs && cs.getLastRow() > 1) {
    const cd = cs.getDataRange().getValues();
    const idCol = cd[0].map(c => String(c).trim()).indexOf('Place ID');
    cd.slice(1).forEach(r => { if (r[idCol]) compIds.push(String(r[idCol])); });
  }
  const ids = [nivaa].concat(compIds.slice(0, 8));
  const out = ids.map(id => { const d = auditDetails_(id); Utilities.sleep(80); return d; }).filter(Boolean);
  out.forEach(o => o.isNivaa = o.id === nivaa);
  return jsonOut_({ audit: out });
}

// ============================================================
// Itinerary builder data — one-time generator.
// Resolves a curated place list (Places API) + a driving distance/time matrix
// (Routes API computeRouteMatrix), and stores the assembled JSON for the
// client-side day-planner. The live tool reads a STATIC copy of this — zero
// per-user API cost. Re-run buildItineraryData() when the list changes.
// SETUP: enable "Routes API" in the Cloud project. The Places key works if
// Routes is enabled on it; otherwise add a ROUTES_API_KEY script property.
// ============================================================

const ITIN_SHEET = 'Itin Data';

// The editable place catalog lives in the repo and is served as a static file
// (data/pondicherry-places.json). buildItineraryData() fetches it, resolves each
// place's coordinates via the Places API (community-sourced coords are NOT trusted),
// and builds the driving matrix. To add/edit places: edit the catalog JSON, push,
// then re-run buildItineraryData() and re-bake the static itinerary file.
const ITIN_CATALOG_URL = 'https://nivaastays.com/data/pondicherry-places.json';

// Text-search query overrides for names the Places API resolves poorly.
// Anything not listed defaults to "<name>, Puducherry".
const ITIN_QUERY = {
  'Sacred Heart Basilica':       'Basilica of the Sacred Heart of Jesus, Pondicherry',
  'Manakula Vinayagar Temple':   'Sri Manakula Vinayagar Temple, Pondicherry',
  'Matrimandir (Auroville)':     'Matrimandir, Auroville',
  'Bread & Chocolate':           'Bread and Chocolate, Auroville',
  'Auroville Bakery':            'Auroville Bakery and Boutique',
  "Boutique d'Auroville":        "La Boutique d'Auroville, Pondicherry",
  'Bharathi Park (White Town)':  'Bharathi Park, Pondicherry',
  'Auroville Beach':             'Auroville Beach',
  // start areas
  'Pondicherry Gate (entrance)': 'Pondicherry Gate, Puducherry',
  'White Town (French Quarter)': 'French Quarter, Pondicherry',
  'Beach Road (Promenade)':      'Goubert Avenue, Pondicherry',
  'Pondicherry Bus Stand':       'Puducherry Bus Stand',
  'Puducherry Railway Station':  'Puducherry Railway Station',
  'Auroville':                   'Auroville Visitor Centre',
  'Mission Street':              'Mission Street, Pondicherry'
};
function itinQuery_(name) { return ITIN_QUERY[name] || (name + ', Pondicherry'); }

// Resolve a place, trying the tuned query then spelling/area fallbacks.
function resolveBest_(name) {
  const tries = [itinQuery_(name), name + ', Pondicherry', name + ', Puducherry', name];
  const seen = {};
  for (let i = 0; i < tries.length; i++) {
    const q = tries[i];
    if (seen[q]) continue; seen[q] = 1;
    const r = resolvePlace_(q);
    if (r) return r;
    Utilities.sleep(60);
  }
  return null;
}

// Places Text Search → { name, lat, lng } for the top match.
function resolvePlace_(query) {
  const key = PropertiesService.getScriptProperties().getProperty('PLACES_API_KEY');
  const res = UrlFetchApp.fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'places.id,places.displayName,places.location' },
    payload: JSON.stringify({ textQuery: query, pageSize: 1 })
  });
  if (res.getResponseCode() !== 200) { Logger.log('resolve "%s" → %s', query, res.getResponseCode()); return null; }
  const p = (JSON.parse(res.getContentText() || '{}').places || [])[0];
  if (!p || !p.location) return null;
  return { lat: p.location.latitude, lng: p.location.longitude };
}

// Routes API computeRouteMatrix → { min:[[]], km:[[]] } driving matrix.
// Chunks origins so each call stays under the 625-element (origins×destinations) cap.
function routeMatrix_(points) {
  const key = PropertiesService.getScriptProperties().getProperty('ROUTES_API_KEY')
            || PropertiesService.getScriptProperties().getProperty('PLACES_API_KEY');
  const n = points.length;
  const wpAll = points.map(p => ({ waypoint: { location: { latLng: { latitude: p.lat, longitude: p.lng } } } }));
  const min = Array.from({ length: n }, () => new Array(n).fill(null));
  const km  = Array.from({ length: n }, () => new Array(n).fill(null));
  const batch = Math.max(1, Math.floor(600 / n));   // origins per call (≤600 elements)
  for (let o = 0; o < n; o += batch) {
    const origins = wpAll.slice(o, o + batch);
    let attempt = 0;
    for (;;) {
      const res = UrlFetchApp.fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        headers: { 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': 'originIndex,destinationIndex,distanceMeters,duration,condition' },
        payload: JSON.stringify({ origins: origins, destinations: wpAll, travelMode: 'DRIVE' })
      });
      const code = res.getResponseCode();
      if (code === 200) {
        JSON.parse(res.getContentText() || '[]').forEach(e => {
          if (e.condition === 'ROUTE_EXISTS') {
            const i = o + e.originIndex, j = e.destinationIndex;   // offset origin by batch start
            min[i][j] = Math.round((parseInt(e.duration, 10) || 0) / 60);
            km[i][j]  = Math.round((e.distanceMeters || 0) / 100) / 10;
          }
        });
        break;
      }
      if ((code === 429 || code >= 500) && attempt < 7) {
        attempt++;
        const wait = Math.min(60000, 3000 * Math.pow(2, attempt - 1));   // 3,6,12,24,48,60,60s
        Logger.log('Route Matrix %s (chunk @%s/%s) — backoff %ss (attempt %s)', code, o, n, wait / 1000, attempt);
        Utilities.sleep(wait);
        continue;
      }
      throw new Error('Route Matrix ' + code + ': ' + res.getContentText().slice(0, 250));
    }
    Utilities.sleep(1500);   // steady pace to stay under the per-minute element quota
  }
  return { min, km };
}

// Run ONCE from the editor. Resolves places + builds the matrix, stores the JSON
// in the 'Itin Data' sheet (served via doGet?itinData=1).
function buildItineraryData() {
  const cat = JSON.parse(UrlFetchApp.fetch(ITIN_CATALOG_URL, { muteHttpExceptions: true }).getContentText() || '{}');
  const starts = (cat.starts || []).map(name => ({ name: name, cat: 'Area', sub: '', desc: '', map: '' }));
  const places = (cat.places || []);
  const total = 1 + places.length + starts.length;
  // origin = Nivaa (grid centre is the Nivaa point)
  const points = [{ name: 'Nivaa Stays', cat: 'Stay', sub: '', desc: '', map: '', lat: RANK_GRID.centerLat, lng: RANK_GRID.centerLng }];
  places.concat(starts).forEach(p => {
    const r = resolveBest_(p.name);
    if (r) points.push({ name: p.name, cat: p.cat, sub: p.sub || '', desc: p.desc || '', map: p.map || '', lat: r.lat, lng: r.lng });
    else Logger.log('skipped (unresolved): %s', p.name);
    Utilities.sleep(120);
  });
  const m = routeMatrix_(points);
  const data = {
    generated: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'),
    origin: 0,
    places: points,
    minutes: m.min,
    km: m.km
  };
  const sh = getOrCreateSheet_(ITIN_SHEET, ['JSON']);
  sh.getRange(2, 1).setValue(JSON.stringify(data));
  Logger.log('Itinerary data built: %s of %s points resolved, %sx%s matrix.', points.length, total, points.length, points.length);
}

// doGet?itinData=1 — returns the stored itinerary JSON (for me to bake into a static file).
function itinData_() {
  const sh = rankSpreadsheet_().getSheetByName(ITIN_SHEET);
  if (!sh || sh.getLastRow() < 2) return jsonOut_({ ready: false });
  return ContentService.createTextOutput(sh.getRange(2, 1).getValue() || '{}')
    .setMimeType(ContentService.MimeType.JSON);
}
