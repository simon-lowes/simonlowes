/**
 * Main application entry point
 * Handles layout measurements and Google Analytics.
 * Note: Background animation is handled by Three.js in starfield.ts; the
 * player bar is src/components/BandcampPlayer.astro, which binds itself.
 */

import { setViewportHeight, updateFixedElementHeights } from "./utils";

// =============================================
// Viewport & Layout Setup
// =============================================

setViewportHeight();

function updateLayoutMeasurements(): void {
  setViewportHeight();
  updateFixedElementHeights();
}

// Initial measurement after DOM content loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateLayoutMeasurements);
} else {
  updateLayoutMeasurements();
}

// Update on resize
window.addEventListener("resize", updateLayoutMeasurements);

// =============================================
// Google Analytics
// =============================================

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    dataLayer: unknown[];
    gtag: (..._args: unknown[]) => void;
  }
}

window.dataLayer = window.dataLayer || [];

function gtag(...args: unknown[]): void {
  window.dataLayer.push(args);
}

window.gtag = gtag;
gtag("js", new Date());
gtag("config", "G-7NV4RLT1ZW");
