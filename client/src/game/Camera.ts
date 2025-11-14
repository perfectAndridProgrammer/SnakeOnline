import * as PIXI from "pixi.js";
import type { Snake } from "@/lib/stores/useSnakeGame";

export class Camera {
  private initialZoomComplete = false;
  
  private readonly baseZoom = 8.0;
  private readonly minZoom = 4.0;
  private readonly zoomScale = 0.015;
  private readonly positionLerpFactor = 0.1;

  update(
    gameContainer: PIXI.Container,
    playerSnake: Snake,
    screenWidth: number,
    screenHeight: number
  ) {
    if (playerSnake.segments.length === 0) return;

    const head = playerSnake.segments[0].position;
    
    const targetZoom = Math.max(
      this.minZoom,
      this.baseZoom - (playerSnake.length - 10) * this.zoomScale
    );
    
    gameContainer.pivot.x += (head.x - gameContainer.pivot.x) * this.positionLerpFactor;
    gameContainer.pivot.y += (head.y - gameContainer.pivot.y) * this.positionLerpFactor;
    
    gameContainer.position.set(screenWidth / 2, screenHeight / 2);
    
    const zoomDifference = Math.abs(targetZoom - gameContainer.scale.x);
    
    if (!this.initialZoomComplete && zoomDifference < 0.1) {
      this.initialZoomComplete = true;
    }
    
    const zoomLerpFactor = this.initialZoomComplete ? 0.05 : 0.001;
    gameContainer.scale.x += (targetZoom - gameContainer.scale.x) * zoomLerpFactor;
    gameContainer.scale.y += (targetZoom - gameContainer.scale.y) * zoomLerpFactor;
  }
}
