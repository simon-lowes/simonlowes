# Bandcamp player proxy

A Cloudflare Worker at `player.simonlowes.com` that relays Bandcamp's embedded
player for the site's release so browsers and networks that block Bandcamp's
CDN (`*.bcbits.com`) still get the real player. See the header comment in
`src/index.js` for the routes and the rewrite.

The site tries the official embed first, this proxy second (only after
`/health` says the upstream is answering with a real player), and its own
player last. So a Bandcamp policy change degrades to the site player rather
than to a blank bar.

## Why there is an egress helper

Bandcamp sits behind Fastly's bot protection, which answers every dynamic
request from Cloudflare's own network with a JavaScript challenge (tested
from two Cloudflare colos with eighteen request shapes: all challenged; the
same request from an ordinary server gets the player). So the Worker does
not fetch Bandcamp itself. `egress/` is a tiny Node service for the site's
VPS that fetches Bandcamp on the Worker's behalf: it accepts only requests
with the shared token, only for Bandcamp's hosts, and forwards the same few
headers the Worker would send. The browser still talks only to
`player.simonlowes.com`; the helper is never framed, so the VPS's
`X-Frame-Options` header does not matter.

## Deploy the egress helper (Dokploy, one time)

1. Dokploy > the project > **Create Application**, name `bandcamp-egress`.
   Provider GitHub, repository `simon-lowes/simonlowes`, branch `main`.
   Build type **Dockerfile**: Docker file `workers/bandcamp-proxy/egress/Dockerfile`,
   Docker context path `workers/bandcamp-proxy/egress`.
2. **Environment**: `EGRESS_TOKEN=<a long random string>` (for example
   `openssl rand -hex 32`). Keep it: the Worker needs the same value.
3. **Domains** > add `relay-upstream.simonlowes.com`, container port `8787`,
   HTTPS on with Let's Encrypt. In Cloudflare DNS add an **A** record
   `relay-upstream` → `76.13.255.213`, **DNS only** (grey cloud): the Worker
   must reach the VPS directly, not through the zone's bot protection.
4. **Deploy**. `https://relay-upstream.simonlowes.com/healthz` answers `ok`.
5. GitHub > Settings > Secrets and variables > Actions: **Variables** >
   `RELAY_EGRESS_URL` = `https://relay-upstream.simonlowes.com`; **Secrets** >
   `RELAY_EGRESS_TOKEN` = the token from step 2.
6. Actions > **Deploy Bandcamp relay** > Run workflow. The job points the
   Worker at the helper and `/health` should report `ok: true`.

If Bandcamp ever starts challenging the VPS too, `/health` says so (the
`upstream` object carries the status, title and a snippet) and the site uses
its own player until it recovers.

## Deploy the Worker

The Worker is deployed by GitHub Actions
(`.github/workflows/deploy-bandcamp-proxy.yml`): on every merge to `main` that
touches this directory, and on demand from the Actions tab ("Deploy Bandcamp
relay" > "Run workflow"). One-time setup, in the Cloudflare account that owns
`simonlowes.com`:

1. Cloudflare dashboard > profile icon > **My Profile** > **API Tokens** >
   **Create Token** > template **Edit Cloudflare Workers**. Under **Account
   Resources** pick the account that owns `simonlowes.com`; under **Zone
   Resources** choose **Include > Specific zone > simonlowes.com**. Leave the
   template's permissions as they are: **Workers Scripts: Edit** (account)
   creates and updates the Worker, and **Workers Routes: Edit** (zone) lets
   `wrangler deploy` create the `player.simonlowes.com` custom domain.
   Cloudflare adds the DNS record and issues the certificate itself, so the
   token needs no DNS or SSL permission. If the token screen offers Workers
   _roles_ instead of these permissions, choose **Workers > Admin** (product
   scope): creating a Worker that does not exist yet needs Admin, Editor is
   enough once it exists. Continue, create, copy the token.
2. GitHub repository > **Settings** > **Secrets and variables** > **Actions**
   > **New repository secret**: name `CLOUDFLARE_API_TOKEN`, value the token.
   > `CLOUDFLARE_ACCOUNT_ID` is optional: wrangler picks the account itself when
   > the token can see exactly one; add it (or `account_id` in `wrangler.toml`)
   > if the deploy log says "More than one account available".
3. **Actions** > **Deploy Bandcamp relay** > **Run workflow**. The job deploys
   and then waits for `https://player.simonlowes.com/health` to answer. A
   warning instead of a pass means the Worker is live but Bandcamp is
   challenging it at the moment; the site uses its own player until it
   recovers. Without a terminal, wrangler replaces any conflicting DNS record
   or custom domain on `player.simonlowes.com` without asking.

The same deploy works from a machine with the Cloudflare login:

```bash
cd workers/bandcamp-proxy
npm install
npx wrangler login          # once
npx wrangler deploy         # creates the worker and the player.simonlowes.com DNS record
curl https://player.simonlowes.com/health
```

`wrangler deploy` provisions the custom domain from `wrangler.toml`. If the
zone is on a different account, add `account_id` to `wrangler.toml`.

## Check it is working

- `https://player.simonlowes.com/health` returns `{"ok":true,...}`.
- `https://player.simonlowes.com/EmbeddedPlayer/album=2665327263/size=large/bgcol=0a0a0f/linkcol=00d4ff/transparent=true/tracklist=false/artwork=small/`
  shows the player; every request in the browser's network panel is to
  `player.simonlowes.com` (plus Google Tag Manager, which Bandcamp's own
  script injects and which blockers may drop harmlessly).
- `npx wrangler tail` streams live requests.

## Notes

- Nothing is cached except the hashed script, style and artwork files (one
  day at Cloudflare's edge). Audio is streamed through with `Range` requests
  and never stored.
- Play statistics (`/stat_record`) and stream-URL refreshes are passed to
  Bandcamp, with the page's `Referer`, so plays are attributed as usual.
- The relay identifies itself with its own `User-Agent`. Bandcamp's bot
  protection may start challenging it; `/health` then reports `ok: false`
  and the site uses its own player until it recovers.
