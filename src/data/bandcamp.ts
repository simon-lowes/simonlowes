/**
 * The Bandcamp release the site player streams (src/components/BandcampPlayer.astro).
 *
 * `id` is the numeric Bandcamp ID the embedded player needs. To find it, open
 * the release on Bandcamp while logged in, click "Share / Embed", pick any
 * player size and copy the number after `album=` (or `track=` for a single)
 * in the generated iframe URL:
 *   https://bandcamp.com/EmbeddedPlayer/album=NNNNNNNNNN/...
 * Set `kind` to match ("album" or "track").
 *
 * While `id` is empty the player still renders: the glass bar shows the
 * release title and links to Bandcamp, and nothing is loaded from bandcamp.com.
 */
export type BandcampKind = "album" | "track";

export interface BandcampRelease {
  title: string;
  url: string;
  kind: BandcampKind;
  id: string;
}

export const BANDCAMP = {
  artistName: "Simon Lowes",
  artistUrl: "https://simonlowes.bandcamp.com",
  release: {
    title: "Slow Motion",
    url: "https://simonlowes.bandcamp.com/album/slow-motion",
    kind: "album",
    id: "2665327263",
  } as BandcampRelease,
} as const;

/** Bandcamp's two full-width embed sizes and their fixed heights in px. */
export const BANDCAMP_PLAYER_HEIGHTS = {
  /** Artwork thumbnail, title, play button and seek bar. Used from 768px. */
  large: 120,
  /** A single strip: play button, title and seek bar. Used below 768px. */
  small: 42,
} as const;

export type BandcampSize = keyof typeof BANDCAMP_PLAYER_HEIGHTS;

/**
 * Build the embed URL for a release at one of Bandcamp's full-width sizes.
 * bgcol/linkcol take hex without '#': the site's ground and cyan tokens.
 * transparent=true lets the glass bar show through the player.
 */
export function bandcampEmbedUrl(release: BandcampRelease, size: BandcampSize): string {
  const base = `https://bandcamp.com/EmbeddedPlayer/${release.kind}=${release.id}`;
  const colours = "bgcol=0a0a0f/linkcol=00d4ff/transparent=true";
  if (size === "large") {
    return `${base}/size=large/${colours}/tracklist=false/artwork=small/`;
  }
  return `${base}/size=small/${colours}/`;
}

/**
 * First-party relay of the same player (workers/bandcamp-proxy), used only
 * when the visitor's browser or network blocks Bandcamp's CDN. Empty string
 * disables it.
 */
export const BANDCAMP_PROXY_ORIGIN = "https://player.simonlowes.com";

/** The embed URL served through the relay instead of bandcamp.com. */
export function bandcampProxyEmbedUrl(release: BandcampRelease, size: BandcampSize): string {
  return bandcampEmbedUrl(release, size).replace("https://bandcamp.com", BANDCAMP_PROXY_ORIGIN);
}

/** Answers { ok: boolean } when the relay can reach a real player upstream. */
export function bandcampProxyHealthUrl(): string {
  return `${BANDCAMP_PROXY_ORIGIN}/health`;
}
