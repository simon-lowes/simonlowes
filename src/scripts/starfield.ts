/**
 * Starfield - Three.js procedural deep space background
 * Dense immersive starfield with realistic colors, galaxies, and twinkling
 * Inspired by Andromeda galaxy imagery
 */

import * as THREE from "three";
import { ParallaxController } from "./parallax";
import { QualityManager, type QualityConfig } from "./quality";
import {
  EffectComposer,
  BloomEffect,
  EffectPass,
  RenderPass,
  VignetteEffect,
  ChromaticAberrationEffect,
  NoiseEffect,
  ToneMappingEffect,
  ToneMappingMode,
  BlendFunction,
  KernelSize,
} from "postprocessing";

// ===========================================================
// REALISTIC STELLAR CLASSIFICATION - Based on astronomy research
// Distribution weighted by APPARENT BRIGHTNESS (visible from Earth)
// not by actual frequency (M-dwarfs are 75% of stars but too dim to see)
// ===========================================================

interface StellarClass {
  colors: number[]; // Hex colors for this spectral type
  tempRange: [number, number]; // Temperature in Kelvin
  baseBrightness: number; // Relative brightness multiplier
  frequency: number; // Probability in visible star distribution
}

const STELLAR_CLASSIFICATION: Record<string, StellarClass> = {
  // Class O - Extremely hot blue giants (>30,000K)
  // Only ~1 in 3 million stars, but so luminous they're visible across galaxies
  O: {
    colors: [0x9bb0ff, 0xaabbff, 0x99aaff],
    tempRange: [30000, 50000],
    baseBrightness: 2.5,
    frequency: 0.01, // 1% of visible stars
  },
  // Class B - Hot blue-white stars (10,000-30,000K)
  // Rigel, Spica - young, luminous stars in spiral arms
  B: {
    colors: [0xaabfff, 0xbbd0ff, 0xccdaff],
    tempRange: [10000, 30000],
    baseBrightness: 1.8,
    frequency: 0.07, // 7% of visible stars
  },
  // Class A - White stars (7,500-10,000K)
  // Sirius, Vega - hydrogen-burning main sequence
  A: {
    colors: [0xf8f7ff, 0xffffff, 0xfef9ff],
    tempRange: [7500, 10000],
    baseBrightness: 1.4,
    frequency: 0.12, // 12% of visible stars
  },
  // Class F - Yellow-white stars (6,000-7,500K)
  // Procyon, Canopus - slightly hotter than our Sun
  F: {
    colors: [0xfff4ea, 0xfff8f0, 0xfff5e8],
    tempRange: [6000, 7500],
    baseBrightness: 1.2,
    frequency: 0.2, // 20% of visible stars
  },
  // Class G - Yellow stars like our Sun (5,000-6,000K)
  // Alpha Centauri A, Tau Ceti
  G: {
    colors: [0xfff2d1, 0xffedba, 0xffeab3],
    tempRange: [5000, 6000],
    baseBrightness: 1.0,
    frequency: 0.2, // 20% of visible stars
  },
  // Class K - Orange stars (3,500-5,000K)
  // Arcturus, Aldebaran (orange giants visible despite lower temp)
  K: {
    colors: [0xffd8a8, 0xffcc8f, 0xffc080],
    tempRange: [3500, 5000],
    baseBrightness: 0.9,
    frequency: 0.25, // 25% of visible stars
  },
  // Class M - Red dwarfs and red giants (<3,500K)
  // Betelgeuse (giant), Proxima Centauri (dwarf)
  // Most common stars but usually too dim - visible ones are giants
  M: {
    colors: [0xffb870, 0xffa060, 0xff8c50, 0xff7040],
    tempRange: [2500, 3500],
    baseBrightness: 0.7,
    frequency: 0.15, // 15% of visible stars
  },
};

// Rare stellar phenomena probabilities
const RARE_PHENOMENA = {
  blueSupergiants: 0.001, // 0.1% of stars - Rigel-like massive blue stars
  redGiants: 0.02, // 2% of stars - Betelgeuse-like evolved giants
  binarySystems: 0.05, // 5% - visually close double stars
  variableStars: 0.01, // 1% - stars with pronounced brightness variation
};

// Legacy color arrays for backwards compatibility
const STAR_COLORS = {
  blueWhite: STELLAR_CLASSIFICATION.O.colors.concat(STELLAR_CLASSIFICATION.B.colors),
  white: STELLAR_CLASSIFICATION.A.colors.concat(STELLAR_CLASSIFICATION.F.colors),
  orange: STELLAR_CLASSIFICATION.G.colors.concat(STELLAR_CLASSIFICATION.K.colors),
  red: STELLAR_CLASSIFICATION.M.colors,
};

// JWST-inspired nebula colors based on emission spectra
// These colors represent actual ionized gas emissions observed by telescopes
const NEBULA_COLORS = {
  // Hydrogen-alpha (H-alpha) - ionized hydrogen, the most common nebula emission
  hydrogenAlpha: 0xff4444, // Deep red
  // Oxygen III (O-III) - doubly ionized oxygen, gives the teal/blue glow
  oxygenIII: 0x33ccaa, // Teal-blue
  // Sulfur II (S-II) - ionized sulfur, appears in star-forming regions
  sulfurII: 0xff8844, // Orange
  // Nitrogen II (N-II) - ionized nitrogen
  nitrogenII: 0xcc4466, // Pink-red
  // Reflection nebulae - blue due to scattered starlight
  reflection: 0x4488cc, // Blue
  // Combination colors seen in famous nebulae
  pillarsOfCreation: 0x886644, // Brownish dust pillars
  carinaCliffs: 0x664422, // Dark cosmic cliffs
};

// Nebula types for variety
type NebulaType = "emission" | "reflection" | "planetary" | "starForming" | "pillars";

// Probabilities for each nebula type
const NEBULA_TYPE_DISTRIBUTION: Record<NebulaType, number> = {
  emission: 0.35, // Most common - glowing ionized gas
  starForming: 0.25, // Active star formation with mixed colors
  reflection: 0.2, // Blue scattered light nebulae
  planetary: 0.1, // Ring-shaped dying star remnants
  pillars: 0.1, // Pillar structures like Pillars of Creation
};

interface StarLayer {
  group: THREE.Group;
  geometry: THREE.BufferGeometry;
  material: THREE.ShaderMaterial;
  zMin: number;
  zMax: number;
  parallaxFactor: number;
}

interface CelestialBody {
  mesh: THREE.Mesh | THREE.Sprite | THREE.Group;
  type: "planet" | "galaxy" | "nebula";
  speed: number;
  rotationSpeed?: number;
  atmosphere?: THREE.Mesh;
  clouds?: THREE.Mesh;
}

// ===========================================================
// SIMPLEX NOISE - Procedural texture generation
// ===========================================================
class SimplexNoise {
  private perm: number[] = [];

  constructor(seed = Math.random()) {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;

    // Shuffle based on seed
    let s = seed * 10000;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    for (let i = 0; i < 512; i++) this.perm[i] = p[i & 255];
  }

  noise2D(x: number, y: number): number {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;

    const s = (x + y) * F2;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);

    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = x - X0;
    const y0 = y - Y0;

    let i1, j1;
    if (x0 > y0) {
      i1 = 1;
      j1 = 0;
    } else {
      i1 = 0;
      j1 = 1;
    }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2;
    const y2 = y0 - 1 + 2 * G2;

    const ii = i & 255;
    const jj = j & 255;

    const grad = (hash: number, gx: number, gy: number) => {
      const h = hash & 7;
      const u = h < 4 ? gx : gy;
      const v = h < 4 ? gy : gx;
      return (h & 1 ? -u : u) + (h & 2 ? -2 * v : 2 * v);
    };

    let n0, n1, n2;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * grad(this.perm[ii + this.perm[jj]], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * grad(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * grad(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2);
    }

    return 70 * (n0 + n1 + n2);
  }

  // Fractal Brownian Motion for more natural textures
  fbm(x: number, y: number, octaves = 6): number {
    let value = 0;
    let amplitude = 0.5;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += amplitude * this.noise2D(x * frequency, y * frequency);
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }
}

// Planet colors
const PLANET_COLORS = [
  0x4a6741, 0x6b4423, 0x3d5a80, 0x8b4513, 0x2f4f4f, 0x704214, 0x1e3a5f, 0x5d4e6d,
];

// Camera position - set back from origin to see stars in front
const CAMERA_Z = 100;

// Forward motion constants
const FORWARD_SPEED = 0.5;
const STAR_RECYCLE_Z = CAMERA_Z + 50;
const CELESTIAL_SPAWN_Z = -2000;
const CELESTIAL_RECYCLE_Z = CAMERA_Z + 100;

// Interface for tracking bright stars that get diffraction spikes
interface BrightStar {
  index: number;
  x: number;
  y: number;
  z: number;
  brightness: number;
  color: THREE.Color;
}

export class Starfield {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private animationId: number | null = null;
  private layers: StarLayer[] = [];
  private celestialBodies: CelestialBody[] = [];
  private parallax: ParallaxController;
  private lastTime = 0;
  private startTime = 0;
  private targetFps = 60;
  private frameInterval = 1000 / 60;

  // Camera rotation targets for smooth steering
  private targetRotationX = 0;
  private targetRotationY = 0;

  // Brightest stars for JWST-style diffraction spikes
  private brightStarsForSpikes: BrightStar[] = [];
  private diffractionSprites: THREE.Sprite[] = [];

  // Shooting star system
  private shootingStars: THREE.Group[] = [];
  private lastShootingStarTime = 0;
  private nextShootingStarInterval = 30000 + Math.random() * 30000; // 30-60 seconds

