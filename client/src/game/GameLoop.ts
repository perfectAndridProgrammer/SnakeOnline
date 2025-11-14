/**
 * GameLoop - Orchestrates the main game loop and coordinates all game systems
 * 
 * Responsibilities:
 * - Run the game loop at 60 FPS using Pixi's ticker
 * - Update player and AI snake movement each frame
 * - Check collisions (pellets and snakes)
 * - Respawn collected pellets at random positions
 * - Update camera to follow player
 * - Trigger rendering of all game objects
 * - Output debug information when enabled
 * 
 * Game loop flow each frame (~60 times per second):
 * 1. Calculate frame delta multiplier for frame-rate independence
 * 2. Check boost input (spacebar)
 * 3. Update player snake movement toward mouse
 * 4. Check player pellet collisions
 * 5. Respawn pellets collected by player
 * 6. Check snake collisions (game over if player hits another snake)
 * 7. Save updated player snake to store
 * 8. Update all AI snakes (movement + pellet collision checks)
 * 9. Respawn pellets collected by AI
 * 10. Save updated AI snakes to store
 * 11. Update camera (follow player, adjust zoom)
 * 12. Render everything (ground → pellets → snakes)
 * 13. Debug logging (if enabled)
 */

import * as PIXI from "pixi.js";
import { useSnakeGame } from "@/lib/stores/useSnakeGame";
import { InputManager } from "./InputManager";
import { Camera } from "./Camera";
import { DebugManager } from "./DebugManager";
import { updateSnakeMovement, updateAISnake } from "./SnakeMovement";
import { checkPelletCollisions, checkSnakeCollisions } from "./CollisionDetection";
import { drawGround, drawPellets, drawSnakes, getRandomColor } from "./Renderer";

export class GameLoop {
  // Reference to input manager (tracks keyboard/mouse state)
  private inputManager: InputManager;
  
  // Reference to camera (follows player and zooms)
  private camera: Camera;
  
  // Reference to debug manager (console logging)
  private debugManager: DebugManager;
  
  // Reference to our ticker callback function
  // Stored so we can remove it cleanly during cleanup
  private tickerCallback: ((ticker: PIXI.Ticker) => void) | null = null;

  /**
   * Creates a new GameLoop instance
   * @param inputManager - Handles keyboard and mouse input
   * @param camera - Manages camera follow and zoom
   * @param debugManager - Handles debug logging
   */
  constructor(
    inputManager: InputManager,
    camera: Camera,
    debugManager: DebugManager
  ) {
    this.inputManager = inputManager;
    this.camera = camera;
    this.debugManager = debugManager;
  }

