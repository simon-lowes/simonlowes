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
  describe("Audio Player Component", () => {
    it("should have no accessibility violations", async () => {
      document.body.innerHTML = `
        <div
          class="audio-player"
          id="audio-player"
          role="region"
          aria-label="Audio player for Never There"
        >
          <audio id="myAudio" src="/neverthere.mp3" preload="metadata"></audio>

          <button
            type="button"
            class="audio-player__play"
            id="audio-play-btn"
            aria-label="Play Never There"
            aria-pressed="false"
          >
            <svg class="icon-play" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>

          <span class="audio-player__time" id="audio-time-elapsed" aria-live="off">0:00</span>

          <input
            type="range"
            class="audio-player__seek"
            id="audio-seek"
            min="0"
            max="100"
            value="0"
            step="0.1"
            aria-label="Seek slider"
          />

          <span class="audio-player__time" id="audio-time-remaining" aria-live="off">-0:00</span>

          <div class="audio-player__volume">
            <button
              type="button"
              class="audio-player__mute"
              id="audio-mute-btn"
              aria-label="Mute audio"
              aria-pressed="false"
            >
              <svg class="icon-volume" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M3 9v6h4l5 5V4L7 9H3z" />
              </svg>
            </button>
            <input
              type="range"
              class="audio-player__volume-slider"
              id="audio-volume"
              min="0"
              max="100"
              value="75"
              step="1"
              aria-label="Volume slider"
            />
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
