import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

export type GamePhase = "menu" | "playing" | "gameover";

/**
 * Simple 2D point for positions in the game world
 * 
 * Now using native 2D coordinates instead of THREE.Vector3:
 * - x: horizontal position (left/right)
 * - y: vertical position (up/down)
 * 
 * This is simpler and more efficient than 3D coordinates where
 * we were using (x, 0, z) with y always at 0.
 */
export interface Point2D {
  x: number;
  y: number;
}

// Represents a pellet (food) in the game world
export interface Pellet {
  id: string;
  position: Point2D;  // 2D position on the map
  color: string;
  size: number;
}

// Represents a single segment of a snake's body
export interface SnakeSegment {
  position: Point2D;  // 2D position
  radius: number;
}

// Represents a snake (player or AI)
export interface Snake {
  id: string;
  name: string;
  segments: SnakeSegment[];  // Array of body segments, head is at index 0
  direction: Point2D;  // Current movement direction (normalized vector)
  speed: number;       // Units per second
  color: string;
  length: number;      // Target length (grows when eating pellets)
  score: number;       // Current score
  isDead: boolean;
  isBoosting: boolean; // Whether speed boost is active
}

// Global game state managed by Zustand
interface SnakeGameState {
  phase: GamePhase;
  playerSnake: Snake | null;
  aiSnakes: Snake[];
  pellets: Pellet[];
  mapSize: number;
  // Mouse position in world coordinates (simple 2D point)
  mouseWorldPosition: Point2D;
  cameraZoom: number;
  
  // Actions
  startGame: () => void;
  endGame: () => void;
  restartGame: () => void;
  updateMousePosition: (x: number, y: number) => void;
  updatePlayerSnake: (snake: Snake) => void;
  updateAISnakes: (snakes: Snake[]) => void;
  updatePellets: (pellets: Pellet[]) => void;
  addPellet: (pellet: Pellet) => void;
  removePellet: (id: string) => void;
  setCameraZoom: (zoom: number) => void;
  setPlayerBoosting: (isBoosting: boolean) => void;
}

// Game constants
const MAP_SIZE = 500;           // World is 500x500 units
const INITIAL_SNAKE_LENGTH = 10;
const SEGMENT_RADIUS = 1.5;

// Helper to generate random color from predefined palette
const randomColor = () => {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
    "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739", "#52B788",
    "#FF85A2", "#FFD93D", "#6BCF7F", "#A8DADC", "#E63946"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Calculate distance between two 2D points using Pythagorean theorem
 * distance = √((x2-x1)² + (y2-y1)²)
 */
const distance2D = (p1: Point2D, p2: Point2D): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Normalize a 2D vector (make it length 1 while keeping direction)
 * Used for movement directions: ensures constant speed regardless of direction
 * 
 * Formula: normalized = vector / length
 * Example: {x: 3, y: 4} → length = 5 → normalized = {x: 0.6, y: 0.8}
 * 
 * 
 * Why normalize in a snake game?
 * If the snake moves freely (not grid-based), it might move in ANY direction—diagonal, sideways, up, down.
 * Diagonal movement is naturally faster:
 * Moving (1, 1) means speed = √(1² + 1²) = 1.41
 * Moving (1, 0) means speed = 1
 * This makes diagonal movement unfairly faster.
 * 🙅 Without normalization:
 * Diagonal movement = faster snake
 * 
 * 👍 With normalization:
 * Every direction has speed = 1, so the snake moves smoothly and fairly.
 */
const normalize2D = (point: Point2D): Point2D => {
  const len = Math.sqrt(point.x * point.x + point.y * point.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: point.x / len, y: point.y / len };
};

// Creates a new snake with initial segments positioned in a line
const createSnake = (id: string, name: string, startX: number, startY: number): Snake => {
  const segments: SnakeSegment[] = [];
  // Create segments from head to tail, each 1 unit apart (moving left along X axis)
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    segments.push({
      position: { x: startX - i * 1, y: startY },
      radius: SEGMENT_RADIUS,
    });
  }
  
  return {
    id,
    name,
    segments,
    // Initialize with no movement (0,0) to prevent drift until mouse moves
    direction: { x: 0, y: 0 },
    speed: 5,
    color: randomColor(),
    length: INITIAL_SNAKE_LENGTH,
    score: INITIAL_SNAKE_LENGTH,
    isDead: false,
    isBoosting: false,
  };
};

export const useSnakeGame = create<SnakeGameState>()(
  subscribeWithSelector((set, get) => ({
    phase: "menu",
    playerSnake: null,
    aiSnakes: [],
    pellets: [],
    mapSize: MAP_SIZE,
    mouseWorldPosition: { x: 0, y: 0 },
    cameraZoom: 12,
    
    startGame: () => {
      // Create player snake at origin (center of map)
      const playerSnake = createSnake("player", "You", 0, 0);
      
      // Create AI snakes positioned in a circle around the map
      const aiSnakes: Snake[] = [];
      const aiNames = ["SlitherKing", "SnakeMaster", "VenomBite", "CobraKai", "PyThon", "Anaconda", "Viper"];
      for (let i = 0; i < 7; i++) {
        // Distribute AI snakes evenly around a circle
        const angle = (i / 7) * Math.PI * 2;
        const distance = 50 + Math.random() * 30;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        aiSnakes.push(createSnake(`ai-${i}`, aiNames[i], x, y));
      }
      
      // Spawn 500 pellets randomly across the map
      const pellets: Pellet[] = [];
      for (let i = 0; i < 500; i++) {
        pellets.push({
          id: `pellet-${i}`,
          position: {
            x: (Math.random() - 0.5) * MAP_SIZE,  // Random X between -100 and 100
            y: (Math.random() - 0.5) * MAP_SIZE   // Random Y between -100 and 100
          },
          color: randomColor(),
          size: 0.3,
        });
      }
      
      set({ 
        phase: "playing", 
        playerSnake, 
        aiSnakes,
        pellets,
      });
    },
    
    endGame: () => {
      set({ phase: "gameover" });
    },
    
    restartGame: () => {
      const { startGame } = get();
      set({ 
        phase: "menu",
        playerSnake: null,
        aiSnakes: [],
        pellets: [],
      });
      setTimeout(() => startGame(), 100);
    },
    
    updateMousePosition: (x: number, y: number) => {
      set({ mouseWorldPosition: { x, y } });
    },
    
    updatePlayerSnake: (snake: Snake) => {
      set({ playerSnake: snake });
    },
    
    updateAISnakes: (snakes: Snake[]) => {
      set({ aiSnakes: snakes });
    },
    
    updatePellets: (pellets: Pellet[]) => {
      set({ pellets });
    },
    
    addPellet: (pellet: Pellet) => {
      set((state) => ({
        pellets: [...state.pellets, pellet],
      }));
    },
    
    removePellet: (id: string) => {
      set((state) => ({
        pellets: state.pellets.filter((p) => p.id !== id),
      }));
    },
    
    setCameraZoom: (zoom: number) => {
      set({ cameraZoom: zoom });
    },
    
    setPlayerBoosting: (isBoosting: boolean) => {
      set((state) => {
        if (state.playerSnake) {
          return {
            playerSnake: { ...state.playerSnake, isBoosting },
          };
        }
        return {};
      });
    },
  }))
);

// Export helper functions for use in game logic
export { distance2D, normalize2D };
