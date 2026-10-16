import {
  AIDifficulty,
  ALL_TILE_COLORS,
  DraftMove,
  GameState,
  PlayerBoard,
  TileColor,
} from '../types/game';
import {
  applyDraftMove,
  getAllLegalMoves,
  getValidGrayWallColumns,
  previewDraftMove,
  scoreWallTilePlacement,
} from '../engine/azulEngine';
import { createPRNG } from '../engine/prng';

/**
 * Counts how many tiles of `color` remain in active play (all factories + center pool).
 */
function countRemainingPlayableColorInRound(state: GameState, color: TileColor): number {
  let count = 0;
  for (const factory of state.factories) {
    for (const t of factory.tiles) {
      if (t === color) count++;
    }
  }
  for (const t of state.center.tiles) {
    if (t === color) count++;
  }
  return count;
}

/**
 * Counts how many tiles of `color` remain in the draw bag + active round sources.
 */
function countRemainingColorBeforeReshuffle(state: GameState, color: TileColor): number {
  let count = countRemainingPlayableColorInRound(state, color);
  for (const t of state.bag) {
    if (t === color) count++;
  }
  return count;
}

/**
 * Evaluates long-term positional value of placing `color` at `(row, col)` on `player.wall`.
 */
function evaluateWallPositionalValue(
  player: PlayerBoard,
  row: number,
  col: number,
  color: TileColor
): number {
  let bonusPotential = 0;

  // 1. Centrality bonus: columns 1..3 and rows 1..3 create stronger future 2-axis links
  const rowCentrality = 2 - Math.abs(2 - row); // 0..2
  const colCentrality = 2 - Math.abs(2 - col); // 0..2
  bonusPotential += (rowCentrality + colCentrality) * 0.35;

  // 2. Column completion progress (+7 end-game bonus)
  let colFilled = 0;
  for (let r = 0; r < 5; r++) {
    if (r === row || player.wall[r][col].filledColor !== null) {
      colFilled++;
    } else if (
      player.patternLines[r].count === player.patternLines[r].capacity &&
      player.patternLines[r].color !== null
    ) {
      // Check if an already completed pattern line in row r will also land in this column
      const valid = getValidGrayWallColumns(player, r, player.patternLines[r].color!);
      if (valid[0] === col) colFilled++;
    }
  }
  if (colFilled === 5) bonusPotential += 7.0;
  else if (colFilled === 4) bonusPotential += 2.6;
  else if (colFilled === 3) bonusPotential += 1.1;

  // 3. Row completion progress (+2 end-game bonus + game-end trigger control)
  let rowFilled = 0;
  for (let c = 0; c < 5; c++) {
    if (c === col || player.wall[row][c].filledColor !== null) {
      rowFilled++;
    }
  }
  if (rowFilled === 5) bonusPotential += 2.5;
  else if (rowFilled === 4) bonusPotential += 1.0;

  // 4. All-5-of-a-color progress (+10 end-game bonus)
  let colorFilled = 1; // including this placement
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (r !== row && player.wall[r][c].filledColor === color) {
        colorFilled++;
      }
    }
  }
  if (colorFilled === 5) bonusPotential += 10.0;
  else if (colorFilled === 4) bonusPotential += 3.2;
  else if (colorFilled === 3) bonusPotential += 1.2;

  return bonusPotential;
}

/**
 * Expands moves in `'gray'` wall mode so the AI can explicitly choose the optimal `grayWallCol`.
 */
function expandGrayWallCandidateMoves(
  state: GameState,
  baseMoves: DraftMove[],
  playerIndex: number
): DraftMove[] {
  if (state.wallMode !== 'gray') return baseMoves;

  const player = state.players[playerIndex];
  const expanded: DraftMove[] = [];

  for (const move of baseMoves) {
    if (move.destinationRow === 'floor') {
      expanded.push(move);
      continue;
    }

    const validCols = getValidGrayWallColumns(player, move.destinationRow, move.color);
    if (validCols.length <= 1) {
      expanded.push({
        ...move,
        grayWallCol: validCols[0],
      });
    } else {
      for (const col of validCols) {
        expanded.push({
          ...move,
          grayWallCol: col,
        });
      }
    }
  }

  return expanded;
}

