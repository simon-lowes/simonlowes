import { describe, it, expect } from "vitest";
import { BANDCAMP, BANDCAMP_PLAYER_HEIGHTS, bandcampEmbedUrl } from "../src/data/bandcamp";

describe("Bandcamp embed URL", () => {
  const album = {
    title: "Test",
    url: "https://x.bandcamp.com/album/test",
    kind: "album",
    id: "123",
  };

  it("builds the large player with a small artwork thumbnail", () => {
    const url = bandcampEmbedUrl(album, "large");
    expect(url).toBe(
      "https://bandcamp.com/EmbeddedPlayer/album=123/size=large/bgcol=0a0a0f/linkcol=00d4ff/transparent=true/tracklist=false/artwork=small/"
    );
  });

  it("builds the small strip player", () => {
    const url = bandcampEmbedUrl(album, "small");
    expect(url).toBe(
      "https://bandcamp.com/EmbeddedPlayer/album=123/size=small/bgcol=0a0a0f/linkcol=00d4ff/transparent=true/"
    );
  });

  it("uses track= for a single", () => {
    const url = bandcampEmbedUrl({ ...album, kind: "track", id: "456" }, "small");
    expect(url).toContain("/EmbeddedPlayer/track=456/");
  });

  it("uses the site's ground and cyan colours and a transparent background", () => {
    const url = bandcampEmbedUrl(album, "large");
    expect(url).toContain("bgcol=0a0a0f");
    expect(url).toContain("linkcol=00d4ff");
    expect(url).toContain("transparent=true");
  });

  it("knows Bandcamp's fixed player heights", () => {
    expect(BANDCAMP_PLAYER_HEIGHTS.large).toBe(120);
    expect(BANDCAMP_PLAYER_HEIGHTS.small).toBe(42);
  });

  it("configures a release with a Bandcamp URL", () => {
    expect(BANDCAMP.release.url).toMatch(/^https:\/\/simonlowes\.bandcamp\.com\//);
    expect(["album", "track"]).toContain(BANDCAMP.release.kind);
  });
});
