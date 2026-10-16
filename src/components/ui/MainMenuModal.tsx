import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Crown,
  Bot,
  Users,
  Globe,
  GraduationCap,
  Sparkles,
  Grid,
  Play,
  User,
} from 'lucide-react';
import type { AIDifficulty, GameMode, WallMode } from '../../types/game';
import { soundManager } from '../../audio/soundManager';

export interface PlayerSeatConfig {
  name: string;
  isAI: boolean;
  aiDifficulty: AIDifficulty;
  avatarColor: string;
}

export interface NewMatchSetupConfig {
  mode: GameMode;
  wallMode: WallMode;
  playerCount: 2 | 3 | 4;
  seats: PlayerSeatConfig[];
}

export interface MainMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartMatch: (config: NewMatchSetupConfig) => void;
  onOpenOnlineLobby?: () => void;
  onOpenTutorial?: () => void;
  currentMode?: GameMode;
  currentWallMode?: WallMode;
}

const DEFAULT_AVATAR_COLORS = ['#1565C0', '#F9A825', '#D84315', '#00ACC1'];

const DEFAULT_NAMES = [
  'Dom Manuel I',
  'Mestre Beatriz',
  'Infante Duarte',
  'Condessa Leonor',
];

export const MainMenuModal: React.FC<MainMenuModalProps> = ({
  isOpen,
  onClose,
  onStartMatch,
  onOpenOnlineLobby,
  onOpenTutorial,
  currentMode = 'ai',
  currentWallMode = 'standard',
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [mode, setMode] = useState<GameMode>(currentMode);
  const [wallMode, setWallMode] = useState<WallMode>(currentWallMode);
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [seats, setSeats] = useState<PlayerSeatConfig[]>([
    {
      name: DEFAULT_NAMES[0],
      isAI: false,
      aiDifficulty: 'medium',
      avatarColor: DEFAULT_AVATAR_COLORS[0],
    },
    {
      name: DEFAULT_NAMES[1],
      isAI: true,
      aiDifficulty: 'medium',
      avatarColor: DEFAULT_AVATAR_COLORS[1],
    },
    {
      name: DEFAULT_NAMES[2],
      isAI: true,
      aiDifficulty: 'hard',
      avatarColor: DEFAULT_AVATAR_COLORS[2],
    },
    {
      name: DEFAULT_NAMES[3],
      isAI: true,
      aiDifficulty: 'easy',
      avatarColor: DEFAULT_AVATAR_COLORS[3],
    },
  ]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };
    dialog.addEventListener('close', handleClose);

    // Fallback for browsers without closedby support
    let handleBackdropClick: ((event: MouseEvent) => void) | null = null;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (isDialogContent) return;
        dialog.close();
      };
      dialog.addEventListener('click', handleBackdropClick);
    }

    return () => {
      dialog.removeEventListener('close', handleClose);
      if (handleBackdropClick) {
        dialog.removeEventListener('click', handleBackdropClick);
      }
    };
  }, [onClose]);

  const handleSelectMode = (nextMode: GameMode) => {
    soundManager.playTilePickup(1);
    setMode(nextMode);
    if (nextMode === 'pass-and-play') {
      setSeats((prev) =>
        prev.map((seat) => ({
          ...seat,
          isAI: false,
        }))
      );
    } else if (nextMode === 'ai') {
      setSeats((prev) =>
        prev.map((seat, idx) => ({
          ...seat,
          isAI: idx > 0,
        }))
      );
    }
  };

  const handleUpdateSeat = (
    idx: number,
    patch: Partial<PlayerSeatConfig>
  ) => {
    setSeats((prev) =>
      prev.map((seat, i) => (i === idx ? { ...seat, ...patch } : seat))
    );
  };

  const handleLaunchMatch = () => {
    soundManager.playTilePlace(1);

    if (mode === 'online' && onOpenOnlineLobby) {
      onClose();
      onOpenOnlineLobby();
      return;
    }

    const activeSeats = seats.slice(0, playerCount).map((s, idx) => ({
      ...s,
      name: s.name.trim() || DEFAULT_NAMES[idx],
    }));

    onStartMatch({
      mode,
      wallMode,
      playerCount,
      seats: activeSeats,
    });

    if (mode === 'tutorial' && onOpenTutorial) {
      onOpenTutorial();
    }
    onClose();
  };

  const factoryCount = playerCount === 2 ? 5 : playerCount === 3 ? 7 : 9;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="main-menu-title"
      className="w-full max-w-xl rounded-2xl bg-transparent p-0 text-[#fdfbf7] shadow-2xl"
    >
      <div className="relative flex max-h-[88dvh] flex-col overflow-hidden rounded-2xl border-2 border-[#d4af37]/80 bg-gradient-to-b from-[#0f294a] via-[#0b1f3a] to-[#071527] shadow-[0_24px_64px_rgba(0,0,0,0.9)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/30 bg-[#071527]/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#f5d061] bg-gradient-to-br from-[#f5d061] to-[#b5851b] font-display text-xl font-black text-[#071527] shadow-md">
              <Crown className="h-6 w-6" />
            </div>
            <div>
              <h2
                id="main-menu-title"
                className="font-display text-lg font-bold tracking-wider text-[#f7e5a9] sm:text-xl"
              >
                Royal Palace of &Eacute;vora
              </h2>
              <p className="text-xs text-[#9ec1e6]">
                Configure Game Mode, Artisans &amp; Palace Wall Variant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Main Menu"
            className="rounded-lg border border-[#d4af37]/30 bg-[#133159]/60 p-2 text-[#e2c778] transition hover:border-[#d4af37] hover:bg-[#1b4379] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable Configuration Form */}
        <div className="custom-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* 1. Game Mode Selector */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#f3d27a]">
              1. Select Match Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectMode('ai')}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                  mode === 'ai'
                    ? 'border-[#f5d061] bg-[#163a66] text-[#f7e5a9] shadow-md'
                    : 'border-[#d4af37]/25 bg-[#091c36] text-[#9ec1e6] hover:border-[#d4af37]/60'
                }`}
              >
                <Bot className="h-5 w-5 shrink-0 text-[#f5d061]" />
                <div>
                  <div className="text-xs font-bold text-white">Solo vs AI</div>
                  <div className="text-[10px] text-[#9ec1e6]">
                    Challenge Royal Automatons
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('pass-and-play')}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                  mode === 'pass-and-play'
                    ? 'border-[#f5d061] bg-[#163a66] text-[#f7e5a9] shadow-md'
                    : 'border-[#d4af37]/25 bg-[#091c36] text-[#9ec1e6] hover:border-[#d4af37]/60'
                }`}
              >
                <Users className="h-5 w-5 shrink-0 text-[#f5d061]" />
                <div>
                  <div className="text-xs font-bold text-white">
                    Pass &amp; Play (2–4P)
                  </div>
                  <div className="text-[10px] text-[#9ec1e6]">
                    Local Tabletop Multiplayer
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('online')}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                  mode === 'online'
                    ? 'border-[#f5d061] bg-[#163a66] text-[#f7e5a9] shadow-md'
                    : 'border-[#d4af37]/25 bg-[#091c36] text-[#9ec1e6] hover:border-[#d4af37]/60'
                }`}
              >
                <Globe className="h-5 w-5 shrink-0 text-[#f5d061]" />
                <div>
                  <div className="text-xs font-bold text-white">
                    Online Room Code
                  </div>
                  <div className="text-[10px] text-[#9ec1e6]">
                    Instant P2P WebRTC Match
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMode('tutorial')}
                className={`flex items-center gap-2.5 rounded-xl border p-3 text-left transition ${
                  mode === 'tutorial'
                    ? 'border-[#f5d061] bg-[#163a66] text-[#f7e5a9] shadow-md'
                    : 'border-[#d4af37]/25 bg-[#091c36] text-[#9ec1e6] hover:border-[#d4af37]/60'
                }`}
              >
                <GraduationCap className="h-5 w-5 shrink-0 text-[#f5d061]" />
                <div>
                  <div className="text-xs font-bold text-white">
                    Guided Tutorial
                  </div>
                  <div className="text-[10px] text-[#9ec1e6]">
                    Interactive 5-Step Coach
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Player Count Selector */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-[#f3d27a]">
                2. Number of Artisans
              </label>
              <span className="rounded-full border border-[#d4af37]/40 bg-[#071527] px-2.5 py-0.5 text-[11px] font-semibold text-[#a8f0da]">
                {factoryCount} Factory Coasters ({factoryCount * 4} Tiles / Rd)
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([2, 3, 4] as const).map((count) => {
                const fCount = count === 2 ? 5 : count === 3 ? 7 : 9;
                const active = playerCount === count;
                return (
                  <button
                    key={count}
                    type="button"
                    onClick={() => {
                      soundManager.playTilePickup(1);
                      setPlayerCount(count);
                    }}
                    className={`rounded-xl border py-2.5 text-center transition ${
                      active
                        ? 'border-[#f5d061] bg-[#163a66] text-[#f7e5a9] shadow'
                        : 'border-[#d4af37]/25 bg-[#091c36] text-[#9ec1e6] hover:border-[#d4af37]/60'
                    }`}
                  >
                    <div className="font-display text-sm font-bold text-white">
                      {count} Players
                    </div>
                    <div className="text-[10px] text-[#9ec1e6]">
                      {fCount} Factories
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Seat Configuration */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#f3d27a]">
              3. Seat Roster &amp; AI Difficulty
            </label>
            <div className="space-y-2">
              {seats.slice(0, playerCount).map((seat, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#d4af37]/30 bg-[#091c36] p-2.5"
                >
                  <div className="flex flex-1 items-center gap-2">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#f5d061]/60 text-white shadow"
                      style={{ backgroundColor: seat.avatarColor }}
                    >
                      {seat.isAI ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </div>
                    <input
                      type="text"
                      value={seat.name}
                      onChange={(e) =>
                        handleUpdateSeat(idx, { name: e.target.value })
                      }
                      aria-label={`Player ${idx + 1} Name`}
                      className="w-full min-w-[110px] rounded-lg border border-[#d4af37]/30 bg-[#061326] px-2.5 py-1 text-xs font-semibold text-white focus:border-[#f5d061] focus:outline-none"
                    />
                  </div>

                  {/* Human vs AI Toggle */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateSeat(idx, { isAI: !seat.isAI })
                      }
                      className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                        seat.isAI
                          ? 'border-[#f5d061]/60 bg-[#163a66] text-[#f7e5a9]'
                          : 'border-[#7fd8be]/60 bg-[#0d332e] text-[#a8f0da]'
                      }`}
                    >
                      {seat.isAI ? 'AI Bot' : 'Human'}
                    </button>

                    {seat.isAI && (
                      <select
                        value={seat.aiDifficulty}
                        onChange={(e) =>
                          handleUpdateSeat(idx, {
                            aiDifficulty: e.target.value as AIDifficulty,
                          })
                        }
                        aria-label={`Player ${idx + 1} AI Difficulty`}
                        className="rounded-lg border border-[#d4af37]/40 bg-[#061326] px-2 py-1 text-xs font-semibold text-[#f3d27a] focus:border-[#f5d061] focus:outline-none"
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Board Side Selector (Standard Colored vs Gray Variant) */}
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-[#f3d27a]">
              4. Palace Wall Board Side
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  soundManager.playTilePickup(1);
                  setWallMode('standard');
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  wallMode === 'standard'
                    ? 'border-[#f5d061] bg-[#163a66] shadow-md'
                    : 'border-[#d4af37]/25 bg-[#091c36] hover:border-[#d4af37]/60'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#f7e5a9]">
                  <Sparkles className="h-4 w-4 text-[#f5d061]" />
                  Colored Standard Wall
                </div>
                <p className="mt-1 text-[11px] text-[#9ec1e6]">
                  Fixed Latin-square mosaic pattern. Ideal for classic tactical play.
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundManager.playTilePickup(1);
                  setWallMode('gray');
                }}
                className={`rounded-xl border p-3 text-left transition ${
                  wallMode === 'gray'
                    ? 'border-[#f5d061] bg-[#163a66] shadow-md'
                    : 'border-[#d4af37]/25 bg-[#091c36] hover:border-[#d4af37]/60'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#f7e5a9]">
                  <Grid className="h-4 w-4 text-[#f5d061]" />
                  Gray Variant Wall
                </div>
                <p className="mt-1 text-[11px] text-[#9ec1e6]">
                  Uncolored slots! Choose any column when sliding, enforcing row &amp; column uniqueness.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Launch Button */}
        <div className="border-t border-[#d4af37]/30 bg-[#071527]/95 px-5 py-3.5">
          <button
            type="button"
            onClick={handleLaunchMatch}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#f5d061] bg-gradient-to-r from-[#f5d061] via-[#e2b93b] to-[#c79519] py-3 font-display text-sm font-extrabold uppercase tracking-wider text-[#071527] shadow-[0_8px_25px_rgba(245,208,97,0.35)] transition hover:brightness-110"
          >
            <Play className="h-4 w-4 fill-current" />
            {mode === 'online'
              ? 'Open Online Room Lobby (P2P)'
              : mode === 'tutorial'
                ? 'Start Guided Tutorial Match'
                : 'Begin New Royal Match'}
          </button>
        </div>
      </div>
    </dialog>
  );
};
