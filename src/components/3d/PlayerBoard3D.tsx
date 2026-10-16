import React, { useState, useMemo } from 'react';
import * as THREE from 'three';
import { ThreeEvent } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import {
  PlayerBoard,
  WallMode,
  DraftSelection,
  MoveScorePreview,
  ScoringStepEvent,
  FLOOR_PENALTIES,
  STANDARD_WALL_LAYOUT,
  TileColor,
  FloorToken,
} from '../../types/game';
import { Tile3D } from './Tile3D';

export interface PlayerBoard3DProps {
  board: PlayerBoard;
  wallMode: WallMode;
  position: [number, number, number];
  rotation?: [number, number, number];
  draftSelection: DraftSelection | null;
  hoveredDestination: number | 'floor' | null;
  activeScoringEvent: ScoringStepEvent | null;
  interactive: boolean;
  previewMove: (
    destinationRow: number | 'floor',
    grayWallCol?: number
  ) => MoveScorePreview | null;
  onHoverDestination: (
    destinationRow: number | 'floor' | null,
    worldTarget?: [number, number, number],
    valid?: boolean
  ) => void;
  onConfirmMove: (destinationRow: number | 'floor', grayWallCol?: number) => void;
}

export function getRowZ(row: number): number {
  return -1.2 + row * 0.5;
}

export function getPatternSlotX(slotIndexFromRight: number): number {
  return -0.38 - slotIndexFromRight * 0.48;
}

export function getWallColX(col: number): number {
  return 0.42 + col * 0.48;
}

export function getFloorSlotX(index: number): number {
  return -1.56 + index * 0.52;
}

export const FLOOR_LINE_Z = 1.52;

/**
 * Helper to convert local board coordinates (accounting for board position and X-tilt)
 * into approximate world coordinates for trajectory arcs and popups.
 */
export function boardLocalToWorld(
  local: [number, number, number],
  boardPos: [number, number, number],
  boardRot: [number, number, number] = [0, 0, 0]
): [number, number, number] {
  const vec = new THREE.Vector3(...local);
  const euler = new THREE.Euler(...boardRot, 'XYZ');
  vec.applyEuler(euler);
  vec.add(new THREE.Vector3(...boardPos));
  return [vec.x, vec.y, vec.z];
}

