// Nivaa Stays — admin competitor Share-of-Voice (loaded by admin-competitors.html).
// Fetches ?compData=1 from the standalone rank Apps Script and renders a SoV
// leaderboard + a per-competitor grid heatmap. Admin-gated via NivaaAuth.

const RANK_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw2ycg4VGEAwzwvZFe83MSBGIbZxzt1pLbBWZcrKWREJ1g3oXuzP4ZH-XFf0bjH3-d9/exec';

const state = { data: null, keyword: null, compId: null };

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

async function fetchComp() {
  const res = await fetch(RANK_SCRIPT_URL + '?compData=1');
  if (!res.ok) throw new Error('compData fetch failed: ' + res.status);
  return res.json();
}

// rank → cell colour (shared scale with the rank grid; 0 = beyond top 10 here)
function rankStyle(rank) {
  if (!rank) return { bg: '#cdd5d3', fg: '#5b6b68', label: '10+' };
  if (rank <= 3)  return { bg: '#1f9d61', fg: '#ffffff', label: String(rank) };
  if (rank <= 6)  return { bg: '#d4a72c', fg: '#23300f', label: String(rank) };
  return { bg: '#d9603b', fg: '#ffffff', label: String(rank) };
}

function statCard(num, label) {
  return `<div class="adm-stat"><div class="adm-stat-num">${num}</div><div class="adm-stat-lbl">${label}</div></div>`;
}

function renderSummary(data) {
  const board = data.competitors || [];
  const nivaa = board.find(b => b.isNivaa);
  const rankInField = nivaa ? board.indexOf(nivaa) + 1 : '—';
  document.getElementById('comp-summary').innerHTML = [
    statCard((nivaa ? nivaa.sov10 : 0) + '%', 'Your SoV (top-10)'),
    statCard(rankInField === '—' ? '—' : '#' + rankInField, 'Your place in field'),
    statCard(board.length, 'Businesses tracked'),
    statCard(fmtDate(data.latest), 'Last scan')
  ].join('');
}

