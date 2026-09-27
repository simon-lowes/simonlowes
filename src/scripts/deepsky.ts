/**
 * Deep-sky backdrop: the always-on layer behind the stars.
 *
 * A Milky Way band and a few nebula clouds, drawn with fractal noise in a
 * fragment shader. The noise is rendered into a small offscreen texture
 * (a few hundred pixels wide on phones) every few frames, then stretched over
 * the screen with a slow drift and a little parallax. Soft clouds survive the
 * upscale, so the cost is a fraction of a full-screen shader and it runs on
 * every quality tier.
 *
 * Palette: the site's cyan accent, a magenta counterpart and a violet bridge,
 * with a warm, dusty core to the galactic band. Cinematic rather than
 * astronomically accurate.
 */

import * as THREE from "three";

export interface DeepSkySettings {
  /** Width in pixels of the offscreen noise texture; height follows the aspect. */
  textureWidth: number;
  /** Fractal noise octaves (3 cheap, 6 detailed). */
  octaves: number;
  /** Re-render the noise texture every N frames. */
  updateInterval: number;
  /** Overall brightness multiplier. */
  intensity: number;
}

export const DEEP_SKY_PALETTE = {
  cyan: 0x00d4ff,
  magenta: 0xff3fb4,
  violet: 0x7c5cff,
  dust: 0xffe0c2,
};

const NOISE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const NOISE_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform float uAspect;
  uniform float uSeed;
  uniform int uOctaves;
  uniform vec3 uCyan;
  uniform vec3 uMagenta;
  uniform vec3 uViolet;
  uniform vec3 uDust;

  varying vec2 vUv;

  // --- 2D gradient noise -------------------------------------------------
  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p + uSeed) * 43758.5453123);
  }

  float gnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash2(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
          dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
      mix(dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
          dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x),
      u.y);
  }

  // Rotating each octave hides the grid; returns roughly -1..1
  const mat2 ROT = mat2(0.80, 0.60, -0.60, 0.80);
  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 8; i++) {
      if (i >= uOctaves) break;
      value += amplitude * gnoise(p);
      p = ROT * p * 2.02 + 17.3;
      amplitude *= 0.5;
    }
    return value;
  }

  // Ridged variant for filaments
  float ridged(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 8; i++) {
      if (i >= uOctaves) break;
      value += amplitude * (1.0 - abs(gnoise(p)));
      p = ROT * p * 2.1 + 31.7;
      amplitude *= 0.5;
    }
    return value;
  }

  // A soft nebula cloud centred on c with radius r, tinted col
  vec3 cloud(vec2 p, vec2 c, float r, vec3 col, float drift, float seed) {
    vec2 q = (p - c) / r;
    float falloff = exp(-dot(q, q) * 1.6);
    if (falloff < 0.002) return vec3(0.0);
    // Domain-warped fbm gives billowing, non-blobby edges
    vec2 warp = vec2(fbm(q * 1.7 + seed + drift), fbm(q * 1.7 - seed - drift));
    float n = fbm(q * 2.3 + warp * 0.9 + seed);
    float body = smoothstep(-0.25, 0.75, n);
    float veins = ridged(q * 3.5 + seed) * 0.35;
    float density = falloff * (body * 0.85 + veins * body);
    // Brighter core, saturated edges
    vec3 tint = mix(col, vec3(1.0), smoothstep(0.55, 1.0, falloff) * 0.35);
    return tint * density;
  }

  void main() {
    // Aspect-correct centred coordinates
    vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0);
    float t = uTime * 0.012;

    vec3 color = vec3(0.0);

    // --- Milky Way band: diagonal, dusty, threaded with cyan -------------
    float ang = -0.62;
    mat2 bandRot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
    vec2 bp = bandRot * (p - vec2(0.05, -0.02));
    float bandProfile = exp(-bp.y * bp.y * 14.0);
    float bandNoise = fbm(bp * vec2(1.6, 4.0) + vec2(t * 0.6, 0.0) + uSeed);
    float dust = smoothstep(0.05, 0.6, fbm(bp * vec2(3.5, 9.0) - vec2(t * 0.4, 0.0) + 9.1));
    float band = bandProfile * smoothstep(-0.55, 0.65, bandNoise) * (1.0 - dust * 0.75);
    vec3 bandColor = mix(uDust, uCyan, smoothstep(0.0, 0.2, abs(bp.y)) * 0.55);
    color += bandColor * band * 0.16;
    // Faint haze around the band so it does not look cut out
    color += mix(uViolet, uCyan, 0.5) * exp(-bp.y * bp.y * 3.0) * 0.02;

    // --- Nebula clouds ---------------------------------------------------
    color += cloud(p, vec2(-0.42, 0.22), 0.34, uCyan, t, 3.7) * 0.55;
    color += cloud(p, vec2(0.46, -0.16), 0.40, uMagenta, -t, 8.2) * 0.5;
    color += cloud(p, vec2(0.12, 0.34), 0.26, uViolet, t * 0.7, 14.9) * 0.42;
    color += cloud(p, vec2(-0.2, -0.36), 0.22, mix(uMagenta, uViolet, 0.5), -t * 0.8, 21.3) * 0.3;

    // --- Deep space ambient: barely-there gradient so black is not flat ---
    color += mix(vec3(0.010, 0.008, 0.024), vec3(0.004, 0.012, 0.020), vUv.y);

    gl_FragColor = vec4(color, 1.0);
  }
