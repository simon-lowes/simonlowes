import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  lerp,
  easeInOut,
  lerpColor,
  debounce,
  closeCookieNotice,
  setViewportHeight,
  initCellData,
} from "../src/scripts/utils";

describe("Math Utility Functions", () => {
  describe("lerp", () => {
    it("should interpolate between two numbers at t=0", () => {
      expect(lerp(0, 100, 0)).toBe(0);
    });

    it("should interpolate between two numbers at t=0.5", () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
    });

    it("should interpolate between two numbers at t=1", () => {
      expect(lerp(0, 100, 1)).toBe(100);
    });

    it("should handle negative numbers", () => {
      expect(lerp(-10, 10, 0.5)).toBe(0);
    });

    it("should handle fractional interpolation values", () => {
      expect(lerp(0, 100, 0.25)).toBe(25);
      expect(lerp(0, 100, 0.75)).toBe(75);
    });
  });

  describe("easeInOut", () => {
    it("should return 0 at t=0", () => {
      expect(easeInOut(0)).toBe(0);
    });

    it("should return 1 at t=1", () => {
      expect(easeInOut(1)).toBe(1);
    });

    it("should return 0.5 at t=0.5", () => {
      expect(easeInOut(0.5)).toBe(0.5);
    });

    it("should ease in for t < 0.5", () => {
      const result = easeInOut(0.25);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(0.25);
    });

    it("should ease out for t > 0.5", () => {
      const result = easeInOut(0.75);
      expect(result).toBeGreaterThan(0.75);
      expect(result).toBeLessThan(1);
    });
  });

  describe("lerpColor", () => {
    it("should interpolate RGB colors at t=0", () => {
      const color1 = [0, 0, 0];
      const color2 = [255, 255, 255];
      expect(lerpColor(color1, color2, 0)).toEqual([0, 0, 0]);
    });

    it("should interpolate RGB colors at t=1", () => {
      const color1 = [0, 0, 0];
      const color2 = [255, 255, 255];
      expect(lerpColor(color1, color2, 1)).toEqual([255, 255, 255]);
    });

    it("should interpolate RGB colors at t=0.5", () => {
      const color1 = [0, 0, 0];
      const color2 = [100, 200, 50];
      expect(lerpColor(color1, color2, 0.5)).toEqual([50, 100, 25]);
    });

    it("should round interpolated values", () => {
      const color1 = [0, 0, 0];
      const color2 = [100, 100, 100];
      const result = lerpColor(color1, color2, 0.33);
      expect(result[0]).toBe(Math.round(33));
    });
  });

  describe("debounce", () => {
    it("should delay function execution", () => {
      vi.useFakeTimers();
      let called = false;
      const fn = () => {
        called = true;
      };
      const debouncedFn = debounce(fn, 100);

      debouncedFn();
      expect(called).toBe(false);

      vi.advanceTimersByTime(50);
      expect(called).toBe(false);

      vi.advanceTimersByTime(50);
      expect(called).toBe(true);

      vi.useRealTimers();
    });

    it("should cancel previous calls", () => {
      vi.useFakeTimers();
      let callCount = 0;
      const fn = () => {
        callCount++;
      };
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

describe("Cookie Notice Functions", () => {
  describe("closeCookieNotice", () => {
    let notice, previouslyFocused;

    beforeEach(() => {
      notice = document.createElement("div");
      previouslyFocused = document.createElement("button");
      previouslyFocused.focus = vi.fn();
    });

    it("should set hidden attribute", () => {
      closeCookieNotice(notice, previouslyFocused);
      expect(notice.hasAttribute("hidden")).toBe(true);
    });

    it("should remove aria-modal attribute", () => {
      notice.setAttribute("aria-modal", "true");
      closeCookieNotice(notice, previouslyFocused);
      expect(notice.hasAttribute("aria-modal")).toBe(false);
    });

    it("should restore focus to previous element", () => {
      closeCookieNotice(notice, previouslyFocused);
      expect(previouslyFocused.focus).toHaveBeenCalled();
    });

    it("should handle missing notice element", () => {
      expect(() => closeCookieNotice(null, previouslyFocused)).not.toThrow();
    });

    it("should handle missing previouslyFocused element", () => {
      expect(() => closeCookieNotice(notice, null)).not.toThrow();
    });
  });
});

describe("Canvas Functions", () => {
  describe("setViewportHeight", () => {
    beforeEach(() => {
      // Setup document root element
      document.documentElement.style = {};
    });

    it("should set CSS variable --vh", () => {
      window.innerHeight = 1000;
      const vh = setViewportHeight();
      expect(vh).toBe(10);
      expect(document.documentElement.style.getPropertyValue("--vh")).toBe("10px");
    });

    it("should calculate correctly for different viewport heights", () => {
      window.innerHeight = 800;
      const vh = setViewportHeight();
      expect(vh).toBe(8);
    });
  });

  describe("initCellData", () => {
    it("should create a 2D array with correct dimensions", () => {
      const COLORS_RGB = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
      ];
      const cellData = initCellData(5, 10, COLORS_RGB);

      expect(cellData.length).toBe(5);
      expect(cellData[0].length).toBe(10);
    });

    it("should initialize each cell with correct structure", () => {
      const COLORS_RGB = [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
      ];
      const cellData = initCellData(2, 2, COLORS_RGB);

      const cell = cellData[0][0];
      expect(cell).toHaveProperty("currentNum");
      expect(cell).toHaveProperty("targetNum");
      expect(cell).toHaveProperty("currentColor");
      expect(cell).toHaveProperty("targetColor");
      expect(Array.isArray(cell.currentColor)).toBe(true);
      expect(cell.currentColor.length).toBe(3);
    });

    it("should use colors from COLORS_RGB array", () => {
      const COLORS_RGB = [[255, 0, 0]];
      const cellData = initCellData(1, 1, COLORS_RGB);

      expect(cellData[0][0].currentNum).toBe(0);
      expect(cellData[0][0].currentColor).toEqual([255, 0, 0]);
    });

    it("should handle empty dimensions", () => {
      const COLORS_RGB = [[255, 0, 0]];
      const cellData = initCellData(0, 0, COLORS_RGB);

      expect(cellData.length).toBe(0);
    });
  });
});
