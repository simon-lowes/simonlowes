# Testing Guide

This project uses [Vitest](https://vitest.dev/) with [jsdom](https://github.com/jsdom/jsdom) for unit testing.

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

- `tests/utils.test.js` - Unit tests for utility functions (math, audio player, canvas helpers)
- `tests/dom.test.js` - DOM integration tests using jsdom
- `tests/setup.js` - Global test setup and browser API mocks

## What's Tested

### Utility Functions

- **Math utilities**: `lerp()`, `easeInOut()`, `lerpColor()`
- **Audio player**: `formatTime()`, `updatePlayButton()`, `updateProgress()`, `updateMuteButton()`, `updateVolumeSlider()`, `handleAudioError()`
- **Canvas utilities**: `setViewportHeight()`, `initCellData()`
- **Cookie notice**: `closeCookieNotice()`
- **Performance**: `debounce()`

### DOM Manipulation

- Element queries and updates
- Attribute modifications (aria-pressed, aria-label)
- Text content updates
- CSS class manipulation
- Form control states (disabled, value)

### Browser API Mocks

- `localStorage` - getItem, setItem, removeItem, clear
- `fetch` - Promise-based HTTP requests
- `requestAnimationFrame` / `cancelAnimationFrame` - Animation timing
- `window.dataLayer` - Google Analytics tracking

## Test Environment

The tests run in a jsdom environment which simulates a browser DOM without requiring an actual browser. This allows for:

- Fast execution
- Reliable CI/CD integration
- Full DOM API access
- Mocked browser APIs

## Continuous Integration

Tests automatically run on:

- Every push to `main`, `master`, `develop` branches
- Every push to `copilot/**` branches
- Every pull request to `main`, `master`, `develop` branches

The CI workflow runs tests on Node.js 18.x and 20.x to ensure compatibility.

See `.github/workflows/test.yml` for the full CI configuration.

## Code Coverage

Coverage reports are generated when running `npm run test:coverage` and are available in the `coverage/` directory.

## Adding New Tests

1. Create a new test file in `tests/` directory
2. Import the functions you want to test from `JS/utils.js`
3. Use Vitest's `describe`, `it`, and `expect` functions
4. Run `npm test` to verify your tests pass

Example:

```javascript
import { describe, it, expect } from "vitest";
import { myFunction } from "../JS/utils.js";

describe("myFunction", () => {
  it("should return expected value", () => {
    expect(myFunction(1, 2)).toBe(3);
  });
});
```
