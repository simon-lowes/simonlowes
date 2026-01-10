import { test, expect } from "@playwright/test";

// Skip visual regression tests in CI - they're platform-dependent (darwin vs linux)
// and flaky with animated canvas. Run locally to verify visuals.
const isCI = process.env.CI === "true";

test.describe("Visual Regression", () => {
  test.skip(isCI, "Visual tests skipped in CI - platform-dependent snapshots");

  test("homepage visual", async ({ page }) => {
    await page.goto("/");
    // Dismiss cookie notice for consistent screenshots
    await page.keyboard.press("Escape");
    // Hide animated canvas for stable screenshots
    await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (canvas) canvas.style.visibility = "hidden";
    });
    await expect(page).toHaveScreenshot("homepage.png", {
      fullPage: true,
      maxDiffPixels: 500,
    });
  });

  test("blog index visual", async ({ page }) => {
    await page.goto("/blog/");
    // Hide animated canvas for stable screenshots
    await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (canvas) canvas.style.visibility = "hidden";
    });
    await expect(page).toHaveScreenshot("blog-index.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("blog post visual", async ({ page }) => {
    await page.goto("/blog/hello/");
    // Hide animated canvas for stable screenshots
    await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      if (canvas) canvas.style.visibility = "hidden";
    });
    await expect(page).toHaveScreenshot("blog-post.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("404 page visual", async ({ page }) => {
    await page.goto("/non-existent-page/");
    await expect(page).toHaveScreenshot("404-page.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });
});
