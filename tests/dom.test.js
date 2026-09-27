import { describe, it, expect, beforeEach, vi } from "vitest";
import { JSDOM } from "jsdom";

describe("DOM Integration Tests", () => {
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
    // vitest 5 exposes window and document as getter-only globals, so define
    // them with vi.stubGlobal instead of assigning.
    vi.stubGlobal("document", document);
    vi.stubGlobal("window", window);
  });

  describe("Cookie Notice DOM Manipulation", () => {
    it("should find cookie notice elements", () => {
      const notice = document.getElementById("cookie-message");
      const dismiss = notice.querySelector("[data-cookie-dismiss]");

      expect(notice).toBeTruthy();
      expect(dismiss).toBeTruthy();
    });

    it("should set and remove attributes", () => {
      const notice = document.getElementById("cookie-message");

      notice.setAttribute("hidden", "");
      expect(notice.hasAttribute("hidden")).toBe(true);

      notice.removeAttribute("aria-modal");
      expect(notice.hasAttribute("aria-modal")).toBe(false);
    });
  });

  describe("Canvas DOM Manipulation", () => {
    it("should find canvas element", () => {
      const canvas = document.getElementById("canvas");
      expect(canvas).toBeTruthy();
      expect(canvas.tagName).toBe("CANVAS");
    });

    it("should set canvas dimensions", () => {
      const canvas = document.getElementById("canvas");

      canvas.width = 1920;
      canvas.height = 1080;
      canvas.style.width = "1920px";
      canvas.style.height = "1080px";

      expect(canvas.width).toBe(1920);
      expect(canvas.height).toBe(1080);
      expect(canvas.style.width).toBe("1920px");
      expect(canvas.style.height).toBe("1080px");
    });

    it("should set CSS custom property", () => {
      document.documentElement.style.setProperty("--vh", "10px");

      const value = document.documentElement.style.getPropertyValue("--vh");
      expect(value).toBe("10px");
    });
  });

  describe("Browser API Mocks", () => {
    it("should mock localStorage", () => {
      // localStorage is already mocked in setup
      expect(localStorage.setItem).toBeDefined();
      expect(localStorage.getItem).toBeDefined();

      localStorage.setItem("key", "value");
      expect(localStorage.setItem).toHaveBeenCalledWith("key", "value");
    });

    it("should mock location", () => {
      // location is provided by jsdom
      expect(location.href).toBeDefined();
      expect(location.origin).toBeDefined();
    });

    it("should mock fetch", async () => {
      // fetch is already mocked in setup
      expect(fetch).toBeDefined();

      const response = await fetch("https://api.example.com");
      expect(fetch).toHaveBeenCalledWith("https://api.example.com");
      expect(response.ok).toBe(true);
    });

    it("should mock requestAnimationFrame", () => {
      // requestAnimationFrame is already mocked in setup
      expect(requestAnimationFrame).toBeDefined();

      const callback = vi.fn();
      requestAnimationFrame(callback);

      expect(requestAnimationFrame).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(0);
    });

    it("should mock cancelAnimationFrame", () => {
      // cancelAnimationFrame is already mocked in setup
      expect(cancelAnimationFrame).toBeDefined();

      const id = 123;
      cancelAnimationFrame(id);

      expect(cancelAnimationFrame).toHaveBeenCalledWith(id);
    });
  });

  describe("Performance Optimizations", () => {
    it("should support requestIdleCallback", () => {
      // Check if requestIdleCallback exists or can be polyfilled
      if (typeof requestIdleCallback !== "undefined") {
        expect(requestIdleCallback).toBeDefined();
      } else {
        // Fallback to setTimeout should work
        expect(setTimeout).toBeDefined();
      }
    });

    it("should support visibilitychange event", () => {
      const handler = vi.fn();
      document.addEventListener("visibilitychange", handler);

      // Simulate visibility change
      Object.defineProperty(document, "hidden", {
        writable: true,
        configurable: true,
        value: true,
      });

      const event = new window.Event("visibilitychange");
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalled();

      // Cleanup
      document.removeEventListener("visibilitychange", handler);
    });

    it("should toggle document.hidden state", () => {
      // Initially visible
      Object.defineProperty(document, "hidden", {
        writable: true,
        configurable: true,
        value: false,
      });
      expect(document.hidden).toBe(false);

      // Simulate tab hidden
      Object.defineProperty(document, "hidden", {
        writable: true,
        configurable: true,
        value: true,
      });
      expect(document.hidden).toBe(true);
    });

    it("should dynamically create script element", () => {
      const script = document.createElement("script");
      script.src = "https://example.com/script.js";
      script.async = true;

      expect(script.tagName).toBe("SCRIPT");
      expect(script.src).toBe("https://example.com/script.js");
      expect(script.async).toBe(true);
    });

    it("should append script to document head", () => {
      const script = document.createElement("script");
      script.src = "https://example.com/analytics.js";

      document.head.appendChild(script);

      const addedScript = document.head.querySelector(
        'script[src="https://example.com/analytics.js"]'
      );
      expect(addedScript).toBeTruthy();
    });

    it("should check document.readyState", () => {
      expect(document.readyState).toBeDefined();
      // Can be 'loading', 'interactive', or 'complete'
      expect(["loading", "interactive", "complete"]).toContain(document.readyState);
    });

    it("should support load event listener", () => {
      const handler = vi.fn();
      window.addEventListener("load", handler);

      const event = new window.Event("load");
      window.dispatchEvent(event);

      expect(handler).toHaveBeenCalled();

      // Cleanup
      window.removeEventListener("load", handler);
    });
  });
});
