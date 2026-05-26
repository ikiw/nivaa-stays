// Cloudflare Pages Function — returns the visitor's geo data from Cloudflare's edge.
// Available at: https://nivaastays.com/api/geo
// No third-party API, no token, populated for free on every request.
export const onRequest = ({ request }) => {
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
      // Per-visitor data — must not be edge-cached.
      'cache-control': 'private, max-age=300, no-store',
    },
  });
};
