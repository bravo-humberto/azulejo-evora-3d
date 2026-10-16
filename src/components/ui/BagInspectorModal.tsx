import React, { useEffect, useRef } from 'react';
import { X, Sparkles, Package, Archive, Layers } from 'lucide-react';
import {
  ALL_TILE_COLORS,
  TILE_METADATA,
  type GameState,
  type TileColor,
} from '../../types/game';

declare module 'react' {
  interface DialogHTMLAttributes<T> {
    closedby?: 'any' | 'closerequest' | 'none';
  }
}

export interface BagInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
}

/**
 * Computes hypergeometric probability P(X >= 1) = 1 - C(N - K, n) / C(N, n)
 * of drawing at least 1 tile of a given color when drawing `drawCount` tiles from `poolSize`.
 */
function computeAtLeastOneProbability(
  poolSize: number,
  colorCount: number,
  drawCount: number
): number {
  if (colorCount <= 0 || poolSize <= 0 || drawCount <= 0) return 0;
  if (drawCount >= poolSize) return 100;
  if (poolSize - colorCount < drawCount) return 100;

  let probZero = 1;
  for (let i = 0; i < drawCount; i++) {
    probZero *= (poolSize - colorCount - i) / (poolSize - i);
  }
  return Math.max(0, Math.min(100, (1 - probZero) * 100));
}

