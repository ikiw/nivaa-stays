import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const pricingSource = readFileSync(new URL('../js/pricing.js', import.meta.url), 'utf8');
const pricing = await import(`data:text/javascript;base64,${Buffer.from(pricingSource).toString('base64')}`);
const pickerSource = readFileSync(new URL('../js/calendar-picker.js', import.meta.url), 'utf8');
const config = JSON.parse(readFileSync(new URL('../data/pricing.json', import.meta.url), 'utf8'));

async function picker(search = '') {
  const root = { innerHTML: '', addEventListener() {} };
  const print = { innerHTML: '' };
  const sticky = { innerHTML: '', classList: { add() {}, remove() {} } };
  const context = vm.createContext({
    ...pricing,
    URLSearchParams,
    location: new URL(`https://nivaastays.com/booking?${search}`),
    history: { replaceState(_state, _title, url) { context.location = new URL(url); } },
    window: { scrollY: 0, addEventListener() {} },
    document: {
      readyState: 'loading',
      activeElement: null,
      body: { classList: { add() {}, remove() {} } },
      addEventListener() {},
      getElementById(id) {
        if (id === 'rate-picker') return root;
        if (id === 'rp-print-quote') return print;
        if (id === 'rp-sticky-bar') return sticky;
        return null;
      }
    },
    fetch: async () => ({ json: async () => structuredClone(config) })
  });
  vm.runInContext(pickerSource.replace(/^import .* from '\.\/pricing\.js';$/m, ''), context);
  await context.init();
  function click(action) {
    context.onClick({
      target: {
        closest(selector) {
          return selector === '[data-action]' ? { getAttribute() { return action; } } : null;
        }
      }
    });
  }
  return { context, root, print, sticky, click };
}

test('room selection updates Base, Prime and Peak calendar rates and quotes without a bathtub add-on', async () => {
  const { context, root, click } = await picker('ci=2026-12-24&co=2026-12-28');
  assert.equal(context.computeQuote().grandTotal, 13000);
  assert.match(root.innerHTML, /data-action="room-only" aria-pressed="true"/);
  assert.doesNotMatch(root.innerHTML, /Add bathtub/);

  click('room-with-bathtub');
  assert.deepEqual(Array.from(context.computeQuote().q.nights, n => n.rate), [3000, 4000, 4000, 4000]);
  assert.equal(context.computeQuote().grandTotal, 15000);
  assert.match(root.innerHTML, /Base ₹2,500/);
  assert.match(root.innerHTML, /Prime ₹3,000/);
  assert.match(root.innerHTML, /Peak ₹3,500/);
  for (const [date, rate] of [['2026-12-17', '2.5'], ['2026-12-24', '3.0'], ['2026-12-25', '4.0']]) {
    assert.match(root.innerHTML, new RegExp(`data-date="${date}"[^>]*>[\\s\\S]*?<span class="rp-rate">₹${rate.replace('.', '\\.')}k</span>`));
  }
  assert.equal(pricing.quoteForRange('2026-12-17', '2026-12-18', config, 'withBathtub').total, 2500);
  assert.doesNotMatch(root.innerHTML, /Bathtub charge/);

  click('room-only');
  assert.equal(context.computeQuote().grandTotal, 13000);
  assert.match(root.innerHTML, /Base ₹2,000/);
  assert.match(root.innerHTML, /Prime ₹2,500/);
  assert.match(root.innerHTML, /Peak ₹3,000/);
  assert.equal(new URL(context.buildShareUrl()).searchParams.has('bathtub'), false);
});

test('legacy bathtub links preserve room selection across reloads, WhatsApp, sticky totals and PDF quotes', async () => {
  const { context, root, print, sticky } = await picker('ci=2026-12-24&co=2026-12-28&bathtub=1');
  assert.match(root.innerHTML, /data-action="room-with-bathtub" aria-pressed="true"/);
  const quote = context.computeQuote();
  const message = new URL(context.buildBookingMessage(quote)).searchParams.get('text');
  assert.match(message, /Room with bathtub/);
  assert.match(message, /Total ₹15,000/);
  assert.doesNotMatch(message, /bathtub \(\+/);
  assert.match(sticky.innerHTML, /₹15,000/);
  context.renderPrintQuote();
  assert.match(print.innerHTML, /Room with bathtub/);
  assert.match(print.innerHTML, /₹4,000/);
  assert.match(print.innerHTML, /₹15,000/);
  assert.doesNotMatch(print.innerHTML, /Bathtub charge/);

  const shared = new URL(context.buildShareUrl());
  assert.equal(shared.searchParams.get('bathtub'), '1');
  const reloaded = await picker(shared.search.slice(1));
  assert.equal(reloaded.context.computeQuote().grandTotal, quote.grandTotal);
  assert.match(reloaded.root.innerHTML, /data-action="room-with-bathtub" aria-pressed="true"/);
});

test('room rates scale for full house while preserving guest, pet, discount and custom add-on calculations', async () => {
  const addons = encodeURIComponent(JSON.stringify([{ label: 'Airport pickup', amount: 500 }]));
  const { context, click } = await picker(`ci=2026-12-24&co=2026-12-28&studios=2&adults=5&children=6,7&pet=1&disc=10&discType=pct&addons=${addons}`);
  click('room-with-bathtub');
  const quote = context.computeQuote();
  assert.equal(quote.roomTotal, 30000);
  assert.equal(quote.guestInfo.fee, 5200);
  assert.equal(quote.petInfo.fee, 2000);
  assert.equal(quote.grandTotal, 33980);
  click('room-only');
  assert.equal(context.computeQuote().grandTotal, 30380);
});

test('full-day late checkout uses the selected room rate while hourly and half-day fees stay unchanged', async () => {
  const { context, root, click } = await picker('ci=2026-12-23&co=2026-12-25&bathtub=1&late=7');
  assert.equal(context.computeQuote().tt.late, 4000);
  assert.equal(context.computeQuote().grandTotal, 10000);
  assert.match(root.innerHTML, /<span class="rp-step-fee">₹4,000<\/span>/);
  click('room-only');
  assert.equal(context.computeQuote().tt.late, 3500);
  assert.equal(context.computeQuote().grandTotal, 8500);
  click('room-with-bathtub');
  click('late-dec');
  assert.equal(context.computeQuote().tt.late, 1000);
  click('late-dec');
  click('late-dec');
  click('late-dec');
  assert.equal(context.computeQuote().tt.late, 750);
});

test('holiday surcharge covers every night Dec 25 through Jan 3 for both room types only', () => {
  const baseline = { ...config, dateSurcharges: [] };
  for (const room of ['roomOnly', 'withBathtub']) {
    const quote = pricing.quoteForRange('2026-12-24', '2027-01-05', config, room);
    const original = pricing.quoteForRange('2026-12-24', '2027-01-05', baseline, room);
    for (const [i, night] of quote.nights.entries()) {
      const extra = night.date >= '2026-12-25' && night.date <= '2027-01-03' ? 500 : 0;
      assert.equal(night.rate, original.nights[i].rate + extra, `${room} ${night.date}`);
    }
    assert.equal(quote.total, original.total + 5000);
    assert.equal(pricing.quoteForRange('2026-12-24', '2026-12-25', config, room).total,
      pricing.rateForDate('2026-12-24', baseline, room).rate);
  }
});
