/**
 * Quality Detection and Adaptive Performance System
 * Detects device capabilities and manages rendering quality tiers
 */

// ============================================================
// QUALITY TIER DEFINITIONS
// ============================================================

export enum QualityTier {
  _LOW = "low",
  _MEDIUM = "medium",
  _HIGH = "high",
  _ULTRA = "ultra",
}

const TIER_ORDER: readonly QualityTier[] = [
  QualityTier._LOW,
  QualityTier._MEDIUM,
  QualityTier._HIGH,
  QualityTier._ULTRA,
];

export interface QualityConfig {
  // Particle counts
  farStarCount: number;
  midStarCount: number;
  nearStarCount: number;
  galaxyCount: number;

  // Post-processing
  bloomEnabled: boolean;
  bloomIntensity: number;
  chromaticEnabled: boolean;
  grainEnabled: boolean;
  vignetteEnabled: boolean;
  adaptiveExposureEnabled: boolean;

  // Star rendering
  realisticPsfEnabled: boolean; // Airy disk + diffraction spikes

  // Volumetric effects
  volumetricNebulaEnabled: boolean; // Raymarched 3D gas clouds (expensive)

  // Deep-sky backdrop (always on; these scale its cost)
  backdropTextureWidth: number; // Offscreen noise texture width in pixels
  backdropOctaves: number; // Fractal noise detail
  backdropUpdateInterval: number; // Re-render the noise every N frames
  backdropIntensity: number; // Brightness multiplier

  // Performance
  targetFps: number;
  pixelRatioLimit: number;
}

const QUALITY_PRESETS: Record<QualityTier, QualityConfig> = {
  [QualityTier._LOW]: {
    farStarCount: 2600, // +30% density
    midStarCount: 520,
    nearStarCount: 104,
    galaxyCount: 15,
    bloomEnabled: false,
    bloomIntensity: 0,
    chromaticEnabled: false,
    grainEnabled: false,
    vignetteEnabled: true, // Vignette is cheap, keep it
    adaptiveExposureEnabled: false,
    realisticPsfEnabled: false,
    volumetricNebulaEnabled: false,
    backdropTextureWidth: 384,
    backdropOctaves: 3,
    backdropUpdateInterval: 3,
    backdropIntensity: 0.6, // No tone mapping on LOW, so keep the haze off the text
    targetFps: 30,
    pixelRatioLimit: 1,
  },
  [QualityTier._MEDIUM]: {
    farStarCount: 5200, // +30% density
    midStarCount: 780,
    nearStarCount: 156,
    galaxyCount: 25,
    bloomEnabled: true,
    bloomIntensity: 0.8,
    chromaticEnabled: false,
    grainEnabled: false,
    vignetteEnabled: true,
    adaptiveExposureEnabled: true, // Low cost, enable at MEDIUM+
    realisticPsfEnabled: false, // Keep simple stars for performance
    volumetricNebulaEnabled: false,
    backdropTextureWidth: 640,
    backdropOctaves: 4,
    backdropUpdateInterval: 2,
    backdropIntensity: 0.85,
    targetFps: 30,
    pixelRatioLimit: 1.5,
  },
  [QualityTier._HIGH]: {
    farStarCount: 10400, // +30% density
    midStarCount: 1300,
    nearStarCount: 260,
    galaxyCount: 40,
    bloomEnabled: true,
    bloomIntensity: 1.2,
    chromaticEnabled: true,
    grainEnabled: true,
    vignetteEnabled: true,
    adaptiveExposureEnabled: true,
    realisticPsfEnabled: true, // Airy disk + diffraction spikes
    volumetricNebulaEnabled: true, // Raymarched 3D gas clouds: the showpiece, on by default
    backdropTextureWidth: 1024,
    backdropOctaves: 5,
    backdropUpdateInterval: 1,
    backdropIntensity: 1.0,
    targetFps: 60,
    pixelRatioLimit: 2,
  },
  [QualityTier._ULTRA]: {
    farStarCount: 15600, // +30% density
    midStarCount: 1950,
    nearStarCount: 390,
    galaxyCount: 60,
    bloomEnabled: true,
    bloomIntensity: 1.4,
    chromaticEnabled: true,
    grainEnabled: true,
    vignetteEnabled: true,
    adaptiveExposureEnabled: true,
    realisticPsfEnabled: true, // Airy disk + diffraction spikes
    volumetricNebulaEnabled: true, // Raymarched 3D gas clouds
    backdropTextureWidth: 1280,
    backdropOctaves: 6,
    backdropUpdateInterval: 1,
    backdropIntensity: 1.0,
    targetFps: 60,
    pixelRatioLimit: 2,
  },
};

