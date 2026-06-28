// Loads apps-script/app-script.js into a Node vm sandbox with mocked GAS globals,
// then exposes its top-level functions for testing. The file stays exactly as
// pasted into Apps Script (no module exports) — we never modify it to test it.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const SRC = readFileSync(join(here, '..', 'app-script.js'), 'utf8');

// No-op stubs for GAS globals the read paths don't call (Gmail/Drive/triggers).
// A Proxy so any property access or call is a harmless no-op.
const noop = new Proxy(function () {}, { get: () => noop, apply: () => undefined });
const STUBS = {};
for (const k of ['GmailApp', 'MailApp', 'DriveApp', 'ScriptApp', 'Logger', 'UrlFetchApp', 'Session']) STUBS[k] = noop;

/**
 * @param {object} globals  GAS globals to inject (SpreadsheetApp, Utilities, ContentService, …)
 * @returns the sandbox context — top-level function declarations (doGet, analyticsData_,
 *          normalizePhone_, rowToBooking_, …) are attached as properties.
 */
export function loadAppScript(globals = {}) {
  const ctx = { console, ...STUBS, ...globals };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: 'app-script.js' });
  return ctx;
}
