/**
 * SnakeMovement - Handles snake movement physics and AI behavior
 * 
 * Responsibilities:
 * - Update player snake movement (follows mouse cursor)
 * - Update AI snake movement (seeks pellets, wanders)
 * - Calculate new segment positions using follow-the-leader algorithm
 * - Handle speed boost mechanics and length reduction
 * - Keep snakes within map boundaries
 * 
 * Movement system explained:
 * 1. Move the head in the current direction
 * 2. Each body segment follows the segment in front of it
 * 3. Segments try to maintain spacing (pulled closer if >1 unit apart)
 * 4. This creates smooth, snake-like motion with natural compression/extension
 */

import type { Snake, Pellet } from "@/lib/stores/useSnakeGame";
import { distance2D, normalize2D } from "@/lib/stores/useSnakeGame";

/**
 * Updates player snake movement based on mouse position
 * Player snake always tries to move toward the mouse cursor
 * 
 * @param snake - The snake to update
 * @param mouseWorldPosition - Current mouse position in world coordinates
 * @param delta - Frame time multiplier (approximates 1/60th at 60 FPS)
 * @param isBoosting - Whether spacebar is held (boost active)
 * @param pellets - Array of pellets (not used for player movement, but kept for consistency)
 * @param mapSize - Size of the game world (for boundary clamping)
 * @returns Updated snake object with new segment positions
 */
export function updateSnakeMovement(
  snake: Snake,
  mouseWorldPosition: { x: number; y: number },
  delta: number,
  isBoosting: boolean,
  pellets: Pellet[],
  mapSize: number
): Snake {
  // Safety check - return immediately if snake has no segments
  if (snake.segments.length === 0) return snake;

  // Get current head position (first segment is always the head)
  const head = snake.segments[0].position;

  // PLAYER-SPECIFIC MOVEMENT: Follow the mouse cursor
  if (snake.id === "player") {
    // Calculate vector from snake head to mouse position
    // This gives us the direction the snake should move
    const targetDir = {
      x: mouseWorldPosition.x - head.x,
      y: mouseWorldPosition.y - head.y,
    };

    // Calculate distance to mouse (magnitude of the target direction vector)
    // We use origin (0,0) as the first point since targetDir is already relative
    const distanceToMouse = distance2D({ x: 0, y: 0 }, targetDir);

    // Dead zone: only move if mouse is more than 1 unit away
    // This prevents jittery movement when mouse is very close to snake head
    if (distanceToMouse > 1.0) {
      // Normalize the direction vector to length 1
      // This ensures constant speed regardless of distance to mouse
      snake.direction = normalize2D(targetDir);
    } else {
      // Mouse is very close - stop moving to prevent drift
      snake.direction = { x: 0, y: 0 };
    }
  }

  // Calculate movement speed for this frame
  // Boosting (spacebar held) doubles the speed
  const speed = isBoosting ? snake.speed * 2 : snake.speed;
  
  // Calculate how far to move this frame
  // speed is in units/second, delta is frame multiplier (~1/60 at 60 FPS)
  // speed * delta = units to move this frame (approximates frame-rate independence)
  const moveDistance = speed * delta;

  // Calculate new head position by moving in current direction
  // Formula: new position = old position + (direction * distance)
  const newHead = {
    x: head.x + snake.direction.x * moveDistance,
    y: head.y + snake.direction.y * moveDistance,
  };

  // Clamp head position within map boundaries
  // Math.max(..., Math.min(..., x)) ensures: -mapSize/2 <= x <= mapSize/2
  // This prevents the snake from going off the edge of the map
  newHead.x = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.x));
  newHead.y = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.y));

  // Start building new segments array with the new head position
  // Each segment maintains the same radius
  const newSegments = [{ position: newHead, radius: snake.segments[0].radius }];

  // Calculate how many more segments we need to add
  // Total segments should equal snake.length, minus 1 for the head we just added
  let remainingLength = snake.length - 1;
  
  // FOLLOW-THE-LEADER ALGORITHM: Each segment follows the one in front
  // Loop through old segments and position them to follow the new segments
  for (let i = 0; i < snake.segments.length && remainingLength > 0; i++) {
    const seg = snake.segments[i];
    
    // Calculate distance from this old segment to the last new segment we placed
    const dist = distance2D(newSegments[newSegments.length - 1].position, seg.position);

    // If segment is too far away (>1 unit), pull it closer
    if (dist > 1) {
      // Calculate direction from last new segment to this old segment
      const dir = {
        x: seg.position.x - newSegments[newSegments.length - 1].position.x,
        y: seg.position.y - newSegments[newSegments.length - 1].position.y,
      };
      
      // Normalize to length 1
      const normalized = normalize2D(dir);
      
      // Place new segment exactly 1 unit away in that direction
      // This pulls segments closer when they drift too far apart
      const pos = {
        x: newSegments[newSegments.length - 1].position.x + normalized.x * 1,
        y: newSegments[newSegments.length - 1].position.y + normalized.y * 1,
      };
      
      newSegments.push({ position: pos, radius: seg.radius });
      remainingLength--;
    } 
    // If segment is close enough (>0.1 but <=1), keep it at current position
    else if (dist > 0.1) {
      // Keep segment where it is (copy its position)
      newSegments.push({ position: { ...seg.position }, radius: seg.radius });
      remainingLength--;
    }
    // If segment is very close (<0.1), skip it (allows for smooth compression)
  }

  // BOOST COST: Boosting consumes snake length over time
  // Only affects player snake, and only if length is above minimum (10)
  if (isBoosting && snake.id === "player" && snake.length > 10) {
    // Reduce length by delta * 2 per second while boosting
    // Math.max ensures we never go below minimum length of 10
    snake.length = Math.max(10, snake.length - delta * 2);
  }

  // Return updated snake with new segments and boost status
  return {
    ...snake,
    segments: newSegments,
    isBoosting,
  };
}

