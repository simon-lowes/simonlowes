import { test, expect } from "@playwright/test";

test.describe("Visual Regression", () => {
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
    await expect(page).toHaveScreenshot("blog-index.png", {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test("blog post visual", async ({ page }) => {
    await page.goto("/blog/hello/");
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
