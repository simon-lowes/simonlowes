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

/* ===============================
   Layout measurement (FIXED UI)
   =============================== */

// Initial viewport height
setViewportHeight();

function updateLayoutMeasurements() {
  setViewportHeight();
  updateFixedElementHeights();
}

// Run once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateLayoutMeasurements);
} else {
  updateLayoutMeasurements();
}

/* ===============================
   Defer Google Analytics
   =============================== */

function loadGoogleAnalytics() {
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }

  const gaScript = document.createElement('script');
  gaScript.async = true;
  gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-7NV4RLT1ZW';
  document.head.appendChild(gaScript);

  gtag('js', new Date());
  gtag('config', 'G-7NV4RLT1ZW');
}

if (document.readyState === 'complete') {
  loadGoogleAnalytics();
} else {
  window.addEventListener('load', loadGoogleAnalytics, { once: true });
}

/* ===============================
   Canvas animation
   =============================== */

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const NUM_COLORS = 100;
const COLORS_RGB = Array.from({ length: NUM_COLORS }, () => [
  Math.floor(Math.random() * 256),
  Math.floor(Math.random() * 256),
  Math.floor(Math.random() * 256),
]);

let NUM_COLS = 0;
let NUM_ROWS = 0;
const CELL_SIZE = 15;

let currentBgColor = [128, 128, 128];
let targetBgColor = COLORS_RGB[0].slice();
let cellData = [];
let lastBgChangeTime = 0;
let lastCellChangeTime = 0;

const BG_TRANSITION_DURATION = 2200;
const CELL_TRANSITION_DURATION = 1700;

let animationFrameId = null;
let isAnimationPaused = false;

function initCellData() {
  cellData = initCellDataUtil(NUM_COLS, NUM_ROWS, COLORS_RGB);
}

function setCanvasSize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  NUM_COLS = Math.floor(w / CELL_SIZE);
  NUM_ROWS = Math.ceil(h / CELL_SIZE);

  initCellData();
  updateLayoutMeasurements();
}

function draw(timestamp) {
  if (isAnimationPaused) return;

  const bgElapsed = timestamp - lastBgChangeTime;
  if (bgElapsed >= BG_TRANSITION_DURATION) {
    currentBgColor = targetBgColor.slice();
    targetBgColor = COLORS_RGB[Math.floor(Math.random() * NUM_COLORS)].slice();
    lastBgChangeTime = timestamp;
  }

  const bgT = easeInOut(Math.min(bgElapsed / BG_TRANSITION_DURATION, 1));
  const bg = lerpColor(currentBgColor, targetBgColor, bgT);

  ctx.fillStyle = `rgb(${bg[0]},${bg[1]},${bg[2]})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cellElapsed = timestamp - lastCellChangeTime;
  if (cellElapsed >= CELL_TRANSITION_DURATION) {
    cellData.flat().forEach(cell => {
      cell.currentNum = cell.targetNum;
      cell.currentColor = cell.targetColor.slice();
      const n = Math.floor(Math.random() * NUM_COLORS);
      cell.targetNum = n;
      cell.targetColor = COLORS_RGB[n].slice();
    });
    lastCellChangeTime = timestamp;
  }

  const t = easeInOut(Math.min(cellElapsed / CELL_TRANSITION_DURATION, 1));

  let x = 0;
  let y = 0;
  for (let i = 0; i < NUM_COLS; i++) {
    for (let j = 0; j < NUM_ROWS; j++) {
      const cell = cellData[i]?.[j];
      if (!cell) continue;

      const c = lerpColor(cell.currentColor, cell.targetColor, t);
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillText(t < 0.5 ? cell.currentNum : cell.targetNum, x, y);

      y += CELL_SIZE;
    }
    x += CELL_SIZE;
    y = 0;
  }

  animationFrameId = requestAnimationFrame(draw);
}

setCanvasSize();

function startAnimation(ts) {
  lastBgChangeTime = ts;
  lastCellChangeTime = ts;
  animationFrameId = requestAnimationFrame(draw);
}

(requestIdleCallback || setTimeout)(() => requestAnimationFrame(startAnimation), 1000);

document.addEventListener('visibilitychange', () => {
  isAnimationPaused = document.hidden;
  if (!isAnimationPaused && !animationFrameId) {
    requestAnimationFrame(startAnimation);
  }
});

window.addEventListener('resize', debounce(setCanvasSize, 150));
window.addEventListener('orientationchange', debounce(setCanvasSize, 150));

if (window.visualViewport) {
  visualViewport.addEventListener('resize', debounce(setCanvasSize, 150));
}

/* ===============================
   Audio Player Controller
   =============================== */

(function () {
  const audio = document.getElementById('myAudio');
  const playBtn = document.getElementById('audio-play-btn');
  const seek = document.getElementById('audio-seek');
  const vol = document.getElementById('audio-volume');
  const mute = document.getElementById('audio-mute-btn');
  const elapsed = document.getElementById('audio-time-elapsed');
  const remaining = document.getElementById('audio-time-remaining');

  if (!audio || !playBtn) return;

  audio.volume = 0.75;
  let seeking = false;
  let prevVol = 0.75;

  playBtn.onclick = () => (audio.paused ? audio.play() : audio.pause());
  audio.onplay = () => updatePlayButton(audio, playBtn);
  audio.onpause = () => updatePlayButton(audio, playBtn);
  audio.ontimeupdate = () => updateProgress(audio, seek, elapsed, remaining, seeking);
  audio.onvolumechange = () => {
    updateMuteButton(audio, mute);
    updateVolumeSlider(audio, vol);
  };

  seek.oninput = () => (seeking = true);
  seek.onchange = () => {
    audio.currentTime = (seek.value / 100) * audio.duration;
    seeking = false;
  };

  vol.oninput = () => {
    audio.volume = vol.value / 100;
    audio.muted = audio.volume === 0;
    if (audio.volume) prevVol = audio.volume;
  };

  mute.onclick = () => {
    audio.muted ? (audio.volume = prevVol) : (audio.muted = true);
  };
})();