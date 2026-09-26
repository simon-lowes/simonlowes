/**
 * Bandcamp release shown in the floating dock (src/components/BandcampDock.astro).
 *
 * To embed the real player, set `albumId` to the numeric ID from Bandcamp:
 * open the album page while logged in, click "Share / Embed", choose any
 * player size and copy the number after `album=` in the generated iframe
 * URL (https://bandcamp.com/EmbeddedPlayer/album=NNNNNNNNNN/...).
 *
 * While `albumId` is empty the dock still works: it shows the release title
 * and a link to Bandcamp instead of the embedded player.
 */
export const BANDCAMP = {
  artistUrl: "https://simonlowes.bandcamp.com",
  album: {
    title: "Slow Motion",
    url: "https://simonlowes.bandcamp.com/album/slow-motion",
    albumId: "",
  },
} as const;

/** Bandcamp's "small" embedded player is a fixed 42px strip. */
export const BANDCAMP_PLAYER_HEIGHT = 42;

export function bandcampEmbedUrl(albumId: string): string {
  // bgcol/linkcol take hex without '#': the site's ink and cyan tokens.
  return `https://bandcamp.com/EmbeddedPlayer/album=${albumId}/size=small/bgcol=0a0a0f/linkcol=00d4ff/transparent=true/`;
}
