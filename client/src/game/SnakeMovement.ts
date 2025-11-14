import type { Snake, Pellet } from "@/lib/stores/useSnakeGame";
import { distance2D, normalize2D } from "@/lib/stores/useSnakeGame";

export function updateSnakeMovement(
  snake: Snake,
  mouseWorldPosition: { x: number; y: number },
  delta: number,
  isBoosting: boolean,
  pellets: Pellet[],
  mapSize: number
): Snake {
  if (snake.segments.length === 0) return snake;

  const head = snake.segments[0].position;

  if (snake.id === "player") {
    const targetDir = {
      x: mouseWorldPosition.x - head.x,
      y: mouseWorldPosition.y - head.y,
    };

    const distanceToMouse = distance2D({ x: 0, y: 0 }, targetDir);

    if (distanceToMouse > 1.0) {
      snake.direction = normalize2D(targetDir);
    } else {
      snake.direction = { x: 0, y: 0 };
    }
  }

  const speed = isBoosting ? snake.speed * 2 : snake.speed;
  const moveDistance = speed * delta;

  const newHead = {
    x: head.x + snake.direction.x * moveDistance,
    y: head.y + snake.direction.y * moveDistance,
  };

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

  if (isBoosting && snake.id === "player" && snake.length > 10) {
    snake.length = Math.max(10, snake.length - delta * 2);
  }

  return {
    ...snake,
    segments: newSegments,
    isBoosting,
  };
}

export function updateAISnake(
  snake: Snake,
  delta: number,
  pellets: Pellet[],
  mapSize: number,
  playerSnake: Snake,
  allAISnakes: Snake[]
): Snake {
  if (snake.segments.length === 0) return snake;

  const head = snake.segments[0].position;

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
    const direction = {
      x: targetPos.x - head.x,
      y: targetPos.y - head.y,
    };
    snake.direction = normalize2D(direction);
  } else {
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
