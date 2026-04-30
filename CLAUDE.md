# Nivaa Stays — Site Repo

Marketing + guest-utility site for **Nivaa Stays**, a premium guest house near JIPMER in Puducherry. Brand tagline: *Le Affordable Luxury*.

- Live: https://nivaastays.com
- Repo: `ikiw/nivaa-stays` on GitHub (push as the `ikiw` user, **not** `selango_LinkedIn`)
- Hosting: Cloudflare Pages (auto-deploys on push to `main`)

## Stack

Static HTML, vanilla CSS/JS, Tailwind via CDN. No build step. Edits go straight to `.html` / `styles.css`.

## Pages

**SEO landing pages** (in `sitemap.xml`, want indexing):
- `index.html`, `gallery.html`
- `guest-house-near-jipmer.html`, `patient-family-stay-jipmer.html`, `student-family-stay-jipmer.html`, `conference-stay-jipmer.html`
- `celebration-stay-pondicherry.html`, `pet-friendly-stay-pondicherry.html`, `full-house-stay-pondicherry.html`

**Guest-only utility pages** (`<meta robots="noindex,follow">`, NOT in sitemap):
- `order.html` — food ordering via WhatsApp cart
- `stay-guide.html` — local Pondicherry guide for current guests
- `welcome.html` — post-booking welcome kit
- `checkin.html` — self check-in form (talks to Apps Script)

## Cloudflare Pages quirk — `.html` stripping

Cloudflare Pages **307-redirects** `/foo.html` → `/foo`. This causes Google "redirect error" if the sitemap or canonical points at the `.html` form. Therefore:

- **Sitemap entries:** extensionless (`https://nivaastays.com/conference-stay-jipmer`)
- **`<link rel="canonical">` on every page:** extensionless
- **Internal `href`s:** still `.html` is fine — users get one transparent redirect; only Google care about canonical/sitemap

If adding a new page, follow the same convention: extensionless in sitemap and canonical, `.html` for the actual file.

## Images

All photos live in `images/` as **AVIF** (small + sharp). Source JPEGs from WhatsApp/phone live in `../new-image/` (outside the repo) and get converted with:

```bash
sips -s format jpeg -Z 1600 "$SRC" --out /tmp/tmp.jpg
avifenc -q 60 -s 6 /tmp/tmp.jpg images/<descriptive-name>.avif
```

`avifenc` comes from `brew install libavif`. Naming: kebab-case, descriptive (`bedroom-king-warm-lit.avif`, not `IMG_1234.avif`).

**Lazy-loading:** every below-fold `<img>` should have `loading="lazy" decoding="async"`. Hero images stay eager (no `loading=lazy`) to keep LCP fast.

## Carousels

Room booking cards on `index.html` use a small vanilla JS carousel: `[data-carousel] > .rc-track > img` with prev/next/dots and 5-second autoplay. CSS in `styles.css` under `.room-carousel`. Pause on hover, touch, and via `IntersectionObserver` when off-screen. To add slides: just append `<img>` tags inside `.rc-track`.

## Backend (separate)

Bookings, daily digest, self check-in lookup, and now **iCal availability feed for Airbnb sync** all live in a Google Apps Script project bound to a Bookings Google Sheet — not in this repo. The deployed web-app URL is hard-coded into `checkin.html`. Don't touch the URL unless redeploying the script (which keeps the URL stable across versions).

The site does NOT need to know about Airbnb sync — that's purely sheet ↔ Apps Script ↔ Airbnb iCal.

## Brand

- Teal `#0E3B35` (primary), teal-dark `#082623`
- Gold `#C9A227`, gold-soft `#E6C35A`
- Cream `#FAF6EC`, ink `#14201E`, muted `#5B6B68`
- Fonts: **Playfair Display** for headings, **Inter** for body
- Contact: `+91 96203 64554` (WhatsApp + call)

## Local preview

```bash
cd /Users/selango/Documents/stays/website/site
python3 -m http.server 8765
# open http://localhost:8765/
```

## Deploy / push checklist

1. Make edits, validate locally (the user prefers to eyeball changes before push).
2. `git -C site add -A && git -C site commit -m "..."`
3. **Push as `ikiw`**: `gh auth setup-git` was already run; `git push origin main` works as long as `ikiw` is the active gh account (`gh auth status` to verify).
4. Cloudflare auto-deploys in ~1 min.
5. If sitemap/SEO touched: resubmit sitemap in Search Console and use URL Inspection → Request Indexing on changed pages.

## Tracking

Google Ads gtag (`AW-18059444069`) is on every page, injected right after the viewport meta. If adding a new HTML page, copy the gtag block from `index.html`.
