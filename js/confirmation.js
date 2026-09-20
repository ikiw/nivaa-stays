// Nivaa Stays — admin booking-confirmation composer.
// Opened from the admin dashboard "Confirmation" button (confirmation.html).
// Renders a live preview of the branded confirmation email and sends it to the
// guest through the Apps Script backend, which delivers it from nivaastays@gmail.com.
//
// NOTE: buildEmailHtml() below is the *browser preview* copy of the email.
// Keep it visually in sync with buildConfirmationHtml_() in
// apps-script/app-script.js — that server-side copy is the one actually sent
// (built from the authoritative booking row, so amounts can't be spoofed).

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyxkdwbDe8eSoYuapo2xp6XRYmiosBWfACvHVp9D6hOGHnN0c39YHGA-ecZFLhFDrFb/exec';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function qp() {
  return new URLSearchParams(location.search);
}

function isAdmin() {
  return qp().get('mode') === 'admin' || !!(window.NivaaAuth && window.NivaaAuth.isAdmin());
}

function fmtLong(ymd) {
  if (!ymd) return '';
  const [y, m, d] = String(ymd).split('-').map(Number);
  if (!y) return String(ymd);
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d).getDay()];
  const mon = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1];
  return `${dow}, ${d} ${mon} ${y}`;
}

function nightsBetween(ci, co) {
  if (!ci || !co) return 0;
  const a = String(ci).split('-').map(Number);
  const c = String(co).split('-').map(Number);
  if (a.length !== 3 || c.length !== 3) return 0;
  const d1 = new Date(a[0], a[1] - 1, a[2]);
  const d2 = new Date(c[0], c[1] - 1, c[2]);
  return Math.max(0, Math.round((d2 - d1) / 86400000));
}

