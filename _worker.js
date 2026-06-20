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

function withSecurityHeaders(res, cacheControl) {
  // Response headers from ASSETS.fetch are immutable — clone into a mutable one.
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  if (cacheControl) headers.set('Cache-Control', cacheControl);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

// Cache policy for static assets (the live equivalent of Lighthouse's "efficient cache
// lifetimes"). HTML always revalidates so deploys ship immediately; fingerprinted assets
// are immutable; stable media/fonts get a month.
function cacheControlFor(url) {
  const p = url.pathname;
  if (url.searchParams.has('v') || p.includes('/pondicherry-itinerary/assets/')) {
    return 'public, max-age=31536000, immutable';
  }
  if (/\.(avif|webp|png|jpe?g|gif|svg|ico|woff2?|ttf|otf)$/i.test(p)) {
    return 'public, max-age=2592000';
  }
  const last = p.slice(p.lastIndexOf('/'));
  if (p.endsWith('/') || p.endsWith('.html') || !last.includes('.')) {
    return 'public, max-age=0, must-revalidate';
  }
  return null; // leave manifest/json/etc. as served
}

function jsonRes(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

// ---- AI itinerary planner ----------------------------------------------------
// Llama 3.1 8B picks places from OUR catalog (grounded — ids validated server-side);
// the client then orders them by the pre-computed driving matrix. No place is invented.
const PLAN_MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8';
const PLAN_CATS = ['Beach', 'Attraction', 'Food', 'Social', 'Shopping'];

function extractJson(s) {
  const a = s.indexOf('{'), b = s.lastIndexOf('}');
  return a >= 0 && b > a ? s.slice(a, b + 1) : s;
}

async function handlePlan(request, env) {
  if (!env.AI) return jsonRes({ error: 'ai_unavailable' }, 503);
  let body;
  try { body = await request.json(); } catch { return jsonRes({ error: 'bad_request' }, 400); }
  const query = String(body.query || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  if (!query) return jsonRes({ error: 'empty_query' }, 400);

  // Load the catalog from the static itinerary data — ids are indices into places[],
  // exactly matching what the client uses for state.stops.
  let places;
  try {
    const r = await env.ASSETS.fetch(new Request(new URL('/data/pondicherry-itinerary.json', request.url)));
    places = (await r.json()).places || [];
  } catch { return jsonRes({ error: 'catalog_unavailable' }, 500); }

  const stops = [], starts = [];
  places.forEach((p, i) => {
    if (PLAN_CATS.includes(p.cat)) {
      const tag = p.sub ? `${p.cat}/${p.sub}` : p.cat;
      const desc = (p.desc || '').replace(/\s+/g, ' ').slice(0, 80);
      stops.push(`${i}\t${p.name} [${tag}]${desc ? ' — ' + desc : ''}`);
    } else if (p.cat === 'Area' || p.cat === 'Stay') {
      starts.push(`${i}\t${p.name}`);
    }
  });

  const sys = `You are a Pondicherry (India) day-trip planner. From the lists below, choose places for ONE day that best match the user's request.
Rules:
- Use ONLY the numeric ids shown. Never invent a place or id.
- If a CURRENT PLAN is given, treat the request as an EDIT of it: keep its stops and their order, changing only what the request implies (add, remove, replace, reorder, or relax). Otherwise build a fresh day.
- "Relax" or "easier" -> fewer stops and/or nearer places; "fuller" or "more" -> add stops.
- Default to 4 to 8 stops unless the user or the current plan implies otherwise.
- Include a lunch and/or dinner spot when it suits the day.
- Choose one start id from START AREAS — prefer the current/stated start, else the most central.
- Honour the user's interests and pace; exclude anything they say to avoid.
Respond with ONLY JSON: {"start": <id>, "stops": [<id>,...], "note": "<one short friendly sentence>"}.

START AREAS:
${starts.join('\n')}

PLACES (id  name [category/sub] — description):
${stops.join('\n')}`;

  // Current plan (if any) so the model can edit instead of always rebuilding.
  const cur = body.current || {};
  const curStops = Array.isArray(cur.stops)
    ? cur.stops.filter(i => Number.isInteger(i) && places[i] && PLAN_CATS.includes(places[i].cat)) : [];
  const startName = Number.isInteger(cur.start) && places[cur.start] ? places[cur.start].name : 'unspecified';
  const currentBlock = curStops.length
    ? `CURRENT PLAN (already built by the user — modify this, do not start over unless asked):\nStart: ${startName}\nStops in order: ${curStops.map(i => i + ' ' + places[i].name).join(', ')}\n\n`
    : '';
  const user = `${currentBlock}Start time: ${body.startTime || '09:00'}. Current start: ${startName}.\nRequest: ${query}`;

  let out;
  try {
    // NB: the fp8 model rejects response_format json_schema ("5025: doesn't support
    // JSON Schema"). The system prompt already demands JSON-only and extractJson() +
    // server-side id grounding below recover the plan, so we parse free-form output.
    out = await env.AI.run(PLAN_MODEL, {
      max_tokens: 400,
      messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    });
  } catch (e) {
    return jsonRes({ error: 'ai_error', detail: String(e).slice(0, 200) }, 502);
  }

  let parsed = out && out.response;
  if (typeof parsed === 'string') { try { parsed = JSON.parse(extractJson(parsed)); } catch { parsed = null; } }
  if (!parsed || !Array.isArray(parsed.stops)) return jsonRes({ error: 'no_plan' }, 502);

  // Ground the model output against the catalog: drop anything invalid.
  const isStop = i => Number.isInteger(i) && places[i] && PLAN_CATS.includes(places[i].cat);
  const isStart = i => Number.isInteger(i) && places[i] && (places[i].cat === 'Area' || places[i].cat === 'Stay');
  const seen = new Set();
  const ids = parsed.stops.filter(i => isStop(i) && !seen.has(i) && seen.add(i)).slice(0, 9);
  if (!ids.length) return jsonRes({ error: 'no_valid_places' }, 502);
  const start = isStart(parsed.start) ? parsed.start : null;

  return jsonRes({ start, stops: ids, note: String(parsed.note || '').slice(0, 160) });
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

    // /api/plan — AI-assisted itinerary from a natural-language request.
    if (url.pathname === '/api/plan') {
      if (request.method !== 'POST') return withSecurityHeaders(jsonRes({ error: 'method_not_allowed' }, 405));
      return withSecurityHeaders(await handlePlan(request, env));
    }

    // Retired HTML planner → new React app (permanent). The old page lived ~1 week,
    // so a 301 is plenty to carry over any signals it picked up.
    if (url.pathname === '/pondicherry-itinerary-planner' || url.pathname === '/pondicherry-itinerary-planner.html') {
      return withSecurityHeaders(new Response(null, { status: 301, headers: { Location: '/pondicherry-itinerary' } }));
    }

    // Everything else: serve from static assets.
    const res = await env.ASSETS.fetch(request);
    return withSecurityHeaders(res, cacheControlFor(url));
  },
};
