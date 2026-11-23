// WebRTC DataChannel, Authenticated WebSocket Signaling & Peer Network Manager
import { z } from 'zod';
import { ArtistProfile, Artwork, PeerFriend, SignalingPeer, P2PFileTransferProgress } from '../types';
import { saveFriendBackupArtwork } from './p2pStorage';
import { computeSha256 } from './p2pSwarmChunker';
import { exportMyEcdhPublicJwk, registerPeerEcdhPublicKey } from './p2pEcdhKeys';
import { getOrCreatePeerEcdsaKeyPair } from './p2pWebOfTrust';

export interface P2PMessage {
  type:
    | 'HANDSHAKE'
    | 'SHARE_ARTWORK'
    | 'LIKE_ARTWORK'
    | 'REQUEST_BACKUP'
    | 'VERIFICATION_PROPOSAL'
    | 'CONDEMNED_BROADCAST'
    | 'AUDITOR_VOTE_CAST'
    | 'CHAT_ENVELOPE_DIRECT'
    | 'CHAT_ENVELOPE_CUSTODY'
    | 'CHAT_DELIVERY_ACK'
    | 'PEER_PRESENCE_ANNOUNCEMENT'
    | 'COLLAB_CANVAS_EVENT'
    | 'PING'
    | 'PONG'
    | 'ARTWORK_CHUNK_INIT'
    | 'ARTWORK_CHUNK_DATA'
    | 'ARTWORK_CHUNK_ACK';
  senderProfile: ArtistProfile;
  payload: any;
  timestamp: number;
}

const MAX_CHUNKS_PER_TRANSFER = 512;
const MAX_TRANSFER_BYTES = 8 * 1024 * 1024;
const MAX_CONCURRENT_TRANSFERS_PER_PEER = 3;
const MAX_DATACHANNEL_MESSAGE_BYTES = 262144;

const P2PMessageOuterSchema = z.object({
  type: z.enum([
    'HANDSHAKE',
    'SHARE_ARTWORK',
    'LIKE_ARTWORK',
    'REQUEST_BACKUP',
    'VERIFICATION_PROPOSAL',
    'CONDEMNED_BROADCAST',
    'AUDITOR_VOTE_CAST',
    'CHAT_ENVELOPE_DIRECT',
    'CHAT_ENVELOPE_CUSTODY',
    'CHAT_DELIVERY_ACK',
    'PEER_PRESENCE_ANNOUNCEMENT',
    'COLLAB_CANVAS_EVENT',
    'PING',
    'PONG',
    'ARTWORK_CHUNK_INIT',
    'ARTWORK_CHUNK_DATA',
    'ARTWORK_CHUNK_ACK',
  ]),
  senderProfile: z.object({
    id: z.string().min(1).max(128),
    name: z.string().min(1).max(100),
    avatarColor: z.string().max(80).optional().default('from-amber-500 to-yellow-600'),
    bio: z.string().max(400).optional().default(''),
    createdAt: z.number().optional().default(0),
    totalCreations: z.number().optional().default(0),
    likedArtworkIds: z.array(z.string()).optional().default([]),
  }),
  payload: z.unknown(),
  timestamp: z.number(),
});

const ChunkInitPayloadSchema = z.object({
  transferId: z.string().min(1).max(64),
  totalChunks: z.number().int().min(1).max(MAX_CHUNKS_PER_TRANSFER),
  totalBytes: z.number().int().min(1).max(MAX_TRANSFER_BYTES),
  artworkMeta: z.object({
    id: z.string().min(1).max(128),
    title: z.string().min(1).max(160).optional(),
    prompt: z.string().max(600).optional(),
    style: z.string().max(120).optional(),
    year: z.string().max(16).optional(),
    description: z.string().max(1000).optional(),
    palette: z.array(z.object({ hex: z.string().max(24), name: z.string().max(60) })).max(10).optional(),
    brushstrokeNote: z.string().max(300).optional(),
    aspectRatio: z.enum(['1:1', '16:9', '4:3', '3:4', '9:16', '4:1', '1:4']).optional(),
    authorId: z.string().max(128).optional(),
    authorName: z.string().max(100).optional(),
    createdAt: z.number().optional(),
    likes: z.number().int().min(0).optional(),
    contentHash: z.string().regex(/^[0-9a-f]{64}$/i).optional(),
  }),
});

const ChunkDataPayloadSchema = z.object({
  transferId: z.string().min(1).max(64),
  chunkIndex: z.number().int().min(0).max(MAX_CHUNKS_PER_TRANSFER - 1),
  chunkData: z.string().min(1).max(65536),
  chunkHash: z.string().regex(/^[0-9a-f]{64}$/i),
});

const StrokePointSchema = z.object({
  x: z.number().finite().min(-10000).max(20000),
  y: z.number().finite().min(-10000).max(20000),
  pressure: z.number().finite().min(0).max(2).optional(),
});

const CollabCanvasEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('stroke'),
    payload: z.object({
      id: z.string().min(1).max(128),
      peerId: z.string().min(1).max(128),
      peerName: z.string().min(1).max(100),
      peerAvatarColor: z.string().max(80).optional().default('from-amber-500 to-yellow-600'),
      color: z.string().max(32),
      width: z.number().finite().min(1).max(128),
      brushStyle: z.enum(['impasto', 'starry_swirl', 'sunflower_dab', 'palette_knife', 'almond_branch']),
      points: z.array(StrokePointSchema).min(1).max(2000),
      timestamp: z.number().finite(),
    }),
  }),
  z.object({
    type: z.literal('cursor'),
    payload: z.object({
      peerId: z.string().min(1).max(128),
      peerName: z.string().min(1).max(100),
      peerAvatarColor: z.string().max(80).optional().default('from-amber-500 to-yellow-600'),
      x: z.number().finite().min(-10000).max(20000),
      y: z.number().finite().min(-10000).max(20000),
      isDrawing: z.boolean(),
      activeColor: z.string().max(32),
      lastActive: z.number().finite(),
    }),
  }),
  z.object({
    type: z.literal('clear'),
    payload: z.object({
      peerId: z.string().min(1).max(128),
      timestamp: z.number().finite().optional(),
    }),
  }),
  z.object({
    type: z.literal('sync_request'),
    payload: z.object({
      requesterId: z.string().min(1).max(128),
    }),
  }),
  z.object({
    type: z.literal('sync_response'),
    payload: z.object({
      targetPeerId: z.string().min(1).max(128),
      strokes: z.array(z.unknown()).max(500),
    }),
  }),
]);

interface ActiveConnection {
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
  friend: PeerFriend;
  status: 'connecting' | 'connected' | 'closed';
  latencyMs: number;
}

const DEFAULT_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

function isSafeImageUri(uri: string): boolean {
  return uri.startsWith('data:image/') || uri.startsWith('https://') || uri.startsWith('/');
}

export class P2PNetworkManager {
  private localProfile: ArtistProfile | null = null;
  private sessionToken: string | null = null;
  private rtcConfig: RTCConfiguration = DEFAULT_RTC_CONFIG;
  private isRegistering = false;
  private ws: WebSocket | null = null;
  private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isDestroyed = false;

  private onArtworkReceivedCallback?: (artwork: Artwork) => void;
  private onPeerConnectedCallback?: (peer: PeerFriend) => void;
  private onLikeReceivedCallback?: (artworkId: string) => void;
  private channel: BroadcastChannel | null = null;
  private messageListeners: Array<(msg: P2PMessage) => void> = [];

  private activeConnections = new Map<string, ActiveConnection>();
  private discoveredPeers: SignalingPeer[] = [];
  private discoveredPeersListeners: Array<(peers: SignalingPeer[]) => void> = [];
  private pollIntervalTimer: any = null;
  private heartbeatTimer: any = null;
  private myArtworksCount: number = 0;

