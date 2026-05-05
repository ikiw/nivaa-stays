// Nivaa Stays — admin dashboard (loaded by admin.html)
// Lists today's arrivals / in-house / departures / upcoming bookings.
// Deep-links each row to that guest's hub, order, and quote pages with
// ?mode=admin so admin-only UI is enabled there.

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxkdwbDe8eSoYuapo2xp6XRYmiosBWfACvHVp9D6hOGHnN0c39YHGA-ecZFLhFDrFb/exec';

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

function fmtFullDate(s) {
  if (!s) return '';
  const [y, m, d] = String(s).split('-').map(Number);
  if (!y) return String(s);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}

async function fetchActive() {
  const url = APPS_SCRIPT_URL + '?activeBookings=1';
  const res = await fetch(url);
  return res.json();
}

function receiptUrl(b) {
  const p = new URLSearchParams();
  p.set('mode', 'admin');
  if (b.checkin) p.set('ci', b.checkin);
  if (b.checkout) p.set('co', b.checkout);
  if (b.name) p.set('name', b.name);
  if (b.phone) p.set('mobile', b.phone);
  if (b.bookingId) p.set('bid', b.bookingId);
  const platform = b.platform || b.onlineOffline || '';
  if (platform && platform !== 'Direct') p.set('platform', platform);
  const guests = parseInt(b.num_guests) || 0;
  if (guests > 0) p.set('guests', String(guests));
  const advRaw = String(b.advance || b.paid || '').replace(/[^0-9.]/g, '');
  const adv = parseInt(advRaw) || 0;
  if (adv > 0) p.set('adv', String(adv));
  const amtRaw = String(b.amount || '').replace(/[^0-9.]/g, '');
  const amt = parseInt(amtRaw) || 0;
  if (amt > 0) p.set('amt', String(amt));
  return 'receipt.html?' + p.toString();
}

function bookingRow(b) {
  const hubUrl     = `welcome.html?id=${encodeURIComponent(b.bookingId)}&mode=admin`;
  const orderUrl   = `order.html?id=${encodeURIComponent(b.bookingId)}&mode=admin`;
  const rcptUrl    = receiptUrl(b);
  const waUrl      = `https://wa.me/91${b.phone}`;
  return `
    <div class="adm-row">
      <div class="adm-row-main">
        <div class="adm-name">${escapeHtml(b.name) || '(no name)'} <span class="adm-room">Room ${escapeHtml(b.room) || '—'}</span></div>
        <div class="adm-meta">
          <span>${fmtDate(b.checkin)} → ${fmtDate(b.checkout)}</span>
          <span class="adm-sep">·</span>
          <span>${escapeHtml(b.platform || b.onlineOffline || 'Direct')}</span>
          ${b.num_guests ? `<span class="adm-sep">·</span><span>${escapeHtml(String(b.num_guests))} guests</span>` : ''}
        </div>
        <div class="adm-meta adm-phone">
          +91 ${b.phone}
          <a href="${waUrl}" target="_blank" rel="noopener" class="adm-wa-link">WhatsApp →</a>
        </div>
      </div>
      <div class="adm-row-actions">
        <a href="${hubUrl}" class="btn-outline-teal adm-action-btn">Open hub</a>
        <a href="${orderUrl}" class="btn-outline-teal adm-action-btn">Add food</a>
        <a href="${rcptUrl}" class="btn-outline-teal adm-action-btn">Receipt</a>
      </div>
    </div>
  `;
}

function renderSection(title, count, rows, accent) {
  if (!rows.length) {
    return `
      <section class="adm-section">
        <h2 class="adm-section-title ${accent}">${title} <span class="adm-count">0</span></h2>
        <div class="adm-empty">No bookings.</div>
      </section>
    `;
  }
  return `
    <section class="adm-section">
      <h2 class="adm-section-title ${accent}">${title} <span class="adm-count">${count}</span></h2>
      <div class="adm-rows">${rows.map(bookingRow).join('')}</div>
    </section>
  `;
}

function renderSummary(data) {
  const summary = document.getElementById('admin-summary');
  summary.innerHTML = `
    <div class="adm-stat"><div class="adm-stat-num">${data.arriving.length}</div><div class="adm-stat-lbl">Arriving</div></div>
    <div class="adm-stat"><div class="adm-stat-num">${data.inhouse.length}</div><div class="adm-stat-lbl">In-house</div></div>
    <div class="adm-stat"><div class="adm-stat-num">${data.leaving.length}</div><div class="adm-stat-lbl">Leaving</div></div>
    <div class="adm-stat"><div class="adm-stat-num">${data.upcoming.length}</div><div class="adm-stat-lbl">Next 7 days</div></div>
  `;
}

function render(data) {
  document.getElementById('date-line').textContent = fmtFullDate(data.date);
  renderSummary(data);

  const root = document.getElementById('admin-content');
  root.innerHTML = [
    renderSection('Leaving today',  data.leaving.length,  data.leaving,  'adm-accent-warn'),
    renderSection('Arriving today', data.arriving.length, data.arriving, 'adm-accent-gold'),
    renderSection('In-house now',   data.inhouse.length,  data.inhouse,  'adm-accent-teal'),
    renderSection('Upcoming (next 7 days)', data.upcoming.length, data.upcoming, 'adm-accent-mute')
  ].join('');
}

function showLoginView(errorMsg) {
  document.getElementById('admin-dashboard').classList.add('hidden');
  document.getElementById('admin-login').classList.remove('hidden');
  document.getElementById('refresh-btn').classList.add('hidden');
  document.getElementById('logout-btn').classList.add('hidden');
  document.getElementById('admin-user-chip').textContent = '';
  document.getElementById('admin-user-chip').classList.add('hidden');
  document.getElementById('date-line').textContent = '';
  const err = document.getElementById('login-error');
  if (err) err.textContent = errorMsg || '';
  if (window.NivaaAuth) window.NivaaAuth.renderSignInButton('g-signin-btn');
}

function showDashboardView() {
  document.getElementById('admin-login').classList.add('hidden');
  document.getElementById('admin-dashboard').classList.remove('hidden');
  document.getElementById('refresh-btn').classList.remove('hidden');
  document.getElementById('logout-btn').classList.remove('hidden');
  const chip = document.getElementById('admin-user-chip');
  if (chip && window.NivaaAuth) {
    const name = window.NivaaAuth.getName() || window.NivaaAuth.getEmail();
    chip.textContent = '· ' + name;
    chip.classList.remove('hidden');
  }
}

async function loadDashboard() {
  const root = document.getElementById('admin-content');
  root.innerHTML = '<div class="adm-loading">Loading bookings…</div>';
  try {
    const data = await fetchActive();
    render(data);
  } catch (err) {
    root.innerHTML = '<div class="adm-empty">Could not load bookings. Refresh the page or check Apps Script deployment.</div>';
  }
}

function init() {
  if (window.NivaaAuth && window.NivaaAuth.isAdmin()) {
    showDashboardView();
    loadDashboard();
  } else if (window.NivaaAuth && window.NivaaAuth.getEmail()) {
    showLoginView('That account isn’t the Nivaa Stays admin. Sign in with ' + window.NivaaAuth.ADMIN_EMAIL + '.');
  } else {
    showLoginView('');
  }
}

window.addEventListener('nivaa-auth-change', init);

document.getElementById('refresh-btn').addEventListener('click', loadDashboard);
document.getElementById('logout-btn').addEventListener('click', () => {
  if (window.NivaaAuth) window.NivaaAuth.logout();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
