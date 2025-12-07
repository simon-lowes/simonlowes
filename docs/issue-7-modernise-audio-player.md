# Issue 7 — Modernise Audio Player UX (Implementation Brief)

## Goal

Replace the current minimal audio toggle for “Never There” with a small, modern, accessible, responsive audio player UI that feels intentional and doesn’t add heavy dependencies.

## Context

The site currently uses a custom button and broader click-to-toggle behaviour. We want a clearer, standard pattern with visible controls and improved accessibility.

## Scope

Update the existing HTML/CSS/JS implementation to provide:

- Visible play/pause control
- Seek/progress display
- Elapsed + remaining time
- Volume control
- Mute toggle
- Better keyboard and screen reader support
- Responsive layout suitable for mobile and desktop

No new framework.

## Decisions (lock these in)

1. **Include volume slider** (do not omit).
2. **Include a mute toggle** integrated with a speaker icon button.
3. **Remove “click anywhere on body to play/pause” behaviour** to avoid conflicts and accidental activation.
4. **Do not persist volume in localStorage for v1.**
5. **Player placement:** a **small fixed bar just above the footer** (or visually anchored to the bottom) that doesn’t obstruct content.
6. **Icons:** use **inline SVG** (no external icon libraries).

## Functional Requirements

- Play/pause button toggles audio reliably.
- Progress bar shows current position and duration when metadata is loaded.
- User can seek by clicking/dragging the progress control.
- Display:
  - Elapsed time (mm:ss)
  - Remaining time (−mm:ss)
- Volume slider ranges 0–100%.
- Mute button toggles between muted/unmuted states and reflects state visually and via ARIA.
- If audio fails to load, UI should degrade gracefully (disable controls or show a simple message).

## Accessibility Requirements

- Use semantic controls (`button`, `input type="range"`).
- Provide:
  - `aria-label` or visible labels for all controls.
  - Proper `aria-pressed` where appropriate.
- Keyboard support:
  - Tab order logical.
  - Space/Enter activates buttons.
  - Range controls adjustable via keyboard.
- Focus styles clearly visible.

## Responsive Requirements

- Player fits narrow screens without overflow.
- Controls wrap or compress sensibly.
- Avoid fixed pixel widths; prefer flex layout.

## Styling Guidance

- Match existing site aesthetic.
- Keep the player minimal and not visually dominant.
- Use CSS variables if already present in the codebase.
- Avoid large new CSS blocks unless necessary.

## Out of Scope

- Playlist support
- Multiple tracks
- Persistent settings
- Third-party audio waveform libraries (e.g., WaveSurfer)

## Acceptance Criteria

- On mobile and desktop:
  - Player renders cleanly with no overlap issues.
  - All controls operate as per requirements.
- Lighthouse/axe checks show no new critical accessibility issues.
- Body-wide click-to-toggle is removed.
- No new runtime dependencies added.

## Implementation Notes

- Reuse existing `audio#myAudio` element.
- Replace the current toggle-only UI with a small player component.
- Ensure event listeners are scoped to the player controls only.
- Make sure the player does not block the skip link or cookie UI.

## Deliverables

- Updated HTML structure for the player.
- Updated CSS for layout, states, and responsiveness.
- Updated JS for control logic, time/progress updates, and accessibility attributes.
- A short PR summary explaining changes and confirming decisions above were followed.
