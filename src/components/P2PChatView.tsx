import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Lock,
  Send,
  ShieldCheck,
  PackageCheck,
  Eye,
  X,
  Sparkles,
  ArrowRight,
  Radio,
  Image as ImageIcon,
  CheckCheck,
  Clock,
  HelpCircle,
  Users
} from 'lucide-react';
import { ArtistProfile, Artwork, PeerFriend, P2PChatMessage, P2PEncryptedEnvelope } from '../types';
import {
  getChatMessagesForFriend,
  sendP2PChatMessage,
  getCustodyVaultEnvelopes,
  inspectEnvelopePrivacy,
  deliverCustodyEnvelopesForOnlineFriend,
  announcePeerPresence,
  getOrCreateLocalEcdhKeyPair,
  getPeerEcdhPublicKey,
  getPeerEcdhKeyState,
  markPeerSafetyNumberVerified,
  confirmPeerNewEcdhKey,
  computeSafetyNumber,
  getEncryptedEnvelopeById
} from '../utils/p2pChatProtocol';
import { PeerKeyTrustStatus } from '../utils/p2pEcdhKeys';

interface P2PChatViewProps {
  artistProfile: ArtistProfile;
  friends: PeerFriend[];
  myArtworks: Artwork[];
  onUpdateFriends: (friends: PeerFriend[]) => void;
  selectedFriendId?: string | null;
}

const QUICK_CAT_PHRASES = [
  '🐾 Мяу-привет из мастерской!',
  '🎨 Как тебе мой новый кошачий импасто?',
  '🌻 Отправил немного солнечной охры!',
  '✨ Звёздное арльское небо сегодня прекрасно.',
  '🐱 Кот одобрил эту цветовую гамму!',
];

