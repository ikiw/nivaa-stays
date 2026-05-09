// Nivaa Stays — guest hub data fetcher + renderer.
// Activates when welcome.html is loaded with ?id={booking-id}. Otherwise the
// page renders as the static guide.

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxkdwbDe8eSoYuapo2xp6XRYmiosBWfACvHVp9D6hOGHnN0c39YHGA-ecZFLhFDrFb/exec';

function bookingIdFromUrl() {
  const id = new URLSearchParams(location.search).get('id');
  return /^\d+-\d{4}-\d{2}-\d{2}$/.test(id || '') ? id : '';
}

async function loadHub(bookingId) {
  const url = APPS_SCRIPT_URL + '?hub=' + encodeURIComponent(bookingId);
  const res = await fetch(url);
  return res.json();
}

function inr(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0
  }).format(Number(n) || 0);
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function fmtDate(s) {
  if (!s) return '';
  const [y, m, d] = String(s).split('-').map(Number);
  if (!y) return String(s);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short'
  });
}

function fmtTimeShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'
  });
}

function calcNights(ci, co) {
  const a = new Date(ci);
  const b = new Date(co);
  if (isNaN(a) || isNaN(b)) return 0;
  return Math.max(1, Math.round((b - a) / 86400000));
}

// Module-level cache so the invoice renderer can read the same data the
// charges card was rendered from without re-fetching.
let HUB_DATA = null;
let HUB_BOOKING_ID = '';

function renderHub(data) {
  HUB_DATA = data;
  const container = document.getElementById('guest-hub');
  if (!container) return;

  if (!data || !data.found) {
    container.innerHTML = `
      <div class="hub-card hub-empty">
        <div class="hub-empty-title">Booking not found</div>
        <div class="hub-empty-body">We couldn't match this link to a booking. Please check the URL or message us on WhatsApp.</div>
      </div>`;
    return;
  }

  const b = data.booking;
  const t = data.totals || {};
  const nights = calcNights(b.checkin, b.checkout);

  // Hide the static welcome header when we have a personalized greeting
  const staticHead = document.getElementById('welcome-static-header');
  if (staticHead) staticHead.style.display = 'none';

  let html = `
    <div class="hub-card hub-summary">
      <div class="hub-eyebrow">Your Stay</div>
      <h2 class="hub-greeting">Hi ${escapeHtml(b.name) || 'guest'} 👋</h2>
      <div class="hub-stay-grid">
        <div><div class="hub-label">Check-in</div><div class="hub-value">${fmtDate(b.checkin)}</div></div>
        <div><div class="hub-label">Check-out</div><div class="hub-value">${fmtDate(b.checkout)}</div></div>
        <div><div class="hub-label">Nights</div><div class="hub-value">${nights || '—'}</div></div>
        <div><div class="hub-label">Room</div><div class="hub-value">${escapeHtml(b.room) || '—'}</div></div>
      </div>
    </div>
  `;

  const hasCharges = (data.orders && data.orders.length) ||
                     (data.rentals && data.rentals.length) ||
                     (data.addons && data.addons.length) ||
                     (t.stayBase || 0) > 0;

  if (hasCharges) {
    html += `<div class="hub-card hub-charges"><h3 class="hub-section-title">Your Charges</h3>`;

    if ((t.stayBase || 0) > 0) {
      html += `
        <div class="hub-charge-block">
          <div class="hub-row hub-row-line">
            <span>Stay (${nights} night${nights === 1 ? '' : 's'})</span>
            <span class="hub-amt">${inr(t.stayBase)}</span>
          </div>
        </div>`;
    }

    if (data.orders && data.orders.length) {
      const orderRows = data.orders.map(o => {
        const itemDesc = (o.items || [])
          .map(it => `${it.qty}× ${escapeHtml(it.name)}`)
          .join(', ');
        return `
          <div class="hub-row hub-row-line">
            <span>
              <span class="hub-row-main">${itemDesc || 'Order'}</span>
              <span class="hub-row-meta">${fmtTimeShort(o.submittedAt)} · ${escapeHtml(o.status)}</span>
            </span>
            <span class="hub-amt">${inr(o.subtotal)}</span>
          </div>`;
      }).join('');
      html += `
        <div class="hub-charge-block">
          <div class="hub-charge-block-title">Food orders (${data.orders.length})</div>
          ${orderRows}
          <div class="hub-row hub-row-sub">
            <span>Food subtotal</span>
            <span class="hub-amt">${inr(t.foodTotal)}</span>
          </div>
        </div>`;
    }

    if (data.rentals && data.rentals.length) {
      const rentRows = data.rentals.map(r => `
        <div class="hub-row hub-row-line">
          <span>
            <span class="hub-row-main">${escapeHtml(r.type)} · ${r.days} day${r.days === 1 ? '' : 's'}</span>
            <span class="hub-row-meta">${fmtDate(r.startDate)} → ${fmtDate(r.endDate)} · ${escapeHtml(r.status)}</span>
          </span>
          <span class="hub-amt">${inr(r.subtotal)}</span>
        </div>`).join('');
      html += `
        <div class="hub-charge-block">
          <div class="hub-charge-block-title">Bike rentals (${data.rentals.length})</div>
          ${rentRows}
          <div class="hub-row hub-row-sub">
            <span>Rental subtotal</span>
            <span class="hub-amt">${inr(t.rentalTotal)}</span>
          </div>
        </div>`;
    }

    if (data.addons && data.addons.length) {
      const addonRows = data.addons.map(a => `
        <div class="hub-row hub-row-line">
          <span>
            <span class="hub-row-main">${escapeHtml(a.type)}</span>
            ${a.description ? `<span class="hub-row-meta">${escapeHtml(a.description)}</span>` : ''}
          </span>
          <span class="hub-amt">${inr(a.amount)}</span>
        </div>`).join('');
      html += `
        <div class="hub-charge-block">
          <div class="hub-charge-block-title">Add-ons (${data.addons.length})</div>
          ${addonRows}
          <div class="hub-row hub-row-sub">
            <span>Add-on subtotal</span>
            <span class="hub-amt">${inr(t.addonTotal)}</span>
          </div>
        </div>`;
    }

    html += `
      <div class="hub-row hub-row-grand">
        <span>Total</span>
        <span class="hub-amt">${inr(t.grandTotal)}</span>
      </div>`;

    if ((t.advancePaid || 0) > 0) {
      html += `
        <div class="hub-row hub-row-paid">
          <span>Advance paid</span>
          <span class="hub-amt">−${inr(t.advancePaid)}</span>
        </div>
        <div class="hub-row hub-row-balance">
          <span>Balance at check-out</span>
          <span class="hub-amt">${inr(t.balance)}</span>
        </div>`;
    }

    html += `
      <div class="hub-actions">
        <button type="button" class="btn-outline-teal hub-invoice-btn" data-action="invoice">Download Invoice (PDF)</button>
      </div>
    </div>`;
  }

  container.innerHTML = html;
}

