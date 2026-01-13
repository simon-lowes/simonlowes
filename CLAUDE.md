# Simon Lowes Website - CLAUDE.md

## CRITICAL: READ THIS ENTIRE FILE BEFORE DOING ANYTHING

You are implementing a No Man's Sky inspired website redesign. This is a MULTI-HOUR task requiring real code implementation. Do NOT claim completion until ALL verification steps pass.

## The Mission

Replace the broken background with a Three.js procedural starfield that responds to mouse movement. The user will be ASLEEP. Do not open browsers. Do not ask questions. Just build.

## STRICT RULES

1. **DO NOT OUTPUT `<promise>REDESIGN_COMPLETE</promise>` UNTIL ALL VERIFICATION CHECKS PASS**
2. **DO NOT OPEN CHROME OR ANY BROWSER** - no `open` commands, no browser preview, no playwright open
3. **DO NOT STOP EARLY** - if something breaks, debug and fix it, then continue
4. **COMMIT AFTER EACH PHASE** - small commits, descriptive messages
5. **RUN VERIFICATION COMMANDS** - if they fail, the phase is not complete
6. **THIS WILL TAKE HOURS** - that is expected and correct

## Current State

- Astro site deployed at https://simonlowes.vercel.app
- Background animation is BROKEN (currently just black/nothing)
- Audio player, blog, social links exist but need visual enhancement

## Target State

