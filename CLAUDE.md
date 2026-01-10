# simonlowes.com - Personal Website

## AUTONOMOUS EXECUTION RULES

When running unattended: Never ask questions, never present options, make all decisions yourself, proceed immediately.

## Project Overview

**simonlowes.com** - Personal website built with Astro, featuring blog/content capabilities.

## Tech Stack

- **Framework**: Astro 5
- **Content**: MDX support
- **Testing**: Vitest with happy-dom + axe-core for a11y
- **Linting**: ESLint with Astro plugin
- **Formatting**: Prettier with Astro plugin
- **TypeScript**: Strict mode enabled
- **Features**: RSS feed, Sitemap generation, Security headers

## Key Commands

```bash
npm run dev           # Start dev server
npm run build         # Production build
npm run preview       # Preview production build
npm run test          # Run Vitest tests
npm run test:watch    # Watch mode
npm run test:ui       # Vitest UI
npm run test:coverage # Coverage report
npm run lint          # Run ESLint
npm run lint:fix      # Run ESLint with auto-fix
npm run format        # Format with Prettier
npm run format:check  # Check formatting
```

## Project Structure

```
simonlowes/
  src/
    pages/          # Astro pages (.astro files)
      blog/         # Blog pages (index, [slug])
      404.astro     # Custom 404 page
    components/     # Reusable components
    layouts/        # Page layouts (BaseLayout.astro)
    scripts/        # TypeScript modules (main.ts, utils.ts)
    content/        # MDX content collections
      blog/         # Blog posts (.md/.mdx)
  public/           # Static assets
    images/         # Optimized WebP images
    favicons/       # Favicon files
    _headers        # Security headers (Netlify/CF)
  css/              # Stylesheets
  tests/            # Vitest tests (unit, dom, a11y)
  docs/             # Documentation
  astro.config.mjs  # Astro configuration
  tsconfig.json     # TypeScript configuration
  eslint.config.js  # ESLint configuration
  .prettierrc       # Prettier configuration
```

## Astro Features

- File-based routing in `src/pages/`
- Components can be `.astro`, `.jsx`, `.tsx`
- MDX support via `@astrojs/mdx`
- Auto-generated sitemap via `@astrojs/sitemap`
- RSS feed via `@astrojs/rss`

## Common Tasks

### Adding a New Page

1. Create `.astro` file in `src/pages/`
2. Use existing layout from `src/layouts/`
3. Add to navigation if needed
4. Write test in `tests/`

### Adding Blog Content

1. Create MDX file in content directory
2. Add frontmatter (title, date, etc.)
3. Build to verify rendering

### Updating Styles

1. Edit files in `css/` folder
2. Or use scoped styles in `.astro` components
3. Test responsive behavior

### Deployment

1. Run `npm run build`
2. Deploy `dist/` folder to hosting
3. Sitemap auto-generated at `/sitemap.xml`

## Testing

- Tests in `tests/` directory
- Uses happy-dom for DOM simulation
- Run `npm run test` before deploying

## Reference Files

- `astro.config.mjs` - Astro configuration
- `docs/` - Additional documentation
- `TESTING.md` - Testing guidelines
