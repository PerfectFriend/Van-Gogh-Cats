import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Share2, 
  Download, 
  ShieldCheck, 
  HardDrive, 
  Sparkles, 
  QrCode, 
  Copy, 
  Check, 
  Heart, 
  AlertTriangle,
  UserCheck,
  RefreshCw,
  Eye,
  Info,
  Gavel,
  ShieldAlert,
  ThumbsUp,
  ThumbsDown,
  Ban,
  MessageSquare,
  Lock,
  Paintbrush,
  Boxes,
  Award,
  Radio,
  Wifi,
  Zap,
  Server,
  Terminal,
  Network
} from 'lucide-react';
import { Artwork, ArtistProfile, PeerFriend, PeerDispute, VerificationProposal, SignalingPeer } from '../types';
import { p2pNetwork } from '../utils/p2pNetwork';
import { calculateStorageUsage, getFriendBackupArtworks, saveFriendBackupArtwork } from '../utils/p2pStorage';
import { exportCatPack, saveArtistProfile } from '../utils/p2pCrypto';
import { getPeerDisputes, castAuditorVote, calculateAuditorWeight } from '../utils/p2pDispute';
import { generateCatSwarmArchive, downloadCatArchiveFile, parseAndValidateCatArchive } from '../utils/p2pArchiveEngine';
import { P2PChatView } from './P2PChatView';
import { P2PCollaborativeCanvas } from './P2PCollaborativeCanvas';
import { P2PSwarmChunkerView } from './P2PSwarmChunkerView';
import { P2PWebOfTrustView } from './P2PWebOfTrustView';
import { P2PStorageQuotaView } from './P2PStorageQuotaView';
import { useTranslation } from '../context/LanguageContext';
import { INITIAL_MASTERPIECES } from '../data/masterpieces';

interface P2PNetworkHubProps {
  artistProfile: ArtistProfile;
  myArtworks: Artwork[];
  onProfileUpdate: (updated: ArtistProfile) => void;
  onAddArtworksFromPeer: (artworks: Artwork[]) => void;
  onSelectArtwork: (artwork: Artwork) => void;
  onLikeArtwork: (id: string) => void;
  onPurgeCondemnedArtwork?: (artworkId: string) => void;
}

