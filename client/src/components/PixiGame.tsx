import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useSnakeGame, type Snake, type Pellet, distance2D, normalize2D, SEGMENT_RADIUS, SEGMENT_OVERLAP } from "@/lib/stores/useSnakeGame";
import GameUI from "./GameUI";

/**
 * PixiGame - Main game component using Pixi.js for 2D rendering
 * 
 * This replaces the Three.js implementation with a pure 2D rendering solution:
 * - Uses Pixi.js WebGL renderer (optimized for 2D graphics)
 * - Smaller bundle size (~500KB vs 1MB+ for Three.js)
 * - Better performance for 2D games
 * - Native 2D coordinates (x, y) instead of 3D (x, y, z)
 */
export default function PixiGame() {
  // References to DOM element and Pixi application
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const phase = useSnakeGame((state) => state.phase);

  useEffect(() => {
    // Only initialize when playing and DOM is ready
    if (!canvasRef.current || phase !== "playing") return;

    // ===== PIXI.JS APPLICATION SETUP =====
    // Pixi.Application manages the renderer, ticker, and stage
    const app = new PIXI.Application();
    
    app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a2e,  // Dark blue background (hex color)
      antialias: true,             // Smooth edges
      resolution: window.devicePixelRatio || 1,  // High DPI support
      autoDensity: true,           // Scale canvas for retina displays
    }).then(() => {
      if (!canvasRef.current) return;
      
      // Add Pixi canvas to DOM
      canvasRef.current.appendChild(app.canvas);
      appRef.current = app;

      // ===== SCENE GRAPH SETUP =====
      // gameContainer holds all game objects and can be transformed (camera)
      // This allows us to pan and zoom the entire game world
      const gameContainer = new PIXI.Container();
      app.stage.addChild(gameContainer);

      // ===== GRAPHICS OBJECTS =====
      // Using PIXI.Graphics for efficient vector drawing (redrawn each frame)
      const groundGraphics = new PIXI.Graphics();  // Grid and background
      const snakeGraphics = new PIXI.Graphics();   // All snakes
      const pelletGraphics = new PIXI.Graphics();  // All pellets
      
      // Add to container in render order (back to front)
      gameContainer.addChild(groundGraphics);
      gameContainer.addChild(pelletGraphics);
      gameContainer.addChild(snakeGraphics);

      // Track keyboard state and debug mode
      const keysPressed = new Set<string>();
      let debugMode = false;
      
      // Track if initial zoom-in has completed
      let initialZoomComplete = false;
      
      // ===== INPUT HANDLERS =====
      const handleKeyDown = (e: KeyboardEvent) => {
        keysPressed.add(e.code);
        
        // Toggle debug mode with 'D' key
        if (e.code === "KeyD") {
          debugMode = !debugMode;
          console.log(`🔍 Debug mode: ${debugMode ? "ON" : "OFF"}`);
        }
      };
      
      const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.delete(e.code);
      };
      
      const handleMouseMove = (e: MouseEvent) => {
        // ===== SCREEN TO WORLD COORDINATE CONVERSION =====
        // Screen coords: Mouse position in browser window (pixels)
        // World coords: Position in the game world (units)
        
        // Step 1: Center screen coords (0,0 = center of screen)
        const screenX = e.clientX - window.innerWidth / 2;
        const screenY = e.clientY - window.innerHeight / 2;
        
        // Step 2: Reverse the camera zoom
        const zoomedX = screenX / gameContainer.scale.x;
        const zoomedY = screenY / gameContainer.scale.y;
        
        // Step 3: Add camera position (pivot = what the camera is looking at)
        const worldX = zoomedX + gameContainer.pivot.x;
        const worldY = zoomedY + gameContainer.pivot.y;
        
        useSnakeGame.getState().updateMousePosition(worldX, worldY);
      };
      
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      window.addEventListener("mousemove", handleMouseMove);

      // Debug logging helper (only logs when debug mode is on)
      let frameCounter = 0;
      const logDebugInfo = (state: any, newPlayerSnake: Snake) => {
        frameCounter++;
        // Log every 60 frames (once per second at 60 FPS)
        if (frameCounter % 60 === 0 && debugMode) {
          console.group("🎮 Game Debug Info");
          
          console.log("📱 Screen:", {
            width: window.innerWidth,
            height: window.innerHeight,
            ratio: (window.innerWidth / window.innerHeight).toFixed(2)
          });
          
          console.log("🗺️ Map:", {
            size: state.mapSize,
            bounds: `${-state.mapSize/2} to ${state.mapSize/2}`
          });
          
          console.log("🐍 Player Snake:", {
            position: newPlayerSnake.segments[0].position,
            length: newPlayerSnake.length,
            score: newPlayerSnake.score,
            segments: newPlayerSnake.segments.length,
            speed: newPlayerSnake.speed,
            isBoosting: newPlayerSnake.isBoosting
          });
          
          console.log("🖱️ Mouse:", {
            worldPosition: state.mouseWorldPosition,
            distance: distance2D(
              newPlayerSnake.segments[0].position,
              state.mouseWorldPosition
            ).toFixed(2)
          });
          
          console.log("📷 Camera:", {
            pivot: gameContainer.pivot,
            scale: gameContainer.scale.x.toFixed(3),
            position: gameContainer.position
          });
          
          console.log("🎯 Game State:", {
            pellets: state.pellets.length,
            aiSnakes: state.aiSnakes.length,
            fps: app.ticker.FPS.toFixed(1),
            deltaTime: app.ticker.deltaTime.toFixed(3)
          });
          
          console.groupEnd();
        }
      };

      // ===== GAME LOOP =====
      // Pixi.Ticker runs at ~60 FPS and drives the game logic
      app.ticker.add((ticker) => {
        // ticker.deltaTime is in frames (60 FPS = 1), convert to seconds
        const delta = ticker.deltaTime / 60;
        const state = useSnakeGame.getState();
        
        if (!state.playerSnake) return;

        const isBoosting = keysPressed.has("Space");
        if (isBoosting !== state.playerSnake.isBoosting) {
          state.setPlayerBoosting(isBoosting);
        }

        // Update player snake
        const updatedPlayer = updateSnakeMovement(
          state.playerSnake,
          state.mouseWorldPosition,
          delta,
          isBoosting,
          state.pellets,
          state.mapSize
        );

        // Check pellet collisions for player
        const { snake: newPlayerSnake, collectedPellets } = checkPelletCollisions(
          updatedPlayer,
          state.pellets
        );

        // Replace collected pellets with new ones
        collectedPellets.forEach((pelletId) => {
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

        // Check collisions with AI snakes
        const playerHitSnake = checkSnakeCollisions(newPlayerSnake, state.aiSnakes);
        if (playerHitSnake) {
          state.endGame();
          return;
        }

        state.updatePlayerSnake(newPlayerSnake);

        // Update AI snakes
        const aiCollectedPellets: string[] = [];
        const updatedAI = state.aiSnakes.map((aiSnake) => {
          const updated = updateAISnake(
            aiSnake,
            delta,
            state.pellets,
            state.mapSize,
            newPlayerSnake,
            state.aiSnakes
          );
          const { snake: finalSnake, collectedPellets: aiPellets } =
            checkPelletCollisions(updated, state.pellets);
          aiCollectedPellets.push(...aiPellets);
          return finalSnake;
        });

        // Replace AI collected pellets
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

        state.updateAISnakes(updatedAI);

        // ===== DEBUG LOGGING =====
        logDebugInfo(state, newPlayerSnake);

        // ===== CAMERA SYSTEM: Follow player with dynamic zoom =====
        // In Pixi.js, camera is simulated by transforming the game container:
        // - pivot: what point in world space the camera looks at
        // - position: where to draw that pivot point on screen (center)
        // - scale: zoom level (higher = zoomed in)
        if (newPlayerSnake.segments.length > 0) {
          const head = newPlayerSnake.segments[0].position;
          
          // Calculate zoom based on snake length
          // Higher values = more zoomed in = objects appear larger
          // Scale of 4-8 gives a good balance between seeing the map and detail
          const baseZoom = 8.0;    // Initial zoom (nice close-up view)
          const minZoom = 4.0;     // Maximum zoom out (still keep things visible)
          const zoomScale = 0.015; // How quickly zoom changes with length
          const targetZoom = Math.max(
            minZoom,
            baseZoom - (newPlayerSnake.length - 10) * zoomScale
          );
          
          // Smoothly follow player position (lerp = linear interpolation)
          // pivot.x/y determines what world coordinates are at screen center
          const lerpFactor = 0.1;
          gameContainer.pivot.x += (head.x - gameContainer.pivot.x) * lerpFactor;
          gameContainer.pivot.y += (head.y - gameContainer.pivot.y) * lerpFactor;
          
          // Position container so pivot point appears at screen center
          gameContainer.position.set(app.screen.width / 2, app.screen.height / 2);
          
          // Smoothly adjust zoom level
          // Use slower lerp initially (0.001), then faster (0.05) after reaching target
          const zoomDifference = Math.abs(targetZoom - gameContainer.scale.x);
          
          // Consider initial zoom complete when within 0.1 of target zoom
          if (!initialZoomComplete && zoomDifference < 0.1) {
            initialZoomComplete = true;
          }
          
          // Use slow zoom initially, fast zoom after
          const zoomLerpFactor = initialZoomComplete ? 0.05 : 0.001;
          gameContainer.scale.x += (targetZoom - gameContainer.scale.x) * zoomLerpFactor;
          gameContainer.scale.y += (targetZoom - gameContainer.scale.y) * zoomLerpFactor;
        }

        // ===== RENDER ALL GAME OBJECTS =====
        drawGround(groundGraphics, state.mapSize);
        drawPellets(pelletGraphics, state.pellets);
        drawSnakes(snakeGraphics, newPlayerSnake, updatedAI);
      });

      // Cleanup on unmount
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
        window.removeEventListener("mousemove", handleMouseMove);
        app.destroy(true, { children: true });
      };
    });

    return () => {
      if (appRef.current) {
        appRef.current.destroy(true);
      }
    };
  }, [phase]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div ref={canvasRef} />
      <GameUI />
    </div>
  );
}