export const PlayerBoard3D: React.FC<PlayerBoard3DProps> = ({
  board,
  wallMode,
  position,
  rotation = [-0.14, 0, 0],
  draftSelection,
  hoveredDestination,
  activeScoringEvent,
  interactive,
  previewMove,
  onHoverDestination,
  onConfirmMove,
}) => {
  const [selectedGrayCols, setSelectedGrayCols] = useState<Record<number, number>>(
    {}
  );

  // Precompute move previews for rows 0..4 and 'floor' when a DraftSelection is active
  const rowPreviews = useMemo(() => {
    if (!draftSelection) return [];
    return [0, 1, 2, 3, 4].map((r) =>
      previewMove(r, selectedGrayCols[r])
    );
  }, [draftSelection, previewMove, selectedGrayCols]);

  const floorPreview = useMemo(() => {
    if (!draftSelection) return null;
    return previewMove('floor');
  }, [draftSelection, previewMove]);

  const activeHoveredPreview = useMemo(() => {
    if (!draftSelection || hoveredDestination === null) return null;
    if (hoveredDestination === 'floor') return floorPreview;
    return rowPreviews[hoveredDestination] ?? null;
  }, [draftSelection, hoveredDestination, floorPreview, rowPreviews]);

  // Compute ghost floor tokens when hovering a destination row or floor
  const ghostFloorTokens = useMemo((): FloorToken[] => {
    if (!draftSelection || !activeHoveredPreview || !activeHoveredPreview.valid) {
      return [];
    }
    const tokens: FloorToken[] = [];
    if (activeHoveredPreview.takesFirstPlayerToken) {
      tokens.push('first-player');
    }
    for (let i = 0; i < activeHoveredPreview.tilesOverflowToFloor; i++) {
      tokens.push(draftSelection.color);
    }
    return tokens;
  }, [draftSelection, activeHoveredPreview]);

  // Check if a wall cell is part of the currentScoringEvent chain or hovered preview chain
  const isCellInActiveScoringChain = (r: number, c: number): boolean => {
    if (activeScoringEvent && activeScoringEvent.type === 'tile-placement') {
      if (activeScoringEvent.row === r && activeScoringEvent.col === c) {
        return true;
      }
      const inH = activeScoringEvent.horizontalChain.some(
        ([hr, hc]) => hr === r && hc === c
      );
      const inV = activeScoringEvent.verticalChain.some(
        ([vr, vc]) => vr === r && vc === c
      );
      if (inH || inV) return true;
    }

    if (
      typeof hoveredDestination === 'number' &&
      activeHoveredPreview &&
      activeHoveredPreview.valid
    ) {
      const inH = activeHoveredPreview.horizontalChainCoords.some(
        ([hr, hc]) => hr === r && hc === c
      );
      const inV = activeHoveredPreview.verticalChainCoords.some(
        ([vr, vc]) => vr === r && vc === c
      );
      if (inH || inV) return true;
    }

    return false;
  };

  // Check if a wall column in row r is legal for a given color in Gray Variant mode
  const isGrayColLegalForColor = (
    row: number,
    col: number,
    color: TileColor
  ): boolean => {
    if (board.wall[row][col].filledColor !== null) return false;
    for (let r = 0; r < 5; r++) {
      if (board.wall[r][col].filledColor === color) return false;
    }
    return true;
  };

  const handleRowEnter = (row: number) => {
    if (!interactive || !draftSelection) return;
    const preview = rowPreviews[row];
    const targetX = getPatternSlotX(Math.min(row, board.patternLines[row].count));
    const targetZ = getRowZ(row);
    const worldTarget = boardLocalToWorld(
      [targetX, 0.14, targetZ],
      position,
      rotation
    );
    onHoverDestination(row, worldTarget, Boolean(preview?.valid));
  };

  const handleFloorEnter = () => {
    if (!interactive || !draftSelection) return;
    const nextFloorIdx = Math.min(6, board.floorLine.length);
    const targetX = getFloorSlotX(nextFloorIdx);
    const worldTarget = boardLocalToWorld(
      [targetX, 0.14, FLOOR_LINE_Z],
      position,
      rotation
    );
    onHoverDestination('floor', worldTarget, Boolean(floorPreview?.valid));
  };

  const handleRowConfirm = (e: ThreeEvent<MouseEvent | PointerEvent>, row: number) => {
    e.stopPropagation();
    if (!interactive || !draftSelection) return;
    const preview = rowPreviews[row];
    if (preview?.valid) {
      onConfirmMove(row, selectedGrayCols[row] ?? preview.targetWallCol ?? undefined);
    }
  };

  const handleFloorConfirm = (e: ThreeEvent<MouseEvent | PointerEvent>) => {
    e.stopPropagation();
    if (!interactive || !draftSelection) return;
    if (floorPreview?.valid) {
      onConfirmMove('floor');
    }
  };

  return (
    <group position={position} rotation={rotation}>
      {/* Ornate Iberian Walnut Outer Frame */}
      <RoundedBox
        args={[5.62, 0.12, 3.82]}
        position={[0, -0.02, 0.1]}
        radius={0.05}
        smoothness={4}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color="#5D3A24"
          roughness={0.52}
          metalness={0.08}
        />
      </RoundedBox>

      {/* Cream Limestone Inlaid Board Surface */}
      <RoundedBox
        args={[5.36, 0.08, 3.58]}
        position={[0, 0.02, 0.1]}
        radius={0.03}
        smoothness={4}
        receiveShadow
      >
        <meshStandardMaterial
          color="#F7F1E5"
          roughness={0.62}
          metalness={0.03}
        />
      </RoundedBox>

      {/* Subtle Gold Inlaid Divider Strip between Pattern Lines and Mosaic Wall */}
      <mesh position={[0.02, 0.063, -0.2]} receiveShadow>
        <boxGeometry args={[0.045, 0.01, 2.55]} />
        <meshStandardMaterial
          color="#D99B26"
          roughness={0.35}
          metalness={0.55}
        />
      </mesh>

      {/* Horizontal Brass Divider above Floor Penalty Strip */}
      <mesh position={[0, 0.063, 1.16]} receiveShadow>
        <boxGeometry args={[5.1, 0.01, 0.035]} />
        <meshStandardMaterial
          color="#1565C0"
          roughness={0.35}
          metalness={0.2}
        />
      </mesh>

      {/* ==================== LEFT: 5 PATTERN LINES ==================== */}
      {board.patternLines.map((line, r) => {
        const z = getRowZ(r);
        const preview = rowPreviews[r] ?? null;
        const isRowHovered = hoveredDestination === r;
        const isRowValid = Boolean(preview?.valid);

        const rowWidth = line.capacity * 0.48 + 0.14;
        const rowCenterX = getPatternSlotX((line.capacity - 1) / 2);

        return (
          <group key={`pattern-row-${r}`}>
            {/* Interactive Row Drop-Target Hitbox (supports both Tap & Pointer Up Drag-Drop) */}
            {draftSelection && (
              <mesh
                position={[rowCenterX, 0.12, z]}
                onClick={(e) => handleRowConfirm(e, r)}
                onPointerUp={(e) => handleRowConfirm(e, r)}
                onPointerOver={(e) => {
                  e.stopPropagation();
                  handleRowEnter(r);
                  document.body.style.cursor = isRowValid
                    ? 'pointer'
                    : 'not-allowed';
                }}
                onPointerOut={(e) => {
                  e.stopPropagation();
                  if (hoveredDestination === r) {
                    onHoverDestination(null);
                  }
                  document.body.style.cursor = 'auto';
                }}
              >
                <boxGeometry args={[rowWidth, 0.24, 0.46]} />
                <meshBasicMaterial
                  color={
                    isRowValid
                      ? isRowHovered
                        ? '#10B981'
                        : '#F59E0B'
                      : '#EF4444'
                  }
                  transparent
                  opacity={
                    isRowHovered
                      ? isRowValid
                        ? 0.28
                        : 0.18
                      : isRowValid
                        ? 0.1
                        : 0.02
                  }
                  depthWrite={false}
                />
              </mesh>
            )}

            {/* Direction chevron between Pattern Line r and Wall Row r */}
            <mesh
              position={[0.02, 0.068, z]}
              rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
            >
              <coneGeometry args={[0.07, 0.12, 3]} />
              <meshStandardMaterial
                color={
                  isRowHovered && isRowValid
                    ? '#10B981'
                    : line.count === line.capacity
                      ? '#F59E0B'
                      : '#B8A992'
                }
                roughness={0.4}
              />
            </mesh>

            {/* Pattern Line Recessed Sockets & Tiles (Right-to-Left: 0 .. capacity-1) */}
            {Array.from({ length: line.capacity }).map((_, slotIdx) => {
              const x = getPatternSlotX(slotIdx);
              const isFilled = slotIdx < line.count && line.color !== null;
              const isGhostPlacement =
                !isFilled &&
                draftSelection !== null &&
                isRowValid &&
                preview !== null &&
                slotIdx < line.count + preview.tilesPlacedInLine;

              return (
                <group key={`pattern-${r}-${slotIdx}`}>
                  {/* Recessed Socket Well */}
                  <mesh position={[x, 0.062, z]} receiveShadow>
                    <boxGeometry args={[0.43, 0.012, 0.43]} />
                    <meshStandardMaterial
                      color={
                        isRowValid && isRowHovered
                          ? '#D1FAE5'
                          : isRowValid && draftSelection
                            ? '#FEF3C7'
                            : '#E5DCCB'
                      }
                      roughness={0.75}
                    />
                  </mesh>

                  {/* Socket Rim Border */}
                  <mesh
                    position={[x, 0.069, z]}
                    rotation={[-Math.PI / 2, 0, 0]}
                  >
                    <ringGeometry args={[0.19, 0.215, 4]} />
                    <meshBasicMaterial
                      color={
                        isRowValid && draftSelection ? '#10B981' : '#C9BCA6'
                      }
                      transparent
                      opacity={isRowValid && draftSelection ? 0.75 : 0.45}
                    />
                  </mesh>

                  {/* Existing Placed Tile in Pattern Line */}
                  {isFilled && line.color && (
                    <Tile3D
                      color={line.color}
                      position={[x, 0.115, z]}
                      highlighted={
                        line.count === line.capacity ||
                        (isRowHovered && isRowValid)
                      }
                    />
                  )}

                  {/* Ghost Preview Tile when DraftSelection is active */}
                  {isGhostPlacement && draftSelection && (
                    <Tile3D
                      color={draftSelection.color}
                      position={[x, isRowHovered ? 0.15 : 0.11, z]}
                      ghost
                      ghostOpacity={isRowHovered ? 0.78 : 0.42}
                      highlighted={isRowHovered}
                    />
                  )}
                </group>
              );
            })}

            {/* Floating Score Preview Badge on Valid Pattern Lines */}
            {draftSelection && isRowValid && preview && (
              <Html
                position={[
                  getPatternSlotX(line.capacity - 1) - 0.34,
                  0.26,
                  z,
                ]}
                center
                distanceFactor={10}
                style={{ pointerEvents: 'none' }}
              >
                <div
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-md border whitespace-nowrap transition-transform ${
                    isRowHovered
                      ? 'bg-emerald-600 text-white border-amber-300 scale-110'
                      : 'bg-slate-900/85 text-amber-300 border-amber-400/60'
                  }`}
                >
                  <span>
                    {preview.completesLine
                      ? `+${preview.estimatedWallGain} pts`
                      : `${line.count + preview.tilesPlacedInLine}/${line.capacity}`}
                  </span>
                  {preview.estimatedFloorPenalty < 0 && (
                    <span className="text-rose-300 font-bold">
                      ({preview.estimatedFloorPenalty} flr)
                    </span>
                  )}
                </div>
              </Html>
            )}
          </group>
        );
      })}

      {/* ==================== RIGHT: 5x5 MOSAIC WALL GRID ==================== */}
      {board.wall.map((wallRow, r) => {
        const z = getRowZ(r);
        const rowPreview = rowPreviews[r] ?? null;
        const activeColorForRow: TileColor | null =
          draftSelection?.color ?? board.patternLines[r].color;

        return wallRow.map((cell, c) => {
          const x = getWallColX(c);
          const expectedColor =
            wallMode === 'standard' ? STANDARD_WALL_LAYOUT[r][c] : null;
          const isFilled = cell.filledColor !== null;
          const inScoringChain = isCellInActiveScoringChain(r, c);

          const isTargetWallColForDraft =
            draftSelection !== null &&
            Boolean(rowPreview?.valid) &&
            rowPreview?.targetWallCol === c;

          const isGraySelectable =
            wallMode === 'gray' &&
            !isFilled &&
            activeColorForRow !== null &&
            isGrayColLegalForColor(r, c, activeColorForRow);

          return (
            <group key={`wall-${r}-${c}`}>
              {/* Recessed Wall Socket */}
              <mesh
                position={[x, 0.062, z]}
                receiveShadow
                onClick={(e) => {
                  if (wallMode === 'gray' && isGraySelectable) {
                    e.stopPropagation();
                    setSelectedGrayCols((prev) => ({ ...prev, [r]: c }));
                    if (draftSelection && interactive) {
                      const customPreview = previewMove(r, c);
                      if (customPreview?.valid) {
                        onConfirmMove(r, c);
                      }
                    }
                  }
                }}
                onPointerOver={(e) => {
                  if (wallMode === 'gray' && isGraySelectable && draftSelection) {
                    e.stopPropagation();
                    setSelectedGrayCols((prev) => ({ ...prev, [r]: c }));
                    handleRowEnter(r);
                    document.body.style.cursor = 'pointer';
                  }
                }}
              >
                <boxGeometry args={[0.43, 0.012, 0.43]} />
                <meshStandardMaterial
                  color={
                    wallMode === 'gray'
                      ? isTargetWallColForDraft
                        ? '#FDE68A'
                        : isGraySelectable && draftSelection
                          ? '#CBD5E1'
                          : '#94A3B8'
                      : '#EAE0D0'
                  }
                  roughness={0.68}
                />
              </mesh>

              {/* Standard Wall Mode: Ghosted Expected Azulejo Tile Guide */}
              {!isFilled && wallMode === 'standard' && expectedColor && (
                <Tile3D
                  color={expectedColor}
                  position={[x, 0.072, z]}
                  ghost
                  ghostOpacity={
                    isTargetWallColForDraft && hoveredDestination === r
                      ? 0.58
                      : 0.26
                  }
                  highlighted={
                    isTargetWallColForDraft && hoveredDestination === r
                  }
                />
              )}

              {/* Gray Wall Mode: Ghost Preview on Target Wall Column */}
              {!isFilled &&
                wallMode === 'gray' &&
                isTargetWallColForDraft &&
                draftSelection && (
                  <Tile3D
                    color={draftSelection.color}
                    position={[x, 0.082, z]}
                    ghost
                    ghostOpacity={hoveredDestination === r ? 0.62 : 0.32}
                    highlighted={hoveredDestination === r}
                  />
                )}

              {/* Placed Mosaic Wall Tile */}
              {isFilled && cell.filledColor && (
                <Tile3D
                  color={cell.filledColor}
                  position={[x, 0.12, z]}
                  scoringPulse={inScoringChain}
                  highlighted={inScoringChain}
                />
              )}
            </group>
          );
        });
      })}

      {/* ==================== BOTTOM: 7-SLOT FLOOR PENALTY LINE ==================== */}
      <group>
        {/* Voluntary Floor Drop-Target Hitbox */}
        {draftSelection && (
          <mesh
            position={[0, 0.12, FLOOR_LINE_Z]}
            onClick={handleFloorConfirm}
            onPointerUp={handleFloorConfirm}
            onPointerOver={(e) => {
              e.stopPropagation();
              handleFloorEnter();
              document.body.style.cursor = 'pointer';
            }}
            onPointerOut={(e) => {
              e.stopPropagation();
              if (hoveredDestination === 'floor') {
                onHoverDestination(null);
              }
              document.body.style.cursor = 'auto';
            }}
          >
            <boxGeometry args={[3.9, 0.24, 0.55]} />
            <meshBasicMaterial
              color={hoveredDestination === 'floor' ? '#F59E0B' : '#EF4444'}
              transparent
              opacity={hoveredDestination === 'floor' ? 0.25 : 0.06}
              depthWrite={false}
            />
          </mesh>
        )}

        {FLOOR_PENALTIES.map((penalty, idx) => {
          const x = getFloorSlotX(idx);
          const existingToken = board.floorLine[idx] ?? null;
          const ghostIndex = idx - board.floorLine.length;
          const ghostToken =
            !existingToken && ghostIndex >= 0 && ghostIndex < ghostFloorTokens.length
              ? ghostFloorTokens[ghostIndex]
              : null;

          const isFloorScoringPulse =
            activeScoringEvent?.type === 'floor-penalty' && existingToken !== null;

          return (
            <group key={`floor-slot-${idx}`}>
              {/* Penalty Number Pill above each floor slot */}
              <Html
                position={[x, 0.08, FLOOR_LINE_Z - 0.26]}
                center
                distanceFactor={11}
                style={{ pointerEvents: 'none' }}
              >
                <div className="px-1 py-0.2 rounded bg-stone-800/80 text-rose-200 text-[8px] font-bold tracking-tight border border-rose-400/30">
                  {penalty}
                </div>
              </Html>

              {/* Recessed Floor Socket */}
              <mesh position={[x, 0.062, FLOOR_LINE_Z]} receiveShadow>
                <boxGeometry args={[0.43, 0.012, 0.43]} />
                <meshStandardMaterial
                  color={
                    ghostToken
                      ? '#FECDD3'
                      : hoveredDestination === 'floor'
                        ? '#FDE68A'
                        : '#E2D6C3'
                  }
                  roughness={0.78}
                />
              </mesh>

              {/* Existing Floor Token ("1" token or overflow tile) */}
              {existingToken && (
                <Tile3D
                  color={existingToken}
                  position={[x, 0.115, FLOOR_LINE_Z]}
                  scoringPulse={isFloorScoringPulse}
                />
              )}

              {/* Ghost Overflow Preview Tile */}
              {ghostToken && (
                <Tile3D
                  color={ghostToken}
                  position={[x, 0.13, FLOOR_LINE_Z]}
                  ghost
                  ghostOpacity={0.62}
                />
              )}
            </group>
          );
        })}

        {/* Floating Floor Drop Badge when hovering Floor Line directly */}
        {draftSelection && hoveredDestination === 'floor' && floorPreview && (
          <Html
            position={[0, 0.34, FLOOR_LINE_Z]}
            center
            distanceFactor={10}
            style={{ pointerEvents: 'none' }}
          >
            <div className="px-2 py-0.5 rounded-full bg-rose-700 text-white text-[10px] font-extrabold shadow-lg border border-rose-300 whitespace-nowrap">
              Drop to Floor ({floorPreview.estimatedFloorPenalty} pts)
            </div>
          </Html>
        )}
      </group>
    </group>
  );
};
