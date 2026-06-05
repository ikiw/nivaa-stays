// Nivaa Stays — admin rank tracker (loaded by admin-rank.html).
// Fetches weekly geo-grid local rankings from Apps Script (?rankData=1) and
// renders a heatmap + ARP trend + keyword table. Admin-gated via NivaaAuth.

// Standalone rank-tracker deployment — SEPARATE from the Bookings Apps Script.
// Deploy apps-script/rank-app-script.js as a web app and paste its /exec URL here.
const RANK_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw2ycg4VGEAwzwvZFe83MSBGIbZxzt1pLbBWZcrKWREJ1g3oXuzP4ZH-XFf0bjH3-d9/exec';

const state = { data: null, keyword: null };

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function fmtDate(s) {
  if (!s) return '—';
  const [y, m, d] = String(s).split('-').map(Number);
  if (!y) return String(s);
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

async function fetchRank() {
  if (!RANK_SCRIPT_URL) throw new Error('RANK_SCRIPT_URL not set');
  const res = await fetch(RANK_SCRIPT_URL + '?rankData=1');
  if (!res.ok) throw new Error('rankData fetch failed: ' + res.status);
  return res.json();
}

// Rank → cell colour + label. 0 means "not in top 20".
function rankStyle(rank) {
  if (!rank) return { bg: '#cdd5d3', fg: '#5b6b68', label: '20+' };
  if (rank <= 3)  return { bg: '#1f9d61', fg: '#ffffff', label: String(rank) };
  if (rank <= 10) return { bg: '#d4a72c', fg: '#23300f', label: String(rank) };
  return { bg: '#d9603b', fg: '#ffffff', label: String(rank) };
}

function statCard(num, label) {
  return `<div class="adm-stat"><div class="adm-stat-num">${num}</div><div class="adm-stat-lbl">${label}</div></div>`;
}

function renderSummary(data) {
  const kws = data.keywords || [];
  const arps = kws.map(k => k.currentArp).filter(v => v != null);
  const overallArp = arps.length ? (arps.reduce((a, b) => a + b, 0) / arps.length).toFixed(1) : '—';
  const covs = kws.map(k => k.top3Coverage).filter(v => v != null);
  const overallCov = covs.length ? Math.round(covs.reduce((a, b) => a + b, 0) / covs.length) : 0;
  document.getElementById('rank-summary').innerHTML = [
    statCard(overallArp, 'Avg rank (ARP)'),
    statCard(overallCov + '%', 'Grid in top-3'),
    statCard(kws.length, 'Keywords'),
    statCard(fmtDate(data.latest), 'Last scan')
  ].join('');
}

function renderTabs(data) {
  return `<div class="rk-tabs">` + (data.keywords || []).map(k =>
    `<button class="rk-tab ${k.keyword === state.keyword ? 'is-active' : ''}" data-kw="${escapeHtml(k.keyword)}">${escapeHtml(k.keyword)}</button>`
  ).join('') + `</div>`;
}

function renderHeatmap(kw, gridSize) {
  const byCell = {};
  (kw.latestGrid || []).forEach(c => { byCell[c.row + ',' + c.col] = c.rank; });
  let cells = '';
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const rank = byCell[r + ',' + c];
      const s = rankStyle(rank || 0);
      const none = rank ? '' : ' rk-none';
      cells += `<div class="rk-cell${none}" style="background:${s.bg};color:${s.fg}">${s.label}</div>`;
    }
  }
  const legend = `
    <div class="rk-legend">
      <span><i class="rk-dot" style="background:#1f9d61"></i>Top 3</span>
      <span><i class="rk-dot" style="background:#d4a72c"></i>4–10</span>
      <span><i class="rk-dot" style="background:#d9603b"></i>11–20</span>
      <span><i class="rk-dot" style="background:#cdd5d3"></i>Not in top 20</span>
    </div>`;
  return `<div class="rk-grid" style="grid-template-columns:repeat(${gridSize},1fr)">${cells}</div>${legend}`;
}

// Inline SVG ARP trend (lower = better, so the axis is inverted).
function renderTrend(kw) {
  const pts = (kw.arpHistory || []).filter(p => p.arp != null);
  if (pts.length < 2) {
    return `<p class="text-center text-[color:var(--brand-muted)] text-sm">One scan so far — the trend line appears once a second weekly scan lands.</p>`;
  }
  const W = 600, H = 150, padX = 34, padY = 18;
  const arps = pts.map(p => p.arp);
  const yMin = 1;
  const yMax = Math.max(5, Math.ceil(Math.max.apply(null, arps)) + 1);
  const x = i => padX + (i * (W - padX - 10)) / (pts.length - 1);
  const y = v => padY + ((v - yMin) / (yMax - yMin)) * (H - padY * 2); // v=1 → top
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.arp).toFixed(1)}`).join(' ');
  const dots = pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.arp).toFixed(1)}" r="3.5" fill="#0E3B35"></circle>`).join('');
  const labels = pts.map((p, i) =>
    `<text x="${x(i).toFixed(1)}" y="${H - 3}" font-size="9" fill="#5B6B68" text-anchor="middle">${fmtDate(p.date)}</text>`
  ).join('');
  return `
    <div class="rk-trend-wrap">
      <svg viewBox="0 0 ${W} ${H}" width="100%" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Average rank over time">
        <text x="4" y="${y(yMin) + 3}" font-size="9" fill="#5B6B68">#${yMin}</text>
        <text x="4" y="${y(yMax) + 3}" font-size="9" fill="#5B6B68">#${yMax}</text>
        <line x1="${padX}" y1="${y(yMin)}" x2="${W - 10}" y2="${y(yMin)}" stroke="#eef1ef"></line>
        <line x1="${padX}" y1="${y(yMax)}" x2="${W - 10}" y2="${y(yMax)}" stroke="#eef1ef"></line>
        <path d="${line}" fill="none" stroke="#C9A227" stroke-width="2.5"></path>
        ${dots}${labels}
      </svg>
      <p class="text-center text-[color:var(--brand-muted)] text-xs mt-1">Average rank position (lower is better)</p>
    </div>`;
}