`;

const DISPLAY_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Screen-space quad on the far plane; depth test is off anyway
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const DISPLAY_FRAGMENT = /* glsl */ `
  precision highp float;

  uniform sampler2D uMap;
  uniform vec2 uOffset;
  uniform float uZoom;
  uniform float uIntensity;

  varying vec2 vUv;

  float dither(vec2 co) {
    return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  }

  void main() {
    // Zoom in slightly so the parallax offset never reveals an edge
    vec2 uv = (vUv - 0.5) / uZoom + 0.5 + uOffset;
    vec3 color = texture2D(uMap, uv).rgb * uIntensity;
    // Break up 8-bit banding in the dark gradients
    color += dither(gl_FragCoord.xy) / 255.0;
    gl_FragColor = vec4(max(color, 0.0), 1.0);
  }
`;

export class DeepSkyBackdrop {
  /** Screen-space quad to add to the main scene. Renders before everything else. */
  readonly mesh: THREE.Mesh;

  private target: THREE.WebGLRenderTarget;
  private readonly noiseScene = new THREE.Scene();
  private readonly noiseCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly noiseMaterial: THREE.ShaderMaterial;
  private readonly displayMaterial: THREE.ShaderMaterial;
  private settings: DeepSkySettings;
  private aspect: number;
  private frame = 0;
  private dirty = true;

  constructor(settings: DeepSkySettings, aspect: number, seed = Math.random() * 100) {
    this.settings = { ...settings };
    this.aspect = aspect;

    this.target = this.createTarget();

    this.noiseMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAspect: { value: aspect },
        uSeed: { value: seed },
        uOctaves: { value: settings.octaves },
        uCyan: { value: new THREE.Color(DEEP_SKY_PALETTE.cyan) },
        uMagenta: { value: new THREE.Color(DEEP_SKY_PALETTE.magenta) },
        uViolet: { value: new THREE.Color(DEEP_SKY_PALETTE.violet) },
        uDust: { value: new THREE.Color(DEEP_SKY_PALETTE.dust) },
      },
      vertexShader: NOISE_VERTEX,
      fragmentShader: NOISE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    const noiseQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.noiseMaterial);
    noiseQuad.frustumCulled = false;
    this.noiseScene.add(noiseQuad);

    this.displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.target.texture },
        uOffset: { value: new THREE.Vector2(0, 0) },
        uZoom: { value: 1.08 },
        uIntensity: { value: settings.intensity },
      },
      vertexShader: DISPLAY_VERTEX,
      fragmentShader: DISPLAY_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.displayMaterial);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1000;
  }

  private createTarget(): THREE.WebGLRenderTarget {
    const width = Math.max(64, Math.round(this.settings.textureWidth));
    const height = Math.max(64, Math.round(width / this.aspect));
    return new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
    });
  }

  private replaceTarget(): void {
    this.target.dispose();
    this.target = this.createTarget();
    this.displayMaterial.uniforms.uMap!.value = this.target.texture;
    this.dirty = true;
  }

  /** Apply new tier settings (resolution, detail, cadence). */
  applySettings(settings: DeepSkySettings): void {
    const resize = settings.textureWidth !== this.settings.textureWidth;
    this.settings = { ...settings };
    this.noiseMaterial.uniforms.uOctaves!.value = settings.octaves;
    this.displayMaterial.uniforms.uIntensity!.value = settings.intensity;
    if (resize) this.replaceTarget();
    this.dirty = true;
  }

  /** Call on viewport resize. */
  setAspect(aspect: number): void {
    if (Math.abs(aspect - this.aspect) < 1e-3) return;
    this.aspect = aspect;
    this.noiseMaterial.uniforms.uAspect!.value = aspect;
    this.replaceTarget();
  }

  /**
   * Advance the backdrop. Re-renders the noise texture when due and sets the
   * parallax offset from the camera's look direction (radians).
   */
  update(
    renderer: THREE.WebGLRenderer,
    timeSeconds: number,
    yawRad: number,
    pitchRad: number
  ): void {
    const offset = this.displayMaterial.uniforms.uOffset!.value as THREE.Vector2;
    // The backdrop is the farthest layer, so it shifts least
    offset.set(-yawRad * 0.06, pitchRad * 0.06);

    this.frame++;
    if (!this.dirty && this.frame % this.settings.updateInterval !== 0) return;
    this.dirty = false;

    this.noiseMaterial.uniforms.uTime!.value = timeSeconds;
    const previousTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.target);
    renderer.render(this.noiseScene, this.noiseCamera);
    renderer.setRenderTarget(previousTarget);
  }

  dispose(): void {
    this.target.dispose();
    this.noiseMaterial.dispose();
    this.displayMaterial.dispose();
    this.mesh.geometry.dispose();
    this.noiseScene.children.forEach((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
  }
}
