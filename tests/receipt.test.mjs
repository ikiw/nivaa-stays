import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const pricingSource = readFileSync(new URL('../js/pricing.js', import.meta.url), 'utf8');
const pricing = await import(`data:text/javascript;base64,${Buffer.from(pricingSource).toString('base64')}`);
const receiptSource = readFileSync(new URL('../js/receipt.js', import.meta.url), 'utf8');
const config = JSON.parse(readFileSync(new URL('../data/pricing.json', import.meta.url), 'utf8'));
const stay = 'ci=2026-06-01&co=2026-06-05&adv=2000';

async function receipt(search) {
  const root = { innerHTML: '', addEventListener() {} };
  const print = { innerHTML: '' };
  const context = vm.createContext({
    ...pricing,
    URLSearchParams,
    location: new URL(`https://nivaastays.com/receipt?${search}`),
    history: { replaceState() {} },
    window: { addEventListener() {} },
    document: {
      readyState: 'loading',
      addEventListener() {},
      getElementById(id) {
        if (id === 'receipt-root') return root;
        if (id === 'bc-print-receipt') return print;
        return null;
      }
    },
    fetch: async () => ({ json: async () => structuredClone(config) })
  });
  vm.runInContext(receiptSource.replace(/^import .* from '\.\/pricing\.js';$/m, ''), context);
  await context.init();
  return { context, root, print };
}

test('November 9 and 10 use Prime rates in quotes and receipts without changing adjacent dates', async () => {
  const quote = pricing.quoteForRange('2026-11-08', '2026-11-12', config);
  assert.deepEqual(quote.nights.map(({ tier, rate }) => ({ tier, rate })), [
    { tier: 'weekend', rate: 2500 },
    { tier: 'weekend', rate: 2500 },
    { tier: 'weekend', rate: 2500 },
    { tier: 'weekday', rate: 2000 }
  ]);
  const { context, root } = await receipt('ci=2026-11-09&co=2026-11-11');
  assert.equal(context.computeAll().subtotal, 5000);
  assert.match(root.innerHTML, /Prime/);
});

test('December holiday overrides apply Prime and Peak rates across quotes and receipts', async () => {
  const quote = pricing.quoteForRange('2026-12-21', '2027-01-01', config);
  assert.deepEqual(quote.nights.map(({ tier }) => tier), [
    'weekend', 'weekend', 'weekend', 'weekend',
    'longWeekend', 'longWeekend', 'longWeekend',
    'longWeekend', 'longWeekend', 'longWeekend', 'longWeekend'
  ]);
  assert.equal(quote.total, 31000);
  assert.equal(pricing.rateForDate('2026-12-17', config).tier, 'weekday');
  assert.equal(pricing.rateForDate('2027-01-04', config).tier, 'weekday');

  const { context, root } = await receipt('ci=2026-12-24&co=2026-12-28');
  assert.equal(context.computeAll().subtotal, 11500);
  assert.match(root.innerHTML, /Prime/);
  assert.match(root.innerHTML, /Peak/);
});

test('Christmas and New Year Peak rates cover December 25 through January 3 inclusively', async () => {
  const quote = pricing.quoteForRange('2026-12-24', '2027-01-05', config);
  assert.deepEqual(quote.nights.map(({ tier, rate }) => ({ tier, rate })), [
    { tier: 'weekend', rate: 2500 },
    { tier: 'longWeekend', rate: 3000 },
    { tier: 'longWeekend', rate: 3000 },
    { tier: 'longWeekend', rate: 3000 },
    { tier: 'longWeekend', rate: 3000 },
    { tier: 'longWeekend', rate: 3000 },
    { tier: 'longWeekend', rate: 3000 },
    { tier: 'longWeekend', rate: 3000 },
    { tier: 'longWeekend', rate: 3000 },
    { tier: 'longWeekend', rate: 3000 },
    { tier: 'longWeekend', rate: 3000 },
    { tier: 'weekday', rate: 2000 }
  ]);
  const { context, root } = await receipt('ci=2026-12-27&co=2027-01-04');
  assert.equal(context.computeAll().subtotal, 24000);
  assert.match(root.innerHTML, /Peak/);
});

test('Prime date overrides are optional and do not replace Peak rates', () => {
  const { manualPrimeDates, ...withoutOverrides } = config;
  assert.equal(pricing.rateForDate('2026-11-09', withoutOverrides).tier, 'weekday');
  const peakConfig = {
    ...config,
    manualPrimeDates,
    manualLongWeekends: [{ from: '2026-11-09', to: '2026-11-09', name: 'Peak override' }]
  };
  assert.equal(pricing.rateForDate('2026-11-09', peakConfig).tier, 'longWeekend');
});

