// Nivaa Stays — inline two-month calendar picker with per-night pricing.
// Renders into <div id="rate-picker"></div>. Uses pricing.js for rate lookups.

import { rateForDate, quoteForRange, formatINR, transitFee, transitTotal, shiftTime, autoDiscountFor, advancePaymentFor, guestFeeFor } from './pricing.js';

const WHATSAPP = '919620364554';
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
  guests: 2,             // total guest count across the booking
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

function renderBreakdown() {
  if (!state.checkIn || !state.checkOut) return '';

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

  const tx = state.config.transit;
  const tt = transitTotal(state.earlyHours, state.lateHours, state.config);
  const transitSection = renderTransit(tx, tt);

  const studios = state.studios || 1;
  const roomTotal = q.total * studios;
  const transitSubtotal = (tt.total || 0) * studios;
  const guestInfo = guestFeeFor(state.guests, studios, q.totalNights, state.config);
  const subtotal = roomTotal + transitSubtotal + guestInfo.fee;
  const disc = computeDiscount(subtotal, { totalNights: q.totalNights });
  const grandTotal = Math.max(0, subtotal - disc.amount);

  const ciTime = state.earlyHours > 0 ? shiftTime(tx.defaultCheckIn, state.earlyHours) : '12:00 PM';
  const coTime = state.lateHours > 0 ? shiftTime(tx.defaultCheckOut, -state.lateHours) : '11:00 AM';

  const transitMsgPart = (state.earlyHours > 0 || state.lateHours > 0)
    ? ` Includes${state.earlyHours > 0 ? ` early check-in ${state.earlyHours}h (₹${tt.early})` : ''}${state.earlyHours > 0 && state.lateHours > 0 ? ' and' : ''}${state.lateHours > 0 ? ` late checkout ${state.lateHours}h (₹${tt.late})` : ''}${tt.capped ? ' (combined cap applied)' : ''}.`
    : '';
  const discMsgPart = disc.amount > 0 ? ` Discount: ${disc.label} (−${formatINR(disc.amount)}).` : '';
  const quoteUrl = buildShareUrl(false);

  const studiosMsgPart = studios > 1 ? ` ${studios} studios (Full House).` : '';
  const guestsMsgPart = ` ${state.guests} guest${state.guests === 1 ? '' : 's'}${guestInfo.extras > 0 ? ` (${guestInfo.extras} extra)` : ''}.`;
  const msg = `Hi Nivaa Stays, I'd like to book ${q.totalNights} night${q.totalNights === 1 ? '' : 's'}: check-in ${state.checkIn} ${ciTime}, check-out ${state.checkOut} ${coTime}.${studiosMsgPart}${guestsMsgPart} Total ${formatINR(grandTotal)}.${transitMsgPart}${discMsgPart}\n\nQuote: ${quoteUrl}`;
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

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
  const guestScreenRow = guestInfo.fee > 0
    ? `<div class="rp-row rp-row-guest">
        <span class="rp-row-date">Extra guests</span>
        <span class="rp-row-tier">${guestInfo.extras} × ${formatINR(guestInfo.perGuestPerNight)} × ${q.totalNights} night${q.totalNights === 1 ? '' : 's'}</span>
        <span class="rp-row-rate">${formatINR(guestInfo.fee)}</span>
      </div>`
    : '';

  const subtotalRow = disc.amount > 0
    ? `<div class="rp-row rp-row-subtotal"><span class="rp-row-date">Subtotal</span><span></span><span class="rp-row-rate">${formatINR(subtotal)}</span></div>
       <div class="rp-row rp-row-discount"><span class="rp-row-date">Discount</span><span class="rp-row-tier">${disc.label}</span><span class="rp-row-rate">−${formatINR(disc.amount)}</span></div>`
    : '';

  return `<div class="rp-breakdown">
    <div class="rp-summary">
      <div><strong>${fmtPretty(state.checkIn)}</strong> → <strong>${fmtPretty(state.checkOut)}</strong></div>
      <div class="rp-nights">${q.totalNights} night${q.totalNights === 1 ? '' : 's'}</div>
    </div>
    <div class="rp-rows">${rows}${transitTotalRow}${studiosScreenRow}${guestScreenRow}${subtotalRow}</div>
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
    <div class="rp-fineprint">Rates per room per night.${disc.amount > 0 ? '' : ' 10% off on direct bookings — code <strong>NIVAA10</strong>.'} Long-weekend nights apply when a public holiday falls on Friday (Fri+Sat) or Monday (Sat+Sun). Early check-in / late checkout subject to room availability — please confirm on WhatsApp.</div>
  </div>`;
}

