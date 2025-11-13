import { useSnakeGame } from "@/lib/stores/useSnakeGame";
import * as THREE from "three";

export default function Ground() {
  const mapSize = useSnakeGame((state) => state.mapSize);
  
  return (
    <>
      {/* Main ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[mapSize, mapSize]} />
        <meshStandardMaterial color="#0f3460" />
      </mesh>
      
      {/* Grid lines */}
      <gridHelper args={[mapSize, 40, "#16213e", "#16213e"]} position={[0, 0.01, 0]} />
      
      {/* Border */}
      <lineSegments>
        <edgesGeometry
          args={[new THREE.BoxGeometry(mapSize, 0.1, mapSize)]}
        />
        <lineBasicMaterial color="#e94560" linewidth={2} />
      </lineSegments>
    </>
  );
}
