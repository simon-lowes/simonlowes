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

  private async setupInput(): Promise<void> {
    if (this.isMobile && this.hasOrientation) {
      // Try to use device orientation on mobile
      await this.requestOrientationPermission();
    } else if (!this.isMobile) {
      // Use mouse tracking on desktop
      window.addEventListener("mousemove", this.handleMouseMove);
    }

    // If neither mouse nor orientation, use auto-drift
    if (this.isMobile && !this.orientationPermissionGranted) {
      this.useAutoDrift = true;
    }
  }

  private async requestOrientationPermission(): Promise<void> {
    // iOS 13+ requires permission request
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
        if (permission === "granted") {
          this.orientationPermissionGranted = true;
          window.addEventListener("deviceorientation", this.handleDeviceOrientation);
        } else {
          this.useAutoDrift = true;
        }
      } catch {
        this.useAutoDrift = true;
      }
    } else {
      // Non-iOS or older iOS - try to add listener directly
      window.addEventListener("deviceorientation", this.handleDeviceOrientation);
      // Set a timeout to check if we're receiving events
      setTimeout(() => {
        if (!this.orientationPermissionGranted) {
          window.removeEventListener("deviceorientation", this.handleDeviceOrientation);
          this.useAutoDrift = true;
        }
      }, 1000);
    }
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
