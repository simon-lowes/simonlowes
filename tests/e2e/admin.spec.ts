import { test, expect } from "@playwright/test";

test.describe("Blog editor (Sveltia CMS)", () => {
  test("serves the editor page with a pinned Sveltia build", async ({ request }) => {
    // Read the HTML as served: once Sveltia boots it rewrites the title and
    // body, and whether it boots depends on reaching unpkg from the runner.
    const response = await request.get("/admin/");
    expect(response.status()).toBe(200);
    const html = await response.text();

    expect(html).toContain("<title>Simon Lowes · Blog editor</title>");
    expect(html).toMatch(
      /<script src="https:\/\/unpkg\.com\/@sveltia\/cms@\d+\.\d+\.\d+\/dist\/sveltia-cms\.js" type="module">/
    );
    // Not for search engines
    expect(html).toContain('<meta name="robots" content="noindex" />');
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
