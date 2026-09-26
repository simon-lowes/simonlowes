import { beforeEach, vi } from "vitest";

// Mock browser APIs
beforeEach(() => {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  };
  // In vitest 5 the jsdom window exposes localStorage as a getter-only accessor,
  // so plain assignment throws. vi.stubGlobal defines the property instead and
  // is restored automatically between tests.
  vi.stubGlobal("localStorage", localStorageMock);

  // Mock fetch
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
      text: () => Promise.resolve(""),
    })
  );

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((cb) => {
    cb(0);
    return 0;
  });

  // Mock cancelAnimationFrame
  global.cancelAnimationFrame = vi.fn();

  // Mock window.dataLayer for Google Analytics
  window.dataLayer = [];
});
