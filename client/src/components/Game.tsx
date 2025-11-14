import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";
import { useSnakeGame } from "@/lib/stores/useSnakeGame";
import GameScene from "./GameScene";
import GameUI from "./GameUI";

export default function Game() {
  const phase = useSnakeGame((state) => state.phase);
  
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {phase === "playing" && (
        <>
          {/* Three.js Canvas with orthographic camera for true 2D top-down view */}
          <Canvas
            orthographic
            camera={{
              position: [0, 50, 0],  // Camera positioned 50 units above the ground
              zoom: 8,               // Initial zoom level
              near: 0.1,
              far: 1000
            }}
            gl={{
              antialias: true,
              alpha: false,
            }}
          >
            <color attach="background" args={["#1a1a2e"]} />
            <Suspense fallback={null}>
              <GameScene />
            </Suspense>
          </Canvas>
        </>
      )}
      <GameUI />
    </div>
  );
}
