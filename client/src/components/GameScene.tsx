import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useSnakeGame } from "@/lib/stores/useSnakeGame";
import SnakeRenderer from "./SnakeRenderer";
import Pellets from "./Pellets";
import Ground from "./Ground";

export default function GameScene() {
  const { camera, size } = useThree();
  const playerSnake = useSnakeGame((state) => state.playerSnake);
  const aiSnakes = useSnakeGame((state) => state.aiSnakes);
  const pellets = useSnakeGame((state) => state.pellets);
  const mouseWorldPosition = useSnakeGame((state) => state.mouseWorldPosition);
  const updatePlayerSnake = useSnakeGame((state) => state.updatePlayerSnake);
  const updateAISnakes = useSnakeGame((state) => state.updateAISnakes);
  const removePellet = useSnakeGame((state) => state.removePellet);
  const addPellet = useSnakeGame((state) => state.addPellet);
  const endGame = useSnakeGame((state) => state.endGame);
  const mapSize = useSnakeGame((state) => state.mapSize);
  const setPlayerBoosting = useSnakeGame((state) => state.setPlayerBoosting);
  
  const keysPressed = useRef<Set<string>>(new Set());
  // Raycaster for converting screen coordinates to world coordinates
  const raycaster = useRef(new THREE.Raycaster());
  // Ground plane at y=0 for raycasting intersection
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  
  // Track mouse movement and convert to world coordinates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Convert screen coordinates to normalized device coordinates (-1 to +1)
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      // Use raycasting to project mouse position onto the ground plane (y=0)
      // This converts 2D screen coordinates to 3D world coordinates
      raycaster.current.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersection = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(plane.current, intersection);
      
      if (intersection) {
        // Store world coordinates (x, z) for snake movement
        useSnakeGame.getState().updateMousePosition(intersection.x, intersection.z);
      }
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.code);
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.code);
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [camera]);
  
  // Main game loop - runs every frame at 60fps
  useFrame((state, delta) => {
    if (!playerSnake) return;
    
    // Check if player is boosting (holding spacebar)
    const isBoosting = keysPressed.current.has('Space');
    if (isBoosting !== playerSnake.isBoosting) {
      setPlayerBoosting(isBoosting);
    }
    
    // Update player snake position based on mouse cursor
    const updatedPlayer = updateSnakeMovement(playerSnake, mouseWorldPosition, delta, isBoosting, pellets, mapSize);
    
    // Check if player collected any pellets
    const { snake: newPlayerSnake, collectedPellets } = checkPelletCollisions(updatedPlayer, pellets);
    
    // Replace collected pellets with new ones to maintain pellet count
    collectedPellets.forEach((pelletId) => {
      removePellet(pelletId);
      // Spawn new pellet at random location
      addPellet({
        id: `pellet-${Date.now()}-${Math.random()}`,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * mapSize,
          0,
          (Math.random() - 0.5) * mapSize
        ),
        color: getRandomColor(),
        size: 0.3,
      });
    });
    
    // Check if player collided with any AI snakes (game over)
    const playerHitSnake = checkSnakeCollisions(newPlayerSnake, aiSnakes);
    if (playerHitSnake) {
      endGame();
      return;
    }
    
    updatePlayerSnake(newPlayerSnake);
    
    // Update AI snakes and handle their pellet collection
    const aiCollectedPellets: string[] = [];
    const updatedAI = aiSnakes.map((aiSnake) => {
      const updated = updateAISnake(aiSnake, delta, pellets, mapSize, newPlayerSnake, aiSnakes);
      const { snake: finalSnake, collectedPellets: aiPellets } = checkPelletCollisions(updated, pellets);
      aiCollectedPellets.push(...aiPellets);
      return finalSnake;
    });
    
    // Replace AI collected pellets with new ones
    aiCollectedPellets.forEach((pelletId) => {
      removePellet(pelletId);
      addPellet({
        id: `pellet-${Date.now()}-${Math.random()}`,
        position: new THREE.Vector3(
          (Math.random() - 0.5) * mapSize,
          0,
          (Math.random() - 0.5) * mapSize
        ),
        color: getRandomColor(),
        size: 0.3,
      });
    });
    
    updateAISnakes(updatedAI);
    
    // Update camera to follow player (top-down view)
    if (newPlayerSnake.segments.length > 0) {
      const head = newPlayerSnake.segments[0].position;
      const targetZoom = Math.max(6, Math.min(15, 6 + newPlayerSnake.length / 20));
      
      // Keep camera directly above the player
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, head.x, 0.1);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, head.z, 0.1);
      
      // Always look at the player's position
      camera.lookAt(head.x, 0, head.z);
      
      // Adjust zoom based on snake size
      if ('zoom' in camera) {
        (camera as THREE.OrthographicCamera).zoom = THREE.MathUtils.lerp(
          (camera as THREE.OrthographicCamera).zoom,
          targetZoom,
          0.05
        );
        camera.updateProjectionMatrix();
      }
    }
  });
  
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} />
      <Ground />
      <Pellets pellets={pellets} />
      {playerSnake && <SnakeRenderer snake={playerSnake} />}
      {aiSnakes.map((snake) => (
        <SnakeRenderer key={snake.id} snake={snake} />
      ))}
    </>
  );
}

