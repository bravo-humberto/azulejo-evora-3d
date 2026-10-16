import { EndGameBonusBreakdown, GameMode, GameState, WallMode } from '../types/game';

const CAREER_STORAGE_KEY = 'azul_evora_3d_career_v1';

export interface MatchPlayerSummary {
  id: string;
  name: string;
  score: number;
  isAI: boolean;
  isWinner: boolean;
  completedRows: number;
  completedCols: number;
  completedColors: number;
}

export interface MatchRecord {
  id: string;
  timestamp: number;
  dateKey: string; // YYYY-MM-DD
  mode: GameMode;
  wallMode: WallMode;
  isDailyChallenge: boolean;
  seed: number;
  roundsPlayed: number;
  humanScore: number;
  didHumanWin: boolean;
  winnerName: string;
  players: MatchPlayerSummary[];
}

export interface DailyChallengeRecord {
  dateKey: string;
  seed: number;
  attempts: number;
  bestScore: number;
  won: boolean;
  medal: 'none' | 'bronze' | 'silver' | 'gold';
  completedAt: number;
}

export interface CareerStats {
  gamesPlayed: number;
  gamesWon: number;
  currentWinStreak: number;
  bestWinStreak: number;
  highestScore: number;
  totalPointsScored: number;
  totalRowsCompleted: number;
  totalColsCompleted: number;
  totalColorSetsCompleted: number;
  hardAIVictories: number;
  grayWallVictories: number;
  dailyChallengesCompleted: number;
  unlockedAchievementIds: Record<string, number>; // id -> unlocked timestamp
  dailyRecords: Record<string, DailyChallengeRecord>; // YYYY-MM-DD -> record
  matchHistory: MatchRecord[];
}

export interface AchievementDefinition {
  id: string;
  title: string;
  subtitle: string;
  iconName: string;
  badgeColor: string;
}

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'first_mosaic',
    title: 'Apprentice of Évora',
    subtitle: 'Complete your first full match of Azul.',
    iconName: 'Compass',
    badgeColor: '#1565C0',
  },
  {
    id: 'royal_architect',
    title: 'Royal Architect',
    subtitle: 'Win a match with a final score of 80 or more points.',
    iconName: 'Crown',
    badgeColor: '#D4AF37',
  },
  {
    id: 'centurion_glaze',
    title: 'Grand Centurion',
    subtitle: 'Score 100 or more points in a single match.',
    iconName: 'Trophy',
    badgeColor: '#F9A825',
  },
  {
    id: 'master_artisan',
    title: 'Master Artisan of Évora',
    subtitle: 'Defeat the Hard AI opponent in a match.',
    iconName: 'Award',
    badgeColor: '#D84315',
  },
  {
    id: 'gray_virtuoso',
    title: 'Gray Wall Virtuoso',
    subtitle: 'Win a match playing on the Gray Variant board.',
    iconName: 'Grid',
    badgeColor: '#607D8B',
  },
  {
    id: 'pillar_of_evora',
    title: 'Pillar of the Palace',
    subtitle: 'Complete 2 or more vertical columns (+7 pts each) in one match.',
    iconName: 'Columns',
    badgeColor: '#00ACC1',
  },
  {
    id: 'chromatic_dynasty',
    title: 'Chromatic Dynasty',
    subtitle: 'Place all 5 tiles of a single color (+10 pts) on your Wall.',
    iconName: 'Sparkles',
    badgeColor: '#8E24AA',
  },
  {
    id: 'daily_champion',
    title: "King Manuel's Decree",
    subtitle: 'Complete a Daily Seeded Royal Challenge.',
    iconName: 'Calendar',
    badgeColor: '#2E7D32',
  },
  {
    id: 'silver_medalist',
    title: 'Alhambra Silver Medalist',
    subtitle: 'Score 75+ points in a Daily Seeded Royal Challenge.',
    iconName: 'Medal',
    badgeColor: '#90CAF9',
  },
  {
    id: 'dynasty_streak',
    title: 'Iberian Dynasty',
    subtitle: 'Achieve a 3-game winning streak.',
    iconName: 'Flame',
    badgeColor: '#E65100',
  },
] as const;

