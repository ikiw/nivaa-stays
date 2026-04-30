// Nivaa Stays — pricing logic (pure, no DOM).
// Rules: weekday Mon–Thu = ₹2k; weekend Fri/Sat/Sun = ₹2.5k; long-weekend Fri+Sat+Sun = ₹3k
// when a holiday falls on Mon or Fri (auto), or any range listed in manualLongWeekends.

const MS_DAY = 86400000;

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

function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function buildBumpedSet(config) {
  const bumped = new Map(); // dateStr -> reason name
  const triggers = new Set(config.longWeekendTriggerDays);

  for (const h of config.holidays || []) {
    const hd = parseYmd(h.date);
    const dow = hd.getDay();
    if (!triggers.has(dow)) continue;

    let span;
    if (dow === 5) {
      // Friday holiday → Fri, Sat, Sun
      span = [hd, addDays(hd, 1), addDays(hd, 2)];
    } else if (dow === 1) {
      // Monday holiday → prior Fri, Sat, Sun
      span = [addDays(hd, -3), addDays(hd, -2), addDays(hd, -1)];
    } else {
      continue;
    }
    for (const d of span) bumped.set(ymd(d), h.name);
  }

  for (const r of config.manualLongWeekends || []) {
    let cur = parseYmd(r.from);
    const end = parseYmd(r.to);
    while (cur.getTime() <= end.getTime()) {
      bumped.set(ymd(cur), r.name);
      cur = addDays(cur, 1);
    }
  }

  return bumped;
}

let _cachedConfig = null;
let _cachedBumps = null;
function bumpsFor(config) {
  if (config !== _cachedConfig) {
    _cachedConfig = config;
    _cachedBumps = buildBumpedSet(config);
  }
  return _cachedBumps;
}

export function rateForDate(dateStr, config) {
  const bumps = bumpsFor(config);
  const d = parseYmd(dateStr);
  const dow = d.getDay();
  const weekendSet = new Set(config.weekendDays);

  if (bumps.has(dateStr)) {
    return { tier: 'longWeekend', rate: config.tiers.longWeekend, isLongWeekend: true, longWeekendName: bumps.get(dateStr) };
  }
  if (weekendSet.has(dow)) {
    return { tier: 'weekend', rate: config.tiers.weekend, isLongWeekend: false, longWeekendName: null };
  }
  return { tier: 'weekday', rate: config.tiers.weekday, isLongWeekend: false, longWeekendName: null };
}

export function quoteForRange(checkInStr, checkOutStr, config) {
  const ci = parseYmd(checkInStr);
  const co = parseYmd(checkOutStr);
  if (co.getTime() <= ci.getTime()) {
    return { nights: [], totalNights: 0, total: 0, currency: config.currency };
  }
  const nights = [];
  let total = 0;
  for (let cur = new Date(ci); cur.getTime() < co.getTime(); cur = addDays(cur, 1)) {
    const ds = ymd(cur);
    const r = rateForDate(ds, config);
    nights.push({ date: ds, tier: r.tier, rate: r.rate, longWeekendName: r.longWeekendName });
    total += r.rate;
  }
  return { nights, totalNights: nights.length, total, currency: config.currency };
}

export function formatINR(n) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n);
}