// Helper functions
function getRandomColor(): string {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
    "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739", "#52B788",
    "#FF85A2", "#FFD93D", "#6BCF7F", "#A8DADC", "#E63946"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// Updates snake position and direction based on target or AI logic
function updateSnakeMovement(
  snake: any,
  mouseWorldPosition: { x: number; z: number },
  delta: number,
  isBoosting: boolean,
  pellets: any[],
  mapSize: number
) {
  if (snake.segments.length === 0) return snake;
  
  const head = snake.segments[0].position.clone();
  
  // Player snake follows mouse cursor
  if (snake.id === "player") {
    // Calculate vector from snake head to mouse position
    const targetDir = new THREE.Vector3(
      mouseWorldPosition.x - head.x,
      0,
      mouseWorldPosition.z - head.z
    );
    
    const distanceToMouse = targetDir.length();
    
    // Dead zone: only move if mouse is >1 unit away from head
    // This prevents jittery movement and allows the snake to "catch up" to the cursor
    if (distanceToMouse > 1.0) {
      snake.direction = targetDir.normalize();
    } else {
      // Stop moving when cursor is very close (prevents drift)
      snake.direction = new THREE.Vector3(0, 0, 0);
    }
  }
  
  // Apply speed boost (2x speed when spacebar is held)
  const speed = isBoosting ? snake.speed * 2 : snake.speed;
  const moveDistance = speed * delta;
  
  // Calculate new head position by moving in current direction
  const newHead = head.add(snake.direction.clone().multiplyScalar(moveDistance));
  
  // Clamp snake within map boundaries
  newHead.x = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.x));
  newHead.z = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.z));
  
  // Update all body segments to follow the head
  const newSegments = [{ position: newHead, radius: snake.segments[0].radius }];
  
  let remainingLength = snake.length - 1;
  // Each segment follows the previous one at a fixed distance (1 unit)
  for (let i = 0; i < snake.segments.length && remainingLength > 0; i++) {
    const seg = snake.segments[i];
    const distance = newSegments[newSegments.length - 1].position.distanceTo(seg.position);
    
    if (distance > 1) {
      // Move segment closer to maintain 1 unit spacing
      const dir = seg.position.clone().sub(newSegments[newSegments.length - 1].position).normalize();
      const pos = newSegments[newSegments.length - 1].position.clone().add(dir.multiplyScalar(1));
      newSegments.push({ position: pos, radius: seg.radius });
      remainingLength--;
    } else if (distance > 0.1) {
      // Keep segment at current position if close enough
      newSegments.push({ position: seg.position.clone(), radius: seg.radius });
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
  snake: any,
  delta: number,
  pellets: any[],
  mapSize: number,
  playerSnake: any,
  allAISnakes: any[]
) {
  if (snake.segments.length === 0) return snake;
  
  const head = snake.segments[0].position;
  
  // AI seeks nearest pellet within range (optimized to check only first 50 pellets)
  let targetPos = null;
  let minDist = Infinity;
  
  for (const pellet of pellets.slice(0, 50)) {
    const dist = head.distanceTo(pellet.position);
    // Only target pellets within 30 units
    if (dist < minDist && dist < 30) {
      minDist = dist;
      targetPos = pellet.position;
    }
  }
  
  if (targetPos) {
    // Move toward target pellet
    const direction = new THREE.Vector3(
      targetPos.x - head.x,
      0,
      targetPos.z - head.z
    ).normalize();
    snake.direction = direction;
  } else {
    // No pellets nearby: wander randomly (2% chance per frame to change direction)
    if (Math.random() < 0.02) {
      const angle = Math.random() * Math.PI * 2;
      snake.direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    }
  }
  
  const moveDistance = snake.speed * delta;
  const newHead = head.clone().add(snake.direction.clone().multiplyScalar(moveDistance));
  
  // Keep within bounds
  newHead.x = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.x));
  newHead.z = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.z));
  
  const newSegments = [{ position: newHead, radius: snake.segments[0].radius }];
  
  let remainingLength = snake.length - 1;
  for (let i = 0; i < snake.segments.length && remainingLength > 0; i++) {
    const seg = snake.segments[i];
    const distance = newSegments[newSegments.length - 1].position.distanceTo(seg.position);
    
    if (distance > 1) {
      const dir = seg.position.clone().sub(newSegments[newSegments.length - 1].position).normalize();
      const pos = newSegments[newSegments.length - 1].position.clone().add(dir.multiplyScalar(1));
      newSegments.push({ position: pos, radius: seg.radius });
      remainingLength--;
    } else if (distance > 0.1) {
      newSegments.push({ position: seg.position.clone(), radius: seg.radius });
      remainingLength--;
    }
  }
  
  return {
    ...snake,
    segments: newSegments,
  };
}

// Checks if snake head collides with any pellets and grows the snake
function checkPelletCollisions(snake: any, pellets: any[]) {
  const collectedPellets: string[] = [];
  const head = snake.segments[0].position;
  
  for (const pellet of pellets) {
    const distance = head.distanceTo(pellet.position);
    // Collision radius: 1.5 units
    if (distance < 1.5) {
      collectedPellets.push(pellet.id);
      snake.length += 1;  // Grow snake by 1 segment
      snake.score += 1;   // Increase score
    }
  }
  
  return { snake, collectedPellets };
}

// Checks if player snake collides with AI snakes or itself (game over condition)
function checkSnakeCollisions(playerSnake: any, aiSnakes: any[]): boolean {
  const head = playerSnake.segments[0].position;
  
  // Check collision with AI snake bodies
  for (const aiSnake of aiSnakes) {
    // Start checking from segment 3 to avoid head-to-head collisions
    for (let i = 3; i < aiSnake.segments.length; i++) {
      const segment = aiSnake.segments[i];
      const distance = head.distanceTo(segment.position);
      if (distance < 1) {
        return true; // Game over
      }
    }
  }
  
  // Check self-collision (hitting own tail)
  // Start from segment 5 to allow tight turns
  for (let i = 5; i < playerSnake.segments.length; i++) {
    const segment = playerSnake.segments[i];
    const distance = head.distanceTo(segment.position);
    if (distance < 0.8) {
      return true; // Game over
    }
  }
  
  return false;
}
