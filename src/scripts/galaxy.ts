/**
 * Hero galaxy: the centrepiece particle system.
 *
 * Thousands of glowing particles that drift as a loose star cloud, gather
 * into a three-arm spiral with a blazing core, turn slowly, and loosen again.
 * Every particle carries both formations as vertex attributes, so the morph,
 * the spin and the drift all happen in the vertex shader: no per-particle
 * CPU work, no compute shaders, runs on plain WebGL on every tier.
 *
 * Interaction: moving the pointer over the page brings out more stars and
 * stirs the particles under the cursor (a soft ripple that brightens and
 * pushes them aside); the effect fades a second or two after the pointer
 * rests. A click or tap anywhere (and each page navigation) "surges" the
 * galaxy: every particle fades in and the spiral forms at once, then the
 * extra stars ebb away over the following seconds. No glyphs or logos: the
 * formations stay a cloud and a spiral.
 *
 * Palette: site cyan for the arms, magenta highlights, white-hot core.
 */

import * as THREE from "three";
import { DEFAULT_SPIRAL, cloudFormation, spiralFormation, seededRandom } from "./galaxy-shapes";

export interface HeroGalaxySettings {
  /** Particle count for this tier. */
  count: number;
  /** Fraction of particles shown at rest (a surge shows them all). */
  restingReveal: number;
}

/** Seconds spent in each state before the next morph begins. */
export const GALAXY_TIMELINE = {
  cloudHold: 7,
  spiralHold: 14,
  morphSeconds: 3.2,
  surgeSeconds: 10,
};

const VERTEX = /* glsl */ `
  attribute vec3 aCloud;
  attribute vec3 aSpiral;
  attribute float aSeed;
  attribute float aSize;
  attribute float aRadial;

  uniform float uTime;
  uniform float uMorph;      // 0 = cloud, 1 = spiral
  uniform float uReveal;     // fraction of particles visible
  uniform float uPixelRatio;
  uniform float uRadius;
  uniform vec2 uPointer;     // pointer in normalised device coords
  uniform float uPointerStrength;
  uniform float uAspect;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vBright;

  uniform vec3 uCyan;
  uniform vec3 uMagenta;
  uniform vec3 uCore;

  void main() {
    // Each particle starts its morph at a different moment, so the change
    // ripples through the cloud instead of snapping
    float m = clamp((uMorph - aSeed * 0.35) / 0.65, 0.0, 1.0);
    m = m * m * (3.0 - 2.0 * m);
    vec3 p = mix(aCloud, aSpiral, m);

    // Differential rotation about the galaxy's axis: inner stars turn faster
    float r = length(p.xy) / uRadius;
    float spin = uTime * mix(0.035, 0.09, m) * (1.0 + 0.9 * (1.0 - clamp(r, 0.0, 1.0)));
    float c = cos(spin);
    float s = sin(spin);
    p.xy = mat2(c, -s, s, c) * p.xy;

    // Gentle breathing so nothing is ever still
    float drift = mix(6.0, 1.5, m);
    p += drift * vec3(
      sin(uTime * 0.7 + aSeed * 31.0),
      cos(uTime * 0.6 + aSeed * 47.0),
      sin(uTime * 0.5 + aSeed * 13.0)
    );

    // Reveal: particles with a seed above the threshold fade out
    float visible = 1.0 - smoothstep(uReveal - 0.12, uReveal, aSeed);

    // Twinkle
    float twinkle = 0.8 + 0.2 * sin(uTime * 3.0 + aSeed * 90.0);

    // Colour: white-hot core, cyan arms, magenta scattered through
    float coreMix = 1.0 - smoothstep(0.0, 0.2, aRadial);
    float magentaMix = smoothstep(0.35, 0.65, fract(aSeed * 7.31)) * 0.55;
    vec3 tint = mix(uCyan, uMagenta, magentaMix);
    vColor = mix(tint, uCore, coreMix * 0.75);
    vBright = aSize;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);

    // Pointer ripple: particles projected near the cursor brighten and are
    // nudged away from it, in view space so the push follows the screen
    vec4 clip = projectionMatrix * mv;
    vec2 ndc = clip.xy / clip.w;
    vec2 away = (ndc - uPointer) * vec2(uAspect, 1.0);
    float pointerDist = length(away);
    float influence = uPointerStrength * (1.0 - smoothstep(0.0, 0.3, pointerDist));
    mv.xy += normalize(away + vec2(1e-4, 0.0)) * influence * 16.0 * (0.4 + aSeed * 0.6);

    float size = aSize * (1.0 + coreMix * 0.6) * visible * twinkle * (1.0 + influence * 0.9);
    gl_PointSize = size * uPixelRatio * (700.0 / -mv.z);
    vAlpha = visible * (0.5 + 0.5 * coreMix) * (1.0 + influence * 0.5);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAGMENT = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vBright;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d2 = dot(uv, uv);
    if (d2 > 0.25) discard;

    float core = exp(-d2 * 70.0);
    float glow = exp(-d2 * 12.0) * 0.35;

    // Four-point sparkle on the brighter particles
    float star = smoothstep(5.0, 8.0, vBright);
    float cross = exp(-abs(uv.x) * 30.0) * exp(-abs(uv.y) * 5.0)
                + exp(-abs(uv.y) * 30.0) * exp(-abs(uv.x) * 5.0);
    float sparkle = cross * star * 0.5 * (1.0 - smoothstep(0.0, 0.5, sqrt(d2)));

    float intensity = core + glow + sparkle;
    vec3 color = mix(vColor, vec3(1.0), core * 0.3 + sparkle * 0.4);
    gl_FragColor = vec4(color * intensity, intensity * vAlpha);
  }
`;