export const P2PNetworkHub: React.FC<P2PNetworkHubProps> = ({
  artistProfile,
  myArtworks,
  onProfileUpdate,
  onAddArtworksFromPeer,
  onSelectArtwork,
  onLikeArtwork,
  onPurgeCondemnedArtwork,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'network' | 'friends' | 'chat' | 'collab' | 'swarm' | 'wot' | 'storage' | 'disputes' | 'catguardian'>('network');
  const [chatSelectedFriendId, setChatSelectedFriendId] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string>('');
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState<string | null>(null);
  const [discoveredPeers, setDiscoveredPeers] = useState<SignalingPeer[]>([]);
  const [connectingPeerId, setConnectingPeerId] = useState<string | null>(null);

  // LAN Multi-Host info (Ubuntu / Local Network dual-node sync)
  const [lanInfo, setLanInfo] = useState<{ lanIps: string[]; port: number; primaryUrl: string; hostname: string } | null>(null);
  const [copiedLanUrl, setCopiedLanUrl] = useState(false);

  // Storage Stats
  const [storageInfo, setStorageInfo] = useState<{ usedBytes: number; approximateMB: string }>({
    usedBytes: 0,
    approximateMB: '0 МБ',
  });
  const [backupArtworks, setBackupArtworks] = useState<Artwork[]>([]);

  // Inline artist name edit & feedback state (replaces window.alert/prompt)
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState(artistProfile.name);
  const [nameEditError, setNameEditError] = useState<string | null>(null);

  // Disputes & Peer Jury Audit
  const [disputes, setDisputes] = useState<PeerDispute[]>([]);
  const [votingDisputeId, setVotingDisputeId] = useState<string | null>(null);
  const [voteFeedback, setVoteFeedback] = useState<{ disputeId: string; message: string; type: 'success' | 'warn' } | null>(null);
  const [activeProposal, setActiveProposal] = useState<VerificationProposal | null>(null);

  // Peer friends list
  const [friends, setFriends] = useState<PeerFriend[]>(() => {
    const saved = localStorage.getItem('vangogh_p2p_friends');
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [
      {
        peerId: 'peer_theo_vangogh',
        name: 'Тео Ван Гог (Парижский салон)',
        avatarColor: 'from-blue-600 to-indigo-900',
        addedAt: Date.now() - 3600000 * 24,
        lastSeenAt: Date.now() - 1000 * 60 * 5,
        status: 'online',
        artworkCount: 3,
        sharedStorageBytes: 1024 * 720,
        connectionMethod: 'direct-webrtc',
        isAuditor: true,
      },
      {
        peerId: 'peer_arles_cat',
        name: 'Арльский Мурлыка',
        avatarColor: 'from-emerald-600 to-teal-800',
        addedAt: Date.now() - 3600000 * 12,
        lastSeenAt: Date.now() - 1000 * 60 * 15,
        status: 'online',
        artworkCount: 2,
        sharedStorageBytes: 1024 * 480,
        connectionMethod: 'direct-webrtc',
        isAuditor: true,
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('vangogh_p2p_friends', JSON.stringify(friends));
  }, [friends]);

  useEffect(() => {
    setInviteCode(p2pNetwork.createInviteCode(myArtworks));
  }, [myArtworks]);

  useEffect(() => {
    calculateStorageUsage().then(setStorageInfo);
    getFriendBackupArtworks().then(setBackupArtworks);
    setDisputes(getPeerDisputes());

    // Fetch LAN info for dual Ubuntu host connectivity (dev/local only; returns 404 in production)
    fetch('/api/network/lan-info')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success) setLanInfo(data);
      })
      .catch(() => {});

    // Listen for verification proposals triggered across the peer network
    const handleProposalEvent = (e: any) => {
      if (e.detail) {
        setActiveProposal(e.detail);
        setDisputes(getPeerDisputes());
      }
    };

    // Listen for condemned broadcast events
    const handleCondemnedEvent = (e: any) => {
      setDisputes(getPeerDisputes());
      if (e.detail?.artworkId && onPurgeCondemnedArtwork) {
        onPurgeCondemnedArtwork(e.detail.artworkId);
      }
      setBackupArtworks(prev => prev.filter(a => a.id !== e.detail?.artworkId));
      calculateStorageUsage().then(setStorageInfo);
    };

    window.addEventListener('p2p:verification_proposal', handleProposalEvent);
    window.addEventListener('p2p:artwork_condemned', handleCondemnedEvent);

    // Subscribe to live WebRTC discovered peers from signaling relay
    const unsubDiscovered = p2pNetwork.onDiscoveredPeersChange((peers) => {
      setDiscoveredPeers(peers);
    });

    // Handle peer successfully connected over true WebRTC DataChannel
    const handlePeerConnected = (e: any) => {
      if (e.detail) {
        const newPeer: PeerFriend = e.detail;
        setFriends(prev => {
          const filtered = prev.filter(f => f.peerId !== newPeer.peerId);
          return [{ ...newPeer, status: 'online' }, ...filtered];
        });
        setConnectionSuccess(`Установлено прямое P2P соединение WebRTC с художником: ${newPeer.name}!`);
      }
    };
    window.addEventListener('p2p_peer_connected', handlePeerConnected);

    // Handle artwork streamed & replicated via WebRTC chunk transfer
    const handleArtworkReplicated = (e: any) => {
      if (e.detail) {
        const newArtwork: Artwork = e.detail;
        onAddArtworksFromPeer([newArtwork]);
        setBackupArtworks(prev => {
          const exists = prev.some(a => a.id === newArtwork.id);
          return exists ? prev : [newArtwork, ...prev];
        });
        calculateStorageUsage().then(setStorageInfo);
        setConnectionSuccess(`Полотно «${newArtwork.title}» получено по WebRTC DataChannel и сохранено в локальную базу взаимной репликации!`);
      }
    };
    window.addEventListener('p2p:artwork_replicated', handleArtworkReplicated);

    return () => {
      window.removeEventListener('p2p:verification_proposal', handleProposalEvent);
      window.removeEventListener('p2p:artwork_condemned', handleCondemnedEvent);
      window.removeEventListener('p2p_peer_connected', handlePeerConnected);
      window.removeEventListener('p2p:artwork_replicated', handleArtworkReplicated);
      unsubDiscovered();
    };
  }, [artistProfile, onPurgeCondemnedArtwork, onAddArtworksFromPeer]);

  const handleConnectDiscoveredPeer = async (peer: SignalingPeer) => {
    setConnectingPeerId(peer.peerId);
    setConnectionError(null);
    setConnectionSuccess(null);

    try {
      const friend = await p2pNetwork.connectToDiscoveredPeer(peer);
      setFriends(prev => {
        const filtered = prev.filter(f => f.peerId !== friend.peerId);
        return [friend, ...filtered];
      });
      setConnectionSuccess(`Инициирован WebRTC handshake с пиром ${peer.name}. Ожидание открытия прямого DataChannel...`);
    } catch (err: any) {
      setConnectionError(err.message || 'Ошибка WebRTC подключения к выбранному пиру');
    } finally {
      setConnectingPeerId(null);
    }
  };

  const handleCopyInvite = () => {
    if (!inviteCode) return;
    navigator.clipboard.writeText(inviteCode);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleExportArchive = async () => {
    try {
      const allToExport = [...myArtworks, ...backupArtworks];
      const archive = await generateCatSwarmArchive(allToExport, artistProfile);
      downloadCatArchiveFile(archive);
      setConnectionSuccess(`Полный P2P-архив (.vangoghcat) успешно создан с криптографическим Merkle Root: ${archive.merkleMasterRoot.slice(0, 16)}...`);
    } catch (err: any) {
      setConnectionError(err.message || 'Ошибка создания архива');
    }
  };

  const handleImportArchive = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await parseAndValidateCatArchive(text);
      if (!result.valid || result.artworks.length === 0) {
        throw new Error(result.error || 'Не удалось распознать картины в архиве');
      }

      onAddArtworksFromPeer(result.artworks);
      for (const art of result.artworks) {
        await saveFriendBackupArtwork(art);
      }
      setBackupArtworks(prev => [...result.artworks, ...prev]);
      calculateStorageUsage().then(setStorageInfo);
      setConnectionSuccess(`Архив мастера ${result.authorName} успешно восстановлен! Загружено картин: ${result.artworks.length}. Проверено по Merkle Root.`);
    } catch (err: any) {
      setConnectionError(err.message || 'Ошибка чтения файла архива');
    } finally {
      e.target.value = '';
    }
  };

  const handleConnectFriend = async () => {
    if (!friendCodeInput.trim()) return;
    setIsConnecting(true);
    setConnectionError(null);
    setConnectionSuccess(null);

    try {
      const { friend, artworks } = await p2pNetwork.connectWithInviteCode(friendCodeInput.trim());
      
      setFriends(prev => {
        const filtered = prev.filter(f => f.peerId !== friend.peerId);
        return [friend, ...filtered];
      });

      if (artworks.length > 0) {
        onAddArtworksFromPeer(artworks);
        setBackupArtworks(prev => [...artworks, ...prev]);
      }

      setConnectionSuccess(`Успешно подключен друг: ${friend.name}! Получено картин: ${artworks.length}. Резервная копия сохранена на вашем устройстве.`);
      setFriendCodeInput('');
      calculateStorageUsage().then(setStorageInfo);
    } catch (err: any) {
      setConnectionError(err.message || 'Ошибка соединения с пиром');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleStartEditName = () => {
    if (artistProfile.isBannedReadOnly) {
      setNameEditError('Ваш профиль находится в режиме ТОЛЬКО ЧТЕНИЕ по вердикту локальной коллегии.');
      setTimeout(() => setNameEditError(null), 5000);
      return;
    }
    setEditingNameValue(artistProfile.name);
    setNameEditError(null);
    setIsEditingName(true);
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = editingNameValue.trim();
    if (!trimmed) {
      setNameEditError('Введите непустое имя художника');
      return;
    }
    const updated = { ...artistProfile, name: trimmed };
    onProfileUpdate(updated);
    saveArtistProfile(updated);
    setIsEditingName(false);
    setNameEditError(null);
  };

  const handleVote = async (disputeId: string, voteType: 'confirm' | 'reject') => {
    setVotingDisputeId(disputeId);
    setVoteFeedback(null);
    try {
      const result = await castAuditorVote(disputeId, artistProfile.id, voteType, artistProfile);
      setDisputes(getPeerDisputes());

      if (result.actionTaken === 'condemned') {
        // Purge locally
        if (onPurgeCondemnedArtwork) {
          onPurgeCondemnedArtwork(result.dispute.artworkId);
        }
        setBackupArtworks(prev => prev.filter(a => a.id !== result.dispute.artworkId));
        calculateStorageUsage().then(setStorageInfo);
      }

      setVoteFeedback({
        disputeId,
        message: result.message,
        type: result.actionTaken === 'already_voted' ? 'warn' : 'success',
      });
    } catch (err: any) {
      setVoteFeedback({
        disputeId,
        message: err.message || 'Ошибка голосования аудитора',
        type: 'warn',
      });
    } finally {
      setVotingDisputeId(null);
    }
  };

  const pendingDisputesCount = disputes.filter(d => d.status === 'pending').length;

  return (
    <section className="cyber-gaudi-card mb-12 p-5 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Dynamic swirling background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Banner with Artist Passport */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-indigo-900/50 relative z-10">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${artistProfile.avatarColor} p-1 shadow-lg flex items-center justify-center border-2 ${artistProfile.isBannedReadOnly ? 'border-red-500 shadow-[0_0_15px_rgba(247,37,133,0.5)]' : 'border-cyan-400 shadow-[0_0_20px_rgba(0,245,212,0.35)]'} shrink-0`}>
            <span className="text-3xl">{artistProfile.isBannedReadOnly ? '🛑' : '🐱'}</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {artistProfile.isBannedReadOnly ? (
                <span className="cyber-badge-magenta flex items-center gap-1 font-cyber">
                  <Ban className="w-3 h-3 text-white" />
                  РЕЖИМ: ТОЛЬКО ЧТЕНИЕ (БАН НАВСЕГДА)
                </span>
              ) : (
                <span className="cyber-badge-cyan flex items-center gap-1.5 font-cyber">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  P2P Узел Активен • Аудитор Сети
                </span>
              )}
              <span className="text-[11px] text-cyan-300 font-mono">
                ID: {artistProfile.id.substring(0, 8)}...
              </span>
            </div>
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2 mt-1.5 flex-wrap">
                <input
                  type="text"
                  value={editingNameValue}
                  onChange={(e) => setEditingNameValue(e.target.value)}
                  maxLength={40}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-cyan-500/60 text-sm text-amber-100 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingName(false);
                    setNameEditError(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  Отмена
                </button>
              </form>
            ) : (
              <h2 className="text-xl sm:text-2xl font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-cyan-300 flex items-center gap-2 mt-1">
                {artistProfile.name}
                {!artistProfile.isBannedReadOnly && (
                  <button
                    onClick={handleStartEditName}
                    className="text-xs text-amber-300 hover:text-yellow-200 underline font-sans font-normal ml-2 cursor-pointer"
                  >
                    (изменить)
                  </button>
                )}
              </h2>
            )}
            {nameEditError && (
              <p className="text-xs text-rose-400 mt-1">{nameEditError}</p>
            )}
            {artistProfile.isBannedReadOnly ? (
              <p className="text-xs text-red-300 mt-0.5 font-medium">
                Причина: {artistProfile.bannedReason || 'Нарушение правил сообщества подтверждено кворумом 2:1'}
              </p>
            ) : (
              <p className="text-xs text-cyan-200/80 mt-0.5">
                Хранилище пира: <strong className="text-amber-300 font-cyber">{storageInfo.approximateMB}</strong> • Резервных копий друзей: <strong className="text-cyan-300 font-cyber">{backupArtworks.length}</strong>
              </p>
            )}
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => exportCatPack(artistProfile, myArtworks)}
            className="cyber-btn-cobalt px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-300" />
            <span>{t.p2pExportPack}</span>
          </button>
          <button
            onClick={handleCopyInvite}
            className="cyber-btn-gold px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 cursor-pointer"
          >
            {copiedInvite ? <Check className="w-4 h-4 text-slate-950" /> : <Share2 className="w-4 h-4 text-slate-950" />}
            <span>{copiedInvite ? t.p2pCopiedInvite : t.p2pCopyInvite}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mt-6 border-b border-indigo-900/50 pb-3 relative z-10">
        <button
          onClick={() => setActiveTab('network')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'network'
              ? 'cyber-btn-gold font-bold shadow-md'
              : 'text-cyan-200 hover:text-cyan-100 bg-[#0a0f30]/80 border border-indigo-700/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{t.p2pTabNetwork}</span>
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'friends'
              ? 'cyber-btn-gold font-bold shadow-md'
              : 'text-cyan-200 hover:text-cyan-100 bg-[#0a0f30]/80 border border-indigo-700/50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{t.p2pTabFriends} ({friends.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'chat'
              ? 'cyber-btn-gold font-bold shadow-md'
              : 'text-cyan-200 hover:text-cyan-100 bg-[#0a0f30]/80 border border-indigo-700/50'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-cyan-300" />
          <span>{t.p2pTabChat}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/50 text-[10px] font-mono">
            E2EE
          </span>
        </button>
        <button
          onClick={() => setActiveTab('collab')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'collab'
              ? 'cyber-btn-gold font-bold shadow-md'
              : 'text-cyan-200 hover:text-cyan-100 bg-[#0a0f30]/80 border border-indigo-700/50'
          }`}
        >
          <Paintbrush className="w-4 h-4 text-yellow-300" />
          <span>{t.p2pTabCollab}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-yellow-300 border border-yellow-400/40 text-[10px] font-cyber">
            Live P2P
          </span>
        </button>
        <button
          onClick={() => setActiveTab('swarm')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'swarm'
              ? 'cyber-btn-gold font-bold shadow-md'
              : 'text-cyan-200 hover:text-cyan-100 bg-[#0a0f30]/80 border border-indigo-700/50'
          }`}
        >
          <Boxes className="w-4 h-4 text-cyan-400" />
          <span>{t.p2pTabSwarm}</span>
        </button>
        <button
          onClick={() => setActiveTab('wot')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'wot'
              ? 'cyber-btn-gold font-bold shadow-md'
              : 'text-cyan-200 hover:text-cyan-100 bg-[#0a0f30]/80 border border-indigo-700/50'
          }`}
        >
          <Award className="w-4 h-4 text-fuchsia-400" />
          <span>{t.p2pTabWot}</span>
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'disputes'
              ? 'cyber-btn-gold font-bold shadow-md'
              : 'text-cyan-200 hover:text-cyan-100 bg-[#0a0f30]/80 border border-indigo-700/50'
          }`}
        >
          <Gavel className="w-4 h-4" />
          <span>{t.p2pTabDisputes}</span>
          {pendingDisputesCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {pendingDisputesCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('storage')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'storage'
              ? 'cyber-btn-gold font-bold shadow-md'
              : 'text-cyan-200 hover:text-cyan-100 bg-[#0a0f30]/80 border border-indigo-700/50'
          }`}
        >
          <HardDrive className="w-4 h-4" />
          <span>{t.p2pTabStorage} ({backupArtworks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('catguardian')}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeTab === 'catguardian'
              ? 'cyber-btn-gold font-bold shadow-md'
              : 'text-cyan-200 hover:text-cyan-100 bg-[#0a0f30]/80 border border-indigo-700/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{t.p2pTabCatGuardian}</span>
        </button>
      </div>

      {/* Tab 1: P2P Handshake & Add Friend */}
      {activeTab === 'network' && (
        <div className="mt-6 space-y-6">
          {/* Ubuntu / LAN Dual-Host Direct Synchronization Card */}
          {lanInfo && (
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-950/70 via-slate-900/90 to-blue-950/70 border border-cyan-500/40 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                    <Server className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-cyan-100 flex items-center gap-2">
                      <span>Синхронизация хостов Ubuntu в локальной сети (LAN / Dual-Host)</span>
                      <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700 text-[10px] font-mono">
                        RC-Ready
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300">
                      Откройте этот адрес на втором компьютере Ubuntu для прямого соединения без сторонних серверов:
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (lanInfo.primaryUrl) {
                        navigator.clipboard.writeText(lanInfo.primaryUrl);
                        setCopiedLanUrl(true);
                        setTimeout(() => setCopiedLanUrl(false), 2000);
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    {copiedLanUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLanUrl ? 'Скопировано!' : 'Скопировать URL узла'}</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
                <span className="text-slate-400">Локальный адрес узла:</span>
                <span className="px-2.5 py-1 rounded-lg bg-slate-950 border border-cyan-500/30 text-cyan-300 font-bold select-all">
                  {lanInfo.primaryUrl}
                </span>
                {lanInfo.lanIps.length > 1 && (
                  <span className="text-[11px] text-slate-400">
                    (Дополнительные IP: {lanInfo.lanIps.slice(1).join(', ')})
                  </span>
                )}
                <span className="ml-auto text-slate-500 text-[11px] flex items-center gap-1">
                  <Terminal className="w-3 h-3 text-cyan-400" /> Хост: {lanInfo.hostname}
                </span>
              </div>
            </div>
          )}

          {/* Live WebRTC Signaling Discovery Room */}
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-amber-500/20 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-100 flex items-center gap-2">
                    <span>Живой поиск художников в сети (WebRTC Signaling)</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Live Relay
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Автоматический поиск доступных пиров через STUN-серверы Google. Подключайтесь в 1 клик без ручного копирования кодов!
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-amber-400/80 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
                  Онлайн в комнате: <strong>{discoveredPeers.length + 1}</strong>
                </span>
              </div>
            </div>

            {/* Discovered Peers List */}
            {discoveredPeers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {discoveredPeers.map((peer) => {
                  const alreadyFriend = friends.find(f => f.peerId === peer.peerId);
                  const isDirectConnected = alreadyFriend?.status === 'online';
                  const isThisConnecting = connectingPeerId === peer.peerId;

                  return (
                    <div
                      key={peer.peerId}
                      className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${peer.avatarColor} flex items-center justify-center text-white font-bold text-base shadow-md flex-shrink-0`}>
                          {(peer?.name && peer.name[0]) ? peer.name[0].toUpperCase() : 'К'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-100 truncate">{peer.name}</p>
                          <p className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            Картин в галерее: {peer.artworkCount}
                          </p>
                        </div>
                      </div>

                      <div className="pt-1">
                        {isDirectConnected ? (
                          <div className="w-full py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px] font-medium flex items-center justify-center gap-1.5">
                            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                            <span>WebRTC DataChannel открыт {alreadyFriend?.latencyMs ? `(${alreadyFriend.latencyMs} мс)` : ''}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleConnectDiscoveredPeer(peer)}
                            disabled={isThisConnecting}
                            className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow transition active:scale-95 disabled:opacity-50 cursor-pointer"
                          >
                            {isThisConnecting ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>WebRTC Handshake...</span>
                              </>
                            ) : (
                              <>
                                <Zap className="w-3.5 h-3.5 text-slate-950 fill-current" />
                                <span>Подключиться по WebRTC</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-center space-y-1">
                <p className="text-xs text-amber-200/90 font-medium">
                  В сигнальной комнате пока нет других устройств
                </p>
                <p className="text-[11px] text-slate-400 max-w-lg mx-auto">
                  Откройте приложение во второй вкладке браузера или на другом устройстве — пир появится здесь автоматически через 1-2 секунды для мгновенного WebRTC соединения без центрального сервера!
                </p>
              </div>
            )}
          </div>

          {/* Fallback & Manual P2P Invite Handshake */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-amber-400" />
                {t.p2pInviteCodeTitle}
              </h3>
              <p className="text-xs text-slate-400">
                {t.p2pStorageDesc}
              </p>
              <div className="relative">
                <textarea
                  readOnly
                  value={inviteCode}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-amber-300 resize-none focus:outline-none"
                />
                <button
                  onClick={handleCopyInvite}
                  className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                >
                  {copiedInvite ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedInvite ? t.p2pCopiedInvite : t.p2pCopyInvite}</span>
                </button>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-emerald-400" />
                {t.p2pAddFriendLabel}
              </h3>
              <p className="text-xs text-slate-400">
                {t.p2pStorageDesc}
              </p>
              <textarea
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
                placeholder={t.p2pAddFriendPlaceholder}
                rows={3}
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              {connectionError && (
                <p className="text-xs text-red-400 bg-red-950/50 p-2.5 rounded-xl border border-red-800">
                  {connectionError}
                </p>
              )}
              {connectionSuccess && (
                <p className="text-xs text-emerald-300 bg-emerald-950/50 p-2.5 rounded-xl border border-emerald-800">
                  {connectionSuccess}
                </p>
              )}
              <button
                onClick={handleConnectFriend}
                disabled={isConnecting || !friendCodeInput.trim()}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
              >
                {isConnecting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                <span>{isConnecting ? '...' : t.p2pConnectFriendBtn}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Peer Jury Audit & Disputes (Quorum 2:1) */}
      {activeTab === 'disputes' && (
        <div className="mt-6 space-y-6">
          <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex items-start gap-3.5">
            <Gavel className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2 flex-wrap">
                <strong className="text-amber-200 font-semibold text-sm">
                  Коллегия аудиторов (Кворум 2:1)
                </strong>
                <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-indigo-400/40 text-[10px] text-indigo-200">
                  Игровая механика · Локальная коллегия на устройстве
                </span>
              </div>
              <p>
                Если поступает жалоба от одного из пиров, другие участники сети призываются в качестве аудиторов.
                Они беспристрастно исследуют холст и подтверждают либо отвергают жалобу.
              </p>
              <p className="text-slate-400">
                • <strong>Правило 2:1</strong>: если количество подтвердивших жалобу аудиторов превышает отвергнувших <strong>в 2 раза и более</strong>, картина помечается как опасная, <strong>автоматически стирается из всех резервных копий друзей</strong> во всей сети, а её автор <strong>переводится в режим ТОЛЬКО ЧТЕНИЕ навсегда</strong>.
              </p>
              <p className="text-slate-400">
                • Если жалоба ложная и отвергается аудиторами — картина оправдывается, защищая авторов от клеветы и вредительства.
              </p>
            </div>
          </div>

          {/* Active Verification Proposal Alert */}
          {activeProposal && (
            <div className="p-4 rounded-2xl bg-indigo-950/70 border-2 border-indigo-500/60 shadow-lg shadow-indigo-950/40 text-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      Новое предложение на верификацию пиров
                    </span>
                    <span className="text-[10px] bg-indigo-900/80 px-2 py-0.5 rounded text-indigo-200 border border-indigo-700/50">
                      Кворум 2:1
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white mt-0.5">
                    Пир «{activeProposal.reporterName}» подал жалобу на «{activeProposal.artworkTitle}»
                  </h4>
                  <p className="text-xs text-indigo-200/90 mt-0.5">
                    Причина: «{activeProposal.complaintReason}»
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveProposal(null)}
                className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-indigo-800/80 hover:bg-indigo-700 text-xs font-semibold text-indigo-200 border border-indigo-600/50 transition cursor-pointer"
              >
                Ознакомлен
              </button>
            </div>
          )}

          {voteFeedback && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              voteFeedback.type === 'success' 
                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-200' 
                : 'bg-amber-950/60 border-amber-700/60 text-amber-200'
            }`}>
              <Info className="w-4 h-4 shrink-0" />
              <span>{voteFeedback.message}</span>
            </div>
          )}

          {disputes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">
              {t.p2pNoActiveDisputes}
            </div>
          ) : (
            <div className="space-y-4">
              {disputes.map((dispute) => {
                const confirmCount = dispute.confirmVotes.length;
                const rejectCount = dispute.rejectVotes.length;
                const confirmWeight = dispute.confirmWeight ?? confirmCount;
                const rejectWeight = dispute.rejectWeight ?? rejectCount;
                const ratio = dispute.ratio ?? (rejectWeight === 0 ? confirmWeight : Number((confirmWeight / rejectWeight).toFixed(2)));
                const myVotedConfirm = dispute.confirmVotes.includes(artistProfile.id);
                const myVotedReject = dispute.rejectVotes.includes(artistProfile.id);
                const hasVoted = myVotedConfirm || myVotedReject;
                const myWeight = calculateAuditorWeight(artistProfile);

                return (
                  <div 
                    key={dispute.id}
                    className={`p-5 rounded-2xl border transition ${
                      dispute.status === 'condemned'
                        ? 'bg-red-950/30 border-red-800/50'
                        : dispute.status === 'acquitted'
                        ? 'bg-emerald-950/30 border-emerald-800/50'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row gap-5">
                      {/* Artwork thumbnail */}
                      <div className="w-full md:w-44 aspect-square rounded-xl overflow-hidden bg-slate-900 shrink-0 relative border border-slate-800">
                        <img 
                          src={dispute.artworkImageUrl} 
                          alt={dispute.artworkTitle} 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2">
                          {dispute.status === 'condemned' && (
                            <span className="px-2 py-0.5 rounded-md bg-red-600 text-white font-bold text-[10px] shadow">
                              ОСУЖДЕНО И СТЁРТО
                            </span>
                          )}
                          {dispute.status === 'acquitted' && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-bold text-[10px] shadow">
                              ОПРАВДАНО
                            </span>
                          )}
                          {dispute.status === 'pending' && (
                            <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 font-bold text-[10px] shadow">
                              ИДЁТ СУД АУДИТОРОВ
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Dispute Details */}
                      <div className="flex-1 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <h4 className="font-bold text-base text-amber-100 font-serif">
                            {dispute.artworkTitle}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Автор: <strong className="text-slate-200">{dispute.authorName}</strong>
                          </span>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                          <div className="text-slate-400 font-medium mb-1 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                            <span>Жалоба от пира: <strong>{dispute.reporterName}</strong></span>
                          </div>
                          <p className="text-slate-200 italic">«{dispute.complaintReason}»</p>
                        </div>

                        <p className="text-[11px] text-slate-400 font-mono">
                          Промпт: {dispute.artworkPrompt}
                        </p>

                        {/* Weighted Votes breakdown */}
                        <div className="flex items-center gap-3 pt-2 border-t border-slate-800/80 flex-wrap">
                          <div className="text-xs">
                            <span className="text-slate-400">Взвешенные голоса: </span>
                            <strong className="text-rose-400">{confirmWeight} вес ЗА</strong>
                            <span className="text-slate-500 text-[11px]"> ({confirmCount} пиров)</span>
                            <span className="text-slate-500"> / </span>
                            <strong className="text-emerald-400">{rejectWeight} вес ПРОТИВ</strong>
                            <span className="text-slate-500 text-[11px]"> ({rejectCount} пиров)</span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] text-amber-300/90 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-700/40 font-mono">
                              Соотношение: {ratio}:1 {ratio >= 2 ? '(≥ 2:1 Кворум)' : '(< 2:1)'}
                            </span>
                            <span className="text-[11px] text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-700/40">
                              Ваш вес аудитора: <strong>{myWeight}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Granular weighted votes record if available */}
                        {dispute.weightedVotes && dispute.weightedVotes.length > 0 && (
                          <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1.5 text-[11px]">
                            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                              Реестр голосов коллегии:
                            </span>
                            <div className="space-y-1">
                              {dispute.weightedVotes.map((v, i) => (
                                <div key={i} className="flex items-center justify-between text-slate-300">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${v.decision === 'confirm' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                    <span className="font-medium text-slate-200">{v.auditorName}</span>
                                    <span className="text-slate-500">(вес: {v.weight})</span>
                                  </div>
                                  <span className={v.decision === 'confirm' ? 'text-rose-400' : 'text-emerald-400'}>
                                    {v.decision === 'confirm' ? 'Подтвердил вину' : 'Отклонил жалобу'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {dispute.verdictNote && (
                          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-medium">
                            {dispute.verdictNote}
                          </div>
                        )}

                        {/* Auditor Voting Controls */}
                        {dispute.status === 'pending' && (
                          <div className="flex items-center gap-3 pt-2">
                            {hasVoted ? (
                              <span className="text-xs text-slate-400 italic">
                                Вы уже проголосовали как аудитор ({myVotedConfirm ? '«Подтвердить вину»' : '«Отклонить жалобу»'}).
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleVote(dispute.id, 'confirm')}
                                  disabled={votingDisputeId === dispute.id}
                                  className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                  <span>{t.p2pVoteGuilty}</span>
                                </button>
                                <button
                                  onClick={() => handleVote(dispute.id, 'reject')}
                                  disabled={votingDisputeId === dispute.id}
                                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" />
                                  <span>{t.p2pVoteInnocent}</span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Friends List */}
      {activeTab === 'friends' && (
        <div className="mt-6 space-y-4">
          <p className="text-xs text-slate-400">
            Список участников вашего децентрализованного сообщества. Каждый пир выступает потенциальным аудитором в спорах.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {friends.map((friend) => {
              const isBot = friend.peerId === 'peer_theo_vangogh' || friend.peerId === 'peer_arles_cat';
              return (
                <div key={friend.peerId} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${friend.avatarColor} flex items-center justify-center text-xl shadow-md`}>
                      🐱
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-100">{friend.name}</h4>
                      <p className="text-xs text-slate-400">
                        Картин: <strong className="text-amber-300">{friend.artworkCount}</strong> • Статус: <span className="text-emerald-400 font-semibold">{friend.status}</span>
                      </p>
                      <span className="text-[10px] text-indigo-300">
                        {isBot ? 'Демо-бот · локальный собеседник' : 'Живой WebRTC пир'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {isBot ? 'Демо-бот' : friend.connectionMethod}
                    </span>
                    <button
                      onClick={() => {
                        setChatSelectedFriendId(friend.peerId);
                        setActiveTab('chat');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{isBot ? 'Демо-чат' : 'E2EE Чат'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: P2P Chat with Store-and-Forward DTN Protocol */}
      {activeTab === 'chat' && (
        <div className="mt-6">
          <P2PChatView
            artistProfile={artistProfile}
            friends={friends}
            myArtworks={myArtworks}
            onUpdateFriends={setFriends}
            selectedFriendId={chatSelectedFriendId}
          />
        </div>
      )}

      {/* Tab 3: Mutual Replicated Storage */}
      {activeTab === 'storage' && (
        <div className="mt-6 space-y-6">
          <P2PStorageQuotaView />

          {/* Offline P2P Archive Backup & Restore (.vangoghcat) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-700/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-200 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-amber-400" />
                <span>Автономный архив шедевров (.vangoghcat)</span>
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Экспорт картин с Merkle Root и пигментным аудитом для 100% независимости от любых облачных серверов.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportArchive}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                title="Экспортировать полный зашифрованный архив полотен"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Экспорт (.vangoghcat)</span>
              </button>
              <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-600 font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer">
                <Share2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Импорт архива</span>
                <input
                  type="file"
                  accept=".vangoghcat,.json"
                  onChange={handleImportArchive}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {backupArtworks.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              У вас пока нет сохранённых резервных копий от друзей.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {backupArtworks.map((art) => (
                <div key={art.id} className="rounded-xl overflow-hidden bg-slate-950 border border-slate-800 p-3 space-y-2">
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-slate-900">
                    <img src={art.imageUrl} alt={art.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 right-2 text-[10px] bg-slate-950/80 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                      Резервная копия
                    </span>
                  </div>
                  <h5 className="font-bold text-xs text-amber-100 truncate">{art.title}</h5>
                  <p className="text-[11px] text-slate-400 line-clamp-2">{art.prompt}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                    <button
                      onClick={() => onSelectArtwork(art)}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Смотреть</span>
                    </button>
                    <button
                      onClick={() => onLikeArtwork(art.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Heart className="w-3.5 h-3.5" />
                      <span>{art.likes || 1}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Cat Code of Conduct */}
      {activeTab === 'catguardian' && (
        <div className="mt-6 p-5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-3">
          <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>Хартия децентрализованной сети: «Запрещено всё, кроме котов»</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            В децентрализованной сети нет центрального органа цензуры, но действует непоколебимый математический консенсус:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-400 space-y-1.5 pl-2">
            <li>Встроенный клиентский фильтр <strong>Cat Sanctity Validator</strong> блокирует генерации без кошек.</li>
            <li><strong>Суд присяжных-пиров (Кворум 2:1)</strong> защищает от вредительства: клеветнические жалобы отвергаются большинством голосов.</li>
            <li>Если вина подтверждена в 2 раза большим числом пиров, чем отвергнувших — полотно стирается из бэкапов всей сети, а автор навсегда блокируется в режим <strong>ТОЛЬКО ЧТЕНИЕ</strong>.</li>
          </ul>
        </div>
      )}

      {/* Tab: Collaborative Canvas */}
      {activeTab === 'collab' && (
        <div className="mt-6">
          <P2PCollaborativeCanvas
            artistProfile={artistProfile}
            onSaveToGallery={(artwork) => {
              onAddArtworksFromPeer([artwork]);
              onSelectArtwork(artwork);
            }}
          />
        </div>
      )}

      {/* Tab: Swarm Chunking & Merkle Root */}
      {activeTab === 'swarm' && (
        <div className="mt-6">
          <P2PSwarmChunkerView
            artworks={myArtworks.length > 0 ? myArtworks : (backupArtworks.length > 0 ? backupArtworks : INITIAL_MASTERPIECES)}
            peerFriends={friends.map(f => ({ peerId: f.peerId, name: f.name }))}
          />
        </div>
      )}

      {/* Tab: Web of Trust */}
      {activeTab === 'wot' && (
        <div className="mt-6">
          <P2PWebOfTrustView
            artistProfile={artistProfile}
            friends={friends}
          />
        </div>
      )}
    </section>
  );
};
