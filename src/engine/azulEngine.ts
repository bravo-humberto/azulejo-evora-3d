import {
  AIDifficulty,
  ALL_TILE_COLORS,
  DraftMove,
  EndGameBonusBreakdown,
  FactoryDisplay,
  FLOOR_PENALTIES,
  FloorToken,
  GameMode,
  GameState,
  MoveScorePreview,
  PatternLine,
  PlayerBoard,
  ScoringStepEvent,
  STANDARD_WALL_LAYOUT,
  TileColor,
  WallCell,
  WallGrid,
  WallMode,
} from '../types/game';
import { shuffleArray } from './prng';

const TILES_PER_COLOR = 20;
const TILES_PER_FACTORY = 4;
const MAX_FLOOR_SLOTS = 7;

const DEFAULT_AVATAR_COLORS = [
  '#1565C0', // Cobalt
  '#D84315', // Terracotta
  '#F9A825', // Saffron
  '#00ACC1', // Teal
];

/**
 * Official Azul rulebook factory count based on number of players:
 * 2 players -> 5 factories
 * 3 players -> 7 factories
 * 4 players -> 9 factories
 */
export function getFactoryCountForPlayers(playerCount: number): number {
  switch (playerCount) {
    case 2:
      return 5;
    case 3:
      return 7;
    case 4:
      return 9;
    default:
      throw new Error(`Invalid player count: ${playerCount}. Azul supports 2 to 4 players.`);
  }
}

/**
 * Creates a fresh 5x5 WallGrid for a player board.
 */
export function createInitialWall(wallMode: WallMode): WallGrid {
  const wall: WallGrid = [];
  for (let row = 0; row < 5; row++) {
    const rowCells: WallCell[] = [];
    for (let col = 0; col < 5; col++) {
      rowCells.push({
        row,
        col,
        expectedColor: wallMode === 'standard' ? STANDARD_WALL_LAYOUT[row][col] : null,
        filledColor: null,
      });
    }
    wall.push(rowCells);
  }
  return wall;
}

/**
 * Creates the 5 Pattern Lines (capacities 1..5).
 */
export function createInitialPatternLines(): PatternLine[] {
  return Array.from({ length: 5 }, (_, idx) => ({
    rowIndex: idx,
    capacity: idx + 1,
    color: null,
    count: 0,
    targetWallCol: null,
  }));
}

/**
 * Deep-clones a GameState for pure, immutable state updates.
 */
export function cloneGameState(state: GameState): GameState {
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      patternLines: p.patternLines.map((line) => ({ ...line })),
      wall: p.wall.map((row) => row.map((cell) => ({ ...cell }))),
      floorLine: [...p.floorLine],
    })),
    factories: state.factories.map((f) => ({
      id: f.id,
      tiles: [...f.tiles],
    })),
    center: {
      tiles: [...state.center.tiles],
      hasFirstPlayerToken: state.center.hasFirstPlayerToken,
    },
    bag: [...state.bag],
    boxLid: [...state.boxLid],
    pendingScoringEvents: state.pendingScoringEvents.map((ev) => ({
      ...ev,
      horizontalChain: ev.horizontalChain.map((c) => [c[0], c[1]]),
      verticalChain: ev.verticalChain.map((c) => [c[0], c[1]]),
      floorTokensCleared: ev.floorTokensCleared ? [...ev.floorTokensCleared] : undefined,
    })),
    endGameBonuses: state.endGameBonuses.map((b) => ({
      ...b,
      completedColors: [...b.completedColors],
    })),
    winnerIds: [...state.winnerIds],
    lastTurn: state.lastTurn
      ? {
          ...state.lastTurn,
          move: { ...state.lastTurn.move },
        }
      : null,
  };
}

/**
 * Deals up to 4 tiles per factory from the bag.
 * If the bag runs out mid-deal, shuffles the boxLid into the bag and continues filling.
 * If both bag and boxLid are empty, deals whatever tiles were available.
 */
export function fillFactoriesFromBag(
  numFactories: number,
  bag: TileColor[],
  boxLid: TileColor[],
  seed: number
): {
  factories: FactoryDisplay[];
  bag: TileColor[];
  boxLid: TileColor[];
  nextSeed: number;
} {
  let currentBag = [...bag];
  let currentBoxLid = [...boxLid];
  let currentSeed = seed;
  const factories: FactoryDisplay[] = [];

  for (let i = 0; i < numFactories; i++) {
    const factoryTiles: TileColor[] = [];
    for (let slot = 0; slot < TILES_PER_FACTORY; slot++) {
      if (currentBag.length === 0 && currentBoxLid.length > 0) {
        const shuffled = shuffleArray(currentBoxLid, currentSeed);
        currentBag = shuffled.shuffled;
        currentSeed = shuffled.nextSeed;
        currentBoxLid = [];
      }
      if (currentBag.length > 0) {
        const drawn = currentBag.pop()!;
        factoryTiles.push(drawn);
      }
    }
    factories.push({
      id: i,
      tiles: factoryTiles,
    });
  }

  return {
    factories,
    bag: currentBag,
    boxLid: currentBoxLid,
    nextSeed: currentSeed,
  };
}

