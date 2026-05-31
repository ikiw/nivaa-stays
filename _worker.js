// Cloudflare Worker entry — handles dynamic routes, falls through to static assets.
// Bound to ASSETS via wrangler.jsonc's assets.binding.

// Security headers applied to every response (Workers + Assets ignores _headers).
const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

function withSecurityHeaders(res) {
  // Response headers from ASSETS.fetch are immutable — clone into a mutable one.
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // /api/geo — return visitor geo data from Cloudflare's edge.
    if (url.pathname === '/api/geo') {
      const cf = request.cf || {};
      const body = JSON.stringify({
        country: cf.country || null,
        city: cf.city || null,
        region: cf.region || null,
        timezone: cf.timezone || null,
      });
      return withSecurityHeaders(new Response(body, {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'private, max-age=300, no-store',
        },
      }));
    }

    // Everything else: serve from static assets.
    const res = await env.ASSETS.fetch(request);
    return withSecurityHeaders(res);
  },
};
