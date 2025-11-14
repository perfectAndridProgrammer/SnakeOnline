import type { Snake } from "@/lib/stores/useSnakeGame";
import { distance2D } from "@/lib/stores/useSnakeGame";

/**
 * DebugManager - Handles debug logging and game state monitoring
 * 
 * Responsibilities:
 * - Output detailed game state to console when debug mode is enabled
 * - Rate-limit logging to prevent console spam (once per second)
 * - Display useful debugging information (screen, map, player, camera, FPS)
 * 
 * Debug mode is toggled by pressing the 'D' key
 */
export class DebugManager {
  // Counter that increments every frame (at 60 FPS)
  // Used to rate-limit debug output to once per second
  private frameCounter = 0;

  /**
   * Logs comprehensive game state information to the console
   * Called every frame, but only outputs when debug mode is on and 60 frames have passed
   * 
   * @param debugMode - Whether debug mode is currently enabled
   * @param state - The game state from the Zustand store
   * @param playerSnake - The player's snake object
   * @param gameContainer - The camera/container transform data
   * @param fps - Current frames per second
   * @param deltaTime - Time elapsed since last frame (in frame units, not seconds)
   */
  log(
    debugMode: boolean,
    state: any,
    playerSnake: Snake,
    gameContainer: { pivot: { x: number; y: number }; scale: { x: number } },
    fps: number,
    deltaTime: number
  ) {
    // Increment frame counter on every call (every frame)
    this.frameCounter++;
    
    // Only log when:
    // 1. Debug mode is enabled (user pressed 'D')
    // 2. 60 frames have passed (at 60 FPS this is once per second)
    // Using modulo (%) to check if frameCounter is divisible by 60
    if (this.frameCounter % 60 === 0 && debugMode) {
      // Start a collapsible console group for organized output
      console.group("🎮 Game Debug Info");
      
      // 📱 SCREEN INFO - Display dimensions and aspect ratio
      console.log("📱 Screen:", {
        width: window.innerWidth,           // Browser window width in pixels
        height: window.innerHeight,         // Browser window height in pixels
        ratio: (window.innerWidth / window.innerHeight).toFixed(2)  // Aspect ratio (e.g., 1.78 for 16:9)
      });
      
      // 🗺️ MAP INFO - Show game world boundaries
      console.log("🗺️ Map:", {
        size: state.mapSize,                // Total map size (e.g., 200 units)
        bounds: `${-state.mapSize/2} to ${state.mapSize/2}`  // World coordinates range (e.g., -100 to 100)
      });
      
      // 🐍 PLAYER SNAKE INFO - Current state of the player
      console.log("🐍 Player Snake:", {
        position: playerSnake.segments[0].position,  // Head position in world coordinates
        length: playerSnake.length,                  // Total length of snake
        score: playerSnake.score,                    // Current score (pellets eaten)
        segments: playerSnake.segments.length,       // Number of visible segments
        speed: playerSnake.speed,                    // Base movement speed
        isBoosting: playerSnake.isBoosting           // Whether spacebar is held (boost active)
      });
      
      // 🖱️ MOUSE INFO - Cursor position and distance from snake
      console.log("🖱️ Mouse:", {
        worldPosition: state.mouseWorldPosition,     // Mouse position in world coordinates
        distance: distance2D(                        // Distance from snake head to mouse cursor
          playerSnake.segments[0].position,
          state.mouseWorldPosition
        ).toFixed(2)                                 // Rounded to 2 decimal places
      });
      
      // 📷 CAMERA INFO - Current camera transform
      console.log("📷 Camera:", {
        pivot: gameContainer.pivot,                  // What world coordinates camera is looking at
        scale: gameContainer.scale.x.toFixed(3),     // Current zoom level (rounded to 3 decimals)
      });
      
      // 🎯 GAME STATE INFO - Overall game statistics
      console.log("🎯 Game State:", {
        pellets: state.pellets.length,               // Number of pellets on the map
        aiSnakes: state.aiSnakes.length,             // Number of AI opponents
        fps: fps.toFixed(1),                         // Current frames per second
        deltaTime: deltaTime.toFixed(3)              // Frame delta (should be ~1.0 at 60 FPS)
      });
      
      // End the collapsible console group
      console.groupEnd();
    }
  }
}