/**
 * Evaluates a candidate move for Medium difficulty.
 */
function scoreMoveMedium(state: GameState, move: DraftMove, playerIndex: number): number {
  const player = state.players[playerIndex];
  const preview = previewDraftMove(state, move, playerIndex);
  if (!preview.valid) return -9999;

  let score = preview.netImmediateDelta * 2.0;

  if (move.destinationRow === 'floor') {
    // Strongly avoid dumping directly to floor unless all pattern line moves are worse
    score -= 4.5 + preview.tilesOverflowToFloor * 1.2;
    return score;
  }

  const row = move.destinationRow;
  const line = player.patternLines[row];
  const newCount = line.count + preview.tilesPlacedInLine;
  const fillRatio = newCount / line.capacity;

  // Reward filling pattern lines and completing them
  score += preview.tilesPlacedInLine * 1.4;
  if (preview.completesLine) {
    score += 3.0;
  } else {
    score += fillRatio * 1.5;
  }

  // Positional wall value
  if (preview.targetWallCol !== null) {
    score +=
      evaluateWallPositionalValue(player, row, preview.targetWallCol, move.color) * 0.65;
  }

  // Slight compensation for capturing first player token when penalty is mild
  if (preview.takesFirstPlayerToken && player.floorLine.length <= 1) {
    score += 0.8;
  }

  return score;
}

/**
 * Evaluates a candidate move for Hard difficulty ("Master Artisan of Évora"):
 * - Multi-axis wall cluster adjacency density
 * - Supply-aware stranding prevention on rows 4 and 5
 * - Opponent denial & hate-drafting (forcing opponent floor overflow)
 * - First-player token tempo valuation
 */
function scoreMoveHard(state: GameState, move: DraftMove, playerIndex: number): number {
  const player = state.players[playerIndex];
  const preview = previewDraftMove(state, move, playerIndex);
  if (!preview.valid) return -9999;

  // 1. Immediate wall points + floor penalty weight
  let score = preview.estimatedWallGain * 2.5 + preview.estimatedFloorPenalty * 2.3;

  if (move.destinationRow === 'floor') {
    score -= 6.0;
  } else {
    const row = move.destinationRow;
    const line = player.patternLines[row];
    const newCount = line.count + preview.tilesPlacedInLine;
    const neededToComplete = line.capacity - newCount;

    // 2. Completion and tile efficiency
    score += preview.tilesPlacedInLine * 1.65;

    if (preview.completesLine) {
      score += 4.2 + row * 0.45;
    } else {
      // Check remaining tile supply in round and before reshuffle so we don't strand large lines
      const remainingInRound =
        countRemainingPlayableColorInRound(state, move.color) -
        ( preview.tilesPlacedInLine + preview.tilesOverflowToFloor );
      const remainingBeforeReshuffle =
        countRemainingColorBeforeReshuffle(state, move.color) -
        ( preview.tilesPlacedInLine + preview.tilesOverflowToFloor );

      if (remainingInRound >= neededToComplete) {
        // Can still complete this round!
        score += (newCount / line.capacity) * 2.4;
      } else if (remainingBeforeReshuffle < neededToComplete && row >= 3) {
        // Stranding a 4- or 5-tile pattern line when not enough tiles exist before reshuffle
        score -= 4.5;
      } else {
        // Carries over to next round; smaller penalty for upper rows, larger for bottom rows
        score -= neededToComplete * 0.65;
      }
    }

    // 3. Central wall cluster & end-game bonus alignment
    if (preview.targetWallCol !== null) {
      score += evaluateWallPositionalValue(player, row, preview.targetWallCol, move.color);

      // Even if line doesn't complete this turn, reward building toward a high-adjacency wall spot
      if (!preview.completesLine) {
        const futureWallScore = scoreWallTilePlacement(
          player.wall,
          row,
          preview.targetWallCol
        ).points;
        score += futureWallScore * (newCount / line.capacity) * 1.1;
      }
    }
  }

  // 4. First-player token tempo value
  if (preview.takesFirstPlayerToken) {
    // Going first next round is worth roughly +1.6 pts in a 2-player game, slightly less if floor is already crowded
    const tempoValue = state.players.length === 2 ? 1.75 : 1.35;
    score += tempoValue;
  }

  // 5. Opponent denial / Hate-drafting lookahead (1-ply response evaluation)
  if (state.players.length > 1) {
    const nextPlayerIdx = (playerIndex + 1) % state.players.length;
    try {
      const stateAfterMove = applyDraftMove(state, move);
      if (stateAfterMove.phase === 'factory-offer') {
        const oppMoves = getAllLegalMoves(stateAfterMove, nextPlayerIdx);
        if (oppMoves.length > 0) {
          let oppBestDelta = -999;
          for (const oppMove of oppMoves) {
            const oppPreview = previewDraftMove(stateAfterMove, oppMove, nextPlayerIdx);
            if (!oppPreview.valid) continue;
            const oppValue =
              oppPreview.netImmediateDelta * 1.8 +
              oppPreview.tilesPlacedInLine * 1.1 +
              (oppPreview.completesLine ? 2.5 : 0);
            if (oppValue > oppBestDelta) {
              oppBestDelta = oppValue;
            }
          }
          // Penalize moves that hand the next player a massive turn, or reward moves that force opponent into floor penalties
          score -= oppBestDelta * 0.35;
        }
      }
    } catch {
      // Ignore lookahead errors
    }
  }

  return score;
}

