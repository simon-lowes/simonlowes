# Codebase Improvements TODO

## Completed Improvements

### P0 - Critical (Done)

- [x] **Image Optimization** - Converted images from JPEG (11MB total) to WebP (~520KB, 95% reduction)
- [x] **Blog Listing Page** - Implemented `src/pages/blog/index.astro` with full styling
- [x] **Blog Post Page** - Implemented `src/pages/blog/[...slug].astro` with MDX rendering
- [x] **SEO Meta Tags** - Added Open Graph, Twitter Card, and canonical URLs to all pages
- [x] **404 Page** - Created custom error page at `src/pages/404.astro`

### P1 - Important (Done)

- [x] **ESLint** - Added with Astro plugin (`eslint.config.js`)
- [x] **Prettier** - Added with Astro plugin (`.prettierrc`)
- [x] **EditorConfig** - Added `.editorconfig` for consistency
- [x] **TypeScript Config** - Added `tsconfig.json` with strict mode
- [x] **BaseLayout** - Created reusable layout at `src/layouts/BaseLayout.astro`
- [x] **Accessibility Testing** - Added axe-core tests in `tests/a11y.test.js`
- [x] **Security Headers** - Added `public/_headers` with CSP, X-Frame-Options, etc.
- [x] **TypeScript Migration** - Converted JS to TypeScript (`src/scripts/utils.ts`, `src/scripts/main.ts`)
- [x] **Pre-commit Hooks** - Added Husky + lint-staged (`.husky/pre-commit`)
- [x] **E2E Tests** - Added Playwright with 29 tests (`tests/e2e/`)
- [x] **Stylelint** - Added CSS linting (`.stylelintrc.json`)

### P2 - Nice to Have (Done)

- [x] **More Blog Posts** - Added 3 music-themed posts (`src/content/blog/`)
- [x] **Visual Regression** - Added screenshot testing (`tests/e2e/visual.spec.ts`)
- [x] **GitHub Templates** - Added issue/PR templates (`.github/ISSUE_TEMPLATE/`, `.github/PULL_REQUEST_TEMPLATE.md`)
- [x] **Dependabot** - Added dependency update automation (`.github/dependabot.yml`)
- [x] **CI Improvements** - Expanded workflow with lint, build, E2E, Lighthouse (`.github/workflows/test.yml`)
- [x] **Service Worker** - Added PWA support with @vite-pwa/astro (`astro.config.mjs`)
- [x] **Error Tracking** - Added Sentry integration (`src/scripts/sentry.ts`)

## All Improvements Complete!

## New Scripts Available

```bash
npm run lint          # Run ESLint
npm run lint:fix      # Run ESLint with auto-fix
npm run format        # Format with Prettier
npm run format:check  # Check formatting
npm run test:e2e      # Run Playwright E2E tests
npm run test:e2e:ui   # Run Playwright with UI
npm run lint:css      # Run Stylelint
npm run lint:css:fix  # Run Stylelint with auto-fix
```

## Files Added/Modified

### New Files (P0/P1)

- `src/pages/blog/index.astro` - Blog listing page
- `src/pages/blog/[...slug].astro` - Blog post detail page
- `src/pages/404.astro` - Custom 404 page
- `src/layouts/BaseLayout.astro` - Reusable base layout
- `src/scripts/utils.ts` - Typed utility functions
- `src/scripts/main.ts` - Main app entry point (canvas, audio player)
- `tests/a11y.test.js` - Accessibility tests
- `tests/e2e/homepage.spec.ts` - Homepage E2E tests (11 tests)
- `tests/e2e/audio-player.spec.ts` - Audio player E2E tests (8 tests)
- `tests/e2e/blog.spec.ts` - Blog pages and 404 E2E tests (10 tests)
- `playwright.config.ts` - Playwright configuration
- `.husky/pre-commit` - Pre-commit hook for linting/formatting
- `.stylelintrc.json` - Stylelint configuration
- `eslint.config.js` - ESLint configuration
- `.prettierrc` - Prettier configuration
- `.prettierignore` - Prettier ignore patterns
- `.editorconfig` - Editor configuration
- `tsconfig.json` - TypeScript configuration
- `public/_headers` - Security headers

### New Files (P2)

- `src/content/blog/new-music.md` - Blog post: New Music Coming Soon
- `src/content/blog/studio-diary.md` - Blog post: Studio Diary
- `src/content/blog/gear-and-setup.md` - Blog post: Gear and Setup
- `tests/e2e/visual.spec.ts` - Visual regression tests (4 tests)
- `.github/ISSUE_TEMPLATE/bug_report.md` - Bug report template
- `.github/ISSUE_TEMPLATE/feature_request.md` - Feature request template
- `.github/ISSUE_TEMPLATE/config.yml` - Issue template config
- `.github/PULL_REQUEST_TEMPLATE.md` - PR template
- `.github/dependabot.yml` - Dependabot configuration
- `lighthouserc.json` - Lighthouse CI configuration
- `src/scripts/sentry.ts` - Sentry error tracking
- `.env.example` - Environment variables template

### Modified Files

- `src/pages/index.astro` - Added OG/Twitter meta tags, PWA meta, updated script import
- `src/layouts/BaseLayout.astro` - Added PWA meta tags
- `astro.config.mjs` - Added PWA integration
- `.github/workflows/test.yml` - Expanded CI with lint, build, E2E, Lighthouse
- `package.json` - Added scripts, dependencies
- `public/_headers` - Added Sentry to CSP

### Removed Files

- `public/JS/script.js` - Replaced by `src/scripts/main.ts`
- `public/JS/script.min.js` - No longer needed (Vite handles minification)
- `public/JS/utils.js` - Replaced by `src/scripts/utils.ts`

## Test Coverage

All tests passing:

- **Unit tests (Vitest)**: 94 tests
  - Unit tests for utilities
  - DOM manipulation tests
  - Animation control tests
  - Accessibility tests (6)
- **E2E tests (Playwright)**: 33 tests
  - Homepage tests (11)
  - Audio player tests (8)
  - Blog pages & 404 tests (10)
  - Visual regression tests (4)

## Configuration Notes

### Sentry Error Tracking

Set `PUBLIC_SENTRY_DSN` environment variable on your hosting platform to enable error tracking.

### Visual Regression

- Baseline snapshots stored in `tests/e2e/snapshots/`
- Update baselines with: `npm run test:e2e -- --update-snapshots`
- Canvas is hidden during homepage screenshot for stability

### PWA

- Service worker auto-generated during build
- Manifest at `/manifest.webmanifest`
- Caches static assets for offline support
