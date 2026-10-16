import { describe, expect, it } from 'vitest';
import {
  applyDraftMove,
  calculateEndGameBonuses,
  createInitialGameState,
  createInitialWall,
  executeWallTilingAndAdvanceRound,
  getAllLegalMoves,
  getAvailableColorsInSource,
  getFactoryCountForPlayers,
  getValidGrayWallColumns,
  previewDraftMove,
  scoreWallTilePlacement,
} from '../azulEngine';
import { chooseAIMove } from '../../ai/azulAI';
import { ALL_TILE_COLORS, TileColor } from '../../types/game';

describe('Azul Game Engine - Official Rulebook Verification', () => {
  describe('1. Game Setup & Tile Distribution', () => {
    it('sets up 5, 7, and 9 factories for 2, 3, and 4 players with exactly 100 tiles (20 per color)', () => {
      for (const [playerCount, expectedFactories] of [
        [2, 5],
        [3, 7],
        [4, 9],
      ] as const) {
        expect(getFactoryCountForPlayers(playerCount)).toBe(expectedFactories);

        const configs = Array.from({ length: playerCount }, (_, i) => ({
          id: `p${i + 1}`,
          name: `Player ${i + 1}`,
          isAI: false,
        }));

        const state = createInitialGameState({
          playerConfigs: configs,
          wallMode: 'standard',
          mode: 'pass-and-play',
          seed: 42,
        });

        expect(state.factories).toHaveLength(expectedFactories);
        state.factories.forEach((f) => expect(f.tiles).toHaveLength(4));
        expect(state.center.tiles).toHaveLength(0);
        expect(state.center.hasFirstPlayerToken).toBe(true);

        // Count all tiles across factories + bag + boxLid
        const colorTotals = new Map<TileColor, number>();
        const allTiles = [
          ...state.factories.flatMap((f) => f.tiles),
          ...state.center.tiles,
          ...state.bag,
          ...state.boxLid,
        ];
        expect(allTiles).toHaveLength(100);

        for (const t of allTiles) {
          colorTotals.set(t, (colorTotals.get(t) ?? 0) + 1);
        }
        for (const color of ALL_TILE_COLORS) {
          expect(colorTotals.get(color)).toBe(20);
        }
      }
    });

    it('produces 100% deterministic setup for the same seed', () => {
      const configs = [
        { id: 'p1', name: 'P1', isAI: false },
        { id: 'p2', name: 'P2', isAI: true },
      ];
      const stateA = createInitialGameState({
        playerConfigs: configs,
        wallMode: 'standard',
        mode: 'ai',
        seed: 987654,
      });
      const stateB = createInitialGameState({
        playerConfigs: configs,
        wallMode: 'standard',
        mode: 'ai',
        seed: 987654,
      });

      expect(stateA.factories).toEqual(stateB.factories);
      expect(stateA.bag).toEqual(stateB.bag);
    });
  });

  describe('2. Phase A: Factory Offer & Center Pool Drafting', () => {
    it('picks all tiles of chosen color from a Factory and moves remaining tiles to Center', () => {
      const state = createInitialGameState({
        playerConfigs: [
          { id: 'p1', name: 'P1', isAI: false },
          { id: 'p2', name: 'P2', isAI: false },
        ],
        wallMode: 'standard',
        mode: 'pass-and-play',
        seed: 100,
      });

      state.factories[0].tiles = ['blue', 'blue', 'red', 'yellow'];
      const avail = getAvailableColorsInSource(state, 'factory', 0);
      expect(avail).toEqual([
        { color: 'blue', count: 2 },
        { color: 'yellow', count: 1 },
        { color: 'red', count: 1 },
      ]);

      const nextState = applyDraftMove(state, {
        sourceType: 'factory',
        factoryId: 0,
        color: 'blue',
        destinationRow: 1, // capacity 2
      });

      expect(nextState.factories[0].tiles).toHaveLength(0);
      expect(nextState.center.tiles).toEqual(['red', 'yellow']);
      expect(nextState.players[0].patternLines[1].color).toBe('blue');
      expect(nextState.players[0].patternLines[1].count).toBe(2);
      expect(nextState.activePlayerIndex).toBe(1);
    });

    it('awards the First Player token to the first player who drafts from the Center only', () => {
      let state = createInitialGameState({
        playerConfigs: [
          { id: 'p1', name: 'P1', isAI: false },
          { id: 'p2', name: 'P2', isAI: false },
        ],
        wallMode: 'standard',
        mode: 'pass-and-play',
      });

      state.center.tiles = ['red', 'teal', 'teal'];
      state.center.hasFirstPlayerToken = true;

      // Player 1 drafts 'red' from center
      state = applyDraftMove(state, {
        sourceType: 'center',
        color: 'red',
        destinationRow: 0,
      });

      expect(state.center.hasFirstPlayerToken).toBe(false);
      expect(state.players[0].hasFirstPlayerTokenForNextRound).toBe(true);
      expect(state.players[0].floorLine).toEqual(['first-player']);

      // Player 2 drafts 'teal' from center next
      state = applyDraftMove(state, {
        sourceType: 'center',
        color: 'teal',
        destinationRow: 1,
      });

      expect(state.players[1].hasFirstPlayerTokenForNextRound).toBe(false);
      expect(state.players[1].floorLine).toEqual([]);
    });
  });

  describe('3. Pattern Line Rules & Floor Line Overflow (7-Slot Cap)', () => {
    it('enforces single color per pattern line, wall row color uniqueness, and overflows excess tiles to floor and boxLid', () => {
      let state = createInitialGameState({
        playerConfigs: [
          { id: 'p1', name: 'P1', isAI: false },
          { id: 'p2', name: 'P2', isAI: false },
        ],
        wallMode: 'standard',
        mode: 'pass-and-play',
      });

      // Pre-fill pattern line 2 (capacity 3) with 1 'blue' tile
      state.players[0].patternLines[2].color = 'blue';
      state.players[0].patternLines[2].count = 1;

      // Also place 'yellow' on wall row 1
      const yellowCol = state.players[0].wall[1].findIndex(
        (c) => c.expectedColor === 'yellow'
      );
      state.players[0].wall[1][yellowCol].filledColor = 'yellow';

      state.factories[0].tiles = ['red', 'yellow', 'blue', 'blue'];

      // 1. Cannot place 'red' onto pattern line 2 because it holds 'blue'
      const invalidColorMix = previewDraftMove(state, {
        sourceType: 'factory',
        factoryId: 0,
        color: 'red',
        destinationRow: 2,
      });
      expect(invalidColorMix.valid).toBe(false);

      // 2. Cannot place 'yellow' onto pattern line 1 because wall row 1 already has 'yellow'
      const invalidWallDup = previewDraftMove(state, {
        sourceType: 'factory',
        factoryId: 0,
        color: 'yellow',
        destinationRow: 1,
      });
      expect(invalidWallDup.valid).toBe(false);

      // 3. Test Floor Line 7-slot cap sending 8th+ fallen tiles directly to boxLid
      state.players[0].floorLine = [
        'first-player',
        'red',
        'red',
        'black',
        'black',
        'teal',
      ]; // 6 tokens currently in floor line
      state.factories[0].tiles = ['blue', 'blue', 'blue', 'blue'];

      // Draft 4 'blue' into row 2 (needs 2 more to reach capacity 3 -> 2 overflow to floor)
      // Since floor has 6 tokens, 1 overflow tile goes to slot 7, and the 2nd overflow tile goes to boxLid!
      state = applyDraftMove(state, {
        sourceType: 'factory',
        factoryId: 0,
        color: 'blue',
        destinationRow: 2,
      });

      expect(state.players[0].patternLines[2].count).toBe(3);
      expect(state.players[0].floorLine).toHaveLength(7);
      expect(state.players[0].floorLine[6]).toBe('blue');
      expect(state.boxLid).toEqual(['blue']);
    });
  });

  describe('4. Rulebook Page 5 Exact Scoring Examples & Sequential Top-to-Bottom Tiling', () => {
    it('scores isolated tile (1pt), horizontal chain (3pts), vertical chain (3pts), and combined 4H + 3V cross (7pts)', () => {
      const wall = createInitialWall('standard');

      // 1. Isolated tile at (2, 2) -> 1 point
      const isolated = scoreWallTilePlacement(wall, 2, 2);
      expect(isolated.points).toBe(1);

      // 2. Horizontal chain of 3: fill (2, 0) and (2, 1), then score placing (2, 2) -> 3 points
      wall[2][0].filledColor = wall[2][0].expectedColor;
      wall[2][1].filledColor = wall[2][1].expectedColor;
      const horiz3 = scoreWallTilePlacement(wall, 2, 2);
      expect(horiz3.points).toBe(3);
      expect(horiz3.horizontalChain).toEqual([
        [2, 0],
        [2, 1],
        [2, 2],
      ]);

      // 3. Vertical chain of 3: on fresh wall, fill (0, 3) and (1, 3), then score (2, 3) -> 3 points
      const wallV = createInitialWall('standard');
      wallV[0][3].filledColor = wallV[0][3].expectedColor;
      wallV[1][3].filledColor = wallV[1][3].expectedColor;
      const vert3 = scoreWallTilePlacement(wallV, 2, 3);
      expect(vert3.points).toBe(3);
      expect(vert3.verticalChain).toEqual([
        [0, 3],
        [1, 3],
        [2, 3],
      ]);

      // 4. Combined 4 horizontal + 3 vertical linked at (2, 2) -> 4 + 3 = 7 points
      wall[2][3].filledColor = wall[2][3].expectedColor; // Now row 2 has cols 0, 1, [2], 3 = 4 horizontal
      wall[1][2].filledColor = wall[1][2].expectedColor;
      wall[3][2].filledColor = wall[3][2].expectedColor; // Now col 2 has rows 1, [2], 3 = 3 vertical
      const combined = scoreWallTilePlacement(wall, 2, 2);
      expect(combined.points).toBe(7);
      expect(combined.horizontalChain).toHaveLength(4);
      expect(combined.verticalChain).toHaveLength(3);
    });

    it('tiles top-to-bottom sequentially so row 1 scores a vertical chain with row 0 tiled in the same round, and clamps floor penalty at 0', () => {
      const state = createInitialGameState({
        playerConfigs: [
          { id: 'p1', name: 'P1', isAI: false },
          { id: 'p2', name: 'P2', isAI: false },
        ],
        wallMode: 'standard',
        mode: 'pass-and-play',
      });

      // In standard wall layout:
      // Row 0 Col 0 is 'blue'
      // Row 1 Col 0 is 'teal'
      // Complete both Row 0 ('blue', cap 1) and Row 1 ('teal', cap 2) in the same round:
      state.players[0].patternLines[0] = {
        rowIndex: 0,
        capacity: 1,
        color: 'blue',
        count: 1,
      };
      state.players[0].patternLines[1] = {
        rowIndex: 1,
        capacity: 2,
        color: 'teal',
        count: 2,
      };

      // Player 2 has 2 points and 5 floor items (-1, -1, -2, -2, -2 = -8 penalty) -> clamped to 0!
      state.players[1].score = 2;
      state.players[1].floorLine = ['first-player', 'red', 'red', 'blue', 'yellow'];

      const { nextState, events } = executeWallTilingAndAdvanceRound(state);

      // Player 1: Row 0 ('blue' at 0,0) scores 1 pt; Row 1 ('teal' at 1,0) connects vertically with (0,0) for 2 pts! Total = 3 pts.
      expect(nextState.players[0].score).toBe(3);
      expect(nextState.players[0].wall[0][0].filledColor).toBe('blue');
      expect(nextState.players[0].wall[1][0].filledColor).toBe('teal');

      // Player 2: 2 - 8 = -6 -> clamped to 0
      expect(nextState.players[1].score).toBe(0);
      expect(nextState.players[1].floorLine).toHaveLength(0);

      // Verify 'first-player' token was NOT put into boxLid (1 'teal' discard from P1 row 1 + 4 colored floor tiles from P2 = 5 tiles in boxLid)
      expect(nextState.boxLid).toHaveLength(5);
      expect(nextState.boxLid).not.toContain('first-player');
      expect(events.some((e) => e.type === 'floor-penalty' && e.pointsDelta === -8)).toBe(
        true
      );
    });
  });

  describe('5. Bag Refill from Box Lid & Empty Supply Edge Case', () => {
    it('shuffles boxLid into bag mid-deal when bag runs out of tiles', () => {
      const state = createInitialGameState({
        playerConfigs: [
          { id: 'p1', name: 'P1', isAI: false },
          { id: 'p2', name: 'P2', isAI: false },
        ],
        wallMode: 'standard',
        mode: 'pass-and-play',
      });

      // 2 players = 5 factories = 20 tiles needed.
      // Leave only 3 tiles in bag and 25 tiles in boxLid:
      state.bag = ['blue', 'blue', 'blue'];
      state.boxLid = Array.from({ length: 25 }, () => 'red' as TileColor);

      const { nextState } = executeWallTilingAndAdvanceRound(state);

      const dealtCount = nextState.factories.reduce((sum, f) => sum + f.tiles.length, 0);
      expect(dealtCount).toBe(20);
      expect(nextState.bag).toHaveLength(8);
      expect(nextState.boxLid).toHaveLength(0);
    });

    it('starts the round with partial factories if both bag and boxLid run out completely', () => {
      const state = createInitialGameState({
        playerConfigs: [
          { id: 'p1', name: 'P1', isAI: false },
          { id: 'p2', name: 'P2', isAI: false },
        ],
        wallMode: 'standard',
        mode: 'pass-and-play',
      });

      state.bag = ['yellow', 'yellow'];
      state.boxLid = ['teal', 'teal', 'teal'];

      const { nextState } = executeWallTilingAndAdvanceRound(state);
      const dealtCount = nextState.factories.reduce((sum, f) => sum + f.tiles.length, 0);
      expect(dealtCount).toBe(5);
      expect(nextState.bag).toHaveLength(0);
      expect(nextState.boxLid).toHaveLength(0);
    });
  });

  describe('6. Gray Wall Variant Column Selection & Vertical Conflict Prevention', () => {
    it('prevents placing a color into a column that already holds that color in Gray Wall mode', () => {
      const state = createInitialGameState({
        playerConfigs: [
          { id: 'p1', name: 'P1', isAI: false },
          { id: 'p2', name: 'P2', isAI: false },
        ],
        wallMode: 'gray',
        mode: 'pass-and-play',
      });

      // Place 'blue' in Row 0, Column 2
      state.players[0].wall[0][2].filledColor = 'blue';

      // Valid columns for 'blue' in Row 1 should exclude column 2
      const validCols = getValidGrayWallColumns(state.players[0], 1, 'blue');
      expect(validCols).toEqual([0, 1, 3, 4]);

      // Respects explicit grayWallCol override during Wall-Tiling
      state.players[0].patternLines[1] = {
        rowIndex: 1,
        capacity: 2,
        color: 'blue',
        count: 2,
        targetWallCol: 3,
      };

      const { nextState } = executeWallTilingAndAdvanceRound(state);
      expect(nextState.players[0].wall[1][3].filledColor).toBe('blue');
    });
  });

  describe('7. End-of-Game Trigger, Bonuses (+2 Row, +7 Col, +10 Color), & Tie-Breaker', () => {
    it('awards +2 per horizontal row, +7 per vertical col, +10 per all-5 color set, and resolves ties via horizontal rows', () => {
      const state = createInitialGameState({
        playerConfigs: [
          { id: 'p1', name: 'Alice', isAI: false },
          { id: 'p2', name: 'Bob', isAI: false },
        ],
        wallMode: 'standard',
        mode: 'pass-and-play',
      });

      // Give Alice:
      // - Complete Row 0 (+2)
      // - Complete Col 0 (+7)
      // - All 5 'blue' tiles (+10)
      for (let c = 0; c < 5; c++) {
        state.players[0].wall[0][c].filledColor = state.players[0].wall[0][c].expectedColor;
      }
      for (let r = 0; r < 5; r++) {
        state.players[0].wall[r][0].filledColor = state.players[0].wall[r][0].expectedColor;
        // Fill 'blue' in every row (at col === r in standard layout)
        state.players[0].wall[r][r].filledColor = 'blue';
      }
      state.players[0].score = 30; // + 2 + 7 + 10 = 49

      // Give Bob:
      // - 2 Complete Rows (Row 0 and Row 1 -> +4)
      // - Base score 45 -> 45 + 4 = 49 (tied with Alice at 49, but Bob has 2 horizontal rows vs Alice's 1!)
      for (let r = 0; r < 2; r++) {
        for (let c = 0; c < 5; c++) {
          state.players[1].wall[r][c].filledColor =
            state.players[1].wall[r][c].expectedColor;
        }
      }
      state.players[1].score = 45;

      const { breakdowns, winnerIds } = calculateEndGameBonuses(state.players);

      expect(breakdowns[0].rowBonusPoints).toBe(2);
      expect(breakdowns[0].colBonusPoints).toBe(7);
      expect(breakdowns[0].colorBonusPoints).toBe(10);
      expect(breakdowns[0].finalScore).toBe(49);

      expect(breakdowns[1].rowBonusPoints).toBe(4);
      expect(breakdowns[1].finalScore).toBe(49);

      // Bob wins the tie-breaker with 2 completed horizontal rows vs Alice's 1!
      expect(winnerIds).toEqual(['p2']);
      expect(breakdowns[1].isWinner).toBe(true);
      expect(breakdowns[1].isTieBreakerWinner).toBe(true);
    });
  });

  describe('8. 3-Tier Strategic AI (Easy, Medium, Hard) & Full Simulated Match', () => {
    it('generates legal moves across Easy, Medium, and Hard difficulties and completes a full AI vs AI match to game-over', () => {
      let state = createInitialGameState({
        playerConfigs: [
          { id: 'ai-hard', name: 'Master Artisan', isAI: true, aiDifficulty: 'hard' },
          { id: 'ai-easy', name: 'Apprentice', isAI: true, aiDifficulty: 'easy' },
        ],
        wallMode: 'standard',
        mode: 'ai',
        seed: 2026,
      });

      // Verify all 3 difficulties return a valid move on initial state
      for (const diff of ['easy', 'medium', 'hard'] as const) {
        const move = chooseAIMove(state, diff);
        const preview = previewDraftMove(state, move);
        expect(preview.valid).toBe(true);
      }

      // Play a full match until phase === 'game-over'
      let safetyCounter = 0;
      while (state.phase !== 'game-over' && safetyCounter < 500) {
        safetyCounter++;
        if (state.phase === 'factory-offer') {
          const activePlayer = state.players[state.activePlayerIndex];
          const move = chooseAIMove(state, activePlayer.aiDifficulty ?? 'medium');
          state = applyDraftMove(state, move);
        } else if (state.phase === 'wall-tiling') {
          const { nextState } = executeWallTilingAndAdvanceRound(state);
          state = nextState;
        }
      }

      expect(state.phase).toBe('game-over');
      expect(state.winnerIds.length).toBeGreaterThanOrEqual(1);
      expect(state.endGameBonuses).toHaveLength(2);
      // Verify at least one player completed a horizontal wall row
      const hasFullRow = state.players.some((p) =>
        p.wall.some((row) => row.every((c) => c.filledColor !== null))
      );
      expect(hasFullRow).toBe(true);
    });
  });
});
