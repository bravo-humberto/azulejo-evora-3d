import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import {
  FLOOR_PENALTIES,
  TILE_METADATA,
  type TileColor,
} from '../../types/game';
import { soundManager } from '../../audio/soundManager';

export interface TutorialOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  initialStep?: number;
  onStepChange?: (stepIndex: number) => void;
}

interface TutorialStepDefinition {
  stepNumber: number;
  title: string;
  subtitle: string;
  targetZoneLabel: string;
  zonePositionClass: string;
  description: string;
  proTip: string;
  sampleColors: TileColor[];
}

const TUTORIAL_STEPS: readonly TutorialStepDefinition[] = [
  {
    stepNumber: 1,
    title: 'Step 1: The Factory Offer',
    subtitle: 'Drafting Royal Azulejos from the Coasters or Center Pool',
    targetZoneLabel: 'Center Zone (37% Market Area)',
    zonePositionClass: 'top-[22dvh]',
    description:
      'On your turn, tap all tiles of a single color from any terracotta Factory Display coaster — any remaining tiles on that coaster slide into the Center Pool. Alternatively, draft all tiles of one color directly from the Center Pool. The first player each round to draft from the Center also takes the "1st Player" token onto their Floor Line!',
    proTip:
      'Taking the "1st Player" token costs -1 point on your Floor Line, but guarantees you draft first in the next round.',
    sampleColors: ['blue', 'yellow', 'red'],
  },
  {
    stepNumber: 2,
    title: 'Step 2: Pattern Lines (Right-to-Left)',
    subtitle: 'Staging Tiles on Your Workshop Board',
    targetZoneLabel: 'Bottom-Left Zone (Pattern Lines 1–5)',
    zonePositionClass: 'bottom-[12dvh]',
    description:
      'Immediately place all drafted tiles right-to-left into one of your 5 Pattern Lines (capacities 1 to 5). Each Pattern Line can hold only one color at a time. Rule of the Palace: You may never place a color into a Pattern Line if that corresponding row on your 5×5 Wall already has a tile of that color!',
    proTip:
      'Rows 1 and 2 fill quickly every round for steady points, while Rows 4 and 5 require planning across multiple turns.',
    sampleColors: ['teal', 'teal', 'teal'],
  },
  {
    stepNumber: 3,
    title: 'Step 3: Floor Line Penalties',
    subtitle: 'Managing Overflow & Unplaceable Tiles',
    targetZoneLabel: 'Bottom Strip (7 Floor Penalty Slots)',
    zonePositionClass: 'bottom-[8dvh]',
    description:
      'Any drafted tiles that exceed your chosen Pattern Line’s capacity—or tiles you intentionally choose not to place in a row—fall onto your 7 Floor Line slots from left to right. At the end of the round, Floor slots deduct points (-1, -1, -2, -2, -2, -3, -3), though your total score never drops below 0.',
    proTip:
      'Before drafting a huge pile of 4 or 5 tiles from the Center, verify how many slots remain in your target Pattern Line!',
    sampleColors: ['red', 'black'],
  },
  {
    stepNumber: 4,
    title: 'Step 4: Wall-Tiling & Adjacency Chains',
    subtitle: 'Sliding Completed Lines & Scoring Multi-Tile Combos',
    targetZoneLabel: 'Bottom-Right Zone (5×5 Palace Wall)',
    zonePositionClass: 'bottom-[14dvh]',
    description:
      'When all Factories and the Center Pool are empty, the Wall-Tiling phase begins! Inspect your 5 Pattern Lines from top to bottom: each completely full line slides its rightmost tile across to the matching spot on your 5×5 Wall (remaining tiles in that line go to the Box Lid). Incomplete lines stay for next round.',
    proTip:
      'An isolated tile scores +1 pt. If it connects to a horizontal chain, score all tiles in that row chain; if it ALSO connects vertically, score BOTH chains!',
    sampleColors: ['blue', 'yellow', 'teal', 'black'],
  },
  {
    stepNumber: 5,
    title: 'Step 5: End of Game & Royal Bonuses',
    subtitle: 'Triggering the Final Round & High-Value Multipliers',
    targetZoneLabel: 'Full Palace Wall & Scoreboard',
    zonePositionClass: 'top-[19dvh]',
    description:
      'The match concludes at the end of the round in which at least one player completes a full horizontal row of 5 tiles on their Wall. After round scoring, Royal End-of-Game Bonuses are awarded: +2 points per complete horizontal row, +7 points per complete vertical column, and +10 points per complete 5-tile color set!',
    proTip:
      'Ties are broken in favor of the player with the most complete horizontal rows on their Wall.',
    sampleColors: ['blue', 'yellow', 'red', 'black', 'teal'],
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  isOpen,
  onClose,
  initialStep = 0,
  onStepChange,
}) => {
  const [stepIdx, setStepIdx] = useState<number>(initialStep);

  if (!isOpen) return null;

  const current = TUTORIAL_STEPS[stepIdx] ?? TUTORIAL_STEPS[0];

  const handleGoToStep = (nextIdx: number) => {
    const clamped = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, nextIdx));
    soundManager.playTilePickup(1);
    setStepIdx(clamped);
    onStepChange?.(clamped);
  };

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="tutorial-coach-title"
      className="pointer-events-none fixed inset-0 z-40 flex flex-col justify-between p-3 sm:p-5"
    >
      {/* Subtle Spotlight Dimmer with Pass-Through Touch */}
      <div className="pointer-events-none absolute inset-0 bg-[#051020]/45 backdrop-blur-[1px]" />

      {/* Top Coach Banner */}
      <div className="pointer-events-auto relative z-10 mx-auto flex w-full max-w-lg items-center justify-between rounded-xl border border-[#f5d061]/65 bg-[#081930]/95 px-4 py-2 text-xs text-[#f7e5a9] shadow-lg">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-[#f5d061]" />
          <span className="font-display font-bold tracking-wider uppercase">
            Royal Artisan Coach &bull; Step {current.stepNumber} of{' '}
            {TUTORIAL_STEPS.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1 rounded-lg border border-[#d4af37]/30 bg-[#122e54] px-2 py-1 text-[11px] font-semibold text-[#e2c778] transition hover:border-[#f5d061] hover:text-white"
        >
          <span>Exit Coach</span>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Interactive Coach Card */}
      <div className="pointer-events-auto relative z-10 mx-auto my-auto w-full max-w-lg rounded-2xl border-2 border-[#f5d061]/80 bg-gradient-to-b from-[#102a4e]/98 via-[#0b203c]/98 to-[#071529]/98 p-4 sm:p-5 text-[#fdfbf7] shadow-[0_20px_60px_rgba(0,0,0,0.85)]">
        {/* Target Zone Pill */}
        <div className="mb-2 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f5d061]/50 bg-[#f5d061]/15 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#f5d061]">
            <Sparkles className="h-3 w-3" /> {current.targetZoneLabel}
          </span>

          {/* Step Dots */}
          <div className="flex items-center gap-1.5">
            {TUTORIAL_STEPS.map((s, idx) => (
              <button
                key={s.stepNumber}
                type="button"
                onClick={() => handleGoToStep(idx)}
                aria-label={`Go to tutorial step ${s.stepNumber}`}
                className={`h-2.5 rounded-full transition-all ${
                  idx === stepIdx
                    ? 'w-6 bg-[#f5d061]'
                    : 'w-2.5 bg-[#d4af37]/35 hover:bg-[#d4af37]/65'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Title & Subtitle */}
        <h3
          id="tutorial-coach-title"
          className="font-display text-lg font-bold text-[#f7e5a9] sm:text-xl"
        >
          {current.title}
        </h3>
        <p className="text-xs font-medium text-[#9ec1e6]">{current.subtitle}</p>

        {/* Visual Mini Illustration per Step */}
        <div className="my-3 rounded-xl border border-[#d4af37]/30 bg-[#07162b]/90 p-3">
          {stepIdx === 0 && (
            <div className="flex items-center justify-around gap-2">
              <div className="flex flex-col items-center">
                <div className="grid grid-cols-2 gap-1 rounded-full border-2 border-[#c87d55] bg-[#8c4a27]/60 p-2 shadow-inner">
                  {(['blue', 'blue', 'yellow', 'red'] as TileColor[]).map(
                    (c, i) => (
                      <img
                        key={i}
                        src={TILE_METADATA[c].textureUrl}
                        alt={c}
                        className={`h-6 w-6 rounded-sm object-cover ${
                          c === 'blue' ? 'ring-2 ring-[#f5d061]' : 'opacity-60'
                        }`}
                      />
                    )
                  )}
                </div>
                <span className="mt-1 text-[10px] text-[#f3d27a]">
                  Pick Both Blues
                </span>
              </div>
              <ArrowRight className="h-4 w-4 text-[#f5d061]" />
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-1 rounded-xl border border-[#d4af37]/40 bg-[#0d2647] px-3 py-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-[#f5d061] font-display text-[10px] font-black text-[#08182e]">
                    1st
                  </span>
                  <img
                    src={TILE_METADATA.yellow.textureUrl}
                    alt="yellow"
                    className="h-6 w-6 rounded-sm"
                  />
                  <img
                    src={TILE_METADATA.red.textureUrl}
                    alt="red"
                    className="h-6 w-6 rounded-sm"
                  />
                </div>
                <span className="mt-1 text-[10px] text-[#9ec1e6]">
                  Rest Slide to Center
                </span>
              </div>
            </div>
          )}

          {stepIdx === 1 && (
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-[#9ec1e6]">
                  Row 3 (Cap 3):
                </span>
                <div className="h-7 w-7 rounded border border-dashed border-[#8eb2d9]/40 bg-[#0b213f]" />
                <img
                  src={TILE_METADATA.teal.textureUrl}
                  alt="teal"
                  className="h-7 w-7 rounded border border-[#f5d061]"
                />
                <img
                  src={TILE_METADATA.teal.textureUrl}
                  alt="teal"
                  className="h-7 w-7 rounded border border-[#f5d061]"
                />
              </div>
              <span className="text-xs font-semibold text-[#f5d061]">
                &larr; Fills Right to Left
              </span>
            </div>
          )}

          {stepIdx === 2 && (
            <div className="flex items-center justify-center gap-1.5">
              {FLOOR_PENALTIES.map((pen, i) => (
                <div
                  key={i}
                  className="flex flex-col items-center rounded border border-[#f87171]/40 bg-[#2a1215]/70 px-2 py-1"
                >
                  <span className="text-[10px] font-bold text-[#fca5a5]">
                    {pen}
                  </span>
                  <span className="text-[9px] text-[#9ec1e6]">#{i + 1}</span>
                </div>
              ))}
            </div>
          )}

          {stepIdx === 3 && (
            <div className="flex items-center justify-around text-xs">
              <div className="rounded-lg border border-[#d4af37]/30 bg-[#0b213f] px-3 py-1.5 text-center">
                <div className="font-bold text-[#f7e5a9]">Horizontal Chain</div>
                <div className="text-[11px] text-[#a8f0da]">
                  3 linked tiles = <strong>+3 pts</strong>
                </div>
              </div>
              <span className="font-bold text-[#f5d061]">+</span>
              <div className="rounded-lg border border-[#d4af37]/30 bg-[#0b213f] px-3 py-1.5 text-center">
                <div className="font-bold text-[#f7e5a9]">Vertical Chain</div>
                <div className="text-[11px] text-[#a8f0da]">
                  2 linked tiles = <strong>+2 pts</strong>
                </div>
              </div>
              <span className="font-bold text-[#f5d061]">=</span>
              <div className="rounded-lg border border-[#f5d061] bg-[#f5d061]/20 px-3 py-1.5 text-center font-display font-bold text-[#f7e5a9]">
                +5 pts!
              </div>
            </div>
          )}

          {stepIdx === 4 && (
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg border border-[#d4af37]/30 bg-[#0b213f] p-2">
                <div className="font-display text-sm font-bold text-[#f5d061]">
                  +2 Pts
                </div>
                <div className="text-[10px] text-[#9ec1e6]">Each Full Row</div>
              </div>
              <div className="rounded-lg border border-[#d4af37]/30 bg-[#0b213f] p-2">
                <div className="font-display text-sm font-bold text-[#f5d061]">
                  +7 Pts
                </div>
                <div className="text-[10px] text-[#9ec1e6]">Each Full Column</div>
              </div>
              <div className="rounded-lg border border-[#d4af37]/30 bg-[#0b213f] p-2">
                <div className="font-display text-sm font-bold text-[#f5d061]">
                  +10 Pts
                </div>
                <div className="text-[10px] text-[#9ec1e6]">All 5 of a Color</div>
              </div>
            </div>
          )}
        </div>

        {/* Main Explanation */}
        <p className="text-xs leading-relaxed text-[#e6f0fa] sm:text-sm">
          {current.description}
        </p>

        {/* Strategy Tip */}
        <div className="mt-3 rounded-xl border border-[#f5d061]/35 bg-[#f5d061]/10 px-3 py-2 text-xs text-[#f7e5a9]">
          <strong className="text-[#f5d061]">Royal Tip:</strong> {current.proTip}
        </div>

        {/* Navigation Footer */}
        <div className="mt-4 flex items-center justify-between border-t border-[#d4af37]/25 pt-3">
          <button
            type="button"
            disabled={stepIdx === 0}
            onClick={() => handleGoToStep(stepIdx - 1)}
            className="flex items-center gap-1 rounded-xl border border-[#d4af37]/40 bg-[#0b2241] px-3.5 py-2 text-xs font-semibold text-[#e2c778] transition hover:border-[#f5d061] hover:text-white disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" /> Previous
          </button>

          {stepIdx < TUTORIAL_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => handleGoToStep(stepIdx + 1)}
              className="flex items-center gap-1 rounded-xl border border-[#f5d061] bg-gradient-to-r from-[#d4af37] to-[#b5851b] px-4 py-2 text-xs font-bold text-[#071527] shadow transition hover:brightness-110"
            >
              Next Step <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                soundManager.playTilePlace(1);
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-[#f5d061] bg-gradient-to-r from-[#f5d061] to-[#d4af37] px-4 py-2 text-xs font-extrabold text-[#071527] shadow-lg transition hover:brightness-110"
            >
              <CheckCircle2 className="h-4 w-4" /> Begin Royal Match
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
