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
  initCellData as initCellDataUtil
} from './utils.js';

// Calculate the viewport height and set it as a CSS variable
setViewportHeight();

// Defer Google Analytics loading until after page load to reduce blocking time
function loadGoogleAnalytics() {
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', 'G-7NV4RLT1ZW');
  
  // Dynamically load GA script
  var gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-7NV4RLT1ZW';
  document.head.appendChild(gaScript);
}

// Load GA after page is fully loaded
if (document.readyState === 'complete') {
  loadGoogleAnalytics();
} else {
  window.addEventListener('load', loadGoogleAnalytics);
}

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
var CELL_SIZE = 15; // Increased from 10px to 15px to reduce grid size by ~56%

// Smooth animation state
var currentBgColor = [128, 128, 128];
var targetBgColor = COLORS_RGB[0].slice();
var cellData = []; // Stores current and target values for each cell
var bgTransitionProgress = 0;
var cellTransitionProgress = 0;
var BG_TRANSITION_DURATION = 2200; // Slightly increased from 2000ms for smoother transitions
var CELL_TRANSITION_DURATION = 1700; // Slightly increased from 1500ms for smoother transitions
var lastBgChangeTime = 0;
var lastCellChangeTime = 0;
var animationFrameId = null;
var isAnimationPaused = false;

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

  NUM_COLS = Math.floor(SCREEN_WIDTH / CELL_SIZE);
  // use ceil so we overdraw and don't leave a strip at the bottom
  NUM_ROWS = Math.ceil(SCREEN_HEIGHT / CELL_SIZE);

  // Re-initialize cell data when canvas resizes
  initCellData();

  // Update viewport height CSS variable
  setViewportHeight();
}

function draw(timestamp) {
  // Skip drawing if animation is paused
  if (isAnimationPaused) {
    return;
  }

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
      y += CELL_SIZE;
    }
    x += CELL_SIZE;
    y = 0;
  }

  // Continue the animation loop
  animationFrameId = requestAnimationFrame(draw);
}

setCanvasSize();

// Start the animation loop when the browser is idle
// This defers the heavy canvas animation work until after critical page content is loaded
function startAnimation(timestamp) {
  lastBgChangeTime = timestamp;
  lastCellChangeTime = timestamp;
  animationFrameId = requestAnimationFrame(draw);
}

// Use requestIdleCallback to defer animation start, with fallback to setTimeout
if (typeof requestIdleCallback !== 'undefined') {
  requestIdleCallback(function() {
    requestAnimationFrame(startAnimation);
  }, { timeout: 2000 });
} else {
  // Fallback for browsers that don't support requestIdleCallback
  setTimeout(function() {
    requestAnimationFrame(startAnimation);
  }, 1000);
}

// Pause animation when page is not visible to save CPU/battery
document.addEventListener('visibilitychange', function() {
  if (document.hidden) {
    isAnimationPaused = true;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  } else {
    isAnimationPaused = false;
    if (!animationFrameId) {
      // Reset timing and restart animation via shared startAnimation logic
      requestAnimationFrame(startAnimation);
    }
  }
});

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
