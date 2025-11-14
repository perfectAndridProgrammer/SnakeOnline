import * as PIXI from "pixi.js";
import type { Snake, Pellet } from "@/lib/stores/useSnakeGame";

export function drawGround(graphics: PIXI.Graphics, mapSize: number) {
  graphics.clear();
  
  graphics.rect(-mapSize / 2, -mapSize / 2, mapSize, mapSize);
  graphics.fill(0x0f0f1e);
  
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

export function drawPellets(graphics: PIXI.Graphics, pellets: Pellet[]) {
  graphics.clear();
  
  for (const pellet of pellets) {
    graphics.circle(pellet.position.x, pellet.position.y, pellet.size * 2);
    graphics.fill(pellet.color);
  }
}

export function drawSnakes(graphics: PIXI.Graphics, playerSnake: Snake, aiSnakes: Snake[]) {
  graphics.clear();
  
  drawSingleSnake(graphics, playerSnake);
  
  for (const snake of aiSnakes) {
    drawSingleSnake(graphics, snake);
  }
}

function drawSingleSnake(graphics: PIXI.Graphics, snake: Snake) {
  if (snake.segments.length === 0) return;
  
  for (let i = 0; i < snake.segments.length; i++) {
    const segment = snake.segments[i];
    const alpha = 1 - (i / snake.segments.length) * 0.3;
    
    graphics.circle(segment.position.x, segment.position.y, segment.radius);
    graphics.fill({ color: snake.color, alpha });
  }
  
  const head = snake.segments[0];
  graphics.circle(head.position.x, head.position.y, head.radius * 0.5);
  graphics.fill(0xffffff);
}

export function getRandomColor(): string {
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
