import * as PIXI from "pixi.js";
import { useSnakeGame } from "@/lib/stores/useSnakeGame";

export class InputManager {
  private keysPressed = new Set<string>();
  private debugMode = false;
  private gameContainer: PIXI.Container | null = null;

  constructor() {
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.keysPressed.add(e.code);
    
    if (e.code === "KeyD") {
      this.debugMode = !this.debugMode;
      console.log(`🔍 Debug mode: ${this.debugMode ? "ON" : "OFF"}`);
    }
  }
  
  private handleKeyUp(e: KeyboardEvent) {
    this.keysPressed.delete(e.code);
  }
  
  private handleMouseMove(e: MouseEvent) {
    if (!this.gameContainer) return;
    
    const screenX = e.clientX - window.innerWidth / 2;
    const screenY = e.clientY - window.innerHeight / 2;
    
    const zoomedX = screenX / this.gameContainer.scale.x;
    const zoomedY = screenY / this.gameContainer.scale.y;
    
    const worldX = zoomedX + this.gameContainer.pivot.x;
    const worldY = zoomedY + this.gameContainer.pivot.y;
    
    useSnakeGame.getState().updateMousePosition(worldX, worldY);
  }

  attach(gameContainer: PIXI.Container) {
    this.gameContainer = gameContainer;
    
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("mousemove", this.handleMouseMove);

    return () => {
      window.removeEventListener("keydown", this.handleKeyDown);
      window.removeEventListener("keyup", this.handleKeyUp);
      window.removeEventListener("mousemove", this.handleMouseMove);
    };
  }

  isKeyPressed(key: string): boolean {
    return this.keysPressed.has(key);
  }

  isDebugMode(): boolean {
    return this.debugMode;
  }
}
