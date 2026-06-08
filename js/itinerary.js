// Nivaa Stays — Pondicherry day-planner (loaded by pondicherry-itinerary-planner.html).
// Fully client-side: reads a pre-computed places + driving distance/time matrix
// (data/pondicherry-itinerary.json) — zero per-user API calls, no key.

const DATA_URL = 'data/pondicherry-itinerary.json';
// Maps key (Static Maps + Embed) — referrer-locked to nivaastays.com, so safe in
// client code.
const MAPS_KEY = 'AIzaSyApP7gtPnoI2D571tCjW3ANxIXTmcD3ECU';
const CAT_ICON = { Stay: '🛏️', Beach: '🏖️', Attraction: '🏛️', Breakfast: '🥐', Cafe: '☕', Lunch: '🍽️', Dinner: '🍴', Food: '🍴', Shopping: '🛍️' };
// Map markers: food sub-categories all share the "food" colour (one legend entry).
const CAT_COLOR = { Stay: '0xC9A227', Area: '0xC9A227', Beach: '0x2f80c4', Attraction: '0x0E3B35', Breakfast: '0xd9603b', Cafe: '0xd9603b', Lunch: '0xd9603b', Dinner: '0xd9603b', Food: '0xd9603b', Shopping: '0x8b5cf6' };
const CAT_LABEL = { Beach: 'Beaches', Attraction: 'Things to See', Breakfast: 'Breakfast', Cafe: 'Cafés & Coffee', Lunch: 'Lunch & South Indian', Dinner: 'Dinner', Shopping: 'Shopping' };
const PICK_ORDER = ['Beach', 'Attraction', 'Breakfast', 'Cafe', 'Lunch', 'Dinner', 'Shopping'];
const DEFAULT_STAY = { Beach: 60, Food: 60, Attraction: 30, Shopping: 30, Stay: 0 };

let DATA = null;
const state = { start: 0, startTime: '09:00', stops: [] }; // stops = [{ idx, stay }]

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
function parseTime(s) { const [h, m] = String(s).split(':').map(Number); return (h || 0) * 60 + (m || 0); }
function fmtClock(t) {
  t = ((Math.round(t) % 1440) + 1440) % 1440;
  let h = Math.floor(t / 60), m = t % 60, ap = h < 12 ? 'AM' : 'PM', hh = h % 12 || 12;
  return hh + ':' + String(m).padStart(2, '0') + ' ' + ap;
}
function driveMin(a, b) { const v = DATA.minutes[a][b]; return v == null ? 0 : v; }
function driveKm(a, b)  { const v = DATA.km[a][b];      return v == null ? 0 : v; }
function isStop(i) { return state.stops.some(s => s.idx === i); }
function mapLink(i) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(DATA.places[i].name + ', Pondicherry'); }

// ---------- place picker ----------
function renderPicker() {
  const byCat = {};
  DATA.places.forEach((p, i) => { if (i === state.start) return; (byCat[p.cat] = byCat[p.cat] || []).push(i); });
  let html = '';
  PICK_ORDER.forEach(cat => {
    if (!byCat[cat]) return;
    html += `<div class="ip-catgroup"><div class="ip-cathead">${CAT_ICON[cat] || ''} ${CAT_LABEL[cat] || cat}</div>`;
    byCat[cat].forEach(i => {
      const added = isStop(i);
      html += `<div class="ip-pickrow">
        <button type="button" class="ip-pick ${added ? 'is-added' : ''}" data-add="${i}">
          <span>${esc(DATA.places[i].name)}</span><span class="ip-pick-act">${added ? '✓ Added' : '+ Add'}</span></button>
        <a class="ip-maplink" href="${mapLink(i)}" target="_blank" rel="noopener" title="View on Google Maps" aria-label="View ${esc(DATA.places[i].name)} on Google Maps">↗</a>
      </div>`;
    });
    html += `</div>`;
  });
  document.getElementById('ip-picker').innerHTML = html;
}