function inr(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

function studiosForRoom(room) {
  const value = String(room || '').trim().toLowerCase();
  if (value.replace(/[^a-z0-9]/g, '') === 'fullhouse' || value === 'both') return 2;
  return /(?:room(?:s)?\s*)?1\s*(?:&|\+|,|\/|and)\s*2/.test(value) ? 2 : 1;
}

function readBooking() {
  const p = qp();
  return {
    bookingId: p.get('bid') || '',
    name: p.get('name') || '',
    checkin: p.get('ci') || '',
    checkout: p.get('co') || '',
    room: p.get('room') || '',
    bathtub: p.get('bathtub') === '1',
    guests: p.get('guests') || '',
    total: parseInt(p.get('amt') || '0', 10) || 0,
    advance: parseInt(p.get('adv') || '0', 10) || 0,
    email: p.get('email') || '',
    platform: p.get('platform') || ''
  };
}

// Full branded email as a standalone HTML document (rendered in a sandboxed
// iframe for the preview). Mirror of buildConfirmationHtml_() in app-script.js.
function buildEmailHtml(b) {
  const name = escapeHtml(b.name || 'Guest');
  const bookingId = escapeHtml(b.bookingId);
  const room = escapeHtml(b.room || '—');
  const bathtubLabel = b.bathtub
    ? (studiosForRoom(b.room) === 2 ? 'With 2 bathtubs' : 'With bathtub')
    : 'Without bathtub';
  const guests = escapeHtml(b.guests || '—');
  const ciPretty = escapeHtml(fmtLong(b.checkin));
  const coPretty = escapeHtml(fmtLong(b.checkout));
  const nights = nightsBetween(b.checkin, b.checkout);
  const balance = Math.max(0, (b.total || 0) - (b.advance || 0));
  const welcomeUrl = 'https://nivaastays.com/welcome.html?id=' + encodeURIComponent(b.bookingId);

  const paymentBlock = b.total > 0 ? `
          <tr>
            <td style="padding:16px 32px 4px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EAE3D2; border-radius:10px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <div style="font-family:Arial,Helvetica,sans-serif; color:#C9A227; font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:bold; margin-bottom:10px;">Payment</div>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif; font-size:14px;">
                      <tr><td style="padding:5px 0; color:#5B6B68;">Total</td><td style="padding:5px 0; color:#14201E; text-align:right;">₹${inr(b.total)}</td></tr>
                      <tr><td style="padding:5px 0; color:#5B6B68;">Advance paid</td><td style="padding:5px 0; color:#14201E; text-align:right;">− ₹${inr(b.advance)}</td></tr>
                      <tr><td colspan="2" style="border-top:1px solid #EAE3D2; font-size:0; line-height:0;">&nbsp;</td></tr>
                      <tr><td style="padding:8px 0 0 0; color:#0E3B35; font-weight:bold;">Balance due at check-in</td><td style="padding:8px 0 0 0; color:#0E3B35; font-weight:bold; text-align:right; font-size:16px;">₹${inr(balance)}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : '';

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#FAF6EC;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EC; padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px; max-width:600px; background:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #EAE3D2;">

        <tr>
          <td style="background:#0E3B35; padding:26px 32px;">
            <img src="https://nivaastays.com/assets/logo.png" width="52" height="52" alt="Nivaa Stays" style="display:inline-block; vertical-align:middle; border-radius:50%; background:#082623;">
            <span style="display:inline-block; vertical-align:middle; margin-left:12px;">
              <span style="display:block; font-family:'Georgia','Times New Roman',serif; color:#ffffff; font-size:20px; line-height:1.1;">Nivaa Stays</span>
              <span style="display:block; font-family:Arial,Helvetica,sans-serif; color:#E6C35A; font-size:10px; letter-spacing:3px; text-transform:uppercase; margin-top:4px;">Le Affordable Luxury</span>
            </span>
          </td>
        </tr>
        <tr><td style="height:4px; background:#C9A227; line-height:4px; font-size:0;">&nbsp;</td></tr>

        <tr>
          <td style="padding:34px 32px 8px 32px;">
            <div style="font-family:Arial,Helvetica,sans-serif; color:#C9A227; font-size:12px; letter-spacing:2px; text-transform:uppercase; font-weight:bold;">You're all set</div>
            <div style="font-family:'Georgia','Times New Roman',serif; color:#14201E; font-size:26px; line-height:1.25; margin-top:8px;">Pack your bags! &#x1F9F3; Your stay at Nivaa Stays is confirmed</div>
          </td>
        </tr>

        <tr>
          <td style="padding:12px 32px 4px 32px;">
            <p style="margin:0; font-family:Arial,Helvetica,sans-serif; color:#14201E; font-size:15px; line-height:1.65;">Dear ${name},</p>
            <p style="margin:14px 0 0 0; font-family:Arial,Helvetica,sans-serif; color:#5B6B68; font-size:15px; line-height:1.65;">Thank you for booking with Nivaa Stays. We're delighted to host you and have confirmed the details below. We can't wait to welcome you.</p>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 4px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EC; border:1px solid #EAE3D2; border-radius:10px;">
              <tr><td style="padding:18px 20px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif; font-size:14px;">
                  <tr><td style="padding:7px 0; color:#5B6B68; width:44%;">Booking reference</td><td style="padding:7px 0; color:#14201E; font-weight:bold; text-align:right;">${bookingId}</td></tr>
                  <tr><td colspan="2" style="border-top:1px solid #EAE3D2; font-size:0; line-height:0;">&nbsp;</td></tr>
                  <tr><td style="padding:7px 0; color:#5B6B68;">Room</td><td style="padding:7px 0; color:#14201E; font-weight:bold; text-align:right;">${room} (${bathtubLabel})</td></tr>
                  <tr><td colspan="2" style="border-top:1px solid #EAE3D2; font-size:0; line-height:0;">&nbsp;</td></tr>
                  <tr><td style="padding:7px 0; color:#5B6B68;">Check-in</td><td style="padding:7px 0; color:#14201E; font-weight:bold; text-align:right;">${ciPretty} <span style="color:#5B6B68; font-weight:normal;">· from 12 PM</span></td></tr>
                  <tr><td colspan="2" style="border-top:1px solid #EAE3D2; font-size:0; line-height:0;">&nbsp;</td></tr>
                  <tr><td style="padding:7px 0; color:#5B6B68;">Check-out</td><td style="padding:7px 0; color:#14201E; font-weight:bold; text-align:right;">${coPretty} <span style="color:#5B6B68; font-weight:normal;">· by 11 AM</span></td></tr>
                  <tr><td colspan="2" style="border-top:1px solid #EAE3D2; font-size:0; line-height:0;">&nbsp;</td></tr>
                  <tr><td style="padding:7px 0; color:#5B6B68;">Nights · Guests</td><td style="padding:7px 0; color:#14201E; font-weight:bold; text-align:right;">${nights} nights · ${guests} guests</td></tr>
                </table>
              </td></tr>
            </table>
          </td>
        </tr>
${paymentBlock}
        <tr>
          <td style="padding:22px 32px 4px 32px;">
            <div style="font-family:'Georgia','Times New Roman',serif; color:#14201E; font-size:18px;">Getting here</div>
            <p style="margin:8px 0 0 0; font-family:Arial,Helvetica,sans-serif; color:#5B6B68; font-size:14px; line-height:1.6;">13, Saibaba Koil Street, Puducherry 605009<br>Near Pondicherry Gate · 5 minutes from JIPMER</p>
            <div style="margin-top:14px;"><a href="https://maps.app.goo.gl/uXmbjQ9tpviANJpm6" target="_blank" style="display:inline-block; background:#0E3B35; color:#ffffff; text-decoration:none; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:bold; padding:12px 22px; border-radius:8px;">Open in Google Maps →</a></div>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 4px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0E3B35; border-radius:10px;">
              <tr><td style="padding:20px 22px;">
                <div style="font-family:'Georgia','Times New Roman',serif; color:#ffffff; font-size:17px;">Your digital welcome kit</div>
                <p style="margin:8px 0 14px 0; font-family:Arial,Helvetica,sans-serif; color:#E6C35A; font-size:13px; line-height:1.6;">Wi-Fi, house guide, food menu, bike rentals and a local Pondicherry guide, all in one place.</p>
                <a href="${welcomeUrl}" target="_blank" style="display:inline-block; background:#C9A227; color:#14201E; text-decoration:none; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:bold; padding:11px 20px; border-radius:8px;">Open my welcome page →</a>
              </td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 4px 32px;">
            <div style="font-family:'Georgia','Times New Roman',serif; color:#14201E; font-size:18px;">Good to know</div>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-family:Arial,Helvetica,sans-serif; color:#5B6B68; font-size:14px; line-height:1.6; margin-top:8px;">
              <tr><td style="padding:4px 0;">• Check-in from 12 PM · check-out by 11 AM.</td></tr>
              <tr><td style="padding:4px 0;">• Need a late check-out? Just message us and we'll do our best around the next booking.</td></tr>
              <tr><td style="padding:4px 0;">• Home-cooked meals and on-site bike rentals available on request.</td></tr>
              <tr><td style="padding:4px 0;">• Please carry a valid government photo ID for all guests.</td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:22px 32px 6px 32px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAF6EC; border:1px solid #EAE3D2; border-radius:10px;">
              <tr><td style="padding:18px 20px;" align="center">
                <p style="margin:0 0 12px 0; font-family:Arial,Helvetica,sans-serif; color:#5B6B68; font-size:14px; line-height:1.6;">Any questions before you arrive? We're on WhatsApp 24/7.</p>
                <a href="https://wa.me/919620364554" target="_blank" style="display:inline-block; background:#0E3B35; color:#ffffff; text-decoration:none; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:bold; padding:11px 20px; border-radius:8px; margin:2px;">WhatsApp us</a>
                <a href="tel:+919620364554" style="display:inline-block; background:#ffffff; color:#0E3B35; text-decoration:none; font-family:Arial,Helvetica,sans-serif; font-size:14px; font-weight:bold; padding:11px 20px; border-radius:8px; border:1px solid #0E3B35; margin:2px;">Call +91 96203 64554</a>
              </td></tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:20px 32px 28px 32px;">
            <p style="margin:0; font-family:Arial,Helvetica,sans-serif; color:#14201E; font-size:15px; line-height:1.65;">Warm regards,<br><span style="font-family:'Georgia','Times New Roman',serif; font-size:17px;">The Nivaa Stays Team</span></p>
          </td>
        </tr>

        <tr>
          <td style="background:#082623; padding:22px 32px;">
            <p style="margin:0; font-family:Arial,Helvetica,sans-serif; color:#ffffff; font-size:13px; line-height:1.6;">Nivaa Stays · Le Affordable Luxury</p>
            <p style="margin:6px 0 0 0; font-family:Arial,Helvetica,sans-serif; color:rgba(255,255,255,0.6); font-size:12px; line-height:1.6;">13, Saibaba Koil Street, Puducherry 605009, India<br><a href="https://nivaastays.com" style="color:#E6C35A; text-decoration:none;">nivaastays.com</a> · <a href="mailto:nivaastays@gmail.com" style="color:#E6C35A; text-decoration:none;">nivaastays@gmail.com</a> · +91 96203 64554</p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body></html>`;
}

function renderComposer(b) {
  const root = document.getElementById('confirm-root');
  const summary = [
    b.name || '(no name)',
    b.checkin ? (fmtLong(b.checkin) + ' → ' + fmtLong(b.checkout)) : '',
    b.room ? ('Room ' + b.room) : ''
  ].filter(Boolean).join(' · ');

  root.innerHTML = `
    <div class="mb-5">
      <div class="text-gold text-[11px] tracking-[0.22em] uppercase mb-1">Booking confirmation</div>
      <h1 class="serif text-2xl sm:text-3xl text-teal">Send confirmation email</h1>
      <p class="text-[color:var(--brand-muted)] text-sm mt-2">${escapeHtml(summary)}</p>
    </div>

    <div class="bg-white rounded-xl border border-[#EAE3D2] p-4 sm:p-5 mb-6">
      <label for="cf-email" class="block text-sm font-semibold text-teal mb-1">Guest email address</label>
      <p class="text-xs text-[color:var(--brand-muted)] mb-2">The email is sent from <strong>nivaastays@gmail.com</strong> with a copy to the host.</p>
      <div class="flex flex-col sm:flex-row gap-2">
        <input id="cf-email" type="email" inputmode="email" autocomplete="off"
               value="${escapeHtml(b.email)}" placeholder="guest@example.com"
               class="flex-1 rounded-lg border border-[#d8dbd8] px-3 py-2 text-sm focus:outline-none focus:border-teal">
        <button id="cf-send" class="btn-gold text-sm px-5 py-2 whitespace-nowrap">Send confirmation email</button>
      </div>
      <div id="cf-status" class="text-sm mt-3" role="status" aria-live="polite"></div>
    </div>

    <div class="text-[11px] tracking-[0.18em] uppercase text-[color:var(--brand-muted)] mb-2">Email preview</div>
    <iframe id="cf-preview" title="Email preview" sandbox
            style="width:100%; height:900px; border:1px solid #EAE3D2; border-radius:12px; background:#FAF6EC;"></iframe>
  `;

  const iframe = document.getElementById('cf-preview');
  iframe.srcdoc = buildEmailHtml(b);

  const emailInput = document.getElementById('cf-email');
  const sendBtn = document.getElementById('cf-send');
  const statusEl = document.getElementById('cf-status');

  sendBtn.addEventListener('click', () => sendConfirmation(b, emailInput, sendBtn, statusEl));
  emailInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); sendConfirmation(b, emailInput, sendBtn, statusEl); }
  });
}

