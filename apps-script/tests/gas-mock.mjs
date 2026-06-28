// Minimal Google Apps Script globals, mocked just enough to exercise app-script.js
// read paths (doGet: analytics / activeBookings / lookup) in plain Node. No real
// Google services — sheets are in-memory fixtures.

// The Bookings sheet column order (matches rowToBooking_ in app-script.js).
export const BOOKING_HEADERS = [
  'Name', 'Mobile', 'Check-In', 'Check-Out', 'Room Number',
  'Platform', 'Online/Offline', 'Number of guests', 'Amount', 'Advance', 'Paid To Manju',
];

/** Build a booking row (array in BOOKING_HEADERS order) from a {Header: value} object. */
export function mkRow(o) {
  return BOOKING_HEADERS.map(h => (o[h] != null ? o[h] : ''));
}

/** An in-memory Sheet with the handful of methods app-script.js calls. */
export function mockSheet(name, headers, rows) {
  const grid = [headers.slice(), ...rows.map(r => r.slice())];
  return {
    getName: () => name,
    getLastColumn: () => headers.length,
    getLastRow: () => grid.length,
    getRange: (r, c, nr, nc) => ({
      getValues: () => {
        const out = [];
        for (let i = 0; i < nr; i++) out.push((grid[r - 1 + i] || []).slice(c - 1, c - 1 + nc));
        return out;
      },
    }),
    getDataRange: () => ({ getValues: () => grid.map(row => row.slice()) }),
  };
}

/** A SpreadsheetApp whose active spreadsheet holds the given sheets. */
export function makeSpreadsheetApp(sheets) {
  const ss = {
    getSheets: () => sheets,
    getSheetByName: (n) => sheets.find(s => s.getName() === n) || null,
    insertSheet: (n) => { const s = mockSheet(n, [], []); sheets.push(s); return s; },
  };
  return { getActiveSpreadsheet: () => ss };
}

// Utilities.formatDate — only the date tokens the read paths use. Uses the date's
// LOCAL components (run the suite with TZ=Asia/Kolkata to mirror production / avoid DST).
export const Utilities = {
  formatDate(date, _tz, fmt) {
    const p = (n, w = 2) => String(n).padStart(w, '0');
    return String(fmt)
      .replace(/yyyy/g, date.getFullYear())
      .replace(/MM/g, p(date.getMonth() + 1))
      .replace(/dd/g, p(date.getDate()))
      .replace(/HH/g, p(date.getHours()))
      .replace(/mm/g, p(date.getMinutes()))
      .replace(/ss/g, p(date.getSeconds()));
  },
};

// ContentService — captures the JSON string so tests can read it back.
export const ContentService = {
  MimeType: { JSON: 'application/json', TEXT: 'text/plain' },
  createTextOutput(s) {
    return { _c: s, setMimeType() { return this; }, getContent() { return this._c; } };
  },
};
