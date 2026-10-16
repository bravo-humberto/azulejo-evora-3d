import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { FactoryDisplay, TileColor, DraftSelection } from '../../types/game';
import { getCachedTexture } from './textureCache';
import { Tile3D } from './Tile3D';

export interface SelectSourcePayload {
  sourceType: 'factory' | 'center';
  factoryId?: number;
  color: TileColor;
  worldOrigin?: [number, number, number];
}

export interface FactoryDisplay3DProps {
  factory: FactoryDisplay;
  position: [number, number, number];
  draftSelection: DraftSelection | null;
  interactive: boolean;
  onSelectSource: (payload: SelectSourcePayload) => void;
  onStartDrag?: (payload: SelectSourcePayload) => void;
}

const TILE_SLOT_OFFSETS: [number, number, number][] = [
  [-0.25, 0.12, -0.25],
  [0.25, 0.12, -0.25],
  [-0.25, 0.12, 0.25],
  [0.25, 0.12, 0.25],
];

export const FactoryDisplay3D: React.FC<FactoryDisplay3DProps> = ({
  factory,
  position,
  draftSelection,
  interactive,
  onSelectSource,
  onStartDrag,
}) => {
  const [hoveredColor, setHoveredColor] = useState<TileColor | null>(null);
  const coasterTexture = useMemo(() => getCachedTexture('factory-coaster'), []);

  const isSelectedFactory =
    draftSelection?.sourceType === 'factory' &&
    draftSelection.factoryId === factory.id;

  const handleTileAction = (
    e: ThreeEvent<MouseEvent | PointerEvent>,
    color: TileColor,
    slotOffset: [number, number, number],
    isDragStart: boolean
  ) => {
    e.stopPropagation();
    if (!interactive) return;

    const worldOrigin: [number, number, number] = [
      position[0] + slotOffset[0],
      position[1] + slotOffset[1] + 0.22,
      position[2] + slotOffset[2],
    ];

    const payload: SelectSourcePayload = {
      sourceType: 'factory',
      factoryId: factory.id,
      color,
      worldOrigin,
    };

    onSelectSource(payload);
    if (isDragStart && onStartDrag) {
      onStartDrag(payload);
    }
  };

  return (
    <group position={position}>
      {/* Terracotta Coaster Base */}
      <mesh position={[0, 0.03, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.78, 0.84, 0.07, 40]} />
        <meshStandardMaterial
          color="#C26A45"
          roughness={0.55}
          metalness={0.05}
        />
      </mesh>

      {/* Raised Ceramic Lip Rim */}
      <mesh
        position={[0, 0.068, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        castShadow
        receiveShadow
      >
        <torusGeometry args={[0.75, 0.04, 16, 48]} />
        <meshPhysicalMaterial
          color={isSelectedFactory ? '#FFD54F' : '#1565C0'}
          roughness={0.22}
          clearcoat={0.9}
          emissive={isSelectedFactory ? new THREE.Color('#FFA000') : new THREE.Color('#000000')}
          emissiveIntensity={isSelectedFactory ? 0.35 : 0}
        />
      </mesh>

      {/* Hand-Painted Moorish Coaster Medallion Top Surface */}
      <mesh
        position={[0, 0.067, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <circleGeometry args={[0.73, 40]} />
        <meshPhysicalMaterial
          color="#FFFFFF"
          map={coasterTexture}
          roughness={0.25}
          clearcoat={0.75}
          clearcoatRoughness={0.15}
        />
      </mesh>

      {/* Up to 4 Azulejo Tiles in 2x2 grid */}
      {factory.tiles.map((color, idx) => {
        const offset = TILE_SLOT_OFFSETS[idx] ?? [0, 0.12, 0];
        const isSelected = isSelectedFactory && draftSelection?.color === color;
        const isHighlighted =
          !isSelected && hoveredColor !== null && hoveredColor === color;

        return (
          <Tile3D
            key={`${factory.id}-${idx}-${color}`}
            color={color}
            position={offset}
            selected={isSelected}
            highlighted={isHighlighted}
            interactive={interactive}
            onClick={(e) => handleTileAction(e, color, offset, false)}
            onPointerDown={(e) => handleTileAction(e, color, offset, true)}
            onPointerOver={(e) => {
              e.stopPropagation();
              if (interactive) {
                setHoveredColor(color);
                document.body.style.cursor = 'pointer';
              }
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              setHoveredColor(null);
              document.body.style.cursor = 'auto';
            }}
          />
        );
      })}
    </group>
  );
};
