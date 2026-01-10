import { test, expect } from "@playwright/test";

test.describe("Audio Player", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    // Close cookie notice first
    await page.keyboard.press("Escape");
  });

  test("should have audio player region", async ({ page }) => {
    const player = page.locator("#audio-player");
    await expect(player).toBeVisible();
    await expect(player).toHaveAttribute("role", "region");
    await expect(player).toHaveAttribute("aria-label", /Audio player/);
  });

  test("should have play button with correct initial state", async ({ page }) => {
    const playBtn = page.locator("#audio-play-btn");
    await expect(playBtn).toBeVisible();
    await expect(playBtn).toHaveAttribute("aria-pressed", "false");
    await expect(playBtn).toHaveAttribute("aria-label", /Play/);
  });

  test("should have seek slider", async ({ page }) => {
    const seekSlider = page.locator("#audio-seek");
    await expect(seekSlider).toBeVisible();
    await expect(seekSlider).toHaveAttribute("type", "range");
    await expect(seekSlider).toHaveAttribute("aria-label", "Seek slider");
  });

  test("should have volume controls", async ({ page }) => {
    const muteBtn = page.locator("#audio-mute-btn");
    const volumeSlider = page.locator("#audio-volume");

    await expect(muteBtn).toBeVisible();
    await expect(muteBtn).toHaveAttribute("aria-label", /Mute|Unmute/);

    await expect(volumeSlider).toBeVisible();
    await expect(volumeSlider).toHaveAttribute("aria-label", "Volume slider");
  });

  test("should have time displays", async ({ page }) => {
    const timeElapsed = page.locator("#audio-time-elapsed");
    const timeRemaining = page.locator("#audio-time-remaining");

    await expect(timeElapsed).toBeVisible();
    await expect(timeRemaining).toBeVisible();

    // Initial state should show 0:00
    await expect(timeElapsed).toHaveText("0:00");
  });

  test("play button should toggle aria-pressed on click", async ({ page }) => {
    const playBtn = page.locator("#audio-play-btn");

    // Check if button is disabled (no audio file) and skip
    const isDisabled = await playBtn.isDisabled();
    test.skip(isDisabled, "Audio file not available - player is disabled");

    // Initial state
    await expect(playBtn).toHaveAttribute("aria-pressed", "false");

    // Click to play
    await playBtn.click();

    // Should now be playing (aria-pressed true)
    await expect(playBtn).toHaveAttribute("aria-pressed", "true");

    // Click again to pause
    await playBtn.click();

    // Should be paused again
    await expect(playBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("mute button should toggle mute state", async ({ page }) => {
    const muteBtn = page.locator("#audio-mute-btn");
    const audio = page.locator("#myAudio");

    // Wait for audio metadata to load
    await audio.evaluate((el: HTMLAudioElement) => {
      return new Promise<void>((resolve) => {
        if (el.readyState >= 1) resolve();
        else el.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
    });

    // Initial state - not muted
    await expect(muteBtn).toHaveAttribute("aria-pressed", "false");
    await expect(muteBtn).toHaveAttribute("aria-label", "Mute audio");

    // Click to mute
    await muteBtn.click();

    // Should now be muted
    await expect(muteBtn).toHaveAttribute("aria-pressed", "true");
    await expect(muteBtn).toHaveAttribute("aria-label", "Unmute audio");

    // Click again to unmute
    await muteBtn.click();

    // Should be unmuted
    await expect(muteBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("spacebar should toggle play/pause", async ({ page }) => {
    const playBtn = page.locator("#audio-play-btn");
    const audio = page.locator("#myAudio");

    // Wait for audio metadata to load
    await audio.evaluate((el: HTMLAudioElement) => {
      return new Promise<void>((resolve) => {
        if (el.readyState >= 1) resolve();
        else el.addEventListener("loadedmetadata", () => resolve(), { once: true });
      });
    });

    // Initial state
    await expect(playBtn).toHaveAttribute("aria-pressed", "false");

    // Click on page body first to establish trusted user interaction context
    await page.locator("body").click();

    // Press spacebar to play
    await page.keyboard.press("Space");

    // Should be playing
    await expect(playBtn).toHaveAttribute("aria-pressed", "true");

    // Press spacebar again to pause
    await page.keyboard.press("Space");

    // Should be paused
    await expect(playBtn).toHaveAttribute("aria-pressed", "false");
  });
});