async function postRental(payload) {
  const body = new URLSearchParams();
  body.set('action', 'rental');
  body.set('bookingId', HUB_BOOKING_ID);
  Object.entries(payload).forEach(([k, v]) => body.set(k, v));
  const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', body });
  return res.json();
}

function activateRentalForm() {
  const card = document.getElementById('rental-card');
  if (!card) return;
  const staticEl = card.querySelector('[data-rental-static]');
  const formEl   = card.querySelector('[data-rental-form]');
  if (!staticEl || !formEl) return;
  staticEl.classList.add('hidden');
  formEl.classList.remove('hidden');

  const form = card.querySelector('#rental-form');
  const status = card.querySelector('[data-rental-status]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!HUB_BOOKING_ID) return;
    const fd = new FormData(form);
    const payload = {
      type: fd.get('type') || 'vespa',
      startDate: fd.get('startDate') || '',
      endDate: fd.get('endDate') || '',
      notes: fd.get('notes') || ''
    };
    if (!payload.startDate || !payload.endDate) {
      status.textContent = 'Please pick start and end dates.';
      return;
    }
    if (payload.endDate < payload.startDate) {
      status.textContent = 'End date must be on or after the start date.';
      return;
    }
    const submit = form.querySelector('button[type="submit"]');
    const originalText = submit.textContent;
    submit.disabled = true;
    submit.textContent = 'Sending request…';
    status.textContent = '';
    try {
      const result = await postRental(payload);
      if (!result || !result.success) {
        status.textContent = (result && result.error) || 'Could not record the request. Please WhatsApp us instead.';
      } else {
        status.textContent = '✓ Request received — opening WhatsApp to confirm with the host.';
        // Refresh hub data to reflect the new rental row
        try {
          const refreshed = await loadHub(HUB_BOOKING_ID);
          renderHub(refreshed);
        } catch (_) {}
        // Open WhatsApp with the rental summary
        const bikeName = payload.type === 'ninja' ? 'Kawasaki Ninja' : 'Yellow Vespa';
        const msg = `Hi Nivaa Stays, I'd like to rent the ${bikeName} from ${payload.startDate} to ${payload.endDate}.${payload.notes ? ' Notes: ' + payload.notes + '.' : ''}\nBooking: ${HUB_BOOKING_ID}`;
        const waUrl = `https://wa.me/919620364554?text=${encodeURIComponent(msg)}`;
        setTimeout(() => window.open(waUrl, '_blank', 'noopener'), 400);
      }
    } catch (err) {
      status.textContent = 'Network error. Please WhatsApp us directly.';
    }
    submit.disabled = false;
    submit.textContent = originalText;
  });
}

