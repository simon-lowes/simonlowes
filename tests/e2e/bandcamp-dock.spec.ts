import { test, expect } from "@playwright/test";

test.describe("Bandcamp dock", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Dismiss the cookie notice so it cannot overlap the dock
    await page.keyboard.press("Escape");
  });

  test("shows a collapsed toggle on the homepage", async ({ page }) => {
    const toggle = page.locator("#bandcamp-dock-toggle");
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#bandcamp-dock-panel")).toBeHidden();
  });

  test("opens and closes the panel", async ({ page }) => {
    const toggle = page.locator("#bandcamp-dock-toggle");
    const panel = page.locator("#bandcamp-dock-panel");

    await toggle.click();
    await expect(panel).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(panel.locator(".bc-dock__title")).toHaveText("Slow Motion");

    await page.locator("[data-bc-close]").click();
    await expect(panel).toBeHidden();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });

  test("closes on Escape", async ({ page }) => {
    await page.locator("#bandcamp-dock-toggle").click();
    await expect(page.locator("#bandcamp-dock-panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator("#bandcamp-dock-panel")).toBeHidden();
  });

  test("pauses the site audio when opened", async ({ page }) => {
    await page.evaluate(() => {
      const audio = document.getElementById("myAudio") as HTMLAudioElement;
      audio.muted = true;
      return audio.play().catch(() => undefined);
    });
    await page.locator("#bandcamp-dock-toggle").click();
    const paused = await page.evaluate(
      () => (document.getElementById("myAudio") as HTMLAudioElement).paused
    );
    expect(paused).toBe(true);
  });

  test("is present on blog pages too", async ({ page }) => {
    await page.goto("/blog/");
    await expect(page.locator("#bandcamp-dock-toggle")).toBeVisible();
  });
});