/**
 * Selects a legal DraftMove for the active AI player according to the chosen AIDifficulty:
 * - `'easy'`: Prefers moves that place tiles onto pattern lines with minimal floor overflow, with mild deterministic variance.
 * - `'medium'`: Evaluates net immediate score delta, pattern line completion, and bonus alignment.
 * - `'hard'` ("Master Artisan of Évora"): Evaluates multi-axis wall cluster density, tile supply stranding risk, first-player tempo, and 1-ply opponent hate-drafting.
 */
export function chooseAIMove(
  state: GameState,
  difficulty: AIDifficulty = 'medium'
): DraftMove {
  const playerIndex = state.activePlayerIndex;
  const baseLegalMoves = getAllLegalMoves(state, playerIndex);

  if (baseLegalMoves.length === 0) {
    throw new Error('No legal moves available for AI player.');
  }

  if (baseLegalMoves.length === 1) {
    return baseLegalMoves[0];
  }

  const prng = createPRNG(
    state.seed ^ (state.roundNumber * 7919) ^ (playerIndex * 104729) ^ state.center.tiles.length
  );

  // Easy AI: prefers pattern line placements over floor dumps, with mild randomness
  if (difficulty === 'easy') {
    const patternMoves = baseLegalMoves.filter((m) => m.destinationRow !== 'floor');
    const pool = patternMoves.length > 0 ? patternMoves : baseLegalMoves;

    const scored = pool.map((move) => {
      const preview = previewDraftMove(state, move, playerIndex);
      const jitter = prng.next() * 2.5;
      const value =
        preview.tilesPlacedInLine * 1.5 -
        preview.tilesOverflowToFloor * 1.2 +
        (preview.completesLine ? 1.5 : 0) +
        jitter;
      return { move, value };
    });

    scored.sort((a, b) => b.value - a.value);
    return scored[0].move;
  }

  const candidateMoves = expandGrayWallCandidateMoves(state, baseLegalMoves, playerIndex);

  // Medium AI
  if (difficulty === 'medium') {
    let bestMove = candidateMoves[0];
    let bestScore = -Infinity;

    for (const move of candidateMoves) {
      const jitter = prng.next() * 0.15;
      const moveScore = scoreMoveMedium(state, move, playerIndex) + jitter;
      if (moveScore > bestScore) {
        bestScore = moveScore;
        bestMove = move;
      }
    }
    return bestMove;
  }

  // Hard AI ("Master Artisan of Évora")
  let bestMove = candidateMoves[0];
  let bestScore = -Infinity;

  for (const move of candidateMoves) {
    const tieBreak = prng.next() * 0.01;
    const moveScore = scoreMoveHard(state, move, playerIndex) + tieBreak;
    if (moveScore > bestScore) {
      bestScore = moveScore;
      bestMove = move;
    }
  }

  return bestMove;
}
