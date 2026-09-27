# cms-auth

GitHub OAuth proxy for the blog editor at https://simonlowes.com/admin/ (Sveltia CMS). It is Sveltia's reference worker, [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) (MIT), vendored unchanged in `src/index.js`.

## One-time setup

1. Create a GitHub OAuth App at https://github.com/settings/developers → OAuth Apps → New:
   - Homepage URL: `https://simonlowes.com`
   - Authorization callback URL: `https://cms-auth.simonlowes.com/callback`
2. In this folder:

   ```bash
   npm install
   npx wrangler login
   npx wrangler secret put GITHUB_CLIENT_ID
   npx wrangler secret put GITHUB_CLIENT_SECRET
   npx wrangler deploy
   ```

   `wrangler.toml` binds the custom domain `cms-auth.simonlowes.com` on the Cloudflare zone, the same way `workers/media-api` does.

3. Open https://simonlowes.com/admin/ and sign in with GitHub.

`ALLOWED_DOMAINS` in `wrangler.toml` limits which site hostnames may complete the sign-in.
