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
  geometry: THREE.BufferGeometry;
  zMin: number;
  zMax: number;
  parallaxFactor: number;
}

interface CelestialBody {
  mesh: THREE.Mesh | THREE.Sprite;
  type: "planet" | "galaxy";
  speed: number;
}

// Planet color palette (earthy, rocky, gaseous)
const PLANET_COLORS = [
  0x4a6741, // Forest green
  0x6b4423, // Rusty brown
  0x3d5a80, // Ocean blue
  0x8b4513, // Sienna
  0x2f4f4f, // Dark slate
  0x704214, // Mars red-brown
  0x1e3a5f, // Deep blue (gas giant)
];

// Camera position - set back from origin to see stars in front
const CAMERA_Z = 100;

// Forward motion constants (subtle drift - ~30+ seconds to traverse)
const FORWARD_SPEED = 0.5;
const STAR_RECYCLE_Z = CAMERA_Z + 50; // Stars recycle when they pass behind camera
const CELESTIAL_SPAWN_Z = -1500;
const CELESTIAL_RECYCLE_Z = CAMERA_Z + 100;

export class Starfield {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;
  private animationId: number | null = null;
  private layers: StarLayer[] = [];
  private celestialBodies: CelestialBody[] = [];
  private parallax: ParallaxController;
  private reducedMotion: boolean;
  private lastTime = 0;
  private targetFps = 60;
  private frameInterval = 1000 / 60;

  // Camera rotation targets for smooth steering
  private targetRotationX = 0;
  private targetRotationY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.reducedMotion =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Initialize Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0f);

    // Camera setup - positioned back to see stars in front
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      3000 // Extended far plane to see distant stars
    );
    this.camera.position.z = CAMERA_Z;

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

    // Create planets and galaxies
    this.createCelestialBodies();

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
      geometry: farGeometry,
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
      geometry: midGeometry,
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
      geometry: nearGeometry,
      zMin: nearZMin,
      zMax: nearZMax,
      parallaxFactor: 0.1,
    });
  }

  /**
   * Create procedural planets and galaxies
   */
  private createCelestialBodies(): void {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const planetCount = isMobile ? 3 : 5;
    const galaxyCount = isMobile ? 1 : 2;

    // Create planets - scattered at different depths
    for (let i = 0; i < planetCount; i++) {
      const planet = this.createPlanet();
      planet.position.set(
        (Math.random() - 0.5) * 800,
        (Math.random() - 0.5) * 400,
        CELESTIAL_SPAWN_Z + Math.random() * 1500
      );
      this.scene.add(planet);
      this.celestialBodies.push({
        mesh: planet,
        type: "planet",
        speed: 0.6 + Math.random() * 0.3, // Slightly slower than stars
      });
    }

    // Create galaxies - farther away, larger
    for (let i = 0; i < galaxyCount; i++) {
      const galaxy = this.createGalaxy();
      galaxy.position.set(
        (Math.random() - 0.5) * 1000,
        (Math.random() - 0.5) * 500,
        CELESTIAL_SPAWN_Z - 500 + Math.random() * 1000
      );
      this.scene.add(galaxy);
      this.celestialBodies.push({
        mesh: galaxy,
        type: "galaxy",
        speed: 0.4 + Math.random() * 0.2, // Even slower for scale
      });
    }
  }

  /**
   * Create a procedural planet sphere
   */
  private createPlanet(): THREE.Mesh {
    const size = 3 + Math.random() * 8;
    const color = PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)];

    const geometry = new THREE.SphereGeometry(size, 24, 24);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.4 + Math.random() * 0.3,
    });

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Create a galaxy sprite (flat elliptical glow)
   */
  private createGalaxy(): THREE.Sprite {
    // Create a simple gradient texture for galaxy
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d")!;

    // Radial gradient for soft glow
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(150, 150, 255, 0.8)");
    gradient.addColorStop(0.3, "rgba(100, 100, 200, 0.4)");
    gradient.addColorStop(1, "rgba(50, 50, 150, 0)");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(60 + Math.random() * 40, 30 + Math.random() * 20, 1);

    return sprite;
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

    // Update parallax input
    const parallaxOffset = this.parallax.update();

    if (!this.reducedMotion) {
      // INVERSE POV STEERING: Mouse right = look left, mouse up = look down
      // This creates the flight sim / No Man's Sky cockpit feel
      this.targetRotationY = -parallaxOffset.x * 0.3; // Yaw (horizontal)
      this.targetRotationX = parallaxOffset.y * 0.2; // Pitch (vertical)

      // Smooth camera rotation interpolation
      this.camera.rotation.y += (this.targetRotationY - this.camera.rotation.y) * 0.05;
      this.camera.rotation.x += (this.targetRotationX - this.camera.rotation.x) * 0.05;

      // FORWARD MOTION: Move stars toward camera
      this.updateForwardMotion();
    }

    // Render
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Update star positions for forward motion and recycle when passed
   */
  private updateForwardMotion(): void {
    const spreadX = 2000;
    const spreadY = 2000;

    // Update each star layer
    this.layers.forEach((layer) => {
      const positions = layer.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;

      // Speed varies by layer depth (near moves faster)
      const layerSpeed = FORWARD_SPEED * layer.parallaxFactor * 10;

      for (let i = 0; i < count; i++) {
        const i3 = i * 3;

        // Move star toward camera (increase z)
        positions[i3 + 2] += layerSpeed;

        // Recycle star if it passed camera
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

      // Recycle if passed camera
      if (body.mesh.position.z > CELESTIAL_RECYCLE_Z) {
        body.mesh.position.z = CELESTIAL_SPAWN_Z + Math.random() * 500;
        body.mesh.position.x = (Math.random() - 0.5) * 800;
        body.mesh.position.y = (Math.random() - 0.5) * 400;
      }
    });
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

    // Dispose of Three.js resources - star layers
    this.layers.forEach((layer) => {
      layer.group.children.forEach((child) => {
        if (child instanceof THREE.Points) {
          child.geometry.dispose();
          (child.material as THREE.Material).dispose();
        }
      });
      this.scene.remove(layer.group);
    });

    // Dispose of celestial bodies
    this.celestialBodies.forEach((body) => {
      if (body.mesh instanceof THREE.Mesh) {
        body.mesh.geometry.dispose();
        (body.mesh.material as THREE.Material).dispose();
      } else if (body.mesh instanceof THREE.Sprite) {
        (body.mesh.material as THREE.SpriteMaterial).map?.dispose();
        body.mesh.material.dispose();
      }
      this.scene.remove(body.mesh);
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