// ===== RENDERING FUNCTIONS =====
// These use Pixi.Graphics API to draw shapes directly to the canvas
// Graphics are cleared and redrawn each frame (immediate mode rendering)

/**
 * Draws the ground/background grid
 * 
 * Pixi.js uses immediate mode rendering: clear() → draw shapes → display
 * This is more efficient than creating thousands of sprite objects
 */
function drawGround(graphics: PIXI.Graphics, mapSize: number) {
  graphics.clear();  // Clear previous frame
  
  // Draw background rectangle
  graphics.rect(-mapSize / 2, -mapSize / 2, mapSize, mapSize);
  graphics.fill(0x0f0f1e);  // Slightly lighter than background (hex color)
  
  // Draw grid lines for visual reference
  graphics.setStrokeStyle({ width: 1, color: 0x2a2a3e, alpha: 0.3 });
  const gridSize = 20;  // Grid spacing in world units
  
  // Vertical lines
  for (let x = -mapSize / 2; x <= mapSize / 2; x += gridSize) {
    graphics.moveTo(x, -mapSize / 2);
    graphics.lineTo(x, mapSize / 2);
  }
  
  // Horizontal lines
  for (let y = -mapSize / 2; y <= mapSize / 2; y += gridSize) {
    graphics.moveTo(-mapSize / 2, y);
    graphics.lineTo(mapSize / 2, y);
  }
  
  graphics.stroke();
}