export const BagInspectorModal: React.FC<BagInspectorModalProps> = ({
  isOpen,
  onClose,
  gameState,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

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

    // Fallback for browsers without declarative closedby="any" support
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

  // Count tiles by location for each of the 5 colors (20 tiles per color = 100 total)
  const bagCounts: Record<TileColor, number> = {
    blue: 0,
    yellow: 0,
    red: 0,
    black: 0,
    teal: 0,
  };
  const lidCounts: Record<TileColor, number> = {
    blue: 0,
    yellow: 0,
    red: 0,
    black: 0,
    teal: 0,
  };
  const marketCounts: Record<TileColor, number> = {
    blue: 0,
    yellow: 0,
    red: 0,
    black: 0,
    teal: 0,
  };
  const boardCounts: Record<TileColor, number> = {
    blue: 0,
    yellow: 0,
    red: 0,
    black: 0,
    teal: 0,
  };

  for (const c of gameState.bag) {
    bagCounts[c] = (bagCounts[c] ?? 0) + 1;
  }
  for (const c of gameState.boxLid) {
    lidCounts[c] = (lidCounts[c] ?? 0) + 1;
  }
  for (const f of gameState.factories) {
    for (const c of f.tiles) {
      marketCounts[c] = (marketCounts[c] ?? 0) + 1;
    }
  }
  for (const c of gameState.center.tiles) {
    marketCounts[c] = (marketCounts[c] ?? 0) + 1;
  }
  for (const p of gameState.players) {
    for (const line of p.patternLines) {
      if (line.color && line.count > 0) {
        boardCounts[line.color] += line.count;
      }
    }
    for (const row of p.wall) {
      for (const cell of row) {
        if (cell.filledColor) {
          boardCounts[cell.filledColor] += 1;
        }
      }
    }
    for (const token of p.floorLine) {
      if (token !== 'first-player') {
        boardCounts[token] += 1;
      }
    }
  }

  const totalBag = gameState.bag.length;
  const totalLid = gameState.boxLid.length;
  const tilesPerRefill = gameState.factories.length * 4;

  // If the bag has fewer tiles than needed for a full factory refill, the box lid will also be recycled
  const effectivePoolSize =
    totalBag >= tilesPerRefill ? totalBag : totalBag + totalLid;

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="bag-inspector-title"
      className="w-full max-w-lg rounded-2xl bg-transparent p-0 text-[#fdfbf7] shadow-2xl"
    >
      <div className="relative flex max-h-[86dvh] flex-col overflow-hidden rounded-2xl border-2 border-[#d4af37]/70 bg-gradient-to-b from-[#0f294a] via-[#0b203b] to-[#08172b] shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        {/* Decorative Gold Filigree Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/30 bg-[#071527]/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af37]/60 bg-gradient-to-br from-[#d4af37]/25 to-[#b5851b]/10 text-[#f5d061] shadow-inner">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="bag-inspector-title"
                className="font-display text-lg font-bold tracking-wide text-[#f7e5a9]"
              >
                Linen Tile Bag &amp; Box Lid
              </h2>
              <p className="text-xs text-[#9ec1e6]">
                100 Royal Ceramic Azulejos &bull; 20 per Color
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Tile Bag Inspector"
            className="rounded-lg border border-[#d4af37]/30 bg-[#133159]/60 p-2 text-[#e2c778] transition hover:border-[#d4af37] hover:bg-[#1b4379] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Summary Counters Strip */}
        <div className="grid grid-cols-3 gap-2.5 border-b border-[#d4af37]/20 bg-[#0b2240]/70 px-5 py-3 text-center">
          <div className="rounded-xl border border-[#d4af37]/30 bg-[#07182e]/80 px-3 py-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#f3d27a]">
              <Package className="h-3.5 w-3.5" /> Linen Bag
            </div>
            <div className="font-display mt-0.5 text-2xl font-bold text-white">
              {totalBag}
            </div>
            <div className="text-[10px] text-[#8eb2d9]">Ready to draw</div>
          </div>

          <div className="rounded-xl border border-[#d4af37]/30 bg-[#07182e]/80 px-3 py-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#c5d9ed]">
              <Archive className="h-3.5 w-3.5" /> Box Lid
            </div>
            <div className="font-display mt-0.5 text-2xl font-bold text-[#e2ecf7]">
              {totalLid}
            </div>
            <div className="text-[10px] text-[#8eb2d9]">Recycles when empty</div>
          </div>

          <div className="rounded-xl border border-[#d4af37]/30 bg-[#07182e]/80 px-3 py-2">
            <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#7fd8be]">
              <Layers className="h-3.5 w-3.5" /> Next Refill
            </div>
            <div className="font-display mt-0.5 text-2xl font-bold text-[#a8f0da]">
              {tilesPerRefill}
            </div>
            <div className="text-[10px] text-[#8eb2d9]">
              {gameState.factories.length} Factories &times; 4
            </div>
          </div>
        </div>

        {/* Per-Color Breakdown Table */}
        <div className="custom-scroll flex-1 space-y-2.5 overflow-y-auto px-5 py-4">
          {ALL_TILE_COLORS.map((color) => {
            const meta = TILE_METADATA[color];
            const inBag = bagCounts[color];
            const inLid = lidCounts[color];
            const inMarket = marketCounts[color];
            const onBoards = boardCounts[color];

            const effectiveColorCount =
              totalBag >= tilesPerRefill ? inBag : inBag + inLid;

            const singleDrawPct =
              totalBag > 0
                ? (inBag / totalBag) * 100
                : effectivePoolSize > 0
                  ? (effectiveColorCount / effectivePoolSize) * 100
                  : 0;

            const refillAtLeastOnePct =
              totalBag >= tilesPerRefill
                ? computeAtLeastOneProbability(totalBag, inBag, tilesPerRefill)
                : computeAtLeastOneProbability(
                    effectivePoolSize,
                    effectiveColorCount,
                    Math.min(tilesPerRefill, effectivePoolSize)
                  );

            return (
              <div
                key={color}
                className="rounded-xl border border-[#d4af37]/25 bg-[#0c2342]/90 p-3 shadow-md transition hover:border-[#d4af37]/50"
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Tile Texture Thumbnail & Title */}
                  <div className="flex items-center gap-3">
                    <div
                      className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 border-[#f5d061]/60 shadow-md"
                      style={{ backgroundColor: meta.primaryHex }}
                    >
                      <img
                        src={meta.textureUrl}
                        alt={meta.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-display text-sm font-bold text-[#fdfbf7]">
                        {meta.name}
                      </div>
                      <div className="text-[11px] italic text-[#f3d27a]/90">
                        {meta.portugueseName}
                      </div>
                    </div>
                  </div>

                  {/* Draw Probability Pill */}
                  <div className="text-right">
                    <div className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#07162c] px-2.5 py-0.5 text-xs font-bold text-[#f7e5a9]">
                      <Sparkles className="h-3 w-3 text-[#f5d061]" />
                      {refillAtLeastOnePct.toFixed(1)}% in next refill
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#9ec1e6]">
                      Single tile draw: {singleDrawPct.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Progress Bar of Bag + Lid */}
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-[#061224]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.min(100, (inBag / 20) * 100)}%`,
                      backgroundColor: meta.primaryHex,
                    }}
                  />
                </div>

                {/* 4-Location Exact Tile Distribution */}
                <div className="mt-2.5 grid grid-cols-4 gap-1.5 text-center text-xs">
                  <div className="rounded-lg bg-[#081931] px-2 py-1">
                    <span className="block text-[10px] uppercase text-[#8eb2d9]">
                      In Bag
                    </span>
                    <span className="font-bold text-[#f7e5a9]">{inBag}</span>
                  </div>
                  <div className="rounded-lg bg-[#081931] px-2 py-1">
                    <span className="block text-[10px] uppercase text-[#8eb2d9]">
                      Box Lid
                    </span>
                    <span className="font-bold text-white">{inLid}</span>
                  </div>
                  <div className="rounded-lg bg-[#081931] px-2 py-1">
                    <span className="block text-[10px] uppercase text-[#8eb2d9]">
                      Market
                    </span>
                    <span className="font-bold text-[#90caf9]">{inMarket}</span>
                  </div>
                  <div className="rounded-lg bg-[#081931] px-2 py-1">
                    <span className="block text-[10px] uppercase text-[#8eb2d9]">
                      Boards
                    </span>
                    <span className="font-bold text-[#a8f0da]">{onBoards}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer note */}
        <div className="border-t border-[#d4af37]/25 bg-[#071527]/90 px-5 py-3 text-center text-xs text-[#9ec1e6]">
          When the Linen Bag runs out of tiles during a Factory refill, all tiles in the{' '}
          <span className="font-semibold text-[#f3d27a]">Box Lid</span> are automatically
          shuffled back into the bag.
        </div>
      </div>
    </dialog>
  );
};
