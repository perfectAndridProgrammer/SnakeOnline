import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useSnakeGame, type Snake, type Pellet, distance2D, normalize2D } from "@/lib/stores/useSnakeGame";
import GameUI from "./GameUI";

export default function PixiGame() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const phase = useSnakeGame((state) => state.phase);

  useEffect(() => {
    if (!canvasRef.current || phase !== "playing") return;

    // ===== PIXI.JS APPLICATION SETUP =====
    // Create Pixi application with 2D canvas renderer
    const app = new PIXI.Application();
    
    app.init({
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: 0x1a1a2e,  // Dark blue background
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      if (!canvasRef.current) return;
      
      // Add Pixi canvas to DOM
      canvasRef.current.appendChild(app.canvas);
      appRef.current = app;

      // Create container for all game objects (allows camera transform)
      const gameContainer = new PIXI.Container();
      app.stage.addChild(gameContainer);

      // ===== GAME OBJECTS =====
      const groundGraphics = new PIXI.Graphics();
      const snakeGraphics = new PIXI.Graphics();
      const pelletGraphics = new PIXI.Graphics();
      
      gameContainer.addChild(groundGraphics);
      gameContainer.addChild(pelletGraphics);
      gameContainer.addChild(snakeGraphics);

      // Track keyboard state
      const keysPressed = new Set<string>();
      
      // ===== INPUT HANDLERS =====
      const handleKeyDown = (e: KeyboardEvent) => {
        keysPressed.add(e.code);
      };
      
      const handleKeyUp = (e: KeyboardEvent) => {
        keysPressed.delete(e.code);
      };
      
      const handleMouseMove = (e: MouseEvent) => {
        // Convert screen coordinates to world coordinates
        // Account for camera position (viewport offset)
        const worldX = (e.clientX - app.screen.width / 2) / gameContainer.scale.x + gameContainer.pivot.x;
        const worldY = (e.clientY - app.screen.height / 2) / gameContainer.scale.y + gameContainer.pivot.y;
        
        useSnakeGame.getState().updateMousePosition(worldX, worldY);
      };
      
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      window.addEventListener("mousemove", handleMouseMove);

      // ===== GAME LOOP =====
      app.ticker.add((ticker) => {
        const delta = ticker.deltaTime / 60; // Convert to seconds
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

        // ===== CAMERA SYSTEM: Follow player with dynamic zoom =====
        if (newPlayerSnake.segments.length > 0) {
          const head = newPlayerSnake.segments[0].position;
          
          // Calculate zoom based on snake length (starts at 1.2, zooms out to 0.6)
          const baseZoom = 1.2;
          const minZoom = 0.6;
          const zoomScale = 0.01;
          const targetZoom = Math.max(
            minZoom,
            baseZoom - (newPlayerSnake.length - 10) * zoomScale
          );
          
          // Smoothly follow player position (camera pivot)
          const lerpFactor = 0.1;
          gameContainer.pivot.x += (head.x - gameContainer.pivot.x) * lerpFactor;
          gameContainer.pivot.y += (head.y - gameContainer.pivot.y) * lerpFactor;
          
          // Center the view
          gameContainer.position.set(app.screen.width / 2, app.screen.height / 2);
          
          // Smoothly adjust zoom
          gameContainer.scale.x += (targetZoom - gameContainer.scale.x) * 0.05;
          gameContainer.scale.y += (targetZoom - gameContainer.scale.y) * 0.05;
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

// Draws the ground/background grid
function drawGround(graphics: PIXI.Graphics, mapSize: number) {
  graphics.clear();
  
  // Draw grid background
  graphics.rect(-mapSize / 2, -mapSize / 2, mapSize, mapSize);
  graphics.fill(0x0f0f1e);  // Slightly lighter than background
  
  // Draw grid lines
  graphics.setStrokeStyle({ width: 1, color: 0x2a2a3e, alpha: 0.3 });
  const gridSize = 20;
  
  for (let x = -mapSize / 2; x <= mapSize / 2; x += gridSize) {
    graphics.moveTo(x, -mapSize / 2);
    graphics.lineTo(x, mapSize / 2);
  }
  
  for (let y = -mapSize / 2; y <= mapSize / 2; y += gridSize) {
    graphics.moveTo(-mapSize / 2, y);
    graphics.lineTo(mapSize / 2, y);
  }
  
  graphics.stroke();
}

// Draws all pellets
function drawPellets(graphics: PIXI.Graphics, pellets: Pellet[]) {
  graphics.clear();
  
  for (const pellet of pellets) {
    graphics.circle(pellet.position.x, pellet.position.y, pellet.size * 2);
    graphics.fill(pellet.color);
  }
}

// Draws all snakes (player and AI)
function drawSnakes(graphics: PIXI.Graphics, playerSnake: Snake, aiSnakes: Snake[]) {
  graphics.clear();
  
  // Draw player snake
  drawSingleSnake(graphics, playerSnake);
  
  // Draw AI snakes
  for (const snake of aiSnakes) {
    drawSingleSnake(graphics, snake);
  }
}

// Draws a single snake with all its segments
function drawSingleSnake(graphics: PIXI.Graphics, snake: Snake) {
  if (snake.segments.length === 0) return;
  
  // Draw body segments
  for (let i = 0; i < snake.segments.length; i++) {
    const segment = snake.segments[i];
    const alpha = 1 - (i / snake.segments.length) * 0.3; // Fade tail slightly
    
    graphics.circle(segment.position.x, segment.position.y, segment.radius);
    graphics.fill({ color: snake.color, alpha });
  }
  
  // Draw head highlight (white circle)
  const head = snake.segments[0];
  graphics.circle(head.position.x, head.position.y, head.radius * 0.5);
  graphics.fill(0xffffff);
}

// ===== GAME LOGIC FUNCTIONS =====

// Updates snake position and direction based on target or AI logic
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
  // Each segment follows the previous one at a fixed distance (1 unit)
  for (let i = 0; i < snake.segments.length && remainingLength > 0; i++) {
    const seg = snake.segments[i];
    const dist = distance2D(newSegments[newSegments.length - 1].position, seg.position);

    if (dist > 1) {
      // Move segment closer to maintain 1 unit spacing
      const dir = {
        x: seg.position.x - newSegments[newSegments.length - 1].position.x,
        y: seg.position.y - newSegments[newSegments.length - 1].position.y,
      };
      const normalized = normalize2D(dir);
      const pos = {
        x: newSegments[newSegments.length - 1].position.x + normalized.x * 1,
        y: newSegments[newSegments.length - 1].position.y + normalized.y * 1,
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
  for (let i = 0; i < snake.segments.length && remainingLength > 0; i++) {
    const seg = snake.segments[i];
    const dist = distance2D(newSegments[newSegments.length - 1].position, seg.position);

    if (dist > 1) {
      const dir = {
        x: seg.position.x - newSegments[newSegments.length - 1].position.x,
        y: seg.position.y - newSegments[newSegments.length - 1].position.y,
      };
      const normalized = normalize2D(dir);
      const pos = {
        x: newSegments[newSegments.length - 1].position.x + normalized.x * 1,
        y: newSegments[newSegments.length - 1].position.y + normalized.y * 1,
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

  for (const pellet of pellets) {
    const dist = distance2D(head, pellet.position);
    // Collision radius: 1.5 units
    if (dist < 1.5) {
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

  // Check collision with AI snake bodies
  for (const aiSnake of aiSnakes) {
    // Start checking from segment 3 to avoid head-to-head collisions
    for (let i = 3; i < aiSnake.segments.length; i++) {
      const segment = aiSnake.segments[i];
      const dist = distance2D(head, segment.position);
      if (dist < 1) {
        return true; // Game over
      }
    }
  }

  // Check self-collision (hitting own tail)
  for (let i = 5; i < playerSnake.segments.length; i++) {
    const segment = playerSnake.segments[i];
    const dist = distance2D(head, segment.position);
    if (dist < 0.8) {
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
