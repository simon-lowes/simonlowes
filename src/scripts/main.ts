/**
 * Main application entry point
 * Handles layout measurements.
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

// View transitions replace the <html> attributes, inline style included, so the
// measured variables are gone after every navigation: measure again as soon as
// the new page is in (before it paints) and once its scripts have run.
document.addEventListener("astro:after-swap", updateLayoutMeasurements);
document.addEventListener("astro:page-load", updateLayoutMeasurements);
