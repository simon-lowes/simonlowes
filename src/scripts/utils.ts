// =============================================
// Type Definitions
// =============================================

/** RGB color as a tuple [r, g, b] */
export type RGBColor = [number, number, number];

/** Cell data for canvas animation */
export interface CellData {
  currentNum: number;
  targetNum: number;
  currentColor: RGBColor;
  targetColor: RGBColor;
}

/** HTML elements for the audio player */
export interface AudioPlayerElements {
  audio: HTMLAudioElement | null;
  player: HTMLElement | null;
  playBtn: HTMLButtonElement | null;
  seekSlider: HTMLInputElement | null;
  timeElapsed: HTMLElement | null;
  timeRemaining: HTMLElement | null;
  volumeSlider: HTMLInputElement | null;
  muteBtn: HTMLButtonElement | null;
}

// =============================================
// Math Utility Functions
// =============================================

/**
 * Linear interpolation between two values
 * @param start - Starting value
 * @param end - Ending value
 * @param t - Interpolation factor (0-1)
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Ease in-out function for smoother transitions
 * @param t - Input value (0-1)
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Interpolate between two RGB colors
 * @param color1 - Starting RGB color
 * @param color2 - Ending RGB color
 * @param t - Interpolation factor (0-1)
 */
export function lerpColor(color1: RGBColor, color2: RGBColor, t: number): RGBColor {
  return [
    Math.round(lerp(color1[0], color2[0], t)),
    Math.round(lerp(color1[1], color2[1], t)),
    Math.round(lerp(color1[2], color2[2], t)),
  ];
}