for (const amount of [7000, 7600, 8000, 9000]) {
  test(`sheet amount ${amount} overrides long-stay pricing across receipt, PDF and share reloads`, async () => {
    const { context, root, print } = await receipt(`${stay}&amt=${amount}`);
    const totals = context.computeAll();
    assert.equal(totals.grandTotal, amount);
    assert.equal(totals.balance, amount - 2000);
    assert.notEqual(totals.disc.source, 'auto');
    assert.doesNotMatch(root.innerHTML, /Long stay/);
    context.renderPrintReceipt();
    assert.doesNotMatch(print.innerHTML, /Long stay/);
    assert.match(print.innerHTML, new RegExp(pricing.formatINR(amount)));

    const sharedUrl = new URL(context.buildShareUrl());
    assert.equal(sharedUrl.searchParams.get('autoDisc'), '0');
    const shared = await receipt(sharedUrl.search.slice(1));
    assert.equal(shared.context.computeAll().grandTotal, amount);
    assert.equal(shared.context.computeAll().balance, amount - 2000);
    assert.doesNotMatch(shared.root.innerHTML, /Long stay/);

    const reloaded = await receipt(new URL(shared.context.buildShareUrl()).search.slice(1));
    assert.equal(reloaded.context.computeAll().grandTotal, amount);
  });
}

test('standalone receipt retains the automatic long-stay discount', async () => {
  const { context, root } = await receipt(stay);
  const totals = context.computeAll();
  assert.equal(totals.subtotal, 8000);
  assert.equal(totals.disc.amount, 400);
  assert.equal(totals.disc.source, 'auto');
  assert.equal(totals.grandTotal, 7600);
  assert.match(root.innerHTML, /Long stay/);
  assert.equal(new URL(context.buildShareUrl()).searchParams.has('autoDisc'), false);
});

test('explicit manual discounts remain editable on sheet-backed receipts', async () => {
  const { context } = await receipt(`${stay}&amt=8000&discType=amt&disc=300`);
  assert.equal(context.computeAll().disc.source, 'manual');
  assert.equal(context.computeAll().grandTotal, 7700);
  vm.runInContext('state.discountValue = 0', context);
  assert.equal(context.computeAll().grandTotal, 8000);
  assert.equal(context.computeAll().disc.amount, 0);
});

test('custom add-ons remain additional and are not duplicated on shared receipts', async () => {
  const addons = encodeURIComponent(JSON.stringify([{ label: 'Airport pickup', amount: 500 }]));
  const { context } = await receipt(`${stay}&amt=9000&addons=${addons}`);
  assert.equal(context.computeAll().grandTotal, 9500);
  const shared = await receipt(new URL(context.buildShareUrl()).search.slice(1));
  assert.equal(shared.context.computeAll().grandTotal, 9500);
});

test('bathtub receipts use the selected room rate for full-day late checkout', async () => {
  const { context } = await receipt('ci=2026-12-23&co=2026-12-25&bathtub=1&late=7');
  assert.equal(context.computeAll().tt.late, 3500);
  assert.equal(context.computeAll().grandTotal, 9500);
  const { context: sheet } = await receipt('ci=2026-12-23&co=2026-12-25&bathtub=1&late=7&amt=9500');
  assert.equal(sheet.computeAll().disc.amount, 0);
  assert.equal(sheet.computeAll().addonsTotal, 0);
});

test('receipt and PDF show room type separately from the studio booking', async () => {
  for (const studios of [1, 2]) {
    for (const bathtub of [0, 1]) {
      const { context, root, print } = await receipt(`${stay}&studios=${studios}&bathtub=${bathtub}`);
      const roomType = bathtub ? 'Room with bathtub' : 'Room only';
      const booking = studios === 2 ? '2 Studios · Full House' : '1 Studio';
      assert.ok(root.innerHTML.includes(`<div class="bc-label">Room type</div><div class="bc-value">${roomType}</div>`));
      assert.ok(root.innerHTML.includes(`<div class="bc-label">Booking</div><div class="bc-value">${booking} ·`));
      assert.doesNotMatch(root.innerHTML, /\((?:With(?: \d+)?|Without) bathtub/);
      context.renderPrintReceipt();
      assert.ok(print.innerHTML.includes(`<tr><td>Room type</td><td>${roomType}</td></tr>`));
      assert.ok(print.innerHTML.includes(`<tr><td>Booking</td><td>${booking}</td></tr>`));
      assert.doesNotMatch(print.innerHTML, /\((?:With(?: \d+)?|Without) bathtub/);
    }
  }
});
