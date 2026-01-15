/**
 * Main application entry point
 * Handles audio player and Google Analytics
 * Note: Background animation is now handled by Three.js in starfield.ts
 */

import {
  formatTime,
  updatePlayButton,
  updateProgress,
  updateMuteButton,
  updateVolumeSlider,
  handleAudioError,
  setViewportHeight,
  updateFixedElementHeights,
} from "./utils";

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

// Update on resize
window.addEventListener("resize", updateLayoutMeasurements);

// =============================================
// Google Analytics
// =============================================

declare global {
  // eslint-disable-next-line no-unused-vars
  interface Window {
    dataLayer: unknown[];
    gtag: (..._args: unknown[]) => void;
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
// Audio Player Controller
// Works with Astro View Transitions - reinitializes on each navigation
// =============================================

// Track state across navigations
let previousVolume = 0.75;
let spacebarListenerAttached = false;

function initAudioPlayer(): void {
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

  // Set initial volume (75%)
  audio.volume = previousVolume;

  // ----- Clone elements first to get fresh references -----
  // Clone elements to remove old listeners (prevents duplicates on re-navigation)

  // Play/Pause button
  const newPlayBtn = playBtn.cloneNode(true) as HTMLButtonElement;
  playBtn.parentNode?.replaceChild(newPlayBtn, playBtn);

  // Seek slider
  let activeSeekSlider = seekSlider;
  if (seekSlider) {
    const newSeekSlider = seekSlider.cloneNode(true) as HTMLInputElement;
    seekSlider.parentNode?.replaceChild(newSeekSlider, seekSlider);
    activeSeekSlider = newSeekSlider;
  }

  // Volume slider
  let activeVolumeSlider = volumeSlider;
  if (volumeSlider) {
    const newVolumeSlider = volumeSlider.cloneNode(true) as HTMLInputElement;
    volumeSlider.parentNode?.replaceChild(newVolumeSlider, volumeSlider);
    activeVolumeSlider = newVolumeSlider;
  }

  // Mute button
  let activeMuteBtn = muteBtn;
  if (muteBtn) {
    const newMuteBtn = muteBtn.cloneNode(true) as HTMLButtonElement;
    muteBtn.parentNode?.replaceChild(newMuteBtn, muteBtn);
    activeMuteBtn = newMuteBtn;
  }

  // ----- Wrapper functions using NEW element references -----
  function updatePlayButtonWrapper(): void {
    updatePlayButton(audio, newPlayBtn);
  }

  function updateProgressWrapper(): void {
    updateProgress(audio, activeSeekSlider, timeElapsed, timeRemaining, isSeeking);
  }

  function updateMuteButtonWrapper(): void {
    updateMuteButton(audio, activeMuteBtn);
  }

  function updateVolumeSliderWrapper(): void {
    updateVolumeSlider(audio, activeVolumeSlider);
  }

  function handleError(): void {
    handleAudioError(player, newPlayBtn, activeSeekSlider, activeVolumeSlider, activeMuteBtn);
  }

  // ----- Event Listeners -----

  // Play/Pause toggle
  newPlayBtn.addEventListener("click", () => {
    if (audio.paused) {
      audio.play().catch((err: Error) => {
        // eslint-disable-next-line no-console
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
  if (activeSeekSlider) {
    activeSeekSlider.addEventListener("input", () => {
      isSeeking = true;
      const duration = audio.duration || 0;
      if (duration > 0) {
        const seekTime = (parseFloat(activeSeekSlider!.value) / 100) * duration;
        // Update time display while seeking
        if (timeElapsed) {
          timeElapsed.textContent = formatTime(seekTime, false);
        }
        if (timeRemaining) {
          timeRemaining.textContent = formatTime(duration - seekTime, true);
        }
      }
    });

    activeSeekSlider.addEventListener("change", () => {
      const duration = audio.duration || 0;
      if (duration > 0) {
        audio.currentTime = (parseFloat(activeSeekSlider!.value) / 100) * duration;
      }
      isSeeking = false;
    });
  }

  // Volume slider
  if (activeVolumeSlider) {
    activeVolumeSlider.addEventListener("input", () => {
      const vol = parseFloat(activeVolumeSlider!.value) / 100;
      audio.volume = vol;
      audio.muted = vol === 0;
      if (vol > 0) {
        previousVolume = vol;
      }
    });
  }

  // Mute toggle
  if (activeMuteBtn) {
    activeMuteBtn.addEventListener("click", () => {
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

  // Spacebar to toggle play/pause globally (only attach once)
  if (!spacebarListenerAttached) {
    spacebarListenerAttached = true;

    document.addEventListener("keydown", (event: KeyboardEvent) => {
      // Only trigger on spacebar, not when typing in inputs
      if (event.code !== "Space" && event.key !== " ") return;

      // Get fresh reference to audio element
      const currentAudio = document.getElementById("myAudio") as HTMLAudioElement | null;
      if (!currentAudio) return;

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
      if (currentAudio.paused) {
        currentAudio.play().catch((err: Error) => {
          // eslint-disable-next-line no-console
          console.warn("Audio play failed:", err);
        });
      } else {
        currentAudio.pause();
      }
    });
  }

  // Initialize UI state (use new button reference)
  updatePlayButton(audio, newPlayBtn);
  updateProgressWrapper();
  updateMuteButtonWrapper();
  updateVolumeSliderWrapper();
}

// Run on initial load and after View Transitions navigation
document.addEventListener("astro:page-load", initAudioPlayer);