/**
 * Initializes a complete rulebook-compliant Azul GameState.
 */
export function createInitialGameState(options: {
  playerConfigs: {
    id: string;
    name: string;
    isAI: boolean;
    aiDifficulty?: AIDifficulty;
    avatarColor?: string;
  }[];
  wallMode: WallMode;
  mode: GameMode;
  seed?: number;
  matchId?: string;
}): GameState {
  const { playerConfigs, wallMode, mode } = options;
  const numPlayers = playerConfigs.length;
  const numFactories = getFactoryCountForPlayers(numPlayers);
  const initialSeed = options.seed ?? 133742;

  // Create 100 tiles (20 of each of the 5 colors)
  const rawBag: TileColor[] = [];
  for (const color of ALL_TILE_COLORS) {
    for (let i = 0; i < TILES_PER_COLOR; i++) {
      rawBag.push(color);
    }
  }

  const { shuffled: shuffledBag, nextSeed: seedAfterBag } = shuffleArray(rawBag, initialSeed);
  const {
    factories,
    bag: remainingBag,
    boxLid: remainingBoxLid,
    nextSeed: finalSeed,
  } = fillFactoriesFromBag(numFactories, shuffledBag, [], seedAfterBag);

  const players: PlayerBoard[] = playerConfigs.map((cfg, idx) => ({
    id: cfg.id,
    name: cfg.name,
    isAI: cfg.isAI,
    aiDifficulty: cfg.aiDifficulty,
    avatarColor: cfg.avatarColor ?? DEFAULT_AVATAR_COLORS[idx % DEFAULT_AVATAR_COLORS.length],
    score: 0,
    patternLines: createInitialPatternLines(),
    wall: createInitialWall(wallMode),
    floorLine: [],
    hasFirstPlayerTokenForNextRound: false,
  }));

  return {
    matchId: options.matchId ?? `azul-${initialSeed}`,
    seed: finalSeed,
    mode,
    wallMode,
    phase: 'factory-offer',
    roundNumber: 1,
    players,
    activePlayerIndex: 0,
    startingPlayerIndex: 0,
    factories,
    center: {
      tiles: [],
      hasFirstPlayerToken: true,
    },
    bag: remainingBag,
    boxLid: remainingBoxLid,
    pendingScoringEvents: [],
    endGameBonuses: [],
    winnerIds: [],
    lastTurn: null,
  };
}

/**
 * Returns the available tile colors and their counts in a specific Factory or the Center Pool.
 */
export function getAvailableColorsInSource(
  state: GameState,
  sourceType: 'factory' | 'center',
  factoryId?: number
): { color: TileColor; count: number }[] {
  let tiles: TileColor[] = [];
  if (sourceType === 'factory') {
    const factory = state.factories.find((f) => f.id === factoryId);
    if (!factory) return [];
    tiles = factory.tiles;
  } else {
    tiles = state.center.tiles;
  }

  const counts = new Map<TileColor, number>();
  for (const t of tiles) {
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }

  const result: { color: TileColor; count: number }[] = [];
  for (const color of ALL_TILE_COLORS) {
    const count = counts.get(color) ?? 0;
    if (count > 0) {
      result.push({ color, count });
    }
  }
  return result;
}

/**
 * Returns valid wall column indices (0..4) where `color` can be placed in `row` on `board`.
 * - For `standard` wall mode: returns `[col]` where `expectedColor === color`, provided that cell is empty and `row` does not already contain `color`.
 * - For `gray` wall mode: returns all columns `0..4` where `board.wall[row][col]` is empty, `row` does not already contain `color`, and column `col` does not already contain `color`.
 */
