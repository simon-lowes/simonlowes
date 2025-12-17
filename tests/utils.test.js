import { describe, it, expect, beforeEach } from 'vitest';
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
  initCellData
} from '../JS/utils.js';

describe('Math Utility Functions', () => {
  describe('lerp', () => {
    it('should interpolate between two numbers at t=0', () => {
      expect(lerp(0, 100, 0)).toBe(0);
    });

    it('should interpolate between two numbers at t=0.5', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
    });

    it('should interpolate between two numbers at t=1', () => {
      expect(lerp(0, 100, 1)).toBe(100);
    });

    it('should handle negative numbers', () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });

    it('should handle fractional interpolation values', () => {
      expect(lerp(0, 100, 0.25)).toBe(25);
      expect(lerp(0, 100, 0.75)).toBe(75);
    });
  });

  describe('easeInOut', () => {
    it('should return 0 at t=0', () => {
      expect(easeInOut(0)).toBe(0);
    });

    it('should return 1 at t=1', () => {
      expect(easeInOut(1)).toBe(1);
    });

    it('should return 0.5 at t=0.5', () => {
      expect(easeInOut(0.5)).toBe(0.5);
    });

    it('should ease in for t < 0.5', () => {
      const result = easeInOut(0.25);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.25);
    });

    it('should ease out for t > 0.5', () => {
      const result = easeInOut(0.75);
      expect(result).toBeGreaterThan(0.75);
      expect(result).toBeLessThan(1);
    });
  });

  describe('lerpColor', () => {
    it('should interpolate RGB colors at t=0', () => {
      const color1 = [0, 0, 0];
      const color2 = [255, 255, 255];
      expect(lerpColor(color1, color2, 0)).toEqual([0, 0, 0]);
    });

    it('should interpolate RGB colors at t=1', () => {
      const color1 = [0, 0, 0];
      const color2 = [255, 255, 255];
      expect(lerpColor(color1, color2, 1)).toEqual([255, 255, 255]);
    });

    it('should interpolate RGB colors at t=0.5', () => {
      const color1 = [0, 0, 0];
      const color2 = [100, 200, 50];
      expect(lerpColor(color1, color2, 0.5)).toEqual([50, 100, 25]);
    });

    it('should round interpolated values', () => {
      const color1 = [0, 0, 0];
      const color2 = [100, 100, 100];
      const result = lerpColor(color1, color2, 0.33);
      expect(result[0]).toBe(Math.round(33));
    });
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      vi.useFakeTimers();
      let called = false;
      const fn = () => { called = true; };
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(called).toBe(false);

      vi.advanceTimersByTime(50);
      expect(called).toBe(false);

      vi.advanceTimersByTime(50);
      expect(called).toBe(true);

      vi.useRealTimers();
    });

    it('should cancel previous calls', () => {
      vi.useFakeTimers();
      let callCount = 0;
      const fn = () => { callCount++; };
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(50);
      debouncedFn();
      vi.advanceTimersByTime(100);

      expect(callCount).toBe(1);

      vi.useRealTimers();
    });
  });
});

