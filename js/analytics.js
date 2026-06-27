// Nivaa Stays — booking analytics dashboard (loaded by admin-analytics.html).
// Fetches monthly aggregates from the Bookings Apps Script (?analytics=1) and
// renders KPI cards, a revenue+occupancy chart, a channel-mix donut, supporting
// cards and a monthly table. Auth gate mirrors js/admin.js. Room bookings only.

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxkdwbDe8eSoYuapo2xp6XRYmiosBWfACvHVp9D6hOGHnN0c39YHGA-ecZFLhFDrFb/exec';

const BRAND = { teal: '#0E3B35', gold: '#C9A227', ochre: '#C56B3E', slate: '#5B6B68', sage: '#14524a' };
const PALETTE = ['#0E3B35', '#C9A227', '#C56B3E', '#5B6B68', '#14524a', '#E6C35A', '#94A3B8'];
let charts = [];

function fmtINR(n) {
  n = Math.round(Number(n) || 0);
  if (Math.abs(n) >= 100000) return '₹' + (n / 100000).toFixed(2).replace(/\.00$/, '') + 'L';
  if (Math.abs(n) >= 1000) return '₹' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return '₹' + n.toLocaleString('en-IN');
}
function fmtFull(n) { return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN'); }
function monthLabel(ym) {
  const [y, m] = String(ym).split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

async function fetchAnalytics() {
  const res = await fetch(APPS_SCRIPT_URL + '?analytics=1');
  return res.json();
}

// ---------- render ----------

function kpiCard(label, value, subText, subCls) {
  return `<div class="bg-white rounded-2xl p-4 border border-[#e8ebe8]">
    <div class="text-[10px] uppercase tracking-[0.18em] text-[color:var(--brand-muted)]">${label}</div>
    <div class="serif text-2xl text-teal mt-1 leading-tight">${value}</div>
    <div class="text-[11px] mt-1 ${subCls || 'text-[color:var(--brand-muted)]'}">${subText || ''}</div>
  </div>`;
}

function delta(cur, prev, isPct) {
  if (prev == null || prev === 0) return { text: 'Last mo: —', cls: 'text-[color:var(--brand-muted)]' };
  const d = cur - prev;
  const pct = Math.round((d / prev) * 100);
  const up = d >= 0;
  const arrow = up ? '▲' : '▼';
  const cls = up ? 'text-[#1a7a44]' : 'text-[#c45a3a]';
  const prevStr = isPct ? prev + '%' : (isPct === 'inr' ? fmtINR(prev) : prev);
  return { text: `${arrow} ${Math.abs(pct)}% vs last mo (${prevStr})`, cls };
}

function renderKpis(data) {
  const ms = data.months || [];
  const cur = ms[ms.length - 1] || {};
  const prev = ms[ms.length - 2] || {};
  const el = document.getElementById('kpi-cards');
  el.innerHTML = [
    kpiCard('Bookings · ' + monthLabel(cur.month), cur.bookings || 0, delta(cur.bookings, prev.bookings).text, delta(cur.bookings, prev.bookings).cls),
    kpiCard('Revenue', fmtINR(cur.revenue), delta(cur.revenue, prev.revenue, 'inr').text, delta(cur.revenue, prev.revenue).cls),
    kpiCard('Occupancy', (cur.occupancy || 0) + '%', delta(cur.occupancy, prev.occupancy, true).text, delta(cur.occupancy, prev.occupancy).cls),
    kpiCard('ADR', fmtINR(cur.adr), 'avg nightly rate · last mo ' + fmtINR(prev.adr)),
    kpiCard('RevPAR', fmtINR(cur.revpar), 'rev ÷ avail nights · last mo ' + fmtINR(prev.revpar))
  ].join('');
}

function renderExtra(data) {
  const t = data.totals || {}, p = data.payments || {}, r = data.repeat || {}, w = data.weekday || {};
  const rs = data.roomSplit || {};
  const roomStr = Object.keys(rs).sort().map(k => `Room ${k}: ${rs[k]}`).join(' · ') || '—';
  const wkTotal = (w.weekday || 0) + (w.weekend || 0);
  const wkPct = wkTotal ? Math.round((w.weekend / wkTotal) * 100) : 0;
  document.getElementById('extra-cards').innerHTML = [
    kpiCard('Repeat guests', (r.rate || 0) + '%', `${r.returning || 0} of ${r.guests || 0} guests returned`),
    kpiCard('Avg stay', (t.alos || 0) + ' nights', `avg party ${t.avgGuests || 0} guests`),
    kpiCard('Weekend share', wkPct + '%', `${w.weekend || 0} wknd / ${w.weekday || 0} wkday nights`),
    kpiCard('Advance pending', fmtINR(p.pending), `collected ${fmtINR(p.collected)} of ${fmtINR(p.revenue)}`)
  ].join('') +
  `<div class="col-span-2 md:col-span-4 bg-white rounded-2xl p-3 px-4 border border-[#e8ebe8] text-xs text-[color:var(--brand-muted)] flex flex-wrap gap-x-6 gap-y-1">
    <span><b class="text-teal">All-time:</b> ${t.bookings || 0} bookings · ${t.nights || 0} room-nights · ${fmtFull(t.revenue)}</span>
    <span><b class="text-teal">Room split:</b> ${roomStr}</span>
  </div>`;
}

function renderCharts(data) {
  charts.forEach(c => c.destroy()); charts = [];
  const ms = (data.months || []).slice(-12);

  charts.push(new Chart(document.getElementById('chart-revenue'), {
    data: {
      labels: ms.map(m => monthLabel(m.month)),
      datasets: [
        { type: 'bar', label: 'Revenue', data: ms.map(m => m.revenue), yAxisID: 'y', backgroundColor: BRAND.teal, borderRadius: 4, order: 2 },
        { type: 'line', label: 'Occupancy %', data: ms.map(m => m.occupancy), yAxisID: 'y1', borderColor: BRAND.gold, backgroundColor: BRAND.gold, tension: 0.3, pointRadius: 3, borderWidth: 2, order: 1 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => c.dataset.yAxisID === 'y' ? '  Revenue: ' + fmtFull(c.raw) : '  Occupancy: ' + c.raw + '%' } }
      },
      scales: {
        y: { beginAtZero: true, ticks: { callback: v => '₹' + (v / 1000) + 'k', font: { size: 10 } } },
        y1: { position: 'right', beginAtZero: true, max: 100, grid: { drawOnChartArea: false }, ticks: { callback: v => v + '%', font: { size: 10 } } },
        x: { ticks: { font: { size: 10 } } }
      }
    }
  }));

  const ch = data.channels || [];
  charts.push(new Chart(document.getElementById('chart-channel'), {
    type: 'doughnut',
    data: { labels: ch.map(c => c.name), datasets: [{ data: ch.map(c => c.revenue), backgroundColor: PALETTE, borderWidth: 2, borderColor: '#fff' }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '58%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
        tooltip: { callbacks: { label: c => {
          const tot = ch.reduce((s, x) => s + x.revenue, 0) || 1;
          const row = ch[c.dataIndex];
          return `  ${row.name}: ${fmtFull(row.revenue)} (${Math.round(row.revenue / tot * 100)}%) · ${row.bookings} bk`;
        } } }
      }
    }
  }));
}

function renderTable(data) {
  const ms = (data.months || []).slice().reverse(); // newest first
  const rows = ms.map(m => `<tr class="border-t border-[#eef0ee]">
      <td class="py-2 pr-3 font-medium text-teal">${monthLabel(m.month)}</td>
      <td class="py-2 px-2 text-right">${m.bookings}</td>
      <td class="py-2 px-2 text-right">${m.nights}</td>
      <td class="py-2 px-2 text-right">${m.occupancy}%</td>
      <td class="py-2 px-2 text-right">${fmtINR(m.adr)}</td>
      <td class="py-2 px-2 text-right">${fmtINR(m.revpar)}</td>
      <td class="py-2 pl-2 text-right font-semibold">${fmtFull(m.revenue)}</td>
    </tr>`).join('');
  document.getElementById('monthly-table').innerHTML = `
    <div class="bg-white rounded-2xl p-4 sm:p-5 border border-[#e8ebe8] overflow-x-auto">
      <div class="text-xs uppercase tracking-[0.16em] text-[color:var(--brand-muted)] mb-3">Month by month</div>
      <table class="w-full text-sm">
        <thead><tr class="text-[11px] uppercase tracking-wide text-[color:var(--brand-muted)] text-right">
          <th class="text-left pb-1 font-medium">Month</th><th class="pb-1 px-2 font-medium">Bookings</th>
          <th class="pb-1 px-2 font-medium">Nights</th><th class="pb-1 px-2 font-medium">Occ</th>
          <th class="pb-1 px-2 font-medium">ADR</th><th class="pb-1 px-2 font-medium">RevPAR</th>
          <th class="pb-1 pl-2 font-medium">Revenue</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function render(data) {
  if (!data || !Array.isArray(data.months)) {
    document.getElementById('kpi-cards').innerHTML = '<div class="col-span-full adm-empty">No analytics data returned. Check the Apps Script deployment.</div>';
    return;
  }
  document.getElementById('generated-line').textContent = 'As of ' + (data.generated || '') + ' · ' + data.rooms + ' rooms';
  renderKpis(data);
  renderExtra(data);
  renderCharts(data);
  renderTable(data);
}

// ---------- auth gate (mirrors js/admin.js) ----------

function showLoginView(errorMsg) {
  document.getElementById('analytics-dashboard').classList.add('hidden');
  document.getElementById('admin-login').classList.remove('hidden');
  document.getElementById('refresh-btn').classList.add('hidden');
  document.getElementById('logout-btn').classList.add('hidden');
  const chip = document.getElementById('admin-user-chip');
  chip.textContent = ''; chip.classList.add('hidden');
  document.getElementById('generated-line').textContent = '';
  const err = document.getElementById('login-error');
  if (err) err.textContent = errorMsg || '';
  if (window.NivaaAuth) window.NivaaAuth.renderSignInButton('g-signin-btn');
}

function showDashboardView() {
  document.getElementById('admin-login').classList.add('hidden');
  document.getElementById('analytics-dashboard').classList.remove('hidden');
  document.getElementById('refresh-btn').classList.remove('hidden');
  document.getElementById('logout-btn').classList.remove('hidden');
  const chip = document.getElementById('admin-user-chip');
  if (chip && window.NivaaAuth) {
    chip.textContent = '· ' + (window.NivaaAuth.getName() || window.NivaaAuth.getEmail());
    chip.classList.remove('hidden');
  }
}

async function loadDashboard() {
  const el = document.getElementById('kpi-cards');
  el.innerHTML = '<div class="col-span-full text-center text-[color:var(--brand-muted)] text-sm py-8">Loading analytics…</div>';
  try {
    render(await fetchAnalytics());
  } catch (e) {
    el.innerHTML = '<div class="col-span-full adm-empty">Could not load analytics. Refresh, or check the Apps Script deployment.</div>';
  }
}

function init() {
  if (window.NivaaAuth && window.NivaaAuth.isAdmin()) { showDashboardView(); loadDashboard(); }
  else if (window.NivaaAuth && window.NivaaAuth.getEmail()) { showLoginView('That account isn’t the Nivaa Stays admin. Sign in with ' + window.NivaaAuth.ADMIN_EMAIL + '.'); }
  else { showLoginView(''); }
}

window.addEventListener('nivaa-auth-change', () => init());
document.addEventListener('DOMContentLoaded', () => {
  const rb = document.getElementById('refresh-btn');
  if (rb) rb.addEventListener('click', loadDashboard);
  init();
});
