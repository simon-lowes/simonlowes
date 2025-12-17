// =============================================
// Utility Functions
// =============================================

// Linear interpolation helper
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

// Ease in-out function for smoother transitions
export function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Interpolate between two RGB colors
export function lerpColor(color1, color2, t) {
  return [
    Math.round(lerp(color1[0], color2[0], t)),
    Math.round(lerp(color1[1], color2[1], t)),
    Math.round(lerp(color1[2], color2[2], t)),
  ];
}

// Debounce utility for resize events
export function debounce(fn, delay) {
  let timeout = null;
  return function () {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(fn, delay);
  };
}

// =============================================
// Audio Player Utilities
// =============================================

// Format time as m:ss or -m:ss
export function formatTime(seconds, showNegative) {
  if (!isFinite(seconds) || isNaN(seconds)) {
    return showNegative ? '-0:00' : '0:00';
  }
  var absSeconds = Math.abs(Math.floor(seconds));
  var mins = Math.floor(absSeconds / 60);
  var secs = absSeconds % 60;
  var formatted = mins + ':' + (secs < 10 ? '0' : '') + secs;
  return showNegative ? '-' + formatted : formatted;
}

// Update play button state
export function updatePlayButton(audio, playBtn) {
  if (!audio || !playBtn) return;
  var isPlaying = !audio.paused;
  playBtn.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
  playBtn.setAttribute(
    'aria-label',
    isPlaying ? 'Pause Never There' : 'Play Never There'
  );
}

// Update time displays and seek slider
export function updateProgress(audio, seekSlider, timeElapsed, timeRemaining, isSeeking) {
  if (isSeeking || !audio) return;

  var current = audio.currentTime || 0;
  var duration = audio.duration || 0;

  // Update seek slider
  if (seekSlider && duration > 0) {
    var percent = (current / duration) * 100;
    seekSlider.value = percent;
  }

  // Update time displays
  if (timeElapsed) {
    timeElapsed.textContent = formatTime(current, false);
  }
  if (timeRemaining) {
    var remaining = duration - current;
    timeRemaining.textContent = formatTime(remaining, true);
  }
}

// Update mute button state
export function updateMuteButton(audio, muteBtn) {
  if (!audio || !muteBtn) return;
  var isMuted = audio.muted || audio.volume === 0;
  muteBtn.setAttribute('aria-pressed', isMuted ? 'true' : 'false');
  muteBtn.setAttribute('aria-label', isMuted ? 'Unmute audio' : 'Mute audio');
}

// Update volume slider to match audio volume
export function updateVolumeSlider(audio, volumeSlider) {
  if (!audio || !volumeSlider) return;
  volumeSlider.value = audio.muted ? 0 : audio.volume * 100;
}

// Handle audio load error
export function handleAudioError(player, playBtn, seekSlider, volumeSlider, muteBtn) {
  if (!player) return;
  player.classList.add('audio-player--error');
  if (playBtn) playBtn.disabled = true;
  if (seekSlider) seekSlider.disabled = true;
  if (volumeSlider) volumeSlider.disabled = true;
  if (muteBtn) muteBtn.disabled = true;
}

// =============================================
// Cookie Notice Functions
// =============================================

export function closeCookieNotice(notice, previouslyFocused) {
  if (!notice) return;
  notice.setAttribute('hidden', '');
  notice.removeAttribute('aria-modal');
  if (previouslyFocused && previouslyFocused.focus) {
    previouslyFocused.focus();
  }
}

// =============================================
// Canvas Functions
// =============================================

export function setViewportHeight() {
  var vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', vh + 'px');
  return vh;
}

export function initCellData(NUM_COLS, NUM_ROWS, COLORS_RGB) {
  var cellData = [];
  for (var i = 0; i < NUM_COLS; i++) {
    cellData[i] = [];
    for (var j = 0; j < NUM_ROWS; j++) {
      var initialNum = Math.floor(Math.random() * COLORS_RGB.length);
      cellData[i][j] = {
        currentNum: initialNum,
        targetNum: initialNum,
        currentColor: COLORS_RGB[initialNum].slice(),
        targetColor: COLORS_RGB[initialNum].slice(),
      };
    }
  }
  return cellData;
}
