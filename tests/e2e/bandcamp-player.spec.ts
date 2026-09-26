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
      await expect(embed).toHaveAttribute("src", /bandcamp\.com\/EmbeddedPlayer/);
    } else {
      // No ID: nothing is requested from bandcamp.com and the facade stays
      await expect(embed).toHaveCount(0);
      await expect(player.locator(".bc-player__facade")).toBeVisible();
    }
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
