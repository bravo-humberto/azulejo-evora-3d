import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X,
  Search,
  BookOpen,
  Sparkles,
  Grid,
  Layers,
  Award,
  AlertTriangle,
  Compass,
} from 'lucide-react';
import {
  ALL_TILE_COLORS,
  FLOOR_PENALTIES,
  STANDARD_WALL_LAYOUT,
  TILE_METADATA,
} from '../../types/game';

export interface RulebookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RuleSection {
  id: string;
  title: string;
  category: string;
  keywords: string;
  summary: string;
  bullets: string[];
}

const RULEBOOK_SECTIONS: readonly RuleSection[] = [
  {
    id: 'setup',
    title: '1. Royal Palace Setup & Components',
    category: 'Setup',
    keywords:
      'setup factories bag 100 tiles 20 per color 2 3 4 players 5 7 9 factory displays first player token',
    summary:
      'Inspired by King Manuel I of Portugal’s visit to the Alhambra and the Royal Palace of Évora, players compete as master ceramic artisans tiling their 5×5 Palace Wall.',
    bullets: [
      '100 Glazed Resin Azulejo Tiles (20 each of Royal Cobalt, Saffron Gold, Terracotta Coral, Onyx Moorish, and Sky Starburst) are placed inside the Linen Drawstring Bag.',
      'Factory Displays depend on player count: 2 Players = 5 Factories (20 tiles), 3 Players = 7 Factories (28 tiles), 4 Players = 9 Factories (36 tiles).',
      'At the start of each round, 4 tiles are drawn randomly from the Linen Bag onto each Factory Display, and the "1st Player" token is placed in the Center Pool.',
    ],
  },
  {
    id: 'factory-offer',
    title: '2. Phase I: The Factory Offer (Drafting)',
    category: 'Drafting',
    keywords:
      'factory offer draft pick color center pool first player token pattern lines right to left',
    summary:
      'Starting with the holder of the 1st Player token, players take turns drafting all tiles of a single color from either one Factory Display or the Center Pool.',
    bullets: [
      'Option A — Pick from a Factory Display: Take ALL tiles of one color from that coaster. Any remaining tiles of other colors on that coaster slide immediately into the Center Pool.',
      'Option B — Pick from the Center Pool: Take ALL tiles of one color currently in the Center Pool. If you are the very first player this round to take from the Center, you MUST also take the "1st Player" token onto the leftmost open slot of your Floor Line.',
      'Placement into Pattern Lines: Add your drafted tiles right-to-left into one of your 5 Pattern Lines (Row 1 holds 1 tile; Row 5 holds 5 tiles).',
      'Color Restriction: A Pattern Line may only hold tiles of the same color. Furthermore, you CANNOT place a color into a Pattern Line if that corresponding horizontal row of your 5×5 Wall already contains a tile of that color.',
      'Phase I continues until EVERY Factory Display and the Center Pool are completely empty.',
    ],
  },
  {
    id: 'wall-tiling',
    title: '3. Phase II: Wall-Tiling & Adjacency Chains',
    category: 'Scoring',
    keywords:
      'wall tiling slide right adjacency chain horizontal vertical combo points box lid incomplete lines',
    summary:
      'Once the market is empty, each player scores their Pattern Lines from top (Row 1) to bottom (Row 5) by sliding completed rows onto their 5×5 Wall.',
    bullets: [
      'Completed Pattern Lines: If all slots in a Pattern Line are full, slide the rightmost tile across onto the matching color space in that row of your Wall. The remaining tiles from that Pattern Line are placed into the Box Lid.',
      'Incomplete Pattern Lines: Any Pattern Line that still has empty spaces does NOT slide this round—its tiles remain on your Pattern Line for future rounds.',
      'Isolated Tile Scoring: If the newly placed Wall tile has no orthogonally adjacent tiles (up, down, left, or right), you score +1 point immediately.',
      'Adjacency Chain Combos: If the placed tile touches existing tiles horizontally, count all orthogonally connected tiles in that horizontal line (including the new tile) and score 1 point per tile. If it ALSO touches tiles vertically, count all connected tiles in that vertical column (including the new tile again!) and add both totals together!',
    ],
  },
  {
    id: 'floor-penalties',
    title: '4. Floor Line Penalties & Round Cleanup',
    category: 'Penalties',
    keywords:
      'floor line overflow penalty -1 -2 -3 zero minimum next round refill bag box lid',
    summary:
      'Any tiles that overflow a Pattern Line—or that a player chooses (or is forced) to dump directly—occupy the 7 Floor Line slots at the bottom of the board.',
    bullets: [
      'The 7 Floor Line slots apply cumulative deductions at the end of the Wall-Tiling phase: [-1, -1, -2, -2, -2, -3, -3] (up to -14 points maximum if all 7 slots are filled).',
      'The "1st Player" token also occupies a Floor Line slot and incurs that slot’s penalty!',
      'A player’s score can never drop below 0 points.',
      'After deducting Floor penalties, all tiles on the Floor Line are moved to the Box Lid (except the 1st Player token, which stays with that player to start the next round).',
      'If the Linen Bag runs empty while refilling Factories for the next round, shuffle all tiles from the Box Lid back into the Linen Bag.',
    ],
  },
  {
    id: 'end-bonuses',
    title: '5. End of Game & Royal Bonuses',
    category: 'Endgame',
    keywords:
      'end of game horizontal row 5 tiles +2 row +7 column +10 color set tie breaker',
    summary:
      'The game ends immediately after the Wall-Tiling phase of the round in which at least one player completes a horizontal row of 5 tiles on their Wall.',
    bullets: [
      'Horizontal Row Bonus (+2 pts): Score +2 bonus points for each complete horizontal line of 5 consecutive tiles on your Wall.',
      'Vertical Column Bonus (+7 pts): Score +7 bonus points for each complete vertical column of 5 consecutive tiles on your Wall.',
      'Complete Color Set Bonus (+10 pts): Score +10 bonus points for each color of which you have placed all 5 tiles onto your Wall.',
      'Tie-Breaker: If tied on final score, the tied player with the most complete horizontal rows wins! If still tied, victory is shared.',
    ],
  },
  {
    id: 'gray-variant',
    title: '6. Variant Mode: The Uncolored Gray Wall',
    category: 'Variants',
    keywords:
      'gray wall variant custom column vertical uniqueness strategic mode',
    summary:
      'For seasoned artisans, the Gray Wall side removes pre-printed color slots on the 5×5 Wall, allowing you to choose which column each completed Pattern Line slides into!',
    bullets: [
      'During Wall-Tiling on the Gray Wall, when a Pattern Line is complete, you may place that tile into ANY open space in that same horizontal row.',
      'Mandatory Uniqueness Rule: No horizontal row AND no vertical column on your 5×5 Wall may ever contain more than one tile of the same color!',
      'If a completed Pattern Line’s color cannot legally be placed in any open column of that row without violating column uniqueness, the tile must be placed onto the Floor Line instead.',
    ],
  },
];

