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
  const raycaster = useRef(new THREE.Raycaster());
  const plane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  
  // Track mouse movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Convert screen coordinates to normalized device coordinates
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = -(e.clientY / window.innerHeight) * 2 + 1;
      
      // Use raycasting to get world position
      raycaster.current.setFromCamera(new THREE.Vector2(x, y), camera);
      const intersection = new THREE.Vector3();
      raycaster.current.ray.intersectPlane(plane.current, intersection);
      
      if (intersection) {
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
  
  // Game loop
  useFrame((state, delta) => {
    if (!playerSnake) return;
    
    // Check for boost
    const isBoosting = keysPressed.current.has('Space');
    if (isBoosting !== playerSnake.isBoosting) {
      setPlayerBoosting(isBoosting);
    }
    
    // Update player snake
    const updatedPlayer = updateSnakeMovement(playerSnake, mouseWorldPosition, delta, isBoosting, pellets, mapSize);
    
    // Check pellet collisions for player
    const { snake: newPlayerSnake, collectedPellets } = checkPelletCollisions(updatedPlayer, pellets);
    
    // Remove collected pellets and spawn new ones
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
    
    // Check if player hit another snake
    const playerHitSnake = checkSnakeCollisions(newPlayerSnake, aiSnakes);
    if (playerHitSnake) {
      endGame();
      return;
    }
    
    updatePlayerSnake(newPlayerSnake);
    
    // Update AI snakes and collect pellets
    const aiCollectedPellets: string[] = [];
    const updatedAI = aiSnakes.map((aiSnake) => {
      const updated = updateAISnake(aiSnake, delta, pellets, mapSize, newPlayerSnake, aiSnakes);
      const { snake: finalSnake, collectedPellets: aiPellets } = checkPelletCollisions(updated, pellets);
      aiCollectedPellets.push(...aiPellets);
      return finalSnake;
    });
    
    // Remove AI collected pellets and spawn new ones
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
  
  // Calculate direction from mouse world position (only for player)
  if (snake.id === "player") {
    // mouseWorldPosition contains actual world coordinates (x, z)
    const targetDir = new THREE.Vector3(
      mouseWorldPosition.x - head.x,
      0,
      mouseWorldPosition.z - head.z
    );
    
    const distanceToMouse = targetDir.length();
    
    // Only update direction if mouse is far enough from head (1 unit minimum)
    if (distanceToMouse > 1.0) {
      snake.direction = targetDir.normalize();
    } else {
      // If mouse is very close, stop moving
      snake.direction = new THREE.Vector3(0, 0, 0);
    }
  }
  
  // Apply speed boost
  const speed = isBoosting ? snake.speed * 2 : snake.speed;
  const moveDistance = speed * delta;
  
  // Move head
  const newHead = head.add(snake.direction.clone().multiplyScalar(moveDistance));
  
  // Keep snake within bounds
  newHead.x = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.x));
  newHead.z = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.z));
  
  // Update segments
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
  
  // If boosting, consume length
  if (isBoosting && snake.id === "player" && snake.length > 10) {
    snake.length = Math.max(10, snake.length - delta * 2);
  }
  
  return {
    ...snake,
    segments: newSegments,
    isBoosting,
  };
}

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
  
  // Simple AI: move toward nearest pellet
  let targetPos = null;
  let minDist = Infinity;
  
  for (const pellet of pellets.slice(0, 50)) {
    const dist = head.distanceTo(pellet.position);
    if (dist < minDist && dist < 30) {
      minDist = dist;
      targetPos = pellet.position;
    }
  }
  
  if (targetPos) {
    const direction = new THREE.Vector3(
      targetPos.x - head.x,
      0,
      targetPos.z - head.z
    ).normalize();
    snake.direction = direction;
  } else {
    // Random movement
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

function checkPelletCollisions(snake: any, pellets: any[]) {
  const collectedPellets: string[] = [];
  const head = snake.segments[0].position;
  
  for (const pellet of pellets) {
    const distance = head.distanceTo(pellet.position);
    if (distance < 1.5) {
      collectedPellets.push(pellet.id);
      snake.length += 1;
      snake.score += 1;
    }
  }
  
  return { snake, collectedPellets };
}

function checkSnakeCollisions(playerSnake: any, aiSnakes: any[]): boolean {
  const head = playerSnake.segments[0].position;
  
  // Check collision with AI snakes
  for (const aiSnake of aiSnakes) {
    for (let i = 3; i < aiSnake.segments.length; i++) {
      const segment = aiSnake.segments[i];
      const distance = head.distanceTo(segment.position);
      if (distance < 1) {
        return true;
      }
    }
  }
  
  // Check self collision
  for (let i = 5; i < playerSnake.segments.length; i++) {
    const segment = playerSnake.segments[i];
    const distance = head.distanceTo(segment.position);
    if (distance < 0.8) {
      return true;
    }
  }
  
  return false;
}
