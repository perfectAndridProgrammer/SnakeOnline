/**
 * Renderer - Handles all drawing/rendering of game objects
 * 
 * Responsibilities:
 * - Draw the ground/background grid
 * - Draw all pellets (food items)
 * - Draw all snakes (player and AI)
 * - Provide color utilities
 * 
 * Uses Pixi.js Graphics API for efficient 2D vector rendering
 * Graphics are cleared and redrawn each frame (immediate mode rendering)
 */

import * as PIXI from "pixi.js";
import type { Snake, Pellet } from "@/lib/stores/useSnakeGame";

/**
 * Draws the game background with a grid pattern
 * Called every frame to redraw the ground
 * 
 * @param graphics - The Pixi Graphics object to draw with
 * @param mapSize - The total size of the game world (e.g., 200 units)
 */
export function drawGround(graphics: PIXI.Graphics, mapSize: number) {
  // Clear any previous frame's drawing
  // This is necessary because we redraw everything each frame
  graphics.clear();
  
  // STEP 1: Draw the background rectangle
  // Position starts at top-left corner (-mapSize/2, -mapSize/2)
  // This centers the map around world origin (0, 0)
  graphics.rect(-mapSize / 2, -mapSize / 2, mapSize, mapSize);
  
  // Fill with dark blue-grey color (hex color 0x0f0f1e)
  // Slightly lighter than the canvas background for subtle contrast
  graphics.fill(0x0f0f1e);
  
  // STEP 2: Set up grid line styling
  // width: 1 pixel thick lines
  // color: 0x2a2a3e = medium grey-blue
  // alpha: 0.3 = 30% opacity (subtle, doesn't distract from gameplay)
  graphics.setStrokeStyle({ width: 1, color: 0x2a2a3e, alpha: 0.3 });
  
  // Grid spacing in world units (20 = one grid square every 20 units)
  // Smaller values = denser grid, larger values = sparser grid
  const gridSize = 20;
  
  // STEP 3: Draw vertical grid lines
  // Loop from left edge to right edge in gridSize increments
  for (let x = -mapSize / 2; x <= mapSize / 2; x += gridSize) {
    graphics.moveTo(x, -mapSize / 2);  // Start at top of map
    graphics.lineTo(x, mapSize / 2);   // Draw line to bottom of map
  }
  
  // STEP 4: Draw horizontal grid lines
  // Loop from top edge to bottom edge in gridSize increments
  for (let y = -mapSize / 2; y <= mapSize / 2; y += gridSize) {
    graphics.moveTo(-mapSize / 2, y);  // Start at left edge of map
    graphics.lineTo(mapSize / 2, y);   // Draw line to right edge of map
  }
  
  // Apply the stroke to actually render all the grid lines
  graphics.stroke();
}

/**
 * Draws all pellets (food items) on the map
 * Each pellet is a colored circle
 * 
 * @param graphics - The Pixi Graphics object to draw with
 * @param pellets - Array of all pellets to draw
 */
export function drawPellets(graphics: PIXI.Graphics, pellets: Pellet[]) {
  // Clear previous frame's pellets
  graphics.clear();
  
  // Draw each pellet as a colored circle
  for (const pellet of pellets) {
    // Draw circle at pellet position
    // Radius is pellet.size * 2 (size is stored as 0.3, drawn as 0.6 radius)
    graphics.circle(pellet.position.x, pellet.position.y, pellet.size * 2);
    
    // Fill with the pellet's color (each pellet has a random color)
    graphics.fill(pellet.color);
  }
}

/**
 * Draws all snakes (both player and AI)
 * Coordinates drawing of player snake and all AI snakes
 * 
 * @param graphics - The Pixi Graphics object to draw with
 * @param playerSnake - The player's snake
 * @param aiSnakes - Array of all AI-controlled snakes
 */
export function drawSnakes(graphics: PIXI.Graphics, playerSnake: Snake, aiSnakes: Snake[]) {
  // Clear previous frame's snakes
  graphics.clear();
  
  // Draw the player's snake first (renders on bottom layer)
  drawSingleSnake(graphics, playerSnake);
  
  // Draw all AI snakes on top
  for (const snake of aiSnakes) {
    drawSingleSnake(graphics, snake);
  }
}

/**
 * Draws a single snake with all its body segments
 * 
 * Visual design:
 * - Each segment is a circle
 * - Tail segments fade out slightly (opacity decreases toward tail)
 * - Head has a white highlight circle for direction indication
 * 
 * @param graphics - The Pixi Graphics object to draw with
 * @param snake - The snake to draw
 */
function drawSingleSnake(graphics: PIXI.Graphics, snake: Snake) {
  // Safety check - don't try to draw if snake has no segments
  if (snake.segments.length === 0) return;
  
  // STEP 1: Draw all body segments as circles
  for (let i = 0; i < snake.segments.length; i++) {
    const segment = snake.segments[i];
    
    // Calculate opacity fade for tail effect
    // Head (i=0): alpha = 1.0 (fully opaque)
    // Tail (i=length-1): alpha = 0.7 (30% fade)
    // This creates visual depth and shows direction of movement
    const alpha = 1 - (i / snake.segments.length) * 0.3;
    
    // Draw segment as a circle at its position
    graphics.circle(segment.position.x, segment.position.y, segment.radius);
    
    // Fill with snake's color and calculated alpha
    graphics.fill({ color: snake.color, alpha });
  }
  
  // STEP 2: Draw head highlight (white dot)
  // This makes it easy to see which direction the snake is facing
  const head = snake.segments[0];
  
  // Draw smaller circle on top of head (half the radius)
  graphics.circle(head.position.x, head.position.y, head.radius * 0.5);
  
  // Fill with white color (0xffffff)
  graphics.fill(0xffffff);
}

/**
 * Returns a random color from a predefined palette
 * Used for pellets and AI snake colors
 * 
 * @returns Hex color string (e.g., "#FF6B6B")
 */
export function getRandomColor(): string {
  // Curated color palette for visual variety
  // Colors chosen for good contrast against dark background
  const colors = [
    "#FF6B6B",  // Coral red
    "#4ECDC4",  // Turquoise
    "#45B7D1",  // Sky blue
    "#FFA07A",  // Light salmon
    "#98D8C8",  // Mint green
    "#F7DC6F",  // Golden yellow
    "#BB8FCE",  // Lavender
    "#85C1E2",  // Light blue
    "#F8B739",  // Orange
    "#52B788",  // Green
    "#FF85A2",  // Pink
    "#FFD93D",  // Bright yellow
    "#6BCF7F",  // Lime green
    "#A8DADC",  // Powder blue
    "#E63946",  // Red
  ];
  
  // Pick a random index and return that color
  // Math.random() returns 0-1, multiply by array length, floor to get integer index
  return colors[Math.floor(Math.random() * colors.length)];
}
