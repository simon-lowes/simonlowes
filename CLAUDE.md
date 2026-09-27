# Simon Lowes Website - CLAUDE.md

## Project Overview

Official website for Simon Lowes, an alternative rock musician, singer-songwriter, and guitarist.

**Live site:** https://simonlowes.com
**Repo:** https://github.com/simon-lowes/simonlowes

## Tech Stack

- **Framework:** Astro (static site generator)
- **Content:** Markdown / MDX posts in the repo, written with Claude (see "Blog posts" below); no CMS
- **3D Graphics:** Three.js (starfield background with parallax)
- **Animations:** GSAP
- **Unit Testing:** Vitest
- **E2E Testing:** Playwright
- **Accessibility Testing:** axe-core + vitest-axe
- **Linting:** ESLint + Stylelint
- **Formatting:** Prettier (with prettier-plugin-astro)
- **Pre-commit:** Husky + lint-staged
- **Hosting:** Dokploy on VPS (self-hosted), IP 76.13.255.213
- **Domain:** Cloudflare (DNS managed there)
- **Internal domain:** simonlowes.simonlowes.cloud

## Hosting & Deployment

- Self-hosted on Dokploy VPS at 76.13.255.213
- Domains: `simonlowes.com` and `www.simonlowes.com`
- DNS managed via Cloudflare (A record + CNAME, proxied)
- Email forwarding via SimpleLogin (MX records)
- AEO: `/public/llms.txt` for AI crawlers, OpenAI domain verification in place

## Site Features

- Three.js animated starfield background with 3 parallax layers
- Glass-morphism UI design with cyan accent (#00d4ff)
- Bandcamp player in the top glass bar (see "Bandcamp Player" below)
- Blog using Astro content collections
- Mobile responsive with reduced motion support
- Social links: Spotify, Apple Music, YouTube Music, Bandcamp, YouTube, Instagram

## Music Platforms

Spotify, Apple Music, YouTube Music, Bandcamp, YouTube, Instagram (links in site footer and `/public/llms.txt`)

## Key Commands

```bash
# Development
npm run dev           # astro dev (drafts are visible here)
npm run build         # astro build
npm run preview       # Preview production build

# Testing
npm test              # Run unit tests (vitest run)
npm run test:watch    # Run unit tests in watch mode
npm run test:coverage # Run unit tests with coverage
npm run test:e2e      # Run Playwright E2E tests
npm run test:e2e:ui   # Run E2E tests with Playwright UI

# Linting & Formatting
npm run lint          # ESLint check
npm run lint:fix      # ESLint auto-fix
npm run lint:css      # Stylelint CSS check
npm run lint:css:fix  # Stylelint auto-fix
npm run format        # Prettier format all files
npm run format:check  # Prettier check (no write)
```

## Pre-commit Pipeline

Husky runs `lint-staged` on every commit. lint-staged config (from package.json):

- `*.{js,ts,astro}` -- ESLint fix + Prettier
- `*.css` -- Stylelint fix + Prettier
- `*.{md,json}` -- Prettier

## GitHub Repository Configuration

**Branch protection on `main`** (configured Jan 2026):

- Required status checks: Lint & Format, Unit Tests, Build, E2E Tests
- Strict mode: branches must be up-to-date before merging
- No required PR reviews (solo project - automated checks are the safety net)

**Dependabot auto-merge**: Enabled. Patch and minor version PRs auto-approve and auto-merge after CI passes. Major version bumps still require manual review. There is no AI review step (see "Claude GitHub Actions" below).

**Security rationale**: CI runs full test suite including Lighthouse audits. Automated checks gate all merges.

## Directory Structure

```
src/
  components/       # Astro components (SpaceBackground, MotionPermissionPrompt, BandcampPlayer, SocialLinks)
  components/post/  # Building blocks for designed MDX posts (Lead, Callout, Reveal, Figure, Track, Embed)
  data/             # Site data (bandcamp.ts: the release and relay; tracks.ts: self-hosted fallback)
  content/          # Content collections (blog posts in Markdown or MDX)
  content.config.ts # Content collection schemas
  layouts/          # Page layouts (BaseLayout, BlogLayout)
  pages/            # Route pages (index, blog, 404)
  scripts/          # Client-side TypeScript (starfield, deepsky, galaxy, encounters, quality, parallax, layout)
  styles/           # CSS (glass-effects, etc.)
tests/
  *.test.js         # Unit tests (a11y, animation, bandcamp, bandcamp-proxy, dom, encounters, galaxy-shapes, quality, tracks, utils)
  e2e/              # Playwright E2E tests (bandcamp-player, blog, homepage, visual)
public/
  css/              # Global stylesheet
  icons/            # Platform icons
  images/           # Site images
  llms.txt          # AEO file for AI crawlers
```

## Bandcamp Player

`src/components/BandcampPlayer.astro` is the site player: the fixed glass bar at the top of the homepage and every blog page holds Bandcamp's embedded player for the release in `src/data/bandcamp.ts` (how to find the release ID is in that file). From 768px it is the 120px size with artwork, below that the 42px strip, chosen by the same media query in CSS and script. The bar is `transition:persist`ed so playback survives in-site navigation.

Bandcamp's player is HTML from bandcamp.com whose script, styles, artwork and audio come from `*.bcbits.com`; content blockers, Pi-hole lists and strict browsers sometimes allow the first and block the second, which leaves an empty iframe that still fires `load`. So the bar proves the player before showing it, in this order:

1. **Bandcamp's own embed.** Both bandcamp.com and s4.bcbits.com are probed (HEAD, no-cors), and the facade is hidden only when the player posts its `playerinited` message (origin- and source-checked). A slow embed is never lost: after a 10 s grace the next stage shows while the iframe keeps loading, and Bandcamp takes the bar back once ready if nothing is playing.
2. **The first-party relay** at `player.simonlowes.com` (`workers/bandcamp-proxy`, a Cloudflare Worker): the same player served through the site's own host, so a blocked CDN does not matter. Used only if its `/health` says Bandcamp is answering it with a real player (Bandcamp's bot protection can challenge the relay at any time). Deploy and checks are in the worker's README; `BANDCAMP_PROXY_ORIGIN` in `src/data/bandcamp.ts` names it, empty disables it.
3. **The native fallback**: a glass player streaming the self-hosted files in `src/data/tracks.ts` (currently the archived "Never There" excerpt, a placeholder: the released tracks are not self-hosted). With no tracks listed the facade stays, linking to Bandcamp.

