import { test, expect } from "@playwright/test";

test.describe("Blog editor (Sveltia CMS)", () => {
  test("serves the editor page with a pinned Sveltia build", async ({ page }) => {
    const response = await page.goto("/admin/");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle(/Blog editor/);

    const script = page.locator('script[src*="@sveltia/cms@"]');
    await expect(script).toHaveCount(1);
    await expect(script).toHaveAttribute("type", "module");

    // Not for search engines
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex");
  });

  test("serves a config that edits the blog collection through the OAuth worker", async ({
    request,
  }) => {
    const response = await request.get("/admin/config.yml");
    expect(response.status()).toBe(200);
    const config = await response.text();

    expect(config).toContain("repo: simon-lowes/simonlowes");
    expect(config).toContain("base_url: https://cms-auth.simonlowes.com");
    expect(config).toContain("folder: src/content/blog");
    // Every field the Astro content schema knows about is editable
    for (const field of [
      "name: title",
      "name: date",
      "name: description",
      "name: draft",
      "name: heroImage",
      "name: heroImageAlt",
      "name: media",
      "name: body",
    ]) {
      expect(config).toContain(field);
    }
  });

  test("keeps the editor out of the sitemap and robots", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toContain("Disallow: /admin/");
    const sitemap = await (await request.get("/sitemap-0.xml")).text();
    expect(sitemap).not.toContain("/admin");
  });
});
