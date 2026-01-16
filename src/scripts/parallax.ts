/**
 * Parallax Controller
 * Handles mouse tracking on desktop, device orientation on mobile,
 * and auto-drift fallback when neither is available.
 */

interface ParallaxOffset {
  x: number;
  y: number;
}

export class ParallaxController {
  private targetX = 0;
  private targetY = 0;
  private currentX = 0;
  private currentY = 0;
  private reducedMotion: boolean;
  private isMobile: boolean;
  private hasOrientation: boolean;
  private orientationPermissionGranted = false;
  private autoDriftTime = 0;
  private useAutoDrift = false;

  // Bound event handlers for cleanup
  private handleMouseMove: (_e: MouseEvent) => void;
  private handleDeviceOrientation: (_e: DeviceOrientationEvent) => void;

  constructor(reducedMotion = false) {
    this.reducedMotion = reducedMotion;
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    this.hasOrientation = "DeviceOrientationEvent" in window;

    // Bind handlers
    this.handleMouseMove = this.onMouseMove.bind(this);
    this.handleDeviceOrientation = this.onDeviceOrientation.bind(this);

    // Setup appropriate input method
    if (!this.reducedMotion) {
      this.setupInput();
    }
  }

  /**
   * Check if this device requires a user gesture for orientation permission (iOS 13+)
   */
  public static needsPermissionPrompt(): boolean {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!isMobile) return false;

    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };
    return typeof DOE.requestPermission === "function";
  }

  private async setupInput(): Promise<void> {
    if (this.isMobile && this.hasOrientation) {
      // Check if iOS needs permission prompt (requires user gesture)
      if (ParallaxController.needsPermissionPrompt()) {
        // iOS 13+ - defer to user gesture, use auto-drift for now
        this.useAutoDrift = true;
      } else {
        // Android or older iOS - try direct orientation
        await this.tryDirectOrientation();
      }
    } else if (!this.isMobile) {
      // Use mouse tracking on desktop
      window.addEventListener("mousemove", this.handleMouseMove);
    }

    // If on mobile and orientation not working, ensure auto-drift is on
    if (this.isMobile && !this.orientationPermissionGranted) {
      this.useAutoDrift = true;
    }
  }

  /**
   * Try to add orientation listener directly (for Android/older iOS)
   */
  private async tryDirectOrientation(): Promise<void> {
    window.addEventListener("deviceorientation", this.handleDeviceOrientation);
    // Set a timeout to check if we're receiving events
    setTimeout(() => {
      if (!this.orientationPermissionGranted) {
        window.removeEventListener("deviceorientation", this.handleDeviceOrientation);
        this.useAutoDrift = true;
      }
    }, 1000);
  }

  /**
   * Enable device orientation after user grants permission (call from click handler)
   * Returns true if orientation is now enabled
   */
  public async enableOrientation(): Promise<boolean> {
    if (!this.isMobile || !this.hasOrientation) {
      return false;
    }

    const DOE = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<string>;
    };

    if (typeof DOE.requestPermission === "function") {
      try {
        const permission = await DOE.requestPermission();
        if (permission === "granted") {
          this.orientationPermissionGranted = true;
          this.useAutoDrift = false;
          window.addEventListener("deviceorientation", this.handleDeviceOrientation);
          return true;
        }
      } catch {
        return false;
      }
    } else {
      // Non-iOS, try direct
      window.addEventListener("deviceorientation", this.handleDeviceOrientation);
      this.useAutoDrift = false;
      return true;
    }

    return false;
  }

  private onMouseMove(e: MouseEvent): void {
    // Normalize mouse position to -1 to 1 range
    this.targetX = (e.clientX / window.innerWidth) * 2 - 1;
    this.targetY = (e.clientY / window.innerHeight) * 2 - 1;
  }

  private onDeviceOrientation(e: DeviceOrientationEvent): void {
    if (e.gamma !== null && e.beta !== null) {
      this.orientationPermissionGranted = true;

      // gamma is left-right tilt (-90 to 90)
      // beta is front-back tilt (-180 to 180)
      // Normalize to -1 to 1 range (using ±45 degrees as full range)
      this.targetX = Math.max(-1, Math.min(1, e.gamma / 45));
      this.targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 45)); // Offset beta for typical phone holding position
    }
  }

  private updateAutoDrift(deltaTime: number): void {
    // Gentle figure-8 drift pattern
    this.autoDriftTime += deltaTime * 0.0003; // Slow movement
    this.targetX = Math.sin(this.autoDriftTime) * 0.3;
    this.targetY = Math.sin(this.autoDriftTime * 0.7) * 0.2;
  }

  public update(): ParallaxOffset {
    if (this.reducedMotion) {
      return { x: 0, y: 0 };
    }

    // Update auto-drift if needed
    if (this.useAutoDrift) {
      this.updateAutoDrift(16.67); // Approximate frame time
    }

    // Smooth lerp - lower values = smoother/slower interpolation
    const lerpFactor = 0.05;

    this.currentX += (this.targetX - this.currentX) * lerpFactor;
    this.currentY += (this.targetY - this.currentY) * lerpFactor;

    return {
      x: this.currentX,
      y: this.currentY,
    };
  }

  public destroy(): void {
    window.removeEventListener("mousemove", this.handleMouseMove);
    window.removeEventListener("deviceorientation", this.handleDeviceOrientation);
  }
}

/**
 * Initialize orientation permission request on user interaction
 * Call this from a click handler if needed for iOS
 */
export async function requestOrientationPermission(): Promise<boolean> {
  // DeviceOrientationEvent.requestPermission is iOS-specific and not in TypeScript types
  const DOE = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<string>;
  };

  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DOE.requestPermission === "function"
  ) {
    try {
      const permission = await DOE.requestPermission();
      return permission === "granted";
    } catch {
      return false;
    }
  }
  return true; // Non-iOS, assume available
}