function deltaCell(kw) {
  const h = (kw.arpHistory || []).filter(p => p.arp != null);
  if (h.length < 2) return `<span class="rk-delta-flat">—</span>`;
  const cur = h[h.length - 1].arp, prev = h[h.length - 2].arp;
  const d = +(cur - prev).toFixed(1);
  if (d < 0) return `<span class="rk-delta-up">▲ ${Math.abs(d)}</span>`;   // ARP fell = improved
  if (d > 0) return `<span class="rk-delta-down">▼ ${d}</span>`;
  return `<span class="rk-delta-flat">0</span>`;
}

function renderTable(data) {
  const rows = (data.keywords || []).map(k => `
    <tr>
      <td>${escapeHtml(k.keyword)}</td>
      <td class="num">${k.currentArp == null ? '—' : k.currentArp}</td>
      <td class="num">${deltaCell(k)}</td>
      <td class="num">${k.bestRank ? '#' + k.bestRank : '—'}</td>
      <td class="num">${k.top3Coverage}%</td>
    </tr>`).join('');
  return `
    <div class="adm-section" style="overflow-x:auto">
      <h2 class="adm-section-title adm-accent-teal">All keywords</h2>
      <table class="rk-table">
        <thead><tr><th>Keyword</th><th class="num">ARP</th><th class="num">Δ wk</th><th class="num">Best</th><th class="num">Top-3</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function render(data) {
  state.data = data;
  const kws = data.keywords || [];
  if (!kws.length) {
    document.getElementById('rank-summary').innerHTML = '';
    document.getElementById('rank-content').innerHTML =
      `<div class="adm-empty">No scans yet. Run <code>rankScan()</code> in Apps Script, or wait for the Monday 6 AM weekly scan.</div>`;
    return;
  }
  if (!state.keyword || !kws.some(k => k.keyword === state.keyword)) state.keyword = kws[0].keyword;
  const sel = kws.find(k => k.keyword === state.keyword);

  renderSummary(data);
  document.getElementById('rank-content').innerHTML = `
    ${renderTabs(data)}
    <div class="adm-section">
      <h2 class="adm-section-title adm-accent-gold">${escapeHtml(state.keyword)}</h2>
      ${renderHeatmap(sel, data.gridSize || 5)}
    </div>
    <div class="adm-section">
      <h2 class="adm-section-title adm-accent-mute">Rank trend</h2>
      ${renderTrend(sel)}
    </div>
    ${renderTable(data)}
  `;

  document.querySelectorAll('.rk-tab').forEach(btn => {
    btn.addEventListener('click', () => { state.keyword = btn.getAttribute('data-kw'); render(state.data); });
  });
}

// ---- view + auth plumbing (mirrors js/admin.js) ----
function showLoginView(errorMsg) {
  document.getElementById('rank-dashboard').classList.add('hidden');
  document.getElementById('admin-login').classList.remove('hidden');
  document.getElementById('refresh-btn').classList.add('hidden');
  document.getElementById('logout-btn').classList.add('hidden');
  const chip = document.getElementById('admin-user-chip');
  chip.textContent = ''; chip.classList.add('hidden');
  const err = document.getElementById('login-error');
  if (err) err.textContent = errorMsg || '';
  if (window.NivaaAuth) window.NivaaAuth.renderSignInButton('g-signin-btn');
}

function showDashboardView() {
  document.getElementById('admin-login').classList.add('hidden');
  document.getElementById('rank-dashboard').classList.remove('hidden');
  document.getElementById('refresh-btn').classList.remove('hidden');
  document.getElementById('logout-btn').classList.remove('hidden');
  const chip = document.getElementById('admin-user-chip');
  if (chip && window.NivaaAuth) {
    chip.textContent = '· ' + (window.NivaaAuth.getName() || window.NivaaAuth.getEmail());
    chip.classList.remove('hidden');
  }
}

async function loadRank() {
  const root = document.getElementById('rank-content');
  if (!RANK_SCRIPT_URL) {
    document.getElementById('rank-summary').innerHTML = '';
    root.innerHTML = '<div class="adm-empty">Rank backend not connected yet — deploy <code>rank-app-script.js</code> and paste its <code>/exec</code> URL into <code>RANK_SCRIPT_URL</code> in <code>js/rank.js</code>.</div>';
    return;
  }
  root.innerHTML = '<div class="adm-empty">Loading rankings…</div>';
  try {
    render(await fetchRank());
  } catch (err) {
    root.innerHTML = '<div class="adm-empty">Could not load rankings. Refresh, or check the rank Apps Script deployment.</div>';
  }
}

function init() {
  if (window.NivaaAuth && window.NivaaAuth.isAdmin()) {
    showDashboardView();
    loadRank();
  } else if (window.NivaaAuth && window.NivaaAuth.getEmail()) {
    showLoginView('That account isn’t the Nivaa Stays admin. Sign in with ' + window.NivaaAuth.ADMIN_EMAIL + '.');
  } else {
    showLoginView('');
  }
}

window.addEventListener('nivaa-auth-change', init);
document.getElementById('refresh-btn').addEventListener('click', loadRank);
document.getElementById('logout-btn').addEventListener('click', () => {
  if (window.NivaaAuth) window.NivaaAuth.logout();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
