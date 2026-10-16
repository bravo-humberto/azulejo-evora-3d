import Peer, { DataConnection } from 'peerjs';
import type { DraftMove, GameState } from '../types/game';

export type AllowedReactionEmoji = '👏' | '😱' | '🎨' | '👑' | '🔥';

export const ALLOWED_REACTIONS: readonly AllowedReactionEmoji[] = [
  '👏',
  '😱',
  '🎨',
  '👑',
  '🔥',
] as const;

export interface ConnectedPeerInfo {
  peerId: string;
  playerName: string;
  seatIndex: number;
  isHost: boolean;
}

export interface EmojiReactionPayload {
  id: string;
  senderId: string;
  senderName: string;
  emoji: AllowedReactionEmoji;
  timestamp: number;
}

export type P2PMessage =
  | {
      type: 'HELLO';
      peerId: string;
      playerName: string;
    }
  | {
      type: 'LOBBY_PEERS';
      peers: ConnectedPeerInfo[];
      roomCode: string;
    }
  | {
      type: 'STATE_SYNC';
      state: GameState;
    }
  | {
      type: 'DRAFT_MOVE';
      move: DraftMove;
      senderId: string;
    }
  | {
      type: 'EMOJI_REACTION';
      reaction: EmojiReactionPayload;
    };

export interface PeerManagerCallbacks {
  onStateSync?: (state: GameState) => void;
  onDraftMove?: (move: DraftMove, senderId: string) => void;
  onPeerConnected?: (peer: ConnectedPeerInfo, allPeers: ConnectedPeerInfo[]) => void;
  onPeerDisconnected?: (peerId: string, allPeers: ConnectedPeerInfo[]) => void;
  onEmojiReaction?: (reaction: EmojiReactionPayload) => void;
  onError?: (errorMessage: string) => void;
}

const PEER_PREFIX = 'azulejo-evora-room-';
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateShortCode(length: number = 4): string {
  let code = '';
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * CODE_ALPHABET.length);
    code += CODE_ALPHABET[idx];
  }
  return `AZUL-${code}`;
}

export function normalizeRoomSuffix(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/^AZUL-/, '').replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, 6);
}

export function formatRoomCode(suffixOrCode: string): string {
  const suffix = normalizeRoomSuffix(suffixOrCode);
  return suffix ? `AZUL-${suffix}` : '';
}

export function getRoomCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('room');
  if (!raw) return null;
  const suffix = normalizeRoomSuffix(raw);
  return suffix.length >= 3 ? `AZUL-${suffix}` : null;
}

export class PeerManager {
  private peer: Peer | null = null;
  private connections: Map<string, DataConnection> = new Map();
  private connectedPeers: ConnectedPeerInfo[] = [];
  private callbacks: PeerManagerCallbacks = {};
  private roomCode: string = '';
  private isHosting: boolean = false;
  private localPlayerName: string = 'Royal Artisan';
  private maxPlayers: number = 4;