export const P2PChatView: React.FC<P2PChatViewProps> = ({
  artistProfile,
  friends,
  myArtworks,
  onUpdateFriends,
  selectedFriendId,
}) => {
  const [activeFriend, setActiveFriend] = useState<PeerFriend | null>(() => {
    const list = friends || [];
    if (selectedFriendId) {
      return list.find(f => f.peerId === selectedFriendId) || list[0] || null;
    }
    return list[0] || null;
  });

  const [messages, setMessages] = useState<P2PChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [inspectingEnvelope, setInspectingEnvelope] = useState<{
    envelope: P2PEncryptedEnvelope | null;
    observerPeerId: string;
    details: any;
  } | null>(null);
  const [custodyVaultCount, setCustodyVaultCount] = useState<number>(() => getCustodyVaultEnvelopes().length);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [showProtocolExplainer, setShowProtocolExplainer] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);
  const [myEcdhPublicJwk, setMyEcdhPublicJwk] = useState<JsonWebKey | null>(null);
  const [safetyNumber, setSafetyNumber] = useState<string | null>(null);
  const [peerKeyStatus, setPeerKeyStatus] = useState<PeerKeyTrustStatus>('none');
  const [conflictingSafetyNumber, setConflictingSafetyNumber] = useState<string | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  const isDemoBotFriend = (friend: PeerFriend | null) =>
    !!friend && (friend.peerId === 'peer_theo_vangogh' || friend.peerId === 'peer_arles_cat');

  // Sync active friend if selectedFriendId prop changes
  useEffect(() => {
    if (selectedFriendId) {
      const found = friends.find(f => f.peerId === selectedFriendId);
      if (found) setActiveFriend(found);
    }
  }, [selectedFriendId, friends]);

  // Load local ECDH P-256 public JWK for Safety Number verification
  useEffect(() => {
    let cancelled = false;
    getOrCreateLocalEcdhKeyPair(artistProfile.id)
      .then((res) => {
        if (!cancelled) setMyEcdhPublicJwk(res.publicKeyJwk);
      })
      .catch(() => {
        if (!cancelled) setMyEcdhPublicJwk(null);
      });
    return () => {
      cancelled = true;
    };
  }, [artistProfile.id]);

  const refreshPeerKeySecurity = (friend: PeerFriend | null, localJwk: JsonWebKey | null) => {
    if (!friend || isDemoBotFriend(friend)) {
      setSafetyNumber(null);
      setPeerKeyStatus('none');
      setConflictingSafetyNumber(null);
      return;
    }

    const keyState = getPeerEcdhKeyState(friend.peerId);
    const peerKey = keyState.pinnedJwk || friend.ecdhPublicKeyJwk || getPeerEcdhPublicKey(friend.peerId);
    setPeerKeyStatus(keyState.status);

    if (localJwk && peerKey) {
      computeSafetyNumber(localJwk, peerKey)
        .then((num) => setSafetyNumber(num))
        .catch(() => setSafetyNumber(null));
    } else {
      setSafetyNumber(null);
    }

    if (keyState.status === 'key_changed' && localJwk && keyState.conflictingJwk) {
      computeSafetyNumber(localJwk, keyState.conflictingJwk)
        .then((num) => setConflictingSafetyNumber(num))
        .catch(() => setConflictingSafetyNumber(null));
    } else {
      setConflictingSafetyNumber(null);
    }
  };

  // Load chat messages and compute Safety Number + trust state when active friend changes
  useEffect(() => {
    if (activeFriend) {
      const msgs = getChatMessagesForFriend(artistProfile.id, activeFriend.peerId);
      setMessages(msgs);
      refreshPeerKeySecurity(activeFriend, myEcdhPublicJwk);
    } else {
      refreshPeerKeySecurity(null, myEcdhPublicJwk);
    }
  }, [activeFriend, artistProfile.id, myEcdhPublicJwk]);

  useEffect(() => {
    const onKeyChanged = () => {
      refreshPeerKeySecurity(activeFriend, myEcdhPublicJwk);
    };
    window.addEventListener('p2p:peer_key_changed', onKeyChanged);
    return () => window.removeEventListener('p2p:peer_key_changed', onKeyChanged);
  }, [activeFriend, myEcdhPublicJwk]);

  // Scroll to bottom on messages update
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for P2P chat events and custody vault updates
  useEffect(() => {
    const handleChatUpdated = () => {
      if (activeFriend) {
        setMessages(getChatMessagesForFriend(artistProfile.id, activeFriend.peerId));
      }
      setCustodyVaultCount(getCustodyVaultEnvelopes().length);
    };

    const handleVaultUpdated = () => {
      setCustodyVaultCount(getCustodyVaultEnvelopes().length);
    };

    window.addEventListener('p2p:chat_updated', handleChatUpdated);
    window.addEventListener('p2p:custody_vault_updated', handleVaultUpdated);

    return () => {
      window.removeEventListener('p2p:chat_updated', handleChatUpdated);
      window.removeEventListener('p2p:custody_vault_updated', handleVaultUpdated);
    };
  }, [activeFriend, artistProfile.id]);

  // Send message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeFriend || (!inputText.trim() && !selectedArtwork) || isSending) return;

    setIsSending(true);
    try {
      const newMsg = await sendP2PChatMessage({
        text: inputText.trim() || (selectedArtwork ? `[Художественное полотно: ${selectedArtwork.title}]` : 'Мяу!'),
        recipient: activeFriend,
        myProfile: artistProfile,
        connectedFriends: friends,
        attachmentArtwork: selectedArtwork || undefined,
      });

      setInputText('');
      setSelectedArtwork(null);
      // Synchronize messages directly from deduplicated storage to prevent duplicate message entries
      setMessages(getChatMessagesForFriend(artistProfile.id, activeFriend.peerId));

      if (activeFriend.status === 'offline') {
        setOfflineNotice(
          `📦 Друг «${activeFriend.name}» сейчас офлайн. Сообщение запечатано стойким шифром AES-GCM 256 и передано на хранение пирам-курьерам. Как только друг появится в сети — курьеры доставят пакет!`
        );
        setTimeout(() => setOfflineNotice(null), 8000);
      }
    } catch (err: any) {
      console.error('Error sending chat message:', err);
      setOfflineNotice(err?.message || 'Не удалось отправить сообщение');
      setTimeout(() => setOfflineNotice(null), 7000);
    } finally {
      setIsSending(false);
    }
  };

  // Toggle friend online/offline status (Simulator to test Store-and-Forward / DTN)
  const handleToggleFriendOnlineStatus = (friendToToggle: PeerFriend) => {
    const newStatus = friendToToggle.status === 'online' ? 'offline' : 'online';
    const updated = friends.map(f => {
      if (f.peerId === friendToToggle.peerId) {
        return { ...f, status: newStatus as 'online' | 'offline', lastSeenAt: Date.now() };
      }
      return f;
    });

    onUpdateFriends(updated);

    if (activeFriend && activeFriend.peerId === friendToToggle.peerId) {
      setActiveFriend({ ...activeFriend, status: newStatus, lastSeenAt: Date.now() });
    }

    // If friend came ONLINE -> Trigger Store-and-Forward Delivery!
    if (newStatus === 'online') {
      announcePeerPresence(artistProfile);
      const deliveredCount = deliverCustodyEnvelopesForOnlineFriend(friendToToggle.peerId, artistProfile);
      if (deliveredCount > 0) {
        setOfflineNotice(
          `📬 Друг «${friendToToggle.name}» вышел в сеть! Пиры-курьеры обнаружили его и успешно доставили ${deliveredCount} зашифрованных конвертов из офлайн-хранилища.`
        );
        setTimeout(() => setOfflineNotice(null), 7000);
      }
    }
  };

  // Open privacy inspector for the real stored E2EE envelope (or honest demo-bot notice)
  const handleInspectEnvelope = (msg: P2PChatMessage) => {
    const storedEnvelope = getEncryptedEnvelopeById(msg.envelopeId);

    if (storedEnvelope) {
      const details = inspectEnvelopePrivacy(storedEnvelope, artistProfile.id);
      setInspectingEnvelope({ envelope: storedEnvelope, observerPeerId: artistProfile.id, details });
      return;
    }

    const fallbackEnvelope: P2PEncryptedEnvelope = {
      v: msg.isDemoBot ? 0 : 2,
      envelopeId: msg.envelopeId,
      senderPeerId: msg.senderPeerId,
      senderName: msg.senderName,
      recipientPeerId: msg.recipientPeerId,
      recipientName: msg.recipientName,
      createdAt: msg.timestamp,
      expiresAt: msg.timestamp + 86400000 * 7,
      ciphertext: '',
      iv: '',
      salt: '',
      contentHash: '',
      hops: msg.deliveryRoute,
      isRelayed: !!msg.isRelayedDelivery,
    };

    const details = {
      isAuthorized: false,
      version: 0,
      envelopeId: msg.envelopeId,
      sender: msg.senderName,
      recipient: msg.recipientName,
      hops: msg.deliveryRoute,
      ciphertextPreview: msg.isDemoBot
        ? '(Демо-бот: открытое демонстрационное сообщение, шифроконверт ECDH не создавался)'
        : '(Метаданные бинарного конверта не найдены в локальном кэше браузера)',
      iv: '—',
      salt: '—',
      contentHash: '—',
      statusText: msg.isDemoBot
        ? 'Демонстрационное сообщение бота — без E2EE шифрования.'
        : 'Архивный заголовок переписки.',
    };

    setInspectingEnvelope({ envelope: fallbackEnvelope, observerPeerId: artistProfile.id, details });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[650px] max-h-[85vh] text-slate-100 animate-fade-in">
      {/* Left Sidebar: Friends list with online/offline toggles */}
      <div className="w-full lg:w-72 shrink-0 flex flex-col bg-slate-950/80 rounded-2xl border border-amber-900/40 overflow-hidden shadow-xl">
        <div className="p-3.5 border-b border-amber-900/30 bg-gradient-to-r from-amber-950/60 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400" />
            <h3 className="font-serif font-bold text-sm text-amber-200">Друзья в сети ({friends.length})</h3>
          </div>
          <button
            onClick={() => setShowProtocolExplainer(true)}
            className="p-1 rounded-lg hover:bg-slate-800 text-amber-400/80 hover:text-amber-300 transition cursor-pointer"
            title="Как работает Store-and-Forward & E2EE?"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>

        {/* Courier Custody Badge */}
        <div className="px-3 py-2 bg-indigo-950/40 border-b border-indigo-900/40 flex items-center justify-between text-[11px] text-indigo-200">
          <div className="flex items-center gap-1.5">
            <PackageCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Сумка пиров-курьеров:</span>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-200 font-mono font-bold">
            {custodyVaultCount} {custodyVaultCount === 1 ? 'пакет' : 'пакетов'}
          </span>
        </div>

        {/* Friends scrollable list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {friends.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400">
              Пока нет добавленных друзей. Подключите друга во вкладке «Друзья & Бэкап»!
            </div>
          ) : (
            friends.map(friend => {
              const isSelected = activeFriend?.peerId === friend.peerId;
              const isOnline = friend.status === 'online';

              return (
                <div
                  key={friend.peerId}
                  onClick={() => setActiveFriend(friend)}
                  className={`p-2.5 rounded-xl border transition cursor-pointer flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-amber-950/50 border-amber-500/60 shadow-md text-amber-100'
                      : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-800/70 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="relative">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${friend.avatarColor} flex items-center justify-center text-xs font-bold text-white shadow`}>
                        {friend.name.slice(0, 1)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                          isOnline ? 'bg-emerald-500' : 'bg-slate-500'
                        }`}
                      />
                    </div>
                    <div className="truncate">
                      <h4 className="font-semibold text-xs text-slate-200 truncate">{friend.name}</h4>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        {isDemoBotFriend(friend) ? (
                          <span>Демо-бот · без E2EE</span>
                        ) : (friend.ecdhPublicKeyJwk || getPeerEcdhPublicKey(friend.peerId)) ? (
                          <>
                            <Lock className="w-2.5 h-2.5 text-emerald-400" />
                            <span className="text-emerald-300">E2EE (ECDH P-256)</span>
                          </>
                        ) : (
                          <span>Ожидает обмена ключами</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Online/Offline Toggle Button for Store-and-Forward testing */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFriendOnlineStatus(friend);
                    }}
                    title={isOnline ? 'Нажмите, чтобы перевести в офлайн для теста ретрансляции' : 'Нажмите, чтобы вернуть в сеть'}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer shrink-0 ${
                      isOnline
                        ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900/60'
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
                    }`}
                  >
                    {isOnline ? '● В сети' : '○ Офлайн'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Pane: Active Chat Conversation */}
      <div className="flex-1 flex flex-col bg-slate-950/80 rounded-2xl border border-amber-900/40 overflow-hidden shadow-xl">
        {activeFriend ? (
          <>
            {/* Chat Header */}
            <div className="p-3.5 border-b border-amber-900/30 bg-gradient-to-r from-slate-900 to-amber-950/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${activeFriend.avatarColor} flex items-center justify-center font-bold text-sm text-white shadow`}>
                    {activeFriend.name.slice(0, 1)}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                      activeFriend.status === 'online' ? 'bg-emerald-500' : 'bg-slate-500'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-serif font-bold text-sm text-amber-200">{activeFriend.name}</h3>
                    {isDemoBotFriend(activeFriend) ? (
                      <span className="flex items-center gap-1 text-[10px] text-amber-300 bg-amber-950/60 border border-amber-700/50 px-2 py-0.5 rounded-full">
                        <span>Демо-бот · без E2EE</span>
                      </span>
                    ) : safetyNumber ? (
                      <span
                        className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full"
                        title={`Safety Number для сверки с собеседником: ${safetyNumber}`}
                      >
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>E2EE ECDH P-256 · SN: {safetyNumber.slice(0, 11)}…</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-rose-300 bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded-full">
                        <span>Ожидается обмен ключами ECDH</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span>Статус:</span>
                    <strong className={activeFriend.status === 'online' ? 'text-emerald-400' : 'text-slate-400'}>
                      {isDemoBotFriend(activeFriend)
                        ? 'Локальный демо-куратор (для реального E2EE подключите пира по WebRTC)'
                        : activeFriend.status === 'online'
                        ? 'В сети (прямой WebRTC канал)'
                        : 'Офлайн (режим DTN-конвертов)'}
                    </strong>
                    {safetyNumber && !isDemoBotFriend(activeFriend) && (
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] text-cyan-300/90 bg-slate-900/90 px-1.5 py-0.5 rounded border border-cyan-800/50">
                        <span>SN: {safetyNumber}</span>
                        {peerKeyStatus === 'verified' ? (
                          <span className="text-emerald-400 font-sans font-semibold">· Подтверждён</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (markPeerSafetyNumberVerified(activeFriend.peerId, safetyNumber)) {
                                refreshPeerKeySecurity(activeFriend, myEcdhPublicJwk);
                                setOfflineNotice(`Safety Number для «${activeFriend.name}» отмечен как подтверждённый.`);
                                setTimeout(() => setOfflineNotice(null), 5000);
                              }
                            }}
                            className="font-sans underline text-amber-300 hover:text-amber-200 cursor-pointer"
                            title="Нажмите после сверки Safety Number с собеседником"
                          >
                            Подтвердить ключ (TOFU)
                          </button>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Status Simulator Toggle Button */}
              <button
                onClick={() => handleToggleFriendOnlineStatus(activeFriend)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition cursor-pointer ${
                  activeFriend.status === 'online'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                    : 'bg-emerald-700 hover:bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{activeFriend.status === 'online' ? 'Смоделировать: Друг ушёл в офлайн' : 'Смоделировать: Друг вышел в сеть!'}</span>
              </button>
            </div>

            {/* Key-Change Security Warning Banner */}
            {peerKeyStatus === 'key_changed' && activeFriend && !isDemoBotFriend(activeFriend) && (
              <div className="px-4 py-2.5 bg-rose-950/90 border-b border-rose-500/60 text-xs text-rose-100 flex flex-wrap items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="font-bold text-rose-200">
                    Ключ собеседника «{activeFriend.name}» изменился — новые сообщения с другим ключом отклонены.
                  </div>
                  {conflictingSafetyNumber && (
                    <div className="font-mono text-[10px] text-rose-200/90">
                      Новый Safety Number: {conflictingSafetyNumber}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmPeerNewEcdhKey(activeFriend.peerId)) {
                      refreshPeerKeySecurity(activeFriend, myEcdhPublicJwk);
                      setOfflineNotice(`Новый ключ собеседника «${activeFriend.name}» принят (TOFU). Сверьте Safety Number!`);
                      setTimeout(() => setOfflineNotice(null), 6000);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold cursor-pointer shrink-0"
                >
                  Принять новый ключ
                </button>
              </div>
            )}

            {/* Offline Info Toast */}
            {offlineNotice && (
              <div className="px-4 py-2 bg-indigo-950/80 border-b border-indigo-800/60 text-xs text-indigo-200 flex items-center gap-2 animate-fade-in">
                <PackageCheck className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="flex-1">{offlineNotice}</span>
                <button onClick={() => setOfflineNotice(null)} className="text-indigo-400 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#1f140e_1px,transparent_1px)] [background-size:16px_16px]">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-950/50 border border-amber-800/40 flex items-center justify-center text-amber-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif font-bold text-sm text-amber-200">Беседа защищена сквозным шифрованием</h4>
                  <p className="text-xs max-w-sm text-slate-400">
                    Сообщения шифруются на вашем устройстве. Если друг офлайн, запечатанный крипто-конверт хранится у общих пиров-курьеров и доставится автоматически при его появлении.
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMine = msg.senderPeerId === artistProfile.id || msg.senderPeerId === 'my-local';
                  const messageKey = msg.id ? `${msg.id}_${idx}` : `msg_${idx}`;

                  return (
                    <div
                      key={messageKey}
                      className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 text-xs shadow-md border ${
                          isMine
                            ? 'bg-amber-950/80 border-amber-600/50 text-amber-100 rounded-br-xs'
                            : 'bg-slate-900 border-slate-700/80 text-slate-200 rounded-bl-xs'
                        }`}
                      >
                        {/* Sender header */}
                        <div className="flex items-center justify-between gap-3 text-[10px] text-slate-400 border-b border-white/10 pb-1 mb-1.5">
                          <span className="font-semibold text-amber-300">
                            {isMine ? 'Вы' : msg.senderName}
                          </span>
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {/* Optional Attached Artwork */}
                        {msg.attachmentArtworkUrl && (
                          <div className="mb-2 rounded-xl overflow-hidden border border-amber-500/40 bg-black/40">
                            <img
                              src={msg.attachmentArtworkUrl}
                              alt={msg.attachmentArtworkTitle || 'Картина'}
                              className="w-full h-36 object-cover"
                            />
                            {msg.attachmentArtworkTitle && (
                              <div className="p-1.5 text-[11px] font-semibold text-amber-200 truncate">
                                {msg.attachmentArtworkTitle}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message body text */}
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>

                        {/* Delivery Status & Crypto Badge */}
                        <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between gap-2 text-[10px]">
                          <div className="flex items-center gap-1 text-slate-400">
                            {msg.isDemoBot || !msg.isE2EE ? (
                              <span className="text-slate-400">Демо-бот · без E2EE</span>
                            ) : (
                              <>
                                <Lock className="w-3 h-3 text-emerald-400/90" />
                                <span className="text-emerald-300">E2EE (ECDH)</span>
                              </>
                            )}
                            {msg.status === 'relayed_in_custody' && (
                              <span className="text-indigo-300 font-semibold bg-indigo-950 px-1.5 py-0.5 rounded border border-indigo-800/40">
                                📦 В хранении у пиров-курьеров
                              </span>
                            )}
                            {msg.status === 'delivered' && (
                              <span className="text-emerald-400 flex items-center gap-1">
                                <CheckCheck className="w-3 h-3 text-emerald-400" />
                                {msg.isRelayedDelivery ? 'Доставлено курьером' : 'Доставлено напрямую'}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => handleInspectEnvelope(msg)}
                            className="text-amber-400/80 hover:text-amber-300 underline flex items-center gap-0.5 cursor-pointer"
                            title="Посмотреть крипто-конверт"
                          >
                            <Eye className="w-2.5 h-2.5" />
                            <span>Пакет</span>
                          </button>
                        </div>
                      </div>

                      {/* Route breadcrumb below message */}
                      <div className="mt-1 text-[9px] text-slate-500 flex items-center gap-1 font-mono">
                        <span>Маршрут:</span>
                        {msg.deliveryRoute.join(' → ')}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick phrases bar */}
            <div className="px-3 py-1.5 bg-slate-900/70 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto text-[11px]">
              <span className="text-[10px] text-slate-400 uppercase font-semibold shrink-0">Фразы:</span>
              {QUICK_CAT_PHRASES.map((phrase, i) => (
                <button
                  key={i}
                  onClick={() => setInputText(phrase)}
                  className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-200 border border-slate-700 transition shrink-0 cursor-pointer"
                >
                  {phrase}
                </button>
              ))}
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-amber-900/30 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAttachModal(true)}
                title="Прикрепить кошачий шедевр"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 transition cursor-pointer relative"
              >
                <ImageIcon className="w-4 h-4" />
                {selectedArtwork && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500" />
                )}
              </button>

              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={
                    activeFriend.status === 'online'
                      ? `Напишите сообщение для «${activeFriend.name}» (E2EE прямой P2P)...`
                      : `«${activeFriend.name}» офлайн — пакет будет передан на хранение пирам-курьерам...`
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-500 text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                />
                {selectedArtwork && (
                  <div className="absolute right-2 top-2 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-600/60 text-[10px] text-amber-200 flex items-center gap-1">
                    <span>Картина: {selectedArtwork.title.slice(0, 14)}...</span>
                    <button type="button" onClick={() => setSelectedArtwork(null)} className="text-amber-400 hover:text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={(!inputText.trim() && !selectedArtwork) || isSending}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold font-serif flex items-center gap-1.5 transition cursor-pointer shadow-lg ${
                  (!inputText.trim() && !selectedArtwork) || isSending
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 text-amber-950 shadow-amber-900/30'
                }`}
              >
                <Send className="w-3.5 h-3.5" />
                <span>Отправить</span>
              </button>
            </form>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs p-6 text-center">
            Выберите друга из списка слева, чтобы начать защищённый диалог.
          </div>
        )}
      </div>

      {/* Attach Artwork Modal */}
      {showAttachModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-amber-500/40 p-5 shadow-2xl text-slate-100">
            <button
              onClick={() => setShowAttachModal(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 text-amber-400 font-serif font-bold text-base border-b border-slate-800 pb-3">
              <ImageIcon className="w-5 h-5 text-amber-500" />
              <span>Прикрепить холст из своей мастерской</span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2.5 max-h-80 overflow-y-auto p-1">
              {myArtworks.map(art => (
                <div
                  key={art.id}
                  onClick={() => {
                    setSelectedArtwork(art);
                    setShowAttachModal(false);
                  }}
                  className={`p-1.5 rounded-xl border transition cursor-pointer ${
                    selectedArtwork?.id === art.id
                      ? 'border-amber-400 bg-amber-950/40'
                      : 'border-slate-800 bg-slate-900 hover:border-slate-600'
                  }`}
                >
                  <img src={art.imageUrl} alt={art.title} className="w-full h-20 object-cover rounded-lg" />
                  <p className="mt-1 text-[11px] font-semibold text-amber-100 truncate">{art.title}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Protocol Explanation Modal */}
      {showProtocolExplainer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-xl rounded-3xl bg-slate-950 border-2 border-amber-500/50 p-6 shadow-2xl text-slate-100">
            <button
              onClick={() => setShowProtocolExplainer(false)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-amber-400 font-serif font-bold text-lg border-b border-slate-800 pb-3">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
              <span>Протокол «Ван Гог Whispers» (E2EE + DTN)</span>
            </div>

            <div className="mt-4 space-y-3.5 text-xs text-slate-300 leading-relaxed">
              <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/40 space-y-1">
                <h4 className="font-bold text-amber-200 text-sm flex items-center gap-1.5">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>1. Сквозное шифрование (ECDH P-256 + HKDF-SHA256 + AES-GCM)</span>
                </h4>
                <p>
                  Для живых пиров каждое сообщение запечатывается алгоритмом <strong>AES-GCM (256 бит) с AAD</strong> на общем ключе, вычисленном через <strong>ECDH P-256 + HKDF</strong>.
                  Вы можете сверить симметричный <strong>Safety Number</strong> с собеседником. Встроенные боты помечены как «Демо-бот · без E2EE».
                </p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-800/40 space-y-1">
                <h4 className="font-bold text-indigo-200 text-sm flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-indigo-400" />
                  <span>2. Доставка при офлайн-друзьях (Store-and-Forward / DTN)</span>
                </h4>
                <p>
                  Если адресат офлайн, зашифрованный пакет передаётся на ответственное хранение общим друзьям-пирам. Они хранят слепой конверт в своей «почтовой сумке» (курьерском хранилище).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 space-y-1">
                <h4 className="font-bold text-emerald-200 text-sm flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span>3. Автоматическое обнаружение и вручение</span>
                </h4>
                <p>
                  Как только друг появляется в сети, любой пир-курьер мгновенно распознаёт его идентификатор, вручает зашифрованный пакет, получатель расшифровывает его, а сеть получает квитанцию о доставке и удаляет пакет из временного хранилища.
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowProtocolExplainer(false)}
                className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-xs text-amber-950 cursor-pointer"
              >
                Понятно!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Packet Privacy Inspector Modal */}
      {inspectingEnvelope && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-slate-950 border border-amber-500/40 p-5 shadow-2xl text-slate-100 font-mono text-xs">
            <button
              onClick={() => setInspectingEnvelope(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-amber-400 font-serif font-bold text-sm border-b border-slate-800 pb-2.5">
              <Lock className="w-4 h-4 text-amber-500" />
              <span>Инспектор крипто-конверта (Store-and-Forward Envelope)</span>
            </div>

            <div className="mt-3 space-y-2.5">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                <div className="text-amber-300 font-semibold">Заголовок конверта (Видят пиры-курьеры):</div>
                <div className="text-slate-400">ID пакета: <span className="text-slate-200">{inspectingEnvelope.details.envelopeId}</span></div>
                <div className="text-slate-400">Отправитель: <span className="text-slate-200">{inspectingEnvelope.details.sender}</span></div>
                <div className="text-slate-400">Адресат: <span className="text-slate-200">{inspectingEnvelope.details.recipient}</span></div>
                <div className="text-slate-400">Маршрут курьеров: <span className="text-slate-200">{inspectingEnvelope.details.hops.join(' → ')}</span></div>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] space-y-1">
                <div className="text-rose-400 font-semibold">Полезная нагрузка (Зашифровано AES-GCM 256):</div>
                <div className="text-slate-400 break-all bg-black/50 p-2 rounded border border-slate-800 font-mono text-[10px] text-amber-200">
                  {inspectingEnvelope.details.ciphertextPreview}
                </div>
                <div className="text-slate-400 text-[10px]">Вектор инициализации (IV): {inspectingEnvelope.details.iv}</div>
                <div className="text-slate-400 text-[10px]">Соль: {inspectingEnvelope.details.salt}</div>
                <div className="text-slate-400 text-[10px]">Хэш целостности: {inspectingEnvelope.details.contentHash}</div>
              </div>

              <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-800/40 text-[11px] text-emerald-300">
                {inspectingEnvelope.details.statusText}
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setInspectingEnvelope(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer text-xs"
              >
                Закрыть инспектор
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