// ---------- Invoice (browser-print PDF) ----------

function renderInvoiceDom() {
  let host = document.getElementById('hub-print-invoice');
  if (!host) {
    host = document.createElement('div');
    host.id = 'hub-print-invoice';
    document.body.appendChild(host);
  }
  if (!HUB_DATA || !HUB_DATA.found) {
    host.innerHTML = '';
    return;
  }
  const b = HUB_DATA.booking;
  const t = HUB_DATA.totals || {};
  const nights = calcNights(b.checkin, b.checkout);

  const today = new Date();
  const todayStr = today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  const invoiceId = `NV-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}${String(today.getDate()).padStart(2,'0')}-${String(b.phone || '').slice(-4) || 'XXXX'}`;

  const stayRow = (t.stayBase || 0) > 0
    ? `<tr><td>Stay (${nights} night${nights === 1 ? '' : 's'})</td><td>${escapeHtml(b.room || '—')}</td><td class="num">${inr(t.stayBase)}</td></tr>`
    : '';

  const orderRows = (HUB_DATA.orders || []).map(o => {
    const desc = (o.items || []).map(it => `${it.qty}× ${escapeHtml(it.name)}`).join(', ');
    return `<tr><td>${desc || 'Food order'}</td><td>${fmtTimeShort(o.submittedAt)}</td><td class="num">${inr(o.subtotal)}</td></tr>`;
  }).join('');
  const orderSection = orderRows ? `
    <tr class="hi-section"><td colspan="3">Food orders</td></tr>
    ${orderRows}
    <tr class="hi-sub"><td colspan="2">Food subtotal</td><td class="num">${inr(t.foodTotal)}</td></tr>
  ` : '';

  const rentalRows = (HUB_DATA.rentals || []).map(r => `
    <tr><td>${escapeHtml(r.type)} · ${r.days} day${r.days === 1 ? '' : 's'}</td><td>${fmtDate(r.startDate)} → ${fmtDate(r.endDate)}</td><td class="num">${inr(r.subtotal)}</td></tr>
  `).join('');
  const rentalSection = rentalRows ? `
    <tr class="hi-section"><td colspan="3">Bike rentals</td></tr>
    ${rentalRows}
    <tr class="hi-sub"><td colspan="2">Rental subtotal</td><td class="num">${inr(t.rentalTotal)}</td></tr>
  ` : '';

  const addonRows = (HUB_DATA.addons || []).map(a => `
    <tr><td>${escapeHtml(a.type)}</td><td>${escapeHtml(a.description || '')}</td><td class="num">${inr(a.amount)}</td></tr>
  `).join('');
  const addonSection = addonRows ? `
    <tr class="hi-section"><td colspan="3">Add-ons</td></tr>
    ${addonRows}
    <tr class="hi-sub"><td colspan="2">Add-on subtotal</td><td class="num">${inr(t.addonTotal)}</td></tr>
  ` : '';

  const advanceRow = (t.advancePaid || 0) > 0 ? `
    <tr class="hi-paid"><td colspan="2">Advance paid</td><td class="num">−${inr(t.advancePaid)}</td></tr>
    <tr class="hi-balance"><td colspan="2">BALANCE AT CHECK-OUT</td><td class="num">${inr(t.balance)}</td></tr>
  ` : '';

  host.innerHTML = `
    <div class="hi">
      <header class="hi-head">
        <div>
          <div class="hi-brand">NIVAA STAYS</div>
          <div class="hi-tag">Le Affordable Luxury · Pondicherry</div>
        </div>
        <div class="hi-meta">
          <div><strong>Stay Invoice</strong></div>
          <div>Invoice: ${invoiceId}</div>
          <div>Issued: ${todayStr}</div>
        </div>
      </header>

      <section class="hi-billing">
        <div><span class="hi-label">Guest</span> ${escapeHtml(b.name) || '—'}</div>
        <div><span class="hi-label">Mobile</span> +91 ${escapeHtml(b.phone) || '—'}</div>
      </section>

      <section class="hi-stay">
        <h3>Stay Details</h3>
        <table class="hi-stay-tbl">
          <tr><td>Check-in</td><td>${fmtDate(b.checkin)} · 12:00 PM</td></tr>
          <tr><td>Check-out</td><td>${fmtDate(b.checkout)} · 11:00 AM</td></tr>
          <tr><td>Duration</td><td>${nights} night${nights === 1 ? '' : 's'}</td></tr>
          <tr><td>Room</td><td>${escapeHtml(b.room) || '—'}</td></tr>
        </table>
      </section>

      <section class="hi-charges">
        <h3>Charges</h3>
        <table class="hi-charges-tbl">
          <thead><tr><th>Item</th><th>Detail</th><th class="num">Amount</th></tr></thead>
          <tbody>
            ${stayRow}
            ${orderSection}
            ${rentalSection}
            ${addonSection}
          </tbody>
          <tfoot>
            <tr class="hi-total"><td colspan="2">TOTAL</td><td class="num">${inr(t.grandTotal)}</td></tr>
            ${advanceRow}
          </tfoot>
        </table>
      </section>

      <footer class="hi-foot">
        <div>Thank you for staying with us! 🙏</div>
        <div>Nivaa Stays · +91 96203 64554 · nivaastays@gmail.com · nivaastays.com</div>
      </footer>
    </div>
  `;
}