  /**
   * Starts the game loop - called once when the game begins
   * 
   * The game loop runs ~60 times per second (60 FPS) and handles:
   * - Physics updates (movement)
   * - Collision detection
   * - Game logic (pellet spawning, game over)
   * - Rendering (drawing everything)
   * 
   * @param app - The Pixi application (provides ticker for game loop)
   * @param gameContainer - Container holding all game objects (used for camera transform)
   * @param groundGraphics - Graphics object for drawing the background grid
   * @param snakeGraphics - Graphics object for drawing all snakes
   * @param pelletGraphics - Graphics object for drawing all pellets
   */
  start(
    app: PIXI.Application,
    gameContainer: PIXI.Container,
    groundGraphics: PIXI.Graphics,
    snakeGraphics: PIXI.Graphics,
    pelletGraphics: PIXI.Graphics
  ) {
    // Define the game loop callback function
    // This will be called ~60 times per second by Pixi's ticker
    this.tickerCallback = (ticker) => {
      // ===== STEP 1: Calculate frame delta multiplier =====
      // ticker.deltaTime is Pixi's frame multiplier (1.0 at target 60 FPS, 2.0 at 30 FPS)
      // Divide by 60 to get a time multiplier for frame-rate independence
      // Example: at 60 FPS, deltaTime=1.0, so delta=0.0167 (roughly 1/60th)
      // This approximates seconds but is actually a frame-based multiplier
      const delta = ticker.deltaTime / 60;
      
      // Get current game state from Zustand store
      const state = useSnakeGame.getState();
      
      // Safety check - exit early if no player snake exists
      if (!state.playerSnake) return;

      // ===== STEP 2: Check boost input =====
      // Check if spacebar is currently held down
      const isBoosting = this.inputManager.isKeyPressed("Space");
      
      // If boost state changed, update it in the store
      // This updates the UI and enables boost mechanics
      if (isBoosting !== state.playerSnake.isBoosting) {
        state.setPlayerBoosting(isBoosting);
      }

      // ===== STEP 3: Update player snake movement =====
      // Calculate new position based on:
      // - Current position
      // - Mouse position (direction to move)
      // - Delta time (for frame-rate independence)
      // - Boost state (doubles speed)
      const updatedPlayer = updateSnakeMovement(
        state.playerSnake,
        state.mouseWorldPosition,
        delta,
        isBoosting,
        state.pellets,
        state.mapSize
      );

      // ===== STEP 4: Check player pellet collisions =====
      // See if player's head touched any pellets
      // Returns updated snake (with increased length/score) and list of collected pellet IDs
      const { snake: newPlayerSnake, collectedPellets } = checkPelletCollisions(
        updatedPlayer,
        state.pellets
      );

      // ===== STEP 5: Respawn collected pellets =====
      // For each pellet the player collected, remove it and spawn a new one
      collectedPellets.forEach((pelletId) => {
        // Remove the collected pellet from the game
        state.removePellet(pelletId);
        
        // Add a new pellet at a random position
        state.addPellet({
          // Generate unique ID using timestamp + random number
          id: `pellet-${Date.now()}-${Math.random()}`,
          
          // Random position within map boundaries
          // Math.random() returns 0-1, subtract 0.5 to get -0.5 to 0.5
          // Multiply by mapSize to get full map range
          position: {
            x: (Math.random() - 0.5) * state.mapSize,
            y: (Math.random() - 0.5) * state.mapSize,
          },
          
          // Random color from predefined palette
          color: getRandomColor(),
          
          // Standard pellet size (0.3 units radius)
          size: 0.3,
        });
      });

      // ===== STEP 6: Check snake collisions (game over check) =====
      // See if player's head hit any AI snakes or its own tail
      const playerHitSnake = checkSnakeCollisions(newPlayerSnake, state.aiSnakes);
      if (playerHitSnake) {
        // Player died! End the game and stop processing this frame
        state.endGame();
        return;
      }

      // ===== STEP 7: Save updated player snake to store =====
      state.updatePlayerSnake(newPlayerSnake);

      // ===== STEP 8: Update all AI snakes =====
      // Array to track pellets collected by AI snakes
      const aiCollectedPellets: string[] = [];
      
      // Update each AI snake: movement → collision check → return updated snake
      const updatedAI = state.aiSnakes.map((aiSnake) => {
        // Move AI snake toward nearest pellet or wander randomly
        const updated = updateAISnake(
          aiSnake,
          delta,
          state.pellets,
          state.mapSize,
          newPlayerSnake,
          state.aiSnakes
        );
        
        // Check if AI snake collected any pellets
        const { snake: finalSnake, collectedPellets: aiPellets } =
          checkPelletCollisions(updated, state.pellets);
        
        // Add AI's collected pellets to our tracking array
        aiCollectedPellets.push(...aiPellets);
        
        // Return the updated AI snake
        return finalSnake;
      });

      // ===== STEP 9: Respawn pellets collected by AI =====
      // Same process as player pellet respawning
      aiCollectedPellets.forEach((pelletId) => {
        state.removePellet(pelletId);
        state.addPellet({
          id: `pellet-${Date.now()}-${Math.random()}`,
          position: {
            x: (Math.random() - 0.5) * state.mapSize,
            y: (Math.random() - 0.5) * state.mapSize,
          },
          color: getRandomColor(),
          size: 0.3,
        });
      });

      // ===== STEP 10: Save updated AI snakes to store =====
      state.updateAISnakes(updatedAI);

      // ===== STEP 11: Update camera =====
      // Move camera to follow player and adjust zoom based on snake length
      this.camera.update(
        gameContainer,
        newPlayerSnake,
        app.screen.width,
        app.screen.height
      );

      // ===== STEP 12: Render everything =====
      // Draw all game objects to the screen
      // These functions clear and redraw the graphics objects each frame
      drawGround(groundGraphics, state.mapSize);      // Background grid
      drawPellets(pelletGraphics, state.pellets);     // All pellets
      drawSnakes(snakeGraphics, newPlayerSnake, updatedAI);  // All snakes

      // ===== STEP 13: Debug logging =====
      // Output debug info to console if debug mode is enabled (D key)
      // This logs once per second (rate-limited inside DebugManager)
      // Done after rendering so FPS numbers reflect actual render time
      this.debugManager.log(
        this.inputManager.isDebugMode(),
        state,
        newPlayerSnake,
        gameContainer,
        app.ticker.FPS,
        ticker.deltaTime
      );
    };
    
    // Register our callback with Pixi's ticker
    // This makes our function run ~60 times per second
    app.ticker.add(this.tickerCallback);
  }

  /**
   * Stops the game loop - called during cleanup when unmounting
   * Removes the ticker callback to prevent memory leaks
   * 
   * @param app - The Pixi application
   */
  stop(app: PIXI.Application) {
    // If we have a ticker callback registered
    if (this.tickerCallback) {
      // Remove it from the ticker to stop the game loop
      app.ticker.remove(this.tickerCallback);
      
      // Clear our reference to prevent it from being called again
      this.tickerCallback = null;
    }
  }
}
