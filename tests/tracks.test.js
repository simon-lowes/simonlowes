import { describe, it, expect } from "vitest";
import { SITE_TRACKS, formatTime, hasSiteTracks } from "../src/data/tracks";

describe("Site tracks", () => {
  it("lists only playable, titled tracks", () => {
    for (const track of SITE_TRACKS) {
      expect(track.title.trim().length).toBeGreaterThan(0);
      expect(track.src).toMatch(/^(\/|https:\/\/)/);
      expect(track.src).toMatch(/\.(mp3|m4a|ogg|wav)$/i);
      if (track.duration !== undefined) expect(track.duration).toBeGreaterThan(0);
    }
  });

  it("reports whether the native fallback has anything to play", () => {
    expect(hasSiteTracks([])).toBe(false);
    expect(hasSiteTracks([{ title: "x", src: "/x.mp3" }])).toBe(true);
    expect(hasSiteTracks()).toBe(SITE_TRACKS.length > 0);
  });
});

describe("formatTime", () => {
  it("formats m:ss", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(5)).toBe("0:05");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(3599.9)).toBe("59:59");
  });

  it("is safe for missing metadata", () => {
    expect(formatTime(NaN)).toBe("0:00");
    expect(formatTime(Infinity)).toBe("0:00");
    expect(formatTime(-3)).toBe("0:00");
  });
});
