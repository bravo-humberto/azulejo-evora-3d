import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  RotateCcw,
  FastForward,
  Sparkles,
  Hand,
  ArrowDownToLine,
  X,
  Bot,
  Trophy,
  Gauge,
  Award,
} from 'lucide-react';
import { useGameStore } from './store/gameStore';
import { AzulejoCanvas } from './components/3d/AzulejoCanvas';
import { TopHudBar } from './components/ui/TopHudBar';
import { MainMenuModal, NewMatchSetupConfig } from './components/ui/MainMenuModal';
import { BagInspectorModal } from './components/ui/BagInspectorModal';
import { OpponentInspectorModal } from './components/ui/OpponentInspectorModal';
import { TutorialOverlay } from './components/ui/TutorialOverlay';
import { RulebookModal } from './components/ui/RulebookModal';
import { OnlineLobbyModal } from './components/ui/OnlineLobbyModal';
import { GameOverModal } from './components/ui/GameOverModal';
import { CareerProfileModal } from './components/ui/CareerProfileModal';
import {
  AchievementDefinition,
  CareerStats,
  DailyChallengeInfo,
  loadCareerStats,
  recordCompletedMatch,
} from './career/careerManager';
import { soundManager } from './audio/soundManager';
import {
  peerManager,
  getRoomCodeFromUrl,
  EmojiReactionPayload,
  ConnectedPeerInfo,
} from './multiplayer/peerManager';
import { TILE_METADATA, TileColor } from './types/game';

const PUBLIC_PWA_URL = 'https://bravo-humberto.github.io/azulejo-evora-3d/';

