// Import utility functions
import {
  lerp,
  easeInOut,
  lerpColor,
  debounce,
  formatTime,
  updatePlayButton,
  updateProgress,
  updateMuteButton,
  updateVolumeSlider,
  handleAudioError,
  closeCookieNotice,
  setViewportHeight,
  updateFixedElementHeights,
  initCellData as initCellDataUtil
} from './utils.js';

// Calculate the viewport height and set it as a CSS variable
setViewportHeight();

// Measure fixed elements after DOM is ready
function updateLayoutMeasurements() {
  setViewportHeight();
  updateFixedElementHeights();
}

// Initial measurement after DOM content loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateLayoutMeasurements);
} else {
  updateLayoutMeasurements();
}

window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag('js', new Date());
gtag('config', 'G-7NV4RLT1ZW');

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

// Store colors as RGB arrays for smooth interpolation
var NUM_COLORS = 100;
var COLORS_RGB = [];
for (var i = 0; i < NUM_COLORS; i++) {
  COLORS_RGB.push([
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
    Math.floor(Math.random() * 256),
  ]);
}

var NUM_COLS = 0;
var NUM_ROWS = 0;

// Smooth animation state
var currentBgColor = [128, 128, 128];
var targetBgColor = COLORS_RGB[0].slice();
var cellData = []; // Stores current and target values for each cell
var bgTransitionProgress = 0;
var cellTransitionProgress = 0;
var BG_TRANSITION_DURATION = 2000; // 2 seconds for background color transition
var CELL_TRANSITION_DURATION = 1500; // 1.5 seconds for cell transitions
var lastBgChangeTime = 0;
var lastCellChangeTime = 0;

function initCellData() {
  cellData = initCellDataUtil(NUM_COLS, NUM_ROWS, COLORS_RGB);
}

function setCanvasSize() {
  // Use window dimensions to avoid mobile browser UI quirks leaving unpainted gaps
  var SCREEN_WIDTH = window.innerWidth;
  var SCREEN_HEIGHT = window.innerHeight;

  // Support high-DPI displays without changing layout size
  var dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(SCREEN_WIDTH * dpr);
  canvas.height = Math.floor(SCREEN_HEIGHT * dpr);

  // Keep the canvas' CSS size tied to the viewport
  canvas.style.width = SCREEN_WIDTH + 'px';
  canvas.style.height = SCREEN_HEIGHT + 'px';

  // Ensure drawing coordinates map to CSS pixels
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  NUM_COLS = Math.floor(SCREEN_WIDTH / 10);
  // use ceil so we overdraw and don't leave a strip at the bottom
  NUM_ROWS = Math.ceil(SCREEN_HEIGHT / 10);

  // Re-initialize cell data when canvas resizes
  initCellData();

  // Update viewport height and fixed element measurements
  updateLayoutMeasurements();
}

function draw(timestamp) {
  var width = canvas.width;
  var height = canvas.height;

  // Handle background color transition
  var bgElapsed = timestamp - lastBgChangeTime;
  if (bgElapsed >= BG_TRANSITION_DURATION) {
    // Pick new target color
    currentBgColor = targetBgColor.slice();
    targetBgColor = COLORS_RGB[Math.floor(Math.random() * NUM_COLORS)].slice();
    lastBgChangeTime = timestamp;
    bgElapsed = 0;
  }
  bgTransitionProgress = easeInOut(
    Math.min(bgElapsed / BG_TRANSITION_DURATION, 1)
  );
  var interpolatedBg = lerpColor(
    currentBgColor,
    targetBgColor,
    bgTransitionProgress
  );
  ctx.fillStyle =
    'rgb(' +
    interpolatedBg[0] +
    ',' +
    interpolatedBg[1] +
    ',' +
    interpolatedBg[2] +
    ')';
  ctx.fillRect(0, 0, width, height);

  // Handle cell transitions
  var cellElapsed = timestamp - lastCellChangeTime;
  if (cellElapsed >= CELL_TRANSITION_DURATION) {
    // Update all cells with new targets
    for (var i = 0; i < NUM_COLS; i++) {
      for (var j = 0; j < NUM_ROWS; j++) {
        if (cellData[i] && cellData[i][j]) {
          cellData[i][j].currentNum = cellData[i][j].targetNum;
          cellData[i][j].currentColor = cellData[i][j].targetColor.slice();
          var newNum = Math.floor(Math.random() * NUM_COLORS);
          cellData[i][j].targetNum = newNum;
          cellData[i][j].targetColor = COLORS_RGB[newNum].slice();
        }
      }
    }
    lastCellChangeTime = timestamp;
    cellElapsed = 0;
  }
  cellTransitionProgress = easeInOut(
    Math.min(cellElapsed / CELL_TRANSITION_DURATION, 1)
  );

  // Draw the numbers with smooth transitions
  var x = 0;
  var y = 0;
  for (var i = 0; i < NUM_COLS; i++) {
    for (var j = 0; j < NUM_ROWS; j++) {
      if (cellData[i] && cellData[i][j]) {
        var cell = cellData[i][j];
        var interpolatedColor = lerpColor(
          cell.currentColor,
          cell.targetColor,
          cellTransitionProgress
        );
        ctx.fillStyle =
          'rgb(' +
          interpolatedColor[0] +
          ',' +
          interpolatedColor[1] +
          ',' +
          interpolatedColor[2] +
          ')';
        // Display the number (smoothly transition to target)
        var displayNum =
          cellTransitionProgress < 0.5 ? cell.currentNum : cell.targetNum;
        ctx.fillText(displayNum, x, y);
      }
      y += 10;
    }
    x += 10;
    y = 0;
  }

  // Use requestAnimationFrame for smooth 60fps rendering
  requestAnimationFrame(draw);
}

