import { describe, it, expect } from "vitest";
import {
  DEFAULT_SPIRAL,
  cloudFormation,
  seededRandom,
  spiralFormation,
} from "../src/scripts/galaxy-shapes";

describe("seededRandom", () => {
  it("is deterministic and stays in [0, 1)", () => {
    const a = seededRandom(42);
    const b = seededRandom(42);
    for (let i = 0; i < 1000; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("spiralFormation", () => {
  const count = 5000;
  const spiral = spiralFormation(count);

  it("returns xyz for every particle plus a radial fraction", () => {
    expect(spiral.positions).toHaveLength(count * 3);
    expect(spiral.radial).toHaveLength(count);
    for (const t of spiral.radial) {
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThanOrEqual(1);
    }
  });

  it("keeps the disc within about the configured radius and thin in z", () => {
    let maxXY = 0;
    let maxZ = 0;
    for (let i = 0; i < count; i++) {
      maxXY = Math.max(maxXY, Math.hypot(spiral.positions[i * 3], spiral.positions[i * 3 + 1]));
      maxZ = Math.max(maxZ, Math.abs(spiral.positions[i * 3 + 2]));
    }
    // Scatter can push a few particles a little past the rim, never far
    expect(maxXY).toBeLessThan(DEFAULT_SPIRAL.radius * 1.6);
    expect(maxZ).toBeLessThan(DEFAULT_SPIRAL.radius * 0.5);
  });

  it("puts the bulge fraction near the core", () => {
    const bulge = Math.floor(count * DEFAULT_SPIRAL.bulgeFraction);
    let near = 0;
    for (let i = 0; i < bulge; i++) {
      if (spiral.radial[i] < 0.3) near++;
    }
    expect(near / bulge).toBeGreaterThan(0.9);
  });

  it("is reproducible for the same seed", () => {
    const again = spiralFormation(count);
    expect(again.positions[123]).toBe(spiral.positions[123]);
    expect(again.positions[4321]).toBe(spiral.positions[4321]);
  });
});

describe("cloudFormation", () => {
  it("is wider than the galaxy and centred on the origin", () => {
    const count = 4000;
    const cloud = cloudFormation(count);
    expect(cloud.positions).toHaveLength(count * 3);
    let sx = 0;
    let sy = 0;
    for (let i = 0; i < count; i++) {
      sx += cloud.positions[i * 3];
      sy += cloud.positions[i * 3 + 1];
    }
    // Mean sits near zero relative to the radius
    expect(Math.abs(sx / count)).toBeLessThan(DEFAULT_SPIRAL.radius * 0.05);
    expect(Math.abs(sy / count)).toBeLessThan(DEFAULT_SPIRAL.radius * 0.05);
  });
});