  private incomingTransfers = new Map<string, {
    artworkMeta: Partial<Artwork>;
    chunks: string[];
    receivedCount: number;
    totalChunks: number;
    totalBytes: number;
    startTime: number;
    senderPeerId: string;
    senderName: string;
  }>();
  private transferProgressListeners: Array<(progress: P2PFileTransferProgress) => void> = [];

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel('vangogh_cats_p2p_channel');
      this.channel.onmessage = (event) => {
        void this.handleIncomingMessage(event.data, undefined, false);
      };
    }
  }

  private getAuthHeaders(): Record<string, string> {
    return this.sessionToken
      ? { Authorization: `Bearer ${this.sessionToken}` }
      : {};
  }

  private async getFirebaseIdToken(): Promise<string | null> {
    if (typeof window === 'undefined') return null;
    try {
      const { auth } = await import('../firebase');
      if (!auth.currentUser) return null;
      return await auth.currentUser.getIdToken();
    } catch {
      return null;
    }
  }

  private async handleIncomingMessage(
    rawMessage: unknown,
    authenticatedPeerId?: string,
    isLocalSelfEcho = false
  ): Promise<void> {
    const parsedOuter = P2PMessageOuterSchema.safeParse(rawMessage);
    if (!parsedOuter.success) {
      console.warn('Dropped malformed P2P message:', parsedOuter.error.issues[0]?.message);
      return;
    }

    const message: P2PMessage = {
      type: parsedOuter.data.type,
      senderProfile: {
        ...parsedOuter.data.senderProfile,
        id: authenticatedPeerId || parsedOuter.data.senderProfile.id,
      },
      payload: parsedOuter.data.payload,
      timestamp: parsedOuter.data.timestamp,
    };

    const effectiveSenderId = message.senderProfile.id;

    if (message.type === 'HANDSHAKE') {
      const ecdhJwk = message.payload?.ecdhPublicKeyJwk;
      if (ecdhJwk) {
        registerPeerEcdhPublicKey(effectiveSenderId, ecdhJwk);
        const conn = this.activeConnections.get(effectiveSenderId);
        if (conn) {
          conn.friend.ecdhPublicKeyJwk = ecdhJwk;
          conn.friend.ecdsaPublicKeyJwk = message.payload?.ecdsaPublicKeyJwk;
        }
      }
      return;
    }

    if (message.type === 'PING') {
      if (this.localProfile) {
        this.sendDirectMessage(effectiveSenderId, {
          type: 'PONG',
          senderProfile: this.localProfile,
          payload: { echoTimestamp: message.payload?.clientTimestamp },
          timestamp: Date.now(),
        });
      }
      return;
    }

    if (message.type === 'PONG') {
      const sentTime = message.payload?.echoTimestamp;
      if (typeof sentTime === 'number') {
        const roundtrip = Date.now() - sentTime;
        const conn = this.activeConnections.get(effectiveSenderId);
        if (conn) {
          conn.latencyMs = Math.max(1, Math.round(roundtrip / 2));
          conn.friend.latencyMs = conn.latencyMs;
        }
      }
      return;
    }

    if (message.type === 'ARTWORK_CHUNK_INIT') {
      const initCheck = ChunkInitPayloadSchema.safeParse(message.payload);
      if (!initCheck.success) {
        console.warn('Rejected invalid ARTWORK_CHUNK_INIT:', initCheck.error.issues[0]?.message);
        return;
      }

      const { transferId, artworkMeta, totalChunks, totalBytes } = initCheck.data;
      const activeForSender = Array.from(this.incomingTransfers.values()).filter(
        t => t.senderPeerId === effectiveSenderId
      ).length;
      if (activeForSender >= MAX_CONCURRENT_TRANSFERS_PER_PEER && !this.incomingTransfers.has(transferId)) {
        console.warn(`Transfer concurrency limit reached for peer ${effectiveSenderId}`);
        return;
      }

      this.incomingTransfers.set(transferId, {
        artworkMeta: {
          ...artworkMeta,
          authorId: effectiveSenderId,
          authorName: message.senderProfile.name,
        },
        chunks: new Array(totalChunks).fill(''),
        receivedCount: 0,
        totalChunks,
        totalBytes,
        startTime: Date.now(),
        senderPeerId: effectiveSenderId,
        senderName: message.senderProfile.name,
      });

      this.notifyTransferProgress({
        transferId,
        artworkId: artworkMeta.id,
        artworkTitle: artworkMeta.title || 'Новое полотно',
        direction: 'download',
        peerId: effectiveSenderId,
        peerName: message.senderProfile.name,
        receivedChunks: 0,
        totalChunks,
        progressPercent: 0,
        bytesTransferred: 0,
        totalBytes,
        speedKbps: 0,
        isComplete: false,
      });
      return;
    }

    if (message.type === 'ARTWORK_CHUNK_DATA') {
      const dataCheck = ChunkDataPayloadSchema.safeParse(message.payload);
      if (!dataCheck.success) {
        console.warn('Rejected invalid ARTWORK_CHUNK_DATA:', dataCheck.error.issues[0]?.message);
        return;
      }

      const { transferId, chunkIndex, chunkData, chunkHash } = dataCheck.data;
      const transfer = this.incomingTransfers.get(transferId);
      if (!transfer || transfer.senderPeerId !== effectiveSenderId) return;
      if (chunkIndex < 0 || chunkIndex >= transfer.totalChunks) return;
      if (transfer.chunks[chunkIndex]) return;

      // Verify per-chunk SHA-256 integrity before accepting
      const computedChunkHash = await computeSha256(chunkData);
      if (computedChunkHash !== chunkHash.toLowerCase()) {
        console.warn(`Rejected corrupted P2P chunk ${chunkIndex} on transfer ${transferId}: SHA-256 mismatch`);
        return;
      }

      transfer.chunks[chunkIndex] = chunkData;
      transfer.receivedCount++;

      const elapsedSec = Math.max(0.1, (Date.now() - transfer.startTime) / 1000);
      const bytesSoFar = transfer.chunks.reduce((acc, c) => acc + (c ? c.length : 0), 0);
      if (bytesSoFar > MAX_TRANSFER_BYTES || bytesSoFar > transfer.totalBytes + 4096) {
        console.warn(`Aborted oversized P2P transfer ${transferId}`);
        this.incomingTransfers.delete(transferId);
        return;
      }

      const speedKbps = Math.round((bytesSoFar * 8) / (elapsedSec * 1024));
      const progressPercent = Math.min(100, Math.round((transfer.receivedCount / transfer.totalChunks) * 100));

      this.notifyTransferProgress({
        transferId,
        artworkId: transfer.artworkMeta.id || '',
        artworkTitle: transfer.artworkMeta.title || 'Новое полотно',
        direction: 'download',
        peerId: transfer.senderPeerId,
        peerName: transfer.senderName,
        receivedChunks: transfer.receivedCount,
        totalChunks: transfer.totalChunks,
        progressPercent,
        bytesTransferred: bytesSoFar,
        totalBytes: transfer.totalBytes,
        speedKbps,
        isComplete: transfer.receivedCount === transfer.totalChunks,
      });

      if (this.localProfile) {
        this.sendDirectMessage(transfer.senderPeerId, {
          type: 'ARTWORK_CHUNK_ACK',
          senderProfile: this.localProfile,
          payload: { transferId, chunkIndex, receivedCount: transfer.receivedCount },
          timestamp: Date.now(),
        });
      }

      if (transfer.receivedCount === transfer.totalChunks) {
        const assembledImageUrl = transfer.chunks.join('');
        this.incomingTransfers.delete(transferId);

        if (assembledImageUrl.length !== transfer.totalBytes || !isSafeImageUri(assembledImageUrl)) {
          console.warn(`Rejected assembled artwork on transfer ${transferId}: byte length or URI check failed`);
          return;
        }

        if (transfer.artworkMeta.contentHash) {
          const fullHash = await computeSha256(assembledImageUrl);
          if (fullHash !== transfer.artworkMeta.contentHash.toLowerCase()) {
            console.warn(`Rejected assembled artwork on transfer ${transferId}: full SHA-256 mismatch`);
            return;
          }
        }

        const completeArtwork: Artwork = {
          ...(transfer.artworkMeta as Artwork),
          imageUrl: assembledImageUrl,
          source: 'p2p-friend',
          isBackedUpLocally: true,
          originPeerId: transfer.senderPeerId,
          authorId: transfer.senderPeerId,
          authorName: transfer.artworkMeta.authorName || transfer.senderName,
          createdAt: transfer.artworkMeta.createdAt || Date.now(),
        };

        await saveFriendBackupArtwork(completeArtwork);

        if (this.onArtworkReceivedCallback) {
          this.onArtworkReceivedCallback(completeArtwork);
        }

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('p2p:artwork_replicated', { detail: completeArtwork }));
        }
      }
      return;
    }

    if (message.type === 'ARTWORK_CHUNK_ACK') {
      const { transferId, chunkIndex, receivedCount } = message.payload || {};
      if (typeof window !== 'undefined' && typeof transferId === 'string') {
        window.dispatchEvent(new CustomEvent('p2p:chunk_ack', { detail: { transferId, chunkIndex, receivedCount } }));
      }
      return;
    }

    if (message.type === 'COLLAB_CANVAS_EVENT') {
      const collabCheck = CollabCanvasEventSchema.safeParse(message.payload);
      if (!collabCheck.success) {
        console.warn('Rejected invalid COLLAB_CANVAS_EVENT payload:', collabCheck.error.issues[0]?.message);
        return;
      }
      if (!isLocalSelfEcho && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('p2p:collab_event', { detail: collabCheck.data }));
      }
    }

    for (const listener of this.messageListeners) {
      try {
        listener(message);
      } catch (err) {
        console.error('Error in P2P message listener:', err);
      }
    }
  }

  public onMessage(listener: (msg: P2PMessage) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== listener);
    };
  }

  public onDiscoveredPeersChange(callback: (peers: SignalingPeer[]) => void): () => void {
    this.discoveredPeersListeners.push(callback);
    callback(this.discoveredPeers);
    return () => {
      this.discoveredPeersListeners = this.discoveredPeersListeners.filter(c => c !== callback);
    };
  }

  public getDiscoveredPeers(): SignalingPeer[] {
    return this.discoveredPeers;
  }

  public getConnectedFriends(): PeerFriend[] {
    const list: PeerFriend[] = [];
    for (const conn of this.activeConnections.values()) {
      if (conn.status === 'connected') {
        list.push(conn.friend);
      }
    }
    return list;
  }

  public broadcastMessage(message: P2PMessage): void {
    const serialized = JSON.stringify(message);

    for (const conn of this.activeConnections.values()) {
      if (conn.dc && conn.dc.readyState === 'open') {
        try {
          conn.dc.send(serialized);
        } catch (err) {
          console.warn(`WebRTC DataChannel send error to ${conn.friend.name}:`, err);
        }
      }
    }

    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    void this.handleIncomingMessage(message, undefined, true);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('p2p_network_message', { detail: message }));
    }
  }

  public sendDirectMessage(targetPeerId: string, message: P2PMessage): void {
    const conn = this.activeConnections.get(targetPeerId);
    if (conn && conn.dc && conn.dc.readyState === 'open') {
      try {
        conn.dc.send(JSON.stringify(message));
        return;
      } catch (err) {
        console.warn(`Direct send to ${targetPeerId} failed, falling back to broadcast:`, err);
      }
    }
    this.broadcastMessage(message);
  }

  public async init(
    profile: ArtistProfile,
    onArtworkReceived: (artwork: Artwork) => void,
    onPeerConnected: (peer: PeerFriend) => void,
    onLikeReceived: (artworkId: string) => void,
    artworksCount = 0
  ) {
    this.isDestroyed = false;
    this.localProfile = profile;
    this.onArtworkReceivedCallback = onArtworkReceived;
    this.onPeerConnectedCallback = onPeerConnected;
    this.onLikeReceivedCallback = onLikeReceived;
    this.myArtworksCount = artworksCount;

    const registered = await this.registerWithSignalingServer();
    if (registered) {
      this.connectWebSocket();
    }
    this.startSignalingPolling();
  }

  public async refreshSignalingSession(): Promise<void> {
    if (!this.localProfile || this.isDestroyed) return;
    const registered = await this.registerWithSignalingServer();
    if (registered) {
      this.connectWebSocket();
    }
  }

  public clearSignalingSession(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
    if (this.localProfile && this.sessionToken) {
      fetch('/api/p2p/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({}),
      }).catch(() => {});
    }
    this.sessionToken = null;
    this.discoveredPeers = [];
    for (const listener of this.discoveredPeersListeners) {
      listener([]);
    }
  }

  private async getLocalCryptoKeys(): Promise<{
    ecdhPublicKeyJwk?: JsonWebKey;
    ecdsaPublicKeyJwk?: JsonWebKey;
    signChallenge?: (challenge: string) => Promise<string>;
  }> {
    try {
      const [{ publicKeyJwk: ecdhPublicKeyJwk }, ecdsa] = await Promise.all([
        exportMyEcdhPublicJwk(this.localProfile?.id || 'default'),
        getOrCreatePeerEcdsaKeyPair(),
      ]);
      return {
        ecdhPublicKeyJwk,
        ecdsaPublicKeyJwk: ecdsa.publicKeyJwk,
        signChallenge: ecdsa.sign,
      };
    } catch {
      return {};
    }
  }

  private async fetchIceServers(firebaseToken: string): Promise<void> {
    try {
      const res = await fetch('/api/p2p/ice-servers', {
        headers: { Authorization: `Bearer ${firebaseToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
          this.rtcConfig = { iceServers: data.iceServers };
        }
      }
    } catch {
      // Retain default Google STUN fallback
    }
  }

  private async registerWithSignalingServer(): Promise<boolean> {
    if (!this.localProfile || this.isDestroyed || this.isRegistering) return false;

    const firebaseToken = await this.getFirebaseIdToken();
    if (!firebaseToken) {
      // User not signed into Google yet; skip live server signaling without 401 noise
      return false;
    }

    this.isRegistering = true;
    try {
      const [keys, challengeRes] = await Promise.all([
        this.getLocalCryptoKeys(),
        fetch('/api/p2p/challenge', {
          headers: { Authorization: `Bearer ${firebaseToken}` },
        }),
        this.fetchIceServers(firebaseToken),
      ]);

      if (!challengeRes.ok || !keys.ecdsaPublicKeyJwk || !keys.signChallenge) {
        return false;
      }

      const challengeData = await challengeRes.json();
      if (typeof challengeData?.challenge !== 'string') {
        return false;
      }

      const challengeSignature = await keys.signChallenge(challengeData.challenge);

      const res = await fetch('/api/p2p/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${firebaseToken}`,
        },
        body: JSON.stringify({
          peerId: this.localProfile.id,
          name: this.localProfile.name,
          avatarColor: this.localProfile.avatarColor,
          artworkCount: this.myArtworksCount,
          ecdhPublicKeyJwk: keys.ecdhPublicKeyJwk,
          ecdsaPublicKeyJwk: keys.ecdsaPublicKeyJwk,
          challenge: challengeData.challenge,
          challengeSignature,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.sessionToken === 'string') {
          this.sessionToken = data.sessionToken;
        }
        if (Array.isArray(data.onlinePeers)) {
          this.updateDiscoveredPeers(data.onlinePeers);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Signaling server registration retry in progress:', err);
      return false;
    } finally {
      this.isRegistering = false;
    }
  }

  private connectWebSocket(): void {
    if (this.isDestroyed || typeof window === 'undefined' || !this.sessionToken) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/p2p?token=${encodeURIComponent(this.sessionToken)}`;
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'signal_delivery' && msg.signal) {
            void this.handleIncomingSignal(msg.signal);
          } else if (msg.type === 'peers_update' && Array.isArray(msg.peers)) {
            this.updateDiscoveredPeers(msg.peers);
          }
        } catch {}
      };

      socket.onclose = () => {
        this.ws = null;
        if (!this.isDestroyed && this.sessionToken) {
          if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);
          this.wsReconnectTimer = setTimeout(() => this.connectWebSocket(), 4000);
        }
      };

      socket.onerror = () => {
        // Fallback polling stays active automatically
      };
    } catch {
      // Fallback polling remains active
    }
  }

  private startSignalingPolling(): void {
    if (this.pollIntervalTimer) clearInterval(this.pollIntervalTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    const runPoll = async () => {
      if (!this.localProfile || !this.sessionToken) return;
      try {
        const res = await fetch('/api/p2p/signal/poll', {
          headers: this.getAuthHeaders(),
        });
        if (res.status === 401) {
          this.sessionToken = null;
          await this.registerWithSignalingServer();
          this.connectWebSocket();
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (Array.isArray(data.signals) && data.signals.length > 0) {
          for (const sig of data.signals) {
            await this.handleIncomingSignal(sig);
          }
        }
      } catch {
        // Retry on next tick
      }
    };

    // Keep lightweight fallback polling (10s when WS open, 2s when disconnected)
    this.pollIntervalTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        return;
      }
      void runPoll();
    }, 2000);

    this.heartbeatTimer = setInterval(async () => {
      if (!this.localProfile || !this.sessionToken) return;
      try {
        const [peersRes] = await Promise.all([
          fetch('/api/p2p/peers', { headers: this.getAuthHeaders() }),
          fetch('/api/p2p/heartbeat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...this.getAuthHeaders(),
            },
            body: JSON.stringify({
              artworkCount: this.myArtworksCount,
            }),
          }),
        ]);

        if (peersRes.status === 401) {
          this.sessionToken = null;
          await this.registerWithSignalingServer();
          this.connectWebSocket();
          return;
        }

        if (peersRes.ok) {
          const data = await peersRes.json();
          if (Array.isArray(data.peers)) {
            this.updateDiscoveredPeers(data.peers);
          }
        }
      } catch {
        // Retry on next heartbeat
      }
    }, 8000);
  }

  private updateDiscoveredPeers(peers: SignalingPeer[]): void {
    if (!this.localProfile) return;
    const filtered = peers.filter(p => p.peerId !== this.localProfile?.id);
    for (const p of filtered) {
      if (p.ecdhPublicKeyJwk) {
        registerPeerEcdhPublicKey(p.peerId, p.ecdhPublicKeyJwk);
      }
    }
    this.discoveredPeers = filtered;
    for (const listener of this.discoveredPeersListeners) {
      listener(filtered);
    }
  }

  private async sendSignal(toPeerId: string, signalType: 'OFFER' | 'ANSWER' | 'ICE', payload: any): Promise<void> {
    if (!this.localProfile || !this.sessionToken) return;
    try {
      await fetch('/api/p2p/signal/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({
          toPeerId,
          signalType,
          payload,
        }),
      });
    } catch (err) {
      console.error('Failed to send WebRTC signal:', err);
    }
  }

  public async connectToDiscoveredPeer(targetPeer: SignalingPeer): Promise<PeerFriend> {
    if (!this.localProfile) {
      throw new Error('Локальный профиль не инициализирован');
    }

    const targetPeerId = targetPeer.peerId;
    if (targetPeer.ecdhPublicKeyJwk) {
      registerPeerEcdhPublicKey(targetPeerId, targetPeer.ecdhPublicKeyJwk);
    }

    const existing = this.activeConnections.get(targetPeerId);
    if (existing && existing.status === 'connected') {
      return existing.friend;
    }

    const friend: PeerFriend = {
      peerId: targetPeer.peerId,
      name: targetPeer.name,
      avatarColor: targetPeer.avatarColor,
      addedAt: Date.now(),
      lastSeenAt: Date.now(),
      status: 'connecting',
      artworkCount: targetPeer.artworkCount || 0,
      sharedStorageBytes: 0,
      connectionMethod: 'direct-webrtc',
      latencyMs: 0,
      ecdhPublicKeyJwk: targetPeer.ecdhPublicKeyJwk,
      ecdsaPublicKeyJwk: targetPeer.ecdsaPublicKeyJwk,
    };

    const pc = new RTCPeerConnection(this.rtcConfig);
    const dc = pc.createDataChannel('vangogh-p2p', { ordered: true });

    const activeConn: ActiveConnection = {
      pc,
      dc,
      friend,
      status: 'connecting',
      latencyMs: 0,
    };
    this.activeConnections.set(targetPeerId, activeConn);

    this.setupDataChannel(targetPeerId, dc, friend);

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void this.sendSignal(targetPeerId, 'ICE', event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        friend.status = 'online';
        activeConn.status = 'connected';
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        friend.status = 'offline';
        activeConn.status = 'closed';
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this.sendSignal(targetPeerId, 'OFFER', offer);

    return friend;
  }

  private async handleIncomingSignal(sig: { fromPeerId: string; signalType: string; payload: any }): Promise<void> {
    const { fromPeerId, signalType, payload } = sig;
    if (fromPeerId === this.localProfile?.id) return;

    if (signalType === 'OFFER') {
      await this.handleIncomingOffer(fromPeerId, payload);
    } else if (signalType === 'ANSWER') {
      await this.handleIncomingAnswer(fromPeerId, payload);
    } else if (signalType === 'ICE') {
      await this.handleIncomingIce(fromPeerId, payload);
    }
  }

  private async handleIncomingOffer(fromPeerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const discovered = this.discoveredPeers.find(p => p.peerId === fromPeerId);
    if (discovered?.ecdhPublicKeyJwk) {
      registerPeerEcdhPublicKey(fromPeerId, discovered.ecdhPublicKeyJwk);
    }

    const friend: PeerFriend = {
      peerId: fromPeerId,
      name: discovered?.name || 'Ван Гог Кот Пир',
      avatarColor: discovered?.avatarColor || 'from-yellow-500 to-amber-600',
      addedAt: Date.now(),
      lastSeenAt: Date.now(),
      status: 'connecting',
      artworkCount: discovered?.artworkCount || 0,
      sharedStorageBytes: 0,
      connectionMethod: 'direct-webrtc',
      latencyMs: 0,
      ecdhPublicKeyJwk: discovered?.ecdhPublicKeyJwk,
      ecdsaPublicKeyJwk: discovered?.ecdsaPublicKeyJwk,
    };

    const pc = new RTCPeerConnection(this.rtcConfig);
    const activeConn: ActiveConnection = {
      pc,
      friend,
      status: 'connecting',
      latencyMs: 0,
    };
    this.activeConnections.set(fromPeerId, activeConn);

    pc.ondatachannel = (event) => {
      activeConn.dc = event.channel;
      this.setupDataChannel(fromPeerId, event.channel, friend);
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        void this.sendSignal(fromPeerId, 'ICE', event.candidate);
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        friend.status = 'online';
        activeConn.status = 'connected';
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        friend.status = 'offline';
        activeConn.status = 'closed';
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await this.sendSignal(fromPeerId, 'ANSWER', answer);
  }

  private async handleIncomingAnswer(fromPeerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const conn = this.activeConnections.get(fromPeerId);
    if (!conn) return;
    try {
      await conn.pc.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (err) {
      console.error('Error setting remote description from answer:', err);
    }
  }

  private async handleIncomingIce(fromPeerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const conn = this.activeConnections.get(fromPeerId);
    if (!conn || !candidate) return;
    try {
      await conn.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (err) {
      console.warn('ICE Candidate addition handled:', err);
    }
  }

  private setupDataChannel(peerId: string, dc: RTCDataChannel, friend: PeerFriend): void {
    dc.onopen = async () => {
      const conn = this.activeConnections.get(peerId);
      if (conn) {
        conn.status = 'connected';
        conn.friend.status = 'online';
      }
      friend.status = 'online';

      if (this.localProfile) {
        const publicKeys = await this.getLocalCryptoKeys();
        dc.send(JSON.stringify({
          type: 'HANDSHAKE',
          senderProfile: this.localProfile,
          payload: {
            ready: true,
            clientTime: Date.now(),
            ecdhPublicKeyJwk: publicKeys.ecdhPublicKeyJwk,
            ecdsaPublicKeyJwk: publicKeys.ecdsaPublicKeyJwk,
          },
          timestamp: Date.now(),
        }));

        dc.send(JSON.stringify({
          type: 'PING',
          senderProfile: this.localProfile,
          payload: { clientTimestamp: Date.now() },
          timestamp: Date.now(),
        }));
      }

      if (this.onPeerConnectedCallback) {
        this.onPeerConnectedCallback(friend);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('p2p_peer_connected', { detail: friend }));
        if (this.localProfile) {
          try {
            dc.send(JSON.stringify({
              type: 'PEER_PRESENCE_ANNOUNCEMENT',
              senderProfile: this.localProfile,
              payload: {
                peerId: this.localProfile.id,
                name: this.localProfile.name,
                timestamp: Date.now(),
              },
              timestamp: Date.now(),
            }));
          } catch (e) {
            console.warn('Failed to send presence announcement:', e);
          }
        }
      }
    };

    dc.onmessage = (event) => {
      if (typeof event.data !== 'string' || event.data.length > MAX_DATACHANNEL_MESSAGE_BYTES) {
        console.warn(`Dropped oversized DataChannel message from ${peerId}`);
        return;
      }
      try {
        const message = JSON.parse(event.data);
        friend.lastSeenAt = Date.now();
        void this.handleIncomingMessage(message, peerId);
      } catch (err) {
        console.error('Error parsing DataChannel message:', err);
      }
    };

    dc.onclose = () => {
      const conn = this.activeConnections.get(peerId);
      if (conn) {
        conn.status = 'closed';
        conn.friend.status = 'offline';
      }
      friend.status = 'offline';
    };

    dc.onerror = (err) => {
      console.warn(`DataChannel error on peer ${peerId}:`, err);
    };
  }

  public createInviteCode(myArtworks: Artwork[]): string {
    if (!this.localProfile) return '';
    const inviteData = {
      peerId: this.localProfile.id,
      name: this.localProfile.name,
      avatarColor: this.localProfile.avatarColor,
      artworksPreview: myArtworks.slice(0, 3).map(a => ({
        id: a.id,
        title: a.title,
        imageUrl: a.imageUrl,
        prompt: a.prompt,
        style: a.style,
      })),
      timestamp: Date.now(),
    };

    return btoa(unescape(encodeURIComponent(JSON.stringify(inviteData))));
  }

  public async connectWithInviteCode(inviteCode: string): Promise<{ friend: PeerFriend; artworks: Artwork[] }> {
    try {
      const decodedStr = decodeURIComponent(escape(atob(inviteCode.trim())));
      const data = JSON.parse(decodedStr);
      const fallbackId = typeof crypto !== 'undefined' && crypto.randomUUID ? `peer_${crypto.randomUUID().slice(0, 8)}` : 'peer_invite';

      const friend: PeerFriend = {
        peerId: data.peerId || fallbackId,
        name: data.name || 'Художник-Кот',
        avatarColor: data.avatarColor || 'from-amber-500 to-yellow-600',
        addedAt: Date.now(),
        lastSeenAt: Date.now(),
        status: 'online',
        artworkCount: (data.artworksPreview || []).length,
        sharedStorageBytes: 0,
        connectionMethod: 'direct-webrtc',
        latencyMs: 12,
      };

      const restoredArtworks: Artwork[] = (data.artworksPreview || [])
        .filter((preview: any) => typeof preview?.imageUrl === 'string' && isSafeImageUri(preview.imageUrl))
        .map((preview: any) => ({
          id: preview.id,
          title: preview.title,
          imageUrl: preview.imageUrl,
          prompt: preview.prompt,
          style: preview.style,
          year: '2026',
          description: `Шедевр из мастерской друга ${data.name}. Импортировано через инвайт-снимок.`,
          palette: [
            { hex: '#f59e0b', name: 'Арльский Жёлтый' },
            { hex: '#1e3a8a', name: 'Синий Сен-Реми' },
          ],
          brushstrokeNote: 'Круговые динамичные мазки мастихином',
          aspectRatio: '1:1',
          createdAt: Date.now(),
          likes: 1,
          authorId: friend.peerId,
          authorName: friend.name,
          source: 'p2p-friend',
          isBackedUpLocally: true,
        }));

      for (const art of restoredArtworks) {
        await saveFriendBackupArtwork(art);
      }

      if (this.onPeerConnectedCallback) {
        this.onPeerConnectedCallback(friend);
      }

      return { friend, artworks: restoredArtworks };
    } catch (err) {
      console.error('Failed to parse invite code:', err);
      throw new Error('Некорректный код приглашения или устаревшая ссылка друга');
    }
  }

  public onTransferProgress(callback: (progress: P2PFileTransferProgress) => void): () => void {
    this.transferProgressListeners.push(callback);
    return () => {
      this.transferProgressListeners = this.transferProgressListeners.filter(cb => cb !== callback);
    };
  }

  private notifyTransferProgress(progress: P2PFileTransferProgress): void {
    for (const listener of this.transferProgressListeners) {
      try {
        listener(progress);
      } catch (err) {
        console.error('Error in transferProgressListener:', err);
      }
    }
  }

  public async sendArtworkStream(targetPeerId: string, artwork: Artwork, chunkSize = 49152): Promise<string> {
    if (!this.localProfile) {
      throw new Error('Local artist profile is not initialized');
    }

    const imgData = artwork.imageUrl;
    const totalBytes = imgData.length;
    const contentHash = await computeSha256(imgData);
    const rawChunks: string[] = [];
    for (let i = 0; i < imgData.length; i += chunkSize) {
      rawChunks.push(imgData.slice(i, i + chunkSize));
    }
    const totalChunks = rawChunks.length;
    const transferId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `tx_${crypto.randomUUID()}`
      : `tx_${Date.now()}`;

    const artworkMeta: Partial<Artwork> = {
      id: artwork.id,
      title: artwork.title,
      prompt: artwork.prompt,
      style: artwork.style,
      year: artwork.year,
      description: artwork.description,
      palette: artwork.palette,
      brushstrokeNote: artwork.brushstrokeNote,
      aspectRatio: artwork.aspectRatio,
      authorId: artwork.authorId || this.localProfile.id,
      authorName: artwork.authorName || this.localProfile.name,
      createdAt: artwork.createdAt || Date.now(),
      likes: artwork.likes || 0,
      contentHash,
    };

    const targetFriend = this.activeConnections.get(targetPeerId)?.friend;
    const peerName = targetFriend ? targetFriend.name : 'Узел сети';

    this.sendDirectMessage(targetPeerId, {
      type: 'ARTWORK_CHUNK_INIT',
      senderProfile: this.localProfile,
      payload: {
        transferId,
        artworkMeta,
        totalChunks,
        totalBytes,
      },
      timestamp: Date.now(),
    });

    this.notifyTransferProgress({
      transferId,
      artworkId: artwork.id,
      artworkTitle: artwork.title,
      direction: 'upload',
      peerId: targetPeerId,
      peerName,
      receivedChunks: 0,
      totalChunks,
      progressPercent: 0,
      bytesTransferred: 0,
      totalBytes,
      speedKbps: 0,
      isComplete: false,
    });

    const startTime = Date.now();

    for (let index = 0; index < totalChunks; index++) {
      const chunkData = rawChunks[index];
      const chunkHash = await computeSha256(chunkData);

      this.sendDirectMessage(targetPeerId, {
        type: 'ARTWORK_CHUNK_DATA',
        senderProfile: this.localProfile,
        payload: {
          transferId,
          chunkIndex: index,
          chunkData,
          chunkHash,
        },
        timestamp: Date.now(),
      });

      const sentBytes = (index + 1) * chunkSize > totalBytes ? totalBytes : (index + 1) * chunkSize;
      const elapsedSec = Math.max(0.1, (Date.now() - startTime) / 1000);
      const speedKbps = Math.round((sentBytes * 8) / (elapsedSec * 1024));
      const progressPercent = Math.min(100, Math.round(((index + 1) / totalChunks) * 100));

      this.notifyTransferProgress({
        transferId,
        artworkId: artwork.id,
        artworkTitle: artwork.title,
        direction: 'upload',
        peerId: targetPeerId,
        peerName,
        receivedChunks: index + 1,
        totalChunks,
        progressPercent,
        bytesTransferred: sentBytes,
        totalBytes,
        speedKbps,
        isComplete: index + 1 === totalChunks,
      });

      await new Promise(r => setTimeout(r, 25));
    }

    return transferId;
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.pollIntervalTimer) clearInterval(this.pollIntervalTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.wsReconnectTimer) clearTimeout(this.wsReconnectTimer);

    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }

    for (const conn of this.activeConnections.values()) {
      try {
        if (conn.dc) conn.dc.close();
        conn.pc.close();
      } catch {}
    }
    this.activeConnections.clear();

    if (this.localProfile && this.sessionToken) {
      fetch('/api/p2p/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify({}),
      }).catch(() => {});
    }
    this.sessionToken = null;
  }
}

export const p2pNetwork = new P2PNetworkManager();
