import { describe, it, expect } from "vitest";
import {
  DEFAULT_HEALTH_PATH,
  USER_AGENT,
  handle,
  hostMap,
  looksLikeChallenge,
  resolveTarget,
  rewrite,
  unrewrite,
} from "../workers/bandcamp-proxy/src/index.js";

const ORIGIN = "https://player.simonlowes.com";
const PLAYER_HTML =
  '<!doctype html><html><head><link rel="stylesheet" href="https://s4.bcbits.com/client-bundle/1/x.css"></head>' +
  '<body><div id="player" data-siteroot-current="&quot;https://bandcamp.com&quot;" ' +
  'data-player-data="{&quot;file&quot;:{&quot;mp3-128&quot;:&quot;https://t4.bcbits.com/stream/abc/mp3-128/1?p=0&amp;ts=1&quot;}}">' +
  '<img src="https://f4.bcbits.com/img/a1_16.jpg"><script src="https://s4.bcbits.com/client-bundle/1/p.js"></script></div></body></html>';
const CHALLENGE_HTML =
  "<!doctype html><html><head><title>Client Challenge</title></head><body></body></html>";

/** A fake upstream: records calls and answers from a table. */
function fakeUpstream(table) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, init });
    const entry = table.find((t) =>
      t.match instanceof RegExp ? t.match.test(url) : url.startsWith(t.match)
    );
    if (!entry) return new Response("not found", { status: 404 });
    return typeof entry.response === "function" ? entry.response(url, init) : entry.response();
  };
  fn.calls = calls;
  return fn;
}

describe("rewrite", () => {
  it("points every upstream host at the relay, streams at the root", () => {
    const out = rewrite(PLAYER_HTML, ORIGIN);
    expect(out).toContain(`${ORIGIN}/s4/client-bundle/1/x.css`);
    expect(out).toContain(`${ORIGIN}/s4/client-bundle/1/p.js`);
    expect(out).toContain(`${ORIGIN}/f4/img/a1_16.jpg`);
    expect(out).toContain(`${ORIGIN}/stream/abc/mp3-128/1?p=0`);
    expect(out).toContain(`data-siteroot-current="&quot;${ORIGIN}&quot;`);
    expect(out).not.toMatch(/bcbits\.com|https:\/\/bandcamp\.com/);
  });

  it("unrewrite restores a stream URL exactly", () => {
    const stream = "https://t4.bcbits.com/stream/abc/mp3-128/1?p=0&ts=1&t=x&token=y";
    expect(unrewrite(rewrite(stream, ORIGIN), ORIGIN)).toBe(stream);
    const asset = "https://s4.bcbits.com/img/bclogo.png";
    expect(unrewrite(rewrite(asset, ORIGIN), ORIGIN)).toBe(asset);
  });

  it("maps the four upstream hosts", () => {
    expect(hostMap(ORIGIN).map(([h]) => h)).toEqual([
      "https://s4.bcbits.com",
      "https://f4.bcbits.com",
      "https://t4.bcbits.com",
      "https://bandcamp.com",
      "http://bandcamp.com",
    ]);
  });
});

describe("looksLikeChallenge", () => {
  it("recognises the bot challenge and anything that is not the player", () => {
    expect(looksLikeChallenge(CHALLENGE_HTML)).toBe(true);
    expect(looksLikeChallenge("")).toBe(true);
    expect(looksLikeChallenge("<html><body>maintenance</body></html>")).toBe(true);
    expect(looksLikeChallenge(PLAYER_HTML)).toBe(false);
  });
});

describe("resolveTarget", () => {
  it("routes each path family to its upstream", () => {
    expect(resolveTarget("/s4/client-bundle/1/p.js", "", ORIGIN)).toEqual({
      url: "https://s4.bcbits.com/client-bundle/1/p.js",
      kind: "asset",
    });
    expect(resolveTarget("/f4/img/a.jpg", "?x=1", ORIGIN).url).toBe(
      "https://f4.bcbits.com/img/a.jpg?x=1"
    );
    expect(resolveTarget("/img/sprite.svg", "", ORIGIN).url).toBe(
      "https://s4.bcbits.com/img/sprite.svg"
    );
    expect(resolveTarget("/stream/abc/mp3-128/1", "?p=0", ORIGIN)).toEqual({
      url: "https://t4.bcbits.com/stream/abc/mp3-128/1?p=0",
      kind: "stream",
    });
    expect(resolveTarget("/EmbeddedPlayer/album=1/size=large/", "", ORIGIN).kind).toBe("player");
    expect(resolveTarget("/stat_record", "", ORIGIN).kind).toBe("api");
    expect(resolveTarget("/", "", ORIGIN)).toBeNull();
    expect(resolveTarget("/album/slow-motion", "", ORIGIN)).toBeNull();
  });

  it("un-rewrites the stream URL a refresh request carries", () => {
    const search = `?url=${encodeURIComponent(`${ORIGIN}/stream/abc/mp3-128/1?p=0&ts=1`)}`;
    const target = resolveTarget("/api/stream/1/refresh", search, ORIGIN);
    expect(target.kind).toBe("refresh");
    const forwarded = new URL(target.url);
    expect(forwarded.origin + forwarded.pathname).toBe("https://bandcamp.com/api/stream/1/refresh");
    expect(forwarded.searchParams.get("url")).toBe(
      "https://t4.bcbits.com/stream/abc/mp3-128/1?p=0&ts=1"
    );
  });
});

