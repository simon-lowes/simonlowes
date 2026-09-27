import { describe, it, expect } from "vitest";
import {
  ENCOUNTER_CONFIG,
  ENCOUNTER_RATE_FPS,
  journeyPhase,
  meanSecondsBetween,
} from "../src/scripts/encounters";

describe("Encounter pacing", () => {
  it("reaches the nebula phase within half a minute", () => {
    const { phases } = ENCOUNTER_CONFIG;
    expect(phases.deepSpace).toBe(0);
    expect(phases.distantGlow).toBeLessThan(phases.stellarDensity);
    expect(phases.stellarDensity).toBeLessThan(phases.cosmicWonder);
    expect(phases.cosmicWonder).toBeLessThanOrEqual(30);
  });

  it("spawns every kind of encounter within about a minute on average", () => {
    for (const [kind, rate] of Object.entries(ENCOUNTER_CONFIG.spawnRates)) {
      const wait = meanSecondsBetween(rate);
      expect(wait, kind).toBeLessThanOrEqual(65);
      expect(wait, kind).toBeGreaterThan(1);
    }
  });

  it("shows a shooting star every few seconds, not every minute", () => {
    const { min, max } = ENCOUNTER_CONFIG.shootingStarIntervalMs;
    expect(min).toBeGreaterThanOrEqual(3000);
    expect(max).toBeLessThanOrEqual(30000);
    expect(min).toBeLessThan(max);
  });

  it("seeds the opening view but stays under the concurrency caps", () => {
    const { opening, maxActive } = ENCOUNTER_CONFIG;
    expect(opening.backgroundGalaxies).toBeGreaterThan(0);
    expect(opening.spriteNebulae).toBeGreaterThan(0);
    expect(opening.volumetricNebulae).toBeGreaterThan(0);
    expect(opening.backgroundGalaxies).toBeLessThanOrEqual(maxActive.backgroundGalaxies);
    expect(opening.spriteNebulae).toBeLessThanOrEqual(maxActive.spriteNebulae);
    expect(opening.volumetricNebulae).toBeLessThanOrEqual(maxActive.volumetricNebulae);
  });

  it("maps journey time to phases", () => {
    const { phases } = ENCOUNTER_CONFIG;
    expect(journeyPhase(0)).toBe(1);
    expect(journeyPhase(phases.distantGlow)).toBe(2);
    expect(journeyPhase(phases.stellarDensity)).toBe(3);
    expect(journeyPhase(phases.cosmicWonder)).toBe(4);
    expect(journeyPhase(phases.cosmicWonder + 1000)).toBe(4);
  });

  it("expresses rates against 60 fps", () => {
    expect(ENCOUNTER_RATE_FPS).toBe(60);
    expect(meanSecondsBetween(1 / 60)).toBeCloseTo(1);
  });
});