export const RulebookModal: React.FC<RulebookModalProps> = ({
  isOpen,
  onClose,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredSections = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return RULEBOOK_SECTIONS;
    return RULEBOOK_SECTIONS.filter(
      (sec) =>
        sec.title.toLowerCase().includes(q) ||
        sec.summary.toLowerCase().includes(q) ||
        sec.keywords.toLowerCase().includes(q) ||
        sec.bullets.some((b) => b.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="rulebook-modal-title"
      className="w-full max-w-2xl rounded-2xl bg-transparent p-0 text-[#fdfbf7] shadow-2xl"
    >
      <div className="relative flex max-h-[88dvh] flex-col overflow-hidden rounded-2xl border-2 border-[#d4af37]/75 bg-gradient-to-b from-[#0f294a] via-[#0b1f3a] to-[#071527] shadow-[0_24px_64px_rgba(0,0,0,0.88)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/30 bg-[#071527]/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af37]/60 bg-[#d4af37]/20 text-[#f5d061]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="rulebook-modal-title"
                className="font-display text-lg font-bold tracking-wide text-[#f7e5a9]"
              >
                Codex of Évora &bull; Official Rulebook
              </h2>
              <p className="text-xs text-[#9ec1e6]">
                Complete Rules, Adjacency Diagrams &amp; Gray Wall Variant
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Rulebook"
            className="rounded-lg border border-[#d4af37]/30 bg-[#133159]/60 p-2 text-[#e2c778] transition hover:border-[#d4af37] hover:bg-[#1b4379] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="border-b border-[#d4af37]/20 bg-[#0a1e38] px-5 py-3">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#9ec1e6]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rules (e.g., 'adjacency', 'floor', 'bonus', 'gray wall', 'first player')..."
              className="w-full rounded-xl border border-[#d4af37]/35 bg-[#071527] py-2 pl-10 pr-4 text-xs text-white placeholder-[#7ca1c9] focus:border-[#f5d061] focus:outline-none"
            />
          </div>
        </div>

        {/* Scrollable Rulebook Content */}
        <div className="custom-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Illustrated 5 Royal Tile Colors Banner */}
          {!searchQuery && (
            <div className="rounded-xl border border-[#d4af37]/30 bg-[#091c36] p-3.5">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#f3d27a]">
                <Sparkles className="h-3.5 w-3.5 text-[#f5d061]" />
                The 5 Royal Azulejo Motifs (20 Tiles Each)
              </div>
              <div className="grid grid-cols-5 gap-2">
                {ALL_TILE_COLORS.map((c) => {
                  const meta = TILE_METADATA[c];
                  return (
                    <div
                      key={c}
                      className="flex flex-col items-center rounded-lg border border-[#d4af37]/25 bg-[#071527] p-2 text-center"
                    >
                      <img
                        src={meta.textureUrl}
                        alt={meta.name}
                        className="h-10 w-10 rounded-md border border-[#f5d061]/60 object-cover shadow"
                      />
                      <span className="mt-1.5 text-[11px] font-bold text-[#fdfbf7]">
                        {meta.name}
                      </span>
                      <span className="text-[9px] italic text-[#9ec1e6]">
                        {meta.portugueseName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rule Sections */}
          {filteredSections.length === 0 ? (
            <div className="rounded-xl border border-[#d4af37]/25 bg-[#091c36] p-8 text-center text-sm text-[#9ec1e6]">
              No rulebook entries matched &ldquo;{searchQuery}&rdquo;. Try searching for{' '}
              <span className="text-[#f5d061]">adjacency</span>,{' '}
              <span className="text-[#f5d061]">floor</span>, or{' '}
              <span className="text-[#f5d061]">bonus</span>.
            </div>
          ) : (
            filteredSections.map((sec) => (
              <section
                key={sec.id}
                className="rounded-xl border border-[#d4af37]/30 bg-[#0b213f]/90 p-4 shadow"
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <h3 className="font-display text-sm font-bold text-[#f7e5a9] sm:text-base">
                    {sec.title}
                  </h3>
                  <span className="rounded-full border border-[#d4af37]/40 bg-[#071527] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#f3d27a]">
                    {sec.category}
                  </span>
                </div>
                <p className="mb-2.5 text-xs leading-relaxed text-[#b8d4f2]">
                  {sec.summary}
                </p>
                <ul className="space-y-1.5 text-xs leading-relaxed text-[#e8f1fa]">
                  {sec.bullets.map((b, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f5d061]" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* Visual Adjacency Diagram inside Wall-Tiling section */}
                {sec.id === 'wall-tiling' && (
                  <div className="mt-3 rounded-xl border border-[#d4af37]/30 bg-[#07162b] p-3">
                    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#f5d061]">
                      <Grid className="h-3.5 w-3.5" /> Visual Example: Cross-Chain Adjacency Combo
                    </div>
                    <p className="text-[11px] text-[#9ec1e6]">
                      Suppose your newly slid tile lands at <strong>(Row 2, Col 3)</strong> where it connects to 2 existing tiles to its left (making a{' '}
                      <strong className="text-[#a8f0da]">3-tile horizontal chain = +3 pts</strong>) AND 1 existing tile directly above it (making a{' '}
                      <strong className="text-[#a8f0da]">2-tile vertical chain = +2 pts</strong>). You score{' '}
                      <strong className="text-[#f7e5a9]">3 + 2 = +5 points</strong> on that single placement!
                    </p>
                  </div>
                )}

                {/* Visual Floor Track inside Floor Penalties section */}
                {sec.id === 'floor-penalties' && (
                  <div className="mt-3 flex items-center justify-between gap-1 rounded-xl border border-[#d4af37]/25 bg-[#07162b] p-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#fca5a5]">
                      <AlertTriangle className="h-4 w-4" /> Floor Track:
                    </div>
                    <div className="flex gap-1.5">
                      {FLOOR_PENALTIES.map((p, i) => (
                        <span
                          key={i}
                          className="rounded border border-[#f87171]/40 bg-[#3b1219] px-2 py-0.5 text-xs font-bold text-[#fca5a5]"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Standard 5x5 Wall Reference Grid inside Setup section */}
                {sec.id === 'setup' && (
                  <div className="mt-3 flex flex-col items-center rounded-xl border border-[#d4af37]/25 bg-[#07162b] p-3">
                    <span className="mb-2 text-[11px] font-bold uppercase tracking-wider text-[#f3d27a]">
                      Official 5&times;5 Standard Palace Wall Latin-Square Layout
                    </span>
                    <div className="grid grid-cols-5 gap-1">
                      {STANDARD_WALL_LAYOUT.map((row, r) =>
                        row.map((colColor, c) => (
                          <img
                            key={`${r}-${c}`}
                            src={TILE_METADATA[colColor].textureUrl}
                            alt={colColor}
                            title={`Row ${r + 1}, Col ${c + 1}: ${TILE_METADATA[colColor].name}`}
                            className="h-7 w-7 rounded border border-[#d4af37]/40 object-cover"
                          />
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Bonus Reference Cards inside End Bonuses */}
                {sec.id === 'end-bonuses' && (
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg border border-[#d4af37]/30 bg-[#07162b] p-2">
                      <Layers className="mx-auto h-4 w-4 text-[#f5d061]" />
                      <div className="font-display mt-1 text-base font-bold text-[#f7e5a9]">
                        +2 Pts
                      </div>
                      <div className="text-[10px] text-[#9ec1e6]">
                        Horizontal Row of 5
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#d4af37]/30 bg-[#07162b] p-2">
                      <Compass className="mx-auto h-4 w-4 text-[#f5d061]" />
                      <div className="font-display mt-1 text-base font-bold text-[#f7e5a9]">
                        +7 Pts
                      </div>
                      <div className="text-[10px] text-[#9ec1e6]">
                        Vertical Column of 5
                      </div>
                    </div>
                    <div className="rounded-lg border border-[#d4af37]/30 bg-[#07162b] p-2">
                      <Award className="mx-auto h-4 w-4 text-[#f5d061]" />
                      <div className="font-display mt-1 text-base font-bold text-[#f7e5a9]">
                        +10 Pts
                      </div>
                      <div className="text-[10px] text-[#9ec1e6]">
                        All 5 of 1 Color
                      </div>
                    </div>
                  </div>
                )}
              </section>
            ))
          )}
        </div>
      </div>
    </dialog>
  );
};
