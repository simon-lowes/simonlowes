import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have correct title", async ({ page }) => {
    await expect(page).toHaveTitle("Simon Lowes - Musician");
  });

  test("should have meta description", async ({ page }) => {
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute("content", /Simon Lowes/);
  });

  test("should have Open Graph tags", async ({ page }) => {
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", "Simon Lowes - Musician");
  });

  test("should have skip link for accessibility", async ({ page }) => {
    const skipLink = page.locator(".skip-link");
    await expect(skipLink).toHaveText("Skip to main content");
    await expect(skipLink).toHaveAttribute("href", "#main-content");
  });

  test("should have main content area", async ({ page }) => {
    const main = page.locator("#main-content");
    await expect(main).toBeVisible();
  });

  test("should have blog section", async ({ page }) => {
    const blogPanel = page.locator(".blog-panel");
    await expect(blogPanel).toBeVisible();

    const blogTitle = page.locator(".blog-panel__title");
    await expect(blogTitle).toHaveText("Blog");
  });

  test("should have footer with social links", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();

    // Check for at least some social links
    const socialLinks = footer.locator("a");
    expect(await socialLinks.count()).toBeGreaterThan(5);
  });

  test("social links should open in new tab", async ({ page }) => {
    const socialLinks = page.locator('footer a[target="_blank"]');
    const count = await socialLinks.count();

    for (let i = 0; i < count; i++) {
      const link = socialLinks.nth(i);
      await expect(link).toHaveAttribute("rel", /noopener/);
    }
  });
});

test.describe("Cookie Notice", () => {
  test("should display cookie notice", async ({ page }) => {
    await page.goto("/");
    const cookieNotice = page.locator("#cookie-message");
    await expect(cookieNotice).toBeVisible();
  });

  test("should close when dismiss button clicked", async ({ page }) => {
    await page.goto("/");
    const cookieNotice = page.locator("#cookie-message");
    const dismissBtn = page.locator("[data-cookie-dismiss]");

    await expect(cookieNotice).toBeVisible();
    await dismissBtn.click();
    await expect(cookieNotice).toBeHidden();
  });

  test("should close on Escape key", async ({ page }) => {
    await page.goto("/");
    const cookieNotice = page.locator("#cookie-message");

    await expect(cookieNotice).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(cookieNotice).toBeHidden();
  });
});
