export type TileColor = 'blue' | 'yellow' | 'red' | 'black' | 'teal';

export type FloorToken = TileColor | 'first-player';

export type WallMode = 'standard' | 'gray';

export type GameMode = 'ai' | 'pass-and-play' | 'online' | 'tutorial';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export type GamePhase =
  | 'factory-offer'
  | 'wall-tiling'
  | 'round-end'
  | 'game-over';

export interface PatternLine {
  rowIndex: number; // 0..4 (capacity is rowIndex + 1)
  capacity: number; // 1..5
  color: TileColor | null;
  count: number; // 0..capacity
  /** Optional pre-selected wall column (0..4) for Gray Variant mode when this line completes */
  targetWallCol?: number | null;
}

export interface WallCell {
  row: number; // 0..4
  col: number; // 0..4
  expectedColor: TileColor | null; // TileColor in 'standard', null in 'gray'
  filledColor: TileColor | null; // non-null once placed
}

export type WallGrid = WallCell[][]; // 5x5 matrix [row][col]

export interface PlayerBoard {
  id: string;
  name: string;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  avatarColor: string;
  score: number;
  patternLines: PatternLine[]; // length 5
  wall: WallGrid; // 5x5
  floorLine: FloorToken[]; // up to 7 items scored as [-1, -1, -2, -2, -2, -3, -3]
  hasFirstPlayerTokenForNextRound: boolean;
}

export interface FactoryDisplay {
  id: number; // 0..(numFactories-1)
  tiles: TileColor[]; // 0..4 tiles
}

export interface CenterPool {
  tiles: TileColor[];
  hasFirstPlayerToken: boolean;
}

export interface DraftSelection {
  sourceType: 'factory' | 'center';
  factoryId?: number;
  color: TileColor;
  count: number;
  takesFirstPlayerToken: boolean;
}

export interface DraftMove {
  sourceType: 'factory' | 'center';
  factoryId?: number; // required if sourceType === 'factory'
  color: TileColor;
  /** 0..4 for Pattern Line 1..5, or 'floor' to place directly onto Floor Line */
  destinationRow: number | 'floor';
  /** Optional wall column (0..4) if playing Gray Variant and completing or planning the row */
  grayWallCol?: number;
}

export interface MoveScorePreview {
  valid: boolean;
  reason?: string;
  tilesPlacedInLine: number;
  tilesOverflowToFloor: number;
  takesFirstPlayerToken: boolean;
   completesLine: boolean;
  estimatedWallGain: number;
  estimatedFloorPenalty: number;
  netImmediateDelta: number;
  targetWallCol: number | null;
  horizontalChainCoords: [number, number][];
  verticalChainCoords: [number, number][];
}

export interface ScoringStepEvent {
  id: string;
  playerId: string;
  playerIndex: number;
  type: 'tile-placement' | 'floor-penalty' | 'end-bonus';
  row?: number;
  col?: number;
  color?: TileColor;
  pointsDelta: number;
  newScore: number;
  horizontalChain: [number, number][]; // coordinates linked horizontally
  verticalChain: [number, number][]; // coordinates linked vertically
  floorTokensCleared?: FloorToken[];
  bonusCategory?: 'horizontal-row' | 'vertical-col' | 'color-set';
  bonusCount?: number;
  description: string;
}

export interface EndGameBonusBreakdown {
  playerId: string;
  playerName: string;
  scoreBeforeBonuses: number;
  completedRows: number; // +2 each
  rowBonusPoints: number;
  completedCols: number; // +7 each
  colBonusPoints: number;
  completedColors: TileColor[]; // +10 each
  colorBonusPoints: number;
  totalBonusPoints: number;
  finalScore: number;
  isWinner: boolean;
  isTieBreakerWinner?: boolean;
}

export interface LastTurnSummary {
  playerId: string;
  playerName: string;
  move: DraftMove;
  tilesTaken: number;
  tookFirstPlayer: boolean;
  timestamp: number;
}

export interface GameState {
  matchId: string;
  seed: number;
  mode: GameMode;
  wallMode: WallMode;
  phase: GamePhase;
  roundNumber: number;
  players: PlayerBoard[];
  activePlayerIndex: number;
  startingPlayerIndex: number;
  factories: FactoryDisplay[];
  center: CenterPool;
  bag: TileColor[];
  boxLid: TileColor[];
  pendingScoringEvents: ScoringStepEvent[];
  endGameBonuses: EndGameBonusBreakdown[];
  winnerIds: string[];
  lastTurn: LastTurnSummary | null;
}

export const ALL_TILE_COLORS: readonly TileColor[] = [
  'blue',
  'yellow',
  'red',
  'black',
  'teal',
] as const;

export const FLOOR_PENALTIES: readonly number[] = [
  -1, -1, -2, -2, -2, -3, -3,
] as const;

/**
 * Standard colored Wall 5x5 layout (exact match to official Azul Rulebook):
 * Row 0: blue, yellow, red, black, teal
 * Row 1: teal, blue, yellow, red, black
 * Row 2: black, teal, blue, yellow, red
 * Row 3: red, black, teal, blue, yellow
 * Row 4: yellow, red, black, teal, blue
 */
export const STANDARD_WALL_LAYOUT: readonly (readonly TileColor[])[] = [
  ['blue', 'yellow', 'red', 'black', 'teal'],
  ['teal', 'blue', 'yellow', 'red', 'black'],
  ['black', 'teal', 'blue', 'yellow', 'red'],
  ['red', 'black', 'teal', 'blue', 'yellow'],
  ['yellow', 'red', 'black', 'teal', 'blue'],
] as const;

export const TILE_METADATA: Record<
  TileColor,
  {
    name: string;
    portugueseName: string;
    primaryHex: string;
    accentHex: string;
    textureUrl: string;
  }
> = {
  blue: {
    name: 'Royal Cobalt',
    portugueseName: 'Azul Real',
    primaryHex: '#1565C0',
    accentHex: '#90CAF9',
    textureUrl: 'textures/tile_blue.png',
  },
  yellow: {
    name: 'Saffron Gold',
    portugueseName: 'Sol Dourado',
    primaryHex: '#F9A825',
    accentHex: '#1E88E5',
    textureUrl: 'textures/tile_yellow.png',
  },
  red: {
    name: 'Terracotta Coral',
    portugueseName: 'Coral de Évora',
    primaryHex: '#D84315',
    accentHex: '#FFAB91',
    textureUrl: 'textures/tile_red.png',
  },
  black: {
    name: 'Onyx Moorish',
    portugueseName: 'Noite Mourisca',
    primaryHex: '#263238',
    accentHex: '#4DD0E1',
    textureUrl: 'textures/tile_black.png',
  },
  teal: {
    name: 'Sky Starburst',
    portugueseName: 'Estrela do Tejo',
    primaryHex: '#00ACC1',
    accentHex: '#E0F7FA',
    textureUrl: 'textures/tile_teal.png',
  },
};
