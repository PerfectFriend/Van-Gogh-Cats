// WebRTC DataChannel & Peer Network Manager
import { ArtistProfile, Artwork, PeerFriend, SignalingPeer, P2PFileTransferProgress } from '../types';
import { saveFriendBackupArtwork } from './p2pStorage';
import { computeSha256 } from './p2pSwarmChunker';

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

interface ActiveConnection {
  pc: RTCPeerConnection;
  dc?: RTCDataChannel;
  friend: PeerFriend;
  status: 'connecting' | 'connected' | 'closed';
  latencyMs: number;
}

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export class P2PNetworkManager {
  private localProfile: ArtistProfile | null = null;
  private onArtworkReceivedCallback?: (artwork: Artwork) => void;
  private onPeerConnectedCallback?: (peer: PeerFriend) => void;
  private onLikeReceivedCallback?: (artworkId: string) => void;
  private channel: BroadcastChannel | null = null;
  private messageListeners: Array<(msg: P2PMessage) => void> = [];
  
  // Real WebRTC peer connections mapped by peerId
  private activeConnections = new Map<string, ActiveConnection>();
  private discoveredPeers: SignalingPeer[] = [];
  private discoveredPeersListeners: Array<(peers: SignalingPeer[]) => void> = [];
  private pollIntervalTimer: any = null;
  private heartbeatTimer: any = null;
  private myArtworksCount: number = 0;

  // File Transfer (Chunk streaming) State
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
        this.handleIncomingMessage(event.data);
      };
    }
  }

  private handleIncomingMessage(message: P2PMessage) {
    if (!message || !message.type) return;

    // Handle internal latency ping/pong
    if (message.type === 'PING') {
      this.sendDirectMessage(message.senderProfile.id, {
        type: 'PONG',
        senderProfile: this.localProfile!,
        payload: { echoTimestamp: message.payload?.clientTimestamp },
        timestamp: Date.now(),
      });
      return;
    }

    if (message.type === 'PONG') {
      const sentTime = message.payload?.echoTimestamp;
      if (sentTime) {
        const roundtrip = Date.now() - sentTime;
        const conn = this.activeConnections.get(message.senderProfile.id);
        if (conn) {
          conn.latencyMs = Math.max(1, Math.round(roundtrip / 2));
          conn.friend.latencyMs = conn.latencyMs;
        }
      }
      return;
    }

    // --- REAL P2P FILE TRANSFER & CHUNK REPLICATION PROTOCOL ---
    if (message.type === 'ARTWORK_CHUNK_INIT') {
      const { transferId, artworkMeta, totalChunks, totalBytes } = message.payload;
      this.incomingTransfers.set(transferId, {
        artworkMeta,
        chunks: new Array(totalChunks).fill(''),
        receivedCount: 0,
        totalChunks,
        totalBytes,
        startTime: Date.now(),
        senderPeerId: message.senderProfile.id,
        senderName: message.senderProfile.name,
      });

      this.notifyTransferProgress({
        transferId,
        artworkId: artworkMeta.id,
        artworkTitle: artworkMeta.title || 'Новое полотно',
        direction: 'download',
        peerId: message.senderProfile.id,
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
      const { transferId, chunkIndex, chunkData, chunkHash } = message.payload;
      const transfer = this.incomingTransfers.get(transferId);
      if (transfer) {
        if (!transfer.chunks[chunkIndex]) {
          transfer.chunks[chunkIndex] = chunkData;
          transfer.receivedCount++;

          const elapsedSec = Math.max(0.1, (Date.now() - transfer.startTime) / 1000);
          const bytesSoFar = transfer.chunks.reduce((acc, c) => acc + (c ? c.length : 0), 0);
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

          // Send ACK back to sender
          this.sendDirectMessage(transfer.senderPeerId, {
            type: 'ARTWORK_CHUNK_ACK',
            senderProfile: this.localProfile!,
            payload: { transferId, chunkIndex, receivedCount: transfer.receivedCount },
            timestamp: Date.now(),
          });

          // Check if all chunks received: assemble & replicate
          if (transfer.receivedCount === transfer.totalChunks) {
            const assembledImageUrl = transfer.chunks.join('');
            const completeArtwork: Artwork = {
              ...(transfer.artworkMeta as Artwork),
              imageUrl: assembledImageUrl,
              source: 'p2p-friend',
              isBackedUpLocally: true,
              originPeerId: transfer.senderPeerId,
              authorId: transfer.artworkMeta.authorId || transfer.senderPeerId,
              authorName: transfer.artworkMeta.authorName || transfer.senderName,
              createdAt: transfer.artworkMeta.createdAt || Date.now(),
            };

            // Save to IndexedDB Mutual Backup
            saveFriendBackupArtwork(completeArtwork).then(() => {
              console.log(`[P2P] Mutual backup completed for "${completeArtwork.title}" from peer ${transfer.senderName}`);
            });

            // Trigger incoming art callback
            if (this.onArtworkReceivedCallback) {
              this.onArtworkReceivedCallback(completeArtwork);
            }

            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('p2p:artwork_replicated', { detail: completeArtwork }));
            }

            this.incomingTransfers.delete(transferId);
          }
        }
      }
      return;
    }

    if (message.type === 'ARTWORK_CHUNK_ACK') {
      const { transferId, chunkIndex, receivedCount } = message.payload;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('p2p:chunk_ack', { detail: { transferId, chunkIndex, receivedCount } }));
      }
      return;
    }

    // Pass to all registered event listeners
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

  // Broadcast message over all direct WebRTC DataChannels AND BroadcastChannel (mesh distribution)
  public broadcastMessage(message: P2PMessage): void {
    const serialized = JSON.stringify(message);

    // 1. Direct WebRTC DataChannels
    for (const conn of this.activeConnections.values()) {
      if (conn.dc && conn.dc.readyState === 'open') {
        try {
          conn.dc.send(serialized);
        } catch (err) {
          console.warn(`WebRTC DataChannel send error to ${conn.friend.name}:`, err);
        }
      }
    }

    // 2. BroadcastChannel for same-origin tabs
    if (this.channel) {
      try {
        this.channel.postMessage(message);
      } catch (err) {
        console.warn('BroadcastChannel error:', err);
      }
    }

    // 3. Local dispatch
    this.handleIncomingMessage(message);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('p2p_network_message', { detail: message }));
    }
  }

  // Send direct message specifically to one peer
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
    // Fallback to broadcast
    this.broadcastMessage(message);
  }

  // Initialize P2P manager with user profile and start signaling loop
  public async init(
    profile: ArtistProfile,
    onArtworkReceived: (artwork: Artwork) => void,
    onPeerConnected: (peer: PeerFriend) => void,
    onLikeReceived: (artworkId: string) => void,
    artworksCount = 0
  ) {
    this.localProfile = profile;
    this.onArtworkReceivedCallback = onArtworkReceived;
    this.onPeerConnectedCallback = onPeerConnected;
    this.onLikeReceivedCallback = onLikeReceived;
    this.myArtworksCount = artworksCount;

    // Register with backend signaling relay
    await this.registerWithSignalingServer();

    // Start polling for WebRTC offers, answers & ICE candidates
    this.startSignalingPolling();
  }

  private async registerWithSignalingServer(): Promise<void> {
    if (!this.localProfile) return;
    try {
      const res = await fetch('/api/p2p/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId: this.localProfile.id,
          name: this.localProfile.name,
          avatarColor: this.localProfile.avatarColor,
          artworkCount: this.myArtworksCount,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.onlinePeers) {
          this.updateDiscoveredPeers(data.onlinePeers);
        }
      }
    } catch (err) {
      console.warn('Signaling server registration retry in progress:', err);
    }
  }

  private startSignalingPolling(): void {
    if (this.pollIntervalTimer) clearInterval(this.pollIntervalTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    // Poll for signals every 1.5s
    this.pollIntervalTimer = setInterval(async () => {
      if (!this.localProfile) return;
      try {
        const res = await fetch(`/api/p2p/signal/poll/${this.localProfile.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.signals && data.signals.length > 0) {
          for (const sig of data.signals) {
            await this.handleIncomingSignal(sig);
          }
        }
      } catch {
        // Silent poll error handling
      }
    }, 1500);

    // Refresh online peer list & send heartbeat every 6s
    this.heartbeatTimer = setInterval(async () => {
      if (!this.localProfile) return;
      try {
        const [peersRes] = await Promise.all([
          fetch(`/api/p2p/peers?currentPeerId=${this.localProfile.id}`),
          fetch('/api/p2p/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              peerId: this.localProfile.id,
              artworkCount: this.myArtworksCount,
            }),
          }),
        ]);

        if (peersRes.ok) {
          const data = await peersRes.json();
          if (data.peers) {
            this.updateDiscoveredPeers(data.peers);
          }
        }
      } catch {
        // Silent heartbeat catch
      }
    }, 6000);
  }

  private updateDiscoveredPeers(peers: SignalingPeer[]): void {
    if (!this.localProfile) return;
    const filtered = peers.filter(p => p.peerId !== this.localProfile?.id);
    this.discoveredPeers = filtered;
    for (const listener of this.discoveredPeersListeners) {
      listener(filtered);
    }
  }

  // Send signaling message via relay
  private async sendSignal(toPeerId: string, signalType: 'OFFER' | 'ANSWER' | 'ICE', payload: any): Promise<void> {
    if (!this.localProfile) return;
    try {
      await fetch('/api/p2p/signal/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromPeerId: this.localProfile.id,
          toPeerId,
          signalType,
          payload,
        }),
      });
    } catch (err) {
      console.error('Failed to send WebRTC signal:', err);
    }
  }

  // Connect to an online peer discovered via signaling relay
  public async connectToDiscoveredPeer(targetPeer: SignalingPeer): Promise<PeerFriend> {
    if (!this.localProfile) {
      throw new Error('Локальный профиль не инициализирован');
    }

    const targetPeerId = targetPeer.peerId;
    // Check if already active
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
      sharedStorageBytes: 1024 * 512,
      connectionMethod: 'direct-webrtc',
      latencyMs: 0,
    };

    const pc = new RTCPeerConnection(RTC_CONFIG);
    const dc = pc.createDataChannel('vangogh-p2p', { ordered: true });

    const activeConn: ActiveConnection = {
      pc,
      dc,
      friend,
      status: 'connecting',
      latencyMs: 0,
    };
    this.activeConnections.set(targetPeerId, activeConn);

    // Setup DataChannel handlers
    this.setupDataChannel(targetPeerId, dc, friend);

    // ICE Candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal(targetPeerId, 'ICE', event.candidate);
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

    // Create SDP Offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this.sendSignal(targetPeerId, 'OFFER', offer);

    return friend;
  }

  // Handle incoming signaling messages
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
    const friend: PeerFriend = {
      peerId: fromPeerId,
      name: discovered?.name || 'Ван Гог Кот Пир',
      avatarColor: discovered?.avatarColor || 'from-yellow-500 to-amber-600',
      addedAt: Date.now(),
      lastSeenAt: Date.now(),
      status: 'connecting',
      artworkCount: discovered?.artworkCount || 0,
      sharedStorageBytes: 1024 * 512,
      connectionMethod: 'direct-webrtc',
      latencyMs: 0,
    };

    const pc = new RTCPeerConnection(RTC_CONFIG);
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
        this.sendSignal(fromPeerId, 'ICE', event.candidate);
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

  // Setup WebRTC DataChannel listeners
  private setupDataChannel(peerId: string, dc: RTCDataChannel, friend: PeerFriend): void {
    dc.onopen = () => {
      const conn = this.activeConnections.get(peerId);
      if (conn) {
        conn.status = 'connected';
        conn.friend.status = 'online';
      }
      friend.status = 'online';

      // Send initial handshake
      if (this.localProfile) {
        dc.send(JSON.stringify({
          type: 'HANDSHAKE',
          senderProfile: this.localProfile,
          payload: { ready: true, clientTime: Date.now() },
          timestamp: Date.now(),
        }));

        // Measure initial latency with ping
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
        // Announce presence over the newly opened direct channel so queued custody envelopes can be delivered
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
      try {
        const message: P2PMessage = JSON.parse(event.data);
        friend.lastSeenAt = Date.now();
        this.handleIncomingMessage(message);
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

  // Create an invitation payload (manual snapshot code)
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

  // Connect to friend using their invite code
  public async connectWithInviteCode(inviteCode: string): Promise<{ friend: PeerFriend; artworks: Artwork[] }> {
    try {
      const decodedStr = decodeURIComponent(escape(atob(inviteCode.trim())));
      const data = JSON.parse(decodedStr);

      const friend: PeerFriend = {
        peerId: data.peerId || 'peer_' + Math.random().toString(36).substring(2, 9),
        name: data.name || 'Художник-Кот',
        avatarColor: data.avatarColor || 'from-amber-500 to-yellow-600',
        addedAt: Date.now(),
        lastSeenAt: Date.now(),
        status: 'online',
        artworkCount: (data.artworksPreview || []).length,
        sharedStorageBytes: 1024 * 350,
        connectionMethod: 'direct-webrtc',
        latencyMs: 12,
      };

      const restoredArtworks: Artwork[] = (data.artworksPreview || []).map((preview: any) => ({
        id: preview.id,
        title: preview.title,
        imageUrl: preview.imageUrl,
        prompt: preview.prompt,
        style: preview.style,
        year: '2026',
        description: `Шедевр из мастерской друга ${data.name}. Передан по P2P-каналу.`,
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

      // Automatically store in mutual backup storage
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

  // Real WebRTC chunk streamer for sending an artwork in 48KB segments
  public async sendArtworkStream(targetPeerId: string, artwork: Artwork, chunkSize = 49152): Promise<string> {
    if (!this.localProfile) {
      throw new Error('Local artist profile is not initialized');
    }

    const imgData = artwork.imageUrl;
    const totalBytes = imgData.length;
    const rawChunks: string[] = [];
    for (let i = 0; i < imgData.length; i += chunkSize) {
      rawChunks.push(imgData.slice(i, i + chunkSize));
    }
    const totalChunks = rawChunks.length;
    const transferId = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Send INIT message
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

    // 2. Send chunks with controlled backpressure pacing
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

      // Brief delay to allow DataChannel buffers not to clog
      await new Promise(r => setTimeout(r, 25));
    }

    return transferId;
  }

  // Gracefully leave network and close all channels
  public destroy(): void {
    if (this.pollIntervalTimer) clearInterval(this.pollIntervalTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    for (const conn of this.activeConnections.values()) {
      try {
        if (conn.dc) conn.dc.close();
        conn.pc.close();
      } catch {}
    }
    this.activeConnections.clear();

    if (this.localProfile) {
      fetch('/api/p2p/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ peerId: this.localProfile.id }),
      }).catch(() => {});
    }
  }
}

export const p2pNetwork = new P2PNetworkManager();

