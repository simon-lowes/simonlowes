/**
 * Encounter pacing for the starfield journey.
 *
 * Celestial objects (planets, galaxies, nebulae) spawn probabilistically per
 * frame once the journey has reached the right phase. The numbers here are
 * tuned so that a visitor sees something beyond stars within the first
 * minute: the old values (a nebula every 8 to 16 minutes, phase 4 after three
 * minutes) meant almost nobody ever saw the expensive effects.
 *
 * Kept free of Three.js imports so it can be unit-tested in Node.
 */

/** Frames per second the per-frame spawn rates are expressed against. */
export const ENCOUNTER_RATE_FPS = 60;

export const ENCOUNTER_CONFIG = {
  // Phase thresholds in seconds of journey time
  phases: {
    deepSpace: 0, // Phase 1: stars and the deep-sky backdrop
    distantGlow: 4, // Phase 2: background galaxies appear
    stellarDensity: 12, // Phase 3: planets and spiral galaxies
    cosmicWonder: 20, // Phase 4: nebulae become possible
  },

  // Probability per frame at ENCOUNTER_RATE_FPS. Mean wait = 1 / (rate * fps).
  spawnRates: {
    backgroundGalaxy: 0.011, // ~1 per 1.5 s (after Phase 2)
    planet: 0.00042, // ~1 per 40 s (after Phase 3)
    spiralGalaxy: 0.00028, // ~1 per 60 s (after Phase 3)
    spriteNebula: 0.00037, // ~1 per 45 s (after Phase 4)
    volumetricNebula: 0.00033, // ~1 per 50 s (after Phase 4, HIGH+ tiers)
  },

  // Shooting stars use a timer rather than a per-frame roll
  shootingStarIntervalMs: { min: 8000, max: 20000 },

  // Maximum concurrent objects (performance caps)
  maxActive: {
    planets: 4,
    spiralGalaxies: 3,
    spriteNebulae: 5,
    volumetricNebulae: 3,
    backgroundGalaxies: 200,
  },

  // Objects placed in the distance before the first frame, so the opening
  // view already has structure instead of an empty dot field
  opening: {
    backgroundGalaxies: 40,
    spriteNebulae: 2,
    volumetricNebulae: 1,
  },
} as const;

export type EncounterKind = keyof typeof ENCOUNTER_CONFIG.spawnRates;

/** Mean seconds between spawns for a per-frame probability. */
export function meanSecondsBetween(rate: number, fps = ENCOUNTER_RATE_FPS): number {
  return 1 / (rate * fps);
}

/** Journey phase (1 to 4) for a given number of seconds since start. */
export function journeyPhase(seconds: number): 1 | 2 | 3 | 4 {
  const { phases } = ENCOUNTER_CONFIG;
  if (seconds >= phases.cosmicWonder) return 4;
  if (seconds >= phases.stellarDensity) return 3;
  if (seconds >= phases.distantGlow) return 2;
  return 1;
}