/**
 * Updates AI snake movement with simple seeking/wandering behavior
 * AI snakes seek nearby pellets, or wander randomly if no pellets are close
 * 
 * @param snake - The AI snake to update
 * @param delta - Frame time multiplier (approximates 1/60th at 60 FPS)
 * @param pellets - Array of all pellets (AI seeks these)
 * @param mapSize - Size of the game world (for boundary clamping)
 * @param playerSnake - The player's snake (not used currently, for future AI improvements)
 * @param allAISnakes - All AI snakes (not used currently, for future collision avoidance)
 * @returns Updated snake object with new segment positions
 */
export function updateAISnake(
  snake: Snake,
  delta: number,
  pellets: Pellet[],
  mapSize: number,
  playerSnake: Snake,
  allAISnakes: Snake[]
): Snake {
  // Safety check
  if (snake.segments.length === 0) return snake;

  // Get AI snake's head position
  const head = snake.segments[0].position;

  // SEEKING BEHAVIOR: Find nearest pellet within range
  // Track the closest pellet position and distance
  let targetPos = null;
  let minDist = Infinity;

  // Only check first 50 pellets for performance (avoid checking all ~100 pellets)
  // Check distance and ensure it's within detection range (30 units)
  for (const pellet of pellets.slice(0, 50)) {
    const dist = distance2D(head, pellet.position);
    
    // Update target if this pellet is closer AND within range
    if (dist < minDist && dist < 30) {
      minDist = dist;
      targetPos = pellet.position;
    }
  }

  // If we found a nearby pellet, move toward it
  if (targetPos) {
    // Calculate direction from snake head to target pellet
    const direction = {
      x: targetPos.x - head.x,
      y: targetPos.y - head.y,
    };
    
    // Normalize and set as new direction
    snake.direction = normalize2D(direction);
  } 
  // WANDERING BEHAVIOR: No nearby pellets, occasionally change direction
  else {
    // 2% chance per frame to change direction (at 60 FPS, changes ~1.2 times per second)
    if (Math.random() < 0.02) {
      // Pick a random angle (0 to 2π radians = 0 to 360 degrees)
      const angle = Math.random() * Math.PI * 2;
      
      // Convert angle to direction vector using trig
      // cos(angle) = x component, sin(angle) = y component
      snake.direction = { x: Math.cos(angle), y: Math.sin(angle) };
    }
    // Otherwise, keep moving in current direction
  }

  // Calculate movement distance (AI snakes don't boost, so just use base speed)
  // speed is in units/second, delta is frame multiplier (~1/60 at 60 FPS)
  const moveDistance = snake.speed * delta;
  
  // Calculate new head position
  const newHead = {
    x: head.x + snake.direction.x * moveDistance,
    y: head.y + snake.direction.y * moveDistance,
  };

  // Clamp within map boundaries (same as player)
  newHead.x = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.x));
  newHead.y = Math.max(-mapSize / 2, Math.min(mapSize / 2, newHead.y));

  // Build new segments array with updated head
  const newSegments = [{ position: newHead, radius: snake.segments[0].radius }];

  // Use same follow-the-leader algorithm as player snake
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

  // Return updated snake (AI doesn't have boost status)
  return {
    ...snake,
    segments: newSegments,
  };
}