  public setCallbacks(callbacks: Partial<PeerManagerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getRoomCode(): string {
    return this.roomCode;
  }

  public getInviteUrl(): string {
    if (typeof window === 'undefined' || !this.roomCode) return '';
    const suffix = normalizeRoomSuffix(this.roomCode);
    const url = new URL(window.location.href);
    url.searchParams.set('room', suffix);
    return url.toString();
  }

  public getConnectedPeers(): ConnectedPeerInfo[] {
    return [...this.connectedPeers];
  }

  public isHost(): boolean {
    return this.isHosting;
  }

  public getLocalPeerId(): string {
    return this.peer?.id ?? '';
  }

  /**
   * Hosts a new P2P room with a clean AZUL-XXXX room code (supports 2-4 players).
   */
  public async hostRoom(
    hostName: string = 'Royal Host',
    maxPlayers: number = 4,
    customCode?: string
  ): Promise<string> {
    this.disconnect();
    this.isHosting = true;
    this.localPlayerName = hostName.trim() || 'Royal Host';
    this.maxPlayers = Math.max(2, Math.min(4, maxPlayers));

    const formatted = customCode ? formatRoomCode(customCode) : generateShortCode(4);
    const suffix = normalizeRoomSuffix(formatted);
    this.roomCode = `AZUL-${suffix}`;
    const hostPeerId = `${PEER_PREFIX}${suffix}`;

    return new Promise<string>((resolve, reject) => {
      try {
        const peer = new Peer(hostPeerId);
        this.peer = peer;

        peer.on('open', (id) => {
          const hostInfo: ConnectedPeerInfo = {
            peerId: id,
            playerName: this.localPlayerName,
            seatIndex: 0,
            isHost: true,
          };
          this.connectedPeers = [hostInfo];
          this.callbacks.onPeerConnected?.(hostInfo, this.getConnectedPeers());
          resolve(this.roomCode);
        });

        peer.on('connection', (conn) => {
          this.handleIncomingConnection(conn);
        });

        peer.on('error', (err) => {
          const msg = err?.message || 'PeerJS connection error occurred.';
          this.callbacks.onError?.(msg);
          reject(new Error(msg));
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to initialize WebRTC host.';
        this.callbacks.onError?.(msg);
        reject(new Error(msg));
      }
    });
  }

  /**
   * Joins an existing room by room code (e.g. "AZUL-7F9A" or "7F9A").
   */
  public async joinRoom(
    codeInput: string,
    playerName: string = 'Challenger'
  ): Promise<string> {
    const suffix = normalizeRoomSuffix(codeInput);
    if (!suffix) {
      const msg = 'Please enter a valid room code (e.g. AZUL-4K8P).';
      this.callbacks.onError?.(msg);
      throw new Error(msg);
    }

    this.disconnect();
    this.isHosting = false;
    this.localPlayerName = playerName.trim() || 'Challenger';
    this.roomCode = `AZUL-${suffix}`;
    const targetHostPeerId = `${PEER_PREFIX}${suffix}`;

    return new Promise<string>((resolve, reject) => {
      try {
        const peer = new Peer();
        this.peer = peer;

        peer.on('open', (myPeerId) => {
          const conn = peer.connect(targetHostPeerId, {
            reliable: true,
          });

          conn.on('open', () => {
            this.connections.set(targetHostPeerId, conn);
            const helloMsg: P2PMessage = {
              type: 'HELLO',
              peerId: myPeerId,
              playerName: this.localPlayerName,
            };
            conn.send(helloMsg);
            resolve(this.roomCode);
          });

          conn.on('data', (raw) => {
            this.handleMessage(raw as P2PMessage, conn);
          });

          conn.on('close', () => {
            this.connections.delete(targetHostPeerId);
            this.callbacks.onPeerDisconnected?.(
              targetHostPeerId,
              this.getConnectedPeers()
            );
          });

          conn.on('error', (err) => {
            const msg = err?.message || 'Connection to host lost.';
            this.callbacks.onError?.(msg);
          });
        });

        peer.on('error', (err) => {
          const msg =
            err?.type === 'peer-unavailable'
              ? `Room ${this.roomCode} was not found or is no longer active.`
              : err?.message || 'Failed to connect to room.';
          this.callbacks.onError?.(msg);
          reject(new Error(msg));
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to join room.';
        this.callbacks.onError?.(msg);
        reject(new Error(msg));
      }
    });
  }

  private handleIncomingConnection(conn: DataConnection): void {
    conn.on('open', () => {
      if (this.connectedPeers.length >= this.maxPlayers) {
        conn.close();
        return;
      }
      this.connections.set(conn.peer, conn);
    });

    conn.on('data', (raw) => {
      this.handleMessage(raw as P2PMessage, conn);
    });

    conn.on('close', () => {
      this.connections.delete(conn.peer);
      this.connectedPeers = this.connectedPeers
        .filter((p) => p.peerId !== conn.peer)
        .map((p, idx) => ({ ...p, seatIndex: idx }));
      this.broadcastMessage({
        type: 'LOBBY_PEERS',
        peers: this.connectedPeers,
        roomCode: this.roomCode,
      });
      this.callbacks.onPeerDisconnected?.(conn.peer, this.getConnectedPeers());
    });
  }

  private handleMessage(msg: P2PMessage, sourceConn: DataConnection): void {
    if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

    switch (msg.type) {
      case 'HELLO': {
        if (!this.isHosting) return;
        const existingIdx = this.connectedPeers.findIndex(
          (p) => p.peerId === msg.peerId
        );
        const newPeer: ConnectedPeerInfo = {
          peerId: msg.peerId,
          playerName: msg.playerName,
          seatIndex:
            existingIdx >= 0 ? existingIdx : this.connectedPeers.length,
          isHost: false,
        };
        if (existingIdx >= 0) {
          this.connectedPeers[existingIdx] = newPeer;
        } else {
          this.connectedPeers.push(newPeer);
        }

        this.broadcastMessage({
          type: 'LOBBY_PEERS',
          peers: this.connectedPeers,
          roomCode: this.roomCode,
        });
        this.callbacks.onPeerConnected?.(newPeer, this.getConnectedPeers());
        break;
      }

      case 'LOBBY_PEERS': {
        this.connectedPeers = msg.peers;
        this.roomCode = msg.roomCode;
        const latestPeer =
          this.connectedPeers[this.connectedPeers.length - 1] ??
          this.connectedPeers[0];
        if (latestPeer) {
          this.callbacks.onPeerConnected?.(latestPeer, this.getConnectedPeers());
        }
        break;
      }

      case 'STATE_SYNC': {
        if (this.isHosting) {
          // Relay to other guests if needed
          this.broadcastExcept(msg, sourceConn.peer);
        }
        this.callbacks.onStateSync?.(msg.state);
        break;
      }

      case 'DRAFT_MOVE': {
        if (this.isHosting) {
          this.broadcastExcept(msg, sourceConn.peer);
        }
        this.callbacks.onDraftMove?.(msg.move, msg.senderId);
        break;
      }

      case 'EMOJI_REACTION': {
        if (this.isHosting) {
          this.broadcastExcept(msg, sourceConn.peer);
        }
        this.callbacks.onEmojiReaction?.(msg.reaction);
        break;
      }
    }
  }

  /**
   * Broadcasts authoritative GameState across all connected peers.
   */
  public broadcastState(state: GameState): void {
    this.broadcastMessage({
      type: 'STATE_SYNC',
      state,
    });
  }

  /**
   * Broadcasts a DraftMove from a player to the room.
   */
  public sendDraftMove(move: DraftMove): void {
    const senderId = this.peer?.id || 'local';
    this.broadcastMessage({
      type: 'DRAFT_MOVE',
      move,
      senderId,
    });
  }

  /**
   * Sends a live emoji reaction ('👏', '😱', '🎨', '👑', '🔥') to all players in the room.
   */
  public sendEmojiReaction(emoji: AllowedReactionEmoji): EmojiReactionPayload {
    const reaction: EmojiReactionPayload = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      senderId: this.peer?.id || 'local',
      senderName: this.localPlayerName,
      emoji,
      timestamp: Date.now(),
    };

    this.broadcastMessage({
      type: 'EMOJI_REACTION',
      reaction,
    });

    // Also trigger locally so the sender sees their own floating reaction
    this.callbacks.onEmojiReaction?.(reaction);
    return reaction;
  }

  private broadcastMessage(msg: P2PMessage): void {
    this.connections.forEach((conn) => {
      if (conn.open) {
        conn.send(msg);
      }
    });
  }

  private broadcastExcept(msg: P2PMessage, excludedPeerId: string): void {
    this.connections.forEach((conn, peerId) => {
      if (peerId !== excludedPeerId && conn.open) {
        conn.send(msg);
      }
    });
  }

  public disconnect(): void {
    this.connections.forEach((conn) => {
      try {
        conn.close();
      } catch {
        // Ignore close errors
      }
    });
    this.connections.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignore destroy errors
      }
      this.peer = null;
    }
    this.connectedPeers = [];
    this.roomCode = '';
    this.isHosting = false;
  }
}

export const peerManager = new PeerManager();
