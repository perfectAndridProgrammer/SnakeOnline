import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import * as THREE from "three";

export type GamePhase = "menu" | "playing" | "gameover";

// Represents a pellet (food) in the game world
export interface Pellet {
  id: string;
  position: THREE.Vector3;
  color: string;
  size: number;
}

// Represents a single segment of a snake's body
export interface SnakeSegment {
  position: THREE.Vector3;
  radius: number;
}

// Represents a snake (player or AI)
export interface Snake {
  id: string;
  name: string;
  segments: SnakeSegment[];  // Array of body segments, head is at index 0
  direction: THREE.Vector3;  // Current movement direction (normalized vector)
  speed: number;             // Units per second
  color: string;
  length: number;            // Target length (grows when eating pellets)
  score: number;             // Current score
  isDead: boolean;
  isBoosting: boolean;       // Whether speed boost is active
}

// Global game state managed by Zustand
interface SnakeGameState {
  phase: GamePhase;
  playerSnake: Snake | null;
  aiSnakes: Snake[];
  pellets: Pellet[];
  mapSize: number;
  // Mouse position in world coordinates (x, z) on the ground plane
  // Updated via raycasting from screen coordinates
  mouseWorldPosition: { x: number; z: number };
  cameraZoom: number;
  
  // Actions
  startGame: () => void;
  endGame: () => void;
  restartGame: () => void;
  updateMousePosition: (x: number, z: number) => void;
  updatePlayerSnake: (snake: Snake) => void;
  updateAISnakes: (snakes: Snake[]) => void;
  updatePellets: (pellets: Pellet[]) => void;
  addPellet: (pellet: Pellet) => void;
  removePellet: (id: string) => void;
  setCameraZoom: (zoom: number) => void;
  setPlayerBoosting: (isBoosting: boolean) => void;
}

// Game constants
const MAP_SIZE = 200;           // World is 200x200 units
const INITIAL_SNAKE_LENGTH = 10;
const SEGMENT_RADIUS = 0.5;

// Helper to generate random color from predefined palette
const randomColor = () => {
  const colors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8",
    "#F7DC6F", "#BB8FCE", "#85C1E2", "#F8B739", "#52B788",
    "#FF85A2", "#FFD93D", "#6BCF7F", "#A8DADC", "#E63946"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// Creates a new snake with initial segments positioned in a line
const createSnake = (id: string, name: string, startX: number, startZ: number): Snake => {
  const segments: SnakeSegment[] = [];
  // Create segments from head to tail, each 1 unit apart
  for (let i = 0; i < INITIAL_SNAKE_LENGTH; i++) {
    segments.push({
      position: new THREE.Vector3(startX - i * 1, 0, startZ),
      radius: SEGMENT_RADIUS,
    });
  }
  
  return {
    id,
    name,
    segments,
    // Initialize with no movement (0,0,0) to prevent drift until mouse moves
    direction: new THREE.Vector3(0, 0, 0),
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
    mouseWorldPosition: { x: 0, z: 0 },
    cameraZoom: 30,
    
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
        const z = Math.sin(angle) * distance;
        aiSnakes.push(createSnake(`ai-${i}`, aiNames[i], x, z));
      }
      
      // Spawn 500 pellets randomly across the map
      const pellets: Pellet[] = [];
      for (let i = 0; i < 500; i++) {
        pellets.push({
          id: `pellet-${i}`,
          position: new THREE.Vector3(
            (Math.random() - 0.5) * MAP_SIZE,  // Random X between -100 and 100
            0,
            (Math.random() - 0.5) * MAP_SIZE   // Random Z between -100 and 100
          ),
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
    
    updateMousePosition: (x: number, z: number) => {
      set({ mouseWorldPosition: { x, z } });
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