- Three.js WebGL starfield with 3 parallax depth layers (thousands of stars)
- Mouse movement shifts camera perspective (like No Man's Sky cockpit view)
- Glass-morphism UI floating on the starfield
- Cyan accent color (#00d4ff) for glows and borders
- All existing features still work (audio, blog, socials)

---

## PHASE 1: Install Dependencies

### Tasks

```bash
npm install three gsap
npm install -D @types/three
```

### Verification

```bash
node -e "require('three'); require('gsap'); console.log('PHASE_1_VERIFIED')"
```

**If "PHASE_1_VERIFIED" does not print, fix the issue. Do not proceed until it does.**

After verification passes:

```bash
git add -A && git commit -m "Phase 1: Install Three.js and GSAP dependencies"
```

---

## PHASE 2: Create Starfield Core

### Task

Create the file `src/scripts/starfield.ts` with a complete Three.js implementation:

Required exports:

- `initStarfield(canvas: HTMLCanvasElement): void` - initializes the scene
- `updateParallax(normalizedX: number, normalizedY: number): void` - updates based on mouse (-1 to 1)
- `cleanup(): void` - disposes resources

Required implementation:

- THREE.Scene with black/deep blue background (#0a0a12)
- THREE.PerspectiveCamera with FOV 60-75
- THREE.WebGLRenderer with antialiasing
- THREE.Points using BufferGeometry for particles
- At minimum 3000 particles for the far star layer
- requestAnimationFrame render loop
- Window resize handler

### Verification

```bash
test -f src/scripts/starfield.ts \
  && grep -q "THREE.Scene" src/scripts/starfield.ts \
  && grep -q "THREE.PerspectiveCamera" src/scripts/starfield.ts \
  && grep -q "THREE.Points" src/scripts/starfield.ts \
  && grep -q "THREE.WebGLRenderer" src/scripts/starfield.ts \
  && grep -q "requestAnimationFrame" src/scripts/starfield.ts \
  && grep -q "export.*function.*initStarfield" src/scripts/starfield.ts \
  && grep -q "export.*function.*updateParallax" src/scripts/starfield.ts \
  && echo "PHASE_2_VERIFIED" || echo "PHASE_2_FAILED"
```

**If "PHASE_2_FAILED" prints, the file is missing required code. Add it.**

After verification passes:

```bash
git add -A && git commit -m "Phase 2: Create Three.js starfield core with scene, camera, renderer"
```

---

## PHASE 3: Implement Three Parallax Layers

### Task

Update `src/scripts/starfield.ts` to create THREE separate THREE.Points objects:

1. **Far stars layer**:
   - 3000+ particles
   - Positioned z: -800 to -400
   - Small size (1-2)
   - Moves 2% of mouse delta (slowest)

2. **Mid nebula layer**:
   - 800+ particles
   - Positioned z: -400 to -150
   - Medium size (2-3)
   - Mix of colors (purple, blue, teal tints)
   - Moves 5% of mouse delta

3. **Near particle layer**:
   - 200+ particles
   - Positioned z: -150 to -30
   - Larger size (3-5)
   - Moves 10% of mouse delta (fastest)

The `updateParallax` function should move each layer at different rates using GSAP for smooth interpolation.

### Verification

```bash
POINTS_COUNT=$(grep -c "new THREE.Points" src/scripts/starfield.ts)
if [ "$POINTS_COUNT" -ge 3 ]; then
  echo "PHASE_3_VERIFIED (found $POINTS_COUNT particle layers)"
else
  echo "PHASE_3_FAILED (only found $POINTS_COUNT THREE.Points, need at least 3)"
fi
```

**If FAILED, add more particle layers.**

After verification passes:

```bash
git add -A && git commit -m "Phase 3: Implement 3 parallax star layers with different movement speeds"
```

---

## PHASE 4: Create Astro Component

### Task

Create `src/components/SpaceBackground.astro`:

```astro
---
// SpaceBackground.astro - Three.js starfield canvas
---

<canvas id="starfield-canvas"></canvas>

<style>
  #starfield-canvas {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    pointer-events: none;
  }
</style>

<script>
  import { initStarfield, updateParallax, cleanup } from "../scripts/starfield";

  const canvas = document.getElementById("starfield-canvas") as HTMLCanvasElement;

  if (canvas) {
    initStarfield(canvas);

    document.addEventListener("mousemove", (e) => {
      const normalizedX = (e.clientX / window.innerWidth) * 2 - 1;
      const normalizedY = (e.clientY / window.innerHeight) * 2 - 1;
      updateParallax(normalizedX, normalizedY);
    });
  }

  // Cleanup on page navigation (Astro)
  document.addEventListener("astro:before-swap", cleanup);
</script>
```

### Verification

```bash
test -f src/components/SpaceBackground.astro \
  && grep -q "starfield-canvas" src/components/SpaceBackground.astro \
  && grep -q "position: fixed" src/components/SpaceBackground.astro \
  && grep -q "initStarfield" src/components/SpaceBackground.astro \
  && grep -q "mousemove" src/components/SpaceBackground.astro \
  && grep -q "updateParallax" src/components/SpaceBackground.astro \
  && echo "PHASE_4_VERIFIED" || echo "PHASE_4_FAILED"
```

After verification passes:

```bash
git add -A && git commit -m "Phase 4: Create SpaceBackground Astro component with mouse tracking"
```

---

## PHASE 5: Integrate into Homepage

### Task

Modify `src/pages/index.astro`:

- Import SpaceBackground component at the top
- Add `<SpaceBackground />` as the first element inside the body/layout
- Ensure existing content remains

### Verification

```bash
grep -q "import.*SpaceBackground" src/pages/index.astro \
  && grep -q "<SpaceBackground" src/pages/index.astro \
  && echo "PHASE_5_VERIFIED" || echo "PHASE_5_FAILED"
```

After verification passes:

```bash
git add -A && git commit -m "Phase 5: Integrate SpaceBackground into homepage"
```

---

## PHASE 6: Create Glass UI Styles

### Task

Create `src/styles/space-theme.css` with glass-morphism effects:

```css
/* Space Theme - Glass Morphism */

:root {
  --space-bg: #0a0a12;
  --space-accent: #00d4ff;
  --space-accent-dim: rgba(0, 212, 255, 0.15);
  --glass-bg: rgba(10, 10, 20, 0.65);
  --glass-border: rgba(0, 212, 255, 0.12);
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0a0;
}

.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.glass-panel:hover {
  border-color: rgba(0, 212, 255, 0.25);
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.4),
    0 0 20px rgba(0, 212, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.glow-text {
  color: var(--space-accent);
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
}

.glow-border {
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
}

/* Ensure body doesn't have conflicting background */
body {
  background: var(--space-bg);
  color: var(--text-primary);
  min-height: 100vh;
}
```

Then import this CSS in the main layout or index.astro.

### Verification

```bash
test -f src/styles/space-theme.css \
  && grep -q "backdrop-filter" src/styles/space-theme.css \
  && grep -q "glass-panel" src/styles/space-theme.css \
  && grep -q "#00d4ff\|--space-accent" src/styles/space-theme.css \
  && echo "PHASE_6_VERIFIED" || echo "PHASE_6_FAILED"
```

After verification passes:

```bash
git add -A && git commit -m "Phase 6: Add glass-morphism CSS theme with cyan accents"
```

---

## PHASE 7: Apply Glass Styles to Content

### Task

Update `src/pages/index.astro` and any relevant components:

- Add `glass-panel` class to main content container(s)
- Ensure content is readable over the starfield
- Apply hover effects to interactive elements

### Verification

```bash
grep -rq "glass-panel" src/pages/ src/components/ \
  && echo "PHASE_7_VERIFIED" || echo "PHASE_7_FAILED"
```

After verification passes:

```bash
git add -A && git commit -m "Phase 7: Apply glass-panel styles to content containers"
```

---

## PHASE 8: Mobile and Touch Support

### Task

Update `src/scripts/starfield.ts`:

- Detect touch devices: `'ontouchstart' in window || navigator.maxTouchPoints > 0`
- On mobile: reduce total particle count by 50% for performance
- Add auto-drift animation as mouse fallback (gentle sine wave camera movement)
- Optionally: device orientation support for parallax on mobile

### Verification

```bash
grep -q "ontouchstart\|maxTouchPoints" src/scripts/starfield.ts \
  && grep -q "Math.sin\|auto.*drift\|animate" src/scripts/starfield.ts \
  && echo "PHASE_8_VERIFIED" || echo "PHASE_8_FAILED"
```

After verification passes:

```bash
git add -A && git commit -m "Phase 8: Add mobile detection and auto-drift fallback"
```

---

## PHASE 9: Accessibility - Reduced Motion

### Task

Update `src/scripts/starfield.ts`:

- Check `window.matchMedia('(prefers-reduced-motion: reduce)').matches`
- If reduced motion preferred: disable parallax movement, optionally show static stars or simple CSS background

### Verification

```bash
grep -q "prefers-reduced-motion" src/scripts/starfield.ts \
  && echo "PHASE_9_VERIFIED" || echo "PHASE_9_FAILED"
```

After verification passes:

```bash
git add -A && git commit -m "Phase 9: Respect prefers-reduced-motion accessibility setting"
```

---

## PHASE 10: TypeScript and Build Verification

### Task

- Fix any TypeScript errors
- Ensure `npm run build` completes successfully
- Fix any linting issues with `npm run lint -- --fix` if available

### Verification

```bash
npm run build > /tmp/build_output.txt 2>&1
BUILD_EXIT=$?
if [ $BUILD_EXIT -eq 0 ]; then
  echo "PHASE_10_VERIFIED"
else
  echo "PHASE_10_FAILED - Build errors:"
  cat /tmp/build_output.txt
fi
```

**If build fails, read the errors and fix them. Common issues:**

- Missing imports
- TypeScript type errors
- CSS syntax errors

After verification passes:

```bash
git add -A && git commit -m "Phase 10: Fix build errors, TypeScript passes"
```

---

## FINAL VERIFICATION CHECKLIST

Run this complete check. **ALL must show ✓ before outputting the completion promise:**

```bash
echo ""
echo "========================================="
echo "   FINAL VERIFICATION CHECKLIST"
echo "========================================="
echo ""

# 1. Dependencies
node -e "require('three'); require('gsap')" 2>/dev/null \
  && echo "✓ 1. Three.js and GSAP installed" \
  || echo "✗ 1. Dependencies missing"

# 2. Starfield file with required code
test -f src/scripts/starfield.ts \
  && grep -q "THREE.Scene" src/scripts/starfield.ts \
  && grep -q "THREE.WebGLRenderer" src/scripts/starfield.ts \
  && echo "✓ 2. Starfield core implemented" \
  || echo "✗ 2. Starfield missing or incomplete"

# 3. Three parallax layers
LAYERS=$(grep -c "new THREE.Points" src/scripts/starfield.ts 2>/dev/null || echo "0")
[ "$LAYERS" -ge 3 ] \
  && echo "✓ 3. Three parallax layers ($LAYERS found)" \
  || echo "✗ 3. Need 3+ particle layers (found $LAYERS)"

# 4. SpaceBackground component
test -f src/components/SpaceBackground.astro \
  && grep -q "initStarfield" src/components/SpaceBackground.astro \
  && echo "✓ 4. SpaceBackground component created" \
  || echo "✗ 4. SpaceBackground component missing"

# 5. Homepage integration
grep -q "<SpaceBackground" src/pages/index.astro 2>/dev/null \
  && echo "✓ 5. Homepage integrates SpaceBackground" \
  || echo "✗ 5. Homepage missing SpaceBackground"

# 6. Glass styles
test -f src/styles/space-theme.css \
  && grep -q "backdrop-filter" src/styles/space-theme.css \
  && echo "✓ 6. Glass-morphism styles created" \
  || echo "✗ 6. Glass styles missing"

# 7. Glass styles applied
grep -rq "glass-panel" src/pages/ src/components/ 2>/dev/null \
  && echo "✓ 7. Glass styles applied to content" \
  || echo "✗ 7. Glass styles not applied"

# 8. Mobile support
grep -q "ontouchstart\|maxTouchPoints" src/scripts/starfield.ts 2>/dev/null \
  && echo "✓ 8. Mobile/touch detection added" \
  || echo "✗ 8. Mobile support missing"

# 9. Reduced motion
grep -q "prefers-reduced-motion" src/scripts/starfield.ts 2>/dev/null \
  && echo "✓ 9. Reduced motion respected" \
  || echo "✗ 9. Reduced motion not implemented"

# 10. Build succeeds
npm run build > /dev/null 2>&1 \
  && echo "✓ 10. Production build succeeds" \
  || echo "✗ 10. Build fails"

echo ""
echo "========================================="
echo ""
```

## COMPLETION RULES

1. Run the FINAL VERIFICATION CHECKLIST above
2. Count the checkmarks (✓)
3. **If all 10 show ✓**: Push to git, then output `<promise>REDESIGN_COMPLETE</promise>`
4. **If ANY show ✗**: Go back to that phase and fix it. DO NOT output the promise.

```bash
# Only after all checks pass:
git push origin main
```

Then and ONLY then:

```
<promise>REDESIGN_COMPLETE</promise>
```

---

## IMPORTANT REMINDERS

- **DO NOT OPEN BROWSERS** - no `open`, no `npx playwright`, no preview servers that open browsers
- **DO NOT SKIP PHASES** - each builds on the last
- **DO NOT FAKE COMPLETION** - the verification commands check real files
- **THIS TAKES HOURS** - that is normal and expected
- **THE USER IS ASLEEP** - do not ask questions, figure it out
- **FIX ERRORS** - if something breaks, debug it, don't give up
- **COMMIT OFTEN** - after each phase passes verification

## Technical Notes

- Astro processes `.astro` files, TypeScript in `src/scripts/`
- Three.js needs a canvas element with explicit dimensions or parent sizing
- GSAP `gsap.to()` for smooth parallax interpolation
- BufferGeometry with Float32Array for particle positions
- Use `renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))` for performance