describe("handle", () => {
  const env = { ALLOWED_ORIGINS: "https://simonlowes.com" };

  it("serves the rewritten player with our frame-ancestors and no upstream cookies", async () => {
    const upstream = fakeUpstream([
      {
        match: "https://bandcamp.com/EmbeddedPlayer/",
        response: () =>
          new Response(PLAYER_HTML, {
            status: 200,
            headers: {
              "content-type": "text/html; charset=UTF-8",
              "set-cookie": "cart_client_id=x; domain=.bandcamp.com",
              "content-security-policy": "script-src 'nonce-a'",
            },
          }),
      },
    ]);
    const res = await handle(
      new Request(`${ORIGIN}/EmbeddedPlayer/album=1/size=large/`, {
        headers: { referer: "https://simonlowes.com/" },
      }),
      env,
      upstream
    );
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toContain(`${ORIGIN}/s4/`);
    expect(body).not.toContain("bcbits.com");
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(res.headers.get("content-security-policy")).toContain(
      "frame-ancestors https://simonlowes.com"
    );
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    // Upstream got our identity and the page's referer, no cookies
    expect(upstream.calls[0].init.headers.get("user-agent")).toBe(USER_AGENT);
    expect(upstream.calls[0].init.headers.get("referer")).toBe("https://simonlowes.com/");
    expect(upstream.calls[0].init.headers.get("cookie")).toBeNull();
  });

  it("answers 503 instead of a challenge page", async () => {
    const upstream = fakeUpstream([
      {
        match: "https://bandcamp.com/EmbeddedPlayer/",
        response: () =>
          new Response(CHALLENGE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
      },
    ]);
    const res = await handle(
      new Request(`${ORIGIN}/EmbeddedPlayer/album=1/size=large/`),
      env,
      upstream
    );
    expect(res.status).toBe(503);
    expect((await res.json()).reason).toBe("challenge");
  });

  it("reports health with CORS for the site, ok only for a real player", async () => {
    const ok = fakeUpstream([
      {
        match: "https://bandcamp.com/EmbeddedPlayer/",
        response: () =>
          new Response(PLAYER_HTML, { status: 200, headers: { "content-type": "text/html" } }),
      },
    ]);
    let res = await handle(
      new Request(`${ORIGIN}/health`, { headers: { origin: "https://simonlowes.com" } }),
      env,
      ok
    );
    expect(res.status).toBe(200);
    expect((await res.json()).ok).toBe(true);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://simonlowes.com");
    expect(ok.calls[0].url).toBe(`https://bandcamp.com${DEFAULT_HEALTH_PATH}`);

    const challenged = fakeUpstream([
      {
        match: "https://bandcamp.com/EmbeddedPlayer/",
        response: () =>
          new Response(CHALLENGE_HTML, { status: 200, headers: { "content-type": "text/html" } }),
      },
    ]);
    res = await handle(
      new Request(`${ORIGIN}/health`, { headers: { origin: "https://evil.example" } }),
      env,
      challenged
    );
    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();

    const down = fakeUpstream([]);
    res = await handle(new Request(`${ORIGIN}/health`), env, down);
    expect(res.status).toBe(503);
  });

  it("streams audio through with the Range header and no caching", async () => {
    const upstream = fakeUpstream([
      {
        match: "https://t4.bcbits.com/stream/",
        response: (url, init) =>
          new Response("MP3BYTES", {
            status: 206,
            headers: {
              "content-type": "audio/mpeg",
              "content-range": `bytes ${init.headers.get("range")?.slice(6) ?? "0-7"}/8`,
            },
          }),
      },
    ]);
    const res = await handle(
      new Request(`${ORIGIN}/stream/abc/mp3-128/1?p=0&ts=1`, { headers: { range: "bytes=0-3" } }),
      env,
      upstream
    );
    expect(res.status).toBe(206);
    expect(upstream.calls[0].init.headers.get("range")).toBe("bytes=0-3");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.text()).toBe("MP3BYTES");
  });

  it("rewrites JSON from a stream refresh back to the relay", async () => {
    const upstream = fakeUpstream([
      {
        match:
          /^https:\/\/bandcamp\.com\/api\/stream\/1\/refresh\?url=https%3A%2F%2Ft4\.bcbits\.com/,
        response: () =>
          new Response(
            JSON.stringify({
              url: "https://t4.bcbits.com/stream/abc/mp3-128/1?p=0&ts=2&token=new",
            }),
            { status: 200, headers: { "content-type": "application/json" } }
          ),
      },
    ]);
    const search = `?url=${encodeURIComponent(`${ORIGIN}/stream/abc/mp3-128/1?p=0&ts=1&token=old`)}`;
    const res = await handle(new Request(`${ORIGIN}/api/stream/1/refresh${search}`), env, upstream);
    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe(`${ORIGIN}/stream/abc/mp3-128/1?p=0&ts=2&token=new`);
  });

  it("passes play statistics through as POST", async () => {
    const upstream = fakeUpstream([
      {
        match: "https://bandcamp.com/stat_record",
        response: (url, init) =>
          new Response(init.method === "POST" ? "ok" : "bad", {
            status: 200,
            headers: { "content-type": "text/plain" },
          }),
      },
    ]);
    const res = await handle(
      new Request(`${ORIGIN}/stat_record`, {
        method: "POST",
        body: "x=1",
        headers: { "content-type": "text/plain" },
      }),
      env,
      upstream
    );
    expect(res.status).toBe(200);
    expect(upstream.calls[0].init.method).toBe("POST");
  });

  it("redirects everything else to Bandcamp and answers CORS preflight", async () => {
    const upstream = fakeUpstream([]);
    let res = await handle(new Request(`${ORIGIN}/album/slow-motion`), env, upstream);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://bandcamp.com/album/slow-motion");
    res = await handle(
      new Request(`${ORIGIN}/health`, {
        method: "OPTIONS",
        headers: { origin: "https://simonlowes.com" },
      }),
      env,
      upstream
    );
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("https://simonlowes.com");
    expect(upstream.calls).toHaveLength(0);
  });
});
