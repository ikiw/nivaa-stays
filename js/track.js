// Nivaa Stays — lightweight conversion tracking.
// Fires a GA4-style `generate_lead` event + a Google Ads conversion on every
// high-intent click (WhatsApp, phone call, "Book"). Uses event delegation, so
// new buttons are tracked automatically — no per-button wiring needed.
//
// Loaded ONLY on marketing pages (index, gallery, booking, the 8 landing pages,
// guides + guide articles) so post-booking WhatsApp chatter on guest pages
// (welcome/order/checkin) doesn't inflate the numbers.
//
// ── ACTIVATION (one-time, ~10 min in the Google Ads dashboard) ──────────────
// The Ads conversion only counts once you paste the conversion label below:
//   1. Google Ads → Goals → Conversions → New conversion action → "Website".
//   2. Create one action per row in ADS_LABELS (e.g. "WhatsApp click",
//      "Call click", "Book click"). Choose category "Contact" or "Lead".
//   3. Each action shows a tag with: send_to: 'AW-18059444069/XXXXXXXX'.
//      Copy the part AFTER the slash and paste it as the value below.
// Until a label is filled, that action still fires the GA4 event (harmless),
// just no Ads conversion. GA4 events also need a GA4 property to land anywhere.

(function () {
  var ADS_ID = 'AW-18059444069';

  // TODO: paste each Google Ads conversion label here (the part after the "/").
  var ADS_LABELS = {
    whatsapp_click: '',  // e.g. 'abCdEfGhIjKlM'
    call_click:     '',
    book_click:     ''
  };

  function fire(action, source) {
    if (typeof gtag !== 'function') return;
    // GA4 recommended "lead" event — future-proof; harmless without GA4.
    try { gtag('event', 'generate_lead', { lead_source: source, event_label: action }); } catch (e) {}
    // Google Ads conversion — only registers once its label is filled in.
    var label = ADS_LABELS[action];
    if (label) {
      try { gtag('event', 'conversion', { send_to: ADS_ID + '/' + label, transport_type: 'beacon' }); } catch (e) {}
    }
  }

  // Exposed for manual calls (e.g. a form submit handler can call
  // window.nivaaTrack('book_click', 'booking-form')).
  window.nivaaTrack = fire;

  // One delegated listener (capture phase, so it runs even if a handler
  // stops propagation). Classifies the clicked link by its href.
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('a[href]') : null;
    if (!el) return;
    var href = (el.getAttribute('href') || '').toLowerCase();

    if (href.indexOf('wa.me') !== -1 || href.indexOf('api.whatsapp.com') !== -1) {
      fire('whatsapp_click', 'whatsapp');
    } else if (href.indexOf('tel:') === 0) {
      fire('call_click', 'phone');
    } else if (href.indexOf('booking.html') !== -1 || href.indexOf('/booking') !== -1) {
      fire('book_click', 'booking');
    }
  }, true);
})();
