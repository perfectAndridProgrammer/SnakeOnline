import { Pellet } from "@/lib/stores/useSnakeGame";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface PelletsProps {
  pellets: Pellet[];
}

export default function Pellets({ pellets }: PelletsProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh) {
          child.position.y = 0.3 + Math.sin(state.clock.elapsedTime * 2 + index) * 0.1;
          child.rotation.y = state.clock.elapsedTime + index;
        }
      });
    }
  });
  
  return (
    <group ref={groupRef}>
      {pellets.map((pellet) => (
        <mesh
          key={pellet.id}
          position={[pellet.position.x, 0.3, pellet.position.z]}
        >
          <sphereGeometry args={[pellet.size, 6, 6]} />
          <meshStandardMaterial
            color={pellet.color}
            emissive={pellet.color}
            emissiveIntensity={0.5}
          />
        </mesh>
      ))}
    </group>
  );
}
