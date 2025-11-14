import * as PIXI from "pixi.js";
import { useSnakeGame } from "@/lib/stores/useSnakeGame";

/**
 * InputManager - Handles all user input (keyboard and mouse)
 * 
 * Responsibilities:
 * - Track which keys are currently pressed
 * - Convert mouse screen coordinates to game world coordinates
 * - Toggle debug mode with the 'D' key
 * - Manage event listener lifecycle (attach/detach)
 */
export class InputManager {
  // Set of currently pressed key codes (e.g., "Space", "KeyW", "ArrowUp")
  // Using a Set for O(1) lookups when checking if a key is pressed
  private keysPressed = new Set<string>();
  
  // Flag to track whether debug mode is enabled (toggled with 'D' key)
  private debugMode = false;
  
  // Reference to the Pixi game container (needed for coordinate transformation)
  // Stored so mouse move handler can access current camera zoom and position
  private gameContainer: PIXI.Container | null = null;

  constructor() {
    // Bind event handlers to 'this' context so they can access class properties
    // This is necessary because event handlers are called by the browser with a different context
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }

  /**
   * Handles keyboard key press events
   * @param e - The keyboard event from the browser
   */
  private handleKeyDown(e: KeyboardEvent) {
    // Add the pressed key to our set for tracking
    // e.code gives us the physical key (e.g., "KeyW" for W key)
    this.keysPressed.add(e.code);
    
    // Special handling for the 'D' key - toggles debug mode
    if (e.code === "KeyD") {
      this.debugMode = !this.debugMode;
      console.log(`🔍 Debug mode: ${this.debugMode ? "ON" : "OFF"}`);
    }
  }
  
  /**
   * Handles keyboard key release events
   * @param e - The keyboard event from the browser
   */
  private handleKeyUp(e: KeyboardEvent) {
    // Remove the released key from our tracking set
    this.keysPressed.delete(e.code);
  }
  
  /**
   * Handles mouse movement and converts screen coordinates to world coordinates
   * 
   * Coordinate transformation explained:
   * 1. Screen coords: Mouse position in browser window (pixels from top-left)
   * 2. Centered screen coords: Relative to center of screen
   * 3. Zoomed coords: Account for camera zoom
   * 4. World coords: Final position in the game world
   * 
   * @param e - The mouse event from the browser
   */
  private handleMouseMove(e: MouseEvent) {
    // Early exit if game container isn't set up yet
    if (!this.gameContainer) return;
    
    // STEP 1: Convert browser coordinates to centered screen coordinates
    // e.clientX/Y are pixels from top-left of window (0,0 = top-left corner)
    // We subtract half the window size to make (0,0) = center of screen
    const screenX = e.clientX - window.innerWidth / 2;
    const screenY = e.clientY - window.innerHeight / 2;
    
    // STEP 2: Reverse the camera zoom transformation
    // gameContainer.scale.x is the zoom level (e.g., 8.0 = 8x zoom)
    // Dividing by scale converts from screen pixels back to world units
    const zoomedX = screenX / this.gameContainer.scale.x;
    const zoomedY = screenY / this.gameContainer.scale.y;
    
    // STEP 3: Add the camera's current position (pivot point)
    // gameContainer.pivot is what world coordinates the camera is centered on
    // Adding pivot gives us the final world coordinates
    const worldX = zoomedX + this.gameContainer.pivot.x;
    const worldY = zoomedY + this.gameContainer.pivot.y;
    
    // Update the game store with the new mouse world position
    // This is used by the snake to determine which direction to move
    useSnakeGame.getState().updateMousePosition(worldX, worldY);
  }

  /**
   * Attaches event listeners to the window and stores game container reference
   * 
   * @param gameContainer - The Pixi container holding all game objects (needed for coordinate transformation)
   * @returns Cleanup function that removes all event listeners
   */
  attach(gameContainer: PIXI.Container) {
    // Store container reference so mouse handler can access camera transform
    this.gameContainer = gameContainer;
    
    // Register our event handlers with the browser
    // These will be called whenever the user presses keys or moves the mouse
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mousemove", this.handleMouseMove);

    // Return a cleanup function that removes all listeners
    // This prevents memory leaks when the game component unmounts
    return () => {
      window.removeEventListener("keydown", this.handleKeyDown);
      window.removeEventListener("keyup", this.handleKeyUp);
      window.removeEventListener("mousemove", this.handleMouseMove);
    };
  }

  /**
   * Checks if a specific key is currently pressed
   * @param key - The key code to check (e.g., "Space", "KeyW")
   * @returns true if the key is currently held down, false otherwise
   */
  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key);
  }

  /**
   * Checks if debug mode is currently enabled
   * @returns true if debug mode is on, false otherwise
   */
  isDebugMode(): boolean {
    return this.debugMode;
  }
}
