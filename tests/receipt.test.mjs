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
