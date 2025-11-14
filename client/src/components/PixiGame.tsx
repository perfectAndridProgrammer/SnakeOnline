import { useEffect, useRef } from "react";
import * as PIXI from "pixi.js";
import { useSnakeGame } from "@/lib/stores/useSnakeGame";
import GameUI from "./GameUI";
import { InputManager } from "@/game/InputManager";
import { Camera } from "@/game/Camera";
import { DebugManager } from "@/game/DebugManager";
import { GameLoop } from "@/game/GameLoop";

export default function PixiGame() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<PIXI.Application | null>(null);
  const phase = useSnakeGame((state) => state.phase);

  useEffect(() => {
    if (!canvasRef.current || phase !== "playing") return;

    let cleanupInput: (() => void) | null = null;
    let app: PIXI.Application | null = null;
    let gameLoop: GameLoop | null = null;
    let mounted = true;

    const initializeGame = async () => {
      app = new PIXI.Application();
      
      await app.init({
        width: window.innerWidth,
        height: window.innerHeight,
        backgroundColor: 0x1a1a2e,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (!mounted || !canvasRef.current) {
        app.destroy(true, { children: true });
        return;
      }
      
      canvasRef.current.appendChild(app.canvas);
      appRef.current = app;

      const gameContainer = new PIXI.Container();
      app.stage.addChild(gameContainer);

      const groundGraphics = new PIXI.Graphics();
      const snakeGraphics = new PIXI.Graphics();
      const pelletGraphics = new PIXI.Graphics();
      
      gameContainer.addChild(groundGraphics);
      gameContainer.addChild(pelletGraphics);
      gameContainer.addChild(snakeGraphics);

      const inputManager = new InputManager();
      const camera = new Camera();
      const debugManager = new DebugManager();
      gameLoop = new GameLoop(inputManager, camera, debugManager);

      cleanupInput = inputManager.attach(gameContainer);

      gameLoop.start(app, gameContainer, groundGraphics, snakeGraphics, pelletGraphics);
    };

    initializeGame();

    return () => {
      mounted = false;
      
      if (cleanupInput) {
        cleanupInput();
      }
      
      if (app && gameLoop) {
        gameLoop.stop(app);
        
        if (app.canvas && app.canvas.parentNode) {
          app.canvas.parentNode.removeChild(app.canvas);
        }
        
        app.destroy(true, { children: true });
      }
      
      appRef.current = null;
    };
  }, [phase]);

  return (
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <div ref={canvasRef} />
      <GameUI />
    </div>
  );
}