export interface DailyChallengeInfo {
  dateKey: string;
  seed: number;
  wallMode: WallMode;
  aiName: string;
  aiDifficulty: 'medium' | 'hard';
  bronzeTarget: number;
  silverTarget: number;
  goldTarget: number;
}

export function getTodayDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeDailySeedFromDateKey(dateKey: string): number {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) || 20261016;
}

export function getDailyChallengeInfo(dateKey: string = getTodayDateKey()): DailyChallengeInfo {
  const seed = computeDailySeedFromDateKey(dateKey);
  const isGrayDay = seed % 3 === 0;
  const isHardDay = seed % 2 === 0;

  return {
    dateKey,
    seed,
    wallMode: isGrayDay ? 'gray' : 'standard',
    aiName: isHardDay ? 'Mestre Afonso (Royal AI)' : 'Dom Manuel I (Court AI)',
    aiDifficulty: isHardDay ? 'hard' : 'medium',
    bronzeTarget: 60,
    silverTarget: 78,
    goldTarget: 95,
  };
}

export function createInitialCareerStats(): CareerStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentWinStreak: 0,
    bestWinStreak: 0,
    highestScore: 0,
    totalPointsScored: 0,
    totalRowsCompleted: 0,
    totalColsCompleted: 0,
    totalColorSetsCompleted: 0,
    hardAIVictories: 0,
    grayWallVictories: 0,
    dailyChallengesCompleted: 0,
    unlockedAchievementIds: {},
    dailyRecords: {},
    matchHistory: [],
  };
}

export function loadCareerStats(): CareerStats {
  try {
    const raw = localStorage.getItem(CAREER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CareerStats>;
      return {
        ...createInitialCareerStats(),
        ...parsed,
        unlockedAchievementIds: parsed.unlockedAchievementIds ?? {},
        dailyRecords: parsed.dailyRecords ?? {},
        matchHistory: Array.isArray(parsed.matchHistory) ? parsed.matchHistory : [],
      };
    }
  } catch {
    // ignore storage errors
  }
  return createInitialCareerStats();
}

