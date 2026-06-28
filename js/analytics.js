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
function dateLabelShort(ymd) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
}
function completedMonths(data) { const ms = data.months || []; return ms.length > 1 ? ms.slice(0, -1) : ms; }
function avgField(ms, f) { return (!ms || !ms.length) ? 0 : ms.reduce((a, m) => a + (Number(m[f]) || 0), 0) / ms.length; }

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

function renderKpis(data) {
  const ms = data.months || [];
  const cur = ms[ms.length - 1] || {};
  const comp = completedMonths(data);   // all completed months — the comparison baseline (excludes the partial current month)
  const card = (label, displayVal, curN, field, fmt) => {
    const avg = avgField(comp, field);
    let sub = 'no prior months', cls = 'text-[color:var(--brand-muted)]';
    if (avg) {
      const up = curN >= avg, d = Math.round((curN - avg) / avg * 100);
      sub = `${up ? '▲' : '▼'} ${Math.abs(d)}% vs avg (${fmt(avg)})`;
      cls = up ? 'text-[#1a7a44]' : 'text-[#c45a3a]';
    }
    return kpiCard(label, displayVal, sub, cls);
  };
  document.getElementById('kpi-cards').innerHTML = [
    card('Bookings · ' + monthLabel(cur.month), cur.bookings || 0, cur.bookings || 0, 'bookings', v => Math.round(v)),
    card('Revenue', fmtINR(cur.revenue), cur.revenue || 0, 'revenue', fmtINR),
    card('Occupancy', (cur.occupancy || 0) + '%', cur.occupancy || 0, 'occupancy', v => (Math.round(v * 10) / 10) + '%'),
    card('ADR', fmtINR(cur.adr), cur.adr || 0, 'adr', fmtINR),
    card('RevPAR', fmtINR(cur.revpar), cur.revpar || 0, 'revpar', fmtINR)
  ].join('');
}

