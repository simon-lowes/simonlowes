/**
 * Quality Detection and Adaptive Performance System
 * Detects device capabilities and manages rendering quality tiers
 */

// ============================================================
// QUALITY TIER DEFINITIONS
// ============================================================

export enum QualityTier {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  ULTRA = "ultra",
}

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

  // Performance
  targetFps: number;
  pixelRatioLimit: number;
}

const QUALITY_PRESETS: Record<QualityTier, QualityConfig> = {
  [QualityTier.LOW]: {
    farStarCount: 2000,
    midStarCount: 400,
    nearStarCount: 80,
    galaxyCount: 15,
    bloomEnabled: false,
    bloomIntensity: 0,
    chromaticEnabled: false,
    grainEnabled: false,
    vignetteEnabled: true, // Vignette is cheap, keep it
    targetFps: 30,
    pixelRatioLimit: 1,
  },
  [QualityTier.MEDIUM]: {
    farStarCount: 4000,
    midStarCount: 600,
    nearStarCount: 120,
    galaxyCount: 25,
    bloomEnabled: true,
    bloomIntensity: 0.8,
    chromaticEnabled: false,
    grainEnabled: false,
    vignetteEnabled: true,
    targetFps: 30,
    pixelRatioLimit: 1.5,
  },
  [QualityTier.HIGH]: {
    farStarCount: 8000,
    midStarCount: 1000,
    nearStarCount: 200,
    galaxyCount: 40,
    bloomEnabled: true,
    bloomIntensity: 1.2,
    chromaticEnabled: true,
    grainEnabled: true,
    vignetteEnabled: true,
    targetFps: 60,
    pixelRatioLimit: 2,
  },
  [QualityTier.ULTRA]: {
    farStarCount: 12000,
    midStarCount: 1500,
    nearStarCount: 300,
    galaxyCount: 60,
    bloomEnabled: true,
    bloomIntensity: 1.4,
    chromaticEnabled: true,
    grainEnabled: true,
    vignetteEnabled: true,
    targetFps: 60,
    pixelRatioLimit: 2,
  },
};

// ============================================================
// GPU CLASSIFICATION
// Known GPU strings mapped to quality tiers
// ============================================================

interface GPUMatch {
  patterns: RegExp[];
  tier: QualityTier;
}