// ============================================================
// GPU CLASSIFICATION
// Known GPU strings mapped to quality tiers. This is only a starting guess:
// the frame-time probe below moves the tier up or down from here.
// ============================================================

interface GPUMatch {
  patterns: RegExp[];
  tier: QualityTier;
}

const GPU_CLASSIFICATIONS: GPUMatch[] = [
  // ULTRA tier - High-end dedicated GPUs
  {
    patterns: [
      /RTX\s*(30|40|50)/i, // NVIDIA RTX 3000/4000/5000 series
      /RX\s*(6[89]|7[0-9]|9[0-9])/i, // AMD RX 6800+, 7000, 9000 series
      /Radeon\s*Pro\s*(W[67]|VII)/i, // AMD Pro workstation
      /Quadro\s*RTX/i, // NVIDIA Quadro RTX
    ],
    tier: QualityTier._ULTRA,
  },
  // HIGH tier - Mid-range dedicated GPUs and Apple Silicon
  {
    patterns: [
      /RTX\s*(20)/i, // NVIDIA RTX 2000 series
      /GTX\s*(10[678]0|16)/i, // NVIDIA GTX 1060+, 1600 series
      /RX\s*(5[0-9]{2}|6[0-7])/i, // AMD RX 500/5000/6000 series (not 6800+)
      /Apple\s*M[1-9]/i, // Apple Silicon M1, M2, M3, etc.
      /Apple\s*GPU/i, // Generic Apple GPU
      /AMD\s*Radeon\s*Pro\s*5/i, // MacBook Pro AMD GPUs
    ],
    tier: QualityTier._HIGH,
  },
  // MEDIUM tier - Entry dedicated GPUs and good integrated
  {
    patterns: [
      /GTX\s*(9[0-9]0|10[0-5]0)/i, // NVIDIA GTX 900/1000 series (not 1060+)
      /RX\s*(4[0-9]{2})/i, // AMD RX 400 series
      /Iris(\(R\))?\s*(Plus|Pro|Xe)/i, // Intel Iris integrated (strings often read "Iris(R) Xe")
      /UHD\s*(Graphics\s*)?(6[2-9]0|7[0-9]0)/i, // Intel UHD 620+
    ],
    tier: QualityTier._MEDIUM,
  },
  // LOW tier - Old/weak GPUs and mobile
  {
    patterns: [
      /Intel.*HD\s*(4[0-9]{3}|5[0-9]{3}|6[01][0-9])/i, // Intel HD 4000-6100
      /Mali/i, // ARM Mali (mobile)
      /Adreno/i, // Qualcomm Adreno (mobile)
      /PowerVR/i, // PowerVR (mobile/old)
      /GeForce\s*(GT|[1-9][0-9]{2}M)/i, // Old NVIDIA mobile
      /Radeon\s*(HD|R[579])/i, // Old AMD
      /SwiftShader/i, // Software renderer
      /llvmpipe/i, // Software renderer
    ],
    tier: QualityTier._LOW,
  },
];

// ============================================================
// DETECTION FUNCTIONS
// ============================================================

/**
 * Detect GPU renderer string from WebGL context
 */
function detectGPU(gl: WebGLRenderingContext | null): string | null {
  if (!gl) return null;

  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  if (!debugInfo) return null;

  try {
    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string;
  } catch {
    return null;
  }
}

/**
 * Classify GPU string to quality tier
 */
export function classifyGPU(gpuString: string | null): QualityTier | null {
  if (!gpuString) return null;

  for (const classification of GPU_CLASSIFICATIONS) {
    for (const pattern of classification.patterns) {
      if (pattern.test(gpuString)) {
        return classification.tier;
      }
    }
  }

  return null; // Unknown GPU
}

/**
 * Detect device memory (Chrome/Edge only)
 */
function detectMemory(): number | null {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return nav.deviceMemory ?? null;
}

/**
 * Detect if device is a phone or tablet
 */
export function detectMobile(userAgent: string = navigator.userAgent): boolean {
  return /iPhone|iPad|iPod|Android|Mobile/i.test(userAgent);
}

/**
 * Detect if touch device
 */
function _detectTouch(): boolean {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
}

/**
 * Get WebGL capabilities
 */
function getWebGLCapabilities(
  gl: WebGLRenderingContext | null
): { maxTextureSize: number; maxVertexUniforms: number } | null {
  if (!gl) return null;

  return {
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    maxVertexUniforms: gl.getParameter(gl.MAX_VERTEX_UNIFORM_VECTORS) as number,
  };
}

function tierValue(tier: QualityTier): number {
  return TIER_ORDER.indexOf(tier);
}

function minTier(a: QualityTier, b: QualityTier): QualityTier {
  return tierValue(a) <= tierValue(b) ? a : b;
}

