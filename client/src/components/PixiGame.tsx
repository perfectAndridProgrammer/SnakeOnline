/**
 * PixiGame - Main React component for the Pixi.js 2D game
 * 
 * Responsibilities:
 * - Initialize Pixi.js application when game starts
 * - Create game container and graphics objects
 * - Instantiate and wire up all game systems (input, camera, loop, etc.)
 * - Handle cleanup when component unmounts or game phase changes
 * - Render the game canvas and UI overlay
 * 
 * Lifecycle:
 * 1. User clicks "Play" → phase changes to "playing"
 * 2. useEffect triggers → async initialization begins
 * 3. Pixi app is created and configured
 * 4. Canvas is added to DOM
 * 5. Game systems are created and started
 * 6. Game loop runs at 60 FPS
 * 7. User dies or leaves → phase changes
 * 8. Cleanup runs → stops game loop, removes listeners, destroys Pixi app
 */

import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useSnakeGame } from "@/lib/stores/useSnakeGame";
import GameUI from "./GameUI";
import { InputManager } from "@/game/InputManager";
import { Camera } from "@/game/Camera";
import { DebugManager } from "@/game/DebugManager";
import { GameLoop } from "@/game/GameLoop";

export default function PixiGame() {
  // Ref to the div that will contain the Pixi canvas
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Ref to store the Pixi application instance
  // Stored in ref so we can access it during cleanup
  const appRef = useRef<PIXI.Application | null>(null);
  
  // Subscribe to game phase from Zustand store
  // Phase can be: "ready" (menu), "playing" (active game), "ended" (game over)
  const phase = useSnakeGame((state) => state.phase);

  // useEffect runs when component mounts or when phase changes
  // This is where we initialize and cleanup the game
  useEffect(() => {
    // Only initialize if we have a canvas container AND phase is "playing"
    // Early return prevents initialization during menu or game over screens
    if (!canvasRef.current || phase !== "playing") return;

    // ===== LIFECYCLE TRACKING VARIABLES =====
    // These help us manage async initialization and cleanup properly
    
    // Function to cleanup input event listeners
    // Will be set when InputManager.attach() is called
    let cleanupInput: (() => void) | null = null;
    
    // Pixi application instance
    // Stored locally so cleanup can access it even if initialization isn't complete
    let app: PIXI.Application | null = null;
    
    // Game loop instance
    // Needed for cleanup to stop the ticker callback
    let gameLoop: GameLoop | null = null;
    
    // Flag to track if component is still mounted
    // Prevents late-resolving promises from affecting unmounted component
    let mounted = true;

    // ===== ASYNC GAME INITIALIZATION =====
    // This function sets up the entire game asynchronously
    const initializeGame = async () => {
      // STEP 1: Create Pixi application
      app = new PIXI.Application();
      
      // STEP 2: Initialize the application with configuration
      // await because init() is async (initializes WebGL context)
      await app.init({
        width: window.innerWidth,          // Full browser width
        height: window.innerHeight,        // Full browser height
        backgroundColor: 0x1a1a2e,         // Dark blue background (hex color)
        antialias: true,                   // Smooth edges on graphics
        resolution: window.devicePixelRatio || 1,  // High DPI support (retina displays)
        autoDensity: true,                 // Automatically handle canvas density for DPI
      });

      // STEP 3: Guard against late initialization
      // If component unmounted while we were awaiting init(), clean up and exit
      // This prevents adding canvas to DOM after component is gone
      if (!mounted || !canvasRef.current) {
        app.destroy(true, { children: true });
        return;
      }
      
      // STEP 4: Add Pixi canvas to the DOM
      // app.canvas is the actual <canvas> element that Pixi renders to
      canvasRef.current.appendChild(app.canvas);
      
      // Store app reference for cleanup
      appRef.current = app;

      // ===== SCENE GRAPH SETUP =====
      
      // STEP 5: Create game container
      // This container holds all game objects and can be transformed for camera effects
      // Transforming the container = camera movement/zoom
      const gameContainer = new PIXI.Container();
      app.stage.addChild(gameContainer);

      // STEP 6: Create graphics objects for rendering
      // Each Graphics object is like a "layer" we can draw on
      // Cleared and redrawn each frame (immediate mode rendering)
      const groundGraphics = new PIXI.Graphics();   // Background grid
      const snakeGraphics = new PIXI.Graphics();    // All snakes
      const pelletGraphics = new PIXI.Graphics();   // All pellets
      
      // STEP 7: Add graphics to container in render order (back to front)
      // Objects added first render behind objects added later
      gameContainer.addChild(groundGraphics);   // Ground renders first (back)
      gameContainer.addChild(pelletGraphics);   // Pellets on top of ground
      gameContainer.addChild(snakeGraphics);    // Snakes on top (front)

      // ===== GAME SYSTEMS INITIALIZATION =====
      
      // STEP 8: Create all game system instances
      const inputManager = new InputManager();     // Handles keyboard/mouse
      const camera = new Camera();                 // Handles camera follow/zoom
      const debugManager = new DebugManager();     // Handles debug console output
      gameLoop = new GameLoop(inputManager, camera, debugManager);  // Orchestrates everything

      // STEP 9: Attach input listeners
      // Returns cleanup function that we'll call during unmount
      cleanupInput = inputManager.attach(gameContainer);

      // STEP 10: Start the game loop
      // This begins the 60 FPS update cycle
      gameLoop.start(app, gameContainer, groundGraphics, snakeGraphics, pelletGraphics);
    };

    // Kick off the async initialization
    // We don't await here because we want cleanup to work regardless of initialization state
    initializeGame();

    // ===== CLEANUP FUNCTION =====
    // This runs when:
    // 1. Component unmounts (user navigates away)
    // 2. phase changes from "playing" to something else
    // 3. Component re-renders and dependencies change
    return () => {
      // Mark component as unmounted
      // Prevents late-resolving init promises from modifying DOM
      mounted = false;
      
      // CLEANUP STEP 1: Remove input event listeners
      // Prevents memory leaks and stale event handlers
      if (cleanupInput) {
        cleanupInput();
      }
      
      // CLEANUP STEP 2: Stop game loop and destroy Pixi app
      if (app && gameLoop) {
        // Stop the ticker callback (stops game loop)
        gameLoop.stop(app);
        
        // Remove canvas from DOM
        // Prevents multiple canvases from stacking up on re-mounts
        if (app.canvas && app.canvas.parentNode) {
          app.canvas.parentNode.removeChild(app.canvas);
        }
        
        // Destroy Pixi application and all its resources
        // true = remove canvas, { children: true } = destroy all child objects
        app.destroy(true, { children: true });
      }
      
      // Clear app reference
      appRef.current = null;
    };
  }, [phase]);  // Re-run effect when phase changes

  // ===== RENDER =====
  // Return the component JSX
  // This renders a container div with the game canvas and UI overlay
  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      {/* Container for Pixi canvas (will be populated by useEffect) */}
      <div ref={canvasRef} />
      
      {/* UI overlay (score, controls, etc.) - rendered on top of canvas */}
      <GameUI />
    </div>
  );
}
