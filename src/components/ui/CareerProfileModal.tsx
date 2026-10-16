import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Trophy,
  Crown,
  Calendar,
  Flame,
  Award,
  Check,
  Copy,
  Play,
  Sparkles,
  History,
  Smartphone,
  Share2,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import {
  ACHIEVEMENTS,
  CareerStats,
  getDailyChallengeInfo,
  DailyChallengeInfo,
} from '../../career/careerManager';
import { soundManager } from '../../audio/soundManager';

export interface CareerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  careerStats: CareerStats;
  onStartDailyChallenge: (dailyInfo: DailyChallengeInfo) => void;
  publicAppUrl?: string;
}

export const CareerProfileModal: React.FC<CareerProfileModalProps> = ({
  isOpen,
  onClose,
  careerStats,
  onStartDailyChallenge,
  publicAppUrl,
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [activeTab, setActiveTab] = useState<
    'daily' | 'achievements' | 'history' | 'mobile-qr'
  >('daily');
  const [copiedDailyShare, setCopiedDailyShare] = useState(false);
  const [copiedAppUrl, setCopiedAppUrl] = useState(false);

  const dailyInfo = getDailyChallengeInfo();
  const todayRecord = careerStats.dailyRecords[dailyInfo.dateKey];

  const shareUrl =
    publicAppUrl ||
    (typeof window !== 'undefined' ? window.location.href : 'https://bravo-humberto.github.io/azulejo-evora-3d/');

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

  // Modern Web Guidance fallback for browsers without native `closedby="any"`
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);

    let handleBackdropClick: ((e: MouseEvent) => void) | null = null;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isDialogContent) {
          dialog.close();
        }
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

  const winRate =
    careerStats.gamesPlayed > 0
      ? Math.round((careerStats.gamesWon / careerStats.gamesPlayed) * 100)
      : 0;

  const unlockedCount = Object.keys(careerStats.unlockedAchievementIds).length;

  const handleShareDailyResult = async () => {
    const medalEmoji =
      todayRecord?.medal === 'gold'
        ? '🥇 Gold'
        : todayRecord?.medal === 'silver'
          ? '🥈 Silver'
          : todayRecord?.medal === 'bronze'
            ? '🥉 Bronze'
            : '🎨 Played';
    const text = `🎨 Azul: Royal Palace of Évora 3D\n📅 Daily Royal Decree #${dailyInfo.dateKey} (Seed ${dailyInfo.seed})\n👑 Best Score: ${todayRecord?.bestScore ?? 0} pts (${medalEmoji})\nPlay at: ${shareUrl}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDailyShare(true);
      soundManager.playTilePickup(1);
      setTimeout(() => setCopiedDailyShare(false), 2500);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCopyAppUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedAppUrl(true);
      soundManager.playTilePickup(1);
      setTimeout(() => setCopiedAppUrl(false), 2500);
    } catch {
      // ignore
    }
  };

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="career-modal-title"
      className="w-full max-w-lg rounded-3xl bg-transparent p-0 text-[#FDFBF7] shadow-2xl"
    >
      <div className="flex max-h-[86dvh] flex-col overflow-hidden rounded-3xl border-2 border-[#D4AF37] bg-gradient-to-b from-[#0B2545] via-[#081C36] to-[#051224] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#D4AF37]/40 bg-[#07162c]/90 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#D4AF37] bg-[#133863] shadow-inner">
              <Trophy className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <div>
              <h2
                id="career-modal-title"
                className="font-display text-base font-extrabold tracking-wide text-[#FDFBF7]"
              >
                Royal Artisan Career &amp; Daily Decree
              </h2>
              <p className="text-[11px] text-[#D4AF37]">
                {unlockedCount}/{ACHIEVEMENTS.length} Honours Unlocked &bull;{' '}
                {careerStats.gamesPlayed} Matches Recorded
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="rounded-xl border border-[#D4AF37]/40 bg-[#102a4c] p-1.5 text-slate-200 hover:bg-[#183b68] cursor-pointer"
            aria-label="Close Career Profile"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="grid grid-cols-4 gap-1 border-b border-[#D4AF37]/30 bg-[#061326] p-1.5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => {
              setActiveTab('daily');
              soundManager.playTilePickup(1);
            }}
            className={`flex items-center justify-center gap-1 rounded-xl py-2 transition cursor-pointer ${
              activeTab === 'daily'
                ? 'bg-[#D4AF37] text-[#07162c] shadow'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            <span>Daily</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('achievements');
              soundManager.playTilePickup(1);
            }}
            className={`flex items-center justify-center gap-1 rounded-xl py-2 transition cursor-pointer ${
              activeTab === 'achievements'
                ? 'bg-[#D4AF37] text-[#07162c] shadow'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Honours</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              soundManager.playTilePickup(1);
            }}
            className={`flex items-center justify-center gap-1 rounded-xl py-2 transition cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#D4AF37] text-[#07162c] shadow'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>History</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('mobile-qr');
              soundManager.playTilePickup(1);
            }}
            className={`flex items-center justify-center gap-1 rounded-xl py-2 transition cursor-pointer ${
              activeTab === 'mobile-qr'
                ? 'bg-[#D4AF37] text-[#07162c] shadow'
                : 'text-slate-300 hover:bg-white/5'
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Phone QR</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="custom-scroll flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: DAILY SEEDED ROYAL CHALLENGE */}
          {activeTab === 'daily' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[#D4AF37]/60 bg-gradient-to-br from-[#112f57] to-[#081b36] p-4 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D4AF37]/60 bg-[#D4AF37]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#D4AF37]">
                    <Sparkles className="h-3 w-3" />
                    King Manuel&apos;s Daily Seeded Decree
                  </span>
                  <span className="font-mono text-xs font-bold text-sky-200">
                    {dailyInfo.dateKey}
                  </span>
                </div>

                <h3 className="mt-2 font-display text-lg font-extrabold text-white">
                  Palace Seed #{dailyInfo.seed}
                </h3>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  Every player worldwide receives the exact same deterministic
                  tile bag shuffle today. Compete against{' '}
                  <strong className="text-[#D4AF37]">{dailyInfo.aiName}</strong>{' '}
                  on the{' '}
                  <strong className="text-sky-200">
                    {dailyInfo.wallMode === 'gray'
                      ? 'Gray Variant Wall'
                      : 'Standard Royal Colored Wall'}
                  </strong>
                  .
                </p>

                {/* Target Medals */}
                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                  <div
                    className={`rounded-xl border p-2 ${
                      (todayRecord?.bestScore ?? 0) >= dailyInfo.bronzeTarget
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-white/10 bg-black/25'
                    }`}
                  >
                    <div className="text-base">🥉</div>
                    <div className="text-[11px] font-bold text-amber-200">
                      Bronze
                    </div>
                    <div className="text-xs font-extrabold text-white">
                      {dailyInfo.bronzeTarget}+ pts
                    </div>
                  </div>
                  <div
                    className={`rounded-xl border p-2 ${
                      (todayRecord?.bestScore ?? 0) >= dailyInfo.silverTarget
                        ? 'border-sky-300 bg-sky-400/20'
                        : 'border-white/10 bg-black/25'
                    }`}
                  >
                    <div className="text-base">🥈</div>
                    <div className="text-[11px] font-bold text-sky-200">
                      Silver
                    </div>
                    <div className="text-xs font-extrabold text-white">
                      {dailyInfo.silverTarget}+ pts
                    </div>
                  </div>
                  <div
                    className={`rounded-xl border p-2 ${
                      (todayRecord?.bestScore ?? 0) >= dailyInfo.goldTarget
                        ? 'border-[#D4AF37] bg-[#D4AF37]/25'
                        : 'border-white/10 bg-black/25'
                    }`}
                  >
                    <div className="text-base">🥇</div>
                    <div className="text-[11px] font-bold text-[#D4AF37]">
                      Royal Gold
                    </div>
                    <div className="text-xs font-extrabold text-white">
                      {dailyInfo.goldTarget}+ pts
                    </div>
                  </div>
                </div>

                {/* Today's personal best */}
                {todayRecord ? (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-400/40 bg-emerald-950/40 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <div className="text-xs">
                        <span className="font-bold text-emerald-200">
                          Completed Today!
                        </span>{' '}
                        <span className="text-slate-300">
                          Best: <strong>{todayRecord.bestScore} pts</strong> (
                          {todayRecord.attempts} run
                          {todayRecord.attempts === 1 ? '' : 's'})
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleShareDailyResult}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 px-2.5 py-1 text-[11px] font-bold text-emerald-100 cursor-pointer"
                    >
                      {copiedDailyShare ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="h-3 w-3" />
                          <span>Share</span>
                        </>
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                    You haven&apos;t attempted today&apos;s Daily Royal Decree
                    yet.
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    soundManager.playBagRefill();
                    onStartDailyChallenge(dailyInfo);
                    dialogRef.current?.close();
                  }}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#F3E5AB] to-[#D4AF37] py-3 text-sm font-extrabold text-[#07162c] shadow-lg transition active:scale-98 cursor-pointer"
                >
                  <Play className="h-4 w-4 fill-current" />
                  <span>
                    {todayRecord
                      ? "Replay Today's Seeded Challenge"
                      : "Start Today's Royal Challenge"}
                  </span>
                </button>
              </div>

              {/* Career KPI Overview Grid */}
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#091f3c] p-2.5">
                  <div className="text-lg font-extrabold text-[#D4AF37]">
                    {careerStats.highestScore}
                  </div>
                  <div className="text-[10px] text-slate-300">Best Score</div>
                </div>
                <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#091f3c] p-2.5">
                  <div className="text-lg font-extrabold text-emerald-300">
                    {winRate}%
                  </div>
                  <div className="text-[10px] text-slate-300">Win Rate</div>
                </div>
                <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#091f3c] p-2.5">
                  <div className="text-lg font-extrabold text-amber-300 flex items-center justify-center gap-0.5">
                    <Flame className="h-4 w-4 text-orange-400" />
                    {careerStats.bestWinStreak}
                  </div>
                  <div className="text-[10px] text-slate-300">Best Streak</div>
                </div>
                <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#091f3c] p-2.5">
                  <div className="text-lg font-extrabold text-sky-300">
                    {careerStats.hardAIVictories}
                  </div>
                  <div className="text-[10px] text-slate-300">Master Wins</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACHIEVEMENTS & HONOURS */}
          {activeTab === 'achievements' && (
            <div className="space-y-2.5">
              {ACHIEVEMENTS.map((ach) => {
                const unlockedAt = careerStats.unlockedAchievementIds[ach.id];
                const isUnlocked = Boolean(unlockedAt);
                return (
                  <div
                    key={ach.id}
                    className={`flex items-center gap-3 rounded-2xl border p-3 transition ${
                      isUnlocked
                        ? 'border-[#D4AF37]/70 bg-[#102d54]/90 shadow-md'
                        : 'border-white/10 bg-black/25 opacity-65'
                    }`}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 shadow-inner"
                      style={{
                        backgroundColor: isUnlocked ? ach.badgeColor : '#1e293b',
                      }}
                    >
                      {isUnlocked ? (
                        <Crown className="h-5 w-5 text-white" />
                      ) : (
                        <Lock className="h-4 w-4 text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-extrabold text-white truncate">
                          {ach.title}
                        </h4>
                        {isUnlocked && (
                          <span className="rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 px-2 py-0.5 text-[10px] font-bold text-[#D4AF37]">
                            Unlocked
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {ach.subtitle}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 3: MATCH HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-2.5">
              {careerStats.matchHistory.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/20 p-6 text-center text-xs text-slate-300">
                  Completed matches will be inscribed here in the Royal Palace
                  Archives.
                </div>
              ) : (
                careerStats.matchHistory.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-2xl border border-[#D4AF37]/30 bg-[#0c2342] p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded-full px-2 py-0.5 font-bold ${
                            m.didHumanWin
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                          }`}
                        >
                          {m.didHumanWin ? 'Victory' : 'Completed'}
                        </span>
                        {m.isDailyChallenge && (
                          <span className="rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/50 px-2 py-0.5 font-bold text-[#D4AF37]">
                            Daily #{m.dateKey}
                          </span>
                        )}
                        <span className="text-slate-400">
                          {m.wallMode === 'gray' ? 'Gray Wall' : 'Standard Wall'}
                        </span>
                      </div>
                      <span className="text-slate-400">{m.dateKey}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      {m.players.map((p) => (
                        <div
                          key={p.id}
                          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs ${
                            p.isWinner
                              ? 'bg-[#D4AF37]/20 border border-[#D4AF37]/60 text-white font-bold'
                              : 'bg-black/25 text-slate-300'
                          }`}
                        >
                          {p.isWinner && (
                            <Crown className="h-3 w-3 text-[#D4AF37]" />
                          )}
                          <span>{p.name}:</span>
                          <span className="font-extrabold">{p.score} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: PHONE QR CODE & PWA INSTALL */}
          {activeTab === 'mobile-qr' && (
            <div className="space-y-4 text-center">
              <div className="rounded-2xl border border-[#D4AF37]/60 bg-[#0d2647] p-4 space-y-3">
                <h3 className="font-display text-sm font-extrabold text-[#D4AF37]">
                  Scan to Play &amp; Install on Phone / Tablet
                </h3>
                <p className="text-xs text-slate-300">
                  Scan this QR code with your iPhone or Android camera to open
                  the live HTTPS Progressive Web App and add it to your Home
                  Screen for full-screen offline 3D play.
                </p>

                <div className="mx-auto inline-flex rounded-2xl border-4 border-[#D4AF37] bg-white p-3 shadow-xl">
                  <QRCodeSVG
                    value={shareUrl}
                    size={168}
                    bgColor="#FFFFFF"
                    fgColor="#0B2545"
                    level="M"
                  />
                </div>

                <div className="flex items-center justify-center gap-2 pt-1">
                  <code className="truncate max-w-[240px] rounded-xl bg-black/40 border border-white/15 px-3 py-1.5 text-[11px] text-sky-200">
                    {shareUrl}
                  </code>
                  <button
                    type="button"
                    onClick={handleCopyAppUrl}
                    className="flex items-center gap-1 rounded-xl bg-[#D4AF37] px-3 py-1.5 text-xs font-extrabold text-[#07162c] cursor-pointer"
                  >
                    {copiedAppUrl ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy URL</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
};