export class HeroGalaxy {
  readonly points: THREE.Points;

  private readonly material: THREE.ShaderMaterial;
  private geometry: THREE.BufferGeometry;
  private settings: HeroGalaxySettings;

  // Timeline state
  private morph = 0;
  private morphTarget = 0;
  private stateTime = 0;
  private inSpiral = false;
  private reveal: number;
  private revealTarget: number;
  private surgeRemaining = 0;

  // Pointer state (normalised device coords) and how recently it moved
  private readonly pointer = new THREE.Vector2(0, 0);
  private readonly pointerTarget = new THREE.Vector2(0, 0);
  private pointerStrength = 0;
  private pointerIdleSeconds = 999;

  constructor(settings: HeroGalaxySettings, pixelRatio: number) {
    this.settings = { ...settings };
    this.reveal = settings.restingReveal;
    this.revealTarget = settings.restingReveal;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uReveal: { value: settings.restingReveal },
        uPixelRatio: { value: pixelRatio },
        uRadius: { value: DEFAULT_SPIRAL.radius },
        uCyan: { value: new THREE.Color(0x00d4ff) },
        uMagenta: { value: new THREE.Color(0xff3fb4) },
        uCore: { value: new THREE.Color(0xfff4e0) },
        uPointer: { value: new THREE.Vector2(0, 0) },
        uPointerStrength: { value: 0 },
        uAspect: { value: 1 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      depthTest: false,
    });

