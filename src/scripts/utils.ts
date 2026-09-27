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
// Cookie Notice Persistence (localStorage)
// =============================================

const COOKIE_NOTICE_KEY = "cookie_notice_dismissed";

/**
 * Check if the user has previously dismissed the cookie notice
 */
export function hasDismissedCookieNotice(): boolean {
  try {
    return localStorage.getItem(COOKIE_NOTICE_KEY) === "true";
  } catch {
    return false; // localStorage unavailable (private browsing, etc.)
  }
}

/**
 * Save the cookie notice dismissal to localStorage
 */
export function saveCookieNoticeDismissal(): void {
  try {
    localStorage.setItem(COOKIE_NOTICE_KEY, "true");
  } catch {
    // Silently fail if localStorage unavailable
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

/**
 * Update CSS custom properties for fixed element heights.
 *
 * The values are compared with what is on the root element, not a cache:
 * Astro's view transitions swap the <html> attributes on every navigation,
 * which takes the inline style (and these variables) with it, so the next
 * measurement must write them again even when nothing has changed size.
 */
export function updateFixedElementHeights(): void {
  const player = document.getElementById("bandcamp-player");
  const footer = document.querySelector("footer");
  const root = document.documentElement;

  // Read layout once per element
  const playerHeight = `${player ? Math.round(player.getBoundingClientRect().height) : 0}px`;
  const footerHeight = `${footer ? Math.round(footer.getBoundingClientRect().height) : 0}px`;

  // Only write CSS vars if they changed (avoids extra style recalcs)
  if (root.style.getPropertyValue("--player-h") !== playerHeight) {
    root.style.setProperty("--player-h", playerHeight);
  }
  if (root.style.getPropertyValue("--footer-h") !== footerHeight) {
    root.style.setProperty("--footer-h", footerHeight);
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