function renderCurrentMonth(data) {
  const c = data.current, host = document.getElementById('current-month');
  if (!c) { host.innerHTML = ''; return; }
  const target = data.revenueTarget || 100000;
  const pct = Math.round((c.revenue / target) * 100);
  const gap = Math.max(0, target - c.revenue);
  const elapsed = Math.max(1, c.dayOfMonth || 1);
  const projected = Math.round(c.revenue / elapsed * c.daysInMonth);
  const projPct = Math.round(projected / target * 100);
  const occ = c.availNights ? Math.round(c.nights / c.availNights * 1000) / 10 : 0;
  const upcoming = (c.days || []).filter(d => d.date >= c.today && d.free > 0);
  const openNights = upcoming.reduce((s, d) => s + d.free, 0);
  const openWknd = upcoming.filter(d => d.dow === 5 || d.dow === 6 || d.dow === 0);
  const openWkndNights = openWknd.reduce((s, d) => s + d.free, 0);
  const adr = Math.round(avgField(completedMonths(data), 'adr')) || (data.totals && data.totals.adr) || 2000;
  const nightsNeeded = adr ? Math.ceil(gap / adr) : 0;

  const tips = [];
  if (gap > 0) tips.push(`<b>${fmtFull(gap)}</b> to hit the ${fmtINR(target)} target — about <b>${nightsNeeded}</b> more room-night${nightsNeeded === 1 ? '' : 's'} at ~${fmtINR(adr)}/night.`);
  else tips.push(`🎉 Target met — <b>${fmtFull(c.revenue)}</b> vs ${fmtINR(target)}.`);
  if (c.revenue > 0) tips.push(projected >= target ? `On pace for <b>${fmtFull(projected)}</b> (${projPct}% of target).` : `At the current pace you'll land ~<b>${fmtFull(projected)}</b> (${projPct}%) — close the gap below.`);
  if (openWkndNights > 0) tips.push(`<b>${openWkndNights}</b> weekend room-night${openWkndNights === 1 ? '' : 's'} open (premium rate) — fill ${openWknd.slice(0, 3).map(d => dateLabelShort(d.date)).join(', ')} first.`);
  if (openNights > 0) tips.push(`<b>${openNights}</b> room-night${openNights === 1 ? '' : 's'} still open this month — push direct bookings (code NIVAA10) and refresh OTA calendars.`);
  else tips.push(`Rest of the month is fully booked 🙌`);

  const monShort = monthLabel(c.month).split(' ')[0];
  const curWeekIdx = Math.floor((elapsed - 1) / 7);
  const weeks = (c.weeks || []).map((w, i) => {
    const wocc = w.availNights ? Math.round(w.nights / w.availNights * 100) : 0;
    const active = i === curWeekIdx;
    return `<div class="rounded-xl p-3 border ${active ? 'border-gold bg-[#FBF7EC]' : 'border-[#eef0ee] bg-white'}">
      <div class="text-[11px] text-[color:var(--brand-muted)]">W${i + 1} · ${monShort} ${w.from}–${w.to}${active ? ' · now' : ''}</div>
      <div class="text-sm font-semibold text-teal mt-1">${fmtINR(w.revenue)}</div>
      <div class="text-[11px] text-[color:var(--brand-muted)]">${w.nights}/${w.availNights} nts · ${wocc}%</div>
    </div>`;
  }).join('');

  const chips = upcoming.slice(0, 18).map(d => {
    const wknd = d.dow === 5 || d.dow === 6 || d.dow === 0;
    return `<span class="inline-block text-xs px-2 py-1 rounded-lg ${wknd ? 'bg-[rgba(201,162,39,0.18)] text-[#8a6d12] font-semibold' : 'bg-[#eef2f0] text-teal'}">${dateLabelShort(d.date)}${d.free === 2 ? ' ·2' : ''}</span>`;
  }).join(' ');

  const stat = (label, val) => `<div class="bg-cream rounded-xl py-2"><div class="serif text-lg text-teal">${val}</div><div class="text-[10px] uppercase tracking-wide text-[color:var(--brand-muted)]">${label}</div></div>`;

  host.innerHTML = `
    <div class="bg-white rounded-2xl p-5" style="border:2px solid rgba(14,59,53,0.15)">
      <div class="flex flex-wrap justify-between items-baseline gap-2 mb-3">
        <div class="serif text-xl text-teal">This month · ${monthLabel(c.month)}</div>
        <div class="text-xs text-[color:var(--brand-muted)]">Day ${c.dayOfMonth} of ${c.daysInMonth} · ${c.daysRemaining} days left</div>
      </div>
      <div class="flex flex-wrap justify-between items-baseline gap-2 text-sm mb-1">
        <span><b class="text-teal text-lg">${fmtFull(c.revenue)}</b> <span class="text-[color:var(--brand-muted)]">/ ${fmtINR(target)} (${pct}%)</span></span>
        <span class="text-xs ${projected >= target ? 'text-[#1a7a44]' : 'text-[#c45a3a]'}">projected ${fmtINR(projected)} · ${projPct}%</span>
      </div>
      <div class="h-3 rounded-full bg-[#eef0ee] overflow-hidden">
        <div class="h-full rounded-full" style="width:${Math.min(100, Math.max(0, pct))}%; background:linear-gradient(90deg,#0E3B35,#14524a)"></div>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-center">
        ${stat('Occupancy', occ + '%')}${stat('Open nights', openNights)}${stat('Open weekend', openWkndNights)}${stat('Bookings', c.bookings)}
      </div>
      <div class="mt-5">
        <div class="text-[11px] uppercase tracking-[0.14em] text-[color:var(--brand-muted)] mb-2">Weekly</div>
        <div class="grid grid-cols-2 sm:grid-cols-5 gap-2">${weeks}</div>
      </div>
      ${upcoming.length ? `<div class="mt-4">
        <div class="text-[11px] uppercase tracking-[0.14em] text-[color:var(--brand-muted)] mb-2">Open slots to fill (today →) · weekends in gold</div>
        <div class="flex flex-wrap gap-1.5">${chips}</div>
      </div>` : ''}
      <div class="mt-4 rounded-xl p-3 bg-[#FBF7EC] border border-[#EADFC0]">
        <div class="text-[11px] uppercase tracking-[0.14em] text-[#8a6d12] mb-1.5 font-semibold">Suggestions</div>
        <ul class="text-sm text-[color:var(--brand-ink)] space-y-1 list-disc pl-4">${tips.map(t => `<li>${t}</li>`).join('')}</ul>
      </div>
    </div>`;
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
  renderCurrentMonth(data);
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
