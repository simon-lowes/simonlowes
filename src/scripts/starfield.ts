/**
 * Starfield - Three.js procedural deep space background
 * Creates 3 parallax layers of stars with different depths
 */

import * as THREE from "three";
import { ParallaxController } from "./parallax";

// Color palette from design spec
const STAR_COLORS = {
  white: 0xffffff,
  warmYellow: 0xffe4b5,
  coolBlue: 0xadd8e6,
  gold: 0xffd700,
};

const NEBULA_COLORS = {
  deepPurple: 0x1a0a2e,
  darkBlue: 0x0d1b2a,
  midBlue: 0x1b263b,
  purple: 0x2d1b4e,
};

interface StarLayer {
  group: THREE.Group;
  zMin: number;
  zMax: number;
  parallaxFactor: number;
}

export class Starfield {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private animationId: number | null = null;
  private layers: StarLayer[] = [];
  private parallax: ParallaxController;
  private reducedMotion: boolean;
  private lastTime = 0;
  private targetFps = 60;
  private frameInterval = 1000 / 60;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.reducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.z = 0;

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Initialize parallax controller
    this.parallax = new ParallaxController(this.reducedMotion);

    // Create star layers
    this.createLayers();

    // Bind event handlers
    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    // Add event listeners
    window.addEventListener("resize", this.handleResize);

