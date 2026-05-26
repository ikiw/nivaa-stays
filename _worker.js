// Cloudflare Worker entry — handles dynamic routes, falls through to static assets.
// Bound to ASSETS via wrangler.jsonc's assets.binding.

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
      return new Response(body, {
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'private, max-age=300, no-store',
        },
      });
    }

    // Everything else: serve from static assets.
    return env.ASSETS.fetch(request);
  },
};
