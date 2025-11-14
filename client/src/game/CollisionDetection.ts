import type { Snake, Pellet } from "@/lib/stores/useSnakeGame";
import { distance2D } from "@/lib/stores/useSnakeGame";

export function checkPelletCollisions(snake: Snake, pellets: Pellet[]) {
  const collectedPellets: string[] = [];
  const head = snake.segments[0].position;

  for (const pellet of pellets) {
    const dist = distance2D(head, pellet.position);
    if (dist < 1.5) {
      collectedPellets.push(pellet.id);
      snake.length += 1;
      snake.score += 1;
    }
  }

  return { snake, collectedPellets };
}

export function checkSnakeCollisions(playerSnake: Snake, aiSnakes: Snake[]): boolean {
  const head = playerSnake.segments[0].position;

  for (const aiSnake of aiSnakes) {
    for (let i = 3; i < aiSnake.segments.length; i++) {
      const segment = aiSnake.segments[i];
      const dist = distance2D(head, segment.position);
      if (dist < 1) {
        return true;
      }
    }
  }

  for (let i = 5; i < playerSnake.segments.length; i++) {
    const segment = playerSnake.segments[i];
    const dist = distance2D(head, segment.position);
    if (dist < 0.8) {
      return true;
    }
  }

  return false;
}
