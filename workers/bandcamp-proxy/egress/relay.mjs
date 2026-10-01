/**
 * Egress helper for the Bandcamp relay Worker.
 *
 * Bandcamp sits behind Fastly's bot protection, which answers every dynamic
 * request from Cloudflare's own network with a JavaScript challenge, whatever
 * the headers; the same request from an ordinary server gets the player. So
 * the Worker does not fetch Bandcamp itself: it asks this helper, running on
 * the site's VPS, to fetch on its behalf. The helper accepts only requests
 * carrying the shared token, only for Bandcamp's hosts, and forwards the same
 * small set of headers the Worker would have sent.
 *
 * Runs on Node 22 with no dependencies. `relay()` is the whole logic, on Web
 * Request/Response objects so it can be unit-tested; server.mjs wraps it in
 * an HTTP server.
 */

import { timingSafeEqual } from "node:crypto";

export const USER_AGENT = "SimonLowesPlayerProxy/1.0 (+https://simonlowes.com)";

export const ALLOWED_HOSTS = new Set([
  "bandcamp.com",
  "s4.bcbits.com",
  "f4.bcbits.com",
  "t4.bcbits.com",
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

// Node's fetch has already decoded the body, so the encoding headers would lie;
// the rest are hop-by-hop.
const DROP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
]);

function tokenMatches(given, expected) {
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function text(body, status) {
  return new Response(body, { status, headers: { "content-type": "text/plain" } });
}

/**
 * Handle one request. `env` carries EGRESS_TOKEN; `upstreamFetch` is
 * injectable for tests.
 */
export async function relay(request, env = process.env, upstreamFetch = fetch) {
  const url = new URL(request.url);

  if (url.pathname === "/healthz") return text("ok", 200);
  if (url.pathname !== "/fetch") return text("not found", 404);

  if (!tokenMatches(request.headers.get("x-relay-token"), env.EGRESS_TOKEN)) {
    return text("unauthorized", 401);
  }

  let target;
  try {
    target = new URL(url.searchParams.get("url") || "");
  } catch {
    return text("bad url", 400);
  }
  if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
    return text("host not allowed", 403);
  }
  if (!["GET", "HEAD", "POST"].includes(request.method)) {
    return text("method not allowed", 405);
  }

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("user-agent", USER_AGENT);

  const init = { method: request.method, headers, redirect: "follow" };
  if (request.method === "POST") init.body = await request.arrayBuffer();

  let upstream;
  try {
    upstream = await upstreamFetch(target.href, init);
  } catch (error) {
    return text(`upstream unreachable: ${error.message}`, 502);
  }

  const out = new Headers();
  for (const [name, value] of upstream.headers) {
    if (!DROP_RESPONSE_HEADERS.has(name.toLowerCase())) out.set(name, value);
  }
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: out,
  });
}