    // Detect low-end devices and adjust performance
    this.detectPerformance();
  }

  private detectPerformance(): void {
    // Check for mobile/low-end devices using touch detection
    // Uses ontouchstart in window and maxTouchPoints for better detection
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile || isTouchDevice) {
      this.targetFps = 30;
      this.frameInterval = 1000 / 30;
    }
  }

  // Auto-drift animation fallback using sine wave movement
  private autoDriftAnimate(time: number): number {
    // Gentle sine wave for auto-drift when no mouse/touch input
    return Math.sin(time * 0.001) * 0.5;
  }

  private createLayers(): void {
    // Detect if mobile for reduced particle counts
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const multiplier = isMobile ? 0.5 : 1;

    const spreadX = 2000;
    const spreadY = 2000;

    // ===========================================================
    // FAR LAYER - thousands of tiny distant stars (2% parallax)
    // ===========================================================
    const farCount = Math.floor(5000 * multiplier);
    const farZMin = -1000;
    const farZMax = -500;
    const farColors = [STAR_COLORS.white, STAR_COLORS.coolBlue, STAR_COLORS.warmYellow];

    const farGeometry = new THREE.BufferGeometry();
    const farPositions = new Float32Array(farCount * 3);
    const farSizes = new Float32Array(farCount);
    const farColorArray = new Float32Array(farCount * 3);

    for (let i = 0; i < farCount; i++) {
      const i3 = i * 3;
      farPositions[i3] = (Math.random() - 0.5) * spreadX;
      farPositions[i3 + 1] = (Math.random() - 0.5) * spreadY;
      farPositions[i3 + 2] = farZMin + Math.random() * (farZMax - farZMin);
      farSizes[i] = 0.3 + Math.random() * 0.7;
      const color = new THREE.Color(farColors[Math.floor(Math.random() * farColors.length)]);
      farColorArray[i3] = color.r;
      farColorArray[i3 + 1] = color.g;
      farColorArray[i3 + 2] = color.b;
    }

    farGeometry.setAttribute("position", new THREE.BufferAttribute(farPositions, 3));
    farGeometry.setAttribute("size", new THREE.BufferAttribute(farSizes, 1));
    farGeometry.setAttribute("color", new THREE.BufferAttribute(farColorArray, 3));

    const farMaterial = this.createStarMaterial();
    const farPoints = new THREE.Points(farGeometry, farMaterial);
    const farGroup = new THREE.Group();
    farGroup.add(farPoints);
    this.scene.add(farGroup);

    this.layers.push({
      group: farGroup,
      zMin: farZMin,
      zMax: farZMax,
      parallaxFactor: 0.02,
    });

    // ===========================================================
    // MID LAYER - nebula points and medium stars (5% parallax)
    // ===========================================================
    const midCount = Math.floor(800 * multiplier);
    const midZMin = -500;
    const midZMax = -100;
    const midColors = [
      STAR_COLORS.white,
      STAR_COLORS.coolBlue,
      NEBULA_COLORS.midBlue,
      NEBULA_COLORS.purple,
    ];

    const midGeometry = new THREE.BufferGeometry();
    const midPositions = new Float32Array(midCount * 3);
    const midSizes = new Float32Array(midCount);
    const midColorArray = new Float32Array(midCount * 3);

    for (let i = 0; i < midCount; i++) {
      const i3 = i * 3;
      midPositions[i3] = (Math.random() - 0.5) * spreadX;
      midPositions[i3 + 1] = (Math.random() - 0.5) * spreadY;
      midPositions[i3 + 2] = midZMin + Math.random() * (midZMax - midZMin);
      midSizes[i] = 0.8 + Math.random() * 1.7;
      const color = new THREE.Color(midColors[Math.floor(Math.random() * midColors.length)]);
      midColorArray[i3] = color.r;
      midColorArray[i3 + 1] = color.g;
      midColorArray[i3 + 2] = color.b;
    }

    midGeometry.setAttribute("position", new THREE.BufferAttribute(midPositions, 3));
    midGeometry.setAttribute("size", new THREE.BufferAttribute(midSizes, 1));
    midGeometry.setAttribute("color", new THREE.BufferAttribute(midColorArray, 3));

    const midMaterial = this.createStarMaterial();
    const midPoints = new THREE.Points(midGeometry, midMaterial);
    const midGroup = new THREE.Group();
    midGroup.add(midPoints);
    this.scene.add(midGroup);

    this.layers.push({
      group: midGroup,
      zMin: midZMin,
      zMax: midZMax,
      parallaxFactor: 0.05,
    });

    // ===========================================================
    // NEAR LAYER - occasional bright particles (10% parallax)
    // ===========================================================
    const nearCount = Math.floor(200 * multiplier);
    const nearZMin = -100;
    const nearZMax = 0;
    const nearColors = [STAR_COLORS.white, STAR_COLORS.gold, STAR_COLORS.warmYellow];

    const nearGeometry = new THREE.BufferGeometry();
    const nearPositions = new Float32Array(nearCount * 3);
    const nearSizes = new Float32Array(nearCount);
    const nearColorArray = new Float32Array(nearCount * 3);

    for (let i = 0; i < nearCount; i++) {
      const i3 = i * 3;
      nearPositions[i3] = (Math.random() - 0.5) * spreadX;
      nearPositions[i3 + 1] = (Math.random() - 0.5) * spreadY;
      nearPositions[i3 + 2] = nearZMin + Math.random() * (nearZMax - nearZMin);
      nearSizes[i] = 1.5 + Math.random() * 2.5;
      const color = new THREE.Color(nearColors[Math.floor(Math.random() * nearColors.length)]);
      nearColorArray[i3] = color.r;
      nearColorArray[i3 + 1] = color.g;
      nearColorArray[i3 + 2] = color.b;
    }

    nearGeometry.setAttribute("position", new THREE.BufferAttribute(nearPositions, 3));
    nearGeometry.setAttribute("size", new THREE.BufferAttribute(nearSizes, 1));
    nearGeometry.setAttribute("color", new THREE.BufferAttribute(nearColorArray, 3));

    const nearMaterial = this.createStarMaterial();
    const nearPoints = new THREE.Points(nearGeometry, nearMaterial);
    const nearGroup = new THREE.Group();
    nearGroup.add(nearPoints);
    this.scene.add(nearGroup);

    this.layers.push({
      group: nearGroup,
      zMin: nearZMin,
      zMax: nearZMax,
      parallaxFactor: 0.1,
    });
  }

  private createStarMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
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
          gl_PointSize = size * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;

        void main() {
          // Create soft circular point
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;

          // Soft glow falloff
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
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

    // Update shader uniforms
    this.layers.forEach((layer) => {
      const points = layer.group.children[0] as THREE.Points;
      const material = points.material as THREE.ShaderMaterial;
      material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
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

    // Update parallax
    const parallaxOffset = this.parallax.update();

    // Apply parallax to each layer
    this.layers.forEach((layer) => {
      if (!this.reducedMotion) {
        layer.group.position.x = parallaxOffset.x * layer.parallaxFactor * 100;
        layer.group.position.y = parallaxOffset.y * layer.parallaxFactor * 100;
      }
    });

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  public start(): void {
    if (this.animationId === null) {
      this.lastTime = performance.now();
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

    // Dispose of Three.js resources
    this.layers.forEach((layer) => {
      layer.group.children.forEach((child) => {
        if (child instanceof THREE.Points) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.scene.remove(layer.group);
    });

    this.renderer.dispose();
  }
}

// ============================================
// Function exports required by CLAUDE.md spec
// ============================================

let starfieldInstance: Starfield | null = null;

/**
 * Initialize the starfield with a canvas element
 */
export function initStarfield(canvas: HTMLCanvasElement): void {
  if (starfieldInstance) {
    starfieldInstance.destroy();
  }
  starfieldInstance = new Starfield(canvas);
  starfieldInstance.start();
}

/**
 * Update parallax based on normalized mouse position (-1 to 1)
 */
export function updateParallax(_normalizedX: number, _normalizedY: number): void {
  // The Starfield class handles parallax internally via ParallaxController
  // This function is provided for API compatibility
  // The actual mouse tracking is handled by the ParallaxController
}

/**
 * Cleanup and dispose of all resources
 */
export function cleanup(): void {
  if (starfieldInstance) {
    starfieldInstance.destroy();
    starfieldInstance = null;
  }
}
