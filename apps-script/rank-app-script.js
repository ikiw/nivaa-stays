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
const RANK_HEADERS = ['Scan Date', 'Keyword', 'Row', 'Col', 'Lat', 'Lng', 'Rank'];
const RANK_TOPN    = 20;                 // how deep we read each result list
const NOT_FOUND_RANK = RANK_TOPN + 1;    // rank value used in ARP math when absent
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
  const scanDate = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const points = rankGridPoints_();
  const rows = [];
  for (const kw of RANK_KEYWORDS) {
    for (const pt of points) {
      const ids = placesTextSearch_(kw, pt.lat, pt.lng);
      const idx = ids.indexOf(placeId);
      const rank = idx === -1 ? 0 : idx + 1;     // 0 = not found in top N
      rows.push([scanDate, kw, pt.row, pt.col, pt.lat, pt.lng, rank]);
      Utilities.sleep(120);                       // gentle throttle
    }
  }
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, RANK_HEADERS.length).setValues(rows);
  Logger.log('rankScan %s: wrote %s rows', scanDate, rows.length);
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