function printInvoice() {
  if (!HUB_DATA || !HUB_DATA.found) return;
  renderInvoiceDom();
  // Strip ?id from the address bar during print so the print-header URL
  // doesn't leak the booking ID; restore right after.
  const original = location.href;
  const clean = location.origin + location.pathname;
  try { history.replaceState(null, '', clean); } catch (_) {}
  const restore = () => {
    window.removeEventListener('afterprint', restore);
    try { history.replaceState(null, '', original); } catch (_) {}
  };
  window.addEventListener('afterprint', restore);
  setTimeout(() => window.print(), 50);
}

function passBookingIdToLinks(bookingId) {
  document.querySelectorAll('[data-pass-id]').forEach(el => {
    try {
      const u = new URL(el.getAttribute('href'), location.origin);
      u.searchParams.set('id', bookingId);
      el.setAttribute('href', u.toString());
    } catch (_) {}
  });
}

async function init() {
  const id = bookingIdFromUrl();
  if (!id) return;

  HUB_BOOKING_ID = id;
  const container = document.getElementById('guest-hub');
  if (container) {
    container.innerHTML = `
      <div class="hub-card hub-summary hub-skeleton" aria-busy="true" aria-label="Loading your stay">
        <span class="sk sk-eyebrow"></span>
        <span class="sk sk-greeting"></span>
        <div class="hub-stay-grid">
          <div><span class="sk sk-label"></span><span class="sk sk-value"></span></div>
          <div><span class="sk sk-label"></span><span class="sk sk-value"></span></div>
          <div><span class="sk sk-label"></span><span class="sk sk-value"></span></div>
          <div><span class="sk sk-label"></span><span class="sk sk-value"></span></div>
        </div>
      </div>`;
  }
  passBookingIdToLinks(id);
  activateRentalForm();

  // Delegate clicks for hub-internal actions (invoice button is inside the
  // dynamically rendered charges card, so we attach to the container).
  if (container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.getAttribute('data-action') === 'invoice') printInvoice();
    });
  }

  try {
    const data = await loadHub(id);
    renderHub(data);
    // Deep-link auto-action: ?print=invoice → trigger invoice download
    // immediately after data lands. Used by the Admin dashboard's Invoice
    // button so admin doesn't have to scroll + click.
    const printAction = new URLSearchParams(location.search).get('print');
    if (printAction === 'invoice' && data && data.found) {
      setTimeout(printInvoice, 250);
    }
  } catch (err) {
    if (container) {
      container.innerHTML = `
        <div class="hub-card hub-empty">
          <div class="hub-empty-title">Couldn't load your stay</div>
          <div class="hub-empty-body">Please refresh or message us on WhatsApp.</div>
        </div>`;
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
