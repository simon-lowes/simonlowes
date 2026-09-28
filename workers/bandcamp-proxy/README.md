# Bandcamp player proxy

A Cloudflare Worker at `player.simonlowes.com` that relays Bandcamp's embedded
player for the site's release so browsers and networks that block Bandcamp's
CDN (`*.bcbits.com`) still get the real player. See the header comment in
`src/index.js` for the routes and the rewrite.

The site tries the official embed first, this proxy second (only after
`/health` says the upstream is answering with a real player), and its own
player last. So a Bandcamp policy change degrades to the site player rather
than to a blank bar.

## Deploy

The Worker is deployed by GitHub Actions
(`.github/workflows/deploy-bandcamp-proxy.yml`): on every merge to `main` that
touches this directory, and on demand from the Actions tab ("Deploy Bandcamp
relay" > "Run workflow"). One-time setup, in the Cloudflare account that owns
`simonlowes.com`:

1. Cloudflare dashboard > profile icon > **My Profile** > **API Tokens** >
   **Create Token** > template **Edit Cloudflare Workers**. Under Zone
   Resources pick `simonlowes.com`; add one more permission row,
   **Zone > DNS > Edit**, so `wrangler` can create the `player` subdomain.
   Continue, create, copy the token.
2. GitHub repository > **Settings** > **Secrets and variables** > **Actions**
   > **New repository secret**: name `CLOUDFLARE_API_TOKEN`, value the token.
   > (`CLOUDFLARE_ACCOUNT_ID` is only needed if the token can see several
   > accounts.)
3. **Actions** > **Deploy Bandcamp relay** > **Run workflow**. The job deploys
   and then waits for `https://player.simonlowes.com/health` to report
   `ok: true`.

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
