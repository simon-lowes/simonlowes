/**
 * simonlowes.com Bandcamp player proxy (Cloudflare Worker).
 *
 * Serves Bandcamp's embedded player for one artist's release from a
 * first-party host (player.simonlowes.com) so that browsers or networks that
 * block Bandcamp's CDN (s4/f4/t4.bcbits.com) still get the real player. The
 * Worker fetches each upstream resource, rewrites the handful of absolute
 * host references so everything the player needs comes back through this
 * host, and streams the audio with Range requests passed through.
 *
 * It is a transparent relay, not a copy: nothing is stored, every request
 * goes to Bandcamp, play statistics still reach bandcamp.com, and buy/share
 * links still go to Bandcamp. Bandcamp sits behind bot protection that can
 * decide to challenge these requests at any time, so /health reports whether
 * the upstream currently answers with a real player, and the site falls back
 * to its own player when it does not.
 *
 * Routes (all relative to this host):
 *   GET  /EmbeddedPlayer/*        the player document (rewritten)
 *   GET  /s4/*  /img/* /css/* /jslib/*   player script, styles, sprites
 *   GET  /f4/*                    artwork
 *   GET  /stream/*                audio (Range forwarded, body streamed)
 *   GET  /api/stream/1/refresh    renews an expired stream URL
 *   POST /stat_record, /api/*     play statistics and reports, passed through
 *   GET  /health                  { ok, reason, checkedAt } with CORS for the site
 *   anything else                 302 to the same path on bandcamp.com
 */

export const UPSTREAM = {
  s4: "https://s4.bcbits.com",
  f4: "https://f4.bcbits.com",
  t4: "https://t4.bcbits.com",
  bandcamp: "https://bandcamp.com",
};

/** Identifies this relay honestly to Bandcamp. */
export const USER_AGENT = "SimonLowesPlayerProxy/1.0 (+https://simonlowes.com)";

/** The release the health check loads; any EmbeddedPlayer path works. */
export const DEFAULT_HEALTH_PATH =
  "/EmbeddedPlayer/album=2665327263/size=small/bgcol=0a0a0f/linkcol=00d4ff/transparent=true/";

const TEXT_TYPES = /text\/html|application\/json|text\/css|javascript|image\/svg\+xml/i;

/** Upstream host -> path prefix on this origin. Order matters for rewrite. */
export function hostMap(origin) {
  return [
    [UPSTREAM.s4, `${origin}/s4`],
    [UPSTREAM.f4, `${origin}/f4`],
    // Streams must live at the proxy root: the player recognises
    // /stream/<hash>/<format>/<id> paths when it decides to refresh a URL.
    [UPSTREAM.t4, origin],
    [UPSTREAM.bandcamp, origin],
    ["http://bandcamp.com", origin],
  ];
}

/** Point every absolute upstream reference in a text body at this origin. */
export function rewrite(text, origin) {
  let out = text;
  for (const [host, prefix] of hostMap(origin)) out = out.split(host).join(prefix);
  return out;
}

/** Undo rewrite() for a URL the player sends back to us (stream refresh). */
export function unrewrite(text, origin) {
  let out = text;
  // Longest prefixes first so "/s4" is not swallowed by the bare origin.
  for (const [host, prefix] of hostMap(origin)
    .filter(([h]) => h !== "http://bandcamp.com")
    .sort((a, b) => b[1].length - a[1].length)) {
    out = out.split(prefix).join(host);
  }
  return out;
}

/** True when the upstream answered with a bot challenge or not the player. */
export function looksLikeChallenge(html) {
  if (!html) return true;
  // Plain substring checks only: this runs on uncontrolled upstream bodies.
  // The real player always carries its data attribute; a bot challenge or
  // any other page never does.
  if (!html.includes("data-player-data")) return true;
  return html.includes("<title>Client Challenge");
}

/**
 * Map a request path on this host to its upstream URL.
 * Returns null for paths this proxy does not serve.
 */
export function resolveTarget(pathname, search, origin) {
  const s = search || "";
  if (pathname.startsWith("/s4/"))
    return { url: UPSTREAM.s4 + pathname.slice(3) + s, kind: "asset" };
  if (pathname.startsWith("/f4/"))
    return { url: UPSTREAM.f4 + pathname.slice(3) + s, kind: "asset" };
  if (/^\/(img|css|jslib)\//.test(pathname))
    return { url: UPSTREAM.s4 + pathname + s, kind: "asset" };
  if (pathname.startsWith("/stream/")) return { url: UPSTREAM.t4 + pathname + s, kind: "stream" };
  if (pathname.startsWith("/EmbeddedPlayer/")) {
    return { url: UPSTREAM.bandcamp + pathname + s, kind: "player" };
  }
  if (pathname === "/api/stream/1/refresh") {
    const params = new URLSearchParams(s);
    params.set("url", unrewrite(params.get("url") || "", origin));
    return { url: `${UPSTREAM.bandcamp}${pathname}?${params.toString()}`, kind: "refresh" };
  }
  if (pathname === "/stat_record" || pathname.startsWith("/api/")) {
    return { url: UPSTREAM.bandcamp + pathname + s, kind: "api" };
  }
  return null;
}

const DROP_RESPONSE_HEADERS = new Set([
  "set-cookie",
  "content-security-policy",
  "content-security-policy-report-only",
  "content-length",
  "content-encoding",
  "transfer-encoding",
  "connection",
  "strict-transport-security",
  "alt-svc",
  "x-frame-options",
]);

const FORWARD_REQUEST_HEADERS = [
  "accept",
  "accept-language",
  "range",
  "content-type",
  "referer",
  "if-none-match",
  "if-modified-since",
];

function upstreamHeaders(request) {
  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("user-agent", USER_AGENT);
  return headers;
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "https://simonlowes.com,https://www.simonlowes.com")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get("origin") || "";
  const allowed = allowedOrigins(env);
  const ok =
    allowed.includes(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const headers = new Headers({ vary: "origin" });
  if (ok) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-methods", "GET, OPTIONS");
    headers.set("access-control-max-age", "600");
  }
  return headers;
}

