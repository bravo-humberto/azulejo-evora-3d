import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  Globe,
  Copy,
  Check,
  Users,
  Crown,
  Sparkles,
  LogIn,
  Wifi,
  Play,
  AlertCircle,
} from 'lucide-react';
import {
  ALLOWED_REACTIONS,
  peerManager,
  type AllowedReactionEmoji,
  type ConnectedPeerInfo,
  type EmojiReactionPayload,
} from '../../multiplayer/peerManager';
import { soundManager } from '../../audio/soundManager';

export interface OnlineLobbyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartOnlineMatch?: (peers: ConnectedPeerInfo[], roomCode: string) => void;
  recentReactions?: EmojiReactionPayload[];
}

export const OnlineLobbyModal: React.FC<OnlineLobbyModalProps> = ({
  isOpen,
  onClose,
  onStartOnlineMatch,
  recentReactions = [],
}) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [playerName, setPlayerName] = useState('Dom Manuel');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [roomCode, setRoomCode] = useState<string>(() =>
    peerManager.getRoomCode()
  );
  const [peers, setPeers] = useState<ConnectedPeerInfo[]>(() =>
    peerManager.getConnectedPeers()
  );
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [localReactions, setLocalReactions] =
    useState<EmojiReactionPayload[]>(recentReactions);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
      setRoomCode(peerManager.getRoomCode());
      setPeers(peerManager.getConnectedPeers());
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

  useEffect(() => {
    peerManager.setCallbacks({
      onPeerConnected: (_peer, allPeers) => {
        setPeers(allPeers);
        setRoomCode(peerManager.getRoomCode());
        setErrorMsg(null);
      },
      onPeerDisconnected: (_peerId, allPeers) => {
        setPeers(allPeers);
      },
      onEmojiReaction: (reaction) => {
        soundManager.playTilePickup(1);
        setLocalReactions((prev) => [reaction, ...prev.slice(0, 5)]);
      },
      onError: (err) => {
        setErrorMsg(err);
        setIsBusy(false);
      },
    });
  }, []);

  const handleHostRoom = async () => {
    setErrorMsg(null);
    setIsBusy(true);
    setStatusMessage('Creating Royal P2P Room...');
    try {
      const code = await peerManager.hostRoom(playerName, 4);
      setRoomCode(code);
      setPeers(peerManager.getConnectedPeers());
      setStatusMessage('Room active! Share the code or QR with friends.');
      soundManager.playTilePlace(1);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Could not host WebRTC room.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) {
      setErrorMsg('Enter a 4-character room code (e.g., AZUL-7K4M).');
      return;
    }
    setErrorMsg(null);
    setIsBusy(true);
    setStatusMessage('Connecting to Host Peer...');
    try {
      const code = await peerManager.joinRoom(joinCodeInput, playerName);
      setRoomCode(code);
      setPeers(peerManager.getConnectedPeers());
      setStatusMessage(`Connected to ${code}!`);
      soundManager.playTilePlace(1);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Unable to join room.'
      );
    } finally {
      setIsBusy(false);
    }
  };

  const handleCopyCode = async () => {
    if (!roomCode) return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      soundManager.playTilePickup(1);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleCopyInviteLink = async () => {
    const url = peerManager.getInviteUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      soundManager.playTilePickup(1);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleSendEmoji = (emoji: AllowedReactionEmoji) => {
    peerManager.sendEmojiReaction(emoji);
  };

  const inviteUrl = peerManager.getInviteUrl();

  return (
    <dialog
      ref={dialogRef}
      closedby="any"
      aria-labelledby="online-lobby-title"
      className="w-full max-w-lg rounded-2xl bg-transparent p-0 text-[#fdfbf7] shadow-2xl"
    >
      <div className="relative flex max-h-[88dvh] flex-col overflow-hidden rounded-2xl border-2 border-[#d4af37]/75 bg-gradient-to-b from-[#0f294a] via-[#0b1f3a] to-[#071527] shadow-[0_24px_64px_rgba(0,0,0,0.88)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#d4af37]/30 bg-[#071527]/90 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d4af37]/60 bg-[#d4af37]/20 text-[#f5d061]">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="online-lobby-title"
                className="font-display text-lg font-bold tracking-wide text-[#f7e5a9]"
              >
                Online P2P Palace Salon
              </h2>
              <p className="text-xs text-[#9ec1e6]">
                Serverless WebRTC Room Code &bull; Instant Invite &amp; QR
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Online Lobby"
            className="rounded-lg border border-[#d4af37]/30 bg-[#133159]/60 p-2 text-[#e2c778] transition hover:border-[#d4af37] hover:bg-[#1b4379] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="custom-scroll flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* Artisan Display Name */}
          <div>
            <label
              htmlFor="online-artisan-name"
              className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#f3d27a]"
            >
              Your Artisan Name
            </label>
            <input
              id="online-artisan-name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name..."
              className="w-full rounded-xl border border-[#d4af37]/35 bg-[#071527] px-3.5 py-2 text-xs font-semibold text-white focus:border-[#f5d061] focus:outline-none"
            />
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl border border-[#f87171]/50 bg-[#3b1219]/80 px-3.5 py-2.5 text-xs text-[#fca5a5]">
              <AlertCircle className="h-4 w-4 shrink-0 text-[#f87171]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Host or Join Controls when not yet in a room */}
          {!roomCode ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Create Room Card */}
              <div className="flex flex-col justify-between rounded-xl border border-[#d4af37]/35 bg-[#091c36] p-3.5">
                <div>
                  <div className="flex items-center gap-1.5 font-display text-sm font-bold text-[#f7e5a9]">
                    <Crown className="h-4 w-4 text-[#f5d061]" /> Host New Room
                  </div>
                  <p className="mt-1 text-xs text-[#9ec1e6]">
                    Generate a 5-character room code (AZUL-XXXX) and QR code for up to 4 players.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={handleHostRoom}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#f5d061] bg-gradient-to-r from-[#d4af37] to-[#b5851b] py-2 text-xs font-bold text-[#071527] shadow transition hover:brightness-110 disabled:opacity-50"
                >
                  <Wifi className="h-3.5 w-3.5" />
                  {isBusy ? 'Opening Room...' : 'Create Room Code'}
                </button>
              </div>

              {/* Join Room Card */}
              <form
                onSubmit={handleJoinRoom}
                className="flex flex-col justify-between rounded-xl border border-[#d4af37]/35 bg-[#091c36] p-3.5"
              >
                <div>
                  <div className="flex items-center gap-1.5 font-display text-sm font-bold text-[#f7e5a9]">
                    <LogIn className="h-4 w-4 text-[#f5d061]" /> Join by Code
                  </div>
                  <input
                    type="text"
                    value={joinCodeInput}
                    onChange={(e) =>
                      setJoinCodeInput(e.target.value.toUpperCase())
                    }
                    placeholder="e.g. AZUL-7F9A"
                    aria-label="Room Code"
                    className="mt-2 w-full rounded-lg border border-[#d4af37]/40 bg-[#061326] px-3 py-1.5 font-display text-xs font-bold tracking-wider text-[#f5d061] placeholder-[#56769e] focus:border-[#f5d061] focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isBusy}
                  className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#d4af37]/60 bg-[#163a66] py-2 text-xs font-bold text-[#f7e5a9] transition hover:border-[#f5d061] hover:bg-[#1d4b82] disabled:opacity-50"
                >
                  <LogIn className="h-3.5 w-3.5" />
                  Join Room
                </button>
              </form>
            </div>
          ) : (
            /* Active Room Code + QR + Connected Peers */
            <div className="space-y-3.5">
              <div className="flex flex-col items-center justify-between gap-3 rounded-xl border border-[#f5d061]/60 bg-[#091c36] p-4 sm:flex-row">
                <div className="space-y-2 text-center sm:text-left">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#9ec1e6]">
                    Active Room Code
                  </span>
                  <div className="font-display text-2xl font-black tracking-wider text-[#f5d061]">
                    {roomCode}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#d4af37]/40 bg-[#122e54] px-2.5 py-1 text-xs font-semibold text-[#f7e5a9] transition hover:border-[#f5d061]"
                    >
                      {copiedCode ? (
                        <Check className="h-3.5 w-3.5 text-[#a8f0da]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedCode ? 'Copied!' : 'Copy Code'}
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyInviteLink}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#d4af37]/40 bg-[#122e54] px-2.5 py-1 text-xs font-semibold text-[#f7e5a9] transition hover:border-[#f5d061]"
                    >
                      {copiedLink ? (
                        <Check className="h-3.5 w-3.5 text-[#a8f0da]" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedLink ? 'Link Copied!' : 'Invite URL'}
                    </button>
                  </div>
                  {statusMessage && (
                    <p className="text-[11px] text-[#a8f0da]">{statusMessage}</p>
                  )}
                </div>

                {/* Instant QR Code for Mobile Scan */}
                {inviteUrl && (
                  <div className="rounded-xl border-2 border-[#f5d061] bg-white p-2 shadow-md">
                    <QRCodeSVG value={inviteUrl} size={96} level="M" />
                  </div>
                )}
              </div>

              {/* Connected Artisans List */}
              <div className="rounded-xl border border-[#d4af37]/30 bg-[#091c36] p-3.5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#f3d27a]">
                    <Users className="h-3.5 w-3.5 text-[#f5d061]" />
                    Connected Artisans ({peers.length} / 4)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      peerManager.disconnect();
                      setRoomCode('');
                      setPeers([]);
                      setStatusMessage('');
                    }}
                    className="text-[11px] font-semibold text-[#f87171] hover:underline"
                  >
                    Leave Room
                  </button>
                </div>

                <div className="space-y-1.5">
                  {peers.map((p) => (
                    <div
                      key={p.peerId}
                      className="flex items-center justify-between rounded-lg border border-[#d4af37]/20 bg-[#071527] px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {p.isHost && (
                          <Crown className="h-3.5 w-3.5 text-[#f5d061]" />
                        )}
                        <span className="font-bold text-white">
                          {p.playerName}
                        </span>
                      </div>
                      <span className="rounded bg-[#122e54] px-2 py-0.5 text-[10px] font-semibold text-[#9ec1e6]">
                        {p.isHost ? 'Host' : `Seat ${p.seatIndex + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Emoji Reaction Bar */}
          <div className="rounded-xl border border-[#d4af37]/30 bg-[#091c36] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-[#f3d27a]">
                <Sparkles className="h-3.5 w-3.5 text-[#f5d061]" /> Live Table Reactions
              </span>
              <span className="text-[10px] text-[#9ec1e6]">
                Tap to broadcast to room
              </span>
            </div>

            <div className="flex items-center justify-around gap-2">
              {ALLOWED_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleSendEmoji(emoji)}
                  className="flex h-10 flex-1 items-center justify-center rounded-xl border border-[#d4af37]/30 bg-[#071527] text-lg transition hover:scale-105 hover:border-[#f5d061] hover:bg-[#122e54] active:scale-95"
                >
                  {emoji}
                </button>
              ))}
            </div>

            {localReactions.length > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5 border-t border-[#d4af37]/20 pt-2">
                {localReactions.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center gap-1 rounded-full border border-[#d4af37]/30 bg-[#071527] px-2.5 py-0.5 text-xs text-[#f7e5a9]"
                  >
                    <span>{r.emoji}</span>
                    <span className="text-[10px] text-[#9ec1e6]">
                      {r.senderName}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Start Match for Host */}
        {roomCode && peerManager.isHost() && onStartOnlineMatch && (
          <div className="border-t border-[#d4af37]/30 bg-[#071527]/95 px-5 py-3.5">
            <button
              type="button"
              onClick={() => {
                soundManager.playTilePlace(1);
                onStartOnlineMatch(peers, roomCode);
                onClose();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#f5d061] bg-gradient-to-r from-[#f5d061] to-[#c79519] py-2.5 font-display text-sm font-extrabold uppercase tracking-wider text-[#071527] shadow-lg transition hover:brightness-110"
            >
              <Play className="h-4 w-4 fill-current" />
              Launch Online Match ({peers.length} Players)
            </button>
          </div>
        )}
      </div>
    </dialog>
  );
};
