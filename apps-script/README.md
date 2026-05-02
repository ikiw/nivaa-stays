# Nivaa Stays — Apps Script (source mirror)

The `app-script.js` here is a **mirror** of the Apps Script project bound to the Bookings Google Sheet. Editing this file does not deploy anything by itself — Apps Script source lives in Google's editor. Use this folder for version-history and code review; copy changes into the Apps Script editor to ship them.

## What it does

- `doGet(e)` — serves three things based on query params:
  - `?lookup={phone}-{ymd}` → JSON booking lookup (used by `checkin.html`)
  - `?feed=availability&room=1|2` → iCal feed for Airbnb sync (planned)
- `doPost(e)` — accepts the self check-in form submission, writes to the sheet, files the ID upload to Drive
- `dailyDigest()` — emails the host a daily check-in / check-out / review reminder summary
- `installDailyTrigger()` — one-off helper that schedules `dailyDigest()` at 9 AM IST
- `listTriggers()` — lists all installed triggers (debug helper)

## Deploying source changes

1. Open the Bookings sheet → **Extensions → Apps Script**
2. Paste the contents of `app-script.js` over the existing `Code.gs` (or use clasp if you've set it up)
3. Save (⌘S)
4. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**
   - Keep the same web-app URL; do **not** create a new deployment (that would change the URL hardcoded in `checkin.html`)

## Setting the daily 9 AM trigger (one-time)

The script auto-emails a daily digest at 9 AM IST. To install the trigger:

1. Make sure the project timezone is **Asia/Kolkata**:
   - Apps Script editor → Project Settings (gear icon) → "Show appsscript.json manifest file" → set `"timeZone": "Asia/Kolkata"` and save
2. In the editor, select function **`installDailyTrigger`** in the dropdown
3. Click **Run**
4. Authorize when prompted (Gmail + Drive scopes)
5. Confirm via **Triggers** (clock icon) — you should see `dailyDigest` set to time-driven, daily, 9-10 AM

To verify or list triggers later, run `listTriggers()` and check the Execution log (View → Logs).

## Notes

- `installDailyTrigger()` is idempotent — re-running deletes existing `dailyDigest` triggers before adding a new one
- Triggers are tied to the *user account* that authorized them; if Manjula installs them, they run as her
- The Apps Script execution quota (90 min/day for free tier) is well above what daily digest + iCal feed + check-in lookups need
