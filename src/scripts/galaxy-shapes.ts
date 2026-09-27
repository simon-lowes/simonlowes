/**
 * Particle formations for the hero galaxy: where each particle sits in the
 * loose "cloud" state and in the "spiral" state. The vertex shader blends
 * between the two, so these run once at start-up and never per frame.
 *
 * Pure maths, no Three.js, so it is unit-tested in Node.
 */

export interface SpiralOptions {
  /** Outer radius of the disc in world units. */
  radius: number;
  /** Number of arms. */
  arms: number;
  /** How many times each arm wraps around the core. */
  windings: number;
  /** Disc thickness as a fraction of the radius. */
  thickness: number;
  /** Fraction of particles that form the central bulge. */
  bulgeFraction: number;
}

export interface Formation {
  /** xyz per particle. */
  positions: Float32Array;
  /** 0..1 per particle: how far from the core (0 = core), used for colour and size. */
  radial: Float32Array;
}

/** Small deterministic PRNG (mulberry32) so formations are reproducible. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Approximately normal-distributed value (mean 0, sd 1). */
function gaussian(rng: () => number): number {
  // Box-Muller
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export const DEFAULT_SPIRAL: SpiralOptions = {
  radius: 320,
  arms: 3,
  windings: 1.0,
  thickness: 0.08,
  bulgeFraction: 0.18,
};

/**
 * A spiral galaxy seen face-on: a dense bulge, arms that wind outwards with a
 * little scatter, thinner and sparser towards the rim.
 */
export function spiralFormation(
  count: number,
  options: SpiralOptions = DEFAULT_SPIRAL,
  rng: () => number = seededRandom(7)
): Formation {
  const positions = new Float32Array(count * 3);
  const radial = new Float32Array(count);
  const { radius, arms, windings, thickness, bulgeFraction } = options;
  const bulgeCount = Math.floor(count * bulgeFraction);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    let x: number;
    let y: number;
    let z: number;
    let t: number;

    if (i < bulgeCount) {
      // Bulge: gaussian ball, slightly flattened
      const r = Math.abs(gaussian(rng)) * radius * 0.12;
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      x = r * Math.sin(phi) * Math.cos(theta);
      y = r * Math.sin(phi) * Math.sin(theta);
      z = r * Math.cos(phi) * 0.6;
      t = Math.min(r / radius, 1);
    } else {
      // Arms: radius biased towards the middle of the disc
      t = Math.pow(rng(), 0.65);
      const arm = i % arms;
      const armAngle = (arm / arms) * Math.PI * 2;
      const angle = armAngle + t * windings * Math.PI * 2;
      // Scatter grows with radius so arms fray at the rim
      const scatter = gaussian(rng) * (0.03 + t * 0.11) * radius;
      const r = t * radius;
      x = Math.cos(angle) * r + Math.cos(angle + Math.PI / 2) * scatter;
      y = Math.sin(angle) * r + Math.sin(angle + Math.PI / 2) * scatter;
      z = gaussian(rng) * thickness * radius * (1 - t * 0.6);
    }

    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    radial[i] = t;
  }

  return { positions, radial };
}

/**
 * The dispersed state: a loose gaussian cloud with a denser heart, wider than
 * the galaxy so the morph reads as stars being drawn in.
 */
export function cloudFormation(
  count: number,
  radius: number = DEFAULT_SPIRAL.radius * 1.35,
  rng: () => number = seededRandom(11)
): Formation {
  const positions = new Float32Array(count * 3);
  const radial = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const i3 = i * 3;
    // Two populations: a compact core and a wide halo
    const core = rng() < 0.3;
    const spread = core ? 0.18 : 0.55;
    const x = gaussian(rng) * spread * radius;
    const y = gaussian(rng) * spread * radius * 0.75;
    const z = gaussian(rng) * spread * radius * 0.5;
    positions[i3] = x;
    positions[i3 + 1] = y;
    positions[i3 + 2] = z;
    radial[i] = Math.min(Math.hypot(x, y, z) / radius, 1);
  }

  return { positions, radial };
}
