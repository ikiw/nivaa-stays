// Nivaa Stays — bottom-right greeting toast personalized to the visitor's city.
// Cities recognised: Chennai, Bangalore (Bengaluru), Pondicherry (Puducherry), Madurai,
// Salem, Coimbatore (Kovai), Hyderabad (Secunderabad), Mumbai (Bombay).
// Other locations: no toast shown.

(function () {
  const DISMISS_KEY = 'nivaa.greeting.dismissed';
  const SHOW_DELAY_MS = 2500;

  // City → message + cta config. Case-insensitive matching on city name.
  const CITY_RULES = [
    {
      match: ['chennai'],
      label: 'Chennai',
      lead: 'Whistle Podu!',
      body: 'Planning a trip down from Chennai to your neighbouring Pondicherry? We would love to host you at Nivaa Stays.',
      whatsappText: "Hi, I'm planning a trip from Chennai and would like to check availability at Nivaa Stays.",
    },
    {
      match: ['bangalore', 'bengaluru'],
      label: 'Bangalore',
      lead: 'Hi RCBian!',
      body: 'Traveling all the way from BLR to Pondy? We would love to host you at Nivaa Stays.',
      whatsappText: "Hi, I'm visiting from Bangalore and would like to check availability at Nivaa Stays.",
    },
    {
      match: ['pondicherry', 'puducherry'],
      label: 'Pondicherry',
      lead: 'Hi localite!',
      body: 'Planning a quiet staycation in your own city? We would love to host you at Nivaa Stays.',
      whatsappText: "Hi, I'm a Pondicherry local and would like to check availability for a staycation at Nivaa Stays.",
    },
    {
      match: ['madurai'],
      label: 'Madurai',
      lead: 'Vanakkam Madurai-kaara!',
      body: 'Driving down from the temple city to Pondicherry? We would love to host you at Nivaa Stays.',
      whatsappText: "Hi, I'm planning a trip from Madurai and would like to check availability at Nivaa Stays.",
    },
    {
      match: ['salem'],
      label: 'Salem',
      lead: 'Hello, Mango City!',
      body: 'Trading Salem mango country for the Pondicherry coast? We would love to host you at Nivaa Stays.',
      whatsappText: "Hi, I'm planning a trip from Salem and would like to check availability at Nivaa Stays.",
    },
    {
      match: ['coimbatore', 'kovai'],
      label: 'Coimbatore',
      lead: 'Namma Kovai!',
      body: 'Heading from Kovai to the coast for a Pondicherry break? We would love to host you at Nivaa Stays.',
      whatsappText: "Hi, I'm visiting from Coimbatore and would like to check availability at Nivaa Stays.",
    },
    {
      match: ['hyderabad', 'secunderabad'],
      label: 'Hyderabad',
      lead: 'Adaab, Hyderabad!',
      body: 'Swapping biryani for a calm beach-town break in Pondicherry? We would love to host you at Nivaa Stays.',
      whatsappText: "Hi, I'm visiting from Hyderabad and would like to check availability at Nivaa Stays.",
    },
    {
      match: ['mumbai', 'bombay'],
      label: 'Mumbai',
      lead: 'Aamchi Mumbai!',
      body: 'Trading the city rush for a quiet Pondicherry getaway? We would love to host you at Nivaa Stays.',
      whatsappText: "Hi, I'm visiting from Mumbai and would like to check availability at Nivaa Stays.",
    },
  ];

  // Once dismissed, never show again on this browser.
  function alreadyDismissed() {
    try { return localStorage.getItem(DISMISS_KEY) === '1'; } catch (_) { return false; }
  }

  function rememberDismiss() {
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch (_) {}
  }

  function matchRule(city) {
    if (!city) return null;
    const lc = String(city).toLowerCase();
    return CITY_RULES.find(r => r.match.some(m => lc.includes(m))) || null;
  }

  function render(rule) {
    const root = document.createElement('div');
    root.className = 'greeting-toast';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-live', 'polite');
    root.innerHTML = `
      <button type="button" class="greeting-close" aria-label="Dismiss">&times;</button>
      <div class="greeting-row">
        <img src="/assets/logo.png" alt="" class="greeting-logo">
        <div class="greeting-body">
          <div class="greeting-eyebrow">A note from Nivaa Stays</div>
          <div class="greeting-msg"><strong>${rule.lead}</strong> ${rule.body}</div>
          <div class="greeting-actions">
            <a href="/booking.html" class="greeting-cta">Check availability</a>
            <a href="https://wa.me/919620364554?text=${encodeURIComponent(rule.whatsappText)}" target="_blank" rel="noopener" class="greeting-cta greeting-cta-wa">WhatsApp us</a>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    requestAnimationFrame(() => root.classList.add('is-open'));

    root.querySelector('.greeting-close').addEventListener('click', () => {
      root.classList.remove('is-open');
      rememberDismiss();
      setTimeout(() => root.remove(), 300);
    });
  }

  // Local-dev / preview override: append ?greet=chennai (or bangalore / pondicherry)
  // to any URL to force-render the toast. Bypasses the dismissed flag too.
  function urlOverrideCity() {
    try {
      const v = new URLSearchParams(location.search).get('greet');
      return v ? v.trim() : null;
    } catch (_) { return null; }
  }

  async function run() {
    const overrideCity = urlOverrideCity();
    if (!overrideCity && alreadyDismissed()) return;

    let city = overrideCity;
    if (!city) {
      try {
        const res = await fetch('/api/geo', { credentials: 'omit' });
        if (!res.ok) return;
        const geo = await res.json();
        city = geo && geo.city;
      } catch (_) { return; }
    }

    const rule = matchRule(city);
    if (!rule) return;
    setTimeout(() => render(rule), SHOW_DELAY_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    run();
  }
})();