export function getValidGrayWallColumns(
  board: PlayerBoard,
  row: number,
  color: TileColor
): number[] {
  if (row < 0 || row >= 5) return [];

  const wallRow = board.wall[row];
  // Rulebook: A row cannot contain more than 1 tile of the same color
  if (wallRow.some((cell) => cell.filledColor === color)) {
    return [];
  }

  const isStandard = wallRow[0].expectedColor !== null;
  if (isStandard) {
    const targetCol = wallRow.findIndex((cell) => cell.expectedColor === color);
    if (targetCol !== -1 && wallRow[targetCol].filledColor === null) {
      return [targetCol];
    }
    return [];
  }

  // Gray wall variant: check each empty column for vertical color uniqueness
  const validCols: number[] = [];
  for (let col = 0; col < 5; col++) {
    if (wallRow[col].filledColor !== null) continue;

    let columnHasColor = false;
    for (let r = 0; r < 5; r++) {
      if (board.wall[r][col].filledColor === color) {
        columnHasColor = true;
        break;
      }
    }

    if (!columnHasColor) {
      validCols.push(col);
    }
  }

  return validCols;
}

/**
 * Scores placing a tile at `(row, col)` on `wall` according to official Azul rules:
 * - Count contiguous horizontal tiles connected to `(row, col)` (including `(row, col)` itself).
 *   If horizontal chain length > 1, add `hLen` points.
 * - Count contiguous vertical tiles connected to `(row, col)` (including `(row, col)` itself).
 *   If vertical chain length > 1, add `vLen` points.
 * - If no adjacent tiles horizontally or vertically (`hLen === 1 && vLen === 1`), score `1` point.
 */
export function scoreWallTilePlacement(
  wall: WallGrid,
  row: number,
  col: number
): {
  points: number;
  horizontalChain: [number, number][];
  verticalChain: [number, number][];
} {
  let minCol = col;
  while (minCol > 0 && wall[row][minCol - 1].filledColor !== null) {
    minCol--;
  }
  let maxCol = col;
  while (maxCol < 4 && wall[row][maxCol + 1].filledColor !== null) {
    maxCol++;
  }

  const horizontalChain: [number, number][] = [];
  for (let c = minCol; c <= maxCol; c++) {
    horizontalChain.push([row, c]);
  }

  let minRow = row;
  while (minRow > 0 && wall[minRow - 1][col].filledColor !== null) {
    minRow--;
  }
  let maxRow = row;
  while (maxRow < 4 && wall[maxRow + 1][col].filledColor !== null) {
    maxRow++;
  }

  const verticalChain: [number, number][] = [];
  for (let r = minRow; r <= maxRow; r++) {
    verticalChain.push([r, col]);
  }

  const hLen = horizontalChain.length;
  const vLen = verticalChain.length;

  let points = 0;
  if (hLen === 1 && vLen === 1) {
    points = 1;
  } else {
    if (hLen > 1) points += hLen;
    if (vLen > 1) points += vLen;
  }

  return {
    points,
    horizontalChain,
    verticalChain,
  };
}

/**
 * Computes total floor penalty for a given number of floor tokens (always <= 0).
 */
export function calculateFloorPenaltyForCount(tokenCount: number): number {
  const capped = Math.min(Math.max(0, tokenCount), MAX_FLOOR_SLOTS);
  let penalty = 0;
  for (let i = 0; i < capped; i++) {
    penalty += FLOOR_PENALTIES[i];
  }
  return penalty;
}

/**
 * Helper to select the highest-scoring valid wall column in Gray Wall mode.
 */
function pickBestGrayWallColumn(
  board: PlayerBoard,
  row: number,
  color: TileColor,
  preferredCol?: number | null
): number | null {
  const validCols = getValidGrayWallColumns(board, row, color);
  if (validCols.length === 0) return null;
  if (preferredCol !== undefined && preferredCol !== null && validCols.includes(preferredCol)) {
    return preferredCol;
  }

  let bestCol = validCols[0];
  let bestScore = -1;
  for (const col of validCols) {
    const { points } = scoreWallTilePlacement(board.wall, row, col);
    // Prefer center columns slightly on tie to foster adjacency
    const centerBias = (2 - Math.abs(2 - col)) * 0.05;
    if (points + centerBias > bestScore) {
      bestScore = points + centerBias;
      bestCol = col;
    }
  }
  return bestCol;
}

/**
 * Previews a draft move, validating legality and calculating exact immediate wall score,
 * floor overflow penalties, and connected chains.
 */
