/**
 * Self-hosted tracks for the site player's fallback mode.
 *
 * The bar at the top of every page prefers Bandcamp's embedded player
 * (src/data/bandcamp.ts). When that embed cannot load or render (content
 * blockers, Pi-hole, third-party blocking, Bandcamp's CDN unreachable) the
 * bar falls back to a native player streaming the files listed here, so
 * visitors can always hear the music.
 *
 * `src` can be a site path (a file in public/) or a full URL such as
 * https://media.simonlowes.com/... (Cloudflare R2). Keep files as MP3 for
 * universal playback; 128 to 192 kbps is plenty for a preview.
 */
export interface SiteTrack {
  title: string;
  src: string;
  /** Seconds, shown before metadata has loaded. Optional. */
  duration?: number;
}

export const SITE_TRACKS: SiteTrack[] = [
  // The track the site streamed before the Bandcamp embed (restored from git history)
  { title: "Never There", src: "/audio/never-there.mp3" },
];

export function hasSiteTracks(tracks: SiteTrack[] = SITE_TRACKS): boolean {
  return tracks.length > 0;
}

/** m:ss for a duration in seconds; "0:00" for anything not finite. */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