export const App: React.FC = () => {
  const {
    gameState,
    draftSelection,
    canUndo,
    activeScoringEvent,
    scoringQueue,
    animationSpeed,
    inspectedPlayerId,
    activeModal,
    isTutorialOpen,
    tutorialStep,
    startNewGame,
    selectDraftSource,
    clearDraftSelection,
    previewCurrentMove,
    commitDraftMove,
    applyExternalDraftMove,
    undoLastHumanMove,
    executeAITurn,
    advanceScoringStep,
    skipWallTilingAnimation,
    setAnimationSpeed,
    setInspectedPlayerId,
    setActiveModal,
    setTutorialOpen,
    syncFromNetworkState,
  } = useGameStore();

  const [muted, setMuted] = useState<boolean>(() => soundManager.isMuted());
  const [recentReactions, setRecentReactions] = useState<EmojiReactionPayload[]>([]);
  const [activeToastReaction, setActiveToastReaction] =
    useState<EmojiReactionPayload | null>(null);
  const [careerStats, setCareerStats] = useState<CareerStats>(() =>
    loadCareerStats()
  );
  const [unlockedToast, setUnlockedToast] =
    useState<AchievementDefinition | null>(null);

  const activePlayer =
    gameState.players[gameState.activePlayerIndex] ?? gameState.players[0];

  const displayedBoard = useMemo(() => {
    if (gameState.mode === 'ai') {
      const human = gameState.players.find((p) => !p.isAI);
      if (human && gameState.phase === 'factory-offer') {
        return human;
      }
    }
    if (activeScoringEvent) {
      return (
        gameState.players[activeScoringEvent.playerIndex] ?? activePlayer
      );
    }
    return activePlayer;
  }, [gameState, activePlayer, activeScoringEvent]);

  const inspectedPlayer = useMemo(
    () =>
      gameState.players.find((p) => p.id === inspectedPlayerId) ?? null,
    [gameState.players, inspectedPlayerId]
  );

  // Check URL for ?room=XXXX invite on mount
  useEffect(() => {
    const inviteCode = getRoomCodeFromUrl();
    if (inviteCode) {
      setActiveModal('online-lobby');
    }
  }, [setActiveModal]);

  // Automatically record match & achievements when game reaches 'game-over'
  useEffect(() => {
    if (gameState.phase !== 'game-over') return;
    try {
      const { updatedStats, newlyUnlocked } = recordCompletedMatch(gameState);
      setCareerStats(updatedStats);
      if (newlyUnlocked.length > 0) {
        setUnlockedToast(newlyUnlocked[0]);
        setTimeout(() => setUnlockedToast(null), 5000);
      }
    } catch {
      // ignore
    }
  }, [gameState.phase, gameState.matchId, gameState]);

  // PeerJS WebRTC callbacks
  useEffect(() => {
    peerManager.setCallbacks({
      onStateSync: (remoteState) => {
        syncFromNetworkState(remoteState);
        soundManager.playTilePlace(1);
      },
      onDraftMove: (move) => {
        applyExternalDraftMove(move);
        soundManager.playTilePlace(1);
      },
      onEmojiReaction: (payload) => {
        setRecentReactions((prev) => [payload, ...prev.slice(0, 14)]);
        setActiveToastReaction(payload);
        setTimeout(() => {
          setActiveToastReaction((curr) =>
            curr?.timestamp === payload.timestamp ? null : curr
          );
        }, 3200);
      },
    });
  }, [syncFromNetworkState, applyExternalDraftMove]);

  // AI Turn automation in 'factory-offer' phase
  useEffect(() => {
    if (gameState.phase !== 'factory-offer') return;
    if (!activePlayer || !activePlayer.isAI) return;

    const timer = setTimeout(() => {
      const move = executeAITurn();
      if (move) {
        if (move.destinationRow === 'floor') {
          soundManager.playFloorPenalty();
        } else {
          soundManager.playTilePlace(2);
        }
      }
    }, 680);

    return () => clearTimeout(timer);
  }, [
    gameState.phase,
    gameState.activePlayerIndex,
    gameState.roundNumber,
    activePlayer,
    executeAITurn,
  ]);

  // Step-by-step Wall-Tiling animation loop
  useEffect(() => {
    if (gameState.phase !== 'wall-tiling') return;

    const stepDelay =
      scoringQueue.length === 0
        ? 650 / animationSpeed
        : 780 / animationSpeed;

    const timer = setTimeout(() => {
      const ev = advanceScoringStep();
      if (ev) {
        if (ev.type === 'tile-placement') {
          const chainLen =
            Math.max(1, ev.horizontalChain.length) +
            Math.max(0, ev.verticalChain.length - 1);
          soundManager.playWallSlideScore(ev.pointsDelta, chainLen);
        } else if (ev.type === 'floor-penalty') {
          soundManager.playFloorPenalty();
        }
      } else {
        const latestState = useGameStore.getState().gameState;
        if (latestState.phase === 'factory-offer') {
          soundManager.playBagRefill();
        } else if (latestState.phase === 'game-over') {
          soundManager.playVictoryFanfare();
        }
      }
    }, stepDelay);

    return () => clearTimeout(timer);
  }, [
    gameState.phase,
    scoringQueue.length,
    activeScoringEvent,
    animationSpeed,
    advanceScoringStep,
  ]);

  const handleToggleMute = useCallback(() => {
    const nextMuted = !soundManager.isMuted();
    soundManager.setMuted(nextMuted);
    setMuted(nextMuted);
  }, []);

  const handleSelectSource = useCallback(
    (payload: {
      sourceType: 'factory' | 'center';
      factoryId?: number;
      color: TileColor;
    }) => {
      if (gameState.phase !== 'factory-offer') return;
      if (activePlayer?.isAI) return;

      selectDraftSource(payload);
      const selected = useGameStore.getState().draftSelection;
      if (selected) {
        soundManager.playTilePickup(selected.count);
      }
    },
    [gameState.phase, activePlayer, selectDraftSource]
  );

  const handleConfirmMove = useCallback(
    (destinationRow: number | 'floor', grayWallCol?: number) => {
      if (gameState.phase !== 'factory-offer') return;
      if (activePlayer?.isAI) return;

      const preview = previewCurrentMove(destinationRow, grayWallCol);
      if (!preview || !preview.valid) return;

      const move = commitDraftMove(destinationRow, grayWallCol);
      if (move) {
        if (
          destinationRow === 'floor' ||
          preview.tilesOverflowToFloor > 0
        ) {
          soundManager.playFloorPenalty();
        } else {
          soundManager.playTilePlace(preview.tilesPlacedInLine);
        }

        if (gameState.mode === 'online') {
          const updatedState = useGameStore.getState().gameState;
          peerManager.broadcastState(updatedState);
        }
      }
    },
    [
      gameState.phase,
      gameState.mode,
      activePlayer,
      previewCurrentMove,
      commitDraftMove,
    ]
  );

  const handleUndo = useCallback(() => {
    const ok = undoLastHumanMove();
    if (ok) {
      soundManager.playTilePickup(1);
    }
  }, [undoLastHumanMove]);

  const handleStartMatchFromMenu = useCallback(
    (config: NewMatchSetupConfig) => {
      startNewGame({
        mode: config.mode,
        wallMode: config.wallMode,
        playerConfigs: config.seats.map((seat, idx) => ({
          id: `p${idx + 1}`,
          name: seat.name,
          isAI: seat.isAI,
          aiDifficulty: seat.aiDifficulty,
          avatarColor: seat.avatarColor,
        })),
      });
      soundManager.playBagRefill();
    },
    [startNewGame]
  );

  const handleStartDailyChallenge = useCallback(
    (dailyInfo: DailyChallengeInfo) => {
      startNewGame({
        mode: 'ai',
        wallMode: dailyInfo.wallMode,
        seed: dailyInfo.seed,
        playerConfigs: [
          {
            id: 'p1',
            name: 'Artisan (You)',
            isAI: false,
            avatarColor: '#1565C0',
          },
          {
            id: 'p2',
            name: dailyInfo.aiName,
            isAI: true,
            aiDifficulty: dailyInfo.aiDifficulty,
            avatarColor: '#D84315',
          },
        ],
      });
      soundManager.playBagRefill();
    },
    [startNewGame]
  );

  const handleStartOnlineMatch = useCallback(
    (peers: ConnectedPeerInfo[], roomCode: string) => {
      const seats =
        peers.length >= 2
          ? peers.slice(0, 4).map((peer, idx) => ({
              id: peer.peerId || `p${idx + 1}`,
              name: peer.playerName || `Player ${idx + 1}`,
              isAI: false,
              avatarColor: ['#1565C0', '#F9A825', '#D84315', '#00ACC1'][idx % 4],
            }))
          : [
              {
                id: 'host',
                name: peers[0]?.playerName || 'Host Artisan',
                isAI: false,
                avatarColor: '#1565C0',
              },
              {
                id: 'guest',
                name: `Guest (${roomCode})`,
                isAI: false,
                avatarColor: '#F9A825',
              },
            ];

      startNewGame({
        mode: 'online',
        wallMode: gameState.wallMode,
        playerConfigs: seats,
      });

      const freshState = useGameStore.getState().gameState;
      peerManager.broadcastState(freshState);
      soundManager.playBagRefill();
    },
    [startNewGame, gameState.wallMode]
  );

  const handlePlayAgain = useCallback(() => {
    startNewGame({
      mode: gameState.mode,
      wallMode: gameState.wallMode,
      playerConfigs: gameState.players.map((p) => ({
        id: p.id,
        name: p.name,
        isAI: p.isAI,
        aiDifficulty: p.aiDifficulty,
        avatarColor: p.avatarColor,
      })),
    });
    soundManager.playBagRefill();
  }, [startNewGame, gameState]);

  const isHumanInteractive =
    gameState.phase === 'factory-offer' && !activePlayer?.isAI;

  return (
    <div className="relative w-full h-[100dvh] bg-[#0B2545] overflow-hidden flex flex-col select-none">
      {/* Top 18% HUD Zone: Opponent Mini-Boards, Linen Bag Counter & Action Icons */}
      <TopHudBar
        gameState={gameState}
        onOpenMainMenu={() => setActiveModal('main-menu')}
        onOpenRulebook={() => setActiveModal('rulebook')}
        onOpenTutorial={() => setTutorialOpen(true, 0)}
        onOpenCareerProfile={() => setActiveModal('career-profile')}
        onOpenOnlineLobby={() => setActiveModal('online-lobby')}
        onOpenBagInspector={() => setActiveModal('bag-inspector')}
        onInspectPlayer={(player) => setInspectedPlayerId(player.id)}
        muted={muted}
        onToggleMute={handleToggleMute}
      />

      {/* Main 3D WebGL Viewport (Factory Circle + Center Pool + Active Player 3D Board) */}
      <main className="relative flex-1 w-full overflow-hidden">
        <AzulejoCanvas
          gameState={gameState}
          activeBoard={displayedBoard}
          draftSelection={draftSelection}
          activeScoringEvent={activeScoringEvent}
          interactive={isHumanInteractive}
          onSelectSource={handleSelectSource}
          onClearSelection={clearDraftSelection}
          previewMove={previewCurrentMove}
          onConfirmMove={handleConfirmMove}
        />

        {/* Floating Achievement Unlocked Toast */}
        {unlockedToast && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 rounded-2xl bg-[#07162c]/95 border-2 border-[#D4AF37] px-4 py-2 shadow-2xl animate-bounce">
            <Award className="w-5 h-5 text-[#D4AF37] shrink-0" />
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                Royal Honour Unlocked!
              </div>
              <div className="text-xs font-extrabold text-white">
                {unlockedToast.title}
              </div>
            </div>
          </div>
        )}

        {/* Floating Emoji Reaction Toast (Online Multiplayer) */}
        {activeToastReaction && (
          <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 rounded-full bg-[#07162c]/95 border border-[#D4AF37]/60 px-4 py-1.5 shadow-xl animate-bounce">
            <span className="text-xl">{activeToastReaction.emoji}</span>
            <span className="text-xs font-bold text-[#FDFBF7]">
              {activeToastReaction.senderName}
            </span>
          </div>
        )}

        {/* Contextual Turn / Selection / Undo / Wall-Tiling Action Bar */}
        <div className="pointer-events-none absolute bottom-2.5 inset-x-0 z-20 flex flex-col items-center gap-1.5 px-3">
          {/* Active Draft Selection Pill */}
          {draftSelection && gameState.phase === 'factory-offer' && (
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-[#07162c]/95 border border-[#D4AF37]/70 px-3.5 py-2 shadow-2xl backdrop-blur-md max-w-md w-full">
              <div className="flex items-center gap-2 mr-auto">
                <img
                  src={TILE_METADATA[draftSelection.color].textureUrl}
                  alt={TILE_METADATA[draftSelection.color].name}
                  className="w-6 h-6 rounded-md border border-[#D4AF37]/60 object-cover shadow"
                />
                <div className="leading-tight">
                  <div className="text-xs font-extrabold text-[#FDFBF7] flex items-center gap-1.5">
                    <span>
                      {draftSelection.count}×{' '}
                      {TILE_METADATA[draftSelection.color].name}
                    </span>
                    {draftSelection.takesFirstPlayerToken && (
                      <span className="rounded bg-[#1565C0]/60 border border-[#90CAF9]/50 px-1.5 py-0.5 text-[10px] text-[#E3F2FD]">
                        + &ldquo;1&rdquo; Token
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#D4AF37]">
                    Tap or drag to a glowing Pattern Line or Floor
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleConfirmMove('floor')}
                className="flex items-center gap-1 rounded-xl bg-amber-900/60 hover:bg-amber-800/80 border border-amber-400/50 px-2.5 py-1.5 text-[11px] font-bold text-amber-100 transition active:scale-95 cursor-pointer"
                title="Place selected tiles directly onto your Floor Line"
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>To Floor</span>
              </button>

              <button
                type="button"
                onClick={clearDraftSelection}
                className="flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-500/40 p-1.5 text-slate-200 transition active:scale-95 cursor-pointer"
                aria-label="Cancel tile selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Wall-Tiling Choreographed Scoring Controls */}
          {gameState.phase === 'wall-tiling' && (
            <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-2xl bg-[#07162c]/95 border border-[#D4AF37] px-3.5 py-2 shadow-2xl backdrop-blur-md max-w-md w-full">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0 animate-spin" />
                <div className="truncate">
                  <div className="text-xs font-bold text-[#FDFBF7] truncate">
                    {activeScoringEvent
                      ? activeScoringEvent.description
                      : 'Wall-Tiling & Adjacency Scoring...'}
                  </div>
                  <div className="text-[10px] text-[#D4AF37]">
                    {scoringQueue.length} step
                    {scoringQueue.length === 1 ? '' : 's'} remaining
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setAnimationSpeed(animationSpeed === 1 ? 2 : 1)
                  }
                  className="flex items-center gap-1 rounded-xl bg-[#133863] hover:bg-[#1b497d] border border-[#D4AF37]/50 px-2.5 py-1 text-[11px] font-bold text-[#FDFBF7] cursor-pointer"
                >
                  <Gauge className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{animationSpeed}x</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    skipWallTilingAnimation();
                    soundManager.playTilePlace(1);
                  }}
                  className="flex items-center gap-1 rounded-xl bg-[#D4AF37] hover:bg-[#e3be42] px-2.5 py-1 text-[11px] font-extrabold text-[#07162c] cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>Skip</span>
                </button>
              </div>
            </div>
          )}

          {/* Status & Undo Strip during Factory Offer */}
          {gameState.phase === 'factory-offer' && !draftSelection && (
            <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-full bg-[#07162c]/90 border border-[#D4AF37]/40 px-3.5 py-1.5 shadow-lg backdrop-blur-md max-w-md w-full">
              <div className="flex items-center gap-2 min-w-0">
                {activePlayer?.isAI ? (
                  <Bot className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
                ) : (
                  <Hand className="w-4 h-4 text-[#D4AF37] shrink-0" />
                )}
                <span className="text-[11px] font-semibold text-[#FDFBF7] truncate">
                  {activePlayer?.isAI
                    ? `${activePlayer.name} is contemplating a move...`
                    : `${activePlayer?.name}: Tap or drag a color from a Factory or Center`}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {canUndo && (
                  <button
                    type="button"
                    onClick={handleUndo}
                    className="flex items-center gap-1 rounded-full bg-[#1565C0]/80 hover:bg-[#1976D2] border border-[#90CAF9]/50 px-2.5 py-0.5 text-[11px] font-bold text-white transition active:scale-95 cursor-pointer"
                    title="Undo your last tile placement"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Undo</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Game Over Quick Banner if modal was dismissed */}
          {gameState.phase === 'game-over' && activeModal !== 'game-over' && (
            <div className="pointer-events-auto flex items-center justify-between gap-3 rounded-full bg-[#07162c]/95 border border-[#D4AF37] px-4 py-1.5 shadow-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-[#D4AF37]">
                <Trophy className="w-4 h-4" />
                <span>Royal Palace Wall Complete!</span>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal('game-over')}
                className="rounded-full bg-[#D4AF37] px-3 py-1 text-xs font-extrabold text-[#07162c] cursor-pointer"
              >
                View Final Scores
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Interactive Guided Tutorial Overlay */}
      <TutorialOverlay
        isOpen={isTutorialOpen}
        onClose={() => setTutorialOpen(false)}
        initialStep={tutorialStep}
        onStepChange={(step) => setTutorialOpen(true, step)}
      />

      {/* Modals */}
      <MainMenuModal
        isOpen={activeModal === 'main-menu'}
        onClose={() => setActiveModal('none')}
        onStartMatch={handleStartMatchFromMenu}
        onOpenOnlineLobby={() => setActiveModal('online-lobby')}
        onOpenTutorial={() => {
          setActiveModal('none');
          setTutorialOpen(true, 0);
        }}
        currentMode={gameState.mode}
        currentWallMode={gameState.wallMode}
      />

      <CareerProfileModal
        isOpen={activeModal === 'career-profile'}
        onClose={() => setActiveModal('none')}
        careerStats={careerStats}
        onStartDailyChallenge={handleStartDailyChallenge}
        publicAppUrl={PUBLIC_PWA_URL}
      />

      <BagInspectorModal
        isOpen={activeModal === 'bag-inspector'}
        onClose={() => setActiveModal('none')}
        gameState={gameState}
      />

      <OpponentInspectorModal
        isOpen={Boolean(inspectedPlayer)}
        onClose={() => setInspectedPlayerId(null)}
        player={inspectedPlayer}
        allPlayers={gameState.players}
        onSelectPlayer={(id) => setInspectedPlayerId(id)}
        wallMode={gameState.wallMode}
        activePlayerId={activePlayer?.id}
      />

      <RulebookModal
        isOpen={activeModal === 'rulebook'}
        onClose={() => setActiveModal('none')}
      />

      <OnlineLobbyModal
        isOpen={activeModal === 'online-lobby'}
        onClose={() => setActiveModal('none')}
        onStartOnlineMatch={handleStartOnlineMatch}
        recentReactions={recentReactions}
      />

      <GameOverModal
        isOpen={activeModal === 'game-over'}
        onClose={() => setActiveModal('none')}
        gameState={gameState}
        onPlayAgain={handlePlayAgain}
        onOpenSetupMenu={() => setActiveModal('main-menu')}
      />
    </div>
  );
};

export default App;