export function previewDraftMove(
  state: GameState,
  move: DraftMove,
  playerIndex: number = state.activePlayerIndex
): MoveScorePreview {
  const invalidPreview = (reason: string): MoveScorePreview => ({
    valid: false,
    reason,
    tilesPlacedInLine: 0,
    tilesOverflowToFloor: 0,
    takesFirstPlayerToken: false,
    completesLine: false,
    estimatedWallGain: 0,
    estimatedFloorPenalty: 0,
    netImmediateDelta: 0,
    targetWallCol: null,
    horizontalChainCoords: [],
    verticalChainCoords: [],
  });

  if (state.phase !== 'factory-offer') {
    return invalidPreview('Moves can only be drafted during the Factory Offer phase.');
  }

  const player = state.players[playerIndex];
  if (!player) {
    return invalidPreview('Invalid player index.');
  }

  // Validate source and count matching tiles
  let sourceTiles: TileColor[] = [];
  if (move.sourceType === 'factory') {
    if (move.factoryId === undefined) {
      return invalidPreview('Factory ID is required when drafting from a factory.');
    }
    const factory = state.factories.find((f) => f.id === move.factoryId);
    if (!factory) {
      return invalidPreview(`Factory ${move.factoryId} does not exist.`);
    }
    sourceTiles = factory.tiles;
  } else if (move.sourceType === 'center') {
    sourceTiles = state.center.tiles;
  } else {
    return invalidPreview('Invalid draft source type.');
  }

  const pickedCount = sourceTiles.filter((t) => t === move.color).length;
  if (pickedCount === 0) {
    return invalidPreview(`No ${move.color} tiles available in the selected source.`);
  }

  const takesFirstPlayerToken =
    move.sourceType === 'center' && state.center.hasFirstPlayerToken;

  const existingFloorCount = player.floorLine.length;
  const existingPenalty = calculateFloorPenaltyForCount(existingFloorCount);

  // Case 1: Dumping directly to the floor line
  if (move.destinationRow === 'floor') {
    const newFloorTokens = pickedCount + (takesFirstPlayerToken ? 1 : 0);
    const newFloorCount = Math.min(MAX_FLOOR_SLOTS, existingFloorCount + newFloorTokens);
    const newPenalty = calculateFloorPenaltyForCount(newFloorCount);
    const marginalPenalty = newPenalty - existingPenalty;

    return {
      valid: true,
      tilesPlacedInLine: 0,
      tilesOverflowToFloor: pickedCount,
      takesFirstPlayerToken,
      completesLine: false,
      estimatedWallGain: 0,
      estimatedFloorPenalty: marginalPenalty,
      netImmediateDelta: marginalPenalty,
      targetWallCol: null,
      horizontalChainCoords: [],
      verticalChainCoords: [],
    };
  }

  // Case 2: Placing into Pattern Line 0..4
  const row = move.destinationRow;
  if (typeof row !== 'number' || row < 0 || row > 4) {
    return invalidPreview('Destination row must be 0..4 or "floor".');
  }

  const patternLine = player.patternLines[row];
  if (patternLine.count >= patternLine.capacity) {
    return invalidPreview(`Pattern line ${row + 1} is already full.`);
  }

  if (patternLine.color !== null && patternLine.color !== move.color) {
    return invalidPreview(
      `Pattern line ${row + 1} already holds ${patternLine.color} tiles and cannot accept ${move.color}.`
    );
  }

  // Rulebook: Corresponding wall row cannot already have a tile of this color
  if (player.wall[row].some((cell) => cell.filledColor === move.color)) {
    return invalidPreview(
      `Wall row ${row + 1} already has a ${move.color} tile.`
    );
  }

  const validCols = getValidGrayWallColumns(player, row, move.color);
  if (validCols.length === 0) {
    return invalidPreview(
      `No valid column available in wall row ${row + 1} for ${move.color}.`
    );
  }

  if (move.grayWallCol !== undefined && !validCols.includes(move.grayWallCol)) {
    return invalidPreview(
      `Column ${move.grayWallCol + 1} is not a legal placement for ${move.color} in row ${row + 1}.`
    );
  }

  const freeSpaces = patternLine.capacity - patternLine.count;
  const tilesPlacedInLine = Math.min(pickedCount, freeSpaces);
  const tilesOverflowToFloor = pickedCount - tilesPlacedInLine;
  const completesLine = patternLine.count + tilesPlacedInLine === patternLine.capacity;

  const totalNewFloorItems = tilesOverflowToFloor + (takesFirstPlayerToken ? 1 : 0);
  const newFloorCount = Math.min(MAX_FLOOR_SLOTS, existingFloorCount + totalNewFloorItems);
  const marginalPenalty = calculateFloorPenaltyForCount(newFloorCount) - existingPenalty;

  // Simulate wall state including any already-completed pattern lines above `row`
  // so top-to-bottom Wall-Tiling order is accurately reflected in preview scoring.
  const simulatedBoard: PlayerBoard = {
    ...player,
    wall: player.wall.map((r) => r.map((c) => ({ ...c }))),
  };

  for (let r = 0; r < row; r++) {
    const upperLine = player.patternLines[r];
    if (upperLine.count === upperLine.capacity && upperLine.color !== null) {
      const upperCol = pickBestGrayWallColumn(
        simulatedBoard,
        r,
        upperLine.color,
        upperLine.targetWallCol
      );
      if (upperCol !== null) {
        simulatedBoard.wall[r][upperCol].filledColor = upperLine.color;
      }
    }
  }

  const targetWallCol = pickBestGrayWallColumn(
    simulatedBoard,
    row,
    move.color,
    move.grayWallCol ?? patternLine.targetWallCol
  );

  if (targetWallCol === null) {
    return invalidPreview(
      `No valid column available in wall row ${row + 1} for ${move.color} after resolving upper rows.`
    );
  }

  let estimatedWallGain = 0;
  let horizontalChainCoords: [number, number][] = [];
  let verticalChainCoords: [number, number][] = [];

  const placementScore = scoreWallTilePlacement(simulatedBoard.wall, row, targetWallCol);
  horizontalChainCoords = placementScore.horizontalChain;
  verticalChainCoords = placementScore.verticalChain;

  if (completesLine) {
    estimatedWallGain = placementScore.points;
  }

  const netImmediateDelta = estimatedWallGain + marginalPenalty;

  return {
    valid: true,
    tilesPlacedInLine,
    tilesOverflowToFloor,
    takesFirstPlayerToken,
    completesLine,
    estimatedWallGain,
    estimatedFloorPenalty: marginalPenalty,
    netImmediateDelta,
    targetWallCol,
    horizontalChainCoords,
    verticalChainCoords,
  };
}

