/**
 * HTTP wrapper around relay(): the process Dokploy runs. Listens on PORT
 * (default 8787) on all interfaces; Traefik terminates TLS in front of it.
 */

import { createServer } from "node:http";
import { Readable } from "node:stream";
import { relay } from "./relay.mjs";

const port = Number(process.env.PORT) || 8787;

if (!process.env.EGRESS_TOKEN) {
  console.error("EGRESS_TOKEN is not set; refusing to start.");
  process.exit(1);
}

const server = createServer(async (req, res) => {
  try {
    const url = `http://${req.headers.host || "localhost"}${req.url}`;
    const hasBody = !(req.method === "GET" || req.method === "HEAD");
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      body: hasBody ? Readable.toWeb(req) : undefined,
      duplex: hasBody ? "half" : undefined,
    });
    const response = await relay(request, process.env, fetch);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) Readable.fromWeb(response.body).pipe(res);
    else res.end();
  } catch (error) {
    console.error(error);
    if (!res.headersSent) res.writeHead(500, { "content-type": "text/plain" });
    res.end("relay error");
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`bandcamp egress helper listening on ${port}`);
});
