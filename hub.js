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

function renderHub(data) {
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

    html += `</div>`;
  }

  container.innerHTML = html;
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

  const container = document.getElementById('guest-hub');
  if (container) {
    container.innerHTML = '<div class="hub-card hub-loading">Loading your stay…</div>';
  }
  passBookingIdToLinks(id);

  try {
    const data = await loadHub(id);
    renderHub(data);
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
