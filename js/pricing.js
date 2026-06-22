// Nivaa Stays — pricing logic (pure, no DOM).
// Rules: weekday Mon–Fri = ₹2k; weekend Sat/Sun = ₹2.5k.
// Long-weekend bump (₹3k) — only the first two nights of the 3-day block:
//   • Fri-holiday  → bump Fri + Sat (Sun stays at normal weekend rate)
//   • Mon-holiday  → bump Sat + Sun (Mon stays at normal weekday rate)
// Plus any range listed in manualLongWeekends.

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
      // Friday holiday → bump Fri + Sat only (Sun reverts to weekend rate)
      span = [hd, addDays(hd, 1)];
    } else if (dow === 1) {
      // Monday holiday → bump Sat + Sun only (Mon reverts to weekday rate)
      span = [addDays(hd, -2), addDays(hd, -1)];
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

// Integer hours of early check-in or late checkout. Returns the fee for one side.
// 0–1 hr free; 2–4 hr → ₹250 per paid hour; 5–6 hr → ₹1,000 flat (transit add-on);
// 7+ hr → ₹1,500 flat (extended transit, late checkout only). Beyond max → null.
export function transitFee(hours, config, side /* 'early' | 'late' */) {
  const t = config.transit;
  if (hours == null || hours <= t.freeHours) return 0;
  const max = side === 'early' ? t.maxEarlyHours : t.maxLateHours;
  if (hours > max) return null;
  if (hours <= 4) return (hours - t.freeHours) * t.hourlyRate;
  if (hours <= 6) return t.halfDayFee;
  return t.extendedFee;
}

// Apply combined cap across early + late on the same booking.
export function transitTotal(earlyHours, lateHours, config) {
  const ef = transitFee(earlyHours, config, 'early');
  const lf = transitFee(lateHours, config, 'late');
  if (ef === null || lf === null) return { early: ef, late: lf, total: null, capped: false };
  const raw = ef + lf;
  const cap = config.transit.combinedCap;
  if (raw > cap) return { early: ef, late: lf, total: cap, capped: true };
  return { early: ef, late: lf, total: raw, capped: false };
}

// Pick the best-matching auto-discount rule for the given quote, or null.
// Rules can use any of: minNights, maxNights, allWeekday (future), tierIn (future),
// dateRange (future). Add more rule types here without touching callers.
export function autoDiscountFor(quoteContext, config) {
  const rules = config.autoDiscounts || [];
  if (!rules.length) return null;
  const { totalNights } = quoteContext;
  const matching = rules.filter(r => {
    if (r.minNights != null && totalNights < r.minNights) return false;
    if (r.maxNights != null && totalNights > r.maxNights) return false;
    return true;
  });
  if (!matching.length) return null;
  // Pick highest-value rule. For % vs ₹, compare effective discount on the
  // subtotal — but caller doesn't pass subtotal here, so fall back to value.
  // In practice the rules list is short, so caller can sort itself if needed.
  return matching.reduce((best, r) => (best && best.value > r.value ? best : r));
}

// Compute capacity + fees for the requested guest count.
// Charges flat ₹extraGuestFeePerNight for each guest above the included
// (default × studios) capacity, multiplied by the number of nights.
export function guestFeeFor(guests, studios, nights, config) {
  const gp = config.guestPolicy;
  if (!gp) return { included: 0, max: 0, extras: 0, fee: 0 };
  const included = gp.defaultPerStudio * studios;
  const max = gp.maxPerStudio * studios;
  const clamped = Math.max(1, Math.min(guests || included, max));
  const extras = Math.max(0, clamped - included);
  const fee = extras * (gp.extraGuestFeePerNight || 0) * nights;
  return { included, max, extras, fee, perGuestPerNight: gp.extraGuestFeePerNight || 0 };
}

// Flat pet charge: a single ₹feePerNight add-on per night when the guest is
// travelling with a pet — once per booking, NOT per studio (mirrors how the
// extra-guest fee is a booking-level add-on). Returns { hasPet, perNight, fee }.
export function petFeeFor(hasPet, nights, config) {
  const pp = config.petPolicy;
  const perNight = pp ? (pp.feePerNight || 0) : 0;
  if (!pp || !hasPet) return { hasPet: false, perNight, fee: 0 };
  return { hasPet: true, perNight, fee: perNight * nights };
}

// Compute the advance-payment amount required to confirm a booking.
// Rules are evaluated top-down; first matching rule wins. Each rule may
// gate on minTotal / maxTotal of the grand total.
export function advancePaymentFor(grandTotal, config, roomCount = 1) {
  const cfg = config.advancePayment;
  if (!cfg || !cfg.rules || !cfg.rules.length) return null;
  const match = cfg.rules.find(r =>
    (r.minTotal == null || grandTotal >= r.minTotal) &&
    (r.maxTotal == null || grandTotal <= r.maxTotal)
  );
  if (!match) return null;

  let amt = match.type === 'pct'
    ? Math.round(grandTotal * match.value / 100)
    : match.value;
  if (cfg.minAmount && amt < cfg.minAmount) amt = cfg.minAmount;
  // maxAmount is per-room — scale by roomCount.
  const maxCap = cfg.maxAmount ? cfg.maxAmount * roomCount : null;
  if (maxCap && amt > maxCap) amt = maxCap;
  if (cfg.roundTo) amt = Math.ceil(amt / cfg.roundTo) * cfg.roundTo;
  amt = Math.min(amt, grandTotal);

  return {
    amount: amt,
    label: match.label || (match.type === 'pct' ? `${match.value}% advance` : `${match.value} advance`),
    balance: Math.max(0, grandTotal - amt)
  };
}

// Compute the effective check-in / check-out time given hours offset.
export function shiftTime(baseHHmm, hoursEarlier) {
  const [h, m] = baseHHmm.split(':').map(Number);
  let mins = h * 60 + m - hoursEarlier * 60;
  while (mins < 0) mins += 24 * 60;
  while (mins >= 24 * 60) mins -= 24 * 60;
  const hh = Math.floor(mins / 60);
  const mm = mins % 60;
  const ampm = hh >= 12 ? 'PM' : 'AM';
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2,'0')} ${ampm}`;
}
