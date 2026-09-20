// Nivaa Stays — inline two-month calendar picker with per-night pricing.
// Renders into <div id="rate-picker"></div>. Uses pricing.js for rate lookups.

import { rateForDate, quoteForRange, formatINR, transitFee, transitTotal, shiftTime, advancePaymentFor, guestFeeFor, petFeeFor, bathtubFeeFor } from './pricing.js';

const WHATSAPP = '919620364554';
const CHILD_DEFAULT_AGE = 10; // new children start chargeable; user sets the exact age
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_LABELS = ['S','M','T','W','T','F','S'];

const state = {
  config: null,
  anchor: null,
  checkIn: null,
  checkOut: null,
  earlyHours: 0,
  lateHours: 0,
  discountType: 'pct',   // 'pct' | 'amt'
  discountValue: 0,
  studios: 1,            // 1 = single studio, 2 = full house
  adults: 2,             // adult count across the booking (2 included/studio)
  children: [],          // ages of accompanying children (each 0–17)
  hasPet: false,         // travelling with a pet → flat ₹/night pet charge
  hasBathtub: false,     // optional bathtub → flat ₹/night charge
  addons: [],            // [{ label, amount }] custom line items added on top (admin)
  newAddonLabel: '',     // in-progress "add a line" inputs (admin panel)
  newAddonAmount: '',
  guestName: '',         // admin-only, not in URL (PII)
  guestMobile: '',       // admin-only, not in URL (PII)
  isAdmin: false,
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

function renderInstruction() {
  if (!state.checkIn) {
    return `<div class="rp-instruct">
      <span class="rp-instruct-step">Step 1 of 2</span>
      <span class="rp-instruct-text">Tap your <strong>check-in</strong> date below</span>
    </div>`;
  }
  if (!state.checkOut) {
    return `<div class="rp-instruct rp-instruct-mid">
      <span class="rp-instruct-step">Step 2 of 2</span>
      <span class="rp-instruct-text">Check-in <strong>${fmtPretty(state.checkIn)}</strong> — now tap your <strong>check-out</strong></span>
      <button type="button" class="rp-instruct-clear" data-action="clear">Reset</button>
    </div>`;
  }
  return `<div class="rp-instruct rp-instruct-done">
    <span class="rp-instruct-text"><strong>${fmtPretty(state.checkIn)}</strong> → <strong>${fmtPretty(state.checkOut)}</strong></span>
    <button type="button" class="rp-instruct-clear" data-action="clear">Change dates</button>
  </div>`;
}

// Single source of truth for the money math — used by the on-screen breakdown,
// the sticky bar, and the printable quote so the four totals can never drift.
function computeQuote() {
  const q = quoteForRange(state.checkIn, state.checkOut, state.config);
  const tt = transitTotal(state.earlyHours, state.lateHours, state.config);
  const studios = state.studios || 1;
  const roomTotal = q.total * studios;
  const transitSubtotal = (tt.total || 0) * studios;
  const guestInfo = guestFeeFor(state.adults, state.children, studios, q.totalNights, state.config);
  const petInfo = petFeeFor(state.hasPet, q.totalNights, state.config);
  const bathtubInfo = bathtubFeeFor(state.hasBathtub, q.totalNights, studios, state.config);
  const subtotal = roomTotal + transitSubtotal + guestInfo.fee + petInfo.fee + bathtubInfo.fee;
  const disc = computeDiscount(subtotal);
  // Custom add-ons are a flat addition on top — not discounted.
  const addonsTotal = state.addons.reduce((s, a) => s + (Number(a.amount) || 0), 0);
  const grandTotal = Math.max(0, subtotal - disc.amount) + addonsTotal;
  return { q, tt, studios, roomTotal, transitSubtotal, guestInfo, petInfo, bathtubInfo, subtotal, disc, addonsTotal, grandTotal };
}

// Build the WhatsApp booking message + deep link from a computeQuote() result.
// Shared by the breakdown CTA and the sticky bar so they stay identical.
function buildBookingMessage(c) {
  const tx = state.config.transit;
  const ciTime = state.earlyHours > 0 ? shiftTime(tx.defaultCheckIn, state.earlyHours) : '12:00 PM';
  const coTime = state.lateHours > 0 ? shiftTime(tx.defaultCheckOut, -state.lateHours) : '11:00 AM';
  const transitMsgPart = (state.earlyHours > 0 || state.lateHours > 0)
    ? ` Includes${state.earlyHours > 0 ? ` early check-in ${state.earlyHours}h (₹${c.tt.early})` : ''}${state.earlyHours > 0 && state.lateHours > 0 ? ' and' : ''}${state.lateHours > 0 ? ` late checkout ${state.lateHours}h (₹${c.tt.late})` : ''}${c.tt.capped ? ' (combined cap applied)' : ''}.`
    : '';
  const discMsgPart = c.disc.amount > 0 ? ` Discount: ${c.disc.label} (−${formatINR(c.disc.amount)}).` : '';
  const studiosMsgPart = c.studios > 1 ? ` ${c.studios} studios (Full House).` : '';
  const kids = state.children.length;
  const paidNote = [
    c.guestInfo.extraAdults > 0 ? `${c.guestInfo.extraAdults} extra adult${c.guestInfo.extraAdults === 1 ? '' : 's'}` : '',
    c.guestInfo.chargeableChildren > 0 ? `${c.guestInfo.chargeableChildren} paid child${c.guestInfo.chargeableChildren === 1 ? '' : 'ren'}` : ''
  ].filter(Boolean).join(', ');
  const guestsMsgPart = ` ${state.adults} adult${state.adults === 1 ? '' : 's'}${kids ? ` + ${kids} child${kids === 1 ? '' : 'ren'}` : ''}${paidNote ? ` (${paidNote})` : ''}.`;
  const petsMsgPart = c.petInfo.fee > 0 ? ` Travelling with a pet (+${formatINR(c.petInfo.fee)}).` : '';
  const bathtubMsgPart = ` ${state.hasBathtub ? `With ${c.bathtubInfo.quantity === 1 ? 'bathtub' : `${c.bathtubInfo.quantity} bathtubs`} (+${formatINR(c.bathtubInfo.fee)})` : 'Without bathtub'}.`;
  const addonsMsgPart = c.addonsTotal > 0 ? ` Add-ons: ${state.addons.map(a => `${a.label} (${formatINR(a.amount)})`).join(', ')}.` : '';
  const quoteUrl = buildShareUrl(false);
  const msg = `Hi Nivaa Stays, I'd like to book ${c.q.totalNights} night${c.q.totalNights === 1 ? '' : 's'}: check-in ${state.checkIn} ${ciTime}, check-out ${state.checkOut} ${coTime}.${studiosMsgPart}${guestsMsgPart}${petsMsgPart}${bathtubMsgPart}${addonsMsgPart} Total ${formatINR(c.grandTotal)}.${transitMsgPart}${discMsgPart}\n\nQuote: ${quoteUrl}`;
  return `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
}

function renderBreakdown() {
  if (!state.checkIn || !state.checkOut) return '';

  const c = computeQuote();
  const q = c.q;
  const rows = q.nights.map(n => {
    const tierLabel = n.tier === 'longWeekend' ? 'Peak'
                    : n.tier === 'weekend'     ? 'Prime'
                                               : 'Base';
    return `<div class="rp-row">
      <span class="rp-row-date">${fmtPretty(n.date)}</span>
      <span class="rp-row-tier">${tierLabel}</span>
      <span class="rp-row-rate">${formatINR(n.rate)}</span>
    </div>`;
  }).join('');

  const tx = state.config.transit;
  const tt = c.tt;
  const transitSection = renderTransit(tx, tt);

  const studios = c.studios;
  const roomTotal = c.roomTotal;
  const transitSubtotal = c.transitSubtotal;
  const guestInfo = c.guestInfo;
  const petInfo = c.petInfo;
  const bathtubInfo = c.bathtubInfo;
  const subtotal = c.subtotal;
  const disc = c.disc;
  const grandTotal = c.grandTotal;

  const waUrl = buildBookingMessage(c);

  const transitTotalRow = tt.total
    ? `<div class="rp-row rp-row-transit">
        <span class="rp-row-date">Transit add-on${tt.capped ? ' (capped)' : ''}</span>
        <span class="rp-row-tier">${state.earlyHours > 0 ? `+${state.earlyHours}h early` : ''}${state.earlyHours > 0 && state.lateHours > 0 ? ' · ' : ''}${state.lateHours > 0 ? `+${state.lateHours}h late` : ''}</span>
        <span class="rp-row-rate">${formatINR(tt.total)}</span>
      </div>`
    : '';
  const studiosScreenRow = studios > 1
    ? `<div class="rp-row rp-row-studios">
        <span class="rp-row-date">Studios</span>
        <span class="rp-row-tier">× ${studios} (Full House)</span>
        <span class="rp-row-rate">${formatINR(roomTotal + transitSubtotal)}</span>
      </div>`
    : '';
  const guestScreenRow = (guestInfo.extraAdults > 0
    ? `<div class="rp-row rp-row-guest">
        <span class="rp-row-date">Extra adults</span>
        <span class="rp-row-tier">${guestInfo.extraAdults} × ${formatINR(guestInfo.adultRate)} × ${q.totalNights} night${q.totalNights === 1 ? '' : 's'}</span>
        <span class="rp-row-rate">${formatINR(guestInfo.adultFee)}</span>
      </div>`
    : '')
    + (guestInfo.chargeableChildren > 0
    ? `<div class="rp-row rp-row-guest">
        <span class="rp-row-date">Children (7–17)</span>
        <span class="rp-row-tier">${guestInfo.chargeableChildren} × ${formatINR(guestInfo.childRate)} × ${q.totalNights} night${q.totalNights === 1 ? '' : 's'}</span>
        <span class="rp-row-rate">${formatINR(guestInfo.childFee)}</span>
      </div>`
    : '');
  const petScreenRow = petInfo.fee > 0
    ? `<div class="rp-row rp-row-pet">
        <span class="rp-row-date">Pet charge</span>
        <span class="rp-row-tier">${formatINR(petInfo.perNight)} × ${q.totalNights} night${q.totalNights === 1 ? '' : 's'}</span>
        <span class="rp-row-rate">${formatINR(petInfo.fee)}</span>
      </div>`
    : '';
  const bathtubScreenRow = bathtubInfo.fee > 0
      ? `<div class="rp-row rp-row-guest">
          <span class="rp-row-date">Bathtub charge</span>
          <span class="rp-row-tier">${bathtubInfo.quantity > 1 ? `${bathtubInfo.quantity} × ` : ''}${formatINR(bathtubInfo.perNight)} × ${q.totalNights} night${q.totalNights === 1 ? '' : 's'}</span>
          <span class="rp-row-rate">${formatINR(bathtubInfo.fee)}</span>
        </div>`
      : '';

  const subtotalRow = disc.amount > 0
    ? `<div class="rp-row rp-row-subtotal"><span class="rp-row-date">Subtotal</span><span></span><span class="rp-row-rate">${formatINR(subtotal)}</span></div>
       <div class="rp-row rp-row-discount"><span class="rp-row-date">Discount</span><span class="rp-row-tier">${disc.label}</span><span class="rp-row-rate">−${formatINR(disc.amount)}</span></div>`
    : '';
  const addonScreenRows = state.addons.map(a => `
    <div class="rp-row rp-row-addon">
      <span class="rp-row-date">${escapeHtml(a.label)}</span>
      <span class="rp-row-tier">Add-on</span>
      <span class="rp-row-rate">${formatINR(a.amount)}</span>
    </div>`).join('');

  return `<div class="rp-breakdown">
    <div class="rp-summary">
      <div><strong>${fmtPretty(state.checkIn)}</strong> → <strong>${fmtPretty(state.checkOut)}</strong></div>
      <div class="rp-nights">${q.totalNights} night${q.totalNights === 1 ? '' : 's'}</div>
    </div>
    <div class="rp-rows">${rows}${transitTotalRow}${studiosScreenRow}${guestScreenRow}${petScreenRow}${bathtubScreenRow}${subtotalRow}${addonScreenRows}</div>
    <div class="rp-total">
      <span>Total</span>
      <span class="rp-total-amt">${formatINR(grandTotal)}</span>
    </div>
    ${(() => {
      const adv = advancePaymentFor(grandTotal, state.config, studios);
      return adv ? `<div class="rp-advance">
        <span>To confirm booking · ${adv.label}</span>
        <span class="rp-advance-amt">${formatINR(adv.amount)}</span>
      </div>` : '';
    })()}
    ${transitSection}
    ${state.isAdmin ? renderAdminPanel() : ''}
    <div class="rp-actions">
      <a class="btn-whatsapp rp-book" href="${waUrl}" target="_blank" rel="noopener">Book on WhatsApp →</a>
      <button type="button" class="rp-clear" data-action="clear">Clear dates</button>
    </div>
    <div class="rp-fineprint">Rates per room per night. Peak nights apply around public holidays. Early check-in / late checkout subject to room availability — please confirm on WhatsApp.</div>
  </div>`;
}

function computeDiscount(subtotal) {
  // Discounts on quotes are applied only when explicitly set by an admin or URL.
  const manual = Number(state.discountValue) || 0;
  if (manual > 0) {
    if (state.discountType === 'pct') {
      const pct = Math.min(100, Math.max(0, manual));
      return { amount: Math.round(subtotal * pct / 100), label: `${pct}% off`, source: 'manual' };
    }
    const amt = Math.min(subtotal, manual);
    return { amount: amt, label: `${formatINR(amt)} off`, source: 'manual' };
  }
  return { amount: 0, label: '', source: null };
}

function renderAdminPanel() {
  const canExport = state.checkIn && state.checkOut;
  return `<details class="rp-admin" open>
    <summary>🔒 Admin · Build a quote</summary>
    <div class="rp-admin-body">
      <div class="rp-admin-row">
        <label class="rp-admin-label">Discount</label>
        <select class="rp-admin-input" data-input="discType">
          <option value="pct" ${state.discountType === 'pct' ? 'selected' : ''}>% off</option>
          <option value="amt" ${state.discountType === 'amt' ? 'selected' : ''}>₹ off</option>
        </select>
        <input type="number" class="rp-admin-input rp-admin-num" data-input="discValue" min="0" step="${state.discountType === 'pct' ? '1' : '50'}" value="${state.discountValue || ''}" placeholder="0">
        <button type="button" class="rp-admin-clear" data-action="disc-clear">Clear</button>
      </div>
      <div class="rp-admin-row">
        <label class="rp-admin-label">Guest</label>
        <input type="text" class="rp-admin-input rp-admin-name" data-input="guestName" value="${escapeHtml(state.guestName)}" placeholder="Name (for PDF)">
        <input type="tel" class="rp-admin-input rp-admin-mobile" data-input="guestMobile" value="${escapeHtml(state.guestMobile)}" placeholder="Mobile (for PDF)">
      </div>
      <div class="rp-admin-addons">
        ${state.addons.map((a, i) => `
        <div class="rp-admin-row rp-admin-addon-item">
          <span class="rp-admin-addon-label">${escapeHtml(a.label)}</span>
          <span class="rp-admin-addon-amt">${formatINR(a.amount)}</span>
          <button type="button" class="rp-admin-clear" data-action="addon-remove" data-idx="${i}" title="Remove add-on">✕</button>
        </div>`).join('')}
        <div class="rp-admin-row">
          <label class="rp-admin-label">Add-on</label>
          <input type="text" class="rp-admin-input rp-admin-name" data-input="addonLabel" value="${escapeHtml(state.newAddonLabel)}" placeholder="e.g. Breakfast">
          <input type="number" class="rp-admin-input rp-admin-num" data-input="addonAmount" min="0" step="50" value="${escapeHtml(state.newAddonAmount)}" placeholder="₹">
          <button type="button" class="rp-admin-clear" data-action="addon-add" title="Add add-on line">+ Add</button>
        </div>
      </div>
      <div class="rp-admin-share">
        <button type="button" class="btn-outline-teal rp-share-btn" data-action="copy-share">Copy share link</button>
        <button type="button" class="btn-outline-teal rp-share-btn" data-action="export-pdf" ${canExport ? '' : 'disabled'}>Export as PDF</button>
        <span class="rp-share-status" id="rp-share-status"></span>
      </div>
      <div class="rp-admin-hint">Workflow: guest sends their booking page URL via WhatsApp → append <code>&amp;mode=admin</code> to it → set discount → "Copy share link" → send back. PDF export is a tariff quotation for callers — guest name and mobile are printed on the document but never go into the URL.</div>
    </div>
  </details>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function renderTransit(tx, tt) {
  const earlyLabel = state.earlyHours === 0 ? 'No early check-in' : `+${state.earlyHours} hr early (in ${shiftTime(tx.defaultCheckIn, state.earlyHours)})`;
  const lateLabel = state.lateHours === 0 ? 'No late checkout' : `+${state.lateHours} hr late (out ${shiftTime(tx.defaultCheckOut, -state.lateHours)})`;
  const earlyFee = transitFee(state.earlyHours, state.config, 'early');
  const lateFee = transitFee(state.lateHours, state.config, 'late');

  return `<details class="rp-transit" ${state.earlyHours || state.lateHours ? 'open' : ''}>
    <summary>Need early check-in or late checkout?</summary>
    <div class="rp-transit-body">
      <p class="rp-transit-intro">Default check-in <strong>12 PM</strong>, check-out <strong>11 AM</strong>. First hour free; ₹250/hr beyond. 5–6 hr block ₹1,000 (transit add-on); 7+ hr block ₹1,500. Earliest check-in <strong>6 AM</strong>, latest checkout <strong>8 PM</strong>. Combined cap ₹${tx.combinedCap.toLocaleString('en-IN')}.</p>

      <div class="rp-stepper">
        <div class="rp-stepper-label">
          <div>Early check-in</div>
          <div class="rp-stepper-sub">${earlyLabel}</div>
        </div>
        <div class="rp-stepper-controls">
          <button type="button" class="rp-step-btn" data-action="early-dec" ${state.earlyHours <= 0 ? 'disabled' : ''}>−</button>
          <span class="rp-step-val">${state.earlyHours} h</span>
          <button type="button" class="rp-step-btn" data-action="early-inc" ${state.earlyHours >= tx.maxEarlyHours ? 'disabled' : ''}>+</button>
          <span class="rp-step-fee">${earlyFee ? formatINR(earlyFee) : 'Free'}</span>
        </div>
      </div>

      <div class="rp-stepper">
        <div class="rp-stepper-label">
          <div>Late checkout</div>
          <div class="rp-stepper-sub">${lateLabel}</div>
        </div>
        <div class="rp-stepper-controls">
          <button type="button" class="rp-step-btn" data-action="late-dec" ${state.lateHours <= 0 ? 'disabled' : ''}>−</button>
          <span class="rp-step-val">${state.lateHours} h</span>
          <button type="button" class="rp-step-btn" data-action="late-inc" ${state.lateHours >= tx.maxLateHours ? 'disabled' : ''}>+</button>
          <span class="rp-step-fee">${lateFee ? formatINR(lateFee) : 'Free'}</span>
        </div>
      </div>

      ${tt.capped ? `<div class="rp-cap-note">Combined cap applied — max ₹${tx.combinedCap.toLocaleString('en-IN')} for early + late on the same booking.</div>` : ''}
      ${state.earlyHours >= tx.maxEarlyHours ? `<div class="rp-cap-note">Earliest check-in is 6:00 AM. Need earlier? Booking the prior night may work out cheaper — message us on WhatsApp.</div>` : ''}
      ${state.lateHours >= tx.maxLateHours ? `<div class="rp-cap-note">Latest check-out is 8:00 PM. Need later? Booking the next night may work out cheaper — message us on WhatsApp.</div>` : ''}
    </div>
  </details>`;
}

function render() {
  // Preserve scroll position + focused input across full re-render so that
  // typing in the discount/guest fields doesn't yank the page to the top.
  const scrollY = window.scrollY;
  const active = document.activeElement;
  const focusedKey = active && active.getAttribute && active.getAttribute('data-input');
  const cursorPos = focusedKey && active.selectionStart != null ? active.selectionStart : null;

  const left = state.anchor;
  const right = addMonths(left, 1);

  state.root.innerHTML = `
    <div class="rp-wrap">
      <div class="rp-studios">
        <div class="rp-studios-group">
          <span class="rp-studios-label">Booking</span>
          <div class="rp-studios-toggle">
            <button type="button" class="rp-studio-opt ${state.studios === 1 ? 'active' : ''}" data-action="studios-1">1 Studio</button>
            <button type="button" class="rp-studio-opt ${state.studios === 2 ? 'active' : ''}" data-action="studios-2">2 Studios · Full House</button>
          </div>
        </div>
        <div class="rp-guests-group">
          <span class="rp-studios-label">Adults</span>
          <div class="rp-guests-stepper">
            <button type="button" class="rp-step-btn" data-action="adults-dec" ${state.adults <= 1 ? 'disabled' : ''}>−</button>
            <span class="rp-step-val">${state.adults}</span>
            <button type="button" class="rp-step-btn" data-action="adults-inc" ${state.adults >= (state.config?.guestPolicy?.maxPerStudio || 4) * state.studios ? 'disabled' : ''}>+</button>
          </div>
          <span class="rp-guests-hint">${state.studios * 2} included · max ${state.studios * 4}</span>
        </div>
        <div class="rp-children-group">
          <span class="rp-studios-label">Children</span>
          <div class="rp-guests-stepper">
            <button type="button" class="rp-step-btn" data-action="children-dec" ${state.children.length <= 0 ? 'disabled' : ''}>−</button>
            <span class="rp-step-val">${state.children.length}</span>
            <button type="button" class="rp-step-btn" data-action="children-inc" ${state.children.length >= (state.config?.childPolicy?.maxPerStudio || 4) * state.studios ? 'disabled' : ''}>+</button>
          </div>
          <span class="rp-guests-hint">Under 7 free · 7–17 ${formatINR(state.config?.childPolicy?.feePerNight || 0)}/night</span>
        </div>
        <div class="rp-pets-group">
          <span class="rp-studios-label">Pet</span>
          <div class="rp-studios-toggle">
            <button type="button" class="rp-studio-opt ${state.hasPet ? 'active' : ''}" data-action="pet-toggle" aria-pressed="${state.hasPet}">${state.hasPet ? '🐾 With pet' : '+ Add pet'}</button>
          </div>
          <span class="rp-guests-hint">+${formatINR(state.config?.petPolicy?.feePerNight || 0)}/night</span>
        </div>
        <div class="rp-pets-group rp-bathtub-group">
          <span class="rp-studios-label">Bathtub</span>
          <div class="rp-studios-toggle">
            <button type="button" class="rp-studio-opt ${state.hasBathtub ? 'active' : ''}" data-action="bathtub-toggle" aria-pressed="${state.hasBathtub}">${state.hasBathtub ? (state.studios === 2 ? 'With 2 bathtubs' : 'With bathtub') : `+ Add ${state.studios === 2 ? '2 bathtubs' : 'bathtub'}`}</button>
          </div>
          <span class="rp-guests-hint">+${formatINR(state.config?.bathtubPolicy?.feePerNight || 0)}/bathtub/night</span>
        </div>
      </div>
      ${state.children.length ? `<div class="rp-child-ages">
        ${state.children.map((age, i) => `
        <label class="rp-child-age">
          <span class="rp-child-age-label">Child ${i + 1}</span>
          <select class="rp-child-age-select" data-input="child-age" data-idx="${i}">
            ${Array.from({ length: 18 }, (_, n) => `<option value="${n}" ${Number(age) === n ? 'selected' : ''}>${n === 0 ? 'Under 1' : `${n} yr${n === 1 ? '' : 's'}`}${n < (state.config?.childPolicy?.freeUnderAge || 7) ? ' · free' : ''}</option>`).join('')}
          </select>
        </label>`).join('')}
      </div>` : ''}
      <div class="rp-header">
        <button type="button" class="rp-nav" data-action="prev" aria-label="Previous month">‹</button>
        <div class="rp-legend">
          <span><i class="rp-dot rp-dot-weekday"></i> Base ₹2,000</span>
          <span><i class="rp-dot rp-dot-weekend"></i> Prime ₹2,500</span>
          <span><i class="rp-dot rp-dot-longWeekend"></i> Peak ₹3,000</span>
        </div>
        <button type="button" class="rp-nav" data-action="next" aria-label="Next month">›</button>
      </div>
      ${renderInstruction()}
      <div class="rp-months">
        ${renderMonth(left, false)}
        ${renderMonth(right, false)}
      </div>
      ${renderBreakdown()}
    </div>
  `;

  // Restore focus + cursor + scroll
  if (focusedKey) {
    const el = state.root.querySelector(`[data-input="${focusedKey}"]`);
    if (el) {
      el.focus({ preventScroll: true });
      if (cursorPos != null && typeof el.setSelectionRange === 'function') {
        try { el.setSelectionRange(cursorPos, cursorPos); } catch (_) {}
      }
    }
  }
  if (window.scrollY !== scrollY) window.scrollTo({ top: scrollY, behavior: 'instant' });

  renderStickyBar();
  syncUrlState();
}

function renderPrintQuote() {
  let host = document.getElementById('rp-print-quote');
  if (!host) {
    host = document.createElement('div');
    host.id = 'rp-print-quote';
    document.body.appendChild(host);
  }
  if (!state.checkIn || !state.checkOut || !state.config) {
    host.innerHTML = '';
    return;
  }
  const c = computeQuote();
  const q = c.q, tt = c.tt, studios = c.studios, guestInfo = c.guestInfo, petInfo = c.petInfo, bathtubInfo = c.bathtubInfo;
  const subtotal = c.subtotal, disc = c.disc, grandTotal = c.grandTotal;
  const tx = state.config.transit;
  const ciTime = state.earlyHours > 0 ? shiftTime(tx.defaultCheckIn, state.earlyHours) : '12:00 PM';
  const coTime = state.lateHours > 0 ? shiftTime(tx.defaultCheckOut, -state.lateHours) : '11:00 AM';

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const quoteId = `NV-${ymd(today).replace(/-/g, '')}-${(state.guestMobile || '').replace(/\D/g, '').slice(-4) || 'XXXX'}`;
  const validUntil = (() => {
    const v = new Date(today); v.setDate(v.getDate() + 7);
    return v.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  })();

  const nightRows = q.nights.map(n => {
    const tier = n.tier === 'longWeekend' ? 'Peak' : n.tier === 'weekend' ? 'Prime' : 'Base';
    return `<tr><td>${fmtPretty(n.date)}</td><td>${tier}</td><td class="num">${formatINR(n.rate)}</td></tr>`;
  }).join('');
  const transitRow = tt.total
    ? `<tr><td>Transit add-on${tt.capped ? ' (cap)' : ''}</td><td>${state.earlyHours > 0 ? `+${state.earlyHours}h early` : ''}${state.earlyHours > 0 && state.lateHours > 0 ? ' · ' : ''}${state.lateHours > 0 ? `+${state.lateHours}h late` : ''}</td><td class="num">${formatINR(tt.total)}</td></tr>`
    : '';
  const studiosMultRow = studios > 1
    ? `<tr class="studios-row"><td>Per studio subtotal</td><td>× ${studios} studios</td><td class="num">${formatINR((q.total + (tt.total || 0)) * studios)}</td></tr>`
    : '';
  const guestPdfRow = (guestInfo.extraAdults > 0
    ? `<tr class="guest-row"><td>Extra adults</td><td>${guestInfo.extraAdults} × ${formatINR(guestInfo.adultRate)}/night × ${q.totalNights}</td><td class="num">${formatINR(guestInfo.adultFee)}</td></tr>`
    : '')
    + (guestInfo.chargeableChildren > 0
    ? `<tr class="guest-row"><td>Children (7–17)</td><td>${guestInfo.chargeableChildren} × ${formatINR(guestInfo.childRate)}/night × ${q.totalNights}</td><td class="num">${formatINR(guestInfo.childFee)}</td></tr>`
    : '');
  const petPdfRow = petInfo.fee > 0
    ? `<tr class="pet-row"><td>Pet charge</td><td>${formatINR(petInfo.perNight)}/night × ${q.totalNights}</td><td class="num">${formatINR(petInfo.fee)}</td></tr>`
    : '';
  const bathtubPdfRow = bathtubInfo.fee > 0
    ? `<tr class="guest-row"><td>Bathtub charge</td><td>${bathtubInfo.quantity > 1 ? `${bathtubInfo.quantity} × ` : ''}${formatINR(bathtubInfo.perNight)}/night × ${q.totalNights}</td><td class="num">${formatINR(bathtubInfo.fee)}</td></tr>`
    : '';
  const addonPdfRows = state.addons.map(a =>
    `<tr class="addon-row"><td>${escapeHtml(a.label)}</td><td>Add-on</td><td class="num">${formatINR(a.amount)}</td></tr>`).join('');
  const subtotalRow = disc.amount > 0
    ? `<tr class="subtotal-row"><td colspan="2">${studios > 1 ? 'Booking subtotal' : 'Subtotal'}</td><td class="num">${formatINR(subtotal)}</td></tr>
       <tr class="discount-row"><td colspan="2">Discount · ${disc.label}</td><td class="num">−${formatINR(disc.amount)}</td></tr>`
    : '';

  const adv = advancePaymentFor(grandTotal, state.config, studios);

  host.innerHTML = `
    <div class="pq">
      <header class="pq-head">
        <div class="pq-brand">
          <div class="pq-brand-name">NIVAA STAYS</div>
          <div class="pq-brand-tag">Le Affordable Luxury · Pondicherry</div>
        </div>
        <div class="pq-meta">
          <div><strong>Booking Quotation</strong></div>
          <div>Quote ID: ${quoteId}</div>
          <div>Issued: ${todayStr}</div>
          <div>Valid until: ${validUntil}</div>
        </div>
      </header>

      <section class="pq-guest">
        <div><span class="pq-label">Guest</span> ${escapeHtml(state.guestName) || '—'}</div>
        <div><span class="pq-label">Mobile</span> ${escapeHtml(state.guestMobile) || '—'}</div>
      </section>

      <section class="pq-stay">
        <h3>Stay Details</h3>
        <table class="pq-stay-tbl">
          <tr><td>Check-in</td><td>${fmtPretty(state.checkIn)} · ${ciTime}${state.earlyHours > 0 ? ` <span class="pq-pill">+${state.earlyHours}h early</span>` : ''}</td></tr>
          <tr><td>Check-out</td><td>${fmtPretty(state.checkOut)} · ${coTime}${state.lateHours > 0 ? ` <span class="pq-pill">+${state.lateHours}h late</span>` : ''}</td></tr>
          <tr><td>Duration</td><td>${q.totalNights} night${q.totalNights === 1 ? '' : 's'}</td></tr>
          <tr><td>Booking</td><td>${studios === 2 ? '2 Studios · Full House' : '1 Studio'} (${state.hasBathtub ? (bathtubInfo.quantity === 1 ? 'With bathtub' : `With ${bathtubInfo.quantity} bathtubs`) : 'Without bathtub'})</td></tr>
          <tr><td>Guests</td><td>${state.adults} adult${state.adults === 1 ? '' : 's'}${state.children.length ? ` · ${state.children.length} child${state.children.length === 1 ? '' : 'ren'}` : ''}${guestInfo.extraAdults > 0 ? ` <span class="pq-pill">${guestInfo.extraAdults} extra adult${guestInfo.extraAdults === 1 ? '' : 's'}</span>` : ''}${guestInfo.chargeableChildren > 0 ? ` <span class="pq-pill">${guestInfo.chargeableChildren} paid child${guestInfo.chargeableChildren === 1 ? '' : 'ren'}</span>` : ''}</td></tr>
          ${state.children.length ? `<tr><td>Children</td><td>Ages ${state.children.map(a => Number(a) === 0 ? '<1' : a).join(', ')}</td></tr>` : ''}
          ${petInfo.fee > 0 ? `<tr><td>Pet</td><td>Travelling with a pet <span class="pq-pill">+${formatINR(petInfo.perNight)}/night</span></td></tr>` : ''}
        </table>
      </section>

      <section class="pq-rates">
        <h3>Rate Breakdown</h3>
        <table class="pq-rate-tbl">
          <thead><tr><th>Date</th><th>Tier</th><th class="num">Rate</th></tr></thead>
          <tbody>
            ${nightRows}
            ${transitRow}
            ${studiosMultRow}
            ${guestPdfRow}
            ${petPdfRow}
            ${bathtubPdfRow}
            ${subtotalRow}
            ${addonPdfRows}
          </tbody>
          <tfoot>
            <tr class="total-row"><td colspan="2">TOTAL</td><td class="num">${formatINR(grandTotal)}</td></tr>
            ${adv ? `<tr class="advance-row"><td colspan="2">Advance to confirm</td><td class="num">${formatINR(adv.amount)}</td></tr>
            <tr class="balance-row"><td colspan="2">Balance at check-in</td><td class="num">${formatINR(adv.balance)}</td></tr>` : ''}
          </tfoot>
        </table>
      </section>

      <section class="pq-terms">
        <h3>Terms</h3>
        <ul>
          <li>Standard check-in 12:00 PM, check-out 11:00 AM. Early/late as noted above.</li>
          <li>Quotation valid for 7 days from issue date; rates may change for new requests beyond that.</li>
          ${adv ? `<li>Booking is confirmed once <strong>${formatINR(adv.amount)}</strong> advance is received. Balance of <strong>${formatINR(adv.balance)}</strong> is paid at check-in.</li>` : '<li>Booking confirmed against advance payment.</li>'}
          <li>Cancellation policy shared at confirmation.</li>
          <li>Early check-in / late checkout subject to room availability on the day.</li>
        </ul>
      </section>

      <footer class="pq-foot">
        <div>Nivaa Stays · Pondicherry · +91 96203 64554 · nivaastays@gmail.com</div>
        <div>nivaastays.com · WhatsApp wa.me/919620364554</div>
      </footer>
    </div>
  `;
}

function renderStickyBar() {
  let bar = document.getElementById('rp-sticky-bar');
  const hasDates = state.checkIn && state.checkOut;
  if (!hasDates) {
    if (bar) bar.classList.remove('active');
    document.body.classList.remove('rp-has-sticky');
    return;
  }
  const c = computeQuote();
  const q = c.q, tt = c.tt, studios = c.studios, guestInfo = c.guestInfo, petInfo = c.petInfo;
  const subtotal = c.subtotal, disc = c.disc, grandTotal = c.grandTotal;
  const tx = state.config.transit;
  const ciTime = state.earlyHours > 0 ? shiftTime(tx.defaultCheckIn, state.earlyHours) : '12:00 PM';
  const waUrl = buildBookingMessage(c);

  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'rp-sticky-bar';
    bar.className = 'rp-sticky-bar';
    document.body.appendChild(bar);
  }
  bar.innerHTML = `
    <div class="rp-sticky-summary">
      <span class="rp-sticky-amt">${formatINR(grandTotal)}</span>
      <span class="rp-sticky-meta">${q.totalNights} night${q.totalNights === 1 ? '' : 's'}${tt.total ? ' · incl. transit' : ''}${disc.amount > 0 ? ' · ' + disc.label : ''}</span>
    </div>
    <a class="btn-whatsapp" href="${waUrl}" target="_blank" rel="noopener">Book →</a>
  `;
  bar.classList.add('active');
  document.body.classList.add('rp-has-sticky');
}

function onClick(e) {
  const action = e.target.closest('[data-action]');
  if (action) {
    const a = action.getAttribute('data-action');
    if (a === 'prev') { state.anchor = addMonths(state.anchor, -1); render(); return; }
    if (a === 'next') { state.anchor = addMonths(state.anchor, 1); render(); return; }
    if (a === 'clear') {
      state.checkIn = null; state.checkOut = null;
      state.earlyHours = 0; state.lateHours = 0;
      render(); return;
    }
    const tx = state.config.transit;
    if (a === 'early-inc') { state.earlyHours = Math.min(tx.maxEarlyHours, state.earlyHours + 1); render(); return; }
    if (a === 'early-dec') { state.earlyHours = Math.max(0, state.earlyHours - 1); render(); return; }
    if (a === 'late-inc')  { state.lateHours  = Math.min(tx.maxLateHours, state.lateHours + 1);  render(); return; }
    if (a === 'late-dec')  { state.lateHours  = Math.max(0, state.lateHours - 1);  render(); return; }
    if (a === 'studios-1') {
      state.studios = 1;
      const max = (state.config.guestPolicy?.maxPerStudio || 4) * 1;
      if (state.adults > max) state.adults = max;
      const maxKids = (state.config.childPolicy?.maxPerStudio || 4) * 1;
      if (state.children.length > maxKids) state.children = state.children.slice(0, maxKids);
      render(); return;
    }
    if (a === 'studios-2') {
      state.studios = 2;
      // Bump default to 4 if user is still at the default 2 — most full-house bookings have more
      if (state.adults <= 2) state.adults = 4;
      render(); return;
    }
    if (a === 'adults-inc') {
      const max = (state.config.guestPolicy?.maxPerStudio || 4) * state.studios;
      state.adults = Math.min(max, (state.adults || 2) + 1);
      render(); return;
    }
    if (a === 'adults-dec') {
      state.adults = Math.max(1, (state.adults || 2) - 1);
      render(); return;
    }
    if (a === 'children-inc') {
      const maxKids = (state.config.childPolicy?.maxPerStudio || 4) * state.studios;
      if (state.children.length < maxKids) state.children = [...state.children, CHILD_DEFAULT_AGE];
      render(); return;
    }
    if (a === 'children-dec') {
      state.children = state.children.slice(0, -1);
      render(); return;
    }
    if (a === 'pet-toggle') { state.hasPet = !state.hasPet; render(); return; }
    if (a === 'bathtub-toggle') { state.hasBathtub = !state.hasBathtub; render(); return; }
    if (a === 'disc-clear') { state.discountValue = 0; render(); return; }
    if (a === 'addon-add') {
      const label = (state.newAddonLabel || '').trim();
      const amount = Math.round(Number(state.newAddonAmount) || 0);
      if (label && amount > 0) {
        state.addons.push({ label, amount });
        state.newAddonLabel = '';
        state.newAddonAmount = '';
      }
      render(); return;
    }
    if (a === 'addon-remove') {
      const idx = parseInt(action.getAttribute('data-idx'), 10);
      if (!Number.isNaN(idx)) state.addons.splice(idx, 1);
      render(); return;
    }
    if (a === 'export-pdf') {
      renderPrintQuote();
      // Swap URL to the customer-facing share link before printing so the
      // browser's print-header URL doesn't leak `mode=admin`. Restore after.
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
    if (a === 'copy-share') {
      const url = buildShareUrl();
      navigator.clipboard.writeText(url).then(() => {
        const status = document.getElementById('rp-share-status');
        if (status) {
          status.textContent = '✓ Link copied';
          setTimeout(() => { if (status) status.textContent = ''; }, 2500);
        }
      }).catch(() => {
        const status = document.getElementById('rp-share-status');
        if (status) status.textContent = 'Copy failed — long-press to copy: ' + url;
      });
      return;
    }
  }

  const cell = e.target.closest('.rp-cell');
  if (!cell || cell.classList.contains('rp-blank') || cell.classList.contains('rp-past')) return;
  const d = cell.getAttribute('data-date');
  if (!d) return;

  if (!state.checkIn || (state.checkIn && state.checkOut)) {
    state.checkIn = d;
    state.checkOut = null;
    resetQuoteState();
  } else if (d <= state.checkIn) {
    state.checkIn = d;
    state.checkOut = null;
    resetQuoteState();
  } else {
    state.checkOut = d;
  }
  render();
}

// When the date range is changed, the prior quote (transit hours + discount)
// no longer applies — clear it so the customer/admin starts fresh.
function resetQuoteState() {
  state.earlyHours = 0;
  state.lateHours = 0;
  state.discountValue = 0;
}

function isValidYmd(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseUrlState() {
  const p = new URLSearchParams(location.search);
  const ci = p.get('ci'); const co = p.get('co');
  if (isValidYmd(ci)) state.checkIn = ci;
  if (isValidYmd(co) && (!state.checkIn || co > state.checkIn)) state.checkOut = co;
  const e = parseInt(p.get('early') || '0', 10); if (e > 0) state.earlyHours = e;
  const l = parseInt(p.get('late')  || '0', 10); if (l > 0) state.lateHours  = l;
  const s = parseInt(p.get('studios') || '1', 10); state.studios = (s === 2 ? 2 : 1);
  const a = parseInt(p.get('adults') || '0', 10);
  if (a > 0) state.adults = a;
  else state.adults = state.studios === 2 ? 4 : 2;
  const childrenParam = p.get('children');
  if (childrenParam) {
    state.children = childrenParam.split(',')
      .map(x => parseInt(x, 10))
      .filter(n => !Number.isNaN(n) && n >= 0 && n <= 17)
      .slice(0, (state.config?.childPolicy?.maxPerStudio || 4) * state.studios);
  }
  state.hasPet = p.get('pet') === '1';
  state.hasBathtub = p.get('bathtub') === '1';
  try {
    const ad = JSON.parse(p.get('addons') || '[]');
    if (Array.isArray(ad)) state.addons = ad.filter(a => a && a.label && Number(a.amount) > 0).map(a => ({ label: String(a.label), amount: Number(a.amount) }));
  } catch (_) { /* malformed addons param — ignore */ }

  // Legacy auto-discount URLs must not turn the old default offer into a
  // manual discount. Explicit manual discounts remain shareable.
  const isAuto = p.get('discSrc') === 'auto';
  if (!isAuto) {
    const dt = p.get('discType'); if (dt === 'pct' || dt === 'amt') state.discountType = dt;
    const dv = parseFloat(p.get('disc') || '0'); if (dv > 0) state.discountValue = dv;
  }

  // Admin mode is unlocked either by the URL fallback (?mode=admin) or by
  // a signed-in admin via Google Sign-In. The latter is the preferred path;
  // the URL flag stays as a manual override during transition.
  const urlAdmin = p.get('mode') === 'admin';
  const authAdmin = !!(window.NivaaAuth && window.NivaaAuth.isAdmin());
  state.isAdmin = urlAdmin || authAdmin;
}

function buildShareUrl(includeAdmin = false) {
  const p = new URLSearchParams();
  if (state.checkIn) p.set('ci', state.checkIn);
  if (state.checkOut) p.set('co', state.checkOut);
  if (state.earlyHours) p.set('early', String(state.earlyHours));
  if (state.lateHours) p.set('late', String(state.lateHours));
  if (state.studios && state.studios !== 1) p.set('studios', String(state.studios));
  // Only emit adults if it differs from the default-for-studios (cleaner URLs)
  const defaultAdults = state.studios === 2 ? 4 : 2;
  if (state.adults && state.adults !== defaultAdults) p.set('adults', String(state.adults));
  if (state.children.length) p.set('children', state.children.join(','));
  if (state.hasPet) p.set('pet', '1');
  if (state.hasBathtub) p.set('bathtub', '1');
  if (state.addons.length) p.set('addons', JSON.stringify(state.addons));

  // Only explicit discounts are included in shared quote URLs.
  if (state.discountValue > 0) {
    p.set('discType', state.discountType);
    p.set('disc', String(state.discountValue));
  }

  if (includeAdmin && state.isAdmin) p.set('mode', 'admin');
  return location.origin + location.pathname + (p.toString() ? '?' + p.toString() : '');
}

function syncUrlState() {
  // Always keep the address bar in sync with state so the URL is shareable
  // anytime — customer or admin. Admin flag stays in the URL for the admin's
  // own session; "Copy share link" strips it for the customer-facing copy.
  const url = buildShareUrl(true);
  try { history.replaceState(null, '', url); } catch (_) { /* sandboxed env */ }
}

function onChange(e) {
  const input = e.target.closest('[data-input]');
  if (!input) return;
  const key = input.getAttribute('data-input');
  if (key === 'discType') { state.discountType = input.value === 'amt' ? 'amt' : 'pct'; render(); return; }
  if (key === 'discValue') { state.discountValue = Math.max(0, parseFloat(input.value) || 0); render(); return; }
  if (key === 'child-age') {
    const idx = parseInt(input.getAttribute('data-idx'), 10);
    if (!Number.isNaN(idx) && idx >= 0 && idx < state.children.length) {
      const next = state.children.slice();
      next[idx] = Math.max(0, parseInt(input.value, 10) || 0);
      state.children = next;
      render();
    }
    return;
  }
  if (key === 'addonLabel') { state.newAddonLabel = input.value; return; }
  if (key === 'addonAmount') { state.newAddonAmount = input.value; return; }
  if (key === 'guestName') { state.guestName = input.value; renderPrintQuote(); return; }
  if (key === 'guestMobile') { state.guestMobile = input.value; renderPrintQuote(); return; }
}

async function init() {
  const root = document.getElementById('rate-picker');
  if (!root) return;
  state.root = root;

  try {
    const res = await fetch('data/pricing.json', { cache: 'no-cache' });
    state.config = await res.json();
  } catch (err) {
    root.innerHTML = '<div style="padding:1rem;color:#900;">Could not load pricing config.</div>';
    return;
  }

  parseUrlState();

  const now = new Date();
  state.today = ymd(now);
  state.anchor = startOfMonth(state.checkIn ? new Date(state.checkIn) : now);
  render();
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('input', onChange);

  // Re-render when admin signs in/out so the discount panel appears/disappears
  window.addEventListener('nivaa-auth-change', () => {
    const p = new URLSearchParams(location.search);
    const urlAdmin = p.get('mode') === 'admin';
    const authAdmin = !!(window.NivaaAuth && window.NivaaAuth.isAdmin());
    state.isAdmin = urlAdmin || authAdmin;
    render();
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
