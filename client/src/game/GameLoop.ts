import * as PIXI from "pixi.js";
import { useSnakeGame } from "@/lib/stores/useSnakeGame";
import { InputManager } from "./InputManager";
import { Camera } from "./Camera";
import { DebugManager } from "./DebugManager";
import { updateSnakeMovement, updateAISnake } from "./SnakeMovement";
import { checkPelletCollisions, checkSnakeCollisions } from "./CollisionDetection";
import { drawGround, drawPellets, drawSnakes, getRandomColor } from "./Renderer";

export class GameLoop {
  private inputManager: InputManager;
  private camera: Camera;
  private debugManager: DebugManager;
  private tickerCallback: ((ticker: PIXI.Ticker) => void) | null = null;

  constructor(
    inputManager: InputManager,
    camera: Camera,
    debugManager: DebugManager
  ) {
    this.inputManager = inputManager;
    this.camera = camera;
    this.debugManager = debugManager;
  }

  start(
    app: PIXI.Application,
    gameContainer: PIXI.Container,
    groundGraphics: PIXI.Graphics,
    snakeGraphics: PIXI.Graphics,
    pelletGraphics: PIXI.Graphics
  ) {
    this.tickerCallback = (ticker) => {
      const delta = ticker.deltaTime / 60;
      const state = useSnakeGame.getState();
      
      if (!state.playerSnake) return;

      const isBoosting = this.inputManager.isKeyPressed("Space");
      if (isBoosting !== state.playerSnake.isBoosting) {
        state.setPlayerBoosting(isBoosting);
      }

      const updatedPlayer = updateSnakeMovement(
        state.playerSnake,
        state.mouseWorldPosition,
        delta,
        isBoosting,
        state.pellets,
        state.mapSize
      );

      const { snake: newPlayerSnake, collectedPellets } = checkPelletCollisions(
        updatedPlayer,
        state.pellets
      );

      collectedPellets.forEach((pelletId) => {
        state.removePellet(pelletId);
        state.addPellet({
          id: `pellet-${Date.now()}-${Math.random()}`,
          position: {
            x: (Math.random() - 0.5) * state.mapSize,
            y: (Math.random() - 0.5) * state.mapSize,
          },
          color: getRandomColor(),
          size: 0.3,
        });
      });

      const playerHitSnake = checkSnakeCollisions(newPlayerSnake, state.aiSnakes);
      if (playerHitSnake) {
        state.endGame();
        return;
      }

      state.updatePlayerSnake(newPlayerSnake);

      const aiCollectedPellets: string[] = [];
      const updatedAI = state.aiSnakes.map((aiSnake) => {
        const updated = updateAISnake(
          aiSnake,
          delta,
          state.pellets,
          state.mapSize,
          newPlayerSnake,
          state.aiSnakes
        );
        const { snake: finalSnake, collectedPellets: aiPellets } =
          checkPelletCollisions(updated, state.pellets);
        aiCollectedPellets.push(...aiPellets);
        return finalSnake;
      });

      aiCollectedPellets.forEach((pelletId) => {
        state.removePellet(pelletId);
        state.addPellet({
          id: `pellet-${Date.now()}-${Math.random()}`,
          position: {
            x: (Math.random() - 0.5) * state.mapSize,
            y: (Math.random() - 0.5) * state.mapSize,
          },
          color: getRandomColor(),
          size: 0.3,
        });
      });

      state.updateAISnakes(updatedAI);

      this.debugManager.log(
        this.inputManager.isDebugMode(),
        state,
        newPlayerSnake,
        gameContainer,
        app.ticker.FPS,
        ticker.deltaTime
      );

      this.camera.update(
        gameContainer,
        newPlayerSnake,
        app.screen.width,
        app.screen.height
      );

      drawGround(groundGraphics, state.mapSize);
      drawPellets(pelletGraphics, state.pellets);
      drawSnakes(snakeGraphics, newPlayerSnake, updatedAI);
    };
    
    app.ticker.add(this.tickerCallback);
  }

  stop(app: PIXI.Application) {
    if (this.tickerCallback) {
      app.ticker.remove(this.tickerCallback);
      this.tickerCallback = null;
    }
  }
}
