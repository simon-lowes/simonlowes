import { describe, it, expect } from "vitest";
import {
  QualityTier,
  QualityManager,
  MOBILE_MAX_TIER,
  classifyGPU,
  detectMobile,
  getAvailableTiers,
  getQualityPreset,
} from "../src/scripts/quality";

describe("Quality presets", () => {
  it("turn the volumetric nebulae on from HIGH, not just ULTRA", () => {
    expect(getQualityPreset(QualityTier._HIGH).volumetricNebulaEnabled).toBe(true);
    expect(getQualityPreset(QualityTier._ULTRA).volumetricNebulaEnabled).toBe(true);
    expect(getQualityPreset(QualityTier._MEDIUM).volumetricNebulaEnabled).toBe(false);
    expect(getQualityPreset(QualityTier._LOW).volumetricNebulaEnabled).toBe(false);
  });

  it("give every tier a deep-sky backdrop that gets cheaper as the tier drops", () => {
    const tiers = getAvailableTiers();
    let lastWidth = 0;
    let lastOctaves = 0;
    for (const tier of tiers) {
      const preset = getQualityPreset(tier);
      expect(preset.backdropTextureWidth).toBeGreaterThanOrEqual(lastWidth);
      expect(preset.backdropOctaves).toBeGreaterThanOrEqual(lastOctaves);
      expect(preset.backdropUpdateInterval).toBeGreaterThanOrEqual(1);
      expect(preset.backdropIntensity).toBeGreaterThan(0);
      lastWidth = preset.backdropTextureWidth;
      lastOctaves = preset.backdropOctaves;
    }
    expect(getQualityPreset(QualityTier._LOW).backdropTextureWidth).toBeLessThanOrEqual(512);
    expect(getQualityPreset(QualityTier._LOW).backdropUpdateInterval).toBeGreaterThan(1);
  });
});

describe("GPU classification", () => {
  it("recognises recent desktop GPUs as ULTRA", () => {
    expect(classifyGPU("ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11)")).toBe(
      QualityTier._ULTRA
    );
    expect(classifyGPU("AMD Radeon RX 7800 XT")).toBe(QualityTier._ULTRA);
  });

  it("recognises Apple Silicon as HIGH", () => {
    expect(classifyGPU("Apple M2")).toBe(QualityTier._HIGH);
  });

  it("does not treat the ANGLE translation layer itself as a weak GPU", () => {
    // ANGLE wraps every GPU on Windows Chrome; only the GPU name should count
    expect(classifyGPU("ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11)")).toBe(
      QualityTier._MEDIUM
    );
    expect(classifyGPU("ANGLE (Unknown Vendor, Unknown GPU)")).toBeNull();
  });

  it("returns null for unknown or missing strings", () => {
    expect(classifyGPU(null)).toBeNull();
    expect(classifyGPU("Mystery Graphics 9000")).toBeNull();
  });
});

describe("Phone detection", () => {
  it("flags phones and tablets", () => {
    expect(
      detectMobile("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15")
    ).toBe(true);
    expect(detectMobile("Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36")).toBe(
      true
    );
  });

  it("leaves desktops alone", () => {
    expect(detectMobile("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Safari/605.1.15")).toBe(
      false
    );
    expect(detectMobile("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0")).toBe(false);
  });
});

describe("QualityManager probe", () => {
  // Without a WebGL context there is no GPU string, so the manager falls back
  // to heuristics: jsdom reports no deviceMemory and a desktop user agent.
  it("starts unknown desktops at HIGH and lets them reach ULTRA", () => {
    const manager = new QualityManager(null);
    expect(manager.getDetectedTier()).toBe(QualityTier._HIGH);
    expect(manager.getMaxTier()).toBe(QualityTier._ULTRA);
  });

  it("drops a tier when frames run slow and never bounces back to it", () => {
    const manager = new QualityManager(null);
    const changes = [];
    manager.onConfigChange((config) => changes.push(config.targetFps));

    // 60-frame window at 20 fps (HIGH targets 60)
    let t = 0;
    for (let i = 0; i < 62; i++) {
      manager.recordFrame(t);
      t += 50;
    }
    expect(manager.getTier()).toBe(QualityTier._MEDIUM);
    expect(changes).toHaveLength(1);

    // Now hold MEDIUM's 30 fps target comfortably for a long time
    for (let i = 0; i < 60 * 12; i++) {
      manager.recordFrame(t);
      t += 1000 / 30;
    }
    // The ceiling was lowered to MEDIUM, so no upgrade back to HIGH
    expect(manager.getTier()).toBe(QualityTier._MEDIUM);
    expect(changes).toHaveLength(1);
  });

  it("climbs a tier after sustained headroom", () => {
    const manager = new QualityManager(null);
    manager.setTier(QualityTier._MEDIUM);
    manager.resetToAuto(); // clears the override but keeps probing enabled
    expect(manager.getTier()).toBe(QualityTier._HIGH);

    // HIGH holding its 60 fps target for a few windows -> ULTRA
    let t = 0;
    for (let i = 0; i < 60 * 5; i++) {
      manager.recordFrame(t);
      t += 1000 / 60;
    }
    expect(manager.getTier()).toBe(QualityTier._ULTRA);

    // And stays there: nothing above ULTRA
    for (let i = 0; i < 60 * 5; i++) {
      manager.recordFrame(t);
      t += 1000 / 60;
    }
    expect(manager.getTier()).toBe(QualityTier._ULTRA);
  });

  it("caps phones at MEDIUM", () => {
    expect(MOBILE_MAX_TIER).toBe(QualityTier._MEDIUM);
  });
});
