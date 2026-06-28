# Apps Script tests

Tests for `apps-script/app-script.js` (the Bookings backend) so the read paths
keep working as the script grows.

## Run

```bash
npm run test:apps-script     # or: npm test
```

Node's built-in test runner — **no dependencies to install**. Runs with
`TZ=Asia/Kolkata` to mirror production and avoid DST date drift.

## How it works

`app-script.js` is written for Google Apps Script — no module system, relies on
globals (`SpreadsheetApp`, `Utilities`, `ContentService`). So:

- **`gas-mock.mjs`** — minimal in-memory mocks of those globals + sheet fixtures.
- **`load.mjs`** — runs the *unmodified* `app-script.js` in a Node `vm` sandbox
  with the mocks injected, exposing its top-level functions. The file you paste
  into Apps Script is never changed to make it testable.
- **`app-script.test.mjs`** — calls `doGet({parameter})` with fixture sheets and
  asserts the JSON it returns.

Coverage: the `analytics` endpoint (monthly aggregation, channel mix, repeat
guests, night-splitting across months, mixed date formats, current-month block),
`activeBookings` buckets, the `lookup` path, and the helpers
(`normalizePhone_`, `ymd_`, `rowToBooking_`).

## Add a test

```js
const app = appWith([
  mkRow({ Name: 'A', Mobile: '99…', 'Check-In': '1-Jun-2026', 'Check-Out': '3-Jun-2026',
          Platform: 'Direct', Amount: '₹4,000', 'Room Number': '1' }),
]);
const data = get(app, { analytics: '1' });
assert.equal(data.totals.bookings, 1);
```

`mkRow({Header: value})` builds a Bookings row; `appWith(rows)` wires a fixture
sheet; `get(app, params)` calls `doGet` and parses the JSON. Date cells accept
real `Date` objects **or** text (`"1-Jun-2026"`, `"2026-06-01"`, `"1/6/2026"`).

> Only the **read** paths (`doGet`) are covered. The `doPost` writes
> (check-in / orders / rentals — Gmail/Drive side effects) are stubbed as no-ops
> and not yet asserted.