/**
 * Draws all pellets (food items) as colored circles
 * Batched into a single graphics object for efficiency
 */
function drawPellets(graphics: PIXI.Graphics, pellets: Pellet[]) {
  graphics.clear();
  
  for (const pellet of pellets) {
    graphics.circle(pellet.position.x, pellet.position.y, pellet.size * 2);
    graphics.fill(pellet.color);  // Color from pellet (CSS color string or hex)
  }
}

/**
 * Draws all snakes (player and AI)
 * Each snake is drawn as a series of circles forming a smooth body
 */
function drawSnakes(graphics: PIXI.Graphics, playerSnake: Snake, aiSnakes: Snake[]) {
  graphics.clear();
  
  // Draw player snake
  drawSingleSnake(graphics, playerSnake);
  
  // Draw AI snakes
  for (const snake of aiSnakes) {
    drawSingleSnake(graphics, snake);
  }
}

/**
 * Draws a single snake with all its segments
 * 
 * Visual design:
 * - Each segment is a circle
 * - Tail fades slightly for depth effect
 * - Head has white highlight for visibility
 */
function drawSingleSnake(graphics: PIXI.Graphics, snake: Snake) {
  if (snake.segments.length === 0) return;
  
  // Draw body segments (circles that follow each other)
  for (let i = 0; i < snake.segments.length; i++) {
    const segment = snake.segments[i];
    // Fade tail slightly (alpha: 1.0 at head → 0.7 at tail)
    const alpha = 1 - (i / snake.segments.length) * 0.3;
    
    graphics.circle(segment.position.x, segment.position.y, segment.radius);
    graphics.fill({ color: snake.color, alpha });
  }
  
  // Draw head highlight (white dot to indicate direction)
  const head = snake.segments[0];
  graphics.circle(head.position.x, head.position.y, head.radius * 0.5);
  graphics.fill(0xffffff);  // White color
}