const GPU_CLASSIFICATIONS: GPUMatch[] = [
  // ULTRA tier - High-end dedicated GPUs
  {
    patterns: [
      /RTX\s*(30|40)/i, // NVIDIA RTX 3000/4000 series
      /RX\s*(6[89]|7[0-9])/i, // AMD RX 6800+, 7000 series
      /Radeon\s*Pro\s*(W[67]|VII)/i, // AMD Pro workstation
      /Quadro\s*RTX/i, // NVIDIA Quadro RTX
    ],
    tier: QualityTier.ULTRA,
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
    tier: QualityTier.HIGH,
  },
  // MEDIUM tier - Entry dedicated GPUs and good integrated
  {
    patterns: [
      /GTX\s*(9[0-9]0|10[0-5]0)/i, // NVIDIA GTX 900/1000 series (not 1060+)
      /RX\s*(4[0-9]{2})/i, // AMD RX 400 series
      /Iris\s*(Plus|Pro|Xe)/i, // Intel Iris integrated
      /UHD\s*(6[2-9]0|7[0-9]0)/i, // Intel UHD 620+
    ],
    tier: QualityTier.MEDIUM,
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
      /ANGLE/i, // DirectX translation layer (often weaker)
    ],
    tier: QualityTier.LOW,
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
function classifyGPU(gpuString: string | null): QualityTier | null {
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
 * Detect if device is mobile
 */
function detectMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

/**
 * Detect if touch device
 */
function detectTouch(): boolean {
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

// ============================================================
// QUALITY MANAGER CLASS
// ============================================================

const STORAGE_KEY = "starfield-quality-preference";

export class QualityManager {
  private currentTier: QualityTier;
  private detectedTier: QualityTier;
  private userOverride: QualityTier | null = null;
  private gpuString: string | null = null;
  private deviceMemory: number | null = null;
  private isMobile: boolean;
  private fpsHistory: number[] = [];
  private lastFrameTime = 0;
  private adaptiveEnabled = true;
  private onQualityChange?: (config: QualityConfig) => void;

  constructor(gl: WebGLRenderingContext | null) {
    // Detect device characteristics
    this.gpuString = detectGPU(gl);
    this.deviceMemory = detectMemory();
    this.isMobile = detectMobile();

    // Load user preference
    this.loadUserPreference();

    // Determine initial quality tier
    this.detectedTier = this.calculateOptimalTier(gl);
    this.currentTier = this.userOverride ?? this.detectedTier;

    // Log detection results (dev only)
    if (import.meta.env.DEV) {
      console.log("[Quality] GPU:", this.gpuString);
      console.log("[Quality] Memory:", this.deviceMemory, "GB");
      console.log("[Quality] Mobile:", this.isMobile);
      console.log("[Quality] Detected tier:", this.detectedTier);
      console.log("[Quality] Current tier:", this.currentTier);
    }
  }

  /**
   * Calculate optimal quality tier based on all signals
   */
  private calculateOptimalTier(gl: WebGLRenderingContext | null): QualityTier {
    // Start with GPU classification if available
    const gpuTier = classifyGPU(this.gpuString);

    // If we got a confident GPU match, use it
    if (gpuTier !== null) {
      // Downgrade mobile even with good GPU (thermal/battery)
      if (this.isMobile && gpuTier === QualityTier.ULTRA) {
        return QualityTier.HIGH;
      }
      return gpuTier;
    }

    // Fallback: Use heuristics
    const caps = getWebGLCapabilities(gl);

    // Mobile devices default to LOW unless proven otherwise
    if (this.isMobile) {
      // Check if it's a capable mobile (high memory, large textures)
      if (this.deviceMemory && this.deviceMemory >= 4 && caps && caps.maxTextureSize >= 8192) {
        return QualityTier.MEDIUM;
      }
      return QualityTier.LOW;
    }

    // Desktop fallback based on memory
    if (this.deviceMemory) {
      if (this.deviceMemory >= 8) return QualityTier.HIGH;
      if (this.deviceMemory >= 4) return QualityTier.MEDIUM;
      return QualityTier.LOW;
    }

    // Complete unknown - assume MEDIUM for desktop
    return QualityTier.MEDIUM;
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
  onConfigChange(callback: (config: QualityConfig) => void): void {
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
   * Check if quality should be adjusted based on FPS
   */
  private checkAdaptiveQuality(): void {
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    const targetFps = QUALITY_PRESETS[this.currentTier].targetFps;

    // Downgrade if consistently below 80% of target
    if (avgFps < targetFps * 0.8) {
      const newTier = this.lowerTier(this.currentTier);
      if (newTier !== this.currentTier) {
        if (import.meta.env.DEV) {
          console.log(
            `[Quality] Adaptive downgrade: ${this.currentTier} -> ${newTier} (avg FPS: ${avgFps.toFixed(1)})`
          );
        }
        this.currentTier = newTier;
        this.fpsHistory = []; // Reset history
        this.onQualityChange?.(this.getConfig());
      }
    }

    // Upgrade if consistently above 95% of target and not at detected tier
    if (avgFps > targetFps * 0.95 && this.currentTier !== this.detectedTier) {
      const newTier = this.higherTier(this.currentTier);
      // Only upgrade if we're below detected tier
      if (this.tierValue(newTier) <= this.tierValue(this.detectedTier)) {
        if (import.meta.env.DEV) {
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

  private tierValue(tier: QualityTier): number {
    const order = [QualityTier.LOW, QualityTier.MEDIUM, QualityTier.HIGH, QualityTier.ULTRA];
    return order.indexOf(tier);
  }

  private lowerTier(tier: QualityTier): QualityTier {
    const order = [QualityTier.LOW, QualityTier.MEDIUM, QualityTier.HIGH, QualityTier.ULTRA];
    const idx = order.indexOf(tier);
    return idx > 0 ? order[idx - 1] : tier;
  }

  private higherTier(tier: QualityTier): QualityTier {
    const order = [QualityTier.LOW, QualityTier.MEDIUM, QualityTier.HIGH, QualityTier.ULTRA];
    const idx = order.indexOf(tier);
    return idx < order.length - 1 ? order[idx + 1] : tier;
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
    hasOverride: boolean;
  } {
    return {
      gpu: this.gpuString,
      memory: this.deviceMemory,
      isMobile: this.isMobile,
      detectedTier: this.detectedTier,
      currentTier: this.currentTier,
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
  return [QualityTier.LOW, QualityTier.MEDIUM, QualityTier.HIGH, QualityTier.ULTRA];
}
