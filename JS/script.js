// Calculate the viewport height and set it as a CSS variable
let vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty('--vh', `${vh}px`);

// Update the viewport height whenever the window is resized
window.addEventListener('resize', () => {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
});

window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag('js', new Date());
gtag('config', 'G-7NV4RLT1ZW');

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const COLORS = [];
var NUM_COLS;
var NUM_ROWS;

function setCanvasSize() {
  var SCREEN_WIDTH = document.documentElement.clientWidth;
  var SCREEN_HEIGHT = document.documentElement.clientHeight;

  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;

  // Empty the COLORS array
  COLORS.length = 0;

  var NUM_COLORS = 100000;
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

  NUM_COLS = Math.floor(SCREEN_WIDTH / 10);
  NUM_ROWS = Math.floor(SCREEN_HEIGHT / 10);
}

function draw() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the background color
  ctx.fillStyle = COLORS[Math.floor(Date.now() / 500) % COLORS.length];
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the numbers
  let x = 0;
  let y = 0;
  for (let i = 0; i < NUM_COLS; i++) {
    for (let j = 0; j < NUM_ROWS; j++) {
      var num = Math.floor(Math.random() * 100);
      ctx.fillStyle = COLORS[num];
      ctx.fillText(num, x, y);
      y += 10;
    }
    x += 10;
    y = 0;
  }
}

setInterval(draw, 1000);

setCanvasSize();
window.addEventListener('resize', setCanvasSize);

// Get the audio element
var audio = document.getElementById('myAudio');

// Function to play and pause the audio on click
function toggleAudio(event) {
  var target = event.target;
  if (!target.closest('footer')) {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }
}

document.body.addEventListener('click', toggleAudio);
