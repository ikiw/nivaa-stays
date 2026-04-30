// Nivaa Stays — inline two-month calendar picker with per-night pricing.
// Renders into <div id="rate-picker"></div>. Uses pricing.js for rate lookups.

import { rateForDate, quoteForRange, formatINR } from './pricing.js';

const WHATSAPP = '919620364554';
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_LABELS = ['S','M','T','W','T','F','S'];

const state = {
  config: null,
  anchor: null,      // first day of left-month visible
  checkIn: null,     // 'YYYY-MM-DD'
  checkOut: null,    // 'YYYY-MM-DD'
  today: null,
  root: null
};

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d, n) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function fmtPretty(s) {
  const d = parseYmd(s);
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  return `${dow} ${month} ${d.getDate()}`;
}

function rateLabel(rate) {
  return `₹${(rate / 1000).toFixed(rate % 1000 === 0 ? 1 : 1)}k`;
}

function renderMonth(monthStart, isMobile) {
  const y = monthStart.getFullYear();
  const m = monthStart.getMonth();
  const firstDow = monthStart.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();

  let html = `<div class="rp-month">
    <div class="rp-month-title">${MONTH_NAMES[m]} ${y}</div>
    <div class="rp-dow">${DOW_LABELS.map(l => `<span>${l}</span>`).join('')}</div>
    <div class="rp-grid">`;

  for (let i = 0; i < firstDow; i++) html += `<div class="rp-cell rp-blank"></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${y}-${String(m + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    const past = dStr < state.today;
    const r = rateForDate(dStr, state.config);
    const cls = ['rp-cell', `rp-tier-${r.tier}`];
    if (past) cls.push('rp-past');
    if (dStr === state.checkIn) cls.push('rp-ci');
    if (dStr === state.checkOut) cls.push('rp-co');
    if (state.checkIn && state.checkOut && dStr > state.checkIn && dStr < state.checkOut) cls.push('rp-in-range');

    html += `<button type="button" class="${cls.join(' ')}" ${past ? 'disabled' : ''} data-date="${dStr}" aria-label="${dStr} ${r.tier} ${rateLabel(r.rate)}">
      <span class="rp-day">${day}</span>
      <span class="rp-rate">${rateLabel(r.rate)}</span>
    </button>`;
  }
  html += `</div></div>`;
  return html;
}

function renderBreakdown() {
  if (!state.checkIn) {
    return `<div class="rp-breakdown rp-breakdown-empty">
      <div class="rp-empty-line">Pick your check-in date on the calendar.</div>
    </div>`;
  }
  if (!state.checkOut) {
    return `<div class="rp-breakdown rp-breakdown-empty">
      <div class="rp-empty-line">Check-in: <strong>${fmtPretty(state.checkIn)}</strong></div>
      <div class="rp-empty-hint">Now pick your check-out date.</div>
      <button type="button" class="rp-clear" data-action="clear">Clear</button>
    </div>`;
  }

  const q = quoteForRange(state.checkIn, state.checkOut, state.config);
  const rows = q.nights.map(n => {
    const tierLabel = n.tier === 'longWeekend' ? 'Long wknd'
                    : n.tier === 'weekend'     ? 'Weekend'
                                               : 'Weekday';
    return `<div class="rp-row">
      <span class="rp-row-date">${fmtPretty(n.date)}</span>
      <span class="rp-row-tier">${tierLabel}</span>
      <span class="rp-row-rate">${formatINR(n.rate)}</span>
    </div>`;
  }).join('');

  const msg = `Hi Nivaa Stays, I'd like to book ${q.totalNights} night${q.totalNights === 1 ? '' : 's'}: check-in ${state.checkIn}, check-out ${state.checkOut}. Total ${formatINR(q.total)}.`;
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

  return `<div class="rp-breakdown">
    <div class="rp-summary">
      <div><strong>${fmtPretty(state.checkIn)}</strong> → <strong>${fmtPretty(state.checkOut)}</strong></div>
      <div class="rp-nights">${q.totalNights} night${q.totalNights === 1 ? '' : 's'}</div>
    </div>
    <div class="rp-rows">${rows}</div>
    <div class="rp-total">
      <span>Total</span>
      <span class="rp-total-amt">${formatINR(q.total)}</span>
    </div>
    <div class="rp-actions">
      <a class="btn-whatsapp rp-book" href="${waUrl}" target="_blank" rel="noopener">Book on WhatsApp →</a>
      <button type="button" class="rp-clear" data-action="clear">Clear dates</button>
    </div>
    <div class="rp-fineprint">Rates per room per night. 10% off on direct bookings — code <strong>NIVAA10</strong>. Long-weekend rates apply on Fri+Sat+Sun blocks adjoining a public holiday.</div>
  </div>`;
}

function render() {
  const left = state.anchor;
  const right = addMonths(left, 1);

  state.root.innerHTML = `
    <div class="rp-wrap">
      <div class="rp-header">
        <button type="button" class="rp-nav" data-action="prev" aria-label="Previous month">‹</button>
        <div class="rp-legend">
          <span><i class="rp-dot rp-dot-weekday"></i> Weekday ₹2,000</span>
          <span><i class="rp-dot rp-dot-weekend"></i> Weekend ₹2,500</span>
          <span><i class="rp-dot rp-dot-longWeekend"></i> Long wknd ₹3,000</span>
        </div>
        <button type="button" class="rp-nav" data-action="next" aria-label="Next month">›</button>
      </div>
      <div class="rp-months">
        ${renderMonth(left, false)}
        ${renderMonth(right, false)}
      </div>
      ${renderBreakdown()}
    </div>
  `;
}

function onClick(e) {
  const action = e.target.closest('[data-action]');
  if (action) {
    const a = action.getAttribute('data-action');
    if (a === 'prev') { state.anchor = addMonths(state.anchor, -1); render(); return; }
    if (a === 'next') { state.anchor = addMonths(state.anchor, 1); render(); return; }
    if (a === 'clear') { state.checkIn = null; state.checkOut = null; render(); return; }
  }

  const cell = e.target.closest('.rp-cell');
  if (!cell || cell.classList.contains('rp-blank') || cell.classList.contains('rp-past')) return;
  const d = cell.getAttribute('data-date');
  if (!d) return;

  if (!state.checkIn || (state.checkIn && state.checkOut)) {
    state.checkIn = d;
    state.checkOut = null;
  } else if (d <= state.checkIn) {
    state.checkIn = d;
    state.checkOut = null;
  } else {
    state.checkOut = d;
  }
  render();
}

async function init() {
  const root = document.getElementById('rate-picker');
  if (!root) return;
  state.root = root;

  try {
    const res = await fetch('pricing.json', { cache: 'no-cache' });
    state.config = await res.json();
  } catch (err) {
    root.innerHTML = '<div style="padding:1rem;color:#900;">Could not load pricing config.</div>';
    return;
  }

  const now = new Date();
  state.today = ymd(now);
  state.anchor = startOfMonth(now);
  render();
  root.addEventListener('click', onClick);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
