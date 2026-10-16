import { create } from 'zustand';
import {
  AIDifficulty,
  DraftMove,
  DraftSelection,
  GameMode,
  GameState,
  MoveScorePreview,
  ScoringStepEvent,
  TileColor,
  WallMode,
} from '../types/game';
import {
  applyDraftMove,
  cloneGameState,
  createInitialGameState,
  executeWallTilingAndAdvanceRound,
  getAvailableColorsInSource,
  previewDraftMove,
} from '../engine/azulEngine';
import { chooseAIMove } from '../ai/azulAI';

const STORAGE_KEY = 'azul_evora_3d_saved_state_v1';

export interface SeatSetupConfig {
  id: string;
  name: string;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
  avatarColor?: string;
}

export interface StartGameOptions {
  playerConfigs: SeatSetupConfig[];
  wallMode: WallMode;
  mode: GameMode;
  seed?: number;
}

export interface GameStoreState {
  gameState: GameState;
  draftSelection: DraftSelection | null;
  undoSnapshot: GameState | null;
  canUndo: boolean;
  activeScoringEvent: ScoringStepEvent | null;
  scoringQueue: ScoringStepEvent[];
  preWallTilingState: GameState | null;
  postWallTilingState: GameState | null;
  animationSpeed: 1 | 2;
  inspectedPlayerId: string | null;
  activeModal:
    | 'none'
    | 'main-menu'
    | 'bag-inspector'
    | 'rulebook'
    | 'online-lobby'
    | 'career-profile'
    | 'game-over';
  isTutorialOpen: boolean;
  tutorialStep: number;
  lastEmojiReaction: { sender: string; emoji: string; timestamp: number } | null;

  // Actions
  startNewGame: (options: StartGameOptions) => void;
  selectDraftSource: (payload: {
    sourceType: 'factory' | 'center';
    factoryId?: number;
    color: TileColor;
  }) => void;
  clearDraftSelection: () => void;
  previewCurrentMove: (
    destinationRow: number | 'floor',
    grayWallCol?: number
  ) => MoveScorePreview | null;
  commitDraftMove: (
    destinationRow: number | 'floor',
    grayWallCol?: number
  ) => DraftMove | null;
  applyExternalDraftMove: (move: DraftMove) => void;
  undoLastHumanMove: () => boolean;
  executeAITurn: () => DraftMove | null;
  advanceScoringStep: () => ScoringStepEvent | null;
  skipWallTilingAnimation: () => void;
  setGrayWallTargetCol: (rowIndex: number, colIndex: number) => void;
  setAnimationSpeed: (speed: 1 | 2) => void;
  setInspectedPlayerId: (id: string | null) => void;
  setActiveModal: (
    modal:
      | 'none'
      | 'main-menu'
      | 'bag-inspector'
      | 'rulebook'
      | 'online-lobby'
      | 'career-profile'
      | 'game-over'
  ) => void;
  setTutorialOpen: (open: boolean, step?: number) => void;
  setLastEmojiReaction: (reaction: { sender: string; emoji: string } | null) => void;
  syncFromNetworkState: (remoteState: GameState) => void;
}

function loadSavedGameState(): GameState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as GameState;
      if (parsed && Array.isArray(parsed.players) && parsed.players.length >= 2) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }

  return createInitialGameState({
    playerConfigs: [
      { id: 'p1', name: 'Artisan (You)', isAI: false, avatarColor: '#1565C0' },
      {
        id: 'p2',
        name: 'Dom Manuel (AI)',
        isAI: true,
        aiDifficulty: 'medium',
        avatarColor: '#D84315',
      },
    ],
    wallMode: 'standard',
    mode: 'ai',
  });
}

