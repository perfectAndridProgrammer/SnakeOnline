import type { Snake } from "@/lib/stores/useSnakeGame";
import { distance2D } from "@/lib/stores/useSnakeGame";

export class DebugManager {
  private frameCounter = 0;

  log(
    debugMode: boolean,
    state: any,
    playerSnake: Snake,
    gameContainer: { pivot: { x: number; y: number }; scale: { x: number } },
    fps: number,
    deltaTime: number
  ) {
    this.frameCounter++;
    
    if (this.frameCounter % 60 === 0 && debugMode) {
      console.group("🎮 Game Debug Info");
      
      console.log("📱 Screen:", {
        width: window.innerWidth,
        height: window.innerHeight,
        ratio: (window.innerWidth / window.innerHeight).toFixed(2)
      });
      
      console.log("🗺️ Map:", {
        size: state.mapSize,
        bounds: `${-state.mapSize/2} to ${state.mapSize/2}`
      });
      
      console.log("🐍 Player Snake:", {
        position: playerSnake.segments[0].position,
        length: playerSnake.length,
        score: playerSnake.score,
        segments: playerSnake.segments.length,
        speed: playerSnake.speed,
        isBoosting: playerSnake.isBoosting
      });
      
      console.log("🖱️ Mouse:", {
        worldPosition: state.mouseWorldPosition,
        distance: distance2D(
          playerSnake.segments[0].position,
          state.mouseWorldPosition
        ).toFixed(2)
      });
      
      console.log("📷 Camera:", {
        pivot: gameContainer.pivot,
        scale: gameContainer.scale.x.toFixed(3),
      });
      
      console.log("🎯 Game State:", {
        pellets: state.pellets.length,
        aiSnakes: state.aiSnakes.length,
        fps: fps.toFixed(1),
        deltaTime: deltaTime.toFixed(3)
      });
      
      console.groupEnd();
    }
  }
}