function frameAncestors(env) {
  const list = allowedOrigins(env).concat(["http://localhost:*", "http://127.0.0.1:*"]);
  return `frame-ancestors ${list.join(" ")}`;
}

function json(body, status, extra) {
  const headers = new Headers(extra);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { status, headers });
}

/**
 * Fetch the player document upstream and say whether it is really the
 * player (not a bot challenge). Shared by /health and /EmbeddedPlayer.
 */
async function checkUpstream(path, upstreamFetch) {
  const response = await upstreamFetch(UPSTREAM.bandcamp + path, {
    headers: { "user-agent": USER_AGENT, accept: "text/html" },
    redirect: "follow",
  });
  const html = await response.text();
  // What the upstream answered, for /health: enough to tell a bot challenge
  // from an outage without exposing the page itself.
  const titleMatch = html.match(/<title>([^<]{0,80})/);
  const upstream = {
    status: response.status,
    title: titleMatch ? titleMatch[1] : "",
    server: response.headers.get("server") || "",
    servedBy: response.headers.get("x-served-by") || "",
    length: html.length,
    snippet: html.slice(0, 160).replace(/\s+/g, " "),
  };
  if (!response.ok) return { ok: false, reason: `upstream ${response.status}`, html: "", upstream };
  if (looksLikeChallenge(html)) return { ok: false, reason: "challenge", html: "", upstream };
  return { ok: true, reason: "ok", html, upstream };
}

/**
 * Handle one request. `upstreamFetch` is injectable so the Worker can be
 * exercised in Node without network.
 */
export async function handle(request, env = {}, upstreamFetch = fetch) {
  const url = new URL(request.url);
  const origin = url.origin;
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (path === "/health") {
    const cors = corsHeaders(request, env);
    cors.set("cache-control", "public, max-age=60");
    cors.set("x-robots-tag", "noindex");
    try {
      const result = await checkUpstream(env.HEALTH_PATH || DEFAULT_HEALTH_PATH, upstreamFetch);
      return json(
        {
          ok: result.ok,
          reason: result.reason,
          checkedAt: new Date().toISOString(),
          upstream: result.upstream,
        },
        result.ok ? 200 : 503,
        cors
      );
    } catch (error) {
      return json(
        { ok: false, reason: `error: ${error.message}`, checkedAt: new Date().toISOString() },
        503,
        cors
      );
    }
  }

  const target = resolveTarget(path, url.search, origin);
  if (!target) {
    // Buy / share / logo links land on the real Bandcamp
    return Response.redirect(UPSTREAM.bandcamp + path + url.search, 302);
  }
  if (!["GET", "HEAD", "POST"].includes(request.method)) {
    return new Response("Method not allowed", { status: 405 });
  }

  const init = {
    method: request.method,
    headers: upstreamHeaders(request),
    redirect: "follow",
  };
  if (request.method === "POST") init.body = await request.arrayBuffer();
  if (target.kind === "asset") {
    // Hashed bundles and artwork: let Cloudflare's edge keep them for a day
    init.cf = { cacheEverything: true, cacheTtl: 86400 };
  }

  let upstream;
  try {
    upstream = await upstreamFetch(target.url, init);
  } catch (error) {
    return json({ ok: false, reason: `upstream unreachable: ${error.message}` }, 502);
  }

  const headers = new Headers();
  for (const [name, value] of upstream.headers) {
    if (!DROP_RESPONSE_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  }
  headers.set("x-robots-tag", "noindex");

  if (target.kind === "stream") {
    // Audio: stream the body straight through, Range semantics intact
    headers.set("cache-control", "private, no-store");
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (!TEXT_TYPES.test(contentType)) {
    return new Response(upstream.body, { status: upstream.status, headers });
  }

  let text = await upstream.text();
  if (target.kind === "player") {
    if (!upstream.ok || looksLikeChallenge(text)) {
      return json(
        { ok: false, reason: upstream.ok ? "challenge" : `upstream ${upstream.status}` },
        503,
        {
          "cache-control": "no-store",
          "x-robots-tag": "noindex",
        }
      );
    }
    headers.set("content-security-policy", frameAncestors(env));
    headers.set("cache-control", "private, no-store");
  }
  text = rewrite(text, origin);
  return new Response(text, { status: upstream.status, headers });
}

export default {
  fetch(request, env, _ctx) {
    return handle(request, env, fetch);
  },
};