function saveGameState(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: loadSavedGameState(),
  draftSelection: null,
  undoSnapshot: null,
  canUndo: false,
  activeScoringEvent: null,
  scoringQueue: [],
  preWallTilingState: null,
  postWallTilingState: null,
  animationSpeed: 1,
  inspectedPlayerId: null,
  activeModal: 'none',
  isTutorialOpen: false,
  tutorialStep: 0,
  lastEmojiReaction: null,

  startNewGame: (options) => {
    const fresh = createInitialGameState(options);
    saveGameState(fresh);
    set({
      gameState: fresh,
      draftSelection: null,
      undoSnapshot: null,
      canUndo: false,
      activeScoringEvent: null,
      scoringQueue: [],
      preWallTilingState: null,
      postWallTilingState: null,
      activeModal: 'none',
      isTutorialOpen: options.mode === 'tutorial',
      tutorialStep: 0,
    });
  },

  selectDraftSource: ({ sourceType, factoryId, color }) => {
    const { gameState } = get();
    if (gameState.phase !== 'factory-offer') return;

    const available = getAvailableColorsInSource(gameState, sourceType, factoryId);
    const entry = available.find((a) => a.color === color);
    if (!entry || entry.count <= 0) return;

    const current = get().draftSelection;
    if (
      current &&
      current.sourceType === sourceType &&
      current.factoryId === factoryId &&
      current.color === color
    ) {
      set({ draftSelection: null });
      return;
    }

    set({
      draftSelection: {
        sourceType,
        factoryId,
        color,
        count: entry.count,
        takesFirstPlayerToken:
          sourceType === 'center' && gameState.center.hasFirstPlayerToken,
      },
    });
  },

  clearDraftSelection: () => {
    set({ draftSelection: null });
  },

  previewCurrentMove: (destinationRow, grayWallCol) => {
    const { gameState, draftSelection } = get();
    if (!draftSelection || gameState.phase !== 'factory-offer') return null;

    const move: DraftMove = {
      sourceType: draftSelection.sourceType,
      factoryId: draftSelection.factoryId,
      color: draftSelection.color,
      destinationRow,
      grayWallCol,
    };

    return previewDraftMove(gameState, move);
  },

  commitDraftMove: (destinationRow, grayWallCol) => {
    const { gameState, draftSelection } = get();
    if (!draftSelection || gameState.phase !== 'factory-offer') return null;

    const move: DraftMove = {
      sourceType: draftSelection.sourceType,
      factoryId: draftSelection.factoryId,
      color: draftSelection.color,
      destinationRow,
      grayWallCol,
    };

    const preview = previewDraftMove(gameState, move);
    if (!preview.valid) return null;

    const snapshot = cloneGameState(gameState);
    const afterDraft = applyDraftMove(gameState, move);

    if (afterDraft.phase === 'wall-tiling') {
      const { nextState, events } = executeWallTilingAndAdvanceRound(afterDraft);
      saveGameState(nextState);
      set({
        gameState: afterDraft,
        draftSelection: null,
        undoSnapshot: snapshot,
        canUndo: gameState.mode !== 'online',
        preWallTilingState: afterDraft,
        postWallTilingState: nextState,
        scoringQueue: events,
        activeScoringEvent: null,
      });
    } else {
      saveGameState(afterDraft);
      set({
        gameState: afterDraft,
        draftSelection: null,
        undoSnapshot: snapshot,
        canUndo: gameState.mode !== 'online',
      });
    }

    return move;
  },

  applyExternalDraftMove: (move) => {
    const { gameState } = get();
    if (gameState.phase !== 'factory-offer') return;
    const afterDraft = applyDraftMove(gameState, move);

    if (afterDraft.phase === 'wall-tiling') {
      const { nextState, events } = executeWallTilingAndAdvanceRound(afterDraft);
      saveGameState(nextState);
      set({
        gameState: afterDraft,
        draftSelection: null,
        preWallTilingState: afterDraft,
        postWallTilingState: nextState,
        scoringQueue: events,
        activeScoringEvent: null,
      });
    } else {
      saveGameState(afterDraft);
      set({
        gameState: afterDraft,
        draftSelection: null,
      });
    }
  },

  undoLastHumanMove: () => {
    const { undoSnapshot, canUndo } = get();
    if (!canUndo || !undoSnapshot) return false;
    saveGameState(undoSnapshot);
    set({
      gameState: undoSnapshot,
      draftSelection: null,
      undoSnapshot: null,
      canUndo: false,
      scoringQueue: [],
      activeScoringEvent: null,
      preWallTilingState: null,
      postWallTilingState: null,
    });
    return true;
  },

  executeAITurn: () => {
    const { gameState } = get();
    if (gameState.phase !== 'factory-offer') return null;
    const activePlayer = gameState.players[gameState.activePlayerIndex];
    if (!activePlayer || !activePlayer.isAI) return null;

    const aiMove = chooseAIMove(
      gameState,
      activePlayer.aiDifficulty || 'medium'
    );
    const afterDraft = applyDraftMove(gameState, aiMove);

    if (afterDraft.phase === 'wall-tiling') {
      const { nextState, events } = executeWallTilingAndAdvanceRound(afterDraft);
      saveGameState(nextState);
      set({
        gameState: afterDraft,
        draftSelection: null,
        preWallTilingState: afterDraft,
        postWallTilingState: nextState,
        scoringQueue: events,
        activeScoringEvent: null,
      });
    } else {
      saveGameState(afterDraft);
      set({
        gameState: afterDraft,
        draftSelection: null,
      });
    }

    return aiMove;
  },

  advanceScoringStep: () => {
    const { scoringQueue, gameState, postWallTilingState } = get();
    if (scoringQueue.length === 0) {
      if (postWallTilingState) {
        saveGameState(postWallTilingState);
        set({
          gameState: postWallTilingState,
          activeScoringEvent: null,
          preWallTilingState: null,
          postWallTilingState: null,
          activeModal:
            postWallTilingState.phase === 'game-over' ? 'game-over' : get().activeModal,
        });
      }
      return null;
    }

    const [nextEvent, ...rest] = scoringQueue;
    const steppedState = cloneGameState(gameState);
    const targetPlayer = steppedState.players[nextEvent.playerIndex];

    if (targetPlayer) {
      if (
        nextEvent.type === 'tile-placement' &&
        typeof nextEvent.row === 'number' &&
        typeof nextEvent.col === 'number' &&
        nextEvent.color
      ) {
        targetPlayer.wall[nextEvent.row][nextEvent.col].filledColor =
          nextEvent.color;
        const line = targetPlayer.patternLines[nextEvent.row];
        if (line) {
          line.color = null;
          line.count = 0;
          line.targetWallCol = null;
        }
        targetPlayer.score = nextEvent.newScore;
      } else if (nextEvent.type === 'floor-penalty') {
        targetPlayer.floorLine = [];
        targetPlayer.score = nextEvent.newScore;
      } else if (nextEvent.type === 'end-bonus') {
        targetPlayer.score = nextEvent.newScore;
      }
    }

    set({
      gameState: steppedState,
      activeScoringEvent: nextEvent,
      scoringQueue: rest,
    });

    return nextEvent;
  },

  skipWallTilingAnimation: () => {
    const { postWallTilingState } = get();
    if (!postWallTilingState) return;
    saveGameState(postWallTilingState);
    set({
      gameState: postWallTilingState,
      scoringQueue: [],
      activeScoringEvent: null,
      preWallTilingState: null,
      postWallTilingState: null,
      activeModal:
        postWallTilingState.phase === 'game-over' ? 'game-over' : get().activeModal,
    });
  },

  setGrayWallTargetCol: (rowIndex, colIndex) => {
    const { gameState } = get();
    if (gameState.wallMode !== 'gray') return;
    const next = cloneGameState(gameState);
    const activePlayer = next.players[next.activePlayerIndex];
    if (!activePlayer) return;
    const line = activePlayer.patternLines[rowIndex];
    if (line) {
      line.targetWallCol = colIndex;
      saveGameState(next);
      set({ gameState: next });
    }
  },

  setAnimationSpeed: (speed) => set({ animationSpeed: speed }),
  setInspectedPlayerId: (id) => set({ inspectedPlayerId: id }),
  setActiveModal: (modal) => set({ activeModal: modal }),
  setTutorialOpen: (open, step = 0) =>
    set({ isTutorialOpen: open, tutorialStep: step }),
  setLastEmojiReaction: (reaction) =>
    set({
      lastEmojiReaction: reaction
        ? { ...reaction, timestamp: Date.now() }
        : null,
    }),

  syncFromNetworkState: (remoteState) => {
    saveGameState(remoteState);
    set({
      gameState: remoteState,
      draftSelection: null,
      scoringQueue: [],
      activeScoringEvent: null,
      preWallTilingState: null,
      postWallTilingState: null,
    });
  },
}));
