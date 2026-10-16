import { describe, it, expect, beforeEach } from 'vitest';
import { useGameStore } from '../gameStore';

describe('GameStore Integration Suite', () => {
  beforeEach(() => {
    useGameStore.getState().startNewGame({
      mode: 'ai',
      wallMode: 'standard',
      seed: 42,
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
  });

  it('initializes a 2-player game with 5 factories and supports selecting, previewing, committing, and undoing a move', () => {
    const store = useGameStore.getState();
    expect(store.gameState.factories).toHaveLength(5);
    expect(store.gameState.phase).toBe('factory-offer');

    const firstFactory = store.gameState.factories[0];
    const firstColor = firstFactory.tiles[0];
    expect(firstColor).toBeDefined();

    store.selectDraftSource({
      sourceType: 'factory',
      factoryId: 0,
      color: firstColor,
    });

    const afterSelect = useGameStore.getState();
    expect(afterSelect.draftSelection).not.toBeNull();
    expect(afterSelect.draftSelection?.color).toBe(firstColor);

    const preview = afterSelect.previewCurrentMove(0);
    expect(preview).not.toBeNull();
    expect(preview?.valid).toBe(true);

    const committed = afterSelect.commitDraftMove(0);
    expect(committed).not.toBeNull();

    const afterCommit = useGameStore.getState();
    expect(afterCommit.canUndo).toBe(true);
    expect(afterCommit.gameState.activePlayerIndex).toBe(1);
    expect(
      afterCommit.gameState.players[0].patternLines[0].count
    ).toBeGreaterThan(0);

    // Undo move restores activePlayerIndex to 0 and empties pattern line 0
    const undone = afterCommit.undoLastHumanMove();
    expect(undone).toBe(true);

    const afterUndo = useGameStore.getState();
    expect(afterUndo.gameState.activePlayerIndex).toBe(0);
    expect(afterUndo.gameState.players[0].patternLines[0].count).toBe(0);
  });

  it('plays through a full round into wall-tiling and steps through scoring animations', () => {
    useGameStore.getState().startNewGame({
      mode: 'ai',
      wallMode: 'gray',
      seed: 1337,
      playerConfigs: [
        {
          id: 'ai1',
          name: 'AI 1',
          isAI: true,
          aiDifficulty: 'medium',
          avatarColor: '#1565C0',
        },
        {
          id: 'ai2',
          name: 'AI 2',
          isAI: true,
          aiDifficulty: 'hard',
          avatarColor: '#F9A825',
        },
      ],
    });

    let safety = 0;
    while (
      useGameStore.getState().gameState.phase === 'factory-offer' &&
      safety < 50
    ) {
      const move = useGameStore.getState().executeAITurn();
      expect(move).not.toBeNull();
      safety++;
    }

    expect(useGameStore.getState().gameState.phase).toBe('wall-tiling');
    expect(
      useGameStore.getState().scoringQueue.length
    ).toBeGreaterThan(0);

    // Advance one step and then skip remaining animation to transition to Round 2
    const firstStep = useGameStore.getState().advanceScoringStep();
    expect(firstStep).not.toBeNull();

    useGameStore.getState().skipWallTilingAnimation();
    expect(useGameStore.getState().gameState.roundNumber).toBe(2);
    expect(useGameStore.getState().gameState.phase).toBe('factory-offer');
  });
});
