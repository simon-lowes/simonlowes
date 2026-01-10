/**
 * Main application entry point
 * Handles canvas animation, audio player, and Google Analytics
 */

import { initSentry } from "./sentry";
import {
  easeInOut,
  lerpColor,
  debounce,
  formatTime,
  updatePlayButton,
  updateProgress,
  updateMuteButton,
  updateVolumeSlider,
  handleAudioError,
  setViewportHeight,
  updateFixedElementHeights,
  initCellData as initCellDataUtil,
  type RGBColor,
  type CellData,
} from "./utils";

// =============================================
// Error Tracking
// =============================================

initSentry();

// =============================================
// Viewport & Layout Setup
// =============================================

setViewportHeight();

function updateLayoutMeasurements(): void {
  setViewportHeight();
  updateFixedElementHeights();
}

// Initial measurement after DOM content loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", updateLayoutMeasurements);
} else {
  updateLayoutMeasurements();
}

// =============================================
// Google Analytics
// =============================================

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

window.dataLayer = window.dataLayer || [];

function gtag(...args: unknown[]): void {
  window.dataLayer.push(args);
}

window.gtag = gtag;
gtag("js", new Date());
gtag("config", "G-7NV4RLT1ZW");

// =============================================
// Background Canvas Animation
// =============================================

