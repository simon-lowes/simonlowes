import { test, expect } from "@playwright/test";

test.describe("Bandcamp player", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Dismiss the cookie notice so it cannot overlap anything
    await page.keyboard.press("Escape");
  });

  test("sits in the top bar as a labelled region", async ({ page }) => {
    const player = page.locator("#bandcamp-player");
    await expect(player).toBeVisible();
    await expect(player).toHaveAttribute("role", "region");
    await expect(player).toHaveAttribute("aria-label", /Bandcamp player/);

    // The bar is fixed at the top of the viewport
    const box = await player.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeLessThan(100);
  });

  test("facade links to the release on Bandcamp in a new tab", async ({ page }) => {
    const facade = page.locator("#bandcamp-player .bc-player__facade");
    await expect(facade).toHaveAttribute("href", /bandcamp\.com/);
    await expect(facade).toHaveAttribute("target", "_blank");
    await expect(facade).toHaveAttribute("rel", /noopener/);
    await expect(facade.locator(".bc-player__title")).not.toBeEmpty();
  });

  test("only embeds Bandcamp when a release ID is configured", async ({ page }) => {
    const player = page.locator("#bandcamp-player");
    const embed = player.locator(".bc-player__embed");
    const hasEmbed = (await player.getAttribute("data-has-embed")) === "true";

    if (hasEmbed) {
      await expect(embed).toHaveCount(1);
      await expect(embed).toHaveAttribute("data-src-large", /bandcamp\.com\/EmbeddedPlayer/);
      await expect(embed).toHaveAttribute("data-src-small", /bandcamp\.com\/EmbeddedPlayer/);
    } else {
      // No ID: nothing is requested from bandcamp.com and the facade stays
      await expect(embed).toHaveCount(0);
      await expect(player.locator(".bc-player__facade")).toBeVisible();
    }
  });

  test("swaps the facade for the embed once Bandcamp answers", async ({ page }) => {
    // Stand in for bandcamp.com so the test never depends on the network
    await page.route("https://bandcamp.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>Bandcamp player stub</title>",
      })
    );
    await page.goto("/");
    const player = page.locator("#bandcamp-player");
    test.skip((await player.getAttribute("data-has-embed")) !== "true", "No release ID set");

    const embed = player.locator(".bc-player__embed");
    await expect(embed).toHaveAttribute("src", /bandcamp\.com\/EmbeddedPlayer/);
    await expect(player).toHaveClass(/is-loaded/);
    await expect(embed).toBeVisible();
    // The facade is faded out and taken out of the tab order
    await expect(player.locator(".bc-player__facade")).toBeHidden();
  });

  test("keeps the facade when Bandcamp cannot be reached", async ({ page }) => {
    await page.route("https://bandcamp.com/**", (route) => route.abort("connectionfailed"));
    await page.goto("/");
    const player = page.locator("#bandcamp-player");
    test.skip((await player.getAttribute("data-has-embed")) !== "true", "No release ID set");

    // Give the probe time to fail, then check nothing was swapped in
    await page.waitForTimeout(500);
    await expect(player).not.toHaveClass(/is-loaded/);
    await expect(player.locator(".bc-player__embed")).toBeHidden();
    await expect(player.locator(".bc-player__facade")).toBeVisible();
  });

  test("the old self-hosted audio player is gone", async ({ page }) => {
    await expect(page.locator("#myAudio")).toHaveCount(0);
    await expect(page.locator("audio")).toHaveCount(0);
  });

  test("is present on blog pages too", async ({ page }) => {
    await page.goto("/blog/");
    await expect(page.locator("#bandcamp-player")).toBeVisible();
    await page.goto("/blog/hello/");
    await expect(page.locator("#bandcamp-player")).toBeVisible();
  });
});