The CSP reference in `public/_headers` allows the frame and the probes. The live site (checked September 2026) sends only `content-security-policy: frame-ancestors 'none'`, so nothing is restricted; if the full CSP is ever applied in Cloudflare or Traefik, keep `frame-src`, `connect-src` and `media-src` from that file, and add `https://player.simonlowes.com` to `frame-src` and `connect-src`.

## Blog posts

There is no CMS. Posts are files in `src/content/blog/` (front matter schema in `src/content.config.ts`), written with Claude and shipped through a PR; the `/new-post` skill (`.claude/skills/new-post/SKILL.md`) holds the full recipe.

- **Plain posts** are `.md`. **Designed posts** are `.mdx` and compose the kit in `src/components/post/`: `Lead`, `Callout`, `Reveal` (scroll-in, reduced-motion aware), `Figure`, `Track` (self-hosted audio) and `Embed` (click-to-load YouTube or Bandcamp, nothing third-party fetched on page view). `src/content/blog/post-kit.mdx` is a permanent draft that exercises every component; drafts render in `npm run dev` only and are excluded from the build and the listing.
- **Images** go in `public/images/blog/<slug>/`, web-sized. Large audio and video stay on Cloudflare R2 (`media.simonlowes.com`) and are referenced by URL. The old `workers/media-api` upload worker authenticated with TinaCMS tokens and is no longer used by the site.

TinaCMS was removed in September 2026 (its build step broke every deploy since March). Sveltia CMS replaced it briefly the same month and was removed the same day, before its OAuth worker was ever deployed: a form editor cannot produce designed posts, and writing them here can. The `TINA_CLIENT_ID` and `TINA_TOKEN` variables in Dokploy and the GitHub secrets of the same names can be deleted.

## Deployment Build (Dokploy + Nixpacks)

Dokploy builds the site with Nixpacks: `npm ci`, then `npm run build` (`astro build`). `nixpacks.toml` pins a newer nixpkgs archive so `nodejs_22` resolves to 22.23.x; Nixpacks' own archive gives 22.11.0, which Astro 7 refuses (`>=22.12.0`), and `package.json` `engines.node` records the same floor. If a deploy fails, read the log past the `npm ci` warnings: the real error is in the `npm run build` step.

## Starfield

`src/scripts/starfield.ts` (Three.js + `postprocessing`) draws the background on every page. Since September 2026 it has three parts:

- **Deep-sky backdrop** (`src/scripts/deepsky.ts`): an always-on Milky Way band and nebula clouds, fractal noise rendered to a small offscreen texture and stretched over the screen with slow drift and a little mouse parallax. Palette is the site cyan, magenta and violet with a dusty core. The texture width, noise octaves and re-render cadence come from the quality tier, so it runs on phones too.
- **Hero galaxy** (`src/scripts/galaxy.ts`, formations in `src/scripts/galaxy-shapes.ts`): thousands of particles that drift as a loose cloud, gather into a three-arm spiral with a white-hot core, turn, and loosen again on a fixed timeline. Both formations are vertex attributes, so the morph, spin and drift all run in the vertex shader on plain WebGL. Moving the pointer brings out more particles and ripples the ones under the cursor; a click or tap (and each navigation) surges the full set and forms the spiral at once. Particle count comes from the tier. It sits right of centre on wide screens and centred, smaller, on phones. Deliberately no glyphs or logos.
- **Encounters** (`src/scripts/encounters.ts`): planets, galaxies and nebulae spawn probabilistically per frame; the pacing (phases reached within 20 s, each kind roughly once a minute, a few objects seeded before the first frame) lives there and is unit-tested. Raymarched volumetric nebulae run on HIGH and ULTRA.
- **Quality tiers** (`src/scripts/quality.ts`): LOW / MEDIUM / HIGH / ULTRA. The GPU-name match is only the starting guess; a frame-time probe drops a tier when frames run slow (and never climbs back to it) and climbs one after a few windows of headroom. Phones are capped at MEDIUM. Unknown desktops start at HIGH. A visitor can pin a tier with the `starfield-quality-preference` localStorage key.

To eyeball a tier in a headless run, set that key before load and screenshot after a few seconds; SwiftShader is classed LOW by name, so the override is needed.

## Notes

- Pushing to `main` triggers Dokploy auto-deploy
- Respects `prefers-reduced-motion` accessibility setting

## Claude GitHub Actions (removed September 2026)

This repo previously ran `anthropics/claude-code-action` as a `claude-review` job inside the Dependabot auto-merge workflow. It was removed because the job had failed on every PR since July 2026 (expired `CLAUDE_CODE_OAUTH_TOKEN`, plus upstream bugs) and nothing depended on it. Merges are gated by branch protection and the required status checks, not by an AI review. The `CLAUDE_CODE_OAUTH_TOKEN` repository secret can be deleted. To bring it back, see https://code.claude.com/docs/en/github-actions.
