# Nivaa Stays — Apps Script (source mirror)

The `app-script.js` here is a **mirror** of the Apps Script project bound to the Bookings Google Sheet. Editing this file does not deploy anything by itself — Apps Script source lives in Google's editor. Use this folder for version-history and code review; copy changes into the Apps Script editor to ship them.

## What it does

- `doGet(e)` — serves multiple read endpoints:
  - `?lookup={phone}-{ymd}` → JSON booking lookup (used by `checkin.html`)
  - `?hub={phone}-{ymd}` → aggregated guest hub data (booking + orders + rentals + add-ons + totals)
  - `?activeBookings=YYYY-MM-DD` → admin dashboard data: bookings grouped into `arriving / inhouse / leaving / upcoming` (next 7 days). Pass `?activeBookings=1` to default to today.
  - `?feed=availability&room=1|2` → iCal feed for Airbnb sync (planned)
- `doPost(e)` — accepts:
  - Self check-in form submission (default behavior — writes Check-ins tab, files ID upload)
  - `?action=order` → guest hub food-order capture, writes to **Orders** tab
  - `?action=rental` → guest hub bike-rental capture, writes to **Bike Rentals** tab
- `dailyDigest()` — emails the host a daily check-in / check-out / review reminder summary
- `installDailyTrigger()` — one-off helper that schedules `dailyDigest()` at 9 AM IST
- `listTriggers()` — lists all installed triggers (debug helper)

## Sheet tabs

Auto-created on first write — don't manually create unless you want a header tweak first:

| Tab | Created by | Columns |
|---|---|---|
| `Bookings` (or any monthly tab) | Manual | Name, Mobile, Check-In, Check-Out, Room Number, Platform, Online/Offline, Number of guests, Amount, Paid To Manju (existing) |
| `Check-ins` | First self check-in | Submitted At, Mode, Booking ID, Name, Phone, Email, Check-In, Check-Out, Room, Source, Num Guests, ID Type, ID File URL, Arrival Time, Special Requests |
| `Orders` | First food-order POST | Submitted At, Booking ID, Name, Items (JSON), Item Count, Subtotal, Status, Notes |
| `Bike Rentals` | First rental POST | Submitted At, Booking ID, Name, Type, Start Date, End Date, Days, Rate (₹/day), Subtotal, Status, Notes |
| `Add-ons` | **Manual host entry only** — create with these headers when you have a manual add-on to log | Submitted At, Booking ID, Name, Type, Description, Amount, Notes |

`Booking ID` is the join key everywhere — format `{phoneDigits}-{checkin-ymd}` (e.g., `9620364554-2026-05-15` or `8892811032-2026-05-15`).

`Name` is auto-populated server-side by looking up the booking row when the order/rental is recorded, so the guest never has to retype it.

### Phone normalization

`normalizePhone_()` collapses Indian numbers to **last 10 digits** — so `+91 8892811032`, `91 8892811032`, `+918892811032`, and `8892811032` all match the same booking. The booking-ID portion of URLs is the 10-digit form. Sheet entries can use any format; the lookup tolerates them.

## Bike rental rates (duplicated config)

Rates live in **two places** — keep them in sync:
1. `BIKE_RATES` constant at the top of the guest-hub section in `app-script.js`
2. `bikeRental` block in `site/pricing.json`

Currently: Vespa ₹600/day, Ninja ₹1,500/day.

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
