import { useRef } from "react";
import * as THREE from "three";
import { Snake } from "@/lib/stores/useSnakeGame";

interface SnakeRendererProps {
  snake: Snake;
}

export default function SnakeRenderer({ snake }: SnakeRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  
  return (
    <group ref={groupRef}>
      {snake.segments.map((segment, index) => {
        const isHead = index === 0;
        const radius = isHead ? segment.radius * 1.3 : segment.radius;
        const opacity = Math.max(0.7, 1 - index / snake.segments.length * 0.3);
        
        return (
          <mesh
            key={index}
            position={[segment.position.x, 0.5, segment.position.z]}
          >
            <sphereGeometry args={[radius, 8, 8]} />
            <meshStandardMaterial
              color={snake.color}
              transparent
              opacity={opacity}
              emissive={snake.color}
              emissiveIntensity={isHead ? 0.3 : 0.1}
            />
            {isHead && (
              <>
                {/* Eyes */}
                <mesh position={[0.3, 0.2, 0.3]}>
                  <sphereGeometry args={[0.15, 8, 8]} />
                  <meshStandardMaterial color="white" />
                </mesh>
                <mesh position={[-0.3, 0.2, 0.3]}>
                  <sphereGeometry args={[0.15, 8, 8]} />
                  <meshStandardMaterial color="white" />
                </mesh>
                <mesh position={[0.3, 0.2, 0.35]}>
                  <sphereGeometry args={[0.08, 8, 8]} />
                  <meshStandardMaterial color="black" />
                </mesh>
                <mesh position={[-0.3, 0.2, 0.35]}>
                  <sphereGeometry args={[0.08, 8, 8]} />
                  <meshStandardMaterial color="black" />
                </mesh>
              </>
            )}
          </mesh>
        );
      })}
    </group>
  );
}
