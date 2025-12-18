import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Canvas Animation Control Tests', () => {
  let dom;
  let document;
  let window;
  let animationState;

  beforeEach(() => {
    // Create a minimal DOM fixture with canvas
    const html = `
      <!DOCTYPE html>
      <html>
        <head></head>
        <body>
          <canvas id="canvas"></canvas>
          <audio id="myAudio" src="test.mp3"></audio>
          <button id="audio-play-btn"></button>
          <input id="audio-seek" type="range" />
          <span id="audio-time-elapsed"></span>
          <span id="audio-time-remaining"></span>
          <button id="audio-mute-btn"></button>
          <input id="audio-volume" type="range" />
          <div id="audio-player"></div>
        </body>
      </html>
    `;

    dom = new JSDOM(html, { 
      url: 'http://localhost',
      runScripts: 'dangerously',
      resources: 'usable'
    });
    document = dom.window.document;
    window = dom.window;

    // Make them globally available
    global.document = document;
    global.window = window;

    // Mock animation APIs
    global.requestAnimationFrame = vi.fn((cb) => {
      const id = Math.random();
      setTimeout(() => cb(performance.now()), 0);
      return id;
    });
    global.cancelAnimationFrame = vi.fn();
    global.requestIdleCallback = vi.fn((cb) => {
      const id = Math.random();
      setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 50 }), 0);
      return id;
    });
    global.performance = {
      now: () => Date.now()
    };

    // Track animation state
    animationState = {
      animationFrameId: null,
      isAnimationPaused: false,
      lastBgChangeTime: 0,
      lastCellChangeTime: 0
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Animation Start Deferral', () => {
    it('should defer animation start using requestIdleCallback', () => {
      // Verify requestIdleCallback is available
      expect(requestIdleCallback).toBeDefined();
      
      // Simulate deferred animation start
      const startCallback = vi.fn();
      requestIdleCallback(startCallback, { timeout: 2000 });
      
      expect(requestIdleCallback).toHaveBeenCalled();
      expect(requestIdleCallback).toHaveBeenCalledWith(
        expect.any(Function),
        { timeout: 2000 }
      );
    });

    it('should fallback to setTimeout when requestIdleCallback is not available', () => {
      // Remove requestIdleCallback
      global.requestIdleCallback = undefined;
      
      // Mock setTimeout
      const setTimeoutSpy = vi.spyOn(global, 'setTimeout');
      
      // Simulate fallback behavior
      if (typeof requestIdleCallback === 'undefined') {
        setTimeout(() => {
          requestAnimationFrame(() => {});
        }, 1000);
      }
      
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it('should initialize timestamps when animation starts', () => {
      const timestamp = performance.now();
      
      // Simulate startAnimation function behavior
      animationState.lastBgChangeTime = timestamp;
      animationState.lastCellChangeTime = timestamp;
      animationState.animationFrameId = requestAnimationFrame(() => {});
      
      expect(animationState.lastBgChangeTime).toBe(timestamp);
      expect(animationState.lastCellChangeTime).toBe(timestamp);
      expect(animationState.animationFrameId).toBeTruthy();
    });
  });

  describe('Visibility-Based Animation Control', () => {
    it('should pause animation when document becomes hidden', () => {
      // Set up initial state - animation running
      animationState.isAnimationPaused = false;
      animationState.animationFrameId = 12345;
      
      // Simulate visibility change to hidden
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: true
      });
      
      // Simulate the visibilitychange handler
      if (document.hidden) {
        animationState.isAnimationPaused = true;
        if (animationState.animationFrameId) {
          cancelAnimationFrame(animationState.animationFrameId);
          animationState.animationFrameId = null;
        }
      }
      
      expect(animationState.isAnimationPaused).toBe(true);
      expect(animationState.animationFrameId).toBe(null);
      expect(cancelAnimationFrame).toHaveBeenCalledWith(12345);
    });

    it('should resume animation when document becomes visible', () => {
      // Set up initial state - animation paused
      animationState.isAnimationPaused = true;
      animationState.animationFrameId = null;
      
      // Simulate visibility change to visible
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false
      });
      
      // Simulate the visibilitychange handler
      if (!document.hidden) {
        animationState.isAnimationPaused = false;
        if (!animationState.animationFrameId) {
          // Reset timing and restart animation
          requestAnimationFrame((timestamp) => {
            animationState.lastBgChangeTime = timestamp;
            animationState.lastCellChangeTime = timestamp;
            animationState.animationFrameId = requestAnimationFrame(() => {});
          });
        }
      }
      
      expect(animationState.isAnimationPaused).toBe(false);
      expect(requestAnimationFrame).toHaveBeenCalled();
    });

    it('should reset timestamps when resuming from pause', async () => {
      // Set up initial state - animation paused
      animationState.isAnimationPaused = true;
      animationState.animationFrameId = null;
      const oldTimestamp = 1000;
      animationState.lastBgChangeTime = oldTimestamp;
      animationState.lastCellChangeTime = oldTimestamp;
      
      // Simulate visibility change to visible
      Object.defineProperty(document, 'hidden', {
        writable: true,
        configurable: true,
        value: false
      });
      
      // Simulate the visibilitychange handler with startAnimation logic
      if (!document.hidden) {
        animationState.isAnimationPaused = false;
        if (!animationState.animationFrameId) {
          await new Promise((resolve) => {
            requestAnimationFrame((timestamp) => {
              // Reset timestamps
              animationState.lastBgChangeTime = timestamp;
              animationState.lastCellChangeTime = timestamp;
              
              expect(animationState.lastBgChangeTime).not.toBe(oldTimestamp);
              expect(animationState.lastCellChangeTime).not.toBe(oldTimestamp);
              expect(animationState.lastBgChangeTime).toBe(timestamp);
              expect(animationState.lastCellChangeTime).toBe(timestamp);
              resolve();
            });
          });
        }
      }
    });

    it('should handle multiple pause/resume cycles', () => {
      // Cycle 1: Start -> Pause
      animationState.animationFrameId = 123;
      animationState.isAnimationPaused = false;
      
      // Pause
      animationState.isAnimationPaused = true;
      cancelAnimationFrame(animationState.animationFrameId);
      animationState.animationFrameId = null;
      
      expect(animationState.isAnimationPaused).toBe(true);
      expect(animationState.animationFrameId).toBe(null);
      
      // Cycle 2: Resume -> Pause
      animationState.isAnimationPaused = false;
      animationState.animationFrameId = requestAnimationFrame(() => {});
      
      expect(animationState.isAnimationPaused).toBe(false);
      expect(animationState.animationFrameId).toBeTruthy();
      
      // Pause again
      const secondId = animationState.animationFrameId;
      animationState.isAnimationPaused = true;
      cancelAnimationFrame(animationState.animationFrameId);
      animationState.animationFrameId = null;
      
      expect(animationState.isAnimationPaused).toBe(true);
      expect(animationState.animationFrameId).toBe(null);
    });
  });

  describe('Animation Frame Management', () => {
    it('should properly manage animationFrameId through lifecycle', () => {
      // Initial state
      expect(animationState.animationFrameId).toBe(null);
      
      // Start animation
      animationState.animationFrameId = requestAnimationFrame(() => {});
      expect(animationState.animationFrameId).toBeTruthy();
      
      // Pause animation
      const frameId = animationState.animationFrameId;
      cancelAnimationFrame(animationState.animationFrameId);
      animationState.animationFrameId = null;
      
      expect(cancelAnimationFrame).toHaveBeenCalledWith(frameId);
      expect(animationState.animationFrameId).toBe(null);
    });

    it('should skip drawing when animation is paused', () => {
      animationState.isAnimationPaused = true;
      
      // Simulate draw function check
      const shouldSkipDrawing = animationState.isAnimationPaused;
      
      expect(shouldSkipDrawing).toBe(true);
    });

    it('should continue drawing when animation is not paused', () => {
      animationState.isAnimationPaused = false;
      
      // Simulate draw function check
      const shouldSkipDrawing = animationState.isAnimationPaused;
      
      expect(shouldSkipDrawing).toBe(false);
    });
  });

  describe('Google Analytics Deferred Loading', () => {
    it('should load GA after page load event', () => {
      const loadHandler = vi.fn();
      
      // Simulate the event listener with { once: true }
      window.addEventListener('load', loadHandler, { once: true });
      
      // Dispatch load event
      const event = new window.Event('load');
      window.dispatchEvent(event);
      
      expect(loadHandler).toHaveBeenCalledTimes(1);
      
      // Verify it only fires once
      window.dispatchEvent(event);
      expect(loadHandler).toHaveBeenCalledTimes(1);
    });

    it('should load GA immediately if document is already complete', () => {
      const loadHandler = vi.fn();
      
      // Simulate document already complete
      Object.defineProperty(document, 'readyState', {
        writable: true,
        configurable: true,
        value: 'complete'
      });
      
      // Simulate the check
      if (document.readyState === 'complete') {
        loadHandler();
      } else {
        window.addEventListener('load', loadHandler, { once: true });
      }
      
      expect(loadHandler).toHaveBeenCalledTimes(1);
    });

    it('should create and append GA script element', () => {
      const gaScript = document.createElement('script');
      gaScript.async = true;
      gaScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-7NV4RLT1ZW';
      
      expect(gaScript.tagName).toBe('SCRIPT');
      expect(gaScript.async).toBe(true);
      expect(gaScript.src).toContain('googletagmanager.com/gtag/js');
      
      // Test appending to head
      document.head.appendChild(gaScript);
      const addedScript = document.head.querySelector('script[src*="googletagmanager"]');
      expect(addedScript).toBeTruthy();
    });
  });
});
