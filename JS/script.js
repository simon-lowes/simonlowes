// Calculate the viewport height and set it as a CSS variable
let vh = window.innerHeight * 0.01;
document.documentElement.style.setProperty('--vh', `${vh}px`);

// Update the viewport height whenever the window is resized
window.addEventListener('resize', () => {
  let vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
});

// Your existing JavaScript code follows here...


window.dataLayer = window.dataLayer || [];
function gtag() { dataLayer.push(arguments); }
gtag('js', new Date());
gtag('config', 'G-7NV4RLT1ZW');

var canvas = document.getElementById("canvas");
var ctx = canvas.getContext("2d");

var COLORS = [];
var NUM_COLS;
var NUM_ROWS;

function setCanvasSize() {
  var SCREEN_WIDTH = document.documentElement.clientWidth;
  var SCREEN_HEIGHT = document.documentElement.clientHeight;

  canvas.width = SCREEN_WIDTH;
  canvas.height = SCREEN_HEIGHT;

  COLORS = [];
  var NUM_COLORS = 100000;
  for (var i = 0; i < NUM_COLORS; i++) {
    COLORS.push(
      "rgb(" +
      Math.floor(Math.random() * 256) +
      "," +
      Math.floor(Math.random() * 256) +
      "," +
      Math.floor(Math.random() * 256) +
      ")"
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
  var x = 0;
  var y = 0;
  for (var i = 0; i < NUM_COLS; i++) {
    for (var j = 0; j < NUM_ROWS; j++) {
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
window.addEventListener("resize", setCanvasSize);

// Get the audio element
var audio = document.getElementById("myAudio");

// Function to play and pause the audio on click
function toggleAudio(event) {
  var target = event.target;
  if (!target.closest("footer")) {
    if (audio.paused) {
      audio.play();
    } else {
      audio.pause();
    }
  }
}

document.body.addEventListener("click", toggleAudio);

// Define the URLs for the large and small players
var largePlayerURL = 'https://bandcamp.com/EmbeddedPlayer/album=1117926757/size=large/bgcol=333333/linkcol=0f91ff/tracklist=false/transparent=true/';
var smallPlayerURL = 'https://bandcamp.com/EmbeddedPlayer/album=1117926757/size=small/bgcol=333333/linkcol=0f91ff/transparent=true/';  // replace with your small player URL

// Get a reference to the player iframe
var player = document.getElementById('bandcamp-player');

// Function to detect if the user is on a mobile device
function isMobile() {
  return /Mobi|Android/i.test(navigator.userAgent);
}

// Function to update the player size
function updatePlayerSize() {
  // Check if the device is in landscape mode and the user is on a mobile device
  if (window.innerWidth > window.innerHeight && isMobile()) {
    // If true, use the small player
    player.src = smallPlayerURL;
    player.width = "100%";
    player.height = "500px";  // adjust this value as needed
  } else {
    // Otherwise, use the large player
    player.src = largePlayerURL;
    player.width = "350px";
    player.height = "470px";
  }
}

// Update the player size when the window is resized
window.addEventListener('resize', updatePlayerSize);

// Update the player size when the page loads
updatePlayerSize();