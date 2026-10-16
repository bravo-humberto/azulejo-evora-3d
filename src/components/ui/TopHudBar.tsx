import React, { useState } from 'react';
import {
  Crown,
  Trophy,
  Volume2,
  VolumeX,
  BookOpen,
  GraduationCap,
  Settings,
  Package,
  Users,
  Bot,
  User,
  Sparkles,
} from 'lucide-react';
import {
  STANDARD_WALL_LAYOUT,
  TILE_METADATA,
  type GameState,
  type PlayerBoard,
} from '../../types/game';
import { soundManager } from '../../audio/soundManager';
import { BagInspectorModal } from './BagInspectorModal';
import { OpponentInspectorModal } from './OpponentInspectorModal';

export interface TopHudBarProps {
  gameState: GameState;
  onOpenMainMenu: () => void;
  onOpenRulebook: () => void;
  onOpenTutorial: () => void;
  onOpenCareerProfile?: () => void;
  onOpenOnlineLobby?: () => void;
  onOpenBagInspector?: () => void;
  onInspectPlayer?: (player: PlayerBoard) => void;
  muted?: boolean;
  onToggleMute?: () => void;
}

export const TopHudBar: React.FC<TopHudBarProps> = ({
  gameState,
  onOpenMainMenu,
  onOpenRulebook,
  onOpenTutorial,
  onOpenCareerProfile,
  onOpenOnlineLobby,
  onOpenBagInspector,
  onInspectPlayer,
  muted: controlledMuted,
  onToggleMute,
}) => {
  const [internalMuted, setInternalMuted] = useState<boolean>(() =>
    soundManager.isMuted()
  );
  const [bagModalOpen, setBagModalOpen] = useState(false);
  const [inspectedPlayerId, setInspectedPlayerId] = useState<string | null>(null);

  const isAudioMuted =
    controlledMuted !== undefined ? controlledMuted : internalMuted;

  const handleToggleAudio = () => {
    if (onToggleMute) {
      onToggleMute();
    } else {
      const next = !internalMuted;
      soundManager.setMuted(next);
      setInternalMuted(next);
    }
  };

  const handleBagClick = () => {
    soundManager.playTilePickup(1);
    if (onOpenBagInspector) {
      onOpenBagInspector();
    } else {
      setBagModalOpen(true);
    }
  };

  const handlePlayerCardClick = (player: PlayerBoard) => {
    soundManager.playTilePickup(1);
    if (onInspectPlayer) {
      onInspectPlayer(player);
    } else {
      setInspectedPlayerId(player.id);
    }
  };

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const inspectedPlayer =
    gameState.players.find((p) => p.id === inspectedPlayerId) ?? null;

  return (
    <>
      <header className="relative z-20 flex h-[18dvh] min-h-[112px] max-h-[154px] w-full flex-col justify-between border-b-2 border-[#d4af37]/60 bg-gradient-to-b from-[#07162c]/95 via-[#0b2241]/92 to-[#0d284c]/90 px-2.5 py-1.5 text-[#fdfbf7] shadow-[0_6px_24px_rgba(0,0,0,0.65)] backdrop-blur-md sm:px-4 sm:py-2">
        {/* Top Row: Royal Crest, Round & Wall Mode Badges, Bag Pill, Action Buttons */}
        <div className="flex items-center justify-between gap-1.5">
          {/* Left: Royal Title Crest & Round Info */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenMainMenu}
              className="group flex items-center gap-2 rounded-xl border border-[#d4af37]/50 bg-[#0a1d37]/90 px-2.5 py-1 text-left shadow-inner transition hover:border-[#f5d061] hover:bg-[#102a4e]"
              title="Game Setup & Mode Menu"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-[#f5d061] to-[#b8860b] font-display text-xs font-black text-[#08182e] shadow">
                A
              </div>
              <div>
                <div className="font-display text-xs font-bold tracking-wider text-[#f7e5a9] sm:text-sm">
                  AZULEJO
                </div>
                <div className="hidden text-[9px] uppercase tracking-widest text-[#9ec1e6] sm:block">
                  Palace of &Eacute;vora
                </div>
              </div>
            </button>

            {/* Round & Wall Mode Pill */}
            <div className="flex items-center gap-1 rounded-xl border border-[#d4af37]/35 bg-[#081930]/85 px-2.5 py-1 text-xs">
              <span className="font-display font-bold text-[#f5d061]">
                Rd {gameState.roundNumber}
              </span>
              <span className="text-[#56769e]">&bull;</span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#9ec1e6]">
                {gameState.wallMode === 'gray' ? 'Gray Wall' : 'Standard'}
              </span>
            </div>
          </div>

          {/* Right: Linen Tile Bag Pill + Utility Controls */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            {/* Interactive Linen Tile Bag & Box Lid Pill */}
            <button
              type="button"
              onClick={handleBagClick}
              className="flex items-center gap-1.5 rounded-xl border border-[#d4af37]/55 bg-gradient-to-r from-[#13325b] to-[#0d2444] px-2.5 py-1 text-xs font-semibold text-[#f7e5a9] shadow transition hover:border-[#f5d061] hover:from-[#194073] hover:to-[#12315b]"
              title="Inspect Linen Tile Bag & Draw Odds"
            >
              <Package className="h-3.5 w-3.5 text-[#f5d061]" />
              <span>Bag: {gameState.bag.length}</span>
              <span className="hidden text-[#8eb2d9] sm:inline">
                | Lid: {gameState.boxLid.length}
              </span>
            </button>

            {onOpenCareerProfile && (
              <button
                type="button"
                onClick={onOpenCareerProfile}
                aria-label="Career Profile, Achievements & Daily Challenge"
                title="Career Profile, Achievements & Daily Seeded Challenge"
                className="rounded-xl border border-[#d4af37]/55 bg-[#0b213f] p-1.5 text-[#f5d061] transition hover:border-[#f5d061] hover:bg-[#13325b] cursor-pointer"
              >
                <Trophy className="h-4 w-4" />
              </button>
            )}

            {onOpenOnlineLobby && (
              <button
                type="button"
                onClick={onOpenOnlineLobby}
                aria-label="Online Multiplayer Room"
                title="Online Multiplayer Lobby (P2P)"
                className="rounded-xl border border-[#d4af37]/35 bg-[#0b213f] p-1.5 text-[#9ec1e6] transition hover:border-[#f5d061] hover:text-[#f7e5a9]"
              >
                <Users className="h-4 w-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onOpenTutorial}
              aria-label="Interactive Coach Tutorial"
              title="Interactive 5-Step Tutorial"
              className="rounded-xl border border-[#d4af37]/35 bg-[#0b213f] p-1.5 text-[#9ec1e6] transition hover:border-[#f5d061] hover:text-[#f7e5a9]"
            >
              <GraduationCap className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={onOpenRulebook}
              aria-label="Official Rulebook"
              title="Digital Illustrated Rulebook"
              className="rounded-xl border border-[#d4af37]/35 bg-[#0b213f] p-1.5 text-[#9ec1e6] transition hover:border-[#f5d061] hover:text-[#f7e5a9]"
            >
              <BookOpen className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleToggleAudio}
              aria-label={isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}
              title={isAudioMuted ? 'Unmute Ceramic Audio' : 'Mute Ceramic Audio'}
              className="rounded-xl border border-[#d4af37]/35 bg-[#0b213f] p-1.5 text-[#9ec1e6] transition hover:border-[#f5d061] hover:text-[#f7e5a9]"
            >
              {isAudioMuted ? (
                <VolumeX className="h-4 w-4 text-[#f87171]" />
              ) : (
                <Volume2 className="h-4 w-4 text-[#f5d061]" />
              )}
            </button>

            <button
              type="button"
              onClick={onOpenMainMenu}
              aria-label="Game Setup Menu"
              title="Match Setup & Mode Settings"
              className="rounded-xl border border-[#d4af37]/35 bg-[#0b213f] p-1.5 text-[#9ec1e6] transition hover:border-[#f5d061] hover:text-[#f7e5a9]"
            >
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Bottom Row: Opponent & Player Mini-Boards Strip */}
        <div className="custom-scroll flex items-center gap-2 overflow-x-auto pb-0.5 pt-1">
          {gameState.players.map((player, idx) => {
            const isActiveTurn = idx === gameState.activePlayerIndex;
            const floorCount = player.floorLine.length;

            return (
              <button
                key={player.id}
                type="button"
                onClick={() => handlePlayerCardClick(player)}
                className={`group relative flex min-w-[162px] flex-1 items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left transition ${
                  isActiveTurn
                    ? 'border-[#f5d061] bg-gradient-to-r from-[#173c6b] via-[#13325b] to-[#0f2849] shadow-[0_0_15px_rgba(245,208,97,0.3)]'
                    : 'border-[#d4af37]/30 bg-[#091c36]/85 hover:border-[#d4af37]/65 hover:bg-[#0f294d]'
                }`}
              >
                {/* Left Info: Name, Score, Turn Crown, Floor Count */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    {isActiveTurn ? (
                      <Crown className="h-3.5 w-3.5 shrink-0 animate-pulse text-[#f5d061]" />
                    ) : player.isAI ? (
                      <Bot className="h-3 w-3 shrink-0 text-[#9ec1e6]" />
                    ) : (
                      <User className="h-3 w-3 shrink-0 text-[#9ec1e6]" />
                    )}
                    <span className="truncate text-xs font-bold text-[#fdfbf7]">
                      {player.name}
                    </span>
                  </div>

                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="font-display text-base font-extrabold leading-none text-[#f5d061]">
                      {player.score}
                      <span className="ml-0.5 text-[9px] font-normal text-[#9ec1e6]">
                        pts
                      </span>
                    </span>

                    {floorCount > 0 && (
                      <span className="rounded bg-[#7f1d1d]/70 px-1 py-0.2 text-[9px] font-semibold text-[#fca5a5]">
                        Flr:{floorCount}
                      </span>
                    )}

                    {player.hasFirstPlayerTokenForNextRound && (
                      <span className="rounded bg-[#f5d061]/25 px-1 text-[9px] font-bold text-[#f7e5a9]">
                        1st
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Mini Visual: 5 Pattern Lines + 5x5 Miniature Colored Wall Grid */}
                <div className="flex items-center gap-1 rounded-lg border border-[#d4af37]/25 bg-[#061326] p-1">
                  {/* Miniature 5 Pattern Lines */}
                  <div className="flex flex-col items-end gap-[2px]">
                    {player.patternLines.map((line, rIdx) => {
                      const cap = rIdx + 1;
                      const hex = line.color
                        ? TILE_METADATA[line.color].primaryHex
                        : undefined;
                      return (
                        <div key={rIdx} className="flex gap-[1.5px]">
                          {Array.from({ length: cap }, (_, slotIdx) => {
                            const filled = cap - 1 - slotIdx < line.count;
                            return (
                              <span
                                key={slotIdx}
                                className="block h-[5px] w-[5px] rounded-[1px]"
                                style={{
                                  backgroundColor:
                                    filled && hex ? hex : 'rgba(255,255,255,0.14)',
                                }}
                              />
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {/* Divider */}
                  <div className="h-7 w-[1px] bg-[#d4af37]/30" />

                  {/* Miniature 5x5 Wall Grid */}
                  <div className="grid grid-cols-5 gap-[1.5px]">
                    {[0, 1, 2, 3, 4].map((r) =>
                      [0, 1, 2, 3, 4].map((c) => {
                        const cell = player.wall[r]?.[c];
                        const filled = cell?.filledColor;
                        const templateColor =
                          gameState.wallMode === 'standard'
                            ? STANDARD_WALL_LAYOUT[r][c]
                            : null;
                        const bgHex = filled
                          ? TILE_METADATA[filled].primaryHex
                          : templateColor
                            ? TILE_METADATA[templateColor].primaryHex
                            : '#ffffff';

                        return (
                          <span
                            key={`${r}-${c}`}
                            className="block h-[5px] w-[5px] rounded-[1px]"
                            style={{
                              backgroundColor: bgHex,
                              opacity: filled ? 1 : 0.2,
                            }}
                          />
                        );
                      })
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Subtle Last-Turn Ticker / Active Prompt */}
        {gameState.lastTurn && (
          <div className="pointer-events-none hidden items-center justify-center gap-1 text-[10px] text-[#9ec1e6]/90 sm:flex">
            <Sparkles className="h-3 w-3 text-[#f5d061]" />
            <span>
              Last move: <strong className="text-[#f7e5a9]">{gameState.lastTurn.playerName}</strong> drafted{' '}
              {gameState.lastTurn.tilesTaken}{' '}
              <strong className="capitalize text-white">
                {TILE_METADATA[gameState.lastTurn.move.color].name}
              </strong>{' '}
              &rarr;{' '}
              {gameState.lastTurn.move.destinationRow === 'floor'
                ? 'Floor Line'
                : `Row ${gameState.lastTurn.move.destinationRow + 1}`}
            </span>
          </div>
        )}
      </header>

      {/* Self-contained Inspector Modals if parent doesn't override */}
      <BagInspectorModal
        isOpen={bagModalOpen}
        onClose={() => setBagModalOpen(false)}
        gameState={gameState}
      />

      <OpponentInspectorModal
        isOpen={inspectedPlayer !== null}
        onClose={() => setInspectedPlayerId(null)}
        player={inspectedPlayer}
        allPlayers={gameState.players}
        onSelectPlayer={(id) => setInspectedPlayerId(id)}
        wallMode={gameState.wallMode}
        activePlayerId={activePlayer?.id}
      />
    </>
  );
};