// ============================================================
// QUALITY MANAGER CLASS
// ============================================================

const STORAGE_KEY = "starfield-quality-preference";

/** Phones and tablets never go above this, whatever their GPU: heat and battery. */
export const MOBILE_MAX_TIER = QualityTier._MEDIUM;

/** Consecutive 60-frame windows at full frame rate before trying the next tier up. */
const HEADROOM_WINDOWS_TO_UPGRADE = 3;

export class QualityManager {
  private currentTier: QualityTier;
  private detectedTier: QualityTier;
  /** Hardware ceiling: MEDIUM on phones, ULTRA on desktop. */
  private maxTier: QualityTier;
  /** Lowered whenever a tier proves too slow, so the probe never bounces back up to it. */
  private ceilingTier: QualityTier;
  private headroomWindows = 0;
  private userOverride: QualityTier | null = null;
  private gpuString: string | null = null;
  private deviceMemory: number | null = null;
  private isMobile: boolean;
  private fpsHistory: number[] = [];
  private lastFrameTime = 0;
  private adaptiveEnabled = true;
  private onQualityChange?: (_config: QualityConfig) => void;

  constructor(gl: WebGLRenderingContext | null) {
    // Detect device characteristics
    this.gpuString = detectGPU(gl);
    this.deviceMemory = detectMemory();
    this.isMobile = detectMobile();
    this.maxTier = this.isMobile ? MOBILE_MAX_TIER : QualityTier._ULTRA;
    this.ceilingTier = this.maxTier;

    // Load user preference
    this.loadUserPreference();

    // Determine initial quality tier
    this.detectedTier = this.calculateOptimalTier(gl);
    this.currentTier = this.userOverride ?? this.detectedTier;

    // Log detection results (dev only)
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.log("[Quality] GPU:", this.gpuString);
      // eslint-disable-next-line no-console
      console.log("[Quality] Memory:", this.deviceMemory, "GB");
      // eslint-disable-next-line no-console
      console.log("[Quality] Mobile:", this.isMobile);
      // eslint-disable-next-line no-console
      console.log("[Quality] Detected tier:", this.detectedTier, "max:", this.maxTier);
      // eslint-disable-next-line no-console
      console.log("[Quality] Current tier:", this.currentTier);
    }
  }

  /**
   * Starting tier from the signals we have. The frame-time probe in
   * recordFrame() corrects this within a few seconds either way, so the
   * guess errs towards the richer tier on desktop.
   */
  private calculateOptimalTier(gl: WebGLRenderingContext | null): QualityTier {
    const gpuTier = classifyGPU(this.gpuString);

    // A recognised GPU is the best signal we have
    if (gpuTier !== null) {
      return minTier(gpuTier, this.maxTier);
    }

    const caps = getWebGLCapabilities(gl);

    // Phones default to LOW unless they look capable
    if (this.isMobile) {
      if (this.deviceMemory && this.deviceMemory >= 4 && caps && caps.maxTextureSize >= 8192) {
        return minTier(QualityTier._MEDIUM, this.maxTier);
      }
      return QualityTier._LOW;
    }

    // Desktop with an unrecognised GPU: memory is the only other hint
    if (this.deviceMemory) {
      if (this.deviceMemory >= 8) return QualityTier._HIGH;
      if (this.deviceMemory >= 4) return QualityTier._MEDIUM;
      return QualityTier._LOW;
    }

    // Complete unknown on desktop (Safari, Firefox): start HIGH and let the probe decide
    return QualityTier._HIGH;
  }

  /**
   * Load user's saved quality preference from localStorage
   */
  private loadUserPreference(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && Object.values(QualityTier).includes(saved as QualityTier)) {
        this.userOverride = saved as QualityTier;
      }
    } catch {
      // localStorage not available
    }
  }

  /**
   * Save user's quality preference to localStorage
   */
  private saveUserPreference(tier: QualityTier | null): void {
    try {
      if (tier === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, tier);
      }
    } catch {
      // localStorage not available
    }
  }

  /**
   * Get current quality configuration
   */
  getConfig(): QualityConfig {
    return { ...QUALITY_PRESETS[this.currentTier] };
  }

  /**
   * Get current quality tier
   */
  getTier(): QualityTier {
    return this.currentTier;
  }

  /**
   * Get detected (auto) quality tier
   */
  getDetectedTier(): QualityTier {
    return this.detectedTier;
  }

  /**
   * Highest tier this device may ever be given
   */
  getMaxTier(): QualityTier {
    return this.maxTier;
  }

  /**
   * Check if user has overridden quality
   */
  hasUserOverride(): boolean {
    return this.userOverride !== null;
  }

  /**
   * Set quality tier manually (user override)
   */
  setTier(tier: QualityTier): void {
    this.userOverride = tier;
    this.currentTier = tier;
    this.saveUserPreference(tier);
    this.onQualityChange?.(this.getConfig());
  }

  /**
   * Reset to auto-detected quality
   */
  resetToAuto(): void {
    this.userOverride = null;
    this.currentTier = this.detectedTier;
    this.ceilingTier = this.maxTier;
    this.headroomWindows = 0;
    this.saveUserPreference(null);
    this.onQualityChange?.(this.getConfig());
  }

  /**
   * Enable/disable adaptive quality (FPS-based adjustment)
   */
  setAdaptiveEnabled(enabled: boolean): void {
    this.adaptiveEnabled = enabled;
  }

  /**
   * Register callback for quality changes
   */
  onConfigChange(callback: (_config: QualityConfig) => void): void {
    this.onQualityChange = callback;
  }

  /**
   * Record a frame time for FPS monitoring
   * Call this every frame to enable adaptive quality
   */
  recordFrame(timestamp: number): void {
    if (!this.adaptiveEnabled || this.userOverride !== null) {
      return; // Don't adapt if disabled or user has override
    }

    if (this.lastFrameTime > 0) {
      const frameTime = timestamp - this.lastFrameTime;
      const fps = 1000 / frameTime;

      // Keep rolling window of last 60 frames
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > 60) {
        this.fpsHistory.shift();
      }

      // Check for quality adjustment every 60 frames
      if (this.fpsHistory.length === 60) {
        this.checkAdaptiveQuality();
      }
    }

    this.lastFrameTime = timestamp;
  }

  /**
   * The capability probe. Sustained frame rate below target drops a tier and
   * lowers the ceiling; sustained full frame rate for a few windows tries the
   * next tier up, as far as the ceiling allows. The animation loop throttles
   * to each tier's target FPS, so "full frame rate" means the tier is holding
   * its own target, not that the display is faster.
   */
  private checkAdaptiveQuality(): void {
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    const targetFps = QUALITY_PRESETS[this.currentTier].targetFps;

    // Downgrade if consistently below 80% of target
    if (avgFps < targetFps * 0.8) {
      const newTier = this.lowerTier(this.currentTier);
      if (newTier !== this.currentTier) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log(
            `[Quality] Adaptive downgrade: ${this.currentTier} -> ${newTier} (avg FPS: ${avgFps.toFixed(1)})`
          );
        }
        this.currentTier = newTier;
        this.ceilingTier = newTier;
        this.headroomWindows = 0;
        this.fpsHistory = []; // Reset history
        this.onQualityChange?.(this.getConfig());
      }
      return;
    }

    // Upgrade after sustained headroom, never past the ceiling
    if (avgFps >= targetFps * 0.97) {
      this.headroomWindows++;
    } else {
      this.headroomWindows = 0;
    }

    if (this.headroomWindows >= HEADROOM_WINDOWS_TO_UPGRADE) {
      this.headroomWindows = 0;
      const newTier = this.higherTier(this.currentTier);
      if (newTier !== this.currentTier && tierValue(newTier) <= tierValue(this.ceilingTier)) {
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.log(
            `[Quality] Adaptive upgrade: ${this.currentTier} -> ${newTier} (avg FPS: ${avgFps.toFixed(1)})`
          );
        }
        this.currentTier = newTier;
        this.fpsHistory = []; // Reset history
        this.onQualityChange?.(this.getConfig());
      }
    }
  }

  private lowerTier(tier: QualityTier): QualityTier {
    const idx = tierValue(tier);
    return idx > 0 ? (TIER_ORDER[idx - 1] ?? tier) : tier;
  }

  private higherTier(tier: QualityTier): QualityTier {
    const idx = tierValue(tier);
    return idx < TIER_ORDER.length - 1 ? (TIER_ORDER[idx + 1] ?? tier) : tier;
  }

  /**
   * Get debug info about current detection
   */
  getDebugInfo(): {
    gpu: string | null;
    memory: number | null;
    isMobile: boolean;
    detectedTier: QualityTier;
    currentTier: QualityTier;
    maxTier: QualityTier;
    hasOverride: boolean;
  } {
    return {
      gpu: this.gpuString,
      memory: this.deviceMemory,
      isMobile: this.isMobile,
      detectedTier: this.detectedTier,
      currentTier: this.currentTier,
      maxTier: this.maxTier,
      hasOverride: this.userOverride !== null,
    };
  }
}

/**
 * Get quality preset for a specific tier
 */
export function getQualityPreset(tier: QualityTier): QualityConfig {
  return { ...QUALITY_PRESETS[tier] };
}

/**
 * Get all available quality tiers
 */
export function getAvailableTiers(): QualityTier[] {
  return [...TIER_ORDER];
}
