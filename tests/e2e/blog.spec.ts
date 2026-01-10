import { test, expect } from "@playwright/test";

test.describe("Blog Pages", () => {
  test("blog index should load", async ({ page }) => {
    await page.goto("/blog/");
    await expect(page).toHaveTitle(/Blog.*Simon Lowes/);
  });

  test("blog index should have back link to home", async ({ page }) => {
    await page.goto("/blog/");
    const backLink = page.locator('a[href="/"]');
    await expect(backLink).toBeVisible();
  });

  test("blog index should list posts", async ({ page }) => {
    await page.goto("/blog/");
    const blogList = page.locator(".blog-list");
    await expect(blogList).toBeVisible();
  });

  test("blog post should load", async ({ page }) => {
    await page.goto("/blog/hello/");
    await expect(page).toHaveTitle(/Hello.*Simon Lowes/);
  });

  test("blog post should have navigation", async ({ page }) => {
    await page.goto("/blog/hello/");

    // Use .first() since there are multiple links to /blog/
    const allPostsLink = page.locator('a[href="/blog/"]').first();
    await expect(allPostsLink).toBeVisible();

    const homeLink = page.locator('a[href="/"]').first();
    await expect(homeLink).toBeVisible();
  });

  test("blog post should have structured data", async ({ page }) => {
    await page.goto("/blog/hello/");
    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toBeAttached();

    const content = await jsonLd.textContent();
    expect(content).toContain("BlogPosting");
    expect(content).toContain("Simon Lowes");
  });

  test("homepage blog panel links to posts", async ({ page }) => {
    await page.goto("/");

    // Click on the first blog post link
    const firstPostLink = page.locator(".blog-panel__list a").first();
    const postTitle = await firstPostLink.textContent();

    await firstPostLink.click();

    // Should navigate to blog post
    await expect(page).toHaveURL(/\/blog\/.+\//);

    // Post title should be in the page
    const pageTitle = page.locator(".blog-post__title");
    await expect(pageTitle).toHaveText(postTitle || "");
  });

  test("'All posts' link navigates to blog index", async ({ page }) => {
    await page.goto("/");
    const allPostsLink = page.locator('.blog-panel__more a[href="/blog/"]');

    await allPostsLink.click();

    await expect(page).toHaveURL("/blog/");
  });
});

test.describe("404 Page", () => {
  test("should show 404 for non-existent page", async ({ page }) => {
    const response = await page.goto("/non-existent-page/");
    expect(response?.status()).toBe(404);
  });

  test("404 page should have link to homepage", async ({ page }) => {
    await page.goto("/non-existent-page/");
    const homeLink = page.locator('a[href="/"]');
    await expect(homeLink).toBeVisible();
  });
});
