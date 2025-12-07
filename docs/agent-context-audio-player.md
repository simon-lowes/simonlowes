# Agent Context: Modernise Audio Player UX (Issue #7)

## Context

This repo appears to be a lightweight static site. The current track **"Never There"** is played via:

- A native `<audio>` element.
- A custom toggle button (currently visually hidden except on focus).
  The aim is to upgrade this to a modern, visible, accessible, responsive mini-player.

## Goal

Implement a compact, modern audio player UI for "Never There" with:

- Visible controls (play/pause, seek, volume, mute optional).
- Track progress + elapsed/remaining time.
- Good keyboard, screen reader, and mobile behaviour.
- Minimal dependencies.

## Constraints / Guardrails

- Prefer **vanilla HTML/CSS/JS**.
- Avoid adding heavy libraries or new build steps.
- If you introduce a library (e.g., wavesurfer), justify it and keep usage minimal.
- Keep performance strong and avoid flashy/over-engineered UI.
- Maintain existing site aesthetic and structure.
- Preserve the existing audio file path unless there’s a clear reason to change it.

## Non-goals

- Streaming playlists, multi-track queueing, or account features.
- Reworking unrelated layout or content.
- Large design overhaul beyond what’s needed for the player.

## Implementation Notes

- Consider replacing the hidden toggle pattern with a visible player component.
- Use the native Audio API for play state, time updates, seek and volume.
- Make the UI resilient if the audio file fails to load.
- Ensure touch targets are comfortable on mobile.
- Respect reduced motion preferences for any animations.

## Accessibility Requirements (must-haves)

- Controls are reachable in a logical order with Tab.
- Visible focus styles.
- Clear accessible names for buttons:
  - “Play Never There”
  - “Pause Never There”
  - “Mute audio”
  - “Seek slider”
  - “Volume slider”
- Use semantic elements where possible.
- Avoid redundant/incorrect ARIA; only add ARIA when needed.

## Responsive Requirements

- Works well at 320px width upwards.
- Player should not overflow the viewport.
- Controls can collapse into a stacked layout on small screens.

## Acceptance Criteria

1. A visible player UI appears on the page without requiring focus tricks.
2. Play/pause works and reflects state in both UI and ARIA.
3. A seek bar updates smoothly and supports drag/click to seek.
4. Time display shows elapsed and/or remaining time.
5. Volume control works (or an explicit decision is documented if omitted).
6. Keyboard navigation and focus styles are clean and obvious.
7. No major regressions to other site features.
8. Code is readable, commented where needed, and consistent with existing style.

## Suggested File Touchpoints

- `index.html` (player markup)
- `css/style*.css` (player styles)
- `js/script*.js` (player logic)

## Testing Checklist

- Desktop: Chrome, Safari, Firefox.
- Mobile: iOS Safari + Android Chrome (at least a quick sanity check).
- Keyboard-only flow.
- Screen reader spot-check for control names and state.

## Definition of Done

Open a PR linked to Issue #7 with:

- A brief summary of changes.
- Notes on any trade-offs.
- Before/after screenshots if practical.

## Decisions (to unblock implementation)

The agent should proceed with the following explicit choices:

1. **Volume control**

   - Include a visible volume slider in the player UI.
   - Default to a sensible starting volume (e.g., 70–80%) and persist preference if the current codebase already stores settings.

2. **Mute behaviour**

   - Provide a **speaker icon** that toggles mute/unmute.
   - No separate mute button is required beyond the icon + slider pairing.
   - When muted, the icon state should visually reflect mute.

3. **Legacy behaviour removal**
   - **Remove the existing body-click-to-toggle play/pause** behaviour.
   - Ensure play/pause is only triggered via the player control(s) to avoid conflicts with the modernised UI.

These decisions are intentional to meet the spec requirement of documenting omissions/choices and to prevent interaction collisions.

## Instruction

Proceed to implement without further questions unless a blocking technical constraint is discovered.
