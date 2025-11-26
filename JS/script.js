// Calculate the viewport height and set it as a CSS variable
var vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty('--vh', vh + 'px');

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
    Math.floor(Math.random() * 256)
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

// Linear interpolation helper
function lerp(start, end, t) {
  return start + (end - start) * t;
}

// Ease in-out function for smoother transitions
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

// Interpolate between two RGB colors
function lerpColor(color1, color2, t) {
  return [
    Math.round(lerp(color1[0], color2[0], t)),
    Math.round(lerp(color1[1], color2[1], t)),
    Math.round(lerp(color1[2], color2[2], t))
  ];
}

// Debounce utility for resize events
var resizeTimeout = null;
function debounce(fn, delay) {
  return function () {
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
    }
    resizeTimeout = setTimeout(fn, delay);
  };
}

function initCellData() {
  cellData = [];
  for (var i = 0; i < NUM_COLS; i++) {
    cellData[i] = [];
    for (var j = 0; j < NUM_ROWS; j++) {
      var initialNum = Math.floor(Math.random() * NUM_COLORS);
      cellData[i][j] = {
        currentNum: initialNum,
        targetNum: initialNum,
        currentColor: COLORS_RGB[initialNum].slice(),
        targetColor: COLORS_RGB[initialNum].slice()
      };
    }
  }
}

function setCanvasSize() {
  var SCREEN_WIDTH = document.documentElement.clientWidth;
  var SCREEN_HEIGHT = document.documentElement.clientHeight;

  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;

  NUM_COLS = Math.floor(SCREEN_WIDTH / 10);
  NUM_ROWS = Math.floor(SCREEN_HEIGHT / 10);

  // Re-initialize cell data when canvas resizes
  initCellData();

  // Update viewport height CSS variable
  vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', vh + 'px');
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

// Get the audio element
var audio = document.getElementById('myAudio');
var audioToggle = document.getElementById('audio-toggle');

if (audio && audioToggle) {
  var updateAudioToggle = function () {
    var isPlaying = !audio.paused;
    audioToggle.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
    audioToggle.textContent = isPlaying
      ? 'Pause "Never There"'
      : 'Play "Never There"';
  };
  audioToggle.addEventListener('click', function (event) {
    event.stopPropagation();
    if (audio.paused) {
      var playAttempt = audio.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(function () {
          audioToggle.setAttribute('aria-pressed', 'false');
          updateAudioToggle();
        });
      }
    } else {
      audio.pause();
    }
  });
  audio.addEventListener('play', updateAudioToggle);
  audio.addEventListener('pause', updateAudioToggle);
  updateAudioToggle();
}

if (audio) {
  document.body.addEventListener('click', function (event) {
    var target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest('#cookie-message')) {
      return;
    }
    if (audioToggle && target.closest('#audio-toggle')) {
      return;
    }
    if (target.closest('footer')) {
      return;
    }
    if (target.closest('.skip-link')) {
      return;
    }
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  });
}
