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
      phone: digits_(row[idx('Mobile')]),
      checkin: ymd_(row[idx('Check-In')]),                                                                                                                   
      checkout: ymd_(row[idx('Check-Out')]),
      room: row[idx('Room Number')] != null ? String(row[idx('Room Number')]) : '',                                                                          
      platform: row[idx('Platform')] || '',                                                                                                                  
      onlineOffline: row[idx('Online/Offline')] || '',
      num_guests: row[idx('Number of guests')] || '',                                                                                                        
      amount: row[idx('Amount')] || '',                        
      paid: row[idx('Paid To Manju')] || ''                                                                                                                  
    };                                                                                                                                                       
  }
                                                                                                                                                             
  function findBooking_(phoneDigits, checkinYmd) {             
    for (const sh of getBookingTabs_()) {
      const data = sh.getDataRange().getValues();
      const headers = data[0].map(c => String(c).trim());                                                                                                    
      const phIdx = headers.indexOf('Mobile');
      const ciIdx = headers.indexOf('Check-In');                                                                                                             
      for (let i = 1; i < data.length; i++) {                  
        const row = data[i];                                                                                                                                 
        if (digits_(row[phIdx]) === phoneDigits && ymd_(row[ciIdx]) === checkinYmd) {
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
    const lookup = (e && e.parameter && e.parameter.lookup) || '';
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