export function saveCareerStats(stats: CareerStats): void {
  try {
    localStorage.setItem(CAREER_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage errors
  }
}

/**
 * Records a completed game into CareerStats, evaluates all 10 Royal Palace Achievements,
 * updates Daily Challenge records if the game's seed matches today's Daily Seed,
 * and returns the updated CareerStats plus any newly unlocked achievements.
 */
export function recordCompletedMatch(
  gameState: GameState,
  currentStats: CareerStats = loadCareerStats()
): {
  updatedStats: CareerStats;
  newlyUnlocked: AchievementDefinition[];
  matchRecord: MatchRecord;
} {
  if (gameState.phase !== 'game-over') {
    throw new Error('Cannot record match before game-over phase.');
  }

  // Prevent duplicate recording of the same matchId
  const existing = currentStats.matchHistory.find((m) => m.id === gameState.matchId);
  if (existing) {
    return {
      updatedStats: currentStats,
      newlyUnlocked: [],
      matchRecord: existing,
    };
  }

  const stats: CareerStats = {
    ...currentStats,
    unlockedAchievementIds: { ...currentStats.unlockedAchievementIds },
    dailyRecords: { ...currentStats.dailyRecords },
    matchHistory: [...currentStats.matchHistory],
  };

  const todayInfo = getDailyChallengeInfo();
  const isDailyChallenge =
    gameState.seed === todayInfo.seed ||
    gameState.matchId.includes(String(todayInfo.seed));

  const bonusMap = new Map<string, EndGameBonusBreakdown>();
  for (const b of gameState.endGameBonuses) {
    bonusMap.set(b.playerId, b);
  }

  // Identify primary human player (first non-AI player, or player 0 if all AI)
  const humanPlayer =
    gameState.players.find((p) => !p.isAI) ?? gameState.players[0];
  const humanBonus = bonusMap.get(humanPlayer.id);
  const humanScore = humanBonus ? humanBonus.finalScore : humanPlayer.score;
  const didHumanWin = gameState.winnerIds.includes(humanPlayer.id);

  const hasHardAIOpponent = gameState.players.some(
    (p) => p.isAI && p.aiDifficulty === 'hard'
  );

  const playerSummaries: MatchPlayerSummary[] = gameState.players.map((p) => {
    const b = bonusMap.get(p.id);
    return {
      id: p.id,
      name: p.name,
      score: b ? b.finalScore : p.score,
      isAI: p.isAI,
      isWinner: gameState.winnerIds.includes(p.id),
      completedRows: b ? b.completedRows : 0,
      completedCols: b ? b.completedCols : 0,
      completedColors: b ? b.completedColors.length : 0,
    };
  });

  const winnerNames = playerSummaries
    .filter((p) => p.isWinner)
    .map((p) => p.name)
    .join(' & ');

  const humanSummary =
    playerSummaries.find((p) => p.id === humanPlayer.id) ?? playerSummaries[0];

  const matchRecord: MatchRecord = {
    id: gameState.matchId,
    timestamp: Date.now(),
    dateKey: todayInfo.dateKey,
    mode: gameState.mode,
    wallMode: gameState.wallMode,
    isDailyChallenge,
    seed: gameState.seed,
    roundsPlayed: gameState.roundNumber,
    humanScore,
    didHumanWin,
    winnerName: winnerNames || humanPlayer.name,
    players: playerSummaries,
  };

  stats.gamesPlayed += 1;
  stats.totalPointsScored += humanScore;
  stats.highestScore = Math.max(stats.highestScore, humanScore);
  stats.totalRowsCompleted += humanSummary.completedRows;
  stats.totalColsCompleted += humanSummary.completedCols;
  stats.totalColorSetsCompleted += humanSummary.completedColors;

  if (didHumanWin) {
    stats.gamesWon += 1;
    stats.currentWinStreak += 1;
    stats.bestWinStreak = Math.max(stats.bestWinStreak, stats.currentWinStreak);
    if (hasHardAIOpponent) {
      stats.hardAIVictories += 1;
    }
    if (gameState.wallMode === 'gray') {
      stats.grayWallVictories += 1;
    }
  } else {
    stats.currentWinStreak = 0;
  }

  if (isDailyChallenge) {
    const prevDaily = stats.dailyRecords[todayInfo.dateKey];
    const bestScore = Math.max(prevDaily?.bestScore ?? 0, humanScore);
    let medal: 'none' | 'bronze' | 'silver' | 'gold' = 'none';
    if (bestScore >= todayInfo.goldTarget) medal = 'gold';
    else if (bestScore >= todayInfo.silverTarget) medal = 'silver';
    else if (bestScore >= todayInfo.bronzeTarget) medal = 'bronze';

    if (!prevDaily) {
      stats.dailyChallengesCompleted += 1;
    }

    stats.dailyRecords[todayInfo.dateKey] = {
      dateKey: todayInfo.dateKey,
      seed: todayInfo.seed,
      attempts: (prevDaily?.attempts ?? 0) + 1,
      bestScore,
      won: Boolean(prevDaily?.won || didHumanWin),
      medal,
      completedAt: Date.now(),
    };
  }

  stats.matchHistory = [matchRecord, ...stats.matchHistory].slice(0, 30);

  // Check achievement unlock criteria
  const newlyUnlocked: AchievementDefinition[] = [];
  const tryUnlock = (id: string, condition: boolean) => {
    if (condition && !stats.unlockedAchievementIds[id]) {
      stats.unlockedAchievementIds[id] = Date.now();
      const def = ACHIEVEMENTS.find((a) => a.id === id);
      if (def) newlyUnlocked.push(def);
    }
  };

  tryUnlock('first_mosaic', stats.gamesPlayed >= 1);
  tryUnlock('royal_architect', didHumanWin && humanScore >= 80);
  tryUnlock('centurion_glaze', humanScore >= 100);
  tryUnlock('master_artisan', didHumanWin && hasHardAIOpponent);
  tryUnlock('gray_virtuoso', didHumanWin && gameState.wallMode === 'gray');
  tryUnlock('pillar_of_evora', humanSummary.completedCols >= 2);
  tryUnlock('chromatic_dynasty', humanSummary.completedColors >= 1);
  tryUnlock('daily_champion', isDailyChallenge);
  tryUnlock('silver_medalist', isDailyChallenge && humanScore >= 75);
  tryUnlock('dynasty_streak', stats.bestWinStreak >= 3);

  saveCareerStats(stats);

  return {
    updatedStats: stats,
    newlyUnlocked,
    matchRecord,
  };
}