function initBackgroundCanvas(): void {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
  if (!canvas) return;

  // Respect user preference and reduce CPU/GPU when motion is disabled
  const reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Store colors as RGB arrays for smooth interpolation
  const NUM_COLORS = 100;
  const COLORS_RGB: RGBColor[] = [];
  for (let i = 0; i < NUM_COLORS; i++) {
    COLORS_RGB.push([
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
    ]);
  }

  let NUM_COLS = 0;
  let NUM_ROWS = 0;

  // Track CSS-pixel dimensions separately (canvas.width/height are device pixels)
  let viewportWidth = 0;
  let viewportHeight = 0;

  // Smooth animation state
  let currentBgColor: RGBColor = [128, 128, 128];
  let targetBgColor: RGBColor = [...COLORS_RGB[0]];
  let cellData: CellData[][] = [];
  let bgTransitionProgress = 0;
  let cellTransitionProgress = 0;
  const BG_TRANSITION_DURATION = 2000; // 2 seconds for background color transition
  const CELL_TRANSITION_DURATION = 1500; // 1.5 seconds for cell transitions
  let lastBgChangeTime = 0;
  let lastCellChangeTime = 0;

  // Throttle rendering to reduce main-thread work (improves TBT/SI)
  const targetFrameMs = 33; // ~30fps
  let lastFrameTime = 0;

  function initCellData(): void {
    cellData = initCellDataUtil(NUM_COLS, NUM_ROWS, COLORS_RGB);
  }

  function setCanvasSize(): void {
    // Use window dimensions to avoid mobile browser UI quirks leaving unpainted gaps
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;

    // Support high-DPI displays without changing layout size
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewportWidth * dpr);
    canvas.height = Math.floor(viewportHeight * dpr);

    // Keep the canvas' CSS size tied to the viewport
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;

    // Ensure drawing coordinates map to CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Set font once (don't do it per-cell)
    ctx.font = "10px monospace";
    ctx.textBaseline = "top";

    NUM_COLS = Math.floor(viewportWidth / 10);
    // use ceil so we overdraw and don't leave a strip at the bottom
    NUM_ROWS = Math.ceil(viewportHeight / 10);

    // Re-initialize cell data when canvas resizes
    initCellData();

    // Update viewport height and fixed element measurements
    updateLayoutMeasurements();
  }

  let rafId = 0;

  function draw(timestamp: number): void {
    // Pause when tab is hidden to save CPU
    if (document.hidden) {
      rafId = requestAnimationFrame(draw);
      return;
    }

    // Throttle the work
    if (timestamp - lastFrameTime < targetFrameMs) {
      rafId = requestAnimationFrame(draw);
      return;
    }
    lastFrameTime = timestamp;

    // Use CSS pixel dimensions for drawing because we set a DPR transform
    const width = viewportWidth;
    const height = viewportHeight;

    // Handle background color transition
    let bgElapsed = timestamp - lastBgChangeTime;
    if (bgElapsed >= BG_TRANSITION_DURATION) {
      // Pick new target color
      currentBgColor = [...targetBgColor];
      targetBgColor = [...COLORS_RGB[Math.floor(Math.random() * NUM_COLORS)]];
      lastBgChangeTime = timestamp;
      bgElapsed = 0;
    }
    bgTransitionProgress = easeInOut(Math.min(bgElapsed / BG_TRANSITION_DURATION, 1));
    const interpolatedBg = lerpColor(currentBgColor, targetBgColor, bgTransitionProgress);
    ctx.fillStyle = `rgb(${interpolatedBg[0]},${interpolatedBg[1]},${interpolatedBg[2]})`;
    ctx.fillRect(0, 0, width, height);

    // Handle cell transitions
    let cellElapsed = timestamp - lastCellChangeTime;
    if (cellElapsed >= CELL_TRANSITION_DURATION) {
      // Update all cells with new targets
      for (let i = 0; i < NUM_COLS; i++) {
        for (let j = 0; j < NUM_ROWS; j++) {
          if (cellData[i]?.[j]) {
            cellData[i][j].currentNum = cellData[i][j].targetNum;
            cellData[i][j].currentColor = [...cellData[i][j].targetColor];
            const newNum = Math.floor(Math.random() * NUM_COLORS);
            cellData[i][j].targetNum = newNum;
            cellData[i][j].targetColor = [...COLORS_RGB[newNum]];
          }
        }
      }
      lastCellChangeTime = timestamp;
      cellElapsed = 0;
    }
    cellTransitionProgress = easeInOut(Math.min(cellElapsed / CELL_TRANSITION_DURATION, 1));

    // Draw the numbers with smooth transitions
    let x = 0;
    let y = 0;
    for (let col = 0; col < NUM_COLS; col++) {
      for (let row = 0; row < NUM_ROWS; row++) {
        if (cellData[col]?.[row]) {
          const cell = cellData[col][row];
          const interpolatedColor = lerpColor(
            cell.currentColor,
            cell.targetColor,
            cellTransitionProgress
          );
          ctx.fillStyle = `rgb(${interpolatedColor[0]},${interpolatedColor[1]},${interpolatedColor[2]})`;
          // Display the number (smoothly transition to target)
          const displayNum = cellTransitionProgress < 0.5 ? cell.currentNum : cell.targetNum;
          ctx.fillText(String(displayNum), x, y);
        }
        y += 10;
      }
      x += 10;
      y = 0;
    }

    rafId = requestAnimationFrame(draw);
  }

  setCanvasSize();
  rafId = requestAnimationFrame(draw);

  window.addEventListener("resize", debounce(setCanvasSize, 150));
  window.addEventListener("orientationchange", debounce(setCanvasSize, 150));

  // If available, respond to visual viewport changes (mobile address bar show/hide)
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", debounce(setCanvasSize, 150));
  }

  // Ensure we re-render correctly when tab becomes visible again
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && !rafId) {
      rafId = requestAnimationFrame(draw);
    }
  });
}

// Initialize the background canvas safely (won't throw if #canvas is missing)
initBackgroundCanvas();

// =============================================
// Audio Player Controller
// =============================================

