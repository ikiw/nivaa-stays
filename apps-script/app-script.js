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

