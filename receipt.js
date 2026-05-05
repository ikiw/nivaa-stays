// Nivaa Stays — booking confirmation receipt builder.
// Renders a shareable booking confirmation into <div id="receipt-root">.
// Admin mode (?mode=admin) shows an editable form; guest mode shows the receipt.
// Uses pricing.js for rate calculation — same engine as the quote builder.

import { rateForDate, quoteForRange, formatINR, transitFee, transitTotal, shiftTime, autoDiscountFor, guestFeeFor } from './pricing.js';

const WHATSAPP = '919620364554';
const GOOGLE_MAPS = 'https://maps.app.goo.gl/uXmbjQ9tpviANJpm6';

const state = {
  config: null,
  checkIn: null,
  checkOut: null,
  earlyHours: 0,
  lateHours: 0,
  studios: 1,
  guests: 2,
  discountType: 'pct',
  discountValue: 0,
  guestName: '',
  guestMobile: '',
  advancePaid: 0,
  bookingId: '',
  platform: 'Direct',
  notes: '',
  sheetAmount: 0,   // final price from the bookings sheet (used to auto-calc discount)
  isAdmin: false,
  root: null
};

/* ---------- helpers ---------- */

function ymd(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseYmd(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function fmtPretty(s) {
  const d = parseYmd(s);
  const month = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()];
  const dow = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
  return `${dow} ${month} ${d.getDate()}`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function isValidYmd(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/* ---------- pricing ---------- */

function computeDiscount(subtotal, quoteContext) {
  const manual = Number(state.discountValue) || 0;
  if (manual > 0) {
    if (state.discountType === 'pct') {
      const pct = Math.min(100, Math.max(0, manual));
      return { amount: Math.round(subtotal * pct / 100), label: `${pct}% off`, source: 'manual' };
    }
    return { amount: Math.min(subtotal, manual), label: `${formatINR(manual)} off`, source: 'manual' };
  }
  const rule = quoteContext ? autoDiscountFor(quoteContext, state.config) : null;
  if (!rule) return { amount: 0, label: '', source: null };
  if (rule.type === 'pct') {
    return { amount: Math.round(subtotal * rule.value / 100), label: `${rule.value}% off · ${rule.name}`, source: 'auto', ruleId: rule.id };
  }
  return { amount: Math.min(subtotal, rule.value), label: `${formatINR(rule.value)} off · ${rule.name}`, source: 'auto', ruleId: rule.id };
}

function computeAll() {
  if (!state.checkIn || !state.checkOut || !state.config) return null;
  const q = quoteForRange(state.checkIn, state.checkOut, state.config);
  if (!q.totalNights) return null;
  const tt = transitTotal(state.earlyHours, state.lateHours, state.config);
  const studios = state.studios || 1;
  const guestInfo = guestFeeFor(state.guests, studios, q.totalNights, state.config);
  const subtotal = (q.total + (tt.total || 0)) * studios + guestInfo.fee;
  const disc = computeDiscount(subtotal, { totalNights: q.totalNights });
  const grandTotal = Math.max(0, subtotal - disc.amount);
  const tx = state.config.transit;
  const ciTime = state.earlyHours > 0 ? shiftTime(tx.defaultCheckIn, state.earlyHours) : '12:00 PM';
  const coTime = state.lateHours > 0 ? shiftTime(tx.defaultCheckOut, -state.lateHours) : '11:00 AM';
  const adv = Number(state.advancePaid) || 0;
  const balance = Math.max(0, grandTotal - adv);
  return { q, tt, studios, guestInfo, subtotal, disc, grandTotal, ciTime, coTime, adv, balance, tx };
}

/* ---------- URL state ---------- */

function parseUrlState() {
  const p = new URLSearchParams(location.search);
  if (isValidYmd(p.get('ci'))) state.checkIn = p.get('ci');
  const co = p.get('co');
  if (isValidYmd(co) && (!state.checkIn || co > state.checkIn)) state.checkOut = co;
  const e = parseInt(p.get('early') || '0', 10); if (e > 0) state.earlyHours = e;
  const l = parseInt(p.get('late') || '0', 10); if (l > 0) state.lateHours = l;
  const s = parseInt(p.get('studios') || '1', 10); state.studios = (s === 2 ? 2 : 1);
  const g = parseInt(p.get('guests') || '0', 10);
  state.guests = g > 0 ? g : (state.studios === 2 ? 4 : 2);
  const dt = p.get('discType'); if (dt === 'pct' || dt === 'amt') state.discountType = dt;
  const dv = parseFloat(p.get('disc') || '0'); if (dv > 0) state.discountValue = dv;
  state.guestName = p.get('name') || '';
  state.guestMobile = p.get('mobile') || '';
  state.advancePaid = parseInt(p.get('adv') || '0', 10);
  state.bookingId = p.get('bid') || '';
  state.platform = p.get('platform') || 'Direct';
  state.notes = p.get('notes') || '';
  state.sheetAmount = parseInt(p.get('amt') || '0', 10);
  state.isAdmin = p.get('mode') === 'admin';
}

function buildShareUrl(includeAdmin = false) {
  const p = new URLSearchParams();
  if (state.checkIn) p.set('ci', state.checkIn);
  if (state.checkOut) p.set('co', state.checkOut);
  if (state.earlyHours) p.set('early', String(state.earlyHours));
  if (state.lateHours) p.set('late', String(state.lateHours));
  if (state.studios !== 1) p.set('studios', String(state.studios));
  const defaultGuests = state.studios === 2 ? 4 : 2;
  if (state.guests !== defaultGuests) p.set('guests', String(state.guests));
  if (state.discountValue > 0) {
    p.set('discType', state.discountType);
    p.set('disc', String(state.discountValue));
  }
  if (state.guestName) p.set('name', state.guestName);
  if (state.guestMobile) p.set('mobile', state.guestMobile);
  if (state.advancePaid > 0) p.set('adv', String(state.advancePaid));
  if (state.bookingId) p.set('bid', state.bookingId);
  if (state.platform && state.platform !== 'Direct') p.set('platform', state.platform);
  if (state.notes) p.set('notes', state.notes);
  if (includeAdmin && state.isAdmin) p.set('mode', 'admin');
  return location.origin + location.pathname + (p.toString() ? '?' + p.toString() : '');
}

function syncUrlState() {
  const url = buildShareUrl(true);
  try { history.replaceState(null, '', url); } catch (_) {}
}

/* ---------- render: admin form ---------- */

function renderAdminForm() {
  if (!state.isAdmin) return '';
  const tx = state.config?.transit || {};
  const maxGuests = (state.config?.guestPolicy?.maxPerStudio || 4) * state.studios;

  return `
    <div class="bc-admin">
      <div class="bc-admin-title">Build Booking Receipt</div>

      <div class="bc-admin-group">
        <div class="bc-admin-group-label">Booking</div>
        <div class="bc-admin-row">
          <label class="bc-field-label">ID</label>
          <input type="text" class="bc-input" data-input="bookingId" value="${escapeHtml(state.bookingId)}" placeholder="NV-20260505-1234">
        </div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Platform</label>
          <select class="bc-input" data-input="platform">
            ${['Direct', 'Airbnb', 'MakeMyTrip', 'Booking.com', 'Goibibo'].map(p =>
              `<option value="${p}" ${state.platform === p ? 'selected' : ''}>${p}</option>`
            ).join('')}
          </select>
        </div>
      </div>

      <div class="bc-admin-group">
        <div class="bc-admin-group-label">Guest</div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Name</label>
          <input type="text" class="bc-input" data-input="guestName" value="${escapeHtml(state.guestName)}" placeholder="Guest name">
        </div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Mobile</label>
          <input type="tel" class="bc-input" data-input="guestMobile" value="${escapeHtml(state.guestMobile)}" placeholder="9876543210">
        </div>
      </div>

      <div class="bc-admin-group">
        <div class="bc-admin-group-label">Stay</div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Check-in</label>
          <input type="date" class="bc-input" data-input="checkIn" value="${state.checkIn || ''}">
        </div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Check-out</label>
          <input type="date" class="bc-input" data-input="checkOut" value="${state.checkOut || ''}">
        </div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Booking</label>
          <div class="bc-toggle">
            <button type="button" class="bc-toggle-btn ${state.studios === 1 ? 'active' : ''}" data-action="studios-1">1 Studio</button>
            <button type="button" class="bc-toggle-btn ${state.studios === 2 ? 'active' : ''}" data-action="studios-2">Full House</button>
          </div>
        </div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Guests</label>
          <div class="bc-stepper">
            <button type="button" class="bc-step-btn" data-action="guests-dec" ${state.guests <= 1 ? 'disabled' : ''}>−</button>
            <span class="bc-step-val">${state.guests}</span>
            <button type="button" class="bc-step-btn" data-action="guests-inc" ${state.guests >= maxGuests ? 'disabled' : ''}>+</button>
          </div>
        </div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Early check-in</label>
          <div class="bc-stepper">
            <button type="button" class="bc-step-btn" data-action="early-dec" ${state.earlyHours <= 0 ? 'disabled' : ''}>−</button>
            <span class="bc-step-val">${state.earlyHours} h</span>
            <button type="button" class="bc-step-btn" data-action="early-inc" ${state.earlyHours >= (tx.maxEarlyHours || 6) ? 'disabled' : ''}>+</button>
          </div>
        </div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Late checkout</label>
          <div class="bc-stepper">
            <button type="button" class="bc-step-btn" data-action="late-dec" ${state.lateHours <= 0 ? 'disabled' : ''}>−</button>
            <span class="bc-step-val">${state.lateHours} h</span>
            <button type="button" class="bc-step-btn" data-action="late-inc" ${state.lateHours >= (tx.maxLateHours || 9) ? 'disabled' : ''}>+</button>
          </div>
        </div>
      </div>

      <div class="bc-admin-group">
        <div class="bc-admin-group-label">Payment</div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Discount</label>
          <select class="bc-input bc-input-sm" data-input="discType">
            <option value="pct" ${state.discountType === 'pct' ? 'selected' : ''}>% off</option>
            <option value="amt" ${state.discountType === 'amt' ? 'selected' : ''}>₹ off</option>
          </select>
          <input type="number" class="bc-input bc-input-sm" data-input="discValue" min="0" step="${state.discountType === 'pct' ? '1' : '50'}" value="${state.discountValue || ''}" placeholder="0">
          <button type="button" class="bc-step-btn" data-action="disc-clear" title="Clear discount" style="font-size:0.7rem">✕</button>
        </div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Advance paid</label>
          <input type="number" class="bc-input" data-input="advancePaid" min="0" step="100" value="${state.advancePaid || ''}" placeholder="0">
        </div>
        <div class="bc-admin-row">
          <label class="bc-field-label">Notes</label>
          <input type="text" class="bc-input" data-input="notes" value="${escapeHtml(state.notes)}" placeholder="Special requests (optional)">
        </div>
      </div>

      <div class="bc-admin-actions">
        <button type="button" class="btn-outline-teal bc-action-btn" data-action="copy-share">Copy share link</button>
        <button type="button" class="btn-whatsapp bc-action-btn" data-action="wa-share">Share on WhatsApp</button>
        <button type="button" class="btn-outline-teal bc-action-btn" data-action="export-pdf">Export PDF</button>
        <span class="bc-share-status" id="bc-share-status"></span>
      </div>
    </div>
  `;
}

/* ---------- render: on-screen receipt ---------- */

function renderReceipt() {
  const c = computeAll();
  if (!c) {
    return `<div class="bc-empty">
      <div class="bc-empty-title">No booking details</div>
      <div class="bc-empty-body">${state.isAdmin
        ? 'Fill in the booking details above to generate a receipt.'
        : 'This receipt link appears to be incomplete. Please check the URL or <a href="https://wa.me/919620364554" class="underline" target="_blank">message us on WhatsApp</a>.'
      }</div>
    </div>`;
  }

  const { q, tt, studios, guestInfo, subtotal, disc, grandTotal, ciTime, coTime, adv, balance } = c;

  const nightRows = q.nights.map(n => {
    const tierLabel = n.tier === 'longWeekend' ? 'Long wknd' : n.tier === 'weekend' ? 'Weekend' : 'Weekday';
    return `<div class="bc-rate-row">
      <span class="bc-rate-date">${fmtPretty(n.date)}</span>
      <span class="bc-rate-tier">${tierLabel}</span>
      <span class="bc-rate-amt">${formatINR(n.rate)}</span>
    </div>`;
  }).join('');

  const transitRow = (tt.total || 0) > 0 ? `<div class="bc-rate-row bc-rate-transit">
    <span class="bc-rate-date">Transit add-on${tt.capped ? ' (cap)' : ''}</span>
    <span class="bc-rate-tier">${state.earlyHours > 0 ? `+${state.earlyHours}h early` : ''}${state.earlyHours > 0 && state.lateHours > 0 ? ' · ' : ''}${state.lateHours > 0 ? `+${state.lateHours}h late` : ''}</span>
    <span class="bc-rate-amt">${formatINR(tt.total)}</span>
  </div>` : '';

  const studiosRow = studios > 1 ? `<div class="bc-rate-row bc-rate-studios">
    <span class="bc-rate-date">Studios</span>
    <span class="bc-rate-tier">× ${studios} (Full House)</span>
    <span class="bc-rate-amt">${formatINR((q.total + (tt.total || 0)) * studios)}</span>
  </div>` : '';

  const guestRow = guestInfo.fee > 0 ? `<div class="bc-rate-row bc-rate-guest">
    <span class="bc-rate-date">Extra guests</span>
    <span class="bc-rate-tier">${guestInfo.extras} × ${formatINR(guestInfo.perGuestPerNight)} × ${q.totalNights}n</span>
    <span class="bc-rate-amt">${formatINR(guestInfo.fee)}</span>
  </div>` : '';

  const discountRows = disc.amount > 0 ? `
    <div class="bc-rate-row bc-rate-subtotal">
      <span class="bc-rate-date">Subtotal</span><span></span>
      <span class="bc-rate-amt">${formatINR(subtotal)}</span>
    </div>
    <div class="bc-rate-row bc-rate-discount">
      <span class="bc-rate-date">Discount</span>
      <span class="bc-rate-tier">${disc.label}</span>
      <span class="bc-rate-amt">−${formatINR(disc.amount)}</span>
    </div>` : '';

  const paymentRows = adv > 0 ? `
    <div class="bc-payment-row bc-payment-total"><span>Total</span><span>${formatINR(grandTotal)}</span></div>
    <div class="bc-payment-row bc-payment-paid"><span>Advance paid</span><span>−${formatINR(adv)}</span></div>
    <div class="bc-payment-row bc-payment-balance"><span>Balance at check-in</span><span>${formatINR(balance)}</span></div>
  ` : `<div class="bc-payment-row bc-payment-total"><span>Total</span><span>${formatINR(grandTotal)}</span></div>`;

  const notesHtml = state.notes ? `
    <div class="bc-notes">
      <div class="bc-notes-label">Notes</div>
      <div class="bc-notes-text">${escapeHtml(state.notes)}</div>
    </div>` : '';

  return `
    <div class="bc-receipt">
      <div class="bc-status">
        <div class="bc-status-badge">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="10" fill="#0E3B35"/><path d="M6 10.5l2.5 2.5L14 7.5" stroke="#C9A227" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span>Booking Confirmed</span>
        </div>
        ${state.bookingId ? `<div class="bc-booking-id">${escapeHtml(state.bookingId)}</div>` : ''}
      </div>

      ${(state.guestName || state.guestMobile) ? `
      <div class="bc-guest">
        ${state.guestName ? `<div><span class="bc-label">Guest</span> ${escapeHtml(state.guestName)}</div>` : ''}
        ${state.guestMobile ? `<div><span class="bc-label">Mobile</span> +91 ${escapeHtml(state.guestMobile)}</div>` : ''}
      </div>` : ''}

      <div class="bc-stay">
        <div class="bc-stay-grid">
          <div><div class="bc-label">Check-in</div><div class="bc-value">${fmtPretty(state.checkIn)} · ${ciTime}${state.earlyHours > 0 ? ` <span class="bc-pill">+${state.earlyHours}h early</span>` : ''}</div></div>
          <div><div class="bc-label">Check-out</div><div class="bc-value">${fmtPretty(state.checkOut)} · ${coTime}${state.lateHours > 0 ? ` <span class="bc-pill">+${state.lateHours}h late</span>` : ''}</div></div>
          <div><div class="bc-label">Nights</div><div class="bc-value">${q.totalNights}</div></div>
          <div><div class="bc-label">Room</div><div class="bc-value">${studios === 2 ? '2 Studios · Full House' : '1 Studio'}${state.guests ? ` · ${state.guests} guest${state.guests === 1 ? '' : 's'}` : ''}</div></div>
        </div>
      </div>

      <div class="bc-rates">
        <div class="bc-rates-title">Rate Breakdown</div>
        <div class="bc-rate-rows">${nightRows}${transitRow}${studiosRow}${guestRow}${discountRows}</div>
        <div class="bc-payment">${paymentRows}</div>
      </div>

      ${notesHtml}

      <div class="bc-info">
        <div class="bc-info-title">Before you arrive</div>
        <div class="bc-info-items">
          <div class="bc-info-item"><span class="bc-info-icon">&#128205;</span> <a href="${GOOGLE_MAPS}" target="_blank" rel="noopener">Nivaa Stays, Near JIPMER, Pondicherry</a></div>
          <div class="bc-info-item"><span class="bc-info-icon">&#128336;</span> Check-in at ${ciTime}</div>
          <div class="bc-info-item"><span class="bc-info-icon">&#129706;</span> Carry a valid photo ID (Aadhaar / DL / Passport)</div>
          <div class="bc-info-item"><span class="bc-info-icon">&#128222;</span> <a href="tel:+919620364554">+91 96203 64554</a> (call / WhatsApp)</div>
        </div>
      </div>

      <div class="bc-policy">
        <div class="bc-policy-title">Cancellation Policy</div>
        <div class="bc-policy-text">Cancellations made <strong>3 or more days</strong> before check-in are eligible for a <strong>50% refund</strong> of the advance paid. Cancellations within 3 days of check-in are <strong>non-refundable</strong>.</div>
      </div>

      ${!state.isAdmin ? `
      <div class="bc-guest-actions">
        <button type="button" class="btn-outline-teal bc-action-btn" data-action="export-pdf">Save as PDF</button>
      </div>` : ''}
    </div>
  `;
}

/* ---------- render: print PDF ---------- */

function renderPrintReceipt() {
  let host = document.getElementById('bc-print-receipt');
  if (!host) {
    host = document.createElement('div');
    host.id = 'bc-print-receipt';
    document.body.appendChild(host);
  }
  const c = computeAll();
  if (!c) { host.innerHTML = ''; return; }

  const { q, tt, studios, guestInfo, subtotal, disc, grandTotal, ciTime, coTime, adv, balance } = c;

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const receiptId = state.bookingId || `NV-${ymd(today).replace(/-/g, '')}-${(state.guestMobile || '').replace(/\D/g, '').slice(-4) || 'XXXX'}`;

  const nightRows = q.nights.map(n => {
    const tier = n.tier === 'longWeekend' ? 'Long weekend' : n.tier === 'weekend' ? 'Weekend' : 'Weekday';
    return `<tr><td>${fmtPretty(n.date)}</td><td>${tier}</td><td class="num">${formatINR(n.rate)}</td></tr>`;
  }).join('');

  const transitRow = (tt.total || 0) > 0
    ? `<tr><td>Transit add-on${tt.capped ? ' (cap)' : ''}</td><td>${state.earlyHours > 0 ? `+${state.earlyHours}h early` : ''}${state.earlyHours > 0 && state.lateHours > 0 ? ' · ' : ''}${state.lateHours > 0 ? `+${state.lateHours}h late` : ''}</td><td class="num">${formatINR(tt.total)}</td></tr>`
    : '';
  const studiosRow = studios > 1
    ? `<tr class="studios-row"><td>Per studio subtotal</td><td>× ${studios} studios</td><td class="num">${formatINR((q.total + (tt.total || 0)) * studios)}</td></tr>`
    : '';
  const guestPdfRow = guestInfo.fee > 0
    ? `<tr class="guest-row"><td>Extra guests</td><td>${guestInfo.extras} × ${formatINR(guestInfo.perGuestPerNight)}/night × ${q.totalNights}</td><td class="num">${formatINR(guestInfo.fee)}</td></tr>`
    : '';
  const subtotalRow = disc.amount > 0
    ? `<tr class="subtotal-row"><td colspan="2">Subtotal</td><td class="num">${formatINR(subtotal)}</td></tr>
       <tr class="discount-row"><td colspan="2">Discount · ${disc.label}</td><td class="num">−${formatINR(disc.amount)}</td></tr>`
    : '';

  const advanceRows = adv > 0 ? `
    <tr class="advance-row"><td colspan="2">Advance paid</td><td class="num">−${formatINR(adv)}</td></tr>
    <tr class="balance-row"><td colspan="2">Balance at check-in</td><td class="num">${formatINR(balance)}</td></tr>
  ` : '';

  host.innerHTML = `
    <div class="br">
      <header class="br-head">
        <div class="br-brand">
          <div class="br-brand-name">NIVAA STAYS</div>
          <div class="br-brand-tag">Le Affordable Luxury · Pondicherry</div>
        </div>
        <div class="br-meta">
          <div><strong>Booking Confirmation</strong></div>
          <div>Ref: ${escapeHtml(receiptId)}</div>
          <div>Issued: ${todayStr}</div>
        </div>
      </header>

      <section class="br-guest">
        <div><span class="br-label">Guest</span> ${escapeHtml(state.guestName) || '—'}</div>
        <div><span class="br-label">Mobile</span> ${state.guestMobile ? `+91 ${escapeHtml(state.guestMobile)}` : '—'}</div>
        ${state.platform && state.platform !== 'Direct' ? `<div><span class="br-label">Via</span> ${escapeHtml(state.platform)}</div>` : ''}
      </section>

      <section class="br-stay">
        <h3>Stay Details</h3>
        <table class="br-stay-tbl">
          <tr><td>Check-in</td><td>${fmtPretty(state.checkIn)} · ${ciTime}${state.earlyHours > 0 ? ` <span class="br-pill">+${state.earlyHours}h early</span>` : ''}</td></tr>
          <tr><td>Check-out</td><td>${fmtPretty(state.checkOut)} · ${coTime}${state.lateHours > 0 ? ` <span class="br-pill">+${state.lateHours}h late</span>` : ''}</td></tr>
          <tr><td>Duration</td><td>${q.totalNights} night${q.totalNights === 1 ? '' : 's'}</td></tr>
          <tr><td>Booking</td><td>${studios === 2 ? '2 Studios · Full House' : '1 Studio'}</td></tr>
          <tr><td>Guests</td><td>${state.guests}${guestInfo.extras > 0 ? ` (${guestInfo.extras} extra)` : ''}</td></tr>
        </table>
      </section>

      <section class="br-rates">
        <h3>Rate Breakdown</h3>
        <table class="br-rate-tbl">
          <thead><tr><th>Date</th><th>Tier</th><th class="num">Rate</th></tr></thead>
          <tbody>
            ${nightRows}
            ${transitRow}
            ${studiosRow}
            ${guestPdfRow}
            ${subtotalRow}
          </tbody>
          <tfoot>
            <tr class="total-row"><td colspan="2">TOTAL</td><td class="num">${formatINR(grandTotal)}</td></tr>
            ${advanceRows}
          </tfoot>
        </table>
      </section>

      ${state.notes ? `<section class="br-notes"><h3>Notes</h3><p>${escapeHtml(state.notes)}</p></section>` : ''}

      <section class="br-checkin">
        <h3>Check-in Information</h3>
        <ul>
          <li>Check-in at <strong>${ciTime}</strong>. Check-out by <strong>${coTime}</strong>.</li>
          <li>Please carry a <strong>valid photo ID</strong> (Aadhaar, DL, or Passport).</li>
          ${adv > 0 ? `<li>Balance of <strong>${formatINR(balance)}</strong> is due at check-in.</li>` : ''}
          <li>Self check-in link will be shared closer to your stay date.</li>
        </ul>
      </section>

      <section class="br-policy">
        <h3>Cancellation Policy</h3>
        <ul>
          <li>Cancellations made <strong>3 or more days</strong> before check-in: <strong>50% refund</strong> of the advance paid.</li>
          <li>Cancellations within 3 days of check-in are <strong>non-refundable</strong>.</li>
        </ul>
      </section>

      <footer class="br-foot">
        <div>Thank you for choosing Nivaa Stays!</div>
        <div>Nivaa Stays · Pondicherry · +91 96203 64554 · nivaastays@gmail.com</div>
        <div>nivaastays.com · WhatsApp wa.me/919620364554</div>
      </footer>
    </div>
  `;
}

/* ---------- main render ---------- */

// Full render — rebuilds admin form + preview. Use for structural changes
// (studios toggle, page load) where the form layout itself changes.
function render() {
  state.root.innerHTML = `
    <div id="bc-admin-wrap">${renderAdminForm()}</div>
    ${state.isAdmin ? '<div class="bc-preview-label">Receipt Preview</div>' : ''}
    <div id="bc-preview-wrap">${renderReceipt()}</div>
  `;
  syncUrlState();
}

// Lightweight render — only re-renders the receipt preview, leaving the
// admin form inputs untouched so the user can keep typing uninterrupted.
function updatePreview() {
  const wrap = document.getElementById('bc-preview-wrap');
  if (wrap) wrap.innerHTML = renderReceipt();
  syncUrlState();
}

/* ---------- event handlers ---------- */

function onClick(e) {
  const action = e.target.closest('[data-action]');
  if (!action) return;
  const a = action.getAttribute('data-action');
  const tx = state.config?.transit || {};

  if (a === 'studios-1') {
    state.studios = 1;
    const max = (state.config?.guestPolicy?.maxPerStudio || 4);
    if (state.guests > max) state.guests = max;
    render(); return;
  }
  if (a === 'studios-2') {
    state.studios = 2;
    if (state.guests <= 2) state.guests = 4;
    render(); return;
  }
  if (a === 'guests-inc') {
    const max = (state.config?.guestPolicy?.maxPerStudio || 4) * state.studios;
    state.guests = Math.min(max, state.guests + 1);
    render(); return;
  }
  if (a === 'guests-dec') { state.guests = Math.max(1, state.guests - 1); render(); return; }
  if (a === 'early-inc') { state.earlyHours = Math.min(tx.maxEarlyHours || 6, state.earlyHours + 1); render(); return; }
  if (a === 'early-dec') { state.earlyHours = Math.max(0, state.earlyHours - 1); render(); return; }
  if (a === 'late-inc')  { state.lateHours  = Math.min(tx.maxLateHours || 9, state.lateHours + 1);  render(); return; }
  if (a === 'late-dec')  { state.lateHours  = Math.max(0, state.lateHours - 1);  render(); return; }
  if (a === 'disc-clear') { state.discountValue = 0; render(); return; }

  if (a === 'copy-share') {
    const url = buildShareUrl(false);
    navigator.clipboard.writeText(url).then(() => {
      const s = document.getElementById('bc-share-status');
      if (s) { s.textContent = '✓ Link copied'; setTimeout(() => { if (s) s.textContent = ''; }, 2500); }
    }).catch(() => {
      const s = document.getElementById('bc-share-status');
      if (s) s.textContent = 'Copy failed — long-press URL bar to copy.';
    });
    return;
  }

  if (a === 'wa-share') {
    const c = computeAll();
    if (!c) return;
    const url = buildShareUrl(false);
    const name = state.guestName ? `Hi ${state.guestName}, your` : 'Your';
    const msg = `${name} booking at Nivaa Stays is confirmed!\n\n` +
      `Check-in: ${fmtPretty(state.checkIn)} · ${c.ciTime}\n` +
      `Check-out: ${fmtPretty(state.checkOut)} · ${c.coTime}\n` +
      `${c.q.totalNights} night${c.q.totalNights === 1 ? '' : 's'} · ${state.studios === 2 ? 'Full House' : '1 Studio'}\n` +
      `Total: ${formatINR(c.grandTotal)}` +
      (c.adv > 0 ? ` · Advance: ${formatINR(c.adv)} · Balance: ${formatINR(c.balance)}` : '') +
      `\n\nBooking receipt: ${url}`;
    const target = state.guestMobile ? `91${state.guestMobile.replace(/\D/g, '')}` : WHATSAPP;
    window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
    return;
  }

  if (a === 'export-pdf') {
    renderPrintReceipt();
    const original = location.href;
    const cleanUrl = buildShareUrl(false);
    try { history.replaceState(null, '', cleanUrl); } catch (_) {}
    const restore = () => {
      window.removeEventListener('afterprint', restore);
      try { history.replaceState(null, '', original); } catch (_) {}
    };
    window.addEventListener('afterprint', restore);
    setTimeout(() => window.print(), 50);
    return;
  }
}

function onInput(e) {
  const input = e.target.closest('[data-input]');
  if (!input) return;
  const key = input.getAttribute('data-input');

  // Text and number inputs: update state and re-render only the preview so
  // the input the user is typing in is never destroyed mid-keystroke.
  if (key === 'checkIn')     { state.checkIn = input.value || null; updatePreview(); return; }
  if (key === 'checkOut')    { state.checkOut = input.value || null; updatePreview(); return; }
  if (key === 'guestName')   { state.guestName = input.value; updatePreview(); return; }
  if (key === 'guestMobile') { state.guestMobile = input.value; updatePreview(); return; }
  if (key === 'bookingId')   { state.bookingId = input.value; updatePreview(); return; }
  if (key === 'platform')    { state.platform = input.value; updatePreview(); return; }
  if (key === 'notes')       { state.notes = input.value; updatePreview(); return; }
  if (key === 'discValue')   { state.discountValue = Math.max(0, parseFloat(input.value) || 0); updatePreview(); return; }
  if (key === 'advancePaid') { state.advancePaid = Math.max(0, parseInt(input.value) || 0); updatePreview(); return; }

  // Discount type select — update state, adjust the sibling step attribute
  // in-place (no full re-render), and refresh the preview.
  if (key === 'discType') {
    state.discountType = input.value === 'amt' ? 'amt' : 'pct';
    const valInput = state.root.querySelector('[data-input="discValue"]');
    if (valInput) valInput.step = state.discountType === 'pct' ? '1' : '50';
    updatePreview();
    return;
  }
}

/* ---------- init ---------- */

async function init() {
  const root = document.getElementById('receipt-root');
  if (!root) return;
  state.root = root;

  try {
    const res = await fetch('pricing.json', { cache: 'no-cache' });
    state.config = await res.json();
  } catch (err) {
    root.innerHTML = '<div style="padding:1rem;color:#900;">Could not load pricing config.</div>';
    return;
  }

  parseUrlState();

  // Auto-calculate discount from sheet amount: if the bookings sheet total is
  // lower than the computed subtotal, the difference is applied as a ₹ discount
  // so the receipt total matches the sheet exactly.
  if (state.sheetAmount > 0 && state.discountValue === 0 && state.checkIn && state.checkOut) {
    const q = quoteForRange(state.checkIn, state.checkOut, state.config);
    const tt = transitTotal(state.earlyHours, state.lateHours, state.config);
    const studios = state.studios || 1;
    const guestInfo = guestFeeFor(state.guests, studios, q.totalNights, state.config);
    const subtotal = (q.total + (tt.total || 0)) * studios + guestInfo.fee;
    if (subtotal > state.sheetAmount) {
      state.discountType = 'amt';
      state.discountValue = subtotal - state.sheetAmount;
    }
  }

  render();
  root.addEventListener('click', onClick);
  root.addEventListener('change', onInput);
  root.addEventListener('input', onInput);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