// ---------- itinerary timeline ----------
function renderItinerary() {
  const root = document.getElementById('ip-itinerary');
  const sum = document.getElementById('ip-summary');
  if (!state.stops.length) {
    root.innerHTML = `<div class="ip-empty">Pick a few places from the left to build your day.</div>`;
    sum.innerHTML = '';
    document.getElementById('ip-gmaps').classList.add('hidden');
    document.getElementById('ip-pdf').classList.add('hidden');
    document.getElementById('ip-mapwrap').classList.add('hidden');
    return;
  }

  let clock = parseTime(state.startTime);
  let totalDrive = 0, totalKm = 0;
  let prev = state.start;

  // start node
  let html = `<div class="ip-node ip-start">
      <div class="ip-dot">●</div>
      <div class="ip-card">
        <div class="ip-name">${CAT_ICON.Stay} ${esc(DATA.places[state.start].name)}</div>
        <div class="ip-time">Depart ${fmtClock(clock)}</div>
      </div>
    </div>`;

  state.stops.forEach((s, n) => {
    const dm = driveMin(prev, s.idx), dk = driveKm(prev, s.idx);
    totalDrive += dm; totalKm += dk;
    clock += dm;
    const arrive = clock;
    clock += s.stay;
    const depart = clock;
    html += `<div class="ip-seg"><span>🚗 ${dm} min · ${dk} km</span></div>`;
    html += `<div class="ip-node" draggable="true" data-pos="${n}">
        <div class="ip-dot">${n + 1}</div>
        <div class="ip-card">
          <div class="ip-row1">
            <div class="ip-name">${CAT_ICON[DATA.places[s.idx].cat] || ''} ${esc(DATA.places[s.idx].name)} <a class="ip-maplink-sm" href="${mapLink(s.idx)}" target="_blank" rel="noopener" title="View on Google Maps">↗</a></div>
            <div class="ip-acts">
              <span class="ip-drag" title="Drag to reorder" aria-hidden="true">⠿</span>
              <button data-act="up" data-i="${n}" title="Move up" ${n === 0 ? 'disabled' : ''}>↑</button>
              <button data-act="down" data-i="${n}" title="Move down" ${n === state.stops.length - 1 ? 'disabled' : ''}>↓</button>
              <button data-act="rm" data-i="${n}" title="Remove">✕</button>
            </div>
          </div>
          <div class="ip-time">${fmtClock(arrive)} – ${fmtClock(depart)}
            <label class="ip-stay">stay <input type="number" min="0" step="15" value="${s.stay}" data-stay="${n}"> min</label>
          </div>
        </div>
      </div>`;
    prev = s.idx;
  });

  // return drive back to the starting point
  const rMin = driveMin(prev, state.start), rKm = driveKm(prev, state.start);
  totalDrive += rMin; totalKm += rKm; clock += rMin;
  html += `<div class="ip-seg"><span>🚗 ${rMin} min · ${rKm} km · back to start</span></div>`;
  html += `<div class="ip-node ip-start">
      <div class="ip-dot">●</div>
      <div class="ip-card">
        <div class="ip-name">${CAT_ICON.Stay} Back at ${esc(DATA.places[state.start].name)}</div>
        <div class="ip-time">Arrive ${fmtClock(clock)}</div>
      </div>
    </div>`;

  root.innerHTML = html;
  sum.innerHTML = `
    <span><strong>${state.stops.length}</strong> stops</span>
    <span>🚗 <strong>${totalDrive} min</strong> driving · ${totalKm.toFixed(1)} km (round trip)</span>
    <span>Back by approx <strong>${fmtClock(clock)}</strong></span>`;

  const g = document.getElementById('ip-gmaps');
  g.href = gmapsUrl();
  g.classList.remove('hidden');
  document.getElementById('ip-pdf').classList.remove('hidden');

  // live route map — only reload when the route actually changes
  if (MAPS_KEY) {
    const map = document.getElementById('ip-map');
    const newSrc = staticMapUrl();
    if (map.getAttribute('src') !== newSrc) map.setAttribute('src', newSrc);
    document.getElementById('ip-mapwrap').classList.remove('hidden');
  }
}

