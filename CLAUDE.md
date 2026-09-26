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
- Integrated audio player (featuring "Never There")
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
  components/       # Astro components (SpaceBackground, MotionPermissionPrompt)
  content/          # Content collections (blog posts in Markdown)
  content.config.ts # Content collection schemas
  layouts/          # Page layouts (BaseLayout, BlogLayout)
  pages/            # Route pages (index, blog, 404)
  scripts/          # Client-side TypeScript (starfield, parallax, audio)
  styles/           # CSS (glass-effects, etc.)
tests/
  *.test.js         # Unit tests (a11y, animation, dom, utils)
  e2e/              # Playwright E2E tests (audio-player, blog, homepage, visual)
public/
  css/              # Global stylesheet
  icons/            # Platform icons
  images/           # Site images
  llms.txt          # AEO file for AI crawlers
```

## Design System

The site's design system lives as a Claude artifact: https://claude.ai/artifact/VijWfTF3Kb58BGQqC7jteS (built from this repo at 4ec3968, September 2026). It holds every colour, type, spacing, radius, shadow, blur and duration value the CSS uses, a brand book of usage rules, static renditions of the glass surfaces, audio player, footer, blog panel, prose, cookie notice and motion prompt, and the icon and photo assets. Read its `project/README.md` before any visual change so new work matches the existing values. When the CSS changes, ask for a re-sync from the repo rather than editing the system by hand.

Known gaps recorded there: `freight-sans-pro` is named in the font stack but never loaded (visitors see Helvetica Neue or Arial); the footer icons load from img.icons8.com rather than the copies in `public/icons/`.

## Bandcamp Dock

`src/components/BandcampDock.astro` is the floating Bandcamp player: a pill anchored bottom-right on the footer baseline that opens a glass card with Bandcamp's embedded player. Mounted on the homepage and `BlogLayout`. The release, its URL and the numeric `albumId` live in `src/data/bandcamp.ts`; until `albumId` is set the card shows a link to Bandcamp instead of the embed (how to find the ID is in that file). The iframe is created on first open only, and opening the dock pauses the site's own audio player. Under 768px the pill is icon-only. The CSP reference in `public/_headers` allows `frame-src https://bandcamp.com`.

## Notes

- Pushing to `main` triggers Dokploy auto-deploy
- The starfield uses reduced particle count on mobile for performance
- Respects `prefers-reduced-motion` accessibility setting

## Claude GitHub Actions (removed September 2026)

This repo previously ran `anthropics/claude-code-action` as a `claude-review` job inside the Dependabot auto-merge workflow. It was removed because the job had failed on every PR since July 2026 (expired `CLAUDE_CODE_OAUTH_TOKEN`, plus upstream bugs) and nothing depended on it. Merges are gated by branch protection and the required status checks, not by an AI review. The `CLAUDE_CODE_OAUTH_TOKEN` repository secret can be deleted. To bring it back, see https://code.claude.com/docs/en/github-actions.
