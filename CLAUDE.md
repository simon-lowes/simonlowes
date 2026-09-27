# Simon Lowes Website - CLAUDE.md

## Project Overview

Official website for Simon Lowes, an alternative rock musician, singer-songwriter, and guitarist.

**Live site:** https://simonlowes.com
**Repo:** https://github.com/simon-lowes/simonlowes

## Tech Stack

- **Framework:** Astro (static site generator)
- **CMS:** TinaCMS (Git-backed headless CMS)
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
# Development (TinaCMS wraps Astro dev/build)
npm run dev           # tinacms dev -c "astro dev" (starts TinaCMS + Astro)
npm run dev:astro     # astro dev only (no TinaCMS)
npm run build         # tinacms build && astro build
npm run build:astro   # astro build only (no TinaCMS)
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
  components/       # Astro components (SpaceBackground, MotionPermissionPrompt, BandcampPlayer)
  data/             # Site data (bandcamp.ts: the release the player streams)
  content/          # Content collections (blog posts in Markdown)
  content.config.ts # Content collection schemas
  layouts/          # Page layouts (BaseLayout, BlogLayout)
  pages/            # Route pages (index, blog, 404)
  scripts/          # Client-side TypeScript (starfield, parallax, layout)
  styles/           # CSS (glass-effects, etc.)
tests/
  *.test.js         # Unit tests (a11y, animation, dom, utils)
  e2e/              # Playwright E2E tests (bandcamp-player, blog, homepage, visual)
public/
  css/              # Global stylesheet
  icons/            # Platform icons
  images/           # Site images
  llms.txt          # AEO file for AI crawlers
```

## Bandcamp Player

`src/components/BandcampPlayer.astro` is the site player: the fixed glass bar at the top of the homepage and every blog page holds Bandcamp's embedded player for the release in `src/data/bandcamp.ts`. The embed is transparent so the glass shows through; from 768px it is the 120px size with artwork, below that the 42px strip, chosen by the same media query in CSS and script. Until the embed loads (and for good while the release `id` is empty) the bar shows a facade with the release title and a link to Bandcamp, so nothing loads from bandcamp.com until an ID is set. How to find the ID is in `src/data/bandcamp.ts`. The CSP reference in `public/_headers` allows `frame-src https://bandcamp.com`. The live site (checked September 2026) sends only `content-security-policy: frame-ancestors 'none'`, so the embed is not blocked; if the full CSP is ever applied in Cloudflare or Traefik, keep that `frame-src` in it. The old self-hosted audio player and `neverthere.mp3` were removed in September 2026.

## Notes

- Pushing to `main` triggers Dokploy auto-deploy
- The starfield uses reduced particle count on mobile for performance
- Respects `prefers-reduced-motion` accessibility setting

## Claude GitHub Actions (removed September 2026)

This repo previously ran `anthropics/claude-code-action` as a `claude-review` job inside the Dependabot auto-merge workflow. It was removed because the job had failed on every PR since July 2026 (expired `CLAUDE_CODE_OAUTH_TOKEN`, plus upstream bugs) and nothing depended on it. Merges are gated by branch protection and the required status checks, not by an AI review. The `CLAUDE_CODE_OAUTH_TOKEN` repository secret can be deleted. To bring it back, see https://code.claude.com/docs/en/github-actions.