function computeDiscount(subtotal, quoteContext) {
  // Manual discount (set via admin or URL) overrides auto.
  const manual = Number(state.discountValue) || 0;
  if (manual > 0) {
    if (state.discountType === 'pct') {
      const pct = Math.min(100, Math.max(0, manual));
      return { amount: Math.round(subtotal * pct / 100), label: `${pct}% off`, source: 'manual' };
    }
    const amt = Math.min(subtotal, manual);
    return { amount: amt, label: `${formatINR(amt)} off`, source: 'manual' };
  }
  // Fall back to the best-matching auto-discount rule.
  const rule = quoteContext ? autoDiscountFor(quoteContext, state.config) : null;
  if (!rule) return { amount: 0, label: '', source: null };
  if (rule.type === 'pct') {
    return {
      amount: Math.round(subtotal * rule.value / 100),
      label: `${rule.value}% off · ${rule.name}`,
      source: 'auto',
      ruleId: rule.id
    };
  }
  return {
    amount: Math.min(subtotal, rule.value),
    label: `${formatINR(rule.value)} off · ${rule.name}`,
    source: 'auto',
    ruleId: rule.id
  };
}

function renderAdminPanel() {
  // Surface any active auto-discount so admin knows what would apply if they
  // leave the manual field at 0.
  let autoNote = '';
  if (state.checkIn && state.checkOut) {
    const q = quoteForRange(state.checkIn, state.checkOut, state.config);
    const rule = autoDiscountFor({ totalNights: q.totalNights }, state.config);
    if (rule) {
      const v = rule.type === 'pct' ? `${rule.value}%` : formatINR(rule.value);
      autoNote = `<div class="rp-admin-auto">Auto-applied: <strong>${v}</strong> · ${rule.name}. Set a manual value below to override.</div>`;
    }
  }
  const canExport = state.checkIn && state.checkOut;
  return `<details class="rp-admin" open>
    <summary>🔒 Admin · Build a quote</summary>
    <div class="rp-admin-body">
      ${autoNote}
      <div class="rp-admin-row">
        <label class="rp-admin-label">Override</label>
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
          <span class="rp-studios-label">Guests</span>
          <div class="rp-guests-stepper">
            <button type="button" class="rp-step-btn" data-action="guests-dec" ${state.guests <= 1 ? 'disabled' : ''}>−</button>
            <span class="rp-step-val">${state.guests}</span>
            <button type="button" class="rp-step-btn" data-action="guests-inc" ${state.guests >= (state.config?.guestPolicy?.maxPerStudio || 4) * state.studios ? 'disabled' : ''}>+</button>
          </div>
          <span class="rp-guests-hint">${state.studios * 2} included · max ${state.studios * 4}</span>
        </div>
      </div>
      <div class="rp-header">
        <button type="button" class="rp-nav" data-action="prev" aria-label="Previous month">‹</button>
        <div class="rp-legend">
          <span><i class="rp-dot rp-dot-weekday"></i> Weekday ₹2,000</span>
          <span><i class="rp-dot rp-dot-weekend"></i> Weekend ₹2,500</span>
          <span><i class="rp-dot rp-dot-longWeekend"></i> Long wknd ₹3,000</span>
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
  const q = quoteForRange(state.checkIn, state.checkOut, state.config);
  const tt = transitTotal(state.earlyHours, state.lateHours, state.config);
  const studios = state.studios || 1;
  const guestInfo = guestFeeFor(state.guests, studios, q.totalNights, state.config);
  const subtotal = (q.total + (tt.total || 0)) * studios + guestInfo.fee;
  const disc = computeDiscount(subtotal, { totalNights: q.totalNights });
  const grandTotal = Math.max(0, subtotal - disc.amount);
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
    const tier = n.tier === 'longWeekend' ? 'Long weekend' : n.tier === 'weekend' ? 'Weekend' : 'Weekday';
    return `<tr><td>${fmtPretty(n.date)}</td><td>${tier}</td><td class="num">${formatINR(n.rate)}</td></tr>`;
  }).join('');
  const transitRow = tt.total
    ? `<tr><td>Transit add-on${tt.capped ? ' (cap)' : ''}</td><td>${state.earlyHours > 0 ? `+${state.earlyHours}h early` : ''}${state.earlyHours > 0 && state.lateHours > 0 ? ' · ' : ''}${state.lateHours > 0 ? `+${state.lateHours}h late` : ''}</td><td class="num">${formatINR(tt.total)}</td></tr>`
    : '';
  const studiosMultRow = studios > 1
    ? `<tr class="studios-row"><td>Per studio subtotal</td><td>× ${studios} studios</td><td class="num">${formatINR((q.total + (tt.total || 0)) * studios)}</td></tr>`
    : '';
  const guestPdfRow = guestInfo.fee > 0
    ? `<tr class="guest-row"><td>Extra guests</td><td>${guestInfo.extras} × ${formatINR(guestInfo.perGuestPerNight)}/night × ${q.totalNights}</td><td class="num">${formatINR(guestInfo.fee)}</td></tr>`
    : '';
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
          <tr><td>Booking</td><td>${studios === 2 ? '2 Studios · Full House' : '1 Studio'}</td></tr>
          <tr><td>Guests</td><td>${state.guests}${guestInfo.extras > 0 ? ` <span class="pq-pill">${guestInfo.extras} extra</span>` : ''}</td></tr>
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
            ${subtotalRow}
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
  const q = quoteForRange(state.checkIn, state.checkOut, state.config);
  const tt = transitTotal(state.earlyHours, state.lateHours, state.config);
  const studios = state.studios || 1;
  const guestInfo = guestFeeFor(state.guests, studios, q.totalNights, state.config);
  const subtotal = (q.total + (tt.total || 0)) * studios + guestInfo.fee;
  const disc = computeDiscount(subtotal, { totalNights: q.totalNights });
  const grandTotal = Math.max(0, subtotal - disc.amount);
  const tx = state.config.transit;
  const ciTime = state.earlyHours > 0 ? shiftTime(tx.defaultCheckIn, state.earlyHours) : '12:00 PM';
  const coTime = state.lateHours > 0 ? shiftTime(tx.defaultCheckOut, -state.lateHours) : '11:00 AM';
  const transitMsgPart = (state.earlyHours > 0 || state.lateHours > 0)
    ? ` Includes${state.earlyHours > 0 ? ` early check-in ${state.earlyHours}h (₹${tt.early})` : ''}${state.earlyHours > 0 && state.lateHours > 0 ? ' and' : ''}${state.lateHours > 0 ? ` late checkout ${state.lateHours}h (₹${tt.late})` : ''}${tt.capped ? ' (combined cap applied)' : ''}.`
    : '';
  const discMsgPart = disc.amount > 0 ? ` Discount: ${disc.label} (−${formatINR(disc.amount)}).` : '';
  const quoteUrl = buildShareUrl(false);
  const studiosMsgPart = studios > 1 ? ` ${studios} studios (Full House).` : '';
  const guestsMsgPart = ` ${state.guests} guest${state.guests === 1 ? '' : 's'}${guestInfo.extras > 0 ? ` (${guestInfo.extras} extra)` : ''}.`;
  const msg = `Hi Nivaa Stays, I'd like to book ${q.totalNights} night${q.totalNights === 1 ? '' : 's'}: check-in ${state.checkIn} ${ciTime}, check-out ${state.checkOut} ${coTime}.${studiosMsgPart}${guestsMsgPart} Total ${formatINR(grandTotal)}.${transitMsgPart}${discMsgPart}\n\nQuote: ${quoteUrl}`;
  const waUrl = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

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
      if (state.guests > max) state.guests = max;
      render(); return;
    }
    if (a === 'studios-2') {
      state.studios = 2;
      // Bump default to 4 if user is still at the default 2 — most full-house bookings have more
      if (state.guests <= 2) state.guests = 4;
      render(); return;
    }
    if (a === 'guests-inc') {
      const max = (state.config.guestPolicy?.maxPerStudio || 4) * state.studios;
      state.guests = Math.min(max, (state.guests || 2) + 1);
      render(); return;
    }
    if (a === 'guests-dec') {
      state.guests = Math.max(1, (state.guests || 2) - 1);
      render(); return;
    }
    if (a === 'disc-clear') { state.discountValue = 0; render(); return; }
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
  const g = parseInt(p.get('guests') || '0', 10);
  if (g > 0) state.guests = g;
  else state.guests = state.studios === 2 ? 4 : 2;

  // Only sticky-apply manual discounts. Auto values (discSrc=auto) are
  // informational in the URL — the rules engine recomputes them on render.
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
  // Only emit guests if it differs from the default-for-studios (cleaner URLs)
  const defaultGuests = state.studios === 2 ? 4 : 2;
  if (state.guests && state.guests !== defaultGuests) p.set('guests', String(state.guests));

  // Always reflect the effective discount in the URL. Manual values are sticky
  // (parser writes them back to state). Auto values are tagged with discSrc=auto
  // so the parser knows to leave state alone and let the rules engine compute
  // fresh from dates — useful when the customer adjusts their range.
  if (state.discountValue > 0) {
    p.set('discType', state.discountType);
    p.set('disc', String(state.discountValue));
  } else if (state.checkIn && state.checkOut && state.config) {
    const q = quoteForRange(state.checkIn, state.checkOut, state.config);
    const rule = autoDiscountFor({ totalNights: q.totalNights }, state.config);
    if (rule) {
      p.set('discType', rule.type);
      p.set('disc', String(rule.value));
      p.set('discSrc', 'auto');
      p.set('discRule', rule.id);
    }
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