    this.geometry = HeroGalaxy.buildGeometry(settings.count);
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    // Tilted a little so the disc reads as a disc, sitting behind the near stars
    this.points.rotation.set(0.42, -0.18, 0);
    this.setAspect(1.6);
  }

  private static buildGeometry(count: number): THREE.BufferGeometry {
    const spiral = spiralFormation(count);
    const cloud = cloudFormation(count);
    const rng = seededRandom(23);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      seeds[i] = rng();
      // Mostly dust, a few bright stars
      const roll = rng();
      sizes[i] =
        roll > 0.985 ? 7.0 + rng() * 4.0 : roll > 0.9 ? 3.4 + rng() * 1.6 : 1.5 + rng() * 1.3;
    }
    const geometry = new THREE.BufferGeometry();
    // "position" is required by Three even though the shader ignores it
    geometry.setAttribute("position", new THREE.BufferAttribute(spiral.positions, 3));
    geometry.setAttribute("aSpiral", new THREE.BufferAttribute(spiral.positions, 3));
    geometry.setAttribute("aCloud", new THREE.BufferAttribute(cloud.positions, 3));
    geometry.setAttribute("aRadial", new THREE.BufferAttribute(spiral.radial, 1));
    geometry.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return geometry;
  }

  /** Rebuild for a new particle count or resting reveal (tier change). */
  applySettings(settings: HeroGalaxySettings): void {
    const rebuild = settings.count !== this.settings.count;
    this.settings = { ...settings };
    if (rebuild) {
      this.geometry.dispose();
      this.geometry = HeroGalaxy.buildGeometry(settings.count);
      this.points.geometry = this.geometry;
    }
  }

  setPixelRatio(ratio: number): void {
    this.material.uniforms.uPixelRatio!.value = ratio;
  }

  setAspect(aspect: number): void {
    this.material.uniforms.uAspect!.value = aspect;
    // Wide screens: off-centre to the right so the arms reach past the glass
    // panel. Portrait phones: centred and smaller so the whole disc fits.
    const wide = aspect >= 1;
    this.points.position.set(wide ? 230 : 0, wide ? 50 : 120, -560);
    const scale = wide ? 1 : Math.max(0.55, aspect * 0.95);
    this.points.scale.setScalar(scale);
  }

  /** Pointer position in normalised device coords (-1..1, y up). */
  setPointer(x: number, y: number): void {
    this.pointerTarget.set(x, y);
    this.pointerIdleSeconds = 0;
  }

  /** Show every particle and pull the spiral together now. */
  surge(): void {
    this.revealTarget = 1;
    this.surgeRemaining = GALAXY_TIMELINE.surgeSeconds;
    if (!this.inSpiral) {
      this.inSpiral = true;
      this.morphTarget = 1;
      this.stateTime = 0;
    }
  }

  update(timeSeconds: number, deltaSeconds: number): void {
    const dt = Math.min(Math.max(deltaSeconds, 0), 0.1);

    // Cloud <-> spiral timeline
    this.stateTime += dt;
    const hold = this.inSpiral ? GALAXY_TIMELINE.spiralHold : GALAXY_TIMELINE.cloudHold;
    if (this.stateTime >= hold + GALAXY_TIMELINE.morphSeconds) {
      this.inSpiral = !this.inSpiral;
      this.morphTarget = this.inSpiral ? 1 : 0;
      this.stateTime = 0;
    }
    const morphRate = dt / GALAXY_TIMELINE.morphSeconds;
    this.morph += Math.max(-morphRate, Math.min(morphRate, this.morphTarget - this.morph));

    // Surge decay
    if (this.surgeRemaining > 0) this.surgeRemaining -= dt;
    // Pointer: follow smoothly, strength fades once it rests
    this.pointerIdleSeconds += dt;
    const strengthTarget = this.pointerIdleSeconds < 1.5 ? 1 : 0;
    this.pointerStrength += (strengthTarget - this.pointerStrength) * Math.min(1, dt * 3);
    this.pointer.lerp(this.pointerTarget, Math.min(1, dt * 8));

    // Hovering brings out more stars; a surge brings out all of them
    if (this.surgeRemaining <= 0) {
      const resting = this.settings.restingReveal;
      this.revealTarget = resting + (1 - resting) * 0.7 * this.pointerStrength;
    }

    // Reveal rises fast, ebbs slowly
    const revealRate = this.revealTarget > this.reveal ? dt * 1.2 : dt * 0.12;
    this.reveal += Math.max(-revealRate, Math.min(revealRate, this.revealTarget - this.reveal));

    this.material.uniforms.uTime!.value = timeSeconds;
    this.material.uniforms.uMorph!.value = this.morph;
    this.material.uniforms.uReveal!.value = this.reveal;
    (this.material.uniforms.uPointer!.value as THREE.Vector2).copy(this.pointer);
    this.material.uniforms.uPointerStrength!.value = this.pointerStrength;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