/**
 * Generates all legal DraftMoves for the given player in the current GameState.
 */
export function getAllLegalMoves(
  state: GameState,
  playerIndex: number = state.activePlayerIndex
): DraftMove[] {
  if (state.phase !== 'factory-offer') return [];

  const moves: DraftMove[] = [];
  const sources: { sourceType: 'factory' | 'center'; factoryId?: number }[] = [];

  for (const factory of state.factories) {
    if (factory.tiles.length > 0) {
      sources.push({ sourceType: 'factory', factoryId: factory.id });
    }
  }

  if (state.center.tiles.length > 0) {
    sources.push({ sourceType: 'center' });
  }

  for (const src of sources) {
    const colorCounts = getAvailableColorsInSource(state, src.sourceType, src.factoryId);
    for (const { color } of colorCounts) {
      // Pattern lines 0..4
      for (let row = 0; row < 5; row++) {
        const candidate: DraftMove = {
          sourceType: src.sourceType,
          factoryId: src.factoryId,
          color,
          destinationRow: row,
        };
        const preview = previewDraftMove(state, candidate, playerIndex);
        if (preview.valid) {
          moves.push(candidate);
        }
      }

      // Floor line is always legal if source has the color
      const floorMove: DraftMove = {
        sourceType: src.sourceType,
        factoryId: src.factoryId,
        color,
        destinationRow: 'floor',
      };
      if (previewDraftMove(state, floorMove, playerIndex).valid) {
        moves.push(floorMove);
      }
    }
  }

  return moves;
}

/**
 * Appends floor tokens to a player's floor line up to MAX_FLOOR_SLOTS (7).
 * Any excess colored tiles beyond 7 slots are placed into `boxLid`.
 * The `'first-player'` token is never placed into `boxLid`.
 */
function addTokensToFloorLine(
  player: PlayerBoard,
  boxLid: TileColor[],
  tokens: FloorToken[]
): void {
  for (const token of tokens) {
    if (player.floorLine.length < MAX_FLOOR_SLOTS) {
      player.floorLine.push(token);
    } else if (token !== 'first-player') {
      boxLid.push(token);
    }
  }
}

/**
 * Checks whether all Factory displays and the Center Pool are out of colored tiles.
 */
export function areAllDraftSourcesEmpty(state: GameState): boolean {
  const factoriesEmpty = state.factories.every((f) => f.tiles.length === 0);
  return factoriesEmpty && state.center.tiles.length === 0;
}

/**
 * Computes the end-of-game bonus breakdowns (+2 per horizontal row, +7 per vertical column,
 * +10 per completed set of all 5 tiles of a color) and determines winner(s) with the
 * official rulebook horizontal-row tie-breaker.
 */
