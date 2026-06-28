// =====================================================                                                                                                   
  // Nivaa Stays — Apps Script
  // Paste into your Bookings sheet → Extensions → Apps Script                                                                                               
  // =====================================================                                                                                                   
  
  const HOST_EMAIL   = 'nivaastays@gmail.com';   // ← where digest + alerts go                                                                               
  const HOST_PHONE   = '919620364554';                         
  const SITE_BASE    = 'https://nivaastays.com';                                                                                                             
  const ID_FOLDER_ID = '18Nd3F4fV2mqPF0IqnJblxqCmgHl8CfPq';  // ← create a private Drive folder, paste its ID
  const REVIEW_URL   = 'https://g.page/r/CetIdjW2VeY1EBM/review';                                                                                            
  const TZ           = 'Asia/Kolkata';                                                                                                                       
                                                                                                                                                             
  // Tabs are detected automatically: any sheet whose row 1 contains all of these.                                                                           
  const REQ_HEADERS = ['Name', 'Check-In', 'Check-Out', 'Mobile'];
                                                                                                                                                             
  // ---------- helpers ----------                             
                                                                                                                                                             
  function getBookingTabs_() {                                 
    return SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(sh => {
      if (sh.getLastColumn() < 1) return false;                                                                                                              
      const row1 = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0]
        .map(c => String(c).trim());                                                                                                                         
      return REQ_HEADERS.every(h => row1.includes(h));         
    });                                                                                                                                                      
  }                                                            
                                                                                                                                                             
  function digits_(s) { return String(s || '').replace(/\D/g, ''); }

  // Normalize an Indian mobile to last 10 digits — strips +, spaces, dashes,
  // AND a leading "91" country code if present. So "+91 8892811032",
  // "918892811032", and "8892811032" all collapse to "8892811032".
  function normalizePhone_(s) {
    const d = digits_(s);
    return (d.length === 12 && d.indexOf('91') === 0) ? d.slice(2) : d;
  }

  function ymd_(d) {
    if (!d) return '';
    if (Object.prototype.toString.call(d) === '[object Date]') {
      return Utilities.formatDate(d, TZ, 'yyyy-MM-dd');                                                                                                      
    }
    const parsed = new Date(d);                                                                                                                              
    if (!isNaN(parsed)) return Utilities.formatDate(parsed, TZ, 'yyyy-MM-dd');                                                                               
    return String(d);
  }                                                                                                                                                          
                                                               
  function rowToBooking_(headers, row) {
    const idx = h => headers.indexOf(h);
    return {
      name: row[idx('Name')] || '',
      phone: normalizePhone_(row[idx('Mobile')]),
      checkin: ymd_(row[idx('Check-In')]),                                                                                                                   
      checkout: ymd_(row[idx('Check-Out')]),
      room: row[idx('Room Number')] != null ? String(row[idx('Room Number')]) : '',                                                                          
      platform: row[idx('Platform')] || '',                                                                                                                  
      onlineOffline: row[idx('Online/Offline')] || '',
      num_guests: row[idx('Number of guests')] || '',                                                                                                        
      amount: row[idx('Amount')] || '',
      advance: row[idx('Advance')] || '',
      paid: row[idx('Paid To Manju')] || ''                                                                                                                  
    };                                                                                                                                                       
  }
                                                                                                                                                             
  function findBooking_(phoneDigits, checkinYmd) {
    const target = normalizePhone_(phoneDigits);
    for (const sh of getBookingTabs_()) {
      const data = sh.getDataRange().getValues();
      const headers = data[0].map(c => String(c).trim());
      const phIdx = headers.indexOf('Mobile');
      const ciIdx = headers.indexOf('Check-In');
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (normalizePhone_(row[phIdx]) === target && ymd_(row[ciIdx]) === checkinYmd) {
          return rowToBooking_(headers, row);
        }
      }
    }
    return null;
  }

  function jsonOut_(obj) {
    return ContentService
      .createTextOutput(JSON.stringify(obj))                                                                                                                 
      .setMimeType(ContentService.MimeType.JSON);
  }                                                                                                                                                          
                                                               
  // ---------- doGet — lookup ----------                                                                                                                    
  
  function doGet(e) {                                                                                                                                        
    const params = (e && e.parameter) || {};
    if (params.hub) return hubData_(params.hub);
    if (params.activeBookings != null) return activeBookings_(params.activeBookings);
    if (params.analytics != null) return analyticsData_();
    if (params.tabsdebug != null) return tabsDebug_();
    const lookup = params.lookup || '';
    if (!lookup) return jsonOut_({ found: false, error: 'no lookup id' });
    const m = lookup.match(/^(\d+)-(\d{4}-\d{2}-\d{2})$/);                                                                                                   
    if (!m) return jsonOut_({ found: false, error: 'invalid format' });                                                                                      
    const [, phone, ci] = m;                                                                                                                                 
    const b = findBooking_(phone, ci);                                                                                                                       
    if (!b) return jsonOut_({ found: false });                 
    return jsonOut_(Object.assign({ found: true }, b));                                                                                                      
  }
                                                                                                                                                             
  // ---------- doPost — check-in submission ----------        

 function doPost(e) {                                         
    try {
      const p = e.parameter;

      // Guest hub captures (food orders, bike rentals)
      if (p.action === 'order')  return recordOrder_(p);
      if (p.action === 'rental') return recordRental_(p);
      if (p.action === 'addon')  return recordAddon_(p);

      // Save ID file to Drive                                                                                                                                                                                      
      let idFileUrl = '';
      if (p.id_file && p.id_filename && p.id_mimetype) {                                                                                                                                                             
        try {                                                  
          const folder = DriveApp.getFolderById(ID_FOLDER_ID);
          const safeName = (p.guest_name || 'guest').replace(/[^a-zA-Z0-9]+/g, '_');                                                                                                                                 
          const ts = Utilities.formatDate(new Date(), TZ, 'yyyyMMdd_HHmmss');
          const fname = `${safeName}_${p.id_type || 'ID'}_${ts}_${p.id_filename}`;                                                                                                                                   
          const blob = Utilities.newBlob(Utilities.base64Decode(p.id_file), p.id_mimetype, fname);                                                                                                                   
          idFileUrl = folder.createFile(blob).getUrl();                                                                                                                                                              
        } catch (err) {                                                                                                                                                                                              
          idFileUrl = 'UPLOAD FAILED: ' + err.message;         
        }                                                                                                                                                                                                            
      }                                                        
                                                                                                                                                                                                                     
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName('Check-ins');                                                                                                                                                                    
      if (!sheet) {                                            
        sheet = ss.insertSheet('Check-ins');
        sheet.appendRow([                                                                                                                                                                                            
          'Submitted At', 'Mode', 'Booking ID', 'Name', 'Phone', 'Email',
          'Check-In', 'Check-Out', 'Room', 'Source', 'Num Guests',                                                                                                                                                   
          'ID Type', 'ID File URL', 'Arrival Time', 'Special Requests'
        ]);                                                                                                                                                                                                          
      }                                                        
                                                                                                                                                                                                                     
      let booking = {};                                        
      if (p.mode === 'lookup' && p.booking_id) {
        const m = p.booking_id.match(/^(\d+)-(\d{4}-\d{2}-\d{2})$/);
        if (m) booking = findBooking_(m[1], m[2]) || {};                                                                                                                                                             
      }
                                                                                                                                                                                                                     
      const name     = p.guest_name    || booking.name     || '';                                                                                                                                                    
      const phone    = p.phone         || booking.phone    || '';
      const email    = p.email         || p.email_lookup   || '';                                                                                                                                                    
      const checkin  = p.checkin_date  || booking.checkin  || '';
      const checkout = p.checkout_date || booking.checkout || '';                                                                                                                                                    
      const room     = p.room          || booking.room     || '';
      const source   = p.source        || booking.platform || '';                                                                                                                                                    
                                                               
      sheet.appendRow([                                                                                                                                                                                              
        new Date(),                                            
        p.mode || 'walkin',
        p.booking_id || '',
        name, phone, email,
        checkin, checkout, room, source,                                                                                                                                                                             
        p.num_guests || '',
        p.id_type || '',                                                                                                                                                                                             
        idFileUrl,                                             
        p.arrival_time || '',
        p.special_requests || ''
      ]);                                                                                                                                                                                                            
   
      const waMsg = `Hi ${name}, welcome to Nivaa Stays! Your room is ready.\n\nDigital welcome kit (Wi-Fi, house rules, food menu, local guide):\n${SITE_BASE}/welcome.html\n\nFor anything during your stay, this  
  number works 24/7.\nHave a peaceful stay! 🙏`;               
      const waLink = `https://wa.me/${digits_(phone)}?text=${encodeURIComponent(waMsg)}`;                                                                                                                            
                                                               
      GmailApp.sendEmail(                                                                                                                                                                                            
        HOST_EMAIL,
        `${name || 'Guest'} self-checked-in (${p.mode || 'walkin'})`,                                                                                                                                                
        `Phone: ${phone}\nID: ${p.id_type || '—'}\nID File: ${idFileUrl}\nGuests: ${p.num_guests || '—'}\nArrival: ${p.arrival_time || '—'}\nSpecial requests: ${p.special_requests || '—'}\n\nSend welcome
  WhatsApp:\n${waLink}`                                                                                                                                                                                              
      );
                                                                                                                                                                                                                     
      return jsonOut_({ success: true });                                                                                                                                                                            
    } catch (err) {
      return jsonOut_({ success: false, error: String(err && err.message || err) });                                                                                                                                 
    }                                                          
  }
                                                                                                                                                          
                                                                                                                                                             
  // ---------- dailyDigest — time-triggered ----------                                                                                                      
                                                               
  function dailyDigest() {                                                                                                                                   
    const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    const yesterday = Utilities.formatDate(new Date(Date.now() - 86400000), TZ, 'yyyy-MM-dd');                                                               
                                                                                                                                                             
    const checkins = [], checkouts = [], reviews = [];
                                                                                                                                                             
    for (const sh of getBookingTabs_()) {                                                                                                                    
      const data = sh.getDataRange().getValues();
      const headers = data[0].map(c => String(c).trim());                                                                                                    
      const nameIdx = headers.indexOf('Name');                 
      for (let i = 1; i < data.length; i++) {                                                                                                                
        const row = data[i];
        if (!row[nameIdx]) continue;                                                                                                                         
        const b = rowToBooking_(headers, row);                                                                                                               
        if (!b.phone) continue;
        if (b.checkin === today) checkins.push(b);                                                                                                           
        if (b.checkout === today) checkouts.push(b);           
        if (b.checkout === yesterday) reviews.push(b);                                                                                                       
      }
    }                                                                                                                                                        
                                                               
    if (!checkins.length && !checkouts.length && !reviews.length) return;                                                                                    
  
    const wa = (phone, msg) => `https://wa.me/${digits_(phone)}?text=${encodeURIComponent(msg)}`;                                                            
                                                               
    const ciHtml = checkins.map(b => {                                                                                                                       
      const link = `${SITE_BASE}/checkin.html?id=${b.phone}-${b.checkin}`;
      const msg = `Hi ${b.name}, welcome to Nivaa Stays! Please complete a quick self check-in (takes 2 min): ${link}`;                                      
      return `<li><b>${b.name}</b> · ${b.phone} · ${b.platform || b.onlineOffline} · Room ${b.room}<br><a href="${wa(b.phone, msg)}">→ Send check-in         
  link</a></li>`;                                                                                                                                            
    }).join('');                                                                                                                                             
                                                                                                                                                             
    const coHtml = checkouts.map(b => {                        
      const msg = `Hi ${b.name}, hope you had a peaceful stay at Nivaa Stays. Checkout is by 11 AM. Safe travels — we'd love to host you again. 🙏`;
      return `<li><b>${b.name}</b> · ${b.phone} · Room ${b.room}<br><a href="${wa(b.phone, msg)}">→ Send checkout message</a></li>`;                         
    }).join('');                                                                                                                                             
                                                                                                                                                             
    const rvHtml = reviews.map(b => {                                                                                                                        
      const msg = `Hi ${b.name}, thank you again for staying with us at Nivaa Stays. If you had a good time, a quick Google review would mean the world:
  ${REVIEW_URL}`;                                                                                                                                            
      return `<li><b>${b.name}</b> · ${b.phone}<br><a href="${wa(b.phone, msg)}">→ Send review nudge</a></li>`;
    }).join('');                                                                                                                                             
                                                               
    const body = `                                                                                                                                           
      <div style="font-family:system-ui,Arial,sans-serif; max-width:640px">
        <h2 style="color:#0E3B35; margin-bottom:0.2em">Nivaa Stays — ${today}</h2>                                                                           
        <div style="color:#888; font-size:13px; margin-bottom:1.5em">${checkins.length} check-in · ${checkouts.length} checkout · ${reviews.length} review   
  nudge</div>                                                                                                                                                
        <h3 style="color:#0E3B35">Today's check-ins (${checkins.length})</h3><ul>${ciHtml || '<li>None</li>'}</ul>                                           
        <h3 style="color:#0E3B35">Today's checkouts (${checkouts.length})</h3><ul>${coHtml || '<li>None</li>'}</ul>                                          
        <h3 style="color:#0E3B35">Review nudges — checked out yesterday (${reviews.length})</h3><ul>${rvHtml || '<li>None</li>'}</ul>                        
        <p style="color:#888; font-size:12px; margin-top:2em">Sent automatically by Apps Script daily ~9:30 AM IST.</p>                                      
      </div>                                                                                                                                                 
    `;                                                                                                                                                       
                                                                                                                                                             
    GmailApp.sendEmail(                                        
      HOST_EMAIL,
      `Nivaa Stays — ${today} — ${checkins.length} in · ${checkouts.length} out · ${reviews.length} review`,
      'View in HTML',
      { htmlBody: body }
    );
  }

  // ---------- guest hub: orders / rentals / addons ----------
  // NOTE: BIKE_RATES here mirrors site/pricing.json → bikeRental.
  // Update both when rates change.
  const BIKE_RATES = { vespa: 600, ninja: 1500 };
  const BIKE_NAMES = { vespa: 'Yellow Vespa', ninja: 'Kawasaki Ninja' };

  const ORDERS_HEADERS  = ['Submitted At', 'Booking ID', 'Name', 'Items', 'Item Count', 'Subtotal', 'Status', 'Notes'];
  const RENTALS_HEADERS = ['Submitted At', 'Booking ID', 'Name', 'Type', 'Start Date', 'End Date', 'Days', 'Rate (₹/day)', 'Subtotal', 'Status', 'Notes'];
  const ADDONS_HEADERS  = ['Submitted At', 'Booking ID', 'Name', 'Type', 'Description', 'Amount', 'Notes'];

  function parseBookingId_(s) {
    const m = String(s || '').match(/^(\d+)-(\d{4}-\d{2}-\d{2})$/);
    return m ? { phone: m[1], ci: m[2] } : null;
  }

  function getOrCreateSheet_(name, headers) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      sh.appendRow(headers);
      sh.setFrozenRows(1);
    }
    return sh;
  }

  function rowsForBooking_(sheetName, bookingId) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return [];
    const data = sh.getDataRange().getValues();
    if (data.length < 2) return [];
    const headers = data[0].map(c => String(c).trim());
    const idIdx = headers.indexOf('Booking ID');
    if (idIdx === -1) return [];
    const out = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idIdx]).trim() === bookingId) {
        const obj = {};
        headers.forEach((h, j) => { obj[h] = data[i][j]; });
        out.push(obj);
      }
    }
    return out;
  }

  function tryParseJson_(s) {
    if (!s) return null;
    try { return JSON.parse(String(s)); } catch (e) { return null; }
  }

  function isoOrStr_(d) {
    if (d instanceof Date) return d.toISOString();
    return String(d || '');
  }

  // Google Sheets treats strings starting with =, +, -, or @ as formulas
  // and errors out (#NAME, #REF, etc). Prefix with an apostrophe to force
  // text mode — the apostrophe itself doesn't display in the cell.
  function safeForSheet_(s) {
    const str = String(s == null ? '' : s);
    return /^[=+\-@]/.test(str) ? "'" + str : str;
  }

  function hubData_(bookingId) {
    const parsed = parseBookingId_(bookingId);
    if (!parsed) return jsonOut_({ found: false, error: 'invalid booking id' });

    const booking = findBooking_(parsed.phone, parsed.ci);
    if (!booking) return jsonOut_({ found: false });

    const orders = rowsForBooking_('Orders', bookingId).map(r => ({
      submittedAt: isoOrStr_(r['Submitted At']),
      items: tryParseJson_(r['Items']) || [],
      itemCount: Number(r['Item Count']) || 0,
      subtotal: Number(r['Subtotal']) || 0,
      status: r['Status'] || 'Pending',
      notes: r['Notes'] || ''
    }));

    const rentals = rowsForBooking_('Bike Rentals', bookingId).map(r => ({
      submittedAt: isoOrStr_(r['Submitted At']),
      type: r['Type'] || '',
      startDate: ymd_(r['Start Date']),
      endDate: ymd_(r['End Date']),
      days: Number(r['Days']) || 0,
      rate: Number(r['Rate (₹/day)']) || 0,
      subtotal: Number(r['Subtotal']) || 0,
      status: r['Status'] || 'Requested',
      notes: r['Notes'] || ''
    }));

    const addons = rowsForBooking_('Add-ons', bookingId).map(r => ({
      submittedAt: isoOrStr_(r['Submitted At']),
      type: r['Type'] || '',
      description: r['Description'] || '',
      amount: Number(r['Amount']) || 0,
      notes: r['Notes'] || ''
    }));

    const stayBase    = Number(booking.amount) || 0;
    const advRaw      = String(booking.advance || booking.paid || '').replace(/[^0-9.]/g, '');
    const advancePaid = Number(advRaw) || 0;
    const foodTotal   = orders.reduce((a, o) => a + o.subtotal, 0);
    const rentalTotal = rentals.reduce((a, r) => a + r.subtotal, 0);
    const addonTotal  = addons.reduce((a, x) => a + x.amount, 0);
    const subtotal    = stayBase + foodTotal + rentalTotal + addonTotal;
    const grandTotal  = subtotal;
    const balance     = Math.max(0, grandTotal - advancePaid);

    return jsonOut_({
      found: true,
      booking,
      orders,
      rentals,
      addons,
      totals: {
        stayBase, foodTotal, rentalTotal, addonTotal,
        subtotal, grandTotal, advancePaid, balance
      }
    });
  }

  function recordOrder_(p) {
    const parsed = parseBookingId_(p.bookingId);
    if (!parsed) return jsonOut_({ success: false, error: 'invalid bookingId' });

    let items;
    try { items = JSON.parse(p.items || '[]'); }
    catch (e) { return jsonOut_({ success: false, error: 'invalid items JSON' }); }
    if (!Array.isArray(items) || !items.length) {
      return jsonOut_({ success: false, error: 'items empty' });
    }

    const itemCount = items.reduce((a, it) => a + (Number(it.qty) || 0), 0);
    const subtotal  = items.reduce((a, it) => a + (Number(it.qty) || 0) * (Number(it.price) || 0), 0);

    // Look up the booking to enrich the row with the guest's name
    const booking = findBooking_(parsed.phone, parsed.ci);
    const guestName = booking ? booking.name : '';

    const sheet = getOrCreateSheet_('Orders', ORDERS_HEADERS);
    sheet.appendRow([
      new Date(),
      p.bookingId,
      safeForSheet_(guestName),
      JSON.stringify(items),
      itemCount,
      subtotal,
      'Pending',
      safeForSheet_(p.notes || '')
    ]);

    try {
      GmailApp.sendEmail(
        HOST_EMAIL,
        `Nivaa Stays — Food order from ${p.bookingId}`,
        `New food order:\n${items.map(it => `${it.qty}× ${it.name} (₹${it.price})`).join('\n')}\nTotal: ₹${subtotal}`
      );
    } catch (e) { /* email failures shouldn't break the capture */ }

    return jsonOut_({ success: true, subtotal: subtotal, itemCount: itemCount });
  }

  // Returns bookings grouped by relation to the given date (defaults to today):
  //   arriving — check-in == date
  //   inhouse  — check-in <  date  AND  check-out >  date
  //   leaving  — check-out == date
  //   upcoming — check-in in (date, date+7]
  function activeBookings_(dateStr) {
    const today = (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr))
      ? dateStr
      : Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
    const upcomingHorizon = (function () {
      const [y, m, d] = today.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      dt.setDate(dt.getDate() + 7);
      return Utilities.formatDate(dt, TZ, 'yyyy-MM-dd');
    })();

    const buckets = { arriving: [], inhouse: [], leaving: [], upcoming: [] };

    for (const sh of getBookingTabs_()) {
      const data = sh.getDataRange().getValues();
      const headers = data[0].map(c => String(c).trim());
      const nameIdx = headers.indexOf('Name');
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[nameIdx]) continue;
        const b = rowToBooking_(headers, row);
        if (!b.phone || !b.checkin) continue;

        const enriched = Object.assign({}, b, {
          bookingId: `${b.phone}-${b.checkin}`
        });

        if (b.checkin === today) buckets.arriving.push(enriched);
        else if (b.checkout === today) buckets.leaving.push(enriched);
        else if (b.checkin < today && b.checkout > today) buckets.inhouse.push(enriched);
        else if (b.checkin > today && b.checkin <= upcomingHorizon) buckets.upcoming.push(enriched);
      }
    }

    // Sort each bucket by check-in date for stable display
    for (const key of Object.keys(buckets)) {
      buckets[key].sort((a, b) => (a.checkin < b.checkin ? -1 : a.checkin > b.checkin ? 1 : 0));
    }

    return jsonOut_(Object.assign({ date: today, horizon: upcomingHorizon }, buckets));
  }

  // ---------- doGet?analytics=1 — monthly booking analytics (room bookings only) ----------
  // Robust date parse — real Date cells AND text ("1-Jun-2026" / "28/06/2026" / "2026-06-28").
  // Top-level so analyticsData_ AND the ?tabsdebug probe share one implementation.
  const MON_ = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
  function parseDate_(v) {
    if (Object.prototype.toString.call(v) === '[object Date]') return isNaN(v.getTime()) ? null : v;
    const s = String(v == null ? '' : v).trim(); if (!s) return null;
    let m;
    if ((m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/))) return new Date(+m[1], +m[2] - 1, +m[3]);
    if ((m = s.match(/^(\d{1,2})[\-\/ ]([A-Za-z]{3,})[\-\/ ](\d{4})/)) && MON_[m[2].slice(0, 3).toLowerCase()] != null)
      return new Date(+m[3], MON_[m[2].slice(0, 3).toLowerCase()], +m[1]);
    if ((m = s.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})/))) return new Date(+m[3], +m[2] - 1, +m[1]);
    const d = new Date(s); return isNaN(d.getTime()) ? null : d;
  }

  function analyticsData_() {
    const ROOMS = 2;
    const num_ = v => { const n = parseFloat(String(v == null ? '' : v).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; };
    const monthKey_ = (y, m) => y + '-' + ('0' + m).slice(-2);
    const daysInMonth_ = (y, m) => new Date(y, m, 0).getDate();
    // parseDate_ + MON_ are defined at top level (shared with the ?tabsdebug probe).

    const now = new Date();
    const curY = now.getFullYear(), curM = now.getMonth() + 1, curKey = monthKey_(curY, curM);
    const daysInCur = daysInMonth_(curY, curM);
    const curDayRooms = {};   // 'YYYY-MM-DD' -> rooms booked that night (current month)
    const curWeeks = [];      // 7-day chunks of the current month
    for (let wi = 0; wi <= Math.floor((daysInCur - 1) / 7); wi++) curWeeks.push({ nights: 0, revenue: 0, bookings: 0 });

    const M = {};            // 'YYYY-MM' -> { bookings, nights, revenue }
    const channels = {};     // platform -> { bookings, revenue, nights }
    const roomSplit = {};    // room -> nights
    const guestBookings = {}; // phone -> count (repeat detection)
    let weekdayNights = 0, weekendNights = 0;
    let totalAmount = 0, totalAdvance = 0, totalNights = 0, totalBookings = 0, guestsSum = 0, guestsCount = 0;
    const bump_ = (key, field, val) => { (M[key] = M[key] || { bookings: 0, nights: 0, revenue: 0 })[field] += val; };

    for (const sh of getBookingTabs_()) {
      const data = sh.getDataRange().getValues();
      const headers = data[0].map(c => String(c).trim());
      const nameIdx = headers.indexOf('Name'), ciIdx = headers.indexOf('Check-In'), coIdx = headers.indexOf('Check-Out');
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[nameIdx]) continue;
        const b = rowToBooking_(headers, row);
        const ciDate = parseDate_(row[ciIdx]), coDate = parseDate_(row[coIdx]);
        if (!b.phone || !ciDate || !coDate) continue;
        const nights = Math.round((coDate.getTime() - ciDate.getTime()) / 86400000);
        if (!(nights >= 1 && nights <= 60)) continue;            // also drops NaN / garbled rows
        const amount = num_(b.amount), advance = num_(b.advance) || num_(b.paid), perNight = amount / nights;

        bump_(monthKey_(ciDate.getFullYear(), ciDate.getMonth() + 1), 'bookings', 1);   // booking -> its check-in month
        if (ciDate.getFullYear() === curY && (ciDate.getMonth() + 1) === curM) {
          const cwi = Math.floor((ciDate.getDate() - 1) / 7); if (curWeeks[cwi]) curWeeks[cwi].bookings++;
        }
        for (let n = 0; n < nights; n++) {                       // nights + revenue split across the months they fall in
          const d = new Date(ciDate.getTime() + n * 86400000);
          const key = monthKey_(d.getFullYear(), d.getMonth() + 1);
          bump_(key, 'nights', 1);
          bump_(key, 'revenue', perNight);
          const dow = d.getDay();                                // 0 Sun .. 6 Sat; weekend = Fri/Sat/Sun
          if (dow === 5 || dow === 6 || dow === 0) weekendNights++; else weekdayNights++;
          if (key === curKey) {                                  // current-month day grid + weekly split
            const ds = Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
            curDayRooms[ds] = (curDayRooms[ds] || 0) + 1;
            const wi = Math.floor((d.getDate() - 1) / 7);
            if (curWeeks[wi]) { curWeeks[wi].nights++; curWeeks[wi].revenue += perNight; }
          }
        }

        const plat = (String(b.platform || b.onlineOffline || 'Direct').trim()) || 'Direct';
        const c = channels[plat] = channels[plat] || { bookings: 0, revenue: 0, nights: 0 };
        c.bookings++; c.revenue += amount; c.nights += nights;
        const rm = b.room || '—'; roomSplit[rm] = (roomSplit[rm] || 0) + nights;
        guestBookings[b.phone] = (guestBookings[b.phone] || 0) + 1;
        totalAmount += amount; totalAdvance += advance; totalNights += nights; totalBookings++;
        const g = parseInt(b.num_guests); if (g > 0) { guestsSum += g; guestsCount++; }
      }
    }

    // continuous month series: earliest data month -> current month (gaps filled with zeros)
    const keys = Object.keys(M).sort();
    const minKey = monthKey_(curY - 3, curM);                              // cap history at ~3y so a stray date can't explode the series
    let startKey = keys.length ? keys[0] : curKey;
    if (startKey < minKey) startKey = minKey;
    if (startKey > curKey) startKey = curKey;
    const months = [];
    let sy = +startKey.split('-')[0], sm = +startKey.split('-')[1], guard = 0;
    while (guard++ < 240) {
      const key = monthKey_(sy, sm);
      const rec = M[key] || { bookings: 0, nights: 0, revenue: 0 };
      const avail = ROOMS * daysInMonth_(sy, sm);
      months.push({
        month: key, bookings: rec.bookings, nights: rec.nights, revenue: Math.round(rec.revenue),
        availNights: avail,
        occupancy: avail ? Math.round(rec.nights / avail * 1000) / 10 : 0,
        adr: rec.nights ? Math.round(rec.revenue / rec.nights) : 0,
        revpar: avail ? Math.round(rec.revenue / avail) : 0
      });
      if (key === curKey) break;
      sm++; if (sm > 12) { sm = 1; sy++; }
    }

    const uniqueGuests = Object.keys(guestBookings).length;
    const returning = Object.keys(guestBookings).filter(p => guestBookings[p] > 1).length;

    // current running month — day grid (open slots) + weekly split
    const curDays = [];
    for (let day = 1; day <= daysInCur; day++) {
      const dt = new Date(curY, curM - 1, day);
      const ds = Utilities.formatDate(dt, TZ, 'yyyy-MM-dd');
      const booked = Math.min(ROOMS, curDayRooms[ds] || 0);
      curDays.push({ date: ds, day: day, dow: dt.getDay(), booked: booked, free: ROOMS - booked });
    }
    const curWeeksOut = curWeeks.map((w, i) => {
      const from = i * 7 + 1, to = Math.min(daysInCur, from + 6);
      return { from: from, to: to, nights: w.nights, revenue: Math.round(w.revenue), bookings: w.bookings, availNights: ROOMS * (to - from + 1) };
    });
    const curRec = M[curKey] || { bookings: 0, nights: 0, revenue: 0 };
    const current = {
      month: curKey, today: Utilities.formatDate(now, TZ, 'yyyy-MM-dd'),
      dayOfMonth: now.getDate(), daysInMonth: daysInCur, daysRemaining: daysInCur - now.getDate(),
      bookings: curRec.bookings, nights: curRec.nights, revenue: Math.round(curRec.revenue),
      availNights: ROOMS * daysInCur, days: curDays, weeks: curWeeksOut
    };

    return jsonOut_({
      generated: Utilities.formatDate(now, TZ, 'yyyy-MM-dd'),
      rooms: ROOMS,
      revenueTarget: 100000,
      current: current,
      months: months,
      channels: Object.keys(channels).map(k => Object.assign({ name: k }, channels[k])).sort((a, b) => b.revenue - a.revenue),
      roomSplit: roomSplit,
      weekday: { weekday: weekdayNights, weekend: weekendNights },
      payments: { revenue: Math.round(totalAmount), collected: Math.round(totalAdvance), pending: Math.round(Math.max(0, totalAmount - totalAdvance)) },
      repeat: { guests: uniqueGuests, returning: returning, rate: uniqueGuests ? Math.round(returning / uniqueGuests * 1000) / 10 : 0 },
      totals: {
        bookings: totalBookings, nights: totalNights, revenue: Math.round(totalAmount),
        alos: totalBookings ? Math.round(totalNights / totalBookings * 10) / 10 : 0,
        avgGuests: guestsCount ? Math.round(guestsSum / guestsCount * 10) / 10 : 0
      }
    });
  }

  // ?tabsdebug=1 — diagnostics for "missing months": lists every sheet, whether it's
  // detected as a booking tab, its header row, and how many Check-In cells parse.
  // Read-only and safe to leave deployed.
  function tabsDebug_() {
    const norm = s => String(s == null ? '' : s).toLowerCase().replace(/[^a-z0-9]/g, '');
    const reqNorm = REQ_HEADERS.map(norm);
    const ciAliases = ['Check-In', 'Check In', 'Checkin', 'Arrival', 'From', 'Date'].map(norm);
    const sheets = SpreadsheetApp.getActiveSpreadsheet().getSheets().map(sh => {
      const lastCol = sh.getLastColumn(), lastRow = sh.getLastRow();
      if (lastCol < 1 || lastRow < 1) return { name: sh.getName(), lastRow: lastRow, lastCol: lastCol, header: [], detected: false, rows: 0, parsed: 0, skipped: 0, samples: [] };
      const header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(c => String(c).trim());
      const hNorm = header.map(norm);
      const detected = reqNorm.every(r => hNorm.indexOf(r) >= 0);
      let ciIdx = header.indexOf('Check-In');
      if (ciIdx < 0) ciIdx = hNorm.findIndex(h => ciAliases.indexOf(h) >= 0);
      let parsed = 0, skipped = 0; const samples = [];
      if (ciIdx >= 0 && lastRow > 1) {
        const col = sh.getRange(2, ciIdx + 1, lastRow - 1, 1).getValues();
        for (let i = 0; i < col.length; i++) {
          const v = col[i][0];
          if (v === '' || v == null) continue;
          if (parseDate_(v)) parsed++; else skipped++;
          if (samples.length < 5) samples.push({ raw: String(v).slice(0, 30), type: Object.prototype.toString.call(v) });
        }
      }
      return { name: sh.getName(), lastRow: lastRow, lastCol: lastCol, header: header, detected: detected, ciHeader: ciIdx >= 0 ? header[ciIdx] : null, rows: lastRow - 1, parsed: parsed, skipped: skipped, samples: samples };
    });
    return jsonOut_({ requiredHeaders: REQ_HEADERS, detectedTabs: getBookingTabs_().map(s => s.getName()), sheets: sheets });
  }

  function recordRental_(p) {
    const parsed = parseBookingId_(p.bookingId);
    if (!parsed) return jsonOut_({ success: false, error: 'invalid bookingId' });

    const type = String(p.type || '').toLowerCase();
    if (!BIKE_RATES[type]) return jsonOut_({ success: false, error: 'unknown rental type' });

    const startDate = ymd_(p.startDate);
    const endDate   = ymd_(p.endDate);
    if (!startDate || !endDate) return jsonOut_({ success: false, error: 'invalid dates' });

    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    const days = Math.max(1, Math.round(ms / 86400000) + 1);  // inclusive
    const rate = BIKE_RATES[type];
    const subtotal = days * rate;

    const booking = findBooking_(parsed.phone, parsed.ci);
    const guestName = booking ? booking.name : '';

    const sheet = getOrCreateSheet_('Bike Rentals', RENTALS_HEADERS);
    sheet.appendRow([
      new Date(),
      p.bookingId,
      safeForSheet_(guestName),
      BIKE_NAMES[type],
      startDate,
      endDate,
      days,
      rate,
      subtotal,
      'Requested',
      safeForSheet_(p.notes || '')
    ]);

    try {
      GmailApp.sendEmail(
        HOST_EMAIL,
        `Nivaa Stays — Bike rental request from ${p.bookingId}`,
        `${BIKE_NAMES[type]}\n${startDate} → ${endDate} (${days} days × ₹${rate} = ₹${subtotal})\nNotes: ${p.notes || '—'}`
      );
    } catch (e) { /* same as above */ }

    return jsonOut_({ success: true, days: days, rate: rate, subtotal: subtotal });
  }

  function recordAddon_(p) {
    const parsed = parseBookingId_(p.bookingId);
    if (!parsed) return jsonOut_({ success: false, error: 'invalid bookingId' });

    const type = String(p.type || '').trim();
    if (!type) return jsonOut_({ success: false, error: 'type required' });
    const amount = Number(p.amount) || 0;
    if (amount < 0) return jsonOut_({ success: false, error: 'invalid amount' });
    const description = String(p.description || '').trim();

    const booking = findBooking_(parsed.phone, parsed.ci);
    const guestName = booking ? booking.name : '';

    const sheet = getOrCreateSheet_('Add-ons', ADDONS_HEADERS);
    sheet.appendRow([
      new Date(),
      p.bookingId,
      safeForSheet_(guestName),
      safeForSheet_(type),
      safeForSheet_(description),
      amount,
      safeForSheet_(p.notes || '')
    ]);

    try {
      GmailApp.sendEmail(
        HOST_EMAIL,
        `Nivaa Stays — ${type} add-on for ${p.bookingId}`,
        `Guest: ${guestName}\nType: ${type}\nDescription: ${description || '—'}\nAmount: ₹${amount}\nNotes: ${p.notes || '—'}`
      );
    } catch (e) { /* email failures shouldn't break capture */ }

    return jsonOut_({ success: true, amount: amount });
  }

  // ---------- triggers ----------
  // Run installDailyTrigger() ONCE from the Apps Script editor to schedule
  // dailyDigest() every morning between 9:00–10:00 AM IST. Idempotent —
  // safe to re-run; existing dailyDigest triggers are removed first.
  function installDailyTrigger() {
    const HOUR = 9; // 9 AM IST window (Apps Script picks a minute inside the hour)
    const FN   = 'dailyDigest';

    // Apps Script time-driven triggers run in the script's project timezone.
    // Make sure the project timezone is set to Asia/Kolkata:
    //   File → Project Properties → Info → Time zone (or appsscript.json: "timeZone": "Asia/Kolkata")

    ScriptApp.getProjectTriggers().forEach(t => {
      if (t.getHandlerFunction() === FN) ScriptApp.deleteTrigger(t);
    });

    ScriptApp.newTrigger(FN)
      .timeBased()
      .atHour(HOUR)
      .everyDays(1)
      .inTimezone(TZ)
      .create();

    Logger.log(`Installed daily trigger for ${FN} at ${HOUR}:00 ${TZ}`);
  }

  function listTriggers() {
    const triggers = ScriptApp.getProjectTriggers();
    if (!triggers.length) { Logger.log('No triggers.'); return; }
    triggers.forEach(t => Logger.log(`${t.getHandlerFunction()} · ${t.getEventType()} · ${t.getTriggerSource()}`));
  }

