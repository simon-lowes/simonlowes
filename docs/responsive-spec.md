# Responsive Redesign Specification

The site currently does not render optimally on smaller screens (phones and tablets).  
Update the HTML and CSS to make `simonlowes.com` fully responsive while preserving the existing look and feel.

## Scope

- Files to modify:
  - `index.html`
  - `css/style.css`
- Add a proper responsive `<meta name="viewport" ...>` tag in `index.html`.
- Refactor layout using modern CSS (Flexbox and/or Grid) so content scales cleanly from 320px wide mobiles up to large desktop screens.
- Remove any layout assumptions that rely on fixed heights or fixed positioning that breaks on small screens (e.g. the fixed footer) and replace with responsive behaviour.
- Ensure the hero content, background canvas, audio controls, and social icons:
  - Do not cause horizontal scrolling on small screens.
  - Have readable text and tap-friendly hit areas.
  - Wrap or stack nicely when there is not enough width.

## Breakpoints / Behaviour

- **< 480px:** Single-column layout, stacked content, comfortable spacing.
- **480–1024px:** Tablet layout; mostly single column with improved spacing and font scaling.
- **> 1024px:** Desktop layout using a centred max-width container.

## Acceptance Criteria

- No horizontal scrollbars at 320px, 375px, 768px, 1024px, 1440px.
- Footer and social icons remain visible and usable at all screen sizes without overlapping the main content.
- Site looks good in latest Chrome, Safari, and Firefox on desktop and mobile.
