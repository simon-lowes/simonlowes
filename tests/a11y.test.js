/**
 * Accessibility tests using axe-core
 * Tests core HTML structures for WCAG compliance
 */

import { describe, it, expect } from "vitest";

// Simple axe runner for vitest
async function runAxe(element) {
  const { default: axeCore } = await import("axe-core");
  return axeCore.run(element);
}

// Custom matcher
function toHaveNoViolations(results) {
  const violations = results.violations || [];
  const pass = violations.length === 0;

  if (pass) {
    return {
      pass: true,
      message: () => "Expected accessibility violations but found none",
    };
  }

  const messages = violations.map((v) => {
    const nodes = v.nodes.map((n) => n.html).join("\n  ");
    return `${v.id}: ${v.description}\n  Impact: ${v.impact}\n  Elements:\n  ${nodes}`;
  });

  return {
    pass: false,
    message: () =>
      `Found ${violations.length} accessibility violation(s):\n\n${messages.join("\n\n")}`,
  };
}

expect.extend({ toHaveNoViolations });

describe("Accessibility Tests", () => {
  describe("Bandcamp Player Component", () => {
    it("should have no accessibility violations", async () => {
      document.body.innerHTML = `
        <div
          class="bc-player"
          id="bandcamp-player"
          role="region"
          aria-label="Bandcamp player: Slow Motion by Simon Lowes"
        >
          <div class="bc-player__frame">
            <a
              class="bc-player__facade"
              href="https://simonlowes.bandcamp.com/album/slow-motion"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="bc-player__mark" aria-hidden="true">
                <img src="/icons/bandcamp.png" alt="" width="22" height="22" />
              </span>
              <span class="bc-player__text">
                <span class="bc-player__title">Slow Motion</span>
                <span class="bc-player__sub">Simon Lowes · stream and buy on Bandcamp</span>
              </span>
              <span class="bc-player__cta">
                Listen on Bandcamp <span aria-hidden="true">&nearr;</span>
                <span class="sr-only"> (opens in new tab)</span>
              </span>
            </a>
          </div>
        </div>
      `;

      const results = await runAxe(document.body);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Cookie Notice Dialog", () => {
    it("should have no accessibility violations", async () => {
      document.body.innerHTML = `
        <div
          id="cookie-message"
          role="dialog"
          aria-label="Cookie notice"
          aria-modal="true"
          tabindex="-1"
        >
          <button
            type="button"
            class="cookie-dismiss"
            aria-label="Close cookie notice"
          >
            &times;
          </button>
          <div class="cookie-header">
            <span class="cookie-icon" aria-hidden="true"></span>
            <h2>Cookie Notice</h2>
          </div>
          <p>
            This site does not currently use cookies or similar trackers.
          </p>
        </div>
      `;

      const results = await runAxe(document.body);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Navigation and Footer", () => {
    it("should have no accessibility violations for social links", async () => {
      document.body.innerHTML = `
        <footer role="contentinfo">
          <nav aria-label="Social media and music platforms">
            <ul>
              <li>
                <a
                  href="https://simonlowes.bandcamp.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Visit Simon Lowes on BandCamp (opens in new tab)"
                >
                  <img src="/icons/bandcamp.png" alt="BandCamp icon" />
                </a>
              </li>
              <li>
                <a
                  href="https://open.spotify.com/artist/123"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Listen to Simon Lowes on Spotify (opens in new tab)"
                >
                  <img src="/icons/spotify.png" alt="Spotify icon" />
                </a>
              </li>
            </ul>
          </nav>
        </footer>
      `;

      const results = await runAxe(document.body);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Skip Link", () => {
    it("should have no accessibility violations", async () => {
      document.body.innerHTML = `
        <a class="skip-link" href="#main-content">Skip to main content</a>
        <main id="main-content">
          <h1>Page Content</h1>
          <p>Main content here.</p>
        </main>
      `;

      const results = await runAxe(document.body);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Blog Post List", () => {
    it("should have no accessibility violations", async () => {
      document.body.innerHTML = `
        <section class="blog-panel" aria-label="Blog">
          <header class="blog-panel__header">
            <h2 class="blog-panel__title">Blog</h2>
            <p class="blog-panel__subtitle">Latest updates and notes.</p>
          </header>
          <div class="blog-panel__content">
            <ul class="blog-panel__list">
              <li class="blog-panel__item">
                <a href="/blog/hello/">Hello World</a>
                <small class="blog-panel__date">
                  <time datetime="2025-12-24">2025-12-24</time>
                </small>
              </li>
            </ul>
            <p class="blog-panel__more">
              <a href="/blog/">All posts</a>
            </p>
          </div>
        </section>
      `;

      const results = await runAxe(document.body);
      expect(results).toHaveNoViolations();
    });
  });

  describe("Form Controls", () => {
    it("range inputs should have accessible labels", async () => {
      document.body.innerHTML = `
        <main>
          <div>
            <input
              type="range"
              id="volume"
              min="0"
              max="100"
              value="50"
              aria-label="Volume control"
            />
            <input
              type="range"
              id="seek"
              min="0"
              max="100"
              value="0"
              aria-label="Seek position"
            />
          </div>
        </main>
      `;

      const results = await runAxe(document.body);
      expect(results).toHaveNoViolations();
    });
  });
});