  // Post-processing
  private composer: EffectComposer;
  private bloomEffect: BloomEffect | null = null;
  private chromaticEffect: ChromaticAberrationEffect | null = null;
  private noiseEffect: NoiseEffect | null = null;
  private effectPass: EffectPass | null = null;
  private toneMappingEffect: ToneMappingEffect | null = null;

  // Quality management
  private qualityManager: QualityManager;
  private qualityConfig: QualityConfig;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.startTime = performance.now();

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050510); // Deeper space black

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      4000 // Extended for distant galaxies
    );
    this.camera.position.z = CAMERA_Z;

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });

    // Initialize quality management with GPU detection
    const gl = this.renderer.getContext();
    this.qualityManager = new QualityManager(gl);
    this.qualityConfig = this.qualityManager.getConfig();

    // Apply quality-based settings
    this.targetFps = this.qualityConfig.targetFps;
    this.frameInterval = 1000 / this.targetFps;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, this.qualityConfig.pixelRatioLimit)
    );
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Log quality tier in dev mode
    if (import.meta.env.DEV) {
      const debug = this.qualityManager.getDebugInfo();
      console.log(`[Starfield] Quality: ${debug.currentTier.toUpperCase()}`, debug);
    }

    // Initialize post-processing pipeline
    this.composer = new EffectComposer(this.renderer);

    // Render pass - renders the scene (always enabled)
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Build effects array based on quality config
    this.setupPostProcessing();

    // Register callback for dynamic quality changes
    this.qualityManager.onConfigChange((newConfig) => {
      this.handleQualityChange(newConfig);
    });

    // Initialize parallax controller (always full animation)
    this.parallax = new ParallaxController(false);

    // Create all visual elements
    this.createLayers();
    this.createDiffractionSpikes(); // JWST-style spikes on brightest stars
    this.createNebulae();
    this.createCelestialBodies();
    this.createBackgroundGalaxyField(); // Hubble Deep Field style distant galaxies

    // Bind event handlers
    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener("resize", this.handleResize);
  }

  /**
   * Setup post-processing effects based on quality config
   */
  private setupPostProcessing(): void {
    const effects: (
      | BloomEffect
      | VignetteEffect
      | ChromaticAberrationEffect
      | NoiseEffect
      | ToneMappingEffect
    )[] = [];

    // Bloom effect (HIGH+ quality)
    if (this.qualityConfig.bloomEnabled) {
      this.bloomEffect = new BloomEffect({
        intensity: this.qualityConfig.bloomIntensity,
        luminanceThreshold: 0.4,
        luminanceSmoothing: 0.3,
        mipmapBlur: true,
        kernelSize: KernelSize.LARGE,
      });
      effects.push(this.bloomEffect);
    }

    // Vignette effect (always enabled - very cheap)
    if (this.qualityConfig.vignetteEnabled) {
      const vignetteEffect = new VignetteEffect({
        darkness: 0.4,
        offset: 0.35,
      });
      effects.push(vignetteEffect);
    }

    // Chromatic aberration (HIGH+ quality)
    if (this.qualityConfig.chromaticEnabled) {
      this.chromaticEffect = new ChromaticAberrationEffect({
        offset: new THREE.Vector2(0.0008, 0.0008),
        radialModulation: true,
        modulationOffset: 0.3,
      });
      effects.push(this.chromaticEffect);
    }

    // Film grain (HIGH+ quality)
    if (this.qualityConfig.grainEnabled) {
      this.noiseEffect = new NoiseEffect({
        blendFunction: BlendFunction.MULTIPLY,
        premultiply: true,
      });
      this.noiseEffect.blendMode.opacity.value = 0.08;
      effects.push(this.noiseEffect);
    }

    // Adaptive exposure / tone mapping (MEDIUM+ quality)
    // Dynamically adjusts brightness based on scene luminance
    // Creates cinematic eye-adaptation effect when panning
    if (this.qualityConfig.adaptiveExposureEnabled) {
      this.toneMappingEffect = new ToneMappingEffect({
        mode: ToneMappingMode.REINHARD2_ADAPTIVE,
        resolution: 256, // Luminance texture resolution
        adaptationRate: 0.5, // How fast exposure adapts (lower = smoother)
        middleGrey: 0.5, // Target middle grey (affects overall brightness)
        whitePoint: 5.0, // Maximum luminance before clipping
        minLuminance: 0.01, // Minimum luminance to prevent over-brightening in dark areas
        averageLuminance: 1.0, // Initial average luminance
      });
      effects.push(this.toneMappingEffect);
    }

    // Only create effect pass if we have effects
    if (effects.length > 0) {
      this.effectPass = new EffectPass(this.camera, ...effects);
      this.composer.addPass(this.effectPass);
    }
  }

  /**
   * Handle dynamic quality change (from adaptive FPS monitoring)
   */
  private handleQualityChange(newConfig: QualityConfig): void {
    this.qualityConfig = newConfig;
    this.targetFps = newConfig.targetFps;
    this.frameInterval = 1000 / this.targetFps;

    // Update bloom intensity if it exists
    if (this.bloomEffect && newConfig.bloomEnabled) {
      this.bloomEffect.intensity = newConfig.bloomIntensity;
    }

    // Note: Full effect rebuilding would require recreating the composer
    // For now, we just adjust parameters that can be changed dynamically
    if (import.meta.env.DEV) {
      console.log(`[Starfield] Quality changed to: ${this.qualityManager.getTier()}`);
    }
  }

  /**
   * Get a random stellar class based on realistic frequency distribution
   * Returns the spectral class key (O, B, A, F, G, K, M)
   */
  private getRandomStellarClass(): string {
    const roll = Math.random();
    let cumulative = 0;

    for (const [classKey, classData] of Object.entries(STELLAR_CLASSIFICATION)) {
      cumulative += classData.frequency;
      if (roll < cumulative) {
        return classKey;
      }
    }
    return "G"; // Default to Sun-like if rounding errors
  }

  /**
   * Get star color and brightness based on realistic stellar classification
   * Returns { color, brightness, isRare } for special rendering
   */
  private getRealisticStarProperties(): {
    color: THREE.Color;
    brightness: number;
    stellarClass: string;
    isSupergiant: boolean;
    isRedGiant: boolean;
  } {
    const stellarClass = this.getRandomStellarClass();
    const classData = STELLAR_CLASSIFICATION[stellarClass];
    const colors = classData.colors;
    const baseColor = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);

    // Check for rare phenomena
    const isSupergiant =
      stellarClass === "O" || stellarClass === "B"
        ? Math.random() < RARE_PHENOMENA.blueSupergiants * 10 // Higher chance for O/B
        : false;

    const isRedGiant =
      stellarClass === "M" || stellarClass === "K"
        ? Math.random() < RARE_PHENOMENA.redGiants
        : false;

    // Calculate brightness with rare phenomenon bonuses
    let brightness = classData.baseBrightness;

    if (isSupergiant) {
      // Blue supergiants are MUCH brighter than typical stars
      brightness *= 3.0 + Math.random() * 2.0;
    }

    if (isRedGiant) {
      // Red giants are larger and brighter than typical red dwarfs
      brightness *= 2.0 + Math.random() * 1.5;
    }

    // Add natural variation (stars of same class vary in brightness)
    brightness *= 0.7 + Math.random() * 0.6;

    return {
      color: baseColor,
      brightness,
      stellarClass,
      isSupergiant,
      isRedGiant,
    };
  }

  /**
   * Legacy method: Get a random star color based on realistic stellar distribution
   */
  private getRandomStarColor(): THREE.Color {
    return this.getRealisticStarProperties().color;
  }

  private createLayers(): void {
    // Particle counts are now driven by quality tier
    const spreadX = 2500;
    const spreadY = 2500;

    // ===========================================================
    // FAR LAYER - Dense backdrop of distant stars (2% parallax)
    // ===========================================================
    const farCount = this.qualityConfig.farStarCount;
    const farZMin = -1500;
    const farZMax = -600;

    const farGeometry = new THREE.BufferGeometry();
    const farPositions = new Float32Array(farCount * 3);
    const farSizes = new Float32Array(farCount);
    const farColorArray = new Float32Array(farCount * 3);
    const farTwinklePhase = new Float32Array(farCount);

    for (let i = 0; i < farCount; i++) {
      const i3 = i * 3;
      farPositions[i3] = (Math.random() - 0.5) * spreadX;
      farPositions[i3 + 1] = (Math.random() - 0.5) * spreadY;
      farPositions[i3 + 2] = farZMin + Math.random() * (farZMax - farZMin);

      // Use realistic stellar classification for color and brightness
      const starProps = this.getRealisticStarProperties();

      // Size is now driven by stellar classification brightness
      // Far layer base sizes are small, but scale with stellar brightness
      const baseSize = 0.2 + Math.random() * 0.3;
      farSizes[i] = baseSize * starProps.brightness;

      // Rare supergiants get extra size boost
      if (starProps.isSupergiant || starProps.isRedGiant) {
        farSizes[i] *= 1.5;
      }

      farColorArray[i3] = starProps.color.r;
      farColorArray[i3 + 1] = starProps.color.g;
      farColorArray[i3 + 2] = starProps.color.b;

      farTwinklePhase[i] = Math.random() * Math.PI * 2;
    }

    farGeometry.setAttribute("position", new THREE.BufferAttribute(farPositions, 3));
    farGeometry.setAttribute("size", new THREE.BufferAttribute(farSizes, 1));
    farGeometry.setAttribute("color", new THREE.BufferAttribute(farColorArray, 3));
    farGeometry.setAttribute("twinklePhase", new THREE.BufferAttribute(farTwinklePhase, 1));

    const farMaterial = this.createStarMaterial();
    const farPoints = new THREE.Points(farGeometry, farMaterial);
    const farGroup = new THREE.Group();
    farGroup.add(farPoints);
    this.scene.add(farGroup);

    this.layers.push({
      group: farGroup,
      geometry: farGeometry,
      material: farMaterial,
      zMin: farZMin,
      zMax: farZMax,
      parallaxFactor: 0.02,
    });

    // ===========================================================
    // MID LAYER - Medium density stars (5% parallax)
    // ===========================================================
    const midCount = this.qualityConfig.midStarCount;
    const midZMin = -600;
    const midZMax = -150;

    const midGeometry = new THREE.BufferGeometry();
    const midPositions = new Float32Array(midCount * 3);
    const midSizes = new Float32Array(midCount);
    const midColorArray = new Float32Array(midCount * 3);
    const midTwinklePhase = new Float32Array(midCount);

    for (let i = 0; i < midCount; i++) {
      const i3 = i * 3;
      midPositions[i3] = (Math.random() - 0.5) * spreadX;
      midPositions[i3 + 1] = (Math.random() - 0.5) * spreadY;
      midPositions[i3 + 2] = midZMin + Math.random() * (midZMax - midZMin);

      // Use realistic stellar classification for color and brightness
      const starProps = this.getRealisticStarProperties();

      // Mid layer stars are medium sized, scaled by stellar brightness
      const baseSize = 0.5 + Math.random() * 0.5;
      midSizes[i] = baseSize * starProps.brightness;

      // Supergiants and red giants are significantly larger
      if (starProps.isSupergiant) {
        midSizes[i] *= 2.0;
      } else if (starProps.isRedGiant) {
        midSizes[i] *= 1.8;
      }

      midColorArray[i3] = starProps.color.r;
      midColorArray[i3 + 1] = starProps.color.g;
      midColorArray[i3 + 2] = starProps.color.b;

      midTwinklePhase[i] = Math.random() * Math.PI * 2;
    }

    midGeometry.setAttribute("position", new THREE.BufferAttribute(midPositions, 3));
    midGeometry.setAttribute("size", new THREE.BufferAttribute(midSizes, 1));
    midGeometry.setAttribute("color", new THREE.BufferAttribute(midColorArray, 3));
    midGeometry.setAttribute("twinklePhase", new THREE.BufferAttribute(midTwinklePhase, 1));

    const midMaterial = this.createStarMaterial();
    const midPoints = new THREE.Points(midGeometry, midMaterial);
    const midGroup = new THREE.Group();
    midGroup.add(midPoints);
    this.scene.add(midGroup);

    this.layers.push({
      group: midGroup,
      geometry: midGeometry,
      material: midMaterial,
      zMin: midZMin,
      zMax: midZMax,
      parallaxFactor: 0.05,
    });

    // ===========================================================
    // NEAR LAYER - Bright foreground stars (10% parallax)
    // ===========================================================
    const nearCount = this.qualityConfig.nearStarCount;
    const nearZMin = -150;
    const nearZMax = 20;

    const nearGeometry = new THREE.BufferGeometry();
    const nearPositions = new Float32Array(nearCount * 3);
    const nearSizes = new Float32Array(nearCount);
    const nearColorArray = new Float32Array(nearCount * 3);
    const nearTwinklePhase = new Float32Array(nearCount);

    // Track brightest stars for diffraction spikes
    const brightStars: Array<{
      index: number;
      x: number;
      y: number;
      z: number;
      brightness: number;
      color: THREE.Color;
    }> = [];

    for (let i = 0; i < nearCount; i++) {
      const i3 = i * 3;
      nearPositions[i3] = (Math.random() - 0.5) * spreadX;
      nearPositions[i3 + 1] = (Math.random() - 0.5) * spreadY;
      nearPositions[i3 + 2] = nearZMin + Math.random() * (nearZMax - nearZMin);

      // Use realistic stellar classification for color and brightness
      const starProps = this.getRealisticStarProperties();

      // Near layer stars are larger and more prominent
      const baseSize = 1.0 + Math.random() * 1.0;
      nearSizes[i] = baseSize * starProps.brightness;

      // Supergiants are the most visually striking
      if (starProps.isSupergiant) {
        nearSizes[i] *= 2.5;
        // Track for potential diffraction spikes
        brightStars.push({
          index: i,
          x: nearPositions[i3],
          y: nearPositions[i3 + 1],
          z: nearPositions[i3 + 2],
          brightness: nearSizes[i],
          color: starProps.color,
        });
      } else if (starProps.isRedGiant) {
        nearSizes[i] *= 2.0;
        brightStars.push({
          index: i,
          x: nearPositions[i3],
          y: nearPositions[i3 + 1],
          z: nearPositions[i3 + 2],
          brightness: nearSizes[i],
          color: starProps.color,
        });
      }

      nearColorArray[i3] = starProps.color.r;
      nearColorArray[i3 + 1] = starProps.color.g;
      nearColorArray[i3 + 2] = starProps.color.b;

      nearTwinklePhase[i] = Math.random() * Math.PI * 2;
    }

    // Store brightest stars for diffraction spike rendering
    this.brightStarsForSpikes = brightStars
      .sort((a, b) => b.brightness - a.brightness)
      .slice(0, 20);

    nearGeometry.setAttribute("position", new THREE.BufferAttribute(nearPositions, 3));
    nearGeometry.setAttribute("size", new THREE.BufferAttribute(nearSizes, 1));
    nearGeometry.setAttribute("color", new THREE.BufferAttribute(nearColorArray, 3));
    nearGeometry.setAttribute("twinklePhase", new THREE.BufferAttribute(nearTwinklePhase, 1));

    const nearMaterial = this.createStarMaterial();
    const nearPoints = new THREE.Points(nearGeometry, nearMaterial);
    const nearGroup = new THREE.Group();
    nearGroup.add(nearPoints);
    this.scene.add(nearGroup);

    this.layers.push({
      group: nearGroup,
      geometry: nearGeometry,
      material: nearMaterial,
      zMin: nearZMin,
      zMax: nearZMax,
      parallaxFactor: 0.1,
    });
  }

  /**
   * Get a random nebula type based on realistic distribution
   */
  private getRandomNebulaType(): NebulaType {
    const roll = Math.random();
    let cumulative = 0;

    for (const [type, probability] of Object.entries(NEBULA_TYPE_DISTRIBUTION)) {
      cumulative += probability;
      if (roll < cumulative) {
        return type as NebulaType;
      }
    }
    return "emission";
  }

  /**
   * Create JWST-inspired nebula patches with realistic structures
   */
  private createNebulae(): void {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const nebulaCount = isMobile ? 4 : 8;

    for (let i = 0; i < nebulaCount; i++) {
      const nebulaType = this.getRandomNebulaType();
      const nebula = this.createJWSTNebulaSprite(nebulaType);
      nebula.position.set(
        (Math.random() - 0.5) * 1800,
        (Math.random() - 0.5) * 1000,
        CELESTIAL_SPAWN_Z + Math.random() * 1500
      );
      this.scene.add(nebula);
      this.celestialBodies.push({
        mesh: nebula,
        type: "nebula",
        speed: 0.3 + Math.random() * 0.2,
      });
    }
  }

  /**
   * Create JWST-style nebula with type-specific appearance
   * Based on actual telescope imagery of different nebula types
   */
  private createJWSTNebulaSprite(nebulaType: NebulaType): THREE.Group {
    const nebulaGroup = new THREE.Group();
    const noise = new SimplexNoise(Math.random());
    const baseSize = 350 + Math.random() * 250;

    // Get colors based on nebula type
    const { primaryColor, secondaryColor, tertiaryColor } = this.getNebulaColors(nebulaType);

    // Layer count varies by type
    const layerCount = nebulaType === "planetary" ? 2 : 4;

    for (let layer = 0; layer < layerCount; layer++) {
      const canvas = document.createElement("canvas");
      const resolution = 256;
      canvas.width = resolution;
      canvas.height = resolution;
      const ctx = canvas.getContext("2d")!;

      const imageData = ctx.createImageData(resolution, resolution);
      const data = imageData.data;

      const centerX = resolution / 2;
      const centerY = resolution / 2;

      for (let y = 0; y < resolution; y++) {
        for (let x = 0; x < resolution; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);
          const normalizedDist = dist / (resolution / 2);

          let r = 0,
            g = 0,
            b = 0,
            alpha = 0;

          switch (nebulaType) {
            case "emission":
              // H-alpha dominated emission nebula with ionization fronts
              [r, g, b, alpha] = this.renderEmissionNebula(
                noise,
                x,
                y,
                normalizedDist,
                layer,
                primaryColor,
                secondaryColor
              );
              break;

            case "starForming":
              // Carina-style star forming region with bright edges and dark dust
              [r, g, b, alpha] = this.renderStarFormingNebula(
                noise,
                x,
                y,
                normalizedDist,
                angle,
                layer,
                primaryColor,
                secondaryColor,
                tertiaryColor
              );
              break;

            case "reflection":
              // Blue reflection nebula from scattered starlight
              [r, g, b, alpha] = this.renderReflectionNebula(
                noise,
                x,
                y,
                normalizedDist,
                layer,
                primaryColor
              );
              break;

            case "planetary":
              // Ring-shaped planetary nebula (dying star remnant)
              [r, g, b, alpha] = this.renderPlanetaryNebula(
                noise,
                x,
                y,
                normalizedDist,
                angle,
                layer,
                primaryColor,
                secondaryColor
              );
              break;

            case "pillars":
              // Pillars of Creation style dust columns
              [r, g, b, alpha] = this.renderPillarNebula(
                noise,
                x,
                y,
                normalizedDist,
                angle,
                layer,
                primaryColor,
                secondaryColor
              );
              break;
          }

          const idx = (y * resolution + x) * 4;
          data[idx] = Math.min(255, r);
          data[idx + 1] = Math.min(255, g);
          data[idx + 2] = Math.min(255, b);
          data[idx + 3] = Math.min(255, alpha);
        }
      }

      ctx.putImageData(imageData, 0, 0);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(material);
      const layerScale = baseSize * (1 + layer * 0.25);
      const aspectRatio = nebulaType === "pillars" ? 1.5 : 0.8 + Math.random() * 0.4;
      sprite.scale.set(layerScale, layerScale * aspectRatio, 1);

      sprite.position.z = (layer - layerCount / 2) * 15;
      sprite.position.x = (Math.random() - 0.5) * 30;
      sprite.position.y = (Math.random() - 0.5) * 20;

      nebulaGroup.add(sprite);
    }

    return nebulaGroup;
  }

  /**
   * Get appropriate colors for each nebula type
   */
  private getNebulaColors(nebulaType: NebulaType): {
    primaryColor: THREE.Color;
    secondaryColor: THREE.Color;
    tertiaryColor: THREE.Color;
  } {
    switch (nebulaType) {
      case "emission":
        return {
          primaryColor: new THREE.Color(NEBULA_COLORS.hydrogenAlpha),
          secondaryColor: new THREE.Color(NEBULA_COLORS.nitrogenII),
          tertiaryColor: new THREE.Color(NEBULA_COLORS.oxygenIII),
        };
      case "starForming":
        return {
          primaryColor: new THREE.Color(NEBULA_COLORS.sulfurII),
          secondaryColor: new THREE.Color(NEBULA_COLORS.oxygenIII),
          tertiaryColor: new THREE.Color(NEBULA_COLORS.hydrogenAlpha),
        };
      case "reflection":
        return {
          primaryColor: new THREE.Color(NEBULA_COLORS.reflection),
          secondaryColor: new THREE.Color(0x6699dd),
          tertiaryColor: new THREE.Color(0x88aaee),
        };
      case "planetary":
        return {
          primaryColor: new THREE.Color(NEBULA_COLORS.oxygenIII),
          secondaryColor: new THREE.Color(NEBULA_COLORS.hydrogenAlpha),
          tertiaryColor: new THREE.Color(0xffffff),
        };
      case "pillars":
        return {
          primaryColor: new THREE.Color(NEBULA_COLORS.pillarsOfCreation),
          secondaryColor: new THREE.Color(NEBULA_COLORS.sulfurII),
          tertiaryColor: new THREE.Color(NEBULA_COLORS.oxygenIII),
        };
    }
  }

  /**
   * Render emission nebula - H-alpha dominated with ionization fronts
   */
  private renderEmissionNebula(
    noise: SimplexNoise,
    x: number,
    y: number,
    normalizedDist: number,
    layer: number,
    primary: THREE.Color,
    secondary: THREE.Color
  ): [number, number, number, number] {
    const noiseScale = 0.015 + layer * 0.005;
    const noiseVal = noise.fbm(x * noiseScale, y * noiseScale, 5);

    // Radial falloff with noise modulation
    let alpha = Math.max(0, 1 - normalizedDist * 1.2);
    alpha *= Math.pow((noiseVal + 1) / 2, 1.2);

    // Create filamentary structure
    const filament = noise.noise2D(x * 0.04, y * 0.04);
    alpha *= 0.7 + Math.abs(filament) * 0.6;

    // Blend colors based on position
    const colorMix = (noiseVal + 1) / 2;
    const r = (primary.r * colorMix + secondary.r * (1 - colorMix)) * 255;
    const g = (primary.g * colorMix + secondary.g * (1 - colorMix)) * 255;
    const b = (primary.b * colorMix + secondary.b * (1 - colorMix)) * 255;

    return [r, g, b, alpha * 50 * (1 - layer * 0.15)];
  }

  /**
   * Render star-forming nebula - Carina-style with bright ionization edges
   */
  private renderStarFormingNebula(
    noise: SimplexNoise,
    x: number,
    y: number,
    normalizedDist: number,
    angle: number,
    layer: number,
    primary: THREE.Color,
    secondary: THREE.Color,
    tertiary: THREE.Color
  ): [number, number, number, number] {
    const noiseScale = 0.012;

    // Create "cosmic cliffs" - sharp edges where ionization fronts meet dust
    const cliffNoise = noise.fbm(x * noiseScale * 2, y * noiseScale, 4);
    const edgeFactor = Math.abs(cliffNoise);

    // Base structure
    let alpha = Math.max(0, 1 - normalizedDist * 1.3);
    alpha *= Math.pow((noise.fbm(x * noiseScale, y * noiseScale, 5) + 1) / 2, 1.0);

    // Bright edges (ionization fronts)
    const edgeBrightness = edgeFactor > 0.3 ? (edgeFactor - 0.3) * 2 : 0;

    // Color varies: orange dust, teal ionization, red hydrogen
    let color: THREE.Color;
    if (edgeFactor > 0.4) {
      color = secondary; // Teal ionization edge
    } else if (cliffNoise > 0) {
      color = primary; // Orange/sulfur
    } else {
      color = tertiary; // Red hydrogen
    }

    const r = color.r * 255 * (1 + edgeBrightness * 0.5);
    const g = color.g * 255 * (1 + edgeBrightness * 0.3);
    const b = color.b * 255 * (1 + edgeBrightness * 0.3);

    return [r, g, b, alpha * 55 * (1 - layer * 0.12)];
  }

  /**
   * Render reflection nebula - blue scattered starlight
   */
  private renderReflectionNebula(
    noise: SimplexNoise,
    x: number,
    y: number,
    normalizedDist: number,
    layer: number,
    primary: THREE.Color
  ): [number, number, number, number] {
    const noiseScale = 0.018 + layer * 0.008;
    const noiseVal = noise.fbm(x * noiseScale, y * noiseScale, 4);

    // Softer, more diffuse structure than emission nebulae
    let alpha = Math.max(0, 1 - normalizedDist * 1.1);
    alpha *= Math.pow((noiseVal + 1) / 2, 0.8);

    // Subtle brightness variations
    const brightness = 0.8 + noiseVal * 0.3;

    const r = primary.r * 255 * brightness;
    const g = primary.g * 255 * brightness;
    const b = primary.b * 255 * brightness;

    return [r, g, b, alpha * 40 * (1 - layer * 0.2)];
  }

  /**
   * Render planetary nebula - ring-shaped dying star remnant
   */
  private renderPlanetaryNebula(
    noise: SimplexNoise,
    x: number,
    y: number,
    normalizedDist: number,
    angle: number,
    layer: number,
    primary: THREE.Color,
    secondary: THREE.Color
  ): [number, number, number, number] {
    // Ring structure - bright at specific radius
    const ringRadius = 0.4 + layer * 0.15;
    const ringWidth = 0.15;
    const ringDist = Math.abs(normalizedDist - ringRadius);

    let alpha = 0;
    if (ringDist < ringWidth) {
      alpha = 1 - ringDist / ringWidth;
    }

    // Add some asymmetry with noise
    const noiseVal = noise.noise2D(angle * 2, normalizedDist * 5);
    alpha *= 0.7 + noiseVal * 0.3;

    // Central star remnant (very bright small core)
    if (normalizedDist < 0.1) {
      alpha += (1 - normalizedDist / 0.1) * 2;
    }

    // Outer ring is more hydrogen (red), inner is oxygen (teal)
    const colorMix = normalizedDist;
    const r = (primary.r * (1 - colorMix) + secondary.r * colorMix) * 255;
    const g = (primary.g * (1 - colorMix) + secondary.g * colorMix) * 255;
    const b = (primary.b * (1 - colorMix) + secondary.b * colorMix) * 255;

    return [r, g, b, alpha * 60];
  }

  /**
   * Render pillar nebula - Pillars of Creation style dust columns
   */
  private renderPillarNebula(
    noise: SimplexNoise,
    x: number,
    y: number,
    normalizedDist: number,
    angle: number,
    layer: number,
    primary: THREE.Color,
    secondary: THREE.Color
  ): [number, number, number, number] {
    const resolution = 256;
    const normalizedY = y / resolution;
    const normalizedX = x / resolution;

    // Create vertical pillar structures
    const pillarNoise = noise.fbm(normalizedX * 8, normalizedY * 2, 4);
    const pillarShape = Math.sin(normalizedX * Math.PI * 3) * 0.5 + 0.5;

    // Pillars taper toward top
    const taperFactor = 1 - normalizedY * 0.6;

    let alpha = pillarShape * taperFactor;
    alpha *= Math.pow((pillarNoise + 1) / 2, 0.8);

    // Bright edges where starlight hits dust (photo-evaporation)
    const edgeNoise = noise.noise2D(normalizedX * 15, normalizedY * 8);
    const edgeBrightness = Math.abs(edgeNoise) > 0.5 ? (Math.abs(edgeNoise) - 0.5) * 2 : 0;

    // Dark dust interior, bright ionized edges
    let color: THREE.Color;
    if (edgeBrightness > 0.3) {
      color = secondary; // Bright orange/yellow edge
    } else {
      color = primary; // Dark brown dust
    }

    const brightnessMod = 1 + edgeBrightness;
    const r = color.r * 255 * brightnessMod;
    const g = color.g * 255 * brightnessMod;
    const b = color.b * 255 * brightnessMod;

    // Fade at edges of frame
    alpha *= Math.max(0, 1 - normalizedDist * 0.8);

    return [r, g, b, alpha * 70 * (1 - layer * 0.15)];
  }

  /**
   * Galaxy type distribution based on observations
   * Hubble classification: E (elliptical), S (spiral), SB (barred spiral), Irr (irregular)
   */
  private getRandomGalaxyType(): "spiral" | "elliptical" | "edgeOn" | "irregular" {
    const roll = Math.random();
    if (roll < 0.45) return "spiral"; // 45% - Most visible galaxies
    if (roll < 0.7) return "elliptical"; // 25% - Smooth featureless
    if (roll < 0.9) return "edgeOn"; // 20% - Dramatic edge-on view
    return "irregular"; // 10% - Chaotic/merged
  }

  /**
   * Create planets and varied galaxy types
   */
  private createCelestialBodies(): void {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const planetCount = isMobile ? 4 : 8;
    const galaxyCount = isMobile ? 3 : 6;

    // Create planets
    for (let i = 0; i < planetCount; i++) {
      const planet = this.createPlanet();
      planet.position.set(
        (Math.random() - 0.5) * 1200,
        (Math.random() - 0.5) * 600,
        CELESTIAL_SPAWN_Z + Math.random() * 1800
      );
      this.scene.add(planet);
      this.celestialBodies.push({
        mesh: planet,
        type: "planet",
        speed: 0.5 + Math.random() * 0.3,
      });
    }

    // Create varied galaxy types
    for (let i = 0; i < galaxyCount; i++) {
      const galaxyType = this.getRandomGalaxyType();
      let galaxy: THREE.Group;

      switch (galaxyType) {
        case "spiral":
          galaxy = this.createSpiralGalaxy();
          break;
        case "elliptical":
          galaxy = this.createEllipticalGalaxy();
          break;
        case "edgeOn":
          galaxy = this.createEdgeOnGalaxy();
          break;
        case "irregular":
          galaxy = this.createIrregularGalaxy();
          break;
      }

      galaxy.position.set(
        (Math.random() - 0.5) * 1500,
        (Math.random() - 0.5) * 800,
        CELESTIAL_SPAWN_Z - 500 + Math.random() * 1200
      );
      this.scene.add(galaxy);
      this.celestialBodies.push({
        mesh: galaxy,
        type: "galaxy",
        speed: 0.25 + Math.random() * 0.15,
        rotationSpeed: galaxyType === "elliptical" ? 0.0001 : 0.0005 + Math.random() * 0.0005,
      });
    }
  }

  /**
   * Create an enhanced procedural planet with texture and atmosphere
   */
  private createPlanet(): THREE.Group {
    const planetGroup = new THREE.Group();
    const size = 5 + Math.random() * 15;
    const noise = new SimplexNoise(Math.random());

    // Planet type determines appearance
    const planetType = Math.random();
    let baseColor: THREE.Color;
    let secondaryColor: THREE.Color;
    let atmosphereColor: THREE.Color;
    let isGasGiant = false;

    if (planetType < 0.3) {
      // Rocky/terrestrial planet
      baseColor = new THREE.Color(0x8b6914);
      secondaryColor = new THREE.Color(0x5a4a2a);
      atmosphereColor = new THREE.Color(0x8899aa);
    } else if (planetType < 0.5) {
      // Icy/oceanic planet
      baseColor = new THREE.Color(0x4a7a9a);
      secondaryColor = new THREE.Color(0x2a4a6a);
      atmosphereColor = new THREE.Color(0x6699cc);
    } else if (planetType < 0.7) {
      // Volcanic planet
      baseColor = new THREE.Color(0x6a3a1a);
      secondaryColor = new THREE.Color(0x1a0a0a);
      atmosphereColor = new THREE.Color(0xff6633);
    } else {
      // Gas giant
      isGasGiant = true;
      baseColor = new THREE.Color(0xd4a574);
      secondaryColor = new THREE.Color(0x8b6914);
      atmosphereColor = new THREE.Color(0xffcc88);
    }

    // Generate procedural planet texture
    const textureSize = 512;
    const canvas = document.createElement("canvas");
    canvas.width = textureSize;
    canvas.height = textureSize / 2; // Equirectangular mapping
    const ctx = canvas.getContext("2d")!;

    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;

    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const u = x / canvas.width;
        const v = y / canvas.height;

        // Convert to spherical coordinates for seamless wrapping
        const theta = u * Math.PI * 2;
        const phi = v * Math.PI;

        // Sample 3D coordinates on sphere
        const nx = Math.sin(phi) * Math.cos(theta);
        const ny = Math.sin(phi) * Math.sin(theta);
        const nz = Math.cos(phi);

        // Multi-octave noise for terrain
        let noiseValue = 0;
        if (isGasGiant) {
          // Horizontal bands for gas giants
          noiseValue = noise.fbm(nx * 2 + nz * 2, ny * 8, 4);
          noiseValue += Math.sin(v * Math.PI * 12) * 0.3;
        } else {
          // Continent-like features
          noiseValue = noise.fbm(nx * 3, ny * 3 + nz * 3, 6);
        }

        noiseValue = (noiseValue + 1) / 2; // Normalize to 0-1

        // Blend colors based on noise
        const r = Math.floor(
          baseColor.r * 255 * noiseValue + secondaryColor.r * 255 * (1 - noiseValue)
        );
        const g = Math.floor(
          baseColor.g * 255 * noiseValue + secondaryColor.g * 255 * (1 - noiseValue)
        );
        const b = Math.floor(
          baseColor.b * 255 * noiseValue + secondaryColor.b * 255 * (1 - noiseValue)
        );

        const idx = (y * canvas.width + x) * 4;
        data[idx] = Math.min(255, r);
        data[idx + 1] = Math.min(255, g);
        data[idx + 2] = Math.min(255, b);
        data[idx + 3] = 255;
      }
    }

    ctx.putImageData(imageData, 0, 0);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // Planet mesh with procedural texture
    const geometry = new THREE.SphereGeometry(size, 48, 48);
    const material = new THREE.MeshBasicMaterial({
      map: texture,
    });
    const planet = new THREE.Mesh(geometry, material);
    planetGroup.add(planet);

    // Atmosphere with Fresnel glow effect
    const atmosphereGeometry = new THREE.SphereGeometry(size * 1.08, 32, 32);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: atmosphereColor },
        uIntensity: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uIntensity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          // Fresnel effect - glow at edges
          vec3 viewDir = normalize(-vPosition);
          float fresnel = pow(1.0 - abs(dot(viewDir, vNormal)), 3.0);
          gl_FragColor = vec4(uColor, fresnel * uIntensity);
        }
      `,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    planetGroup.add(atmosphere);

    // Cloud layer for gas giants
    if (isGasGiant && Math.random() > 0.3) {
      const cloudCanvas = document.createElement("canvas");
      cloudCanvas.width = 256;
      cloudCanvas.height = 128;
      const cloudCtx = cloudCanvas.getContext("2d")!;
      const cloudNoise = new SimplexNoise(Math.random());

      const cloudData = cloudCtx.createImageData(256, 128);
      for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 256; x++) {
          const u = x / 256;
          const v = y / 128;
          const cloudVal = cloudNoise.fbm(u * 6, v * 3, 4);
          const alpha = Math.max(0, cloudVal * 150);
          const idx = (y * 256 + x) * 4;
          cloudData.data[idx] = 255;
          cloudData.data[idx + 1] = 255;
          cloudData.data[idx + 2] = 255;
          cloudData.data[idx + 3] = alpha;
        }
      }
      cloudCtx.putImageData(cloudData, 0, 0);

      const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
      cloudTexture.wrapS = THREE.RepeatWrapping;
      const cloudGeometry = new THREE.SphereGeometry(size * 1.02, 32, 32);
      const cloudMaterial = new THREE.MeshBasicMaterial({
        map: cloudTexture,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      });
      const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
      planetGroup.add(clouds);
    }

    return planetGroup;
  }

  /**
   * Create a 3D volumetric spiral galaxy with particle system
   */
  private createSpiralGalaxy(): THREE.Group {
    const galaxyGroup = new THREE.Group();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Galaxy parameters
    const particleCount = isMobile ? 2000 : 5000;
    const armCount = 2 + Math.floor(Math.random() * 2);
    const galaxyRadius = 60 + Math.random() * 40;
    const diskThickness = 3 + Math.random() * 2;

    // Create particle system for galaxy stars
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    // Galaxy color palette
    const coreColor = new THREE.Color(0xfffaf0); // Warm white core
    const armColorInner = new THREE.Color(0xffcc88); // Orange/yellow near core
    const armColorOuter = new THREE.Color(0x6688ff); // Blue at outer arms
    const dustColor = new THREE.Color(0xff8866); // Reddish dust lanes

    for (let i = 0; i < particleCount; i++) {
      // Determine which arm this star belongs to
      const arm = Math.floor(Math.random() * armCount);
      const armAngle = (arm * Math.PI * 2) / armCount;

      // Position along the arm (0 = center, 1 = edge)
      const t = Math.pow(Math.random(), 0.7); // Concentrate stars toward center
      const radius = t * galaxyRadius;

      // Logarithmic spiral with randomness
      const spiralTightness = 3 + Math.random() * 2;
      const angle = armAngle + t * Math.PI * spiralTightness;

      // Add scatter to arm
      const scatter = (1 - t * 0.5) * 8;

      positions[i * 3] = Math.cos(angle) * radius + (Math.random() - 0.5) * scatter;
      positions[i * 3 + 1] = (Math.random() - 0.5) * diskThickness * (1 - t * 0.7);
      positions[i * 3 + 2] = Math.sin(angle) * radius + (Math.random() - 0.5) * scatter;

      // Color varies from warm core to blue arms
      const colorMix = t;
      const starColor = new THREE.Color();

      if (t < 0.1) {
        // Core region - bright warm white
        starColor.copy(coreColor);
      } else if (Math.random() > 0.9) {
        // Occasional red/orange stars
        starColor.copy(dustColor);
      } else {
        // Gradient from inner to outer
        starColor.lerpColors(armColorInner, armColorOuter, colorMix);
      }

      colors[i * 3] = starColor.r;
      colors[i * 3 + 1] = starColor.g;
      colors[i * 3 + 2] = starColor.b;

      // Size varies - larger near core
      sizes[i] = (1 - t * 0.7) * (0.5 + Math.random() * 1.5);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Shader material for galaxy particles
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    galaxyGroup.add(particles);

    // Add bright galactic core sprite
    const coreCanvas = document.createElement("canvas");
    coreCanvas.width = 128;
    coreCanvas.height = 128;
    const coreCtx = coreCanvas.getContext("2d")!;

    const coreGradient = coreCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    coreGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    coreGradient.addColorStop(0.1, "rgba(255, 250, 230, 0.9)");
    coreGradient.addColorStop(0.3, "rgba(255, 220, 180, 0.5)");
    coreGradient.addColorStop(0.6, "rgba(255, 180, 120, 0.2)");
    coreGradient.addColorStop(1, "rgba(255, 150, 100, 0)");

    coreCtx.fillStyle = coreGradient;
    coreCtx.fillRect(0, 0, 128, 128);

    const coreTexture = new THREE.CanvasTexture(coreCanvas);
    const coreMaterial = new THREE.SpriteMaterial({
      map: coreTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreSprite = new THREE.Sprite(coreMaterial);
    coreSprite.scale.set(galaxyRadius * 0.4, galaxyRadius * 0.4, 1);
    galaxyGroup.add(coreSprite);

    // Tilt galaxy for more interesting view
    galaxyGroup.rotation.x = Math.random() * 0.5 - 0.25;
    galaxyGroup.rotation.z = Math.random() * Math.PI * 2;

    return galaxyGroup;
  }

  /**
   * Create an elliptical galaxy - smooth, featureless collection of old stars
   * Hubble classification E0 (spherical) to E7 (elongated)
   */
  private createEllipticalGalaxy(): THREE.Group {
    const galaxyGroup = new THREE.Group();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const particleCount = isMobile ? 1500 : 3500;
    const galaxyRadius = 40 + Math.random() * 30;

    // Ellipticity: 0 = spherical (E0), 0.7 = very elongated (E7)
    const ellipticity = Math.random() * 0.7;
    const stretchFactor = 1 - ellipticity;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    // Elliptical galaxies are dominated by old, orange/red stars
    const coreColor = new THREE.Color(0xfff8e8);
    const outerColor = new THREE.Color(0xffaa66);

    for (let i = 0; i < particleCount; i++) {
      // De Vaucouleurs profile: density falls off as r^(1/4)
      const r = Math.pow(Math.random(), 0.25) * galaxyRadius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      // Apply ellipticity (stretch along one axis)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * stretchFactor;
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Color gradient from bright core to dim outer
      const normalizedR = r / galaxyRadius;
      const starColor = new THREE.Color();
      starColor.lerpColors(coreColor, outerColor, normalizedR);

      colors[i * 3] = starColor.r;
      colors[i * 3 + 1] = starColor.g;
      colors[i * 3 + 2] = starColor.b;

      // Stars are brighter toward center
      sizes[i] = (1 - normalizedR * 0.6) * (0.4 + Math.random() * 1.0);
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.7);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    galaxyGroup.add(particles);

    // Add diffuse core glow
    const coreCanvas = document.createElement("canvas");
    coreCanvas.width = 128;
    coreCanvas.height = 128;
    const coreCtx = coreCanvas.getContext("2d")!;

    const coreGradient = coreCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
    coreGradient.addColorStop(0, "rgba(255, 248, 232, 0.9)");
    coreGradient.addColorStop(0.3, "rgba(255, 220, 180, 0.4)");
    coreGradient.addColorStop(0.7, "rgba(255, 180, 140, 0.1)");
    coreGradient.addColorStop(1, "rgba(255, 150, 100, 0)");

    coreCtx.fillStyle = coreGradient;
    coreCtx.fillRect(0, 0, 128, 128);

    const coreTexture = new THREE.CanvasTexture(coreCanvas);
    const coreMaterial = new THREE.SpriteMaterial({
      map: coreTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const coreSprite = new THREE.Sprite(coreMaterial);
    coreSprite.scale.set(galaxyRadius * 0.6, galaxyRadius * 0.6 * stretchFactor, 1);
    galaxyGroup.add(coreSprite);

    // Random rotation
    galaxyGroup.rotation.x = Math.random() * Math.PI;
    galaxyGroup.rotation.z = Math.random() * Math.PI * 2;

    return galaxyGroup;
  }

  /**
   * Create an edge-on spiral galaxy with visible dust lane
   * Iconic view showing the thin disk and dark equatorial band
   */
  private createEdgeOnGalaxy(): THREE.Group {
    const galaxyGroup = new THREE.Group();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const particleCount = isMobile ? 2000 : 4000;
    const galaxyRadius = 50 + Math.random() * 30;
    const diskThickness = 2 + Math.random() * 2;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    // Edge-on galaxies show warm core, blue disk edges
    const coreColor = new THREE.Color(0xfff0d0);
    const diskColor = new THREE.Color(0x8899cc);
    const dustColor = new THREE.Color(0x443322); // Dark dust lane

    for (let i = 0; i < particleCount; i++) {
      // Create thin disk structure
      const r = Math.pow(Math.random(), 0.5) * galaxyRadius;
      const angle = Math.random() * Math.PI * 2;

      // Thin disk - most stars close to plane
      const heightVariation = Math.pow(Math.random(), 3) * diskThickness;
      const height = (Math.random() > 0.5 ? 1 : -1) * heightVariation;

      positions[i * 3] = r * Math.cos(angle);
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = 0; // Seen edge-on

      // Calculate position for coloring
      const normalizedR = r / galaxyRadius;
      const normalizedHeight = Math.abs(height) / diskThickness;

      // Dust lane obscures stars near the plane
      const inDustLane = normalizedHeight < 0.3 && normalizedR > 0.1;

      let starColor = new THREE.Color();
      if (inDustLane && Math.random() > 0.3) {
        // Some stars visible through dust, dimmed
        starColor.copy(dustColor);
        sizes[i] = 0.2 + Math.random() * 0.3;
      } else {
        // Normal star coloring - orange core to blue disk
        starColor.lerpColors(coreColor, diskColor, normalizedR);
        sizes[i] = (1 - normalizedR * 0.5) * (0.4 + Math.random() * 1.2);
      }

      colors[i * 3] = starColor.r;
      colors[i * 3 + 1] = starColor.g;
      colors[i * 3 + 2] = starColor.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.8);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    galaxyGroup.add(particles);

    // Add central bulge sprite
    const bulgeCanvas = document.createElement("canvas");
    bulgeCanvas.width = 128;
    bulgeCanvas.height = 128;
    const bulgeCtx = bulgeCanvas.getContext("2d")!;

    // Elongated ellipse for edge-on bulge
    const gradient = bulgeCtx.createRadialGradient(64, 64, 0, 64, 64, 50);
    gradient.addColorStop(0, "rgba(255, 240, 210, 0.9)");
    gradient.addColorStop(0.4, "rgba(255, 200, 150, 0.4)");
    gradient.addColorStop(1, "rgba(255, 180, 120, 0)");

    bulgeCtx.fillStyle = gradient;
    bulgeCtx.beginPath();
    bulgeCtx.ellipse(64, 64, 50, 25, 0, 0, Math.PI * 2);
    bulgeCtx.fill();

    const bulgeTexture = new THREE.CanvasTexture(bulgeCanvas);
    const bulgeMaterial = new THREE.SpriteMaterial({
      map: bulgeTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const bulgeSprite = new THREE.Sprite(bulgeMaterial);
    bulgeSprite.scale.set(galaxyRadius * 0.4, galaxyRadius * 0.2, 1);
    galaxyGroup.add(bulgeSprite);

    // Random rotation around the viewing axis
    galaxyGroup.rotation.z = Math.random() * Math.PI;

    return galaxyGroup;
  }

  /**
   * Create an irregular galaxy - chaotic structure from mergers/interactions
   * Often seen in Hubble Deep Field as distorted smudges
   */
  private createIrregularGalaxy(): THREE.Group {
    const galaxyGroup = new THREE.Group();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const particleCount = isMobile ? 1200 : 2500;
    const galaxyRadius = 35 + Math.random() * 25;
    const noise = new SimplexNoise(Math.random());

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    // Irregular galaxies have mixed star populations - active star formation
    const youngStarColor = new THREE.Color(0x88aaff); // Blue young stars
    const oldStarColor = new THREE.Color(0xffcc88); // Orange old stars
    const starBurstColor = new THREE.Color(0xff8888); // Pink star-forming regions

    for (let i = 0; i < particleCount; i++) {
      // Asymmetric, chaotic distribution
      const r = Math.pow(Math.random(), 0.6) * galaxyRadius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      // Add noise-based distortion for irregular shape
      const noiseX = noise.noise2D(theta, phi * 2) * galaxyRadius * 0.3;
      const noiseY = noise.noise2D(theta + 100, phi * 2 + 100) * galaxyRadius * 0.3;
      const noiseZ = noise.noise2D(theta + 200, phi * 2 + 200) * galaxyRadius * 0.3;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta) + noiseX;
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) + noiseY;
      positions[i * 3 + 2] = r * Math.cos(phi) + noiseZ;

      // Mixed star populations - irregular galaxies have both young and old stars
      const starType = Math.random();
      let starColor = new THREE.Color();

      if (starType < 0.3) {
        // Young blue stars (active star formation)
        starColor.copy(youngStarColor);
      } else if (starType < 0.5) {
        // Star-forming region pinkish stars
        starColor.copy(starBurstColor);
      } else {
        // Old population
        starColor.copy(oldStarColor);
      }

      // Add some variation
      starColor.offsetHSL(Math.random() * 0.1 - 0.05, 0, Math.random() * 0.2 - 0.1);

      colors[i * 3] = starColor.r;
      colors[i * 3 + 1] = starColor.g;
      colors[i * 3 + 2] = starColor.b;

      sizes[i] = 0.3 + Math.random() * 1.0;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (150.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha * 0.75);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    galaxyGroup.add(particles);

    // Random orientation
    galaxyGroup.rotation.x = Math.random() * Math.PI;
    galaxyGroup.rotation.y = Math.random() * Math.PI;
    galaxyGroup.rotation.z = Math.random() * Math.PI;

    return galaxyGroup;
  }

  /**
   * Create JWST-style 6-pointed diffraction spikes on the brightest stars
   * These spikes are caused by light diffracting around telescope support structures
   */
  private createDiffractionSpikes(): void {
    // Only create spikes for the brightest stars (tracked during layer creation)
    const maxSpikes = Math.min(this.brightStarsForSpikes.length, 15);

    for (let i = 0; i < maxSpikes; i++) {
      const star = this.brightStarsForSpikes[i];
      const spikeSprite = this.createDiffractionSpikeSprite(star.color, star.brightness);

      spikeSprite.position.set(star.x, star.y, star.z);
      this.scene.add(spikeSprite);
      this.diffractionSprites.push(spikeSprite);
    }
  }

  /**
   * Create a single diffraction spike sprite with 6 rays
   */
  private createDiffractionSpikeSprite(color: THREE.Color, brightness: number): THREE.Sprite {
    const canvas = document.createElement("canvas");
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;

    const centerX = size / 2;
    const centerY = size / 2;
    const rayLength = size * 0.45;

    // JWST has 6 major spikes (from hexagonal mirror segments)
    const spikeCount = 6;

    // Draw each spike ray
    for (let i = 0; i < spikeCount; i++) {
      const angle = (i * Math.PI * 2) / spikeCount - Math.PI / 2; // Start from top

      // Create gradient along the spike
      const gradient = ctx.createLinearGradient(
        centerX,
        centerY,
        centerX + Math.cos(angle) * rayLength,
        centerY + Math.sin(angle) * rayLength
      );

      const r = Math.floor(color.r * 255);
      const g = Math.floor(color.g * 255);
      const b = Math.floor(color.b * 255);

      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.9)`);
      gradient.addColorStop(0.1, `rgba(${r}, ${g}, ${b}, 0.6)`);
      gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.2)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      // Draw main spike
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * rayLength, centerY + Math.sin(angle) * rayLength);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw thinner secondary lines for more detail
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * rayLength * 0.7,
        centerY + Math.sin(angle) * rayLength * 0.7
      );
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.4)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Add central glow
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 20);
    const r = Math.floor(color.r * 255);
    const g = Math.floor(color.g * 255);
    const b = Math.floor(color.b * 255);
    coreGradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
    coreGradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, 0.8)`);
    coreGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fillStyle = coreGradient;
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    // Scale based on star brightness
    const scale = 15 + brightness * 8;
    sprite.scale.set(scale, scale, 1);

    return sprite;
  }

  /**
   * Create Hubble Deep Field style background - thousands of tiny distant galaxies
   * These appear as tiny colored smudges, with the farthest appearing reddish (redshift)
   */
  private createBackgroundGalaxyField(): void {
    // Scale galaxy count based on quality tier (galaxyCount in config is scaled 1-60)
    // Multiply by factor to get hundreds of background galaxies
    const galaxyCount = this.qualityConfig.galaxyCount * 8;

    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(galaxyCount * 3);
    const colors = new Float32Array(galaxyCount * 3);
    const sizes = new Float32Array(galaxyCount);

    // Galaxy colors - distant ones are redder due to cosmological redshift
    const galaxyColors = [
      new THREE.Color(0xffeedd), // Nearby - warm white
      new THREE.Color(0xffddcc), // Slightly shifted
      new THREE.Color(0xffccaa), // More shifted
      new THREE.Color(0xffaa88), // Distant - orange tint
      new THREE.Color(0xff8866), // Very distant - red
      new THREE.Color(0xff6644), // Extremely distant - deep red
    ];

    for (let i = 0; i < galaxyCount; i++) {
      // Position in far background
      positions[i * 3] = (Math.random() - 0.5) * 3000;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2000;
      positions[i * 3 + 2] = -2500 - Math.random() * 1000; // Very far back

      // Distance determines color (redshift)
      const distance = Math.abs(positions[i * 3 + 2]);
      const colorIndex = Math.min(galaxyColors.length - 1, Math.floor((distance - 2500) / 200));
      const color = galaxyColors[colorIndex];

      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Tiny sizes - these are whole galaxies seen from billions of light years
      sizes[i] = 0.3 + Math.random() * 0.5;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Simple shader for background galaxies
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float uPixelRatio;

        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uPixelRatio * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Soft elliptical shape for galaxy-like appearance
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha *= 0.4; // Subtle, not overpowering

          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const galaxyField = new THREE.Points(geometry, material);
    this.scene.add(galaxyField);
  }

  /**
   * Create a shooting star (meteor) effect
   * Called periodically based on random intervals
   */
  private createShootingStar(): void {
    const shootingStarGroup = new THREE.Group();

    // Random starting position at edge of view
    const startX = (Math.random() - 0.5) * 1000;
    const startY = 200 + Math.random() * 300; // Upper portion of sky
    const startZ = -100 - Math.random() * 200;

    // Direction - generally downward and to one side
    const dirX = (Math.random() - 0.5) * 2;
    const dirY = -0.8 - Math.random() * 0.4; // Downward
    const dirZ = Math.random() * 0.5;

    // Normalize direction
    const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);

    // Create trail using multiple sprites of decreasing opacity
    const trailLength = 8;
    const baseSize = 2 + Math.random() * 2;

    for (let i = 0; i < trailLength; i++) {
      const canvas = document.createElement("canvas");
      canvas.width = 32;
      canvas.height = 32;
      const ctx = canvas.getContext("2d")!;

      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      const alpha = 1 - i / trailLength;
      gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      gradient.addColorStop(0.3, `rgba(200, 220, 255, ${alpha * 0.6})`);
      gradient.addColorStop(1, `rgba(150, 180, 255, 0)`);

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 32, 32);

      const texture = new THREE.CanvasTexture(canvas);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(material);
      const spriteSize = baseSize * (1 - i * 0.08);
      sprite.scale.set(spriteSize, spriteSize, 1);

      // Position along trail
      const trailOffset = i * 5;
      sprite.position.set(
        startX + (dirX / len) * trailOffset,
        startY + (dirY / len) * trailOffset,
        startZ + (dirZ / len) * trailOffset
      );

      shootingStarGroup.add(sprite);
    }

    // Store velocity for animation
    (shootingStarGroup as unknown as { velocity: THREE.Vector3 }).velocity = new THREE.Vector3(
      (dirX / len) * 15, // Speed
      (dirY / len) * 15,
      (dirZ / len) * 15
    );
    (shootingStarGroup as unknown as { lifetime: number }).lifetime = 0;
    (shootingStarGroup as unknown as { maxLifetime: number }).maxLifetime = 60 + Math.random() * 40; // frames

    shootingStarGroup.position.set(startX, startY, startZ);
    this.scene.add(shootingStarGroup);
    this.shootingStars.push(shootingStarGroup);
  }

  /**
   * Update shooting stars animation
   */
  private updateShootingStars(currentTime: number): void {
    // Check if it's time to spawn a new shooting star
    if (currentTime - this.lastShootingStarTime > this.nextShootingStarInterval) {
      this.createShootingStar();
      this.lastShootingStarTime = currentTime;
      this.nextShootingStarInterval = 30000 + Math.random() * 30000; // 30-60 seconds
    }

    // Update existing shooting stars
    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const star = this.shootingStars[i] as unknown as {
        velocity: THREE.Vector3;
        lifetime: number;
        maxLifetime: number;
      } & THREE.Group;

      star.lifetime++;

      // Move along velocity
      star.position.add(star.velocity);

      // Fade out over lifetime
      const fadeProgress = star.lifetime / star.maxLifetime;
      star.children.forEach((child, idx) => {
        if (child instanceof THREE.Sprite) {
          (child.material as THREE.SpriteMaterial).opacity = Math.max(
            0,
            1 - fadeProgress - idx * 0.1
          );
        }
      });

      // Remove if expired
      if (star.lifetime > star.maxLifetime) {
        this.scene.remove(star);
        star.children.forEach((child) => {
          if (child instanceof THREE.Sprite) {
            (child.material as THREE.SpriteMaterial).map?.dispose();
            child.material.dispose();
          }
        });
        this.shootingStars.splice(i, 1);
      }
    }
  }

  /**
   * Create star material with twinkling shader
   * Uses realistic PSF (Point Spread Function) on HIGH+ quality tiers
   */
  private createStarMaterial(): THREE.ShaderMaterial {
    const useRealisticPsf = this.qualityConfig.realisticPsfEnabled;

    // Simple shader for LOW/MEDIUM tiers - fast and efficient
    const simpleFragmentShader = `
      varying vec3 vColor;
      varying float vTwinkle;

      void main() {
        // Create soft circular point with glow
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;

        // Core brightness with soft glow falloff
        float core = 1.0 - smoothstep(0.0, 0.15, dist);
        float glow = 1.0 - smoothstep(0.0, 0.5, dist);

        float alpha = mix(glow * 0.6, 1.0, core) * vTwinkle;
        vec3 finalColor = vColor * (0.8 + core * 0.4);

        gl_FragColor = vec4(finalColor, alpha);
      }
    `;

    // Realistic PSF shader for HIGH/ULTRA tiers
    // Simulates Airy disk pattern + 4-pointed diffraction spikes
    const realisticPsfFragmentShader = `
      varying vec3 vColor;
      varying float vTwinkle;
      varying float vBrightness;

      void main() {
        vec2 uv = gl_PointCoord - vec2(0.5);
        float dist = length(uv);
        if (dist > 0.5) discard;

        // === AIRY DISK PATTERN ===
        // Central core - Gaussian approximation of Airy disk center
        float core = exp(-dist * dist * 80.0);

        // First diffraction ring (at ~22% of radius)
        float ring1Dist = abs(dist - 0.11);
        float ring1 = exp(-ring1Dist * ring1Dist * 800.0) * 0.12;

        // Second diffraction ring (at ~40% of radius, very faint)
        float ring2Dist = abs(dist - 0.22);
        float ring2 = exp(-ring2Dist * ring2Dist * 1200.0) * 0.04;

        // Soft outer glow
        float glow = exp(-dist * dist * 8.0) * 0.3;

        float airyPattern = core + ring1 + ring2 + glow;

        // === DIFFRACTION SPIKES ===
        // 4-pointed spikes at 45° angles (like reflecting telescope)
        float angle = atan(uv.y, uv.x);
        float spikes = 0.0;

        // Calculate spike contribution for each of 4 directions
        for (int i = 0; i < 4; i++) {
          // Spikes at 45°, 135°, 225°, 315° (diagonal)
          float targetAngle = float(i) * 1.5708 + 0.7854; // i * PI/2 + PI/4
          float angleDiff = abs(angle - targetAngle);
          // Wrap angle difference
          angleDiff = min(angleDiff, 6.2832 - angleDiff);

          // Spike shape: narrow angle, fades with distance from center
          float spikeWidth = 0.08 + dist * 0.15; // Wider at edges
          float angularFalloff = exp(-angleDiff * angleDiff / (spikeWidth * spikeWidth * 0.02));
          float radialFalloff = exp(-dist * 2.0) * (1.0 - smoothstep(0.0, 0.45, dist));

          spikes += angularFalloff * radialFalloff;
        }
        spikes *= 0.25 * vBrightness; // Scale by star brightness

        // === COMBINE ===
        float intensity = airyPattern + spikes;

        // Color: brighter core, subtle color in spikes
        vec3 coreColor = vColor * (0.9 + core * 0.3);
        vec3 spikeColor = mix(vColor, vec3(1.0), 0.3); // Slightly whiter spikes
        vec3 finalColor = mix(coreColor, spikeColor, spikes / (intensity + 0.001));

        float alpha = intensity * vTwinkle;

        gl_FragColor = vec4(finalColor * intensity, alpha);
      }
    `;

    // Vertex shader - slightly different for PSF (larger stars, brightness varying)
    const vertexShader = useRealisticPsf
      ? `
        attribute float size;
        attribute vec3 color;
        attribute float twinklePhase;
        varying vec3 vColor;
        varying float vTwinkle;
        varying float vBrightness;
        uniform float uPixelRatio;
        uniform float uTime;

        void main() {
          vColor = color;

          // Store normalized brightness for spike intensity
          vBrightness = size / 5.0; // Normalize assuming max size ~5

          // Twinkling effect - subtle brightness variation
          float twinkle = sin(uTime * 2.0 + twinklePhase) * 0.15 + 0.85;
          vTwinkle = twinkle;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          // Slightly larger points for PSF to show diffraction detail
          float finalSize = size * uPixelRatio * (350.0 / -mvPosition.z) * twinkle * 1.2;
          gl_PointSize = finalSize;
          gl_Position = projectionMatrix * mvPosition;
        }
      `
      : `
        attribute float size;
        attribute vec3 color;
        attribute float twinklePhase;
        varying vec3 vColor;
        varying float vTwinkle;
        uniform float uPixelRatio;
        uniform float uTime;

        void main() {
          vColor = color;

          // Twinkling effect - subtle brightness variation
          float twinkle = sin(uTime * 2.0 + twinklePhase) * 0.15 + 0.85;
          vTwinkle = twinkle;

          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float finalSize = size * uPixelRatio * (300.0 / -mvPosition.z) * twinkle;
          gl_PointSize = finalSize;
          gl_Position = projectionMatrix * mvPosition;
        }
      `;

    return new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
      },
      vertexShader,
      fragmentShader: useRealisticPsf ? realisticPsfFragmentShader : simpleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }

  private handleResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Resize the post-processing composer
    this.composer.setSize(width, height);

    this.layers.forEach((layer) => {
      layer.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    });
  }

  private animate(currentTime: number): void {
    this.animationId = requestAnimationFrame(this.animate);

    // Throttle to target FPS
    const deltaTime = currentTime - this.lastTime;
    if (deltaTime < this.frameInterval) return;
    this.lastTime = currentTime - (deltaTime % this.frameInterval);

    // Skip rendering when tab is hidden
    if (document.hidden) return;

    // Record frame time for adaptive quality (adjusts tier if FPS drops)
    this.qualityManager.recordFrame(currentTime);

    // Update time uniform for twinkling
    const elapsedTime = (currentTime - this.startTime) * 0.001;
    this.layers.forEach((layer) => {
      layer.material.uniforms.uTime.value = elapsedTime;
    });

    // Update parallax input
    const parallaxOffset = this.parallax.update();

    // FULL SPEED ANIMATION - no reduced motion scaling
    const motionScale = 1.0;

    // INVERSE POV STEERING: Mouse right = look left, mouse up = look down
    this.targetRotationY = -parallaxOffset.x * 0.3 * motionScale;
    this.targetRotationX = parallaxOffset.y * 0.2 * motionScale;

    // Smooth camera rotation interpolation
    this.camera.rotation.y += (this.targetRotationY - this.camera.rotation.y) * 0.05;
    this.camera.rotation.x += (this.targetRotationX - this.camera.rotation.x) * 0.05;

    // FORWARD MOTION: Move stars toward camera
    this.updateForwardMotion();

    // Update shooting stars (probabilistic spawning every 30-60 seconds)
    this.updateShootingStars(currentTime);

    // Render with post-processing (bloom + vignette)
    this.composer.render();
  }

  /**
   * Update star positions for forward motion and recycle when passed
   */
  private updateForwardMotion(): void {
    const spreadX = 2500;
    const spreadY = 2500;

    // Update each star layer
    this.layers.forEach((layer) => {
      const positions = layer.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;

      const layerSpeed = FORWARD_SPEED * layer.parallaxFactor * 10;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3 + 2] += layerSpeed;

        if (positions[i3 + 2] > STAR_RECYCLE_Z) {
          positions[i3 + 2] = layer.zMin + Math.random() * (layer.zMax - layer.zMin);
          positions[i3] = (Math.random() - 0.5) * spreadX;
          positions[i3 + 1] = (Math.random() - 0.5) * spreadY;
        }
      }

      layer.geometry.attributes.position.needsUpdate = true;
    });

    // Update celestial bodies
    this.celestialBodies.forEach((body) => {
      body.mesh.position.z += FORWARD_SPEED * body.speed;

      // Rotate galaxies slowly
      if (body.type === "galaxy" && body.rotationSpeed) {
        body.mesh.rotation.z += body.rotationSpeed;
      }

      // Recycle if passed camera
      if (body.mesh.position.z > CELESTIAL_RECYCLE_Z) {
        body.mesh.position.z = CELESTIAL_SPAWN_Z + Math.random() * 500;
        body.mesh.position.x = (Math.random() - 0.5) * 1200;
        body.mesh.position.y = (Math.random() - 0.5) * 600;
      }
    });
  }

  public start(): void {
    if (this.animationId === null) {
      this.lastTime = performance.now();
      this.startTime = performance.now();
      this.animationId = requestAnimationFrame(this.animate);
    }
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public destroy(): void {
    this.stop();
    window.removeEventListener("resize", this.handleResize);
    this.parallax.destroy();

    // Dispose of star layers
    this.layers.forEach((layer) => {
      layer.group.children.forEach((child) => {
        if (child instanceof THREE.Points) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.scene.remove(layer.group);
    });

    // Dispose of celestial bodies (now groups with multiple children)
    this.celestialBodies.forEach((body) => {
      this.disposeObject(body.mesh);
      this.scene.remove(body.mesh);
    });

    // Dispose of diffraction spike sprites
    this.diffractionSprites.forEach((sprite) => {
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      sprite.material.dispose();
      this.scene.remove(sprite);
    });
    this.diffractionSprites = [];

    // Dispose of shooting stars
    this.shootingStars.forEach((starGroup) => {
      starGroup.children.forEach((child) => {
        if (child instanceof THREE.Sprite) {
          (child.material as THREE.SpriteMaterial).map?.dispose();
          child.material.dispose();
        }
      });
      this.scene.remove(starGroup);
    });
    this.shootingStars = [];

    this.disposeRenderer();
  }

  /**
   * Recursively dispose of Three.js objects
   */
  private disposeObject(obj: THREE.Object3D): void {
    if (obj instanceof THREE.Group) {
      obj.children.forEach((child) => this.disposeObject(child));
    } else if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose());
      } else {
        obj.material.dispose();
      }
    } else if (obj instanceof THREE.Points) {
      obj.geometry.dispose();
      (obj.material as THREE.Material).dispose();
    } else if (obj instanceof THREE.Sprite) {
      (obj.material as THREE.SpriteMaterial).map?.dispose();
      obj.material.dispose();
    }
  }

  /**
   * Clean up renderer and post-processing - called at end of destroy()
   */
  private disposeRenderer(): void {
    this.composer.dispose();
    this.renderer.dispose();
  }
}

// ============================================
// Function exports
// ============================================

let starfieldInstance: Starfield | null = null;

export function initStarfield(canvas: HTMLCanvasElement): void {
  if (starfieldInstance) {
    starfieldInstance.destroy();
  }
  starfieldInstance = new Starfield(canvas);
  starfieldInstance.start();
}

export function updateParallax(_normalizedX: number, _normalizedY: number): void {
  // Parallax is handled internally via ParallaxController
}

export function cleanup(): void {
  if (starfieldInstance) {
    starfieldInstance.destroy();
    starfieldInstance = null;
  }
}