// ===== GAME LOGIC FUNCTIONS =====
// These functions handle game mechanics (movement, collisions, AI)
// They work with pure data (no rendering) and update the game state

/**
 * Updates snake position and direction based on mouse or AI logic
 * 
 * Movement system:
 * 1. Calculate direction (player: toward mouse, AI: toward pellet)
 * 2. Move head by speed * delta (physics)
 * 3. Each segment follows the one in front at fixed distance
 * 4. This creates smooth snake-like motion
 */
function updateSnakeMovement(
  snake: Snake,
  mouseWorldPosition: { x: number; y: number },
  delta: number,
  isBoosting: boolean,
  pellets: Pellet[],
  mapSize: number
): Snake {
  if (snake.segments.length === 0) return snake;

  const head = snake.segments[0].position;

  // Player snake follows mouse cursor
  if (snake.id === "player") {
    // Calculate vector from snake head to mouse position
    const targetDir = {
      x: mouseWorldPosition.x - head.x,
      y: mouseWorldPosition.y - head.y,
    };

    const distanceToMouse = distance2D({ x: 0, y: 0 }, targetDir);

    // Dead zone: only move if mouse is >1 unit away from head
    if (distanceToMouse > 1.0) {
      snake.direction = normalize2D(targetDir);
    } else {
      // Stop moving when cursor is very close (prevents drift)
      snake.direction = { x: 0, y: 0 };
    }
  }

  // Apply speed boost (2x speed when spacebar is held)
  const speed = isBoosting ? snake.speed * 2 : snake.speed;
  const moveDistance = speed * delta;

  // Calculate new head position
  const newHead = {
    x: head.x + snake.direction.x * moveDistance,
    y: head.y + snake.direction.y * moveDistance,
  };

  // Clamp snake within map boundaries
  newHead.x = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.x));
  newHead.y = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.y));

  // Update all body segments to follow the head
  const newSegments = [{ position: newHead, radius: snake.segments[0].radius }];

  let remainingLength = snake.length - 1;
  // Calculate spacing dynamically: diameter * (1 - overlap)
  const segmentSpacing = SEGMENT_RADIUS * 2 * (1 - SEGMENT_OVERLAP);
  for (let i = 0; i < snake.segments.length && remainingLength > 0; i++) {
    const seg = snake.segments[i];
    const dist = distance2D(newSegments[newSegments.length - 1].position, seg.position);

    if (dist > segmentSpacing) {
      // Move segment closer to maintain spacing
      const dir = {
        x: seg.position.x - newSegments[newSegments.length - 1].position.x,
        y: seg.position.y - newSegments[newSegments.length - 1].position.y,
      };
      const normalized = normalize2D(dir);
      const pos = {
        x: newSegments[newSegments.length - 1].position.x + normalized.x * segmentSpacing,
        y: newSegments[newSegments.length - 1].position.y + normalized.y * segmentSpacing,
      };
      newSegments.push({ position: pos, radius: seg.radius });
      remainingLength--;
    } else if (dist > 0.1) {
      // Keep segment at current position if close enough
      newSegments.push({ position: { ...seg.position }, radius: seg.radius });
      remainingLength--;
    }
  }

  // Boosting consumes snake length (minimum length of 10)
  if (isBoosting && snake.id === "player" && snake.length > 10) {
    snake.length = Math.max(10, snake.length - delta * 2);
  }

  return {
    ...snake,
    segments: newSegments,
    isBoosting,
  };
}

