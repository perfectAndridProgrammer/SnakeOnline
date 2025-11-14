/**
 * CollisionDetection - Handles all collision detection in the game
 * 
 * Responsibilities:
 * - Check if snake head collides with pellets (food)
 * - Check if player snake collides with AI snakes (game over)
 * - Check if player snake collides with itself (game over)
 * 
 * Uses simple circle-to-circle collision detection based on distance
 */

import type { Snake, Pellet } from "@/lib/stores/useSnakeGame";
import { distance2D } from "@/lib/stores/useSnakeGame";

/**
 * Checks if a snake's head collides with any pellets
 * When a pellet is collected, the snake grows longer and gains a point
 * 
 * @param snake - The snake to check collisions for
 * @param pellets - Array of all pellets in the game
 * @returns Object containing the updated snake and IDs of collected pellets
 */
export function checkPelletCollisions(snake: Snake, pellets: Pellet[]) {
  // Array to store IDs of pellets that were collected this frame
  const collectedPellets: string[] = [];
  
  // Get the snake's head position (first segment)
  // Only the head can collect pellets, not the body
  const head = snake.segments[0].position;

  // Check each pellet for collision with the snake's head
  for (const pellet of pellets) {
    // Calculate distance between pellet center and snake head center
    const dist = distance2D(head, pellet.position);
    
    // Collision radius of 1.5 units
    // If distance is less than 1.5, the circles overlap = collision detected
    if (dist < 1.5) {
      // Record this pellet as collected (will be removed and respawned)
      collectedPellets.push(pellet.id);
      
      // Grow the snake by 1 unit of length
      snake.length += 1;
      
      // Increase score by 1 point
      snake.score += 1;
    }
  }

  // Return the modified snake and list of collected pellet IDs
  return { snake, collectedPellets };
}

/**
 * Checks if the player snake collides with any AI snakes or itself
 * Returns true if collision detected (game over), false otherwise
 * 
 * @param playerSnake - The player's snake
 * @param aiSnakes - Array of all AI-controlled snakes
 * @returns true if collision detected (game over), false otherwise
 */
export function checkSnakeCollisions(playerSnake: Snake, aiSnakes: Snake[]): boolean {
  // Get the player's head position
  const head = playerSnake.segments[0].position;

  // CHECK 1: Collision with AI snakes
  for (const aiSnake of aiSnakes) {
    // Start checking from segment 3 (skip the head and first 2 body segments)
    // This prevents head-to-head collisions from being instant death
    // Allows for some near-miss gameplay where snakes can cross paths closely
    for (let i = 3; i < aiSnake.segments.length; i++) {
      const segment = aiSnake.segments[i];
      
      // Calculate distance between player's head and AI snake segment
      const dist = distance2D(head, segment.position);
      
      // Collision radius of 1.0 unit
      // If player's head touches AI snake's body, game over
      if (dist < 1) {
        return true; // Collision detected - game over!
      }
    }
  }

  // CHECK 2: Self-collision (snake hitting its own tail)
  // Start from segment 5 to give the snake some flexibility
  // The first few segments can't be hit because they're always close to the head
  for (let i = 5; i < playerSnake.segments.length; i++) {
    const segment = playerSnake.segments[i];
    
    // Calculate distance between head and this body segment
    const dist = distance2D(head, segment.position);
    
    // Smaller collision radius (0.8) for self-collision
    // Makes it slightly easier to navigate tight turns without dying
    if (dist < 0.8) {
      return true; // Self-collision detected - game over!
    }
  }

  // No collisions detected - safe to continue
  return false;
}