describe('Audio Player Utilities', () => {
  describe('formatTime', () => {
    it('should format 0 seconds', () => {
      expect(formatTime(0, false)).toBe('0:00');
    });

    it('should format seconds without minutes', () => {
      expect(formatTime(45, false)).toBe('0:45');
    });

    it('should format time with minutes', () => {
      expect(formatTime(125, false)).toBe('2:05');
    });

    it('should pad seconds with zero', () => {
      expect(formatTime(61, false)).toBe('1:01');
    });

    it('should format with negative sign', () => {
      expect(formatTime(125, true)).toBe('-2:05');
    });

    it('should handle NaN', () => {
      expect(formatTime(NaN, false)).toBe('0:00');
      expect(formatTime(NaN, true)).toBe('-0:00');
    });

    it('should handle Infinity', () => {
      expect(formatTime(Infinity, false)).toBe('0:00');
      expect(formatTime(Infinity, true)).toBe('-0:00');
    });

    it('should handle negative seconds', () => {
      expect(formatTime(-45, false)).toBe('0:45');
    });

    it('should format larger times', () => {
      expect(formatTime(3661, false)).toBe('61:01');
    });
  });

  describe('updatePlayButton', () => {
    let audio, playBtn;

    beforeEach(() => {
      // Create mock audio element
      audio = {
        paused: true
      };

      // Create mock button element
      playBtn = document.createElement('button');
    });

    it('should set aria-pressed to false when paused', () => {
      audio.paused = true;
      updatePlayButton(audio, playBtn);
      expect(playBtn.getAttribute('aria-pressed')).toBe('false');
      expect(playBtn.getAttribute('aria-label')).toBe('Play Never There');
    });

    it('should set aria-pressed to true when playing', () => {
      audio.paused = false;
      updatePlayButton(audio, playBtn);
      expect(playBtn.getAttribute('aria-pressed')).toBe('true');
      expect(playBtn.getAttribute('aria-label')).toBe('Pause Never There');
    });

    it('should handle missing audio element', () => {
      expect(() => updatePlayButton(null, playBtn)).not.toThrow();
    });

    it('should handle missing button element', () => {
      expect(() => updatePlayButton(audio, null)).not.toThrow();
    });
  });

  describe('updateProgress', () => {
    let audio, seekSlider, timeElapsed, timeRemaining;

    beforeEach(() => {
      audio = {
        currentTime: 60,
        duration: 180
      };

      seekSlider = document.createElement('input');
      seekSlider.type = 'range';

      timeElapsed = document.createElement('span');
      timeRemaining = document.createElement('span');
    });

    it('should update seek slider value', () => {
      updateProgress(audio, seekSlider, timeElapsed, timeRemaining, false);
      expect(parseFloat(seekSlider.value)).toBeCloseTo(33.33, 1);
    });

    it('should update time displays', () => {
      updateProgress(audio, seekSlider, timeElapsed, timeRemaining, false);
      expect(timeElapsed.textContent).toBe('1:00');
      expect(timeRemaining.textContent).toBe('-2:00');
    });

    it('should not update when seeking', () => {
      seekSlider.value = '50'; // Set initial value
      updateProgress(audio, seekSlider, timeElapsed, timeRemaining, true);
      expect(seekSlider.value).toBe('50'); // Should remain unchanged
    });

    it('should handle missing duration', () => {
      audio.duration = 0;
      expect(() => updateProgress(audio, seekSlider, timeElapsed, timeRemaining, false)).not.toThrow();
    });
  });

  describe('updateMuteButton', () => {
    let audio, muteBtn;

    beforeEach(() => {
      audio = {
        muted: false,
        volume: 0.75
      };

      muteBtn = document.createElement('button');
    });

    it('should set aria-pressed to false when not muted', () => {
      updateMuteButton(audio, muteBtn);
      expect(muteBtn.getAttribute('aria-pressed')).toBe('false');
      expect(muteBtn.getAttribute('aria-label')).toBe('Mute audio');
    });

    it('should set aria-pressed to true when muted', () => {
      audio.muted = true;
      updateMuteButton(audio, muteBtn);
      expect(muteBtn.getAttribute('aria-pressed')).toBe('true');
      expect(muteBtn.getAttribute('aria-label')).toBe('Unmute audio');
    });

    it('should detect volume at 0 as muted', () => {
      audio.volume = 0;
      updateMuteButton(audio, muteBtn);
      expect(muteBtn.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('updateVolumeSlider', () => {
    let audio, volumeSlider;

    beforeEach(() => {
      audio = {
        muted: false,
        volume: 0.75
      };

      volumeSlider = document.createElement('input');
      volumeSlider.type = 'range';
    });

    it('should update slider value based on volume', () => {
      updateVolumeSlider(audio, volumeSlider);
      expect(volumeSlider.value).toBe('75');
    });

    it('should set slider to 0 when muted', () => {
      audio.muted = true;
      updateVolumeSlider(audio, volumeSlider);
      expect(volumeSlider.value).toBe('0');
    });
  });

  describe('handleAudioError', () => {
    let player, playBtn, seekSlider, volumeSlider, muteBtn;

    beforeEach(() => {
      player = document.createElement('div');
      playBtn = document.createElement('button');
      seekSlider = document.createElement('input');
      volumeSlider = document.createElement('input');
      muteBtn = document.createElement('button');
    });

    it('should add error class to player', () => {
      handleAudioError(player, playBtn, seekSlider, volumeSlider, muteBtn);
      expect(player.classList.contains('audio-player--error')).toBe(true);
    });

    it('should disable all controls', () => {
      handleAudioError(player, playBtn, seekSlider, volumeSlider, muteBtn);
      expect(playBtn.disabled).toBe(true);
      expect(seekSlider.disabled).toBe(true);
      expect(volumeSlider.disabled).toBe(true);
      expect(muteBtn.disabled).toBe(true);
    });

    it('should handle missing optional elements', () => {
      expect(() => handleAudioError(player, playBtn, null, null, null)).not.toThrow();
    });
  });
});

describe('Cookie Notice Functions', () => {
  describe('closeCookieNotice', () => {
    let notice, previouslyFocused;

    beforeEach(() => {
      notice = document.createElement('div');
      previouslyFocused = document.createElement('button');
      previouslyFocused.focus = vi.fn();
    });

    it('should set hidden attribute', () => {
      closeCookieNotice(notice, previouslyFocused);
      expect(notice.hasAttribute('hidden')).toBe(true);
    });

    it('should remove aria-modal attribute', () => {
      notice.setAttribute('aria-modal', 'true');
      closeCookieNotice(notice, previouslyFocused);
      expect(notice.hasAttribute('aria-modal')).toBe(false);
    });

    it('should restore focus to previous element', () => {
      closeCookieNotice(notice, previouslyFocused);
      expect(previouslyFocused.focus).toHaveBeenCalled();
    });

    it('should handle missing notice element', () => {
      expect(() => closeCookieNotice(null, previouslyFocused)).not.toThrow();
    });

    it('should handle missing previouslyFocused element', () => {
      expect(() => closeCookieNotice(notice, null)).not.toThrow();
    });
  });
});

describe('Canvas Functions', () => {
  describe('setViewportHeight', () => {
    beforeEach(() => {
      // Setup document root element
      document.documentElement.style = {};
    });

    it('should set CSS variable --vh', () => {
      window.innerHeight = 1000;
      const vh = setViewportHeight();
      expect(vh).toBe(10);
      expect(document.documentElement.style.getPropertyValue('--vh')).toBe('10px');
    });

    it('should calculate correctly for different viewport heights', () => {
      window.innerHeight = 800;
      const vh = setViewportHeight();
      expect(vh).toBe(8);
    });
  });

  describe('initCellData', () => {
    it('should create a 2D array with correct dimensions', () => {
      const COLORS_RGB = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
      const cellData = initCellData(5, 10, COLORS_RGB);
      
      expect(cellData.length).toBe(5);
      expect(cellData[0].length).toBe(10);
    });

    it('should initialize each cell with correct structure', () => {
      const COLORS_RGB = [[255, 0, 0], [0, 255, 0], [0, 0, 255]];
      const cellData = initCellData(2, 2, COLORS_RGB);
      
      const cell = cellData[0][0];
      expect(cell).toHaveProperty('currentNum');
      expect(cell).toHaveProperty('targetNum');
      expect(cell).toHaveProperty('currentColor');
      expect(cell).toHaveProperty('targetColor');
      expect(Array.isArray(cell.currentColor)).toBe(true);
      expect(cell.currentColor.length).toBe(3);
    });

    it('should use colors from COLORS_RGB array', () => {
      const COLORS_RGB = [[255, 0, 0]];
      const cellData = initCellData(1, 1, COLORS_RGB);
      
      expect(cellData[0][0].currentNum).toBe(0);
      expect(cellData[0][0].currentColor).toEqual([255, 0, 0]);
    });

    it('should handle empty dimensions', () => {
      const COLORS_RGB = [[255, 0, 0]];
      const cellData = initCellData(0, 0, COLORS_RGB);
      
      expect(cellData.length).toBe(0);
    });
  });
});