function gmapsUrl() {
  const pt = i => `${DATA.places[i].lat},${DATA.places[i].lng}`;
  // round trip: start → all stops → back to start
  let u = `https://www.google.com/maps/dir/?api=1&origin=${pt(state.start)}&destination=${pt(state.start)}&travelmode=driving`;
  const wps = state.stops.map(s => pt(s.idx)).join('|');
  if (wps) u += `&waypoints=${encodeURIComponent(wps)}`;
  return u;
}

// Nudge near-coincident markers apart so they don't stack on the static image.
// The offset scales with the map's lat/lng span, so it works at any zoom.
function fanOut_(pos) {
  const n = pos.length;
  if (n < 2) return;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  pos.forEach(q => { minLat = Math.min(minLat, q.lat); maxLat = Math.max(maxLat, q.lat); minLng = Math.min(minLng, q.lng); maxLng = Math.max(maxLng, q.lng); });
  const span = Math.max(maxLat - minLat, maxLng - minLng, 0.01);
  const unit = span * 0.045;   // ring radius ≈ one marker width
  const dist = (a, b) => Math.hypot(a.lat - b.lat, a.lng - b.lng);
  const used = new Array(n).fill(false);
  for (let i = 0; i < n; i++) {
    if (used[i]) continue;
    const cl = [i]; used[i] = true;
    for (let j = i + 1; j < n; j++) { if (!used[j] && dist(pos[i], pos[j]) < unit) { cl.push(j); used[j] = true; } }
    if (cl.length > 1) {   // spread the colliding markers in a ring around their centroid
      const cx = cl.reduce((s, k) => s + pos[k].lat, 0) / cl.length;
      const cy = cl.reduce((s, k) => s + pos[k].lng, 0) / cl.length;
      cl.forEach((k, m) => { const a = 2 * Math.PI * m / cl.length; pos[k] = { lat: cx + unit * Math.sin(a), lng: cy + unit * Math.cos(a) }; });
    }
  }
}

// Static Maps — numbered markers (Start = S, stops 1..9), colour-coded by category,
// + a connecting path. Colliding markers are fanned apart for legibility.
function staticMapUrl() {
  const order = [state.start].concat(state.stops.map(s => s.idx));   // route order
  const pos = order.map(i => ({ lat: DATA.places[i].lat, lng: DATA.places[i].lng }));
  fanOut_(pos);
  const fmt = q => q.lat.toFixed(6) + ',' + q.lng.toFixed(6);
  const p = [
    'https://maps.googleapis.com/maps/api/staticmap?key=' + MAPS_KEY,
    'size=540x460', 'scale=2'
  ];
  p.push('markers=' + encodeURIComponent('color:0xC9A227|label:S|' + fmt(pos[0])));
  state.stops.forEach((s, n) => {
    const label = (n + 1) <= 9 ? 'label:' + (n + 1) + '|' : '';
    const color = CAT_COLOR[DATA.places[s.idx].cat] || '0x0E3B35';
    p.push('markers=' + encodeURIComponent('color:' + color + '|' + label + fmt(pos[n + 1])));
  });
  const path = pos.map(fmt).concat(fmt(pos[0])).join('|');
  p.push('path=' + encodeURIComponent('color:0x0E3B35cc|weight:3|' + path));
  return p.join('&');
}

function optimize() {
  if (state.stops.length < 2) return;
  const remaining = state.stops.slice(), ordered = [];
  let cur = state.start;
  while (remaining.length) {
    let best = 0, bestMin = Infinity;
    remaining.forEach((s, i) => { const m = driveMin(cur, s.idx); if (m < bestMin) { bestMin = m; best = i; } });
    const next = remaining.splice(best, 1)[0];
    ordered.push(next); cur = next.idx;
  }
  state.stops = ordered;
  render();
}

function render() { renderStartSelect(); renderPicker(); renderItinerary(); }

function renderStartSelect() {
  const sel = document.getElementById('ip-start');
  if (sel.options.length) { sel.value = state.start; return; }
  // Start options = Nivaa + the curated areas (not the visit stops).
  sel.innerHTML = DATA.places
    .map((p, i) => ({ p, i }))
    .filter(x => x.p.cat === 'Stay' || x.p.cat === 'Area')
    .map(x => `<option value="${x.i}">${esc(x.p.name)}</option>`).join('');
  sel.value = state.start;
}

// ---------- events ----------
function bind() {
  document.getElementById('ip-picker').addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    const i = +b.getAttribute('data-add');
    if (isStop(i)) state.stops = state.stops.filter(s => s.idx !== i);
    else state.stops.push({ idx: i, stay: DEFAULT_STAY[DATA.places[i].cat] != null ? DEFAULT_STAY[DATA.places[i].cat] : 45 });
    render();
  });

  document.getElementById('ip-itinerary').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const i = +b.getAttribute('data-i'), act = b.getAttribute('data-act');
    if (act === 'rm') state.stops.splice(i, 1);
    else if (act === 'up' && i > 0) [state.stops[i - 1], state.stops[i]] = [state.stops[i], state.stops[i - 1]];
    else if (act === 'down' && i < state.stops.length - 1) [state.stops[i + 1], state.stops[i]] = [state.stops[i], state.stops[i + 1]];
    render();
  });
  document.getElementById('ip-itinerary').addEventListener('change', e => {
    const inp = e.target.closest('[data-stay]'); if (!inp) return;
    state.stops[+inp.getAttribute('data-stay')].stay = Math.max(0, +inp.value || 0);
    renderItinerary();
  });

  // drag-to-reorder (desktop); ↑↓ buttons remain the touch-friendly fallback
  const itin = document.getElementById('ip-itinerary');
  let dragPos = null;
  itin.addEventListener('dragstart', e => {
    const node = e.target.closest('.ip-node[draggable]'); if (!node) return;
    dragPos = +node.getAttribute('data-pos');
    e.dataTransfer.effectAllowed = 'move';
    node.classList.add('dragging');
  });
  itin.addEventListener('dragend', e => {
    const node = e.target.closest('.ip-node'); if (node) node.classList.remove('dragging');
    dragPos = null;
  });
  itin.addEventListener('dragover', e => { if (e.target.closest('.ip-node[draggable]')) e.preventDefault(); });
  itin.addEventListener('drop', e => {
    const node = e.target.closest('.ip-node[draggable]'); if (!node || dragPos == null) return;
    e.preventDefault();
    const to = +node.getAttribute('data-pos');
    if (to === dragPos) return;
    const item = state.stops.splice(dragPos, 1)[0];
    state.stops.splice(to, 0, item);
    render();
  });

  document.getElementById('ip-start').addEventListener('change', e => {
    state.start = +e.target.value;
    state.stops = state.stops.filter(s => s.idx !== state.start);
    render();
  });
  document.getElementById('ip-time').addEventListener('change', e => { state.startTime = e.target.value || '09:00'; renderItinerary(); });
  document.getElementById('ip-optimize').addEventListener('click', optimize);
  document.getElementById('ip-clear').addEventListener('click', () => { state.stops = []; render(); });
  document.getElementById('ip-pdf').addEventListener('click', () => window.print());
}

async function init() {
  try {
    DATA = await (await fetch(DATA_URL)).json();
  } catch (e) {
    document.getElementById('ip-itinerary').innerHTML = '<div class="ip-empty">Could not load the places data. Please refresh.</div>';
    return;
  }
  // default start = Pondicherry Bus Stand (fallback: first place / Nivaa)
  const busIdx = DATA.places.findIndex(p => /bus stand/i.test(p.name));
  if (busIdx >= 0) state.start = busIdx;
  document.getElementById('ip-time').value = state.startTime;
  bind();
  render();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