// AI behavior: seeks nearby pellets, wanders randomly if none found
function updateAISnake(
  snake: Snake,
  delta: number,
  pellets: Pellet[],
  mapSize: number,
  playerSnake: Snake,
  allAISnakes: Snake[]
): Snake {
  if (snake.segments.length === 0) return snake;

  const head = snake.segments[0].position;

  // AI seeks nearest pellet within range
  let targetPos = null;
  let minDist = Infinity;

  for (const pellet of pellets.slice(0, 50)) {
    const dist = distance2D(head, pellet.position);
    if (dist < minDist && dist < 30) {
      minDist = dist;
      targetPos = pellet.position;
    }
  }

  if (targetPos) {
    // Move toward target pellet
    const direction = {
      x: targetPos.x - head.x,
      y: targetPos.y - head.y,
    };
    snake.direction = normalize2D(direction);
  } else {
    // No pellets nearby: wander randomly
    if (Math.random() < 0.02) {
      const angle = Math.random() * Math.PI * 2;
      snake.direction = { x: Math.cos(angle), y: Math.sin(angle) };
    }
  }

  const moveDistance = snake.speed * delta;
  const newHead = {
    x: head.x + snake.direction.x * moveDistance,
    y: head.y + snake.direction.y * moveDistance,
  };

  // Keep within bounds
  newHead.x = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.x));
  newHead.y = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.y));

  const newSegments = [{ position: newHead, radius: snake.segments[0].radius }];

  let remainingLength = snake.length - 1;
  // Calculate spacing dynamically: diameter * (1 - overlap)
  const segmentSpacing = SEGMENT_RADIUS * 2 * (1 - SEGMENT_OVERLAP);
  for (let i = 0; i < snake.segments.length && remainingLength > 0; i++) {
    const seg = snake.segments[i];
    const dist = distance2D(newSegments[newSegments.length - 1].position, seg.position);

    if (dist > segmentSpacing) {
      const dir = {
        x: seg.position.x - newSegments[newSegments.length - 1].position.x,
        y: seg.position.y - newSegments[newSegments.length - 1].position.y,
      };
      const normalized = normalize2D(dir);
      const pos = {
        x: newSegments[newSegments.length - 1].position.x + normalized.x * segmentSpacing,
        y: newSegments[newSegments.length - 1].position.y + normalized.y * segmentSpacing,
      };
      newSegments.push({ position: pos, radius: seg.radius });
      remainingLength--;
    } else if (dist > 0.1) {
      newSegments.push({ position: { ...seg.position }, radius: seg.radius });
      remainingLength--;
    }
  }

  return {
    ...snake,
    segments: newSegments,
  };
}

// Checks if snake head collides with any pellets
function checkPelletCollisions(snake: Snake, pellets: Pellet[]) {
  const collectedPellets: string[] = [];
  const head = snake.segments[0].position;
  const headRadius = snake.segments[0].radius;

  for (const pellet of pellets) {
    const dist = distance2D(head, pellet.position);
    // Collision when pellet is within head radius
    if (dist < headRadius) {
      collectedPellets.push(pellet.id);
      snake.length += 1; // Grow snake by 1 segment
      snake.score += 1; // Increase score
    }
  }

  return { snake, collectedPellets };
}

// Checks if player snake collides with AI snakes or itself
function checkSnakeCollisions(playerSnake: Snake, aiSnakes: Snake[]): boolean {
  const head = playerSnake.segments[0].position;
  const headRadius = playerSnake.segments[0].radius;
  
  // Collision threshold: circles overlap more than the allowed segment overlap
  // We allow 20% overlap normally, so collision happens at ~60% overlap (more aggressive)
  const collisionThreshold = headRadius * 0.8;

  // Check collision with AI snake bodies
  for (const aiSnake of aiSnakes) {
    // Start checking from segment 3 to avoid head-to-head collisions
    for (let i = 3; i < aiSnake.segments.length; i++) {
      const segment = aiSnake.segments[i];
      const dist = distance2D(head, segment.position);
      // Collision when head center is very close to segment center
      if (dist < collisionThreshold) {
        console.log(`Collision with AI snake ${aiSnake.name} segment ${i}, dist: ${dist.toFixed(2)}`);
        return true; // Game over
      }
    }
  }

  // Check self-collision (hitting own tail)
  for (let i = 5; i < playerSnake.segments.length; i++) {
    const segment = playerSnake.segments[i];
    const dist = distance2D(head, segment.position);
    // Collision when head center is very close to tail segment center
    if (dist < collisionThreshold) {
      console.log(`Self-collision with segment ${i}, dist: ${dist.toFixed(2)}`);
      return true; // Game over
    }
  }

  return false;
}

// Helper to generate random color
function getRandomColor(): string {
  const colors = [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#FFA07A",
    "#98D8C8",
    "#F7DC6F",
    "#BB8FCE",
    "#85C1E2",
    "#F8B739",
    "#52B788",
    "#FF85A2",
    "#FFD93D",
    "#6BCF7F",
    "#A8DADC",
    "#E63946",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