(function initAudioPlayer(): void {
  const audio = document.getElementById("myAudio") as HTMLAudioElement | null;
  const player = document.getElementById("audio-player");
  const playBtn = document.getElementById("audio-play-btn") as HTMLButtonElement | null;
  const seekSlider = document.getElementById("audio-seek") as HTMLInputElement | null;
  const volumeSlider = document.getElementById("audio-volume") as HTMLInputElement | null;
  const muteBtn = document.getElementById("audio-mute-btn") as HTMLButtonElement | null;
  const timeElapsed = document.getElementById("audio-time-elapsed");
  const timeRemaining = document.getElementById("audio-time-remaining");

  // Exit if essential elements missing
  if (!audio || !player || !playBtn) return;

  let isSeeking = false;
  let previousVolume = 0.75; // Store volume before muting

  // Set initial volume (75%)
  audio.volume = 0.75;

  // Wrapper functions to match existing signatures
  function updatePlayButtonWrapper(): void {
    updatePlayButton(audio, playBtn);
  }

  function updateProgressWrapper(): void {
    updateProgress(audio, seekSlider, timeElapsed, timeRemaining, isSeeking);
  }

  function updateMuteButtonWrapper(): void {
    updateMuteButton(audio, muteBtn);
  }

  function updateVolumeSliderWrapper(): void {
    updateVolumeSlider(audio, volumeSlider);
  }

  function handleError(): void {
    handleAudioError(player, playBtn, seekSlider, volumeSlider, muteBtn);
  }

  // ----- Event Listeners -----

  // Play/Pause toggle
  playBtn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch((err: Error) => {
        console.warn("Audio play failed:", err);
      });
    } else {
      audio.pause();
    }
  });

  // Audio state changes
  audio.addEventListener("play", updatePlayButtonWrapper);
  audio.addEventListener("pause", updatePlayButtonWrapper);
  audio.addEventListener("timeupdate", updateProgressWrapper);
  audio.addEventListener("loadedmetadata", updateProgressWrapper);
  audio.addEventListener("durationchange", updateProgressWrapper);
  audio.addEventListener("volumechange", () => {
    updateMuteButtonWrapper();
    updateVolumeSliderWrapper();
  });
  audio.addEventListener("error", handleError);

  // Seek slider interaction
  if (seekSlider) {
    seekSlider.addEventListener("input", () => {
      isSeeking = true;
      const duration = audio.duration || 0;
      if (duration > 0) {
        const seekTime = (parseFloat(seekSlider.value) / 100) * duration;
        // Update time display while seeking
        if (timeElapsed) {
          timeElapsed.textContent = formatTime(seekTime, false);
        }
        if (timeRemaining) {
          timeRemaining.textContent = formatTime(duration - seekTime, true);
        }
      }
    });

    seekSlider.addEventListener("change", () => {
      const duration = audio.duration || 0;
      if (duration > 0) {
        audio.currentTime = (parseFloat(seekSlider.value) / 100) * duration;
      }
      isSeeking = false;
    });
  }

  // Volume slider
  if (volumeSlider) {
    volumeSlider.addEventListener("input", () => {
      const vol = parseFloat(volumeSlider.value) / 100;
      audio.volume = vol;
      audio.muted = vol === 0;
      if (vol > 0) {
        previousVolume = vol;
      }
    });
  }

  // Mute toggle
  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      if (audio.muted || audio.volume === 0) {
        // Unmute
        audio.muted = false;
        audio.volume = previousVolume > 0 ? previousVolume : 0.75;
      } else {
        // Mute
        previousVolume = audio.volume;
        audio.muted = true;
      }
    });
  }

  // Spacebar to toggle play/pause globally
  document.addEventListener("keydown", (event: KeyboardEvent) => {
    // Only trigger on spacebar, not when typing in inputs
    if (event.code !== "Space" && event.key !== " ") return;

    // Don't intercept if user is typing in a text field
    const activeElement = document.activeElement as HTMLElement | null;
    const tagName = activeElement?.tagName.toLowerCase() ?? "";
    const isTyping =
      tagName === "input" ||
      tagName === "textarea" ||
      (activeElement as HTMLElement | null)?.isContentEditable;

    if (isTyping) return;

    // Prevent page scroll
    event.preventDefault();

    // Toggle play/pause
    if (audio.paused) {
      audio.play().catch((err: Error) => {
        console.warn("Audio play failed:", err);
      });
    } else {
      audio.pause();
    }
  });

  // Initialize UI state
  updatePlayButtonWrapper();
  updateProgressWrapper();
  updateMuteButtonWrapper();
  updateVolumeSliderWrapper();
})();
