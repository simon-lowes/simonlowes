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

// Only generate 100 colors (enough for the random number range 0-99)
var COLORS = [];
var NUM_COLORS = 100;
for (var i = 0; i < NUM_COLORS; i++) {
  COLORS.push(
    'rgb(' +
      Math.floor(Math.random() * 256) +
      ',' +
      Math.floor(Math.random() * 256) +
      ',' +
      Math.floor(Math.random() * 256) +
      ')'
  );
}

var NUM_COLS = 0;
var NUM_ROWS = 0;

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

function setCanvasSize() {
  var SCREEN_WIDTH = document.documentElement.clientWidth;
  var SCREEN_HEIGHT = document.documentElement.clientHeight;

  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;

  NUM_COLS = Math.floor(SCREEN_WIDTH / 10);
  NUM_ROWS = Math.floor(SCREEN_HEIGHT / 10);

  // Update viewport height CSS variable
  vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', vh + 'px');
}

function draw() {
  var width = canvas.width;
  var height = canvas.height;

  // Clear and draw the background color
  ctx.fillStyle = COLORS[Math.floor(Date.now() / 500) % NUM_COLORS];
  ctx.fillRect(0, 0, width, height);

  // Draw the numbers
  var x = 0;
  var y = 0;
  var cols = NUM_COLS;
  var rows = NUM_ROWS;
  for (var i = 0; i < cols; i++) {
    for (var j = 0; j < rows; j++) {
      var num = Math.floor(Math.random() * NUM_COLORS);
      ctx.fillStyle = COLORS[num];
      ctx.fillText(num, x, y);
      y += 10;
    }
    x += 10;
    y = 0;
  }
}

setCanvasSize();
setInterval(draw, 1000);

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