setCanvasSize();
// Start the animation loop with requestAnimationFrame
requestAnimationFrame(draw);

window.addEventListener('resize', debounce(setCanvasSize, 150));
window.addEventListener('orientationchange', debounce(setCanvasSize, 150));

// If available, respond to visual viewport changes (mobile address bar show/hide)
if (window.visualViewport) {
  window.visualViewport.addEventListener(
    'resize',
    debounce(setCanvasSize, 150)
  );
}

// =============================================
// Audio Player Controller
// =============================================
(function () {
  var audio = document.getElementById('myAudio');
  var player = document.getElementById('audio-player');
  var playBtn = document.getElementById('audio-play-btn');
  var seekSlider = document.getElementById('audio-seek');
  var volumeSlider = document.getElementById('audio-volume');
  var muteBtn = document.getElementById('audio-mute-btn');
  var timeElapsed = document.getElementById('audio-time-elapsed');
  var timeRemaining = document.getElementById('audio-time-remaining');

  // Exit if essential elements missing
  if (!audio || !player || !playBtn) {
    return;
  }

  var isSeeking = false;
  var previousVolume = 0.75; // Store volume before muting

  // Set initial volume (75%)
  audio.volume = 0.75;

  // Wrapper functions to match existing signatures
  function updatePlayButtonWrapper() {
    updatePlayButton(audio, playBtn);
  }

  function updateProgressWrapper() {
    updateProgress(audio, seekSlider, timeElapsed, timeRemaining, isSeeking);
  }

  function updateMuteButtonWrapper() {
    updateMuteButton(audio, muteBtn);
  }

  function updateVolumeSliderWrapper() {
    updateVolumeSlider(audio, volumeSlider);
  }

  function handleError() {
    handleAudioError(player, playBtn, seekSlider, volumeSlider, muteBtn);
  }

  // ----- Event Listeners -----

  // Play/Pause toggle
  playBtn.addEventListener('click', function () {
    if (audio.paused) {
      var playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function (err) {
          console.warn('Audio play failed:', err);
        });
      }
    } else {
      audio.pause();
    }
  });

  // Audio state changes
  audio.addEventListener('play', updatePlayButtonWrapper);
  audio.addEventListener('pause', updatePlayButtonWrapper);
  audio.addEventListener('timeupdate', updateProgressWrapper);
  audio.addEventListener('loadedmetadata', updateProgressWrapper);
  audio.addEventListener('durationchange', updateProgressWrapper);
  audio.addEventListener('volumechange', function () {
    updateMuteButtonWrapper();
    updateVolumeSliderWrapper();
  });
  audio.addEventListener('error', handleError);

  // Seek slider interaction
  if (seekSlider) {
    seekSlider.addEventListener('input', function () {
      isSeeking = true;
      var duration = audio.duration || 0;
      if (duration > 0) {
        var seekTime = (seekSlider.value / 100) * duration;
        // Update time display while seeking
        if (timeElapsed) {
          timeElapsed.textContent = formatTime(seekTime, false);
        }
        if (timeRemaining) {
          timeRemaining.textContent = formatTime(duration - seekTime, true);
        }
      }
    });

    seekSlider.addEventListener('change', function () {
      var duration = audio.duration || 0;
      if (duration > 0) {
        audio.currentTime = (seekSlider.value / 100) * duration;
      }
      isSeeking = false;
    });
  }

  // Volume slider
  if (volumeSlider) {
    volumeSlider.addEventListener('input', function () {
      var vol = volumeSlider.value / 100;
      audio.volume = vol;
      audio.muted = vol === 0;
      if (vol > 0) {
        previousVolume = vol;
      }
    });
  }

  // Mute toggle
  if (muteBtn) {
    muteBtn.addEventListener('click', function () {
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
  document.addEventListener('keydown', function (event) {
    // Only trigger on spacebar, not when typing in inputs
    if (event.code !== 'Space' && event.key !== ' ') {
      return;
    }

    // Don't intercept if user is typing in a text field
    var tagName = document.activeElement.tagName.toLowerCase();
    var isTyping =
      tagName === 'input' ||
      tagName === 'textarea' ||
      document.activeElement.isContentEditable;
    if (isTyping) {
      return;
    }

    // Prevent page scroll
    event.preventDefault();

    // Toggle play/pause
    if (audio.paused) {
      var playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function (err) {
          console.warn('Audio play failed:', err);
        });
      }
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