export function calculateEndGameBonuses(players: PlayerBoard[]): {
  breakdowns: EndGameBonusBreakdown[];
  winnerIds: string[];
  bonusEvents: ScoringStepEvent[];
} {
  const breakdowns: EndGameBonusBreakdown[] = [];
  const bonusEvents: ScoringStepEvent[] = [];

  players.forEach((player, playerIndex) => {
    const scoreBeforeBonuses = player.score;
    let completedRows = 0;
    let completedCols = 0;
    const completedColors: TileColor[] = [];

    // 1. Horizontal rows (+2 each)
    for (let r = 0; r < 5; r++) {
      if (player.wall[r].every((cell) => cell.filledColor !== null)) {
        completedRows++;
      }
    }
    const rowBonusPoints = completedRows * 2;
    if (completedRows > 0) {
      bonusEvents.push({
        id: `bonus-row-${player.id}`,
        playerId: player.id,
        playerIndex,
        type: 'end-bonus',
        pointsDelta: rowBonusPoints,
        newScore: scoreBeforeBonuses + rowBonusPoints,
        horizontalChain: [],
        verticalChain: [],
        bonusCategory: 'horizontal-row',
        bonusCount: completedRows,
        description: `${player.name} scored +${rowBonusPoints} for ${completedRows} complete horizontal row${completedRows > 1 ? 's' : ''}`,
      });
    }

    // 2. Vertical columns (+7 each)
    for (let c = 0; c < 5; c++) {
      let colComplete = true;
      for (let r = 0; r < 5; r++) {
        if (player.wall[r][c].filledColor === null) {
          colComplete = false;
          break;
        }
      }
      if (colComplete) {
        completedCols++;
      }
    }
    const colBonusPoints = completedCols * 7;
    if (completedCols > 0) {
      bonusEvents.push({
        id: `bonus-col-${player.id}`,
        playerId: player.id,
        playerIndex,
        type: 'end-bonus',
        pointsDelta: colBonusPoints,
        newScore: scoreBeforeBonuses + rowBonusPoints + colBonusPoints,
        horizontalChain: [],
        verticalChain: [],
        bonusCategory: 'vertical-col',
        bonusCount: completedCols,
        description: `${player.name} scored +${colBonusPoints} for ${completedCols} complete vertical column${completedCols > 1 ? 's' : ''}`,
      });
    }

    // 3. All 5 tiles of a single color (+10 each)
    for (const color of ALL_TILE_COLORS) {
      let colorCount = 0;
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (player.wall[r][c].filledColor === color) {
            colorCount++;
          }
        }
      }
      if (colorCount === 5) {
        completedColors.push(color);
      }
    }
    const colorBonusPoints = completedColors.length * 10;
    if (completedColors.length > 0) {
      bonusEvents.push({
        id: `bonus-color-${player.id}`,
        playerId: player.id,
        playerIndex,
        type: 'end-bonus',
        pointsDelta: colorBonusPoints,
        newScore: scoreBeforeBonuses + rowBonusPoints + colBonusPoints + colorBonusPoints,
        horizontalChain: [],
        verticalChain: [],
        bonusCategory: 'color-set',
        bonusCount: completedColors.length,
        description: `${player.name} scored +${colorBonusPoints} for completing all 5 tiles of ${completedColors.length} color${completedColors.length > 1 ? 's' : ''}`,
      });
    }

    const totalBonusPoints = rowBonusPoints + colBonusPoints + colorBonusPoints;
    const finalScore = scoreBeforeBonuses + totalBonusPoints;

    breakdowns.push({
      playerId: player.id,
      playerName: player.name,
      scoreBeforeBonuses,
      completedRows,
      rowBonusPoints,
      completedCols,
      colBonusPoints,
      completedColors,
      colorBonusPoints,
      totalBonusPoints,
      finalScore,
      isWinner: false,
      isTieBreakerWinner: false,
    });
  });

  // Determine winner(s): highest finalScore, tie-broken by most completedRows
  const maxScore = Math.max(...breakdowns.map((b) => b.finalScore));
  const topScorers = breakdowns.filter((b) => b.finalScore === maxScore);
  const maxRowsAmongTop = Math.max(...topScorers.map((b) => b.completedRows));
  const winners = topScorers.filter((b) => b.completedRows === maxRowsAmongTop);
  const usedTieBreaker = topScorers.length > 1;

  const winnerIds = winners.map((w) => w.playerId);
  for (const b of breakdowns) {
    if (winnerIds.includes(b.playerId)) {
      b.isWinner = true;
      if (usedTieBreaker) {
        b.isTieBreakerWinner = true;
      }
    }
  }

  return { breakdowns, winnerIds, bonusEvents };
}

