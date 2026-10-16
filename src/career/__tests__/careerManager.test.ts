import { describe, it, expect } from 'vitest';
import {
  computeDailySeedFromDateKey,
  createInitialCareerStats,
  getDailyChallengeInfo,
  recordCompletedMatch,
} from '../careerManager';
import { createInitialGameState } from '../../engine/azulEngine';

describe('CareerManager & Daily Seeded Challenge Suite', () => {
  it('generates deterministic daily challenge seeds from YYYY-MM-DD date keys', () => {
    const seedA = computeDailySeedFromDateKey('2026-10-16');
    const seedB = computeDailySeedFromDateKey('2026-10-16');
    const seedC = computeDailySeedFromDateKey('2026-10-17');

    expect(seedA).toBe(seedB);
    expect(seedA).not.toBe(seedC);

    const info = getDailyChallengeInfo('2026-10-16');
    expect(info.seed).toBe(seedA);
    expect(info.goldTarget).toBeGreaterThan(info.silverTarget);
    expect(info.silverTarget).toBeGreaterThan(info.bronzeTarget);
  });

  it('records completed matches, updates career stats, and unlocks achievements without duplicates', () => {
    const todayInfo = getDailyChallengeInfo();
    const state = createInitialGameState({
      mode: 'ai',
      wallMode: 'gray',
      seed: todayInfo.seed,
      playerConfigs: [
        { id: 'p1', name: 'Human Artisan', isAI: false, avatarColor: '#1565C0' },
        {
          id: 'p2',
          name: 'Master AI',
          isAI: true,
          aiDifficulty: 'hard',
          avatarColor: '#D84315',
        },
      ],
    });

    // Simulate game-over state with a 104-pt victory and 2 completed columns
    state.phase = 'game-over';
    state.roundNumber = 6;
    state.players[0].score = 104;
    state.players[1].score = 72;
    state.winnerIds = ['p1'];
    state.endGameBonuses = [
      {
        playerId: 'p1',
        playerName: 'Human Artisan',
        scoreBeforeBonuses: 78,
        completedRows: 1,
        rowBonusPoints: 2,
        completedCols: 2,
        colBonusPoints: 14,
        completedColors: ['blue'],
        colorBonusPoints: 10,
        totalBonusPoints: 26,
        finalScore: 104,
        isWinner: true,
      },
      {
        playerId: 'p2',
        playerName: 'Master AI',
        scoreBeforeBonuses: 70,
        completedRows: 1,
        rowBonusPoints: 2,
        completedCols: 0,
        colBonusPoints: 0,
        completedColors: [],
        colorBonusPoints: 0,
        totalBonusPoints: 2,
        finalScore: 72,
        isWinner: false,
      },
    ];

    const initialStats = createInitialCareerStats();
    const { updatedStats, newlyUnlocked } = recordCompletedMatch(
      state,
      initialStats
    );

    expect(updatedStats.gamesPlayed).toBe(1);
    expect(updatedStats.gamesWon).toBe(1);
    expect(updatedStats.highestScore).toBe(104);
    expect(updatedStats.hardAIVictories).toBe(1);
    expect(updatedStats.grayWallVictories).toBe(1);
    expect(updatedStats.dailyChallengesCompleted).toBe(1);
    expect(updatedStats.dailyRecords[todayInfo.dateKey]?.medal).toBe('gold');

    const unlockedIds = newlyUnlocked.map((a) => a.id);
    expect(unlockedIds).toContain('first_mosaic');
    expect(unlockedIds).toContain('royal_architect');
    expect(unlockedIds).toContain('centurion_glaze');
    expect(unlockedIds).toContain('master_artisan');
    expect(unlockedIds).toContain('gray_virtuoso');
    expect(unlockedIds).toContain('pillar_of_evora');
    expect(unlockedIds).toContain('chromatic_dynasty');
    expect(unlockedIds).toContain('daily_champion');

    // Recording the exact same matchId a second time is idempotent
    const secondCall = recordCompletedMatch(state, updatedStats);
    expect(secondCall.updatedStats.gamesPlayed).toBe(1);
    expect(secondCall.newlyUnlocked).toHaveLength(0);
  });
});
