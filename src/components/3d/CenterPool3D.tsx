import React, { useMemo, useState } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import {
  CenterPool,
  TileColor,
  DraftSelection,
  ALL_TILE_COLORS,
  TILE_METADATA,
} from '../../types/game';
import { Tile3D } from './Tile3D';
import { SelectSourcePayload } from './FactoryDisplay3D';

export interface CenterPool3DProps {
  center: CenterPool;
  position: [number, number, number];
  draftSelection: DraftSelection | null;
  interactive: boolean;
  onSelectSource: (payload: SelectSourcePayload) => void;
  onStartDrag?: (payload: SelectSourcePayload) => void;
}

const CLUSTER_ANCHORS: Record<TileColor, [number, number]> = {
  blue: [-0.74, -0.52],
  yellow: [0.74, -0.52],
  red: [-0.82, 0.36],
  black: [0.82, 0.36],
  teal: [0, 0.68],
};

export const CenterPool3D: React.FC<CenterPool3DProps> = ({
  center,
  position,
  draftSelection,
  interactive,
  onSelectSource,
  onStartDrag,
}) => {
  const [hoveredColor, setHoveredColor] = useState<TileColor | null>(null);

  const groupedByColor = useMemo(() => {
    const counts: Record<TileColor, number> = {
      blue: 0,
      yellow: 0,
      red: 0,
      black: 0,
      teal: 0,
    };
    for (const t of center.tiles) {
      counts[t] = (counts[t] || 0) + 1;
    }
    return counts;
  }, [center.tiles]);

  const isSelectedCenter = draftSelection?.sourceType === 'center';

  const handleClusterAction = (
    e: ThreeEvent<MouseEvent | PointerEvent>,
    color: TileColor,
    localOffset: [number, number, number],
    isDragStart: boolean
  ) => {
    e.stopPropagation();
    if (!interactive) return;

    const worldOrigin: [number, number, number] = [
      position[0] + localOffset[0],
      position[1] + localOffset[1] + 0.24,
      position[2] + localOffset[2],
    ];

    const payload: SelectSourcePayload = {
      sourceType: 'center',
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
      {/* Sunken Octagonal/Circular Limestone Courtyard Basin */}
      <mesh position={[0, 0.015, 0]} receiveShadow>
        <cylinderGeometry args={[1.45, 1.52, 0.03, 48]} />
        <meshStandardMaterial
          color="#EAE0D0"
          roughness={0.72}
          metalness={0.04}
        />
      </mesh>

      {/* Ornate Cobalt & Gold Inlaid Courtyard Border Ring */}
      <mesh
        position={[0, 0.032, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <ringGeometry args={[1.36, 1.46, 48]} />
        <meshPhysicalMaterial
          color="#1565C0"
          roughness={0.25}
          clearcoat={0.8}
        />
      </mesh>

      <mesh
        position={[0, 0.033, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <ringGeometry args={[1.32, 1.35, 48]} />
        <meshStandardMaterial
          color="#D99B26"
          roughness={0.35}
          metalness={0.45}
        />
      </mesh>

      {/* Starting Player "1" Ceramic Token in the heart of the courtyard */}
      {center.hasFirstPlayerToken && (
        <group position={[0, 0, -0.06]}>
          <Tile3D
            color="first-player"
            position={[0, 0.09, 0]}
            selected={isSelectedCenter}
            highlighted={hoveredColor !== null}
            interactive={false}
          />
          <Html
            position={[0, 0.42, 0]}
            center
            distanceFactor={11}
            style={{ pointerEvents: 'none' }}
          >
            <div className="px-1.5 py-0.5 rounded-full bg-amber-900/90 text-amber-100 text-[9px] font-bold tracking-wider uppercase shadow border border-amber-400/50 whitespace-nowrap">
              1st (-1)
            </div>
          </Html>
        </group>
      )}

      {/* Color-grouped tile clusters */}
      {ALL_TILE_COLORS.map((color) => {
        const count = groupedByColor[color];
        if (count === 0) return null;

        const [anchorX, anchorZ] = CLUSTER_ANCHORS[color];
        const isSelected = isSelectedCenter && draftSelection?.color === color;
        const isHighlighted = !isSelected && hoveredColor === color;

        // Render up to 6 visible tiles in a neat staggered fan/stack for this color
        const visibleCount = Math.min(count, 6);
        const clusterTiles: [number, number, number][] = [];

        for (let i = 0; i < visibleCount; i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const offsetX =
            anchorX + (col === 0 ? -0.19 : 0.19) * (visibleCount === 1 ? 0 : 1);
          const offsetZ = anchorZ + (row - 0.5) * 0.24;
          const offsetY = 0.09 + row * 0.03;
          clusterTiles.push([offsetX, offsetY, offsetZ]);
        }

        const primaryAnchor: [number, number, number] = [
          anchorX,
          0.14,
          anchorZ,
        ];

        return (
          <group key={color}>
            {/* Generous invisible hitbox over the entire color cluster for effortless thumb tap */}
            <mesh
              position={[anchorX, 0.15, anchorZ]}
              onClick={(e) =>
                handleClusterAction(e, color, primaryAnchor, false)
              }
              onPointerDown={(e) =>
                handleClusterAction(e, color, primaryAnchor, true)
              }
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
            >
              <cylinderGeometry args={[0.46, 0.46, 0.28, 20]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {clusterTiles.map((tPos, idx) => (
              <Tile3D
                key={`${color}-${idx}`}
                color={color}
                position={tPos}
                scale={0.92}
                selected={isSelected}
                highlighted={isHighlighted}
                interactive={interactive}
                onClick={(e) => handleClusterAction(e, color, tPos, false)}
                onPointerDown={(e) => handleClusterAction(e, color, tPos, true)}
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
            ))}

            {/* Subtle Count Badge for clear visual readout */}
            <Html
              position={[anchorX, isSelected ? 0.58 : 0.38, anchorZ]}
              center
              distanceFactor={11}
              style={{ pointerEvents: 'none' }}
            >
              <div
                className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-md border transition-transform"
                style={{
                  backgroundColor: TILE_METADATA[color].primaryHex,
                  color: '#FFFFFF',
                  borderColor: isSelected
                    ? '#FFD54F'
                    : TILE_METADATA[color].accentHex,
                  transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                }}
              >
                ×{count}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
};