/**
 * Pure simulation of Wall-Tiling events for `pendingScoringEvents` preview when Phase A concludes.
 */
export function computeWallTilingEvents(
  state: GameState,
  grayColOverrides?: Record<string, number>
): ScoringStepEvent[] {
  const simulated = cloneGameState(state);
  const { events } = executeWallTilingInternal(simulated, grayColOverrides);
  return events;
}

/**
 * Internal helper that mutates `nextState` in place to perform Phase B (Wall-Tiling)
 * and either ends the game or sets up Phase C (Next Round preparation).
 */
function executeWallTilingInternal(
  nextState: GameState,
  grayColOverrides?: Record<string, number>
): { nextState: GameState; events: ScoringStepEvent[] } {
  const events: ScoringStepEvent[] = [];

  nextState.players.forEach((player, playerIndex) => {
    // 1. Score completed Pattern Lines from top (row 0) to bottom (row 4)
    for (let row = 0; row < 5; row++) {
      const line = player.patternLines[row];
      if (line.count === line.capacity && line.color !== null) {
        const tileColor = line.color;
        const overrideKey = `${player.id}:${row}`;
        const preferredCol =
          grayColOverrides?.[overrideKey] ??
          grayColOverrides?.[`${playerIndex}:${row}`] ??
          line.targetWallCol;

        const targetCol = pickBestGrayWallColumn(player, row, tileColor, preferredCol);
        if (targetCol !== null) {
          // Place 1 tile onto the Wall
          player.wall[row][targetCol].filledColor = tileColor;

          // Score immediately so lower rows in the same round chain vertically!
          const { points, horizontalChain, verticalChain } = scoreWallTilePlacement(
            player.wall,
            row,
            targetCol
          );
          player.score += points;

          // Move remaining (capacity - 1) tiles from pattern line to boxLid
          for (let discarded = 0; discarded < line.capacity - 1; discarded++) {
            nextState.boxLid.push(tileColor);
          }

          // Clear pattern line
          line.color = null;
          line.count = 0;
          line.targetWallCol = null;

          events.push({
            id: `wall-r${nextState.roundNumber}-p${playerIndex}-row${row}`,
            playerId: player.id,
            playerIndex,
            type: 'tile-placement',
            row,
            col: targetCol,
            color: tileColor,
            pointsDelta: points,
            newScore: player.score,
            horizontalChain,
            verticalChain,
            description: `${player.name} placed ${tileColor} at (${row + 1}, ${targetCol + 1}) for +${points} pt${points > 1 ? 's' : ''}`,
          });
        }
      }
    }

    // 2. Score Floor Line penalties
    if (player.floorLine.length > 0) {
      const floorPenalty = calculateFloorPenaltyForCount(player.floorLine.length);
      player.score = Math.max(0, player.score + floorPenalty);
      const clearedTokens = [...player.floorLine];

      // Move colored floor tiles to boxLid (never put 'first-player' token in boxLid!)
      for (const token of player.floorLine) {
        if (token !== 'first-player') {
          nextState.boxLid.push(token);
        }
      }
      player.floorLine = [];

      events.push({
        id: `floor-r${nextState.roundNumber}-p${playerIndex}`,
        playerId: player.id,
        playerIndex,
        type: 'floor-penalty',
        pointsDelta: floorPenalty,
        newScore: player.score,
        horizontalChain: [],
        verticalChain: [],
        floorTokensCleared: clearedTokens,
        description: `${player.name} lost ${Math.abs(floorPenalty)} pt${Math.abs(floorPenalty) > 1 ? 's' : ''} from floor penalties`,
      });
    }
  });

  // 3. Check end-of-game condition: Has any player completed at least 1 horizontal wall row of 5 tiles?
  const anyHorizontalRowCompleted = nextState.players.some((player) =>
    player.wall.some((row) => row.every((cell) => cell.filledColor !== null))
  );

  if (anyHorizontalRowCompleted) {
    const { breakdowns, winnerIds, bonusEvents } = calculateEndGameBonuses(nextState.players);
    // Apply final scores to each player
    nextState.players.forEach((player, idx) => {
      player.score = breakdowns[idx].finalScore;
    });
    nextState.endGameBonuses = breakdowns;
    nextState.winnerIds = winnerIds;
    nextState.phase = 'game-over';
    nextState.pendingScoringEvents = [];
    events.push(...bonusEvents);
    return { nextState, events };
  }

  // 4. Prepare Next Round (Phase C)
  let nextStartingPlayer = nextState.startingPlayerIndex;
  nextState.players.forEach((player, idx) => {
    if (player.hasFirstPlayerTokenForNextRound) {
      nextStartingPlayer = idx;
    }
    player.hasFirstPlayerTokenForNextRound = false;
  });

  const numFactories = getFactoryCountForPlayers(nextState.players.length);
  const {
    factories: refilledFactories,
    bag: updatedBag,
    boxLid: updatedBoxLid,
    nextSeed,
  } = fillFactoriesFromBag(numFactories, nextState.bag, nextState.boxLid, nextState.seed);

  nextState.factories = refilledFactories;
  nextState.bag = updatedBag;
  nextState.boxLid = updatedBoxLid;
  nextState.seed = nextSeed;
  nextState.center = {
    tiles: [],
    hasFirstPlayerToken: true,
  };
  nextState.startingPlayerIndex = nextStartingPlayer;
  nextState.activePlayerIndex = nextStartingPlayer;
  nextState.roundNumber += 1;
  nextState.phase = 'factory-offer';
  nextState.pendingScoringEvents = [];

  return { nextState, events };
}