/**
 * Debounce utility for rate-limiting function calls
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 */
// eslint-disable-next-line no-unused-vars
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (..._args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function (this: unknown, ...args: Parameters<T>): void {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// =============================================
// Audio Player Utilities
// =============================================

/**
 * Format seconds as m:ss or -m:ss
 * @param seconds - Time in seconds
 * @param showNegative - Whether to prefix with minus sign
 */
export function formatTime(seconds: number, showNegative: boolean = false): string {
  if (!isFinite(seconds) || isNaN(seconds)) {
    return showNegative ? "-0:00" : "0:00";
  }

  const absSeconds = Math.abs(Math.floor(seconds));
  const mins = Math.floor(absSeconds / 60);
  const secs = absSeconds % 60;
  const formatted = `${mins}:${secs < 10 ? "0" : ""}${secs}`;

  return showNegative ? `-${formatted}` : formatted;
}

/**
 * Update play button state based on audio playback
 */
export function updatePlayButton(
  audio: HTMLAudioElement | null,
  playBtn: HTMLButtonElement | null
): void {
  if (!audio || !playBtn) return;

  const isPlaying = !audio.paused;
  playBtn.setAttribute("aria-pressed", isPlaying ? "true" : "false");
  playBtn.setAttribute("aria-label", isPlaying ? "Pause Never There" : "Play Never There");
}

/**
 * Update time displays and seek slider position
 */
export function updateProgress(
  audio: HTMLAudioElement | null,
  seekSlider: HTMLInputElement | null,
  timeElapsed: HTMLElement | null,
  timeRemaining: HTMLElement | null,
  isSeeking: boolean
): void {
  if (isSeeking || !audio) return;

  const current = audio.currentTime || 0;
  const duration = audio.duration || 0;

  // Update seek slider
  if (seekSlider && duration > 0) {
    const percent = (current / duration) * 100;
    seekSlider.value = String(percent);
  }

  // Update time displays
  if (timeElapsed) {
    timeElapsed.textContent = formatTime(current, false);
  }
  if (timeRemaining) {
    const remaining = duration - current;
    timeRemaining.textContent = formatTime(remaining, true);
  }
}

/**
 * Update mute button state based on audio mute/volume
 */
export function updateMuteButton(
  audio: HTMLAudioElement | null,
  muteBtn: HTMLButtonElement | null
): void {
  if (!audio || !muteBtn) return;

  const isMuted = audio.muted || audio.volume === 0;
  muteBtn.setAttribute("aria-pressed", isMuted ? "true" : "false");
  muteBtn.setAttribute("aria-label", isMuted ? "Unmute audio" : "Mute audio");
}

/**
 * Update volume slider to match audio volume
 */
export function updateVolumeSlider(
  audio: HTMLAudioElement | null,
  volumeSlider: HTMLInputElement | null
): void {
  if (!audio || !volumeSlider) return;
  volumeSlider.value = String(audio.muted ? 0 : audio.volume * 100);
}

/**
 * Handle audio load error by disabling controls
 */
export function handleAudioError(
  player: HTMLElement | null,
  playBtn: HTMLButtonElement | null,
  seekSlider: HTMLInputElement | null,
  volumeSlider: HTMLInputElement | null,
  muteBtn: HTMLButtonElement | null
): void {
  if (!player) return;

  player.classList.add("audio-player--error");

  if (playBtn) playBtn.disabled = true;
  if (seekSlider) seekSlider.disabled = true;
  if (volumeSlider) volumeSlider.disabled = true;
  if (muteBtn) muteBtn.disabled = true;
}

// =============================================
// Cookie Notice Functions
// =============================================

/**
 * Close the cookie notice and restore focus
 */
export function closeCookieNotice(
  notice: HTMLElement | null,
  previouslyFocused: HTMLElement | null
): void {
  if (!notice) return;

  notice.setAttribute("hidden", "");
  notice.removeAttribute("aria-modal");

  if (previouslyFocused && typeof previouslyFocused.focus === "function") {
    previouslyFocused.focus();
  }
}

// =============================================
// Canvas / Viewport Functions
// =============================================

/**
 * Set the --vh CSS custom property for mobile viewport handling
 * @returns The calculated vh value in pixels
 */
export function setViewportHeight(): number {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty("--vh", `${vh}px`);
  return vh;
}

// Cache for fixed element heights to avoid unnecessary style recalcs
let lastPlayerHeight: number | null = null;
let lastFooterHeight: number | null = null;

/**
 * Update CSS custom properties for fixed element heights
 */
export function updateFixedElementHeights(): void {
  const player = document.getElementById("audio-player");
  const footer = document.querySelector("footer");
  const root = document.documentElement;

  // Read layout once per element
  const playerHeight = player ? Math.round(player.getBoundingClientRect().height) : 0;
  const footerHeight = footer ? Math.round(footer.getBoundingClientRect().height) : 0;

  // Only write CSS vars if they changed (avoids extra style recalcs)
  if (lastPlayerHeight !== playerHeight) {
    root.style.setProperty("--player-h", `${playerHeight}px`);
    lastPlayerHeight = playerHeight;
  }
  if (lastFooterHeight !== footerHeight) {
    root.style.setProperty("--footer-h", `${footerHeight}px`);
    lastFooterHeight = footerHeight;
  }
}

/**
 * Initialize cell data for canvas animation
 * @param numCols - Number of columns in the grid
 * @param numRows - Number of rows in the grid
 * @param colorsRGB - Array of available RGB colors
 */
export function initCellData(
  numCols: number,
  numRows: number,
  colorsRGB: RGBColor[]
): CellData[][] {
  const cellData: CellData[][] = [];

  for (let i = 0; i < numCols; i++) {
    cellData[i] = [];
    for (let j = 0; j < numRows; j++) {
      const initialNum = Math.floor(Math.random() * colorsRGB.length);
      const initialColor = colorsRGB[initialNum]!;
      cellData[i]![j] = {
        currentNum: initialNum,
        targetNum: initialNum,
        currentColor: [...initialColor] as RGBColor,
        targetColor: [...initialColor] as RGBColor,
      };
    }
  }

  return cellData;
}