function renderBoard(data) {
  const rows = (data.competitors || []).map((b, i) => `
    <tr class="sov-row ${b.isNivaa ? 'is-nivaa' : ''}">
      <td class="num">${i + 1}</td>
      <td><div class="sov-name">${escapeHtml(b.name)}${b.isNivaa ? '<span class="sov-badge">You</span>' : ''}</div></td>
      <td style="min-width:90px"><div class="sov-bar"><i style="width:${Math.max(2, b.sov10)}%"></i></div></td>
      <td class="num">${b.sov10}%</td>
      <td class="num">${b.sov3}%</td>
      <td class="num">${b.rating ? b.rating + '★' : '—'}</td>
      <td class="num">${b.reviews || '—'}</td>
    </tr>`).join('');
  return `
    <div class="adm-section" style="overflow-x:auto">
      <h2 class="adm-section-title adm-accent-gold">Share of Voice — who wins the local pack</h2>
      <p class="text-[color:var(--brand-muted)] text-sm mb-3">% of all grid points × keywords where each business appears in the top 10 (and top 3). Higher = more visible across the area.</p>
      <table class="sov-tbl">
        <thead><tr><th>#</th><th>Business</th><th>Top-10 SoV</th><th class="num">10</th><th class="num">3</th><th class="num">Rating</th><th class="num">Reviews</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderTabs(data) {
  return `<div class="rk-tabs">` + (data.keywords || []).map(k =>
    `<button class="rk-tab ${k === state.keyword ? 'is-active' : ''}" data-kw="${escapeHtml(k)}">${escapeHtml(k)}</button>`
  ).join('') + `</div>`;
}

function compSelect(data) {
  const opts = (data.competitors || []).map(b =>
    `<option value="${escapeHtml(b.id)}" ${b.id === state.compId ? 'selected' : ''}>${escapeHtml(b.name)}${b.isNivaa ? ' (You)' : ''} · ${b.sov10}%</option>`
  ).join('');
  return `<select id="comp-pick" class="comp-pick">${opts}</select>`;
}

function renderHeatmap(data) {
  const cells = (data.grids && data.grids[state.keyword]) || [];
  const byCell = {};
  cells.forEach(c => {
    const idx = c.ids.indexOf(state.compId);
    byCell[c.row + ',' + c.col] = idx === -1 ? 0 : idx + 1;   // 0 = beyond top 10 here
  });
  const size = data.gridSize || 5;
  let html = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const rank = byCell[r + ',' + c];
      const s = rankStyle(rank || 0);
      html += `<div class="rk-cell${rank ? '' : ' rk-none'}" style="background:${s.bg};color:${s.fg}">${s.label}</div>`;
    }
  }
  return `<div class="rk-grid" style="grid-template-columns:repeat(${size},1fr)">${html}</div>`;
}

function render(data) {
  state.data = data;
  if (!data.ready) {
    document.getElementById('comp-summary').innerHTML = '';
    document.getElementById('comp-content').innerHTML =
      `<div class="adm-empty">No competitor data yet. In the rank Apps Script, run <code>rankScan()</code> (with the updated script) then <code>resolveCompetitors()</code>.</div>`;
    return;
  }
  const board = data.competitors || [];
  if (!state.keyword || !(data.keywords || []).includes(state.keyword)) state.keyword = (data.keywords || [])[0];
  if (!state.compId || !board.some(b => b.id === state.compId)) {
    const firstRival = board.find(b => !b.isNivaa) || board[0];
    state.compId = firstRival ? firstRival.id : null;
  }

  renderSummary(data);
  document.getElementById('comp-content').innerHTML = `
    ${renderBoard(data)}
    <div class="adm-section">
      <h2 class="adm-section-title adm-accent-teal">Where a competitor wins</h2>
      <div class="flex flex-wrap items-center gap-2 mb-3">
        <span class="text-[color:var(--brand-muted)] text-sm">Competitor:</span> ${compSelect(data)}
      </div>
      ${renderTabs(data)}
      ${renderHeatmap(data)}
      <p class="text-center text-[color:var(--brand-muted)] text-xs mt-3">Selected competitor's rank at each grid point for this keyword · green = top 3 · grey = beyond top 10</p>
    </div>`;

  document.querySelectorAll('.rk-tab').forEach(btn =>
    btn.addEventListener('click', () => { state.keyword = btn.getAttribute('data-kw'); render(state.data); }));
  const pick = document.getElementById('comp-pick');
  if (pick) pick.addEventListener('change', () => { state.compId = pick.value; render(state.data); });
}

// ---- view + auth plumbing (mirrors js/rank.js) ----
function showLoginView(errorMsg) {
  document.getElementById('comp-dashboard').classList.add('hidden');
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
  document.getElementById('comp-dashboard').classList.remove('hidden');
  document.getElementById('refresh-btn').classList.remove('hidden');
  document.getElementById('logout-btn').classList.remove('hidden');
  const chip = document.getElementById('admin-user-chip');
  if (chip && window.NivaaAuth) {
    chip.textContent = '· ' + (window.NivaaAuth.getName() || window.NivaaAuth.getEmail());
    chip.classList.remove('hidden');
  }
}

async function loadComp() {
  const root = document.getElementById('comp-content');
  root.innerHTML = '<div class="adm-empty">Loading share of voice…</div>';
  try {
    render(await fetchComp());
  } catch (err) {
    root.innerHTML = '<div class="adm-empty">Could not load competitor data. Refresh, or check the rank Apps Script deployment.</div>';
  }
}

function init() {
  if (window.NivaaAuth && window.NivaaAuth.isAdmin()) {
    showDashboardView();
    loadComp();
  } else if (window.NivaaAuth && window.NivaaAuth.getEmail()) {
    showLoginView('That account isn’t the Nivaa Stays admin. Sign in with ' + window.NivaaAuth.ADMIN_EMAIL + '.');
  } else {
    showLoginView('');
  }
}

window.addEventListener('nivaa-auth-change', init);
document.getElementById('refresh-btn').addEventListener('click', loadComp);
document.getElementById('logout-btn').addEventListener('click', () => {
  if (window.NivaaAuth) window.NivaaAuth.logout();
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
