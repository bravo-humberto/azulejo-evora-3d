import React, { useEffect, useRef } from 'react';
import {
  X,
  Crown,
  Bot,
  User,
  Award,
  AlertTriangle,
  Grid,
  Columns,
  Rows,
} from 'lucide-react';
import {
  ALL_TILE_COLORS,
  FLOOR_PENALTIES,
  STANDARD_WALL_LAYOUT,
  TILE_METADATA,
  type PlayerBoard,
  type TileColor,
  type WallMode,
} from '../../types/game';

export interface OpponentInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerBoard | null;
  allPlayers?: PlayerBoard[];
  onSelectPlayer?: (playerId: string) => void;
  wallMode?: WallMode;
  activePlayerId?: string;
}

export const OpponentInspectorModal: React.FC<OpponentInspectorModalProps> = ({
  isOpen,
  onClose,
  player,
  allPlayers = [],
  onSelectPlayer,
  wallMode = 'standard',
  activePlayerId,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && player) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen, player]);

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

  if (!player) {
    return (
      <dialog
        ref={dialogRef}
        closedby="any"
        aria-label="Player Board Inspector"
        className="hidden"
      />
    );
  }

  // Compute live bonus progress on the 5x5 Wall
  let completedRows = 0;
  for (let r = 0; r < 5; r++) {
    if (player.wall[r]?.every((cell) => cell.filledColor !== null)) {
      completedRows++;
    }
  }

  let completedCols = 0;
  for (let c = 0; c < 5; c++) {
    let colFull = true;
    for (let r = 0; r < 5; r++) {
      if (!player.wall[r]?.[c]?.filledColor) {
        colFull = false;
        break;
      }
    }
    if (colFull) completedCols++;
  }

  const colorWallCounts: Record<TileColor, number> = {
    blue: 0,
    yellow: 0,
    red: 0,
    black: 0,
    teal: 0,
  };
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      const filled = player.wall[r]?.[c]?.filledColor;
      if (filled) {
        colorWallCounts[filled] = (colorWallCounts[filled] ?? 0) + 1;
      }
    }
  }

  const completedColorSets = ALL_TILE_COLORS.filter(
    (c) => colorWallCounts[c] === 5
  );
  const projectedBonusPoints =
    completedRows * 2 + completedCols * 7 + completedColorSets.length * 10;

  const currentFloorPenalty = player.floorLine
    .slice(0, FLOOR_PENALTIES.length)
    .reduce((acc, _, idx) => acc + FLOOR_PENALTIES[idx], 0);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="opponent-inspector-title"
      className="w-full max-w-xl rounded-2xl bg-transparent p-0 text-[#fdfbf7] shadow-2xl"
    >
      <div className="relative flex max-h-[88dvh] flex-col overflow-hidden rounded-2xl border-2 border-[#d4af37]/75 bg-gradient-to-b from-[#102a4c] via-[#0b1f3a] to-[#081629] shadow-[0_24px_64px_rgba(0,0,0,0.88)]">
        {/* Player Switcher Tabs (if multiple players provided) */}
        {allPlayers.length > 1 && onSelectPlayer && (
          <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[#d4af37]/25 bg-[#061223] px-4 py-2">
            {allPlayers.map((p) => {
              const isSelected = p.id === player.id;
              const isTurn = p.id === activePlayerId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectPlayer(p.id)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isSelected
                      ? 'border border-[#d4af37] bg-[#163a66] text-[#f7e5a9] shadow'
                      : 'border border-transparent bg-[#0c213d]/60 text-[#9ec1e6] hover:bg-[#122e54]'
                  }`}
                >
                  {isTurn && <Crown className="h-3.5 w-3.5 text-[#f5d061]" />}
                  <span className="truncate max-w-[100px]">{p.name}</span>
                  <span className="rounded bg-[#071527] px-1.5 py-0.5 font-display text-[11px] text-[#f3d27a]">
                    {p.score}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/30 bg-[#071527]/85 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[#f5d061]/70 text-white shadow-md"
              style={{ backgroundColor: player.avatarColor || '#1565C0' }}
            >
              {player.isAI ? (
                <Bot className="h-6 w-6" />
              ) : (
                <User className="h-6 w-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2
                  id="opponent-inspector-title"
                  className="font-display text-lg font-bold text-[#f7e5a9]"
                >
                  {player.name}
                </h2>
                {player.id === activePlayerId && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#f5d061]/60 bg-[#f5d061]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f7e5a9]">
                    <Crown className="h-3 w-3 text-[#f5d061]" /> Active Turn
                  </span>
                )}
              </div>
              <p className="text-xs text-[#9ec1e6]">
                {player.isAI
                  ? `Royal Automaton (${(player.aiDifficulty ?? 'medium').toUpperCase()} AI)`
                  : 'Human Artisan'}{' '}
                &bull;{' '}
                {wallMode === 'gray' ? 'Gray Variant Wall' : 'Standard Palace Wall'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-[#d4af37]/50 bg-[#0b2342] px-3.5 py-1.5 text-right">
              <span className="block text-[10px] uppercase tracking-wider text-[#9ec1e6]">
                Score
              </span>
              <span className="font-display text-xl font-bold text-[#f5d061]">
                {player.score}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Board Inspector"
              className="rounded-lg border border-[#d4af37]/30 bg-[#133159]/60 p-2 text-[#e2c778] transition hover:border-[#d4af37] hover:bg-[#1b4379] hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Body: Pattern Lines + 5x5 Wall + Floor Line + End-of-Game Bonuses */}
        <div className="custom-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Pattern Lines & 5x5 Wall Side-by-Side */}
          <div className="rounded-2xl border border-[#d4af37]/35 bg-[#e9dec7] p-3.5 text-[#1f2937] shadow-inner">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-[#5c4827]">
              <span>Pattern Lines (Right &rarr; Left)</span>
              <span>5&times;5 Palace Wall</span>
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
              {/* Left: 5 Pattern Lines */}
              <div className="flex flex-col gap-1.5">
                {player.patternLines.map((line, rIdx) => {
                  const capacity = rIdx + 1;
                  const slots = Array.from({ length: capacity }, (_, i) => {
                    // Filled right-to-left: slot index 0 is rightmost
                    const isFilled = i < line.count;
                    return isFilled ? line.color : null;
                  }).reverse(); // Render left-to-right visually so rightmost is aligned with the wall

                  return (
                    <div
                      key={rIdx}
                      className="flex h-8 sm:h-9 items-center justify-end gap-1"
                    >
                      <span className="mr-1 text-[10px] font-bold text-[#785f37]">
                        {capacity}
                      </span>
                      {slots.map((slotColor, sIdx) => {
                        const meta = slotColor ? TILE_METADATA[slotColor] : null;
                        return (
                          <div
                            key={sIdx}
                            className={`h-7 w-7 sm:h-8 sm:w-8 rounded-md border transition ${
                              meta
                                ? 'border-[#d4af37] shadow-sm'
                                : 'border-[#b9a581] bg-[#d8c8a8]/70 shadow-inner'
                            }`}
                            style={
                              meta ? { backgroundColor: meta.primaryHex } : undefined
                            }
                          >
                            {meta && (
                              <img
                                src={meta.textureUrl}
                                alt={meta.name}
                                className="h-full w-full rounded-md object-cover"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Center Arrows */}
              <div className="flex flex-col justify-around gap-1.5 py-1 text-xs font-bold text-[#9a7b3e]">
                {[0, 1, 2, 3, 4].map((r) => (
                  <span key={r} className="flex h-8 sm:h-9 items-center">
                    &rarr;
                  </span>
                ))}
              </div>

              {/* Right: 5x5 Wall */}
              <div className="flex flex-col gap-1.5">
                {[0, 1, 2, 3, 4].map((rIdx) => (
                  <div key={rIdx} className="flex h-8 sm:h-9 items-center gap-1">
                    {[0, 1, 2, 3, 4].map((cIdx) => {
                      const cell = player.wall[rIdx]?.[cIdx];
                      const filledColor = cell?.filledColor ?? null;
                      const expectedColor =
                        wallMode === 'standard'
                          ? cell?.expectedColor ??
                            STANDARD_WALL_LAYOUT[rIdx][cIdx]
                          : null;
                      const activeMeta = filledColor
                        ? TILE_METADATA[filledColor]
                        : expectedColor
                          ? TILE_METADATA[expectedColor]
                          : null;

                      return (
                        <div
                          key={cIdx}
                          className={`relative h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded-md border transition ${
                            filledColor
                              ? 'border-[#d4af37] ring-1 ring-[#d4af37]/70 shadow-md scale-[1.02]'
                              : 'border-[#b8a47e] bg-[#cfc0a3]'
                          }`}
                        >
                          {activeMeta && (
                            <img
                              src={activeMeta.textureUrl}
                              alt={activeMeta.name}
                              className={`h-full w-full object-cover ${
                                filledColor ? 'opacity-100' : 'opacity-25 grayscale-[20%]'
                              }`}
                            />
                          )}
                          {!filledColor && wallMode === 'gray' && (
                            <div className="flex h-full w-full items-center justify-center text-[9px] font-bold text-[#7c6a46]/60">
                              &bull;
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 7-Slot Floor Line Penalties */}
          <div className="rounded-xl border border-[#d4af37]/30 bg-[#0b213f] p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#f3d27a]">
                <AlertTriangle className="h-3.5 w-3.5 text-[#f59e0b]" />
                Floor Line Penalties (7 Slots)
              </div>
              <span className="text-xs font-bold text-[#f87171]">
                Pending Penalty: {currentFloorPenalty} pts
              </span>
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {FLOOR_PENALTIES.map((penalty, idx) => {
                const token = player.floorLine[idx] ?? null;
                const isFirstPlayer = token === 'first-player';
                const tileMeta =
                  token && token !== 'first-player' ? TILE_METADATA[token] : null;

                return (
                  <div
                    key={idx}
                    className="flex flex-col items-center rounded-lg border border-[#d4af37]/25 bg-[#07162b] p-1.5"
                  >
                    <span className="mb-1 text-[10px] font-bold text-[#f87171]">
                      {penalty}
                    </span>
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-md border border-[#d4af37]/30 bg-[#0d2647]">
                      {isFirstPlayer ? (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#fef3c7] to-[#d4af37] font-display text-xs font-extrabold text-[#0b2545]">
                          1st
                        </div>
                      ) : tileMeta ? (
                        <img
                          src={tileMeta.textureUrl}
                          alt={tileMeta.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-[#56769e]">&mdash;</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* End-of-Game Bonus Progress */}
          <div className="rounded-xl border border-[#d4af37]/30 bg-[#0b213f] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#f3d27a]">
                <Award className="h-4 w-4 text-[#f5d061]" />
                End-of-Game Bonus Progress
              </div>
              <span className="rounded-full border border-[#d4af37]/40 bg-[#07162c] px-2.5 py-0.5 text-xs font-bold text-[#a8f0da]">
                +{projectedBonusPoints} Projected Bonus Pts
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-[#d4af37]/20 bg-[#07162b] p-2.5">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#9ec1e6]">
                  <Rows className="h-3.5 w-3.5 text-[#f5d061]" /> Full Rows (+2)
                </div>
                <div className="font-display mt-1 text-lg font-bold text-white">
                  {completedRows} / 5
                </div>
                <div className="text-[11px] font-semibold text-[#f3d27a]">
                  +{completedRows * 2} pts
                </div>
              </div>

              <div className="rounded-lg border border-[#d4af37]/20 bg-[#07162b] p-2.5">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#9ec1e6]">
                  <Columns className="h-3.5 w-3.5 text-[#f5d061]" /> Full Cols (+7)
                </div>
                <div className="font-display mt-1 text-lg font-bold text-white">
                  {completedCols} / 5
                </div>
                <div className="text-[11px] font-semibold text-[#f3d27a]">
                  +{completedCols * 7} pts
                </div>
              </div>

              <div className="rounded-lg border border-[#d4af37]/20 bg-[#07162b] p-2.5">
                <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[#9ec1e6]">
                  <Grid className="h-3.5 w-3.5 text-[#f5d061]" /> 5-of-Color (+10)
                </div>
                <div className="font-display mt-1 text-lg font-bold text-white">
                  {completedColorSets.length} / 5
                </div>
                <div className="text-[11px] font-semibold text-[#f3d27a]">
                  +{completedColorSets.length * 10} pts
                </div>
              </div>
            </div>

            {/* Per-Color Set Counters */}
            <div className="mt-2.5 grid grid-cols-5 gap-1.5">
              {ALL_TILE_COLORS.map((color) => {
                const count = colorWallCounts[color];
                const meta = TILE_METADATA[color];
                const isComplete = count === 5;
                return (
                  <div
                    key={color}
                    className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
                      isComplete
                        ? 'border-[#f5d061] bg-[#f5d061]/20 text-[#f7e5a9]'
                        : 'border-[#d4af37]/20 bg-[#07162b] text-[#9ec1e6]'
                    }`}
                  >
                    <img
                      src={meta.textureUrl}
                      alt={meta.name}
                      className="h-4 w-4 rounded-sm object-cover"
                    />
                    <span className="font-bold">{count}/5</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
};
