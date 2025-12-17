import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('DOM Integration Tests', () => {
  let dom;
  let document;
  let window;

  beforeEach(() => {
    // Create a minimal DOM fixture
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            :root { --vh: 10px; }
          </style>
        </head>
        <body>
          <canvas id="canvas"></canvas>
          <div id="audio-player" class="audio-player">
            <audio id="myAudio" src="test.mp3"></audio>
            <button id="audio-play-btn" aria-label="Play" aria-pressed="false"></button>
            <input id="audio-seek" type="range" min="0" max="100" value="0" />
            <span id="audio-time-elapsed">0:00</span>
            <span id="audio-time-remaining">-0:00</span>
            <button id="audio-mute-btn" aria-label="Mute" aria-pressed="false"></button>
            <input id="audio-volume" type="range" min="0" max="100" value="75" />
          </div>
          <div id="cookie-message" aria-modal="true">
            <button data-cookie-dismiss>Close</button>
            <p>Cookie notice text</p>
          </div>
        </body>
      </html>
    `;

    dom = new JSDOM(html);
    document = dom.window.document;
    window = dom.window;

    // Make them globally available
    global.document = document;
    global.window = window;
  });

  describe('Audio Player DOM Manipulation', () => {
    it('should find audio player elements in DOM', () => {
      const audio = document.getElementById('myAudio');
      const player = document.getElementById('audio-player');
      const playBtn = document.getElementById('audio-play-btn');

      expect(audio).toBeTruthy();
      expect(player).toBeTruthy();
      expect(playBtn).toBeTruthy();
    });

    it('should update play button attributes', () => {
      const playBtn = document.getElementById('audio-play-btn');
      
      playBtn.setAttribute('aria-pressed', 'true');
      playBtn.setAttribute('aria-label', 'Pause Never There');

      expect(playBtn.getAttribute('aria-pressed')).toBe('true');
      expect(playBtn.getAttribute('aria-label')).toBe('Pause Never There');
    });

    it('should update time display text content', () => {
      const timeElapsed = document.getElementById('audio-time-elapsed');
      const timeRemaining = document.getElementById('audio-time-remaining');

      timeElapsed.textContent = '1:30';
      timeRemaining.textContent = '-2:15';

      expect(timeElapsed.textContent).toBe('1:30');
      expect(timeRemaining.textContent).toBe('-2:15');
    });

    it('should update seek slider value', () => {
      const seekSlider = document.getElementById('audio-seek');

      seekSlider.value = '50';

      expect(seekSlider.value).toBe('50');
    });

    it('should add error class to player', () => {
      const player = document.getElementById('audio-player');

      player.classList.add('audio-player--error');

      expect(player.classList.contains('audio-player--error')).toBe(true);
    });

    it('should disable controls', () => {
      const playBtn = document.getElementById('audio-play-btn');
      const seekSlider = document.getElementById('audio-seek');
      const volumeSlider = document.getElementById('audio-volume');
      const muteBtn = document.getElementById('audio-mute-btn');

      playBtn.disabled = true;
      seekSlider.disabled = true;
      volumeSlider.disabled = true;
      muteBtn.disabled = true;

      expect(playBtn.disabled).toBe(true);
      expect(seekSlider.disabled).toBe(true);
      expect(volumeSlider.disabled).toBe(true);
      expect(muteBtn.disabled).toBe(true);
    });
  });

  describe('Cookie Notice DOM Manipulation', () => {
    it('should find cookie notice elements', () => {
      const notice = document.getElementById('cookie-message');
      const dismiss = notice.querySelector('[data-cookie-dismiss]');

      expect(notice).toBeTruthy();
      expect(dismiss).toBeTruthy();
    });

    it('should set and remove attributes', () => {
      const notice = document.getElementById('cookie-message');

      notice.setAttribute('hidden', '');
      expect(notice.hasAttribute('hidden')).toBe(true);

      notice.removeAttribute('aria-modal');
      expect(notice.hasAttribute('aria-modal')).toBe(false);
    });
  });

  describe('Canvas DOM Manipulation', () => {
    it('should find canvas element', () => {
      const canvas = document.getElementById('canvas');
      expect(canvas).toBeTruthy();
      expect(canvas.tagName).toBe('CANVAS');
    });

    it('should set canvas dimensions', () => {
      const canvas = document.getElementById('canvas');
      
      canvas.width = 1920;
      canvas.height = 1080;
      canvas.style.width = '1920px';
      canvas.style.height = '1080px';

      expect(canvas.width).toBe(1920);
      expect(canvas.height).toBe(1080);
      expect(canvas.style.width).toBe('1920px');
      expect(canvas.style.height).toBe('1080px');
    });

    it('should set CSS custom property', () => {
      document.documentElement.style.setProperty('--vh', '10px');
      
      const value = document.documentElement.style.getPropertyValue('--vh');
      expect(value).toBe('10px');
    });
  });

  describe('Browser API Mocks', () => {
    it('should mock localStorage', () => {
      // localStorage is already mocked in setup
      expect(localStorage.setItem).toBeDefined();
      expect(localStorage.getItem).toBeDefined();
      
      localStorage.setItem('key', 'value');
      expect(localStorage.setItem).toHaveBeenCalledWith('key', 'value');
    });

    it('should mock location', () => {
      // location is provided by jsdom
      expect(location.href).toBeDefined();
      expect(location.origin).toBeDefined();
    });

    it('should mock fetch', async () => {
      // fetch is already mocked in setup
      expect(fetch).toBeDefined();
      
      const response = await fetch('https://api.example.com');
      expect(fetch).toHaveBeenCalledWith('https://api.example.com');
      expect(response.ok).toBe(true);
    });

    it('should mock requestAnimationFrame', () => {
      // requestAnimationFrame is already mocked in setup
      expect(requestAnimationFrame).toBeDefined();
      
      const callback = vi.fn();
      requestAnimationFrame(callback);

      expect(requestAnimationFrame).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(0);
    });

    it('should mock cancelAnimationFrame', () => {
      // cancelAnimationFrame is already mocked in setup
      expect(cancelAnimationFrame).toBeDefined();
      
      const id = 123;
      cancelAnimationFrame(id);

      expect(cancelAnimationFrame).toHaveBeenCalledWith(id);
    });
  });

  describe('Performance Optimizations', () => {
    it('should support requestIdleCallback', () => {
      // Check if requestIdleCallback exists or can be polyfilled
      if (typeof requestIdleCallback !== 'undefined') {
        expect(requestIdleCallback).toBeDefined();
      } else {
        // Fallback to setTimeout should work
        expect(setTimeout).toBeDefined();
      }
    });

    it('should support visibilitychange event', () => {
      const handler = vi.fn();
      document.addEventListener('visibilitychange', handler);
      
      // Simulate visibility change
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true,
      });
      
      const event = new window.Event('visibilitychange');
      document.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
      
      // Cleanup
      document.removeEventListener('visibilitychange', handler);
    });

    it('should toggle document.hidden state', () => {
      // Initially visible
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false,
      });
      expect(document.hidden).toBe(false);
      
      // Simulate tab hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true,
      });
      expect(document.hidden).toBe(true);
    });

    it('should dynamically create script element', () => {
      const script = document.createElement('script');
      script.src = 'https://example.com/script.js';
      script.async = true;
      
      expect(script.tagName).toBe('SCRIPT');
      expect(script.src).toBe('https://example.com/script.js');
      expect(script.async).toBe(true);
    });

    it('should append script to document head', () => {
      const script = document.createElement('script');
      script.src = 'https://example.com/analytics.js';
      
      document.head.appendChild(script);
      
      const addedScript = document.head.querySelector('script[src="https://example.com/analytics.js"]');
      expect(addedScript).toBeTruthy();
    });

    it('should check document.readyState', () => {
      expect(document.readyState).toBeDefined();
      // Can be 'loading', 'interactive', or 'complete'
      expect(['loading', 'interactive', 'complete']).toContain(document.readyState);
    });

    it('should support load event listener', () => {
      const handler = vi.fn();
      window.addEventListener('load', handler);
      
      const event = new window.Event('load');
      window.dispatchEvent(event);
      
      expect(handler).toHaveBeenCalled();
      
      // Cleanup
      window.removeEventListener('load', handler);
    });
  });
});
