// Tests for apps-script/app-script.js read paths. Run: npm run test:apps-script
// (sets TZ=Asia/Kolkata so date math mirrors production and avoids DST flakiness).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadAppScript } from './load.mjs';
import { makeSpreadsheetApp, mockSheet, Utilities, ContentService, BOOKING_HEADERS, mkRow } from './gas-mock.mjs';

// --- harness ---
function appWith(bookingRows, extraSheets = []) {
  const sheets = [mockSheet('Bookings', BOOKING_HEADERS, bookingRows), ...extraSheets];
  return loadAppScript({ SpreadsheetApp: makeSpreadsheetApp(sheets), Utilities, ContentService });
}
const get = (app, params) => JSON.parse(app.doGet({ parameter: params }).getContent());

// --- date fixtures, relative to "now" so they stay inside the 3-year window ---
const MONS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const ref = new Date();
const lm0 = new Date(ref.getFullYear(), ref.getMonth() - 1, 1);     // first of last month
const lmY = lm0.getFullYear(), lmM = lm0.getMonth();
const lmKey = lmY + '-' + String(lmM + 1).padStart(2, '0');
const thisKey = ref.getFullYear() + '-' + String(ref.getMonth() + 1).padStart(2, '0');
const daysLM = new Date(lmY, lmM + 1, 0).getDate();
const Dlm = d => new Date(lmY, lmM, d);                              // a Date in last month
const dmy = dt => dt.getDate() + '-' + MONS[dt.getMonth()] + '-' + dt.getFullYear();   // "5-Jun-2026" (text)
const iso = dt => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');

test('helpers: normalizePhone_, ymd_, rowToBooking_', () => {
  const app = appWith([]);
  assert.equal(app.normalizePhone_('+91 88928 11032'), '8892811032');
  assert.equal(app.normalizePhone_('918892811032'), '8892811032');
  assert.equal(app.normalizePhone_('8892811032'), '8892811032');
  assert.equal(app.ymd_(new Date(2026, 5, 1)), '2026-06-01');
  const b = app.rowToBooking_(BOOKING_HEADERS, mkRow({
    Name: 'A', Mobile: '9620364554', 'Check-In': new Date(2026, 5, 1), 'Check-Out': new Date(2026, 5, 3),
    'Room Number': '1', Platform: 'Airbnb', Amount: '₹4,000',
  }));
  assert.equal(b.name, 'A');
  assert.equal(b.phone, '9620364554');
  assert.equal(b.room, '1');
  assert.equal(b.platform, 'Airbnb');
});

test('parseDate_: Date / ISO / D-MMM-YYYY / DD-MM-YYYY parse; junk rejected', () => {
  const p = appWith([]).parseDate_;
  assert.equal(p('2026-01-15').getMonth(), 0);          // ISO
  assert.equal(p('15-Jan-2026').getMonth(), 0);          // D-MMM-YYYY (text)
  assert.equal(p('15/1/2026').getMonth(), 0);            // DD/MM/YYYY
  assert.ok(p(new Date(2026, 0, 15)) instanceof Date);   // real Date cell
  assert.equal(p('garbage'), null);
  assert.equal(p(''), null);
});

test('analytics: monthly aggregation, channels, repeat, totals', () => {
  const rows = [
    mkRow({ Name: 'A', Mobile: '1111111111', 'Check-In': dmy(Dlm(5)),  'Check-Out': dmy(Dlm(7)),  Platform: 'Direct',  Amount: '₹4,000', Advance: '2000', 'Room Number': '1' }), // 2 nights
    mkRow({ Name: 'B', Mobile: '2222222222', 'Check-In': iso(Dlm(10)), 'Check-Out': iso(Dlm(11)), Platform: 'Airbnb',  Amount: '2500',       'Room Number': '2' }),                     // 1 night
    mkRow({ Name: 'C', Mobile: '1111111111', 'Check-In': Dlm(20),      'Check-Out': Dlm(23),      Platform: 'Booking', Amount: '₹6,000', 'Room Number': '1' }),                    // 3 nights, repeat phone
    mkRow({ Name: 'E', Mobile: '3333333333', 'Check-In': Dlm(1),       'Check-Out': Dlm(2),       Platform: 'Direct',  Amount: '',           'Room Number': '2' }),                     // 1 night, no amount
    mkRow({ Name: '',  Mobile: '4444444444', 'Check-In': Dlm(4),       'Check-Out': Dlm(6) }),                                                                                          // no name -> skipped
    mkRow({ Name: 'G', Mobile: '5555555555', 'Check-In': 'garbage',    'Check-Out': 'nope',       Amount: '999' }),                                                                     // bad dates -> skipped
  ];
  const d = get(appWith(rows), { analytics: '1' });
  const lm = d.months.find(m => m.month === lmKey);
  assert.ok(lm, 'last month present in series');
  assert.equal(lm.bookings, 4);                                   // A,B,C,E (no-name + garbage skipped)
  assert.equal(lm.nights, 7);                                     // 2+1+3+1
  assert.equal(lm.revenue, 12500);                                // 4000+2500+6000+0
  assert.equal(lm.adr, Math.round(12500 / 7));
  assert.equal(lm.occupancy, Math.round((7 / (2 * daysLM)) * 1000) / 10);

  const ch = Object.fromEntries(d.channels.map(c => [c.name, c]));
  assert.equal(ch.Direct.bookings, 2);
  assert.equal(ch.Direct.revenue, 4000);
  assert.equal(ch.Airbnb.revenue, 2500);
  assert.equal(ch.Booking.revenue, 6000);

  assert.equal(d.repeat.guests, 3);                               // 1111, 2222, 3333
  assert.equal(d.repeat.returning, 1);                            // 1111 booked twice
  assert.equal(d.totals.bookings, 4);
  assert.equal(d.totals.nights, 7);
  assert.equal(d.totals.revenue, 12500);
  assert.equal(d.payments.collected, 2000);                       // only A had an advance
});

test('analytics: nights + revenue split across a month boundary', () => {
  const start = Dlm(daysLM - 1);                                  // 2nd-to-last day of last month
  const end = new Date(lmY, lmM, daysLM - 1 + 4);                 // +4 nights -> rolls into this month
  const d = get(appWith([
    mkRow({ Name: 'X', Mobile: '9000000000', 'Check-In': start, 'Check-Out': end, Platform: 'Direct', Amount: '8000', 'Room Number': '1' }),
  ]), { analytics: '1' });
  const lm = d.months.find(m => m.month === lmKey);
  const tm = d.months.find(m => m.month === thisKey);
  assert.equal(lm.nights, 2);
  assert.equal(tm.nights, 2);
  assert.equal(lm.revenue, 4000);                                 // 8000/4 * 2
  assert.equal(tm.revenue, 4000);
  assert.equal(lm.bookings, 1);                                   // a booking belongs to its check-in month
  assert.equal(tm.bookings, 0);
});

test('analytics: parses ISO / D-MMM-YYYY / DD-MM-YYYY / Date cells alike', () => {
  const rows = [
    mkRow({ Name: 'iso',   Mobile: '1', 'Check-In': iso(Dlm(3)), 'Check-Out': iso(Dlm(4)), Amount: '1000', Platform: 'Direct' }),
    mkRow({ Name: 'dmy',   Mobile: '2', 'Check-In': dmy(Dlm(3)), 'Check-Out': dmy(Dlm(4)), Amount: '1000', Platform: 'Direct' }),
    mkRow({ Name: 'date',  Mobile: '3', 'Check-In': Dlm(3),      'Check-Out': Dlm(4),      Amount: '1000', Platform: 'Direct' }),
    mkRow({ Name: 'slash', Mobile: '4', 'Check-In': `3-${lmM + 1}-${lmY}`, 'Check-Out': `4-${lmM + 1}-${lmY}`, Amount: '1000', Platform: 'Direct' }),
  ];
  const lm = get(appWith(rows), { analytics: '1' }).months.find(m => m.month === lmKey);
  assert.equal(lm.bookings, 4);
  assert.equal(lm.nights, 4);
  assert.equal(lm.revenue, 4000);
});

test('analytics: lead time + pace from the booking-made Date column', () => {
  const H = ['Date', 'Name', 'Check-In', 'Check-Out', 'Room Number', 'Amount', 'Online/Offline', 'Platform', 'Mobile'];
  const r = (o) => H.map((h) => (o[h] != null ? o[h] : ''));
  const made = (ci, lead) => new Date(ci.getFullYear(), ci.getMonth(), ci.getDate() - lead);   // booking-made date
  const rows = [
    r({ Date: made(Dlm(15), 10), Name: 'A', 'Check-In': Dlm(15), 'Check-Out': Dlm(16), Amount: '3000', Platform: 'Direct', Mobile: '1', 'Room Number': '1' }),
    r({ Date: made(Dlm(20), 2),  Name: 'B', 'Check-In': Dlm(20), 'Check-Out': Dlm(21), Amount: '3000', Platform: 'Direct', Mobile: '2', 'Room Number': '1' }),
    r({ Date: made(Dlm(25), 0),  Name: 'C', 'Check-In': Dlm(25), 'Check-Out': Dlm(26), Amount: '3000', Platform: 'Direct', Mobile: '3', 'Room Number': '1' }),
  ];
  const app = loadAppScript({ SpreadsheetApp: makeSpreadsheetApp([mockSheet('Apr 2026', H, rows)]), Utilities, ContentService });
  const d = JSON.parse(app.doGet({ parameter: { analytics: '1' } }).getContent());
  assert.equal(d.leadTime.coverage, 1);                                       // all 3 have a valid made-date
  assert.equal(d.leadTime.sampleSize, 3);
  assert.equal(d.leadTime.median, 2);                                          // [0,2,10] -> 2
  assert.equal(d.leadTime.buckets.find((b) => b.label === 'Same day').count, 1);
  assert.ok(d.pace && Array.isArray(d.pace.months));
  const pm = d.pace.months.find((m) => m.month === lmKey);
  assert.ok(pm && pm.coverage === 1);                                          // last month fully dated
});

test('analytics: current-month block + target shape', () => {
  const d = get(appWith([]), { analytics: '1' });
  assert.equal(d.revenueTarget, 100000);
  assert.equal(d.rooms, 2);
  assert.ok(d.current, 'current block present');
  assert.equal(d.current.month, thisKey);
  assert.equal(d.current.days.length, new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate());
  assert.ok(Array.isArray(d.current.weeks) && d.current.weeks.length >= 4);
  assert.ok(d.current.days.every(x => x.free >= 0 && x.free <= 2));
});

test('getBookingTabs_ ignores sheets that lack the required headers', () => {
  const orders = mockSheet('Orders', ['Order ID', 'Item', 'Qty'], [['o1', 'Idli', 2]]);
  const d = get(appWith([
    mkRow({ Name: 'A', Mobile: '1', 'Check-In': Dlm(5), 'Check-Out': Dlm(6), Amount: '2000', Platform: 'Direct' }),
  ], [orders]), { analytics: '1' });
  assert.equal(d.totals.bookings, 1);                             // the Orders row is not mistaken for a booking
});

test('analytics: older tabs (no Mobile column) aggregate; Check-ins-style logs ignored', () => {
  // Older monthly tab schema — has Amount but NO Mobile column, phone-less rows.
  const OLD = ['Date', 'Name', 'Check-In', 'Check-Out', 'Room Number', 'Amount', 'Online/Offline', 'Platform', 'Paid To Manju'];
  const orow = (o) => OLD.map((h) => (o[h] != null ? o[h] : ''));
  const janTab = mockSheet('Jan 2026', OLD, [
    orow({ Name: 'Old', 'Check-In': Dlm(5), 'Check-Out': Dlm(7), Amount: '4000', Platform: 'Direct', 'Room Number': '1' }),
  ]);
  // Self-check-in log: Name/Check-In/Check-Out but NO Amount -> must NOT be counted as bookings.
  const checkins = mockSheet('Check-ins', ['Submitted At', 'Name', 'Phone', 'Check-In', 'Check-Out', 'Room'], [
    ['x', 'Walkin', '9000000000', Dlm(6), Dlm(8), '2'],
  ]);
  const app = loadAppScript({ SpreadsheetApp: makeSpreadsheetApp([janTab, checkins]), Utilities, ContentService });
  const d = JSON.parse(app.doGet({ parameter: { analytics: '1' } }).getContent());
  const lm = d.months.find((m) => m.month === lmKey);
  assert.equal(lm.bookings, 1);       // old-tab booking counted despite missing phone
  assert.equal(lm.revenue, 4000);
  assert.equal(d.totals.bookings, 1); // Check-ins log excluded (no Amount column)
  assert.equal(d.repeat.guests, 0);   // phone-less booking adds no repeat-guest entry
});

test('activeBookings: arriving / in-house / leaving / upcoming buckets', () => {
  const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
  const plus = n => new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + n);
  const d = get(appWith([
    mkRow({ Name: 'Arr',  Mobile: '1', 'Check-In': today,    'Check-Out': plus(2) }),
    mkRow({ Name: 'In',   Mobile: '2', 'Check-In': plus(-1), 'Check-Out': plus(1) }),
    mkRow({ Name: 'Out',  Mobile: '3', 'Check-In': plus(-2), 'Check-Out': today }),
    mkRow({ Name: 'Soon', Mobile: '4', 'Check-In': plus(3),  'Check-Out': plus(5) }),
  ]), { activeBookings: '1' });
  assert.equal(d.arriving.length, 1); assert.equal(d.arriving[0].name, 'Arr');
  assert.equal(d.inhouse.length, 1);  assert.equal(d.inhouse[0].name, 'In');
  assert.equal(d.leaving.length, 1);  assert.equal(d.leaving[0].name, 'Out');
  assert.equal(d.upcoming.length, 1); assert.equal(d.upcoming[0].name, 'Soon');
});

test('lookup: resolves a booking by "<phone>-<YYYY-MM-DD>" id', () => {
  const ci = Dlm(5);
  const d = get(appWith([
    mkRow({ Name: 'Find', Mobile: '9620364554', 'Check-In': ci, 'Check-Out': Dlm(7), Amount: '4000' }),
  ]), { lookup: `9620364554-${iso(ci)}` });
  assert.equal(d.found, true);
  assert.equal(d.name, 'Find');
});
