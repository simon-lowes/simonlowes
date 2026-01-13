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
   * Create an enhanced nebula with noise-based volumetric structure
   */
  private createNebulaSprite(color: number): THREE.Group {
    const nebulaGroup = new THREE.Group();
    const noise = new SimplexNoise(Math.random());

    // Create multiple layered sprites for depth
    const layerCount = 3;
    const baseSize = 300 + Math.random() * 200;

    for (let layer = 0; layer < layerCount; layer++) {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d")!;

      const c = new THREE.Color(color);
      // Vary hue slightly per layer
      const hueShift = (layer - 1) * 0.1;
      c.offsetHSL(hueShift, 0, 0);

      const r = Math.floor(c.r * 255);
      const g = Math.floor(c.g * 255);
      const b = Math.floor(c.b * 255);

      // Create noise-based nebula texture
      const imageData = ctx.createImageData(256, 256);
      const data = imageData.data;

      const centerX = 128;
      const centerY = 128;
      const maxRadius = 120;

      for (let y = 0; y < 256; y++) {
        for (let x = 0; x < 256; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Base radial falloff
          let alpha = Math.max(0, 1 - dist / maxRadius);

          // Add noise-based structure
          const noiseScale = 0.02 + layer * 0.01;
          const noiseVal = noise.fbm(x * noiseScale, y * noiseScale, 4);

          // Create filamentary structure
          alpha *= Math.pow((noiseVal + 1) / 2, 1.5);

          // Fade edges smoothly
          alpha *= Math.pow(alpha, 0.5);

          // Scale opacity
          const finalAlpha = Math.min(255, alpha * 60 * (1 - layer * 0.2));

          const idx = (y * 256 + x) * 4;
          data[idx] = r;
          data[idx + 1] = g;
          data[idx + 2] = b;
          data[idx + 3] = finalAlpha;
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
      const layerScale = baseSize * (1 + layer * 0.3);
      sprite.scale.set(layerScale, layerScale * 0.7, 1);

      // Offset layers slightly for depth
      sprite.position.z = (layer - 1) * 10;
      sprite.position.x = (Math.random() - 0.5) * 20;
      sprite.position.y = (Math.random() - 0.5) * 15;

      nebulaGroup.add(sprite);
    }

    return nebulaGroup;
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

    // Dispose of celestial bodies (now groups with multiple children)
    this.celestialBodies.forEach((body) => {
      this.disposeObject(body.mesh);
      this.scene.remove(body.mesh);
    });

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
   * Clean up renderer - called at end of destroy()
   */
  private disposeRenderer(): void {
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
