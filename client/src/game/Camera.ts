import * as PIXI from "pixi.js";
import type { Snake } from "@/lib/stores/useSnakeGame";

/**
 * Camera - Manages the game camera (follow player and dynamic zoom)
 * 
 * Responsibilities:
 * - Smoothly follow the player's snake
 * - Dynamically zoom out as the snake grows longer
 * - Provide smooth transitions for better gameplay experience
 * 
 * How Pixi.js cameras work:
 * - There's no actual camera object in Pixi.js
 * - Instead, we transform the game container:
 *   • pivot: what point in the world the camera is looking at
 *   • position: where that pivot point appears on screen (usually center)
 *   • scale: zoom level (higher = more zoomed in)
 */
export class Camera {
  // Tracks whether the initial zoom animation has completed
  // Used to switch from slow initial zoom to faster follow zoom
  private initialZoomComplete = false;
  
  // Starting zoom level when game begins (nice close-up view of the snake)
  // Scale of 8.0 means objects appear 8x their actual size
  private readonly baseZoom = 8.0;
  
  // Minimum zoom level (prevents zooming out too far)
  // As snake grows, we zoom out but never go below this value
  private readonly minZoom = 4.0;
  
  // How much to reduce zoom per unit of snake length
  // Larger value = faster zoom-out as snake grows
  private readonly zoomScale = 0.015;
  
  // Smoothing factor for camera position (0-1)
  // Lower = smoother/slower, Higher = snappier/faster
  // 0.1 = camera moves 10% of the way to target each frame
  private readonly positionLerpFactor = 0.1;

  /**
   * Updates camera position and zoom each frame
   * 
   * @param gameContainer - The Pixi container holding all game objects (what we transform to simulate camera)
   * @param playerSnake - The player's snake (what the camera follows)
   * @param screenWidth - Current screen width in pixels
   * @param screenHeight - Current screen height in pixels
   */
  update(
    gameContainer: PIXI.Container,
    playerSnake: Snake,
    screenWidth: number,
    screenHeight: number
  ) {
    // Don't do anything if the snake has no segments
    if (playerSnake.segments.length === 0) return;

    // Get the position of the snake's head (what we want to follow)
    // segments[0] is always the head of the snake
    const head = playerSnake.segments[0].position;
    
    // Calculate the target zoom level based on snake length
    // As the snake grows (length increases), we zoom out (lower zoom value)
    // Formula: baseZoom - (length above 10) * zoomScale
    // Example: length=10 → zoom=8.0, length=50 → zoom=7.4, length=100 → zoom=6.65
    // Math.max ensures we never go below minZoom (4.0)
    const targetZoom = Math.max(
      this.minZoom,
      this.baseZoom - (playerSnake.length - 10) * this.zoomScale
    );
    
    // STEP 1: Smoothly move camera to follow the snake's head
    // Using linear interpolation (lerp) for smooth movement
    // New position = current + (target - current) * lerpFactor
    // This creates smooth acceleration/deceleration instead of instant jumps
    gameContainer.pivot.x += (head.x - gameContainer.pivot.x) * this.positionLerpFactor;
    gameContainer.pivot.y += (head.y - gameContainer.pivot.y) * this.positionLerpFactor;
    
    // STEP 2: Position the container so the pivot appears at screen center
    // This makes the snake (which is at pivot) appear in the middle of the screen
    gameContainer.position.set(screenWidth / 2, screenHeight / 2);
    
    // Calculate how far current zoom is from target zoom
    // Used to determine if initial zoom animation is complete
    const zoomDifference = Math.abs(targetZoom - gameContainer.scale.x);
    
    // Check if initial zoom-in has finished
    // Once we're within 0.1 of target, consider it complete
    // This allows us to switch from slow cinematic zoom to faster follow zoom
    if (!this.initialZoomComplete && zoomDifference < 0.1) {
      this.initialZoomComplete = true;
    }
    
    // STEP 3: Smoothly adjust zoom level
    // Use different lerp speeds for initial zoom vs. ongoing zoom
    // Initial zoom (0.001) = very slow, cinematic start
    // Follow zoom (0.05) = faster response to snake growth
    const zoomLerpFactor = this.initialZoomComplete ? 0.05 : 0.001;
    
    // Apply zoom with smooth interpolation (same lerp formula as position)
    // We set both x and y to maintain square aspect ratio (no stretching)
    gameContainer.scale.x += (targetZoom - gameContainer.scale.x) * zoomLerpFactor;
    gameContainer.scale.y += (targetZoom - gameContainer.scale.y) * zoomLerpFactor;
  }
}
