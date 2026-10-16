import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Line } from '@react-three/drei';

export interface ScoringBeamSegment {
  from: [number, number, number];
  to: [number, number, number];
}

export interface ParabolicArc3DProps {
  from: [number, number, number] | null;
  to: [number, number, number] | null;
  valid?: boolean;
  arcHeight?: number;
  scoringBeams?: ScoringBeamSegment[];
}

export const ParabolicArc3D: React.FC<ParabolicArc3DProps> = ({
  from,
  to,
  valid = true,
  arcHeight = 1.35,
  scoringBeams = [],
}) => {
  const arcPoints = useMemo(() => {
    if (!from || !to) return null;

    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
    const distance = start.distanceTo(end);
    mid.y = Math.max(start.y, end.y) + Math.min(arcHeight, 0.55 + distance * 0.28);

    const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
    return curve.getPoints(32);
  }, [from, to, arcHeight]);

  const primaryColor = valid ? '#FFD54F' : '#EF5350';
  const coreColor = valid ? '#FFF8E1' : '#FFCDD2';

  return (
    <group>
      {/* Active Drafting Parabolic Trajectory Arc */}
      {arcPoints && to && (
        <group>
          {/* Outer Golden Halo Line */}
          <Line
            points={arcPoints}
            color={primaryColor}
            lineWidth={4.5}
            transparent
            opacity={0.75}
          />
          {/* Inner Bright Core Line */}
          <Line
            points={arcPoints}
            color={coreColor}
            lineWidth={2}
            dashed
            dashScale={4}
            dashSize={0.35}
            dashOffset={0}
            transparent
            opacity={0.95}
          />

          {/* Target Landing Pulse Ring */}
          <mesh
            position={[to[0], to[1] + 0.02, to[2]]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.16, 0.25, 32]} />
            <meshBasicMaterial
              color={primaryColor}
              transparent
              opacity={0.85}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      )}

      {/* Golden Light Beam Connectors for Wall-Tiling Adjacency Chains */}
      {scoringBeams.map((beam, idx) => {
        const start = new THREE.Vector3(...beam.from);
        const end = new THREE.Vector3(...beam.to);
        const mid = new THREE.Vector3().lerpVectors(start, end, 0.5);
        mid.y += 0.14;
        const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
        const pts = curve.getPoints(16);

        return (
          <group key={`beam-${idx}`}>
            <Line
              points={pts}
              color="#FFB300"
              lineWidth={5}
              transparent
              opacity={0.88}
            />
            <Line
              points={pts}
              color="#FFF8E1"
              lineWidth={2.2}
              transparent
              opacity={0.98}
            />
          </group>
        );
      })}
    </group>
  );
};
