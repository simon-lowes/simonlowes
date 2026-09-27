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
    // The stub does what the real player does once rendered: tells the parent
    await page.route("https://bandcamp.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: '<!doctype html><title>Bandcamp player stub</title><script>parent.postMessage("playerinited", "*")</script>',
      })
    );
    // ...and for its CDN, which the player probes before trusting the embed
    await page.route("https://*.bcbits.com/**", (route) =>
      route.fulfill({ status: 200, body: "" })
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
    if ((await player.getAttribute("data-has-native")) === "true") {
      await expect(player).toHaveClass(/is-native/);
      await expect(player.locator(".bc-player__native")).toBeVisible();
    } else {
      await expect(player.locator(".bc-player__facade")).toBeVisible();
    }
  });

  test("keeps waiting for a loaded embed that never reports ready, then falls back", async ({
    page,
  }) => {
    // A blank iframe still fires `load`; without Bandcamp's ready message the
    // facade must not be hidden over nothing.
    await page.route("https://bandcamp.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>blank</title>",
      })
    );
    await page.route("https://*.bcbits.com/**", (route) =>
      route.fulfill({ status: 200, body: "" })
    );
    await page.goto("/");
    const player = page.locator("#bandcamp-player");
    test.skip((await player.getAttribute("data-has-embed")) !== "true", "No release ID set");

    await expect(player.locator(".bc-player__embed")).toHaveAttribute("src", /bandcamp\.com/);
    await page.waitForTimeout(1500);
    await expect(player).not.toHaveClass(/is-loaded/);
    await expect(player.locator(".bc-player__facade")).toBeVisible();
    // After the grace period the fallback (native player or facade) takes over
    await expect(player.locator(".bc-player__embed")).toBeHidden({ timeout: 12000 });
    await expect(player).not.toHaveClass(/is-loaded/);
  });

  test("falls back to the site player when Bandcamp's CDN is blocked", async ({ page }) => {
    // Pi-hole / shields commonly allow bandcamp.com but block its CDN, which
    // leaves a blank embed that still fires `load`. The bar must not go blank.
    await page.route("https://bandcamp.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<!doctype html><title>stub</title>",
      })
    );
    await page.route("https://*.bcbits.com/**", (route) => route.abort("blockedbyclient"));
    await page.goto("/");
    const player = page.locator("#bandcamp-player");
    test.skip((await player.getAttribute("data-has-embed")) !== "true", "No release ID set");

    await expect(player).not.toHaveClass(/is-loaded/, { timeout: 8000 });
    await expect(player.locator(".bc-player__embed")).toBeHidden();
    if ((await player.getAttribute("data-has-native")) === "true") {
      // Self-hosted tracks configured: the native player takes over
      await expect(player).toHaveClass(/is-native/);
      const native = player.locator(".bc-player__native");
      await expect(native).toBeVisible();
      await expect(native.locator('[data-native="play"]')).toBeVisible();
      await expect(native.locator('[data-native="title"]')).not.toBeEmpty();
      await expect(native.locator("audio")).toHaveAttribute("src", /\.(mp3|m4a|ogg|wav)$/i);
      await expect(player.locator(".bc-player__facade")).toBeHidden();
    } else {
      // Nothing to self-host yet: the facade link stays
      await expect(player.locator(".bc-player__facade")).toBeVisible();
    }
  });

  test("the site player plays a self-hosted track", async ({ page }) => {
    await page.route("https://bandcamp.com/**", (route) => route.abort("connectionfailed"));
    await page.goto("/");
    const player = page.locator("#bandcamp-player");
    test.skip((await player.getAttribute("data-has-native")) !== "true", "No self-hosted tracks");

    const native = player.locator(".bc-player__native");
    await expect(native).toBeVisible();
    // The file itself must be reachable from the site
    const src = await native.locator("audio").getAttribute("src");
    expect(src).toBeTruthy();
    const head = await page.request.head(new URL(src!, page.url()).toString());
    expect(head.ok()).toBe(true);

    await native.locator('[data-native="play"]').click();
    await expect(player).toHaveClass(/is-playing/, { timeout: 10000 });
    await expect(native.locator('[data-native="play"]')).toHaveAttribute("aria-label", "Pause");
    await native.locator('[data-native="play"]').click();
    await expect(player).not.toHaveClass(/is-playing/);
  });

  test("the old self-hosted audio player is gone", async ({ page }) => {
    await expect(page.locator("#myAudio")).toHaveCount(0);
    // Any <audio> left belongs to the fallback inside the bar, not the old player
    await expect(page.locator("audio:not(#bandcamp-player audio)")).toHaveCount(0);
  });

  test("is present on blog pages too", async ({ page }) => {
    await page.goto("/blog/");
    await expect(page.locator("#bandcamp-player")).toBeVisible();
    await page.goto("/blog/hello/");
    await expect(page.locator("#bandcamp-player")).toBeVisible();
  });
});