async function sendConfirmation(b, emailInput, sendBtn, statusEl) {
  const email = String(emailInput.value || '').trim();
  if (!EMAIL_RE.test(email)) {
    statusEl.style.color = '#b23b3b';
    statusEl.textContent = 'Please enter a valid email address.';
    emailInput.focus();
    return;
  }
  if (!b.bookingId) {
    statusEl.style.color = '#b23b3b';
    statusEl.textContent = 'Missing booking reference — open this page from the admin dashboard.';
    return;
  }

  sendBtn.disabled = true;
  const originalLabel = sendBtn.textContent;
  sendBtn.textContent = 'Sending…';
  statusEl.style.color = 'var(--brand-muted)';
  statusEl.textContent = 'Sending confirmation to ' + email + '…';

  try {
    const body = new URLSearchParams();
    body.set('action', 'sendConfirmation');
    body.set('id', b.bookingId);
    body.set('email', email);

    const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', body });
    // Apps Script doPost 302-redirects to an echo page; the follow-up GET can be
    // unreadable/404 even on success — so treat an unparseable response as sent.
    let data = { success: true };
    try { data = await res.json(); } catch (_) { /* unreadable echo — assume sent */ }

    if (data && data.success === false) {
      throw new Error(data.error || 'send failed');
    }
    statusEl.style.color = '#0E3B35';
    statusEl.textContent = '✓ Confirmation sent to ' + email + '.';
    sendBtn.textContent = 'Sent ✓';
  } catch (err) {
    statusEl.style.color = '#b23b3b';
    statusEl.textContent = 'Could not send: ' + (err && err.message || err) + '. Please try again.';
    sendBtn.disabled = false;
    sendBtn.textContent = originalLabel;
  }
}

function renderLogin() {
  const root = document.getElementById('confirm-root');
  root.innerHTML = `
    <div class="bg-white rounded-xl border border-[#EAE3D2] p-6 text-center">
      <div class="text-gold text-[11px] tracking-[0.22em] uppercase mb-2">Admin sign-in</div>
      <h1 class="serif text-2xl text-teal mb-2">Sign in to send confirmations</h1>
      <p class="text-[color:var(--brand-muted)] text-sm mb-4">Use the Nivaa Stays Google account.</p>
      <div id="g-signin-btn" class="flex justify-center"></div>
    </div>
  `;
  if (window.NivaaAuth) window.NivaaAuth.renderSignInButton('g-signin-btn');
}

function init() {
  if (isAdmin()) {
    renderComposer(readBooking());
  } else {
    renderLogin();
  }
}

window.addEventListener('nivaa-auth-change', init);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
