/**
 * Starfield - Three.js procedural deep space background
 * Dense immersive starfield with realistic colors, galaxies, and twinkling
 * Inspired by Andromeda galaxy imagery
 */

import * as THREE from "three";
import { ParallaxController } from "./parallax";

// ===========================================================
// REALISTIC STAR COLORS - Based on stellar classification
// ===========================================================
const STAR_COLORS = {
  // Class O/B - Hot blue stars (15%)
  blueWhite: [0xa0c4ff, 0xbdd7ff, 0xcce4ff],
  // Class A/F - White stars (60%)
  white: [0xffffff, 0xfff8f0, 0xf8f8ff, 0xfaf0e6],
  // Class G/K - Yellow/Orange stars (20%)
  orange: [0xffd700, 0xffa500, 0xff8c00, 0xffb347, 0xf4a460],
  // Class M - Red/deep orange stars (5%)
  red: [0xff6347, 0xff4500, 0xcd5c5c, 0xb22222],
};

// Nebula colors for atmosphere
const NEBULA_COLORS = {
  purple: 0x4a1a6b,
  blue: 0x1a3a6b,
  pink: 0x6b1a4a,
  teal: 0x1a6b5a,
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
  mesh: THREE.Mesh | THREE.Sprite;
  type: "planet" | "galaxy" | "nebula";
  speed: number;
  rotationSpeed?: number;
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
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Initialize parallax controller (always full animation)
    this.parallax = new ParallaxController(false);

    // Create all visual elements
    this.createLayers();
    this.createNebulae();
    this.createCelestialBodies();

    // Bind event handlers
    this.handleResize = this.handleResize.bind(this);
    this.animate = this.animate.bind(this);

    window.addEventListener("resize", this.handleResize);
    this.detectPerformance();
  }

  private detectPerformance(): void {
    const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile || isTouchDevice) {
      this.targetFps = 30;
      this.frameInterval = 1000 / 30;
    }
  }

  /**
   * Get a random star color based on realistic stellar distribution
   */
  private getRandomStarColor(): THREE.Color {
    const roll = Math.random();
    let colorArray: number[];

    if (roll < 0.6) {
      // 60% white stars (Class A/F)
      colorArray = STAR_COLORS.white;
    } else if (roll < 0.8) {
      // 20% orange/gold stars (Class G/K)
      colorArray = STAR_COLORS.orange;
    } else if (roll < 0.95) {
      // 15% blue-white stars (Class O/B)
      colorArray = STAR_COLORS.blueWhite;
    } else {
      // 5% red stars (Class M)
      colorArray = STAR_COLORS.red;
    }

    return new THREE.Color(colorArray[Math.floor(Math.random() * colorArray.length)]);
  }

  private createLayers(): void {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const multiplier = isMobile ? 0.4 : 1;

    const spreadX = 2500;
    const spreadY = 2500;

    // ===========================================================
    // FAR LAYER - Dense backdrop of distant stars (2% parallax)
    // ===========================================================
    const farCount = Math.floor(15000 * multiplier);
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

      // Varied sizes - most small, few brighter
      const sizeRoll = Math.random();
      if (sizeRoll > 0.98) {
        farSizes[i] = 1.5 + Math.random() * 1.0; // Rare bright stars
      } else if (sizeRoll > 0.9) {
        farSizes[i] = 0.8 + Math.random() * 0.7;
      } else {
        farSizes[i] = 0.2 + Math.random() * 0.5; // Majority are small
      }

      const color = this.getRandomStarColor();
      farColorArray[i3] = color.r;
      farColorArray[i3 + 1] = color.g;
      farColorArray[i3 + 2] = color.b;

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
    const midCount = Math.floor(6000 * multiplier);
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

      const sizeRoll = Math.random();
      if (sizeRoll > 0.95) {
        midSizes[i] = 2.0 + Math.random() * 1.5;
      } else if (sizeRoll > 0.8) {
        midSizes[i] = 1.2 + Math.random() * 0.8;
      } else {
        midSizes[i] = 0.5 + Math.random() * 0.7;
      }

      const color = this.getRandomStarColor();
      midColorArray[i3] = color.r;
      midColorArray[i3 + 1] = color.g;
      midColorArray[i3 + 2] = color.b;

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
    const nearCount = Math.floor(2500 * multiplier);
    const nearZMin = -150;
    const nearZMax = 20;

    const nearGeometry = new THREE.BufferGeometry();
    const nearPositions = new Float32Array(nearCount * 3);
    const nearSizes = new Float32Array(nearCount);
    const nearColorArray = new Float32Array(nearCount * 3);
    const nearTwinklePhase = new Float32Array(nearCount);

    for (let i = 0; i < nearCount; i++) {
      const i3 = i * 3;
      nearPositions[i3] = (Math.random() - 0.5) * spreadX;
      nearPositions[i3 + 1] = (Math.random() - 0.5) * spreadY;
      nearPositions[i3 + 2] = nearZMin + Math.random() * (nearZMax - nearZMin);

      const sizeRoll = Math.random();
      if (sizeRoll > 0.97) {
        nearSizes[i] = 4.0 + Math.random() * 3.0; // Brilliant stars
      } else if (sizeRoll > 0.85) {
        nearSizes[i] = 2.5 + Math.random() * 1.5;
      } else {
        nearSizes[i] = 1.0 + Math.random() * 1.5;
      }

      const color = this.getRandomStarColor();
      nearColorArray[i3] = color.r;
      nearColorArray[i3 + 1] = color.g;
      nearColorArray[i3 + 2] = color.b;

      nearTwinklePhase[i] = Math.random() * Math.PI * 2;
    }

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
   * Create subtle nebula patches for atmosphere
   */
  private createNebulae(): void {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const nebulaCount = isMobile ? 3 : 6;
    const colors = Object.values(NEBULA_COLORS);

    for (let i = 0; i < nebulaCount; i++) {
      const nebula = this.createNebulaSprite(colors[i % colors.length]);
      nebula.position.set(
        (Math.random() - 0.5) * 1500,
        (Math.random() - 0.5) * 800,
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
   * Create a nebula sprite with soft glow
   */
  private createNebulaSprite(color: number): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d")!;

    const c = new THREE.Color(color);
    const r = Math.floor(c.r * 255);
    const g = Math.floor(c.g * 255);
    const b = Math.floor(c.b * 255);

    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.15)`);
    gradient.addColorStop(0.4, `rgba(${r}, ${g}, ${b}, 0.08)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(200 + Math.random() * 300, 150 + Math.random() * 200, 1);

    return sprite;
  }

  /**
   * Create planets and spiral galaxies
   */
  private createCelestialBodies(): void {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const planetCount = isMobile ? 4 : 8;
    const galaxyCount = isMobile ? 2 : 4;

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

    // Create spiral galaxies
    for (let i = 0; i < galaxyCount; i++) {
      const galaxy = this.createSpiralGalaxy();
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
        rotationSpeed: 0.0005 + Math.random() * 0.0005,
      });
    }
  }

  /**
   * Create a procedural planet with glow
   */
  private createPlanet(): THREE.Mesh {
    const size = 4 + Math.random() * 12;
    const color = PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)];

    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.5 + Math.random() * 0.3,
    });

    return new THREE.Mesh(geometry, material);
  }

  /**
   * Create a spiral galaxy sprite with arms and glowing core
   */
  private createSpiralGalaxy(): THREE.Sprite {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d")!;

    const centerX = 128;
    const centerY = 128;

    // Background glow
    const bgGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 120);
    bgGradient.addColorStop(0, "rgba(255, 250, 240, 0.9)");
    bgGradient.addColorStop(0.1, "rgba(255, 220, 180, 0.7)");
    bgGradient.addColorStop(0.3, "rgba(180, 150, 220, 0.3)");
    bgGradient.addColorStop(0.6, "rgba(100, 120, 200, 0.1)");
    bgGradient.addColorStop(1, "rgba(50, 50, 150, 0)");

    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, 256, 256);

    // Draw spiral arms
    ctx.save();
    ctx.translate(centerX, centerY);

    const armCount = 2 + Math.floor(Math.random() * 2);
    for (let arm = 0; arm < armCount; arm++) {
      const startAngle = (arm * Math.PI * 2) / armCount;

      for (let i = 0; i < 200; i++) {
        const t = i / 200;
        const angle = startAngle + t * Math.PI * 3;
        const radius = t * 100;

        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius * 0.4; // Flatten for tilt effect

        const alpha = (1 - t) * 0.5;
        const size = (1 - t * 0.7) * 3;

        // Vary colors along arm
        const hue = 200 + Math.random() * 60;
        ctx.fillStyle = `hsla(${hue}, 60%, 80%, ${alpha})`;
        ctx.beginPath();
        ctx.arc(
          x + (Math.random() - 0.5) * 10,
          y + (Math.random() - 0.5) * 5,
          size,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }

    ctx.restore();

    // Bright core
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 25);
    coreGradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    coreGradient.addColorStop(0.3, "rgba(255, 240, 200, 0.8)");
    coreGradient.addColorStop(1, "rgba(255, 200, 150, 0)");

    ctx.fillStyle = coreGradient;
    ctx.fillRect(0, 0, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(material);
    const scale = 80 + Math.random() * 60;
    sprite.scale.set(scale, scale * 0.6, 1); // Elliptical

    return sprite;
  }

  /**
   * Create star material with twinkling shader
   */
  private createStarMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uTime: { value: 0 },
      },
      vertexShader: `
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
      `,
      fragmentShader: `
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

    // Render
    this.renderer.render(this.scene, this.camera);
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
