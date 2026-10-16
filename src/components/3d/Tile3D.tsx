import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import { FloorToken, TILE_METADATA } from '../../types/game';
import { getCachedTexture } from './textureCache';

export interface Tile3DProps {
  color: FloorToken;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  selected?: boolean;
  highlighted?: boolean;
  scoringPulse?: boolean;
  ghost?: boolean;
  ghostOpacity?: number;
  interactive?: boolean;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
}

export const Tile3D: React.FC<Tile3DProps> = ({
  color,
  position,
  rotation = [0, 0, 0],
  scale = 1,
  selected = false,
  highlighted = false,
  scoringPulse = false,
  ghost = false,
  ghostOpacity = 0.28,
  interactive = false,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerOver,
  onPointerOut,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const rimRef = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => getCachedTexture(color), [color]);

  const baseTint = useMemo(() => {
    if (color === 'first-player') return '#FAF5E8';
    return TILE_METADATA[color].primaryHex;
  }, [color]);

  const emissiveColor = useMemo(() => {
    if (scoringPulse) return new THREE.Color('#FFB300');
    if (selected) return new THREE.Color('#FFD54F');
    if (highlighted) return new THREE.Color('#4DB6AC');
    return new THREE.Color('#000000');
  }, [scoringPulse, selected, highlighted]);

  const emissiveIntensity = scoringPulse
    ? 0.48
    : selected
      ? 0.34
      : highlighted
        ? 0.22
        : 0;

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const targetY =
      position[1] +
      (selected ? 0.22 : 0) +
      (scoringPulse
        ? Math.sin(state.clock.elapsedTime * 7.5) * 0.045 + 0.08
        : highlighted
          ? 0.06
          : 0);

    const pulseScale = scoringPulse
      ? scale * (1.07 + Math.sin(state.clock.elapsedTime * 7.5) * 0.04)
      : selected
        ? scale * 1.06
        : highlighted
          ? scale * 1.03
          : scale;

    const lerpFactor = Math.min(1, delta * 14);

    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      position[0],
      lerpFactor
    );
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      targetY,
      lerpFactor
    );
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      position[2],
      lerpFactor
    );

    const currentScale = groupRef.current.scale.x;
    const nextScale = THREE.MathUtils.lerp(currentScale, pulseScale, lerpFactor);
    groupRef.current.scale.setScalar(nextScale);

    // Subtle hover/selection tilt for tactile feedback
    const targetRotX =
      rotation[0] + (selected ? Math.sin(state.clock.elapsedTime * 3.2) * 0.05 : 0);
    const targetRotZ =
      rotation[2] + (selected ? Math.cos(state.clock.elapsedTime * 2.7) * 0.04 : 0);

    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetRotX,
      lerpFactor
    );
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      rotation[1],
      lerpFactor
    );
    groupRef.current.rotation.z = THREE.MathUtils.lerp(
      groupRef.current.rotation.z,
      targetRotZ,
      lerpFactor
    );

    if (rimRef.current) {
      const mat = rimRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity =
          scoringPulse || selected
            ? 0.55 + Math.sin(state.clock.elapsedTime * 5) * 0.2
            : highlighted
              ? 0.38
              : 0;
      }
    }
  });

  const opacity = ghost ? ghostOpacity : 1;

  return (
    <group
      ref={groupRef}
      position={[position[0], position[1], position[2]]}
      rotation={rotation}
      scale={scale}
      onClick={interactive ? onClick : undefined}
      onPointerDown={interactive ? onPointerDown : undefined}
      onPointerUp={interactive ? onPointerUp : undefined}
      onPointerOver={interactive ? onPointerOver : undefined}
      onPointerOut={interactive ? onPointerOut : undefined}
    >
      {/* Beveled 3D Ceramic Body with glossy glaze */}
      <RoundedBox
        args={[0.42, 0.11, 0.42]}
        radius={0.035}
        smoothness={4}
        castShadow={!ghost}
        receiveShadow={!ghost}
      >
        <meshPhysicalMaterial
          color={ghost ? '#FFFFFF' : baseTint}
          map={texture}
          clearcoat={1}
          clearcoatRoughness={0.08}
          roughness={0.14}
          metalness={0.04}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity}
          transparent={ghost}
          opacity={opacity}
        />
      </RoundedBox>

      {/* Crisp 1:1 UV-mapped top ceramic glaze face for razor-sharp Portuguese pattern */}
      <mesh
        position={[0, 0.056, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow={!ghost}
      >
        <planeGeometry args={[0.376, 0.376]} />
        <meshPhysicalMaterial
          color="#FFFFFF"
          map={texture}
          clearcoat={1}
          clearcoatRoughness={0.06}
          roughness={0.12}
          metalness={0.03}
          emissive={emissiveColor}
          emissiveIntensity={emissiveIntensity * 0.65}
          transparent={ghost}
          opacity={opacity}
          polygonOffset
          polygonOffsetFactor={-1}
        />
      </mesh>

      {/* Warm Terracotta Bisque Foot Ring underneath */}
      {!ghost && (
        <mesh position={[0, -0.052, 0]}>
          <boxGeometry args={[0.36, 0.012, 0.36]} />
          <meshStandardMaterial color="#D7C4AA" roughness={0.82} />
        </mesh>
      )}

      {/* Golden / Emerald Selection & Scoring Rim Aura */}
      {(selected || highlighted || scoringPulse) && (
        <mesh
          ref={rimRef}
          position={[0, -0.045, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <ringGeometry args={[0.24, 0.31, 32]} />
          <meshBasicMaterial
            color={scoringPulse ? '#FFB300' : selected ? '#FFD54F' : '#26A69A'}
            transparent
            opacity={0.65}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
};