/**
 * Executes Phase B (Wall-Tiling) and Phase C (Prepare Next Round or End Game) immutably.
 */
export function executeWallTilingAndAdvanceRound(
  state: GameState,
  grayColOverrides?: Record<string, number>
): { nextState: GameState; events: ScoringStepEvent[] } {
  const nextState = cloneGameState(state);
  return executeWallTilingInternal(nextState, grayColOverrides);
}

/**
 * Applies a legal Phase A DraftMove and returns the updated GameState.
 * When the final tile in all factories and center is drafted, transitions `phase` to `'wall-tiling'`
 * and populates `pendingScoringEvents`.
 */
export function applyDraftMove(state: GameState, move: DraftMove): GameState {
  const preview = previewDraftMove(state, move, state.activePlayerIndex);
  if (!preview.valid) {
    throw new Error(`Illegal draft move: ${preview.reason ?? 'Unknown reason'}`);
  }

  const nextState = cloneGameState(state);
  const player = nextState.players[nextState.activePlayerIndex];

  let pickedTiles: TileColor[] = [];
  let tookFirstPlayer = false;

  if (move.sourceType === 'factory') {
    const factory = nextState.factories.find((f) => f.id === move.factoryId)!;
    pickedTiles = factory.tiles.filter((t) => t === move.color);
    const remainingTiles = factory.tiles.filter((t) => t !== move.color);
    // Move remaining factory tiles to the center pool
    nextState.center.tiles.push(...remainingTiles);
    factory.tiles = [];
  } else {
    pickedTiles = nextState.center.tiles.filter((t) => t === move.color);
    nextState.center.tiles = nextState.center.tiles.filter((t) => t !== move.color);

    if (nextState.center.hasFirstPlayerToken) {
      nextState.center.hasFirstPlayerToken = false;
      player.hasFirstPlayerTokenForNextRound = true;
      tookFirstPlayer = true;
      addTokensToFloorLine(player, nextState.boxLid, ['first-player']);
    }
  }

  // Place picked tiles into destination
  if (move.destinationRow === 'floor') {
    addTokensToFloorLine(player, nextState.boxLid, pickedTiles);
  } else {
    const line = player.patternLines[move.destinationRow];
    const freeSpaces = line.capacity - line.count;
    const toPlace = Math.min(pickedTiles.length, freeSpaces);
    const overflowCount = pickedTiles.length - toPlace;

    line.color = move.color;
    line.count += toPlace;
    if (move.grayWallCol !== undefined) {
      line.targetWallCol = move.grayWallCol;
    } else if (nextState.wallMode === 'gray' && line.targetWallCol === null) {
      line.targetWallCol = preview.targetWallCol;
    }

    if (overflowCount > 0) {
      const overflowTiles = Array.from({ length: overflowCount }, () => move.color);
      addTokensToFloorLine(player, nextState.boxLid, overflowTiles);
    }
  }

  nextState.lastTurn = {
    playerId: player.id,
    playerName: player.name,
    move: { ...move },
    tilesTaken: pickedTiles.length,
    tookFirstPlayer,
    timestamp: nextState.roundNumber * 1000 + nextState.activePlayerIndex,
  };

  // Check if Phase A (Factory Offer) is complete
  if (areAllDraftSourcesEmpty(nextState)) {
    nextState.phase = 'wall-tiling';
    nextState.pendingScoringEvents = computeWallTilingEvents(nextState);
  } else {
    nextState.activePlayerIndex =
      (nextState.activePlayerIndex + 1) % nextState.players.length;
  }

  return nextState;
}
