import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Crown,
  Trophy,
  RotateCcw,
  Settings,
  Award,
  Rows,
  Columns,
  Grid,
  Sparkles,
  X,
} from 'lucide-react';
import {
  TILE_METADATA,
  type EndGameBonusBreakdown,
  type GameState,
} from '../../types/game';
import { soundManager } from '../../audio/soundManager';

export interface GameOverModalProps {
  isOpen: boolean;
  onClose?: () => void;
  gameState: GameState;
  onPlayAgain: () => void;
  onOpenSetupMenu?: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  onClose,
  gameState,
  onPlayAgain,
  onOpenSetupMenu,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      soundManager.playVictoryFanfare();

      // Fire celebratory Iberian gold & royal blue confetti
      try {
        confetti({
          particleCount: 85,
          spread: 70,
          origin: { y: 0.55 },
          colors: ['#D4AF37', '#1565C0', '#F9A825', '#00ACC1', '#D84315'],
        });
      } catch {
        // Ignore confetti errors in headless test environments
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose?.();
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

  // Build sorted breakdowns (use gameState.endGameBonuses if populated, or synthesize fallback from players)
  const breakdowns: EndGameBonusBreakdown[] =
    gameState.endGameBonuses && gameState.endGameBonuses.length > 0
      ? [...gameState.endGameBonuses].sort(
          (a, b) =>
            b.finalScore - a.finalScore || b.completedRows - a.completedRows
        )
      : [...gameState.players]
          .map((p) => ({
            playerId: p.id,
            playerName: p.name,
            scoreBeforeBonuses: p.score,
            completedRows: 0,
            rowBonusPoints: 0,
            completedCols: 0,
            colBonusPoints: 0,
            completedColors: [],
            colorBonusPoints: 0,
            totalBonusPoints: 0,
            finalScore: p.score,
            isWinner: gameState.winnerIds.includes(p.id),
          }))
          .sort((a, b) => b.finalScore - a.finalScore);

  const winners = breakdowns.filter((b) => b.isWinner);
  const primaryWinner = winners[0] ?? breakdowns[0];

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="game-over-title"
      className="w-full max-w-2xl rounded-2xl bg-transparent p-0 text-[#fdfbf7] shadow-2xl"
    >
      <div className="relative flex max-h-[88dvh] flex-col overflow-hidden rounded-2xl border-2 border-[#f5d061] bg-gradient-to-b from-[#102c52] via-[#0b203c] to-[#071528] shadow-[0_25px_70px_rgba(0,0,0,0.92)]">
        {/* Royal Banner Header */}
        <div className="relative border-b border-[#d4af37]/40 bg-gradient-to-r from-[#091c36] via-[#13335c] to-[#091c36] px-6 py-5 text-center">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Scoreboard"
              className="absolute right-4 top-4 rounded-lg border border-[#d4af37]/30 bg-[#133159]/60 p-1.5 text-[#e2c778] transition hover:border-[#d4af37] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#f5d061] bg-gradient-to-br from-[#f5d061] to-[#b5851b] text-[#071527] shadow-[0_0_25px_rgba(245,208,97,0.5)]">
            <Trophy className="h-8 w-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#f5d061]/50 bg-[#f5d061]/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-[#f5d061]">
            <Sparkles className="h-3 w-3" /> Royal Palace Mosaic Complete &bull;{' '}
            {gameState.roundNumber} Rounds
          </div>

          <h2
            id="game-over-title"
            className="font-display mt-1.5 text-2xl font-extrabold tracking-wide text-[#f7e5a9] sm:text-3xl"
          >
            {winners.length > 1
              ? `Shared Royal Victory!`
              : `${primaryWinner?.playerName ?? 'Royal Artisan'} Triumphs!`}
          </h2>

          {primaryWinner?.isTieBreakerWinner && (
            <p className="mt-1 text-xs font-semibold text-[#a8f0da]">
              Won via Official Tie-Breaker ({primaryWinner.completedRows}{' '}
              Complete Horizontal Rows)
            </p>
          )}
        </div>

        {/* Full Score Breakdown Table */}
        <div className="custom-scroll flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {breakdowns.map((entry, rankIdx) => {
            const isWin = entry.isWinner;
            return (
              <div
                key={entry.playerId}
                className={`rounded-2xl border p-4 transition ${
                  isWin
                    ? 'border-[#f5d061] bg-gradient-to-r from-[#173d6e]/95 via-[#123159]/95 to-[#0d2444]/95 shadow-[0_0_20px_rgba(245,208,97,0.22)]'
                    : 'border-[#d4af37]/30 bg-[#091c36]/90'
                }`}
              >
                {/* Top Row: Rank, Name, Badges, Final Total */}
                <div className="flex items-center justify-between gap-2 border-b border-[#d4af37]/20 pb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-xl font-display text-sm font-black ${
                        isWin
                          ? 'bg-gradient-to-br from-[#f5d061] to-[#c79519] text-[#071527] shadow'
                          : 'border border-[#d4af37]/40 bg-[#071527] text-[#9ec1e6]'
                      }`}
                    >
                      {isWin ? <Crown className="h-5 w-5" /> : `#${rankIdx + 1}`}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-base font-bold text-white">
                          {entry.playerName}
                        </span>
                        {isWin && (
                          <span className="rounded-full border border-[#f5d061] bg-[#f5d061]/20 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#f7e5a9]">
                            Master Tilemaker
                          </span>
                        )}
                        {entry.isTieBreakerWinner && (
                          <span className="rounded-full border border-[#7fd8be] bg-[#0d332e] px-2 py-0.5 text-[10px] font-bold text-[#a8f0da]">
                            Row Tie-Breaker
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#9ec1e6]">
                        Base Wall Score: <strong>{entry.scoreBeforeBonuses}</strong>{' '}
                        pts &bull; End Bonuses:{' '}
                        <strong className="text-[#a8f0da]">
                          +{entry.totalBonusPoints}
                        </strong>{' '}
                        pts
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block text-[10px] uppercase tracking-wider text-[#9ec1e6]">
                      Final Score
                    </span>
                    <span className="font-display text-2xl font-black text-[#f5d061]">
                      {entry.finalScore}
                    </span>
                  </div>
                </div>

                {/* 4-Column Bonus Breakdown Grid */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded-xl border border-[#d4af37]/20 bg-[#071527]/90 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#9ec1e6]">
                      <Award className="h-3 w-3 text-[#f5d061]" /> Base Score
                    </div>
                    <div className="font-display mt-1 text-base font-bold text-white">
                      {entry.scoreBeforeBonuses} pts
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#d4af37]/20 bg-[#071527]/90 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#9ec1e6]">
                      <Rows className="h-3 w-3 text-[#f5d061]" /> Rows (+2)
                    </div>
                    <div className="font-display mt-1 text-base font-bold text-[#f7e5a9]">
                      +{entry.rowBonusPoints}{' '}
                      <span className="font-sans text-[11px] font-normal text-[#9ec1e6]">
                        ({entry.completedRows}&times;2)
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#d4af37]/20 bg-[#071527]/90 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#9ec1e6]">
                      <Columns className="h-3 w-3 text-[#f5d061]" /> Cols (+7)
                    </div>
                    <div className="font-display mt-1 text-base font-bold text-[#f7e5a9]">
                      +{entry.colBonusPoints}{' '}
                      <span className="font-sans text-[11px] font-normal text-[#9ec1e6]">
                        ({entry.completedCols}&times;7)
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#d4af37]/20 bg-[#071527]/90 p-2.5">
                    <div className="flex items-center gap-1 text-[10px] font-semibold uppercase text-[#9ec1e6]">
                      <Grid className="h-3 w-3 text-[#f5d061]" /> Sets (+10)
                    </div>
                    <div className="font-display mt-1 text-base font-bold text-[#f7e5a9]">
                      +{entry.colorBonusPoints}{' '}
                      <span className="font-sans text-[11px] font-normal text-[#9ec1e6]">
                        ({entry.completedColors.length}&times;10)
                      </span>
                    </div>
                    {entry.completedColors.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {entry.completedColors.map((c) => (
                          <img
                            key={c}
                            src={TILE_METADATA[c].textureUrl}
                            alt={c}
                            className="h-3.5 w-3.5 rounded-sm border border-[#f5d061]/60"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Action Buttons */}
        <div className="flex flex-col gap-2.5 border-t border-[#d4af37]/35 bg-[#071527]/95 px-5 py-4 sm:flex-row">
          {onOpenSetupMenu && (
            <button
              type="button"
              onClick={() => {
                soundManager.playTilePickup(1);
                onOpenSetupMenu();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#d4af37]/50 bg-[#0e2647] py-3 text-xs font-bold uppercase tracking-wider text-[#f7e5a9] transition hover:border-[#f5d061] hover:bg-[#153663]"
            >
              <Settings className="h-4 w-4" /> Change Mode / Settings
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundManager.playTilePlace(1);
              onPlayAgain();
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#f5d061] bg-gradient-to-r from-[#f5d061] via-[#e2b93b] to-[#c79519] py-3 font-display text-sm font-extrabold uppercase tracking-wider text-[#071527] shadow-[0_8px_25px_rgba(245,208,97,0.35)] transition hover:brightness-110"
          >
            <RotateCcw className="h-4 w-4" /> Play Again / Rematch
          </button>
        </div>
      </div>
    </dialog>
  );
};
