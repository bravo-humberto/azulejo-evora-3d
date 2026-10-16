import React, { useState, useMemo, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { ContactShadows, Html } from '@react-three/drei';
import {
  GameState,
  PlayerBoard,
  DraftSelection,
  MoveScorePreview,
  ScoringStepEvent,
  TileColor,
} from '../../types/game';
import {
   getCachedTexture,
  preloadAllAzulejoTextures,
} from './textureCache';
import {
  FactoryDisplay3D,
  SelectSourcePayload,
} from './FactoryDisplay3D';
import { CenterPool3D } from './CenterPool3D';
import {
  PlayerBoard3D,
  boardLocalToWorld,
  getRowZ,
  getWallColX,
  getPatternSlotX,
  getFloorSlotX,
  FLOOR_LINE_Z,
} from './PlayerBoard3D';
import { ParabolicArc3D, ScoringBeamSegment } from './ParabolicArc3D';

export interface AzulejoCanvasProps {
  gameState: GameState;
  activeBoard?: PlayerBoard;
  draftSelection: DraftSelection | null;
  activeScoringEvent?: ScoringStepEvent | null;
  interactive?: boolean;
  onSelectSource: (payload: {
    sourceType: 'factory' | 'center';
    factoryId?: number;
    color: TileColor;
  }) => void;
  onClearSelection?: () => void;
  previewMove: (
    destinationRow: number | 'floor',
    grayWallCol?: number
  ) => MoveScorePreview | null;
  onConfirmMove: (
    destinationRow: number | 'floor',
    grayWallCol?: number
  ) => void;
}

const CENTER_POOL_POS: [number, number, number] = [0, 0, -2.25];
const PLAYER_BOARD_POS: [number, number, number] = [0, 0.12, 2.68];
const PLAYER_BOARD_ROT: [number, number, number] = [-0.14, 0, 0];

function getFactoryPosition(
  index: number,
  total: number
): [number, number, number] {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / Math.max(1, total);
  const radiusX = total <= 5 ? 2.32 : 2.52;
  const radiusZ = total <= 5 ? 2.08 : 2.22;
  return [
    Math.cos(angle) * radiusX,
    0,
    CENTER_POOL_POS[2] + Math.sin(angle) * radiusZ,
  ];
}

/**
 * Dynamically adjusts the PerspectiveCamera position and lookAt target based on
 * `size.width / size.height` so both 9:16 mobile portrait screens and 16:9 desktop
 * viewports frame the Factory Ring (top half) and Active Player Board (bottom half)
 * without any clipping.
 */
const ResponsiveCameraRig: React.FC = () => {
  const { camera, size } = useThree();

  useFrame((_, delta) => {
    const aspect = size.width / Math.max(1, size.height);
    const persp = camera as THREE.PerspectiveCamera;
    const fovRad = THREE.MathUtils.degToRad(persp.fov || 38);
    const halfTan = Math.tan(fovRad / 2);

    // Ensure full 6.75-unit horizontal width and 11.4-unit vertical depth fit cleanly
    const requiredDistWidth = 3.42 / (halfTan * aspect);
    const requiredDistHeight = 5.75 / halfTan;
    const dist = Math.max(13.8, requiredDistWidth, requiredDistHeight);

    const targetPos = new THREE.Vector3(
      0,
      dist * 0.87,
      dist * 0.46 + (aspect < 0.75 ? 0.35 : 0.25)
    );
    const lerpSpeed = Math.min(1, delta * 8);
    camera.position.lerp(targetPos, lerpSpeed);
    camera.lookAt(0, 0, aspect < 0.75 ? 0.28 : 0.22);
  });

  return null;
};

const SceneContent: React.FC<AzulejoCanvasProps> = ({
  gameState,
  activeBoard,
  draftSelection,
  activeScoringEvent = null,
  interactive,
  onSelectSource,
  onClearSelection,
  previewMove,
  onConfirmMove,
}) => {
  useEffect(() => {
    preloadAllAzulejoTextures();
  }, []);

  const board =
    activeBoard ??
    gameState.players[gameState.activePlayerIndex] ??
    gameState.players[0];

  const isInteractive =
    interactive !== undefined
      ? interactive
      : gameState.phase === 'factory-offer' && !board.isAI;

  const limestoneTexture = useMemo(
    () => getCachedTexture('courtyard-limestone'),
    []
  );

  const [sourceOrigin, setSourceOrigin] = useState<
    [number, number, number] | null
  >(null);
  const [hoveredDestination, setHoveredDestination] = useState<
    number | 'floor' | null
  >(null);
  const [hoveredWorldTarget, setHoveredWorldTarget] = useState<
    [number, number, number] | null
  >(null);
  const [hoveredValid, setHoveredValid] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Sync sourceOrigin whenever draftSelection changes externally (or clears)
  useEffect(() => {
    if (!draftSelection) {
      setSourceOrigin(null);
      setHoveredDestination(null);
      setHoveredWorldTarget(null);
      setIsDragging(false);
      return;
    }

    if (
      draftSelection.sourceType === 'factory' &&
      draftSelection.factoryId !== undefined
    ) {
      const idx = gameState.factories.findIndex(
        (f) => f.id === draftSelection.factoryId
      );
      if (idx >= 0) {
        const fPos = getFactoryPosition(idx, gameState.factories.length);
        setSourceOrigin([fPos[0], 0.36, fPos[2]]);
      }
    } else if (draftSelection.sourceType === 'center') {
      setSourceOrigin([CENTER_POOL_POS[0], 0.36, CENTER_POOL_POS[2]]);
    }
  }, [draftSelection, gameState.factories]);

  // Global pointerup listener so ending a drag outside a valid row releases drag state cleanly
  useEffect(() => {
    if (!isDragging) return;
    const handleWindowPointerUp = () => {
      setIsDragging(false);
    };
    window.addEventListener('pointerup', handleWindowPointerUp);
    return () => window.removeEventListener('pointerup', handleWindowPointerUp);
  }, [isDragging]);

  const handleSelectSourceInternal = useCallback(
    (payload: SelectSourcePayload) => {
      if (payload.worldOrigin) {
        setSourceOrigin(payload.worldOrigin);
      }
      onSelectSource({
        sourceType: payload.sourceType,
        factoryId: payload.factoryId,
        color: payload.color,
      });
    },
    [onSelectSource]
  );

  const handleStartDragInternal = useCallback(
    (payload: SelectSourcePayload) => {
      setIsDragging(true);
      if (payload.worldOrigin) {
        setSourceOrigin(payload.worldOrigin);
      }
    },
    []
  );

  const handleHoverDestinationInternal = useCallback(
    (
      destinationRow: number | 'floor' | null,
      worldTarget?: [number, number, number],
      valid?: boolean
    ) => {
      setHoveredDestination(destinationRow);
      setHoveredWorldTarget(worldTarget ?? null);
      setHoveredValid(valid ?? true);
    },
    []
  );

  const handleConfirmMoveInternal = useCallback(
    (destinationRow: number | 'floor', grayWallCol?: number) => {
      setIsDragging(false);
      setHoveredDestination(null);
      setHoveredWorldTarget(null);
      onConfirmMove(destinationRow, grayWallCol);
    },
    [onConfirmMove]
  );

  // Compute default best valid target for the parabolic arc even before pointer hover
  const defaultArcTarget = useMemo((): {
    point: [number, number, number];
    valid: boolean;
  } | null => {
    if (!draftSelection) return null;
    if (hoveredWorldTarget) {
      return { point: hoveredWorldTarget, valid: hoveredValid };
    }
    for (let r = 0; r < 5; r++) {
      const p = previewMove(r);
      if (p?.valid) {
        const slotX = getPatternSlotX(
          Math.min(r, board.patternLines[r].count)
        );
        const z = getRowZ(r);
        return {
          point: boardLocalToWorld(
            [slotX, 0.18, z],
            PLAYER_BOARD_POS,
            PLAYER_BOARD_ROT
          ),
          valid: true,
        };
      }
    }
    const nextFloorIdx = Math.min(6, board.floorLine.length);
    return {
      point: boardLocalToWorld(
        [getFloorSlotX(nextFloorIdx), 0.18, FLOOR_LINE_Z],
        PLAYER_BOARD_POS,
        PLAYER_BOARD_ROT
      ),
      valid: true,
    };
  }, [
    draftSelection,
    hoveredWorldTarget,
    hoveredValid,
    previewMove,
    board.patternLines,
    board.floorLine.length,
  ]);

  // Compute golden light beam connectors during Wall-Tiling scoring animation
  const scoringBeams = useMemo((): ScoringBeamSegment[] => {
    const beams: ScoringBeamSegment[] = [];
    if (
      !activeScoringEvent ||
      activeScoringEvent.type !== 'tile-placement' ||
      activeScoringEvent.row === undefined ||
      activeScoringEvent.col === undefined
    ) {
      return beams;
    }

    const originWorld = boardLocalToWorld(
      [
        getWallColX(activeScoringEvent.col),
        0.18,
        getRowZ(activeScoringEvent.row),
      ],
      PLAYER_BOARD_POS,
      PLAYER_BOARD_ROT
    );

    const addChainBeams = (chain: [number, number][]) => {
      for (const [r, c] of chain) {
        if (r === activeScoringEvent.row && c === activeScoringEvent.col) {
          continue;
        }
        const targetWorld = boardLocalToWorld(
          [getWallColX(c), 0.18, getRowZ(r)],
          PLAYER_BOARD_POS,
          PLAYER_BOARD_ROT
        );
        beams.push({ from: originWorld, to: targetWorld });
      }
    };

    addChainBeams(activeScoringEvent.horizontalChain);
    addChainBeams(activeScoringEvent.verticalChain);
    return beams;
  }, [activeScoringEvent]);

  // Compute 3D world position for the floating +X PTS / -Y PTS scoring popup
  const scoringPopupPosition = useMemo((): [number, number, number] | null => {
    if (!activeScoringEvent) return null;
    if (
      activeScoringEvent.type === 'tile-placement' &&
      activeScoringEvent.row !== undefined &&
      activeScoringEvent.col !== undefined
    ) {
      return boardLocalToWorld(
        [
          getWallColX(activeScoringEvent.col),
          0.55,
          getRowZ(activeScoringEvent.row),
        ],
        PLAYER_BOARD_POS,
        PLAYER_BOARD_ROT
      );
    }
    if (activeScoringEvent.type === 'floor-penalty') {
      return boardLocalToWorld(
        [0, 0.52, FLOOR_LINE_Z],
        PLAYER_BOARD_POS,
        PLAYER_BOARD_ROT
      );
    }
    return boardLocalToWorld([0, 0.65, -0.2], PLAYER_BOARD_POS, PLAYER_BOARD_ROT);
  }, [activeScoringEvent]);

  return (
    <>
      <ResponsiveCameraRig />

      {/* Warm Iberian Palace Lighting */}
      <ambientLight intensity={0.75} color="#FFF8EE" />
      <hemisphereLight
        args={['#FFFDF9', '#D7C0A3', 0.65]}
        position={[0, 12, 0]}
      />
      <directionalLight
        position={[5.5, 11.5, 6.5]}
        intensity={1.55}
        color="#FFF5E4"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={28}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6.5}
        shadow-camera-bottom={-6.5}
        shadow-bias={-0.0005}
      />
      <pointLight position={[-4, 5, -2]} intensity={0.4} color="#90CAF9" />

      {/* Sun-Drenched Évora Courtyard Limestone Tabletop */}
      <mesh
        position={[0, -0.08, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          if (draftSelection && onClearSelection) {
            onClearSelection();
          }
        }}
      >
        <planeGeometry args={[28, 28]} />
        <meshStandardMaterial
          color="#F5EFE6"
          map={limestoneTexture}
          roughness={0.82}
          metalness={0.02}
        />
      </mesh>

      {/* Soft Contact Shadows under Coasters & Player Board */}
      <ContactShadows
        position={[0, -0.075, 0.2]}
        opacity={0.38}
        scale={14}
        blur={2.1}
        far={3.5}
      />

      {/* Upper-Middle Zone: Circular Ring of Factory Displays */}
      {gameState.factories.map((factory, idx) => (
        <FactoryDisplay3D
          key={factory.id}
          factory={factory}
          position={getFactoryPosition(idx, gameState.factories.length)}
          draftSelection={draftSelection}
          interactive={isInteractive}
          onSelectSource={handleSelectSourceInternal}
          onStartDrag={handleStartDragInternal}
        />
      ))}

      {/* Upper-Middle Center: Palace Courtyard Center Pool */}
      <CenterPool3D
        center={gameState.center}
        position={CENTER_POOL_POS}
        draftSelection={draftSelection}
        interactive={isInteractive}
        onSelectSource={handleSelectSourceInternal}
        onStartDrag={handleStartDragInternal}
      />

      {/* Lower Zone: Active Player 3D Ornate Board */}
      <PlayerBoard3D
        board={board}
        wallMode={gameState.wallMode}
        position={PLAYER_BOARD_POS}
        rotation={PLAYER_BOARD_ROT}
        draftSelection={draftSelection}
        hoveredDestination={hoveredDestination}
        activeScoringEvent={activeScoringEvent}
        interactive={isInteractive}
        previewMove={previewMove}
        onHoverDestination={handleHoverDestinationInternal}
        onConfirmMove={handleConfirmMoveInternal}
      />

      {/* Parabolic Trajectory Arc & Wall-Tiling Scoring Light Beams */}
      <ParabolicArc3D
        from={draftSelection ? sourceOrigin : null}
        to={defaultArcTarget ? defaultArcTarget.point : null}
        valid={defaultArcTarget ? defaultArcTarget.valid : true}
        scoringBeams={scoringBeams}
      />

      {/* Floating +X PTS / -Y PTS 3D Celebration Popup during Wall-Tiling Sequence */}
      {activeScoringEvent && scoringPopupPosition && (
        <Html
          position={scoringPopupPosition}
          center
          distanceFactor={9.5}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className={`px-3 py-1 rounded-full font-extrabold text-xs tracking-wide shadow-xl border-2 animate-bounce whitespace-nowrap ${
              activeScoringEvent.pointsDelta >= 0
                ? 'bg-gradient-to-r from-amber-500 to-emerald-600 text-white border-amber-200'
                : 'bg-gradient-to-r from-rose-600 to-red-800 text-white border-rose-200'
            }`}
          >
            {activeScoringEvent.pointsDelta >= 0
              ? `+${activeScoringEvent.pointsDelta} PTS`
              : `${activeScoringEvent.pointsDelta} PTS`}
          </div>
        </Html>
      )}
    </>
  );
};

export const AzulejoCanvas: React.FC<AzulejoCanvasProps> = (props) => {
  return (
    <div className="relative w-full h-full select-none touch-none overflow-hidden">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [0, 15, 8], fov: 38, near: 0.1, far: 60 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <SceneContent {...props} />
      </Canvas>
    </div>
  );
};

export default AzulejoCanvas;
