// Van Gogh Whispers: P2P Chat Protocol with ECDH P-256 + HKDF-SHA256 + AES-GCM (AAD) E2EE & Store-and-Forward (DTN)
import { ArtistProfile, Artwork, PeerFriend, P2PChatMessage, P2PEncryptedEnvelope, P2PDeliveryAck } from '../types';
import { p2pNetwork, P2PMessage } from './p2pNetwork';
import { computeContentHash } from './p2pCrypto';
import {
  getWebCrypto,
  uint8ToHex,
  hexToUint8,
  generateRandomHex,
  isValidEcP256Jwk,
  getOrCreateLocalEcdhKeyPair,
  exportMyEcdhPublicJwk,
  registerPeerEcdhPublicKey,
  getPeerEcdhPublicKey,
  computeSafetyNumber,
} from './p2pEcdhKeys';

export {
  getOrCreateLocalEcdhKeyPair,
  exportMyEcdhPublicJwk,
  registerPeerEcdhPublicKey,
  getPeerEcdhPublicKey,
  computeSafetyNumber,
};

const CHAT_HISTORY_STORAGE_KEY = 'vangogh_p2p_chat_history';
const CUSTODY_VAULT_STORAGE_KEY = 'vangogh_dtn_custody_vault';
const ENVELOPE_VAULT_STORAGE_KEY = 'vangogh_p2p_envelopes';
const HKDF_INFO = 'vangogh-whispers-v2';

function getCrypto(): Crypto {
  return getWebCrypto();
}

// Derive AES-GCM-256 key via ECDH P-256 -> HKDF-SHA256
async function deriveEcdhSharedAesKey(
  localPrivateKey: CryptoKey,
  remotePublicJwk: JsonWebKey,
  saltHex: string,
  usage: KeyUsage[]
): Promise<CryptoKey> {
  const cryptoObj = getCrypto();
  const remotePubKey = await cryptoObj.subtle.importKey(
    'jwk',
    remotePublicJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedBits = await cryptoObj.subtle.deriveBits(
    { name: 'ECDH', public: remotePubKey },
    localPrivateKey,
    256
  );

  const hkdfKey = await cryptoObj.subtle.importKey('raw', sharedBits, { name: 'HKDF' }, false, ['deriveKey']);
  const enc = new TextEncoder();

  return cryptoObj.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: hexToUint8(saltHex) as Uint8Array<ArrayBuffer>,
      info: enc.encode(HKDF_INFO),
    },
    hkdfKey,
    { name: 'AES-GCM', length: 256 },
    false,
    usage
  );
}

// Legacy v1 PBKDF2 fallback kept strictly read-only for backward compatibility with older stored envelopes
async function deriveLegacyV1ChatKey(peerA: string, peerB: string, saltHex: string): Promise<CryptoKey> {
  const cryptoObj = getCrypto();
  const sortedPeerIds = [peerA, peerB].sort().join('::vangogh_cats_e2ee_channel::');
  const encoder = new TextEncoder();
  const keyMaterial = await cryptoObj.subtle.importKey(
    'raw',
    encoder.encode(sortedPeerIds),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return cryptoObj.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: hexToUint8(saltHex) as Uint8Array<ArrayBuffer>,
      iterations: 20000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
}

// Encrypt plaintext payload into E2EE v2 envelope (ECDH P-256 + HKDF-SHA256 + AES-GCM with AAD)
export async function encryptChatPayload(
  payload: unknown,
  senderPeerId: string,
  recipientPeerId: string,
  options?: {
    envelopeId?: string;
    recipientPublicKeyJwk?: JsonWebKey;
    localProfileId?: string;
  }
): Promise<{
  v: 2;
  envelopeId: string;
  ciphertext: string;
  iv: string;
  salt: string;
  contentHash: string;
  senderEcdhPublicKeyJwk: JsonWebKey;
}> {
  const peerJwk = options?.recipientPublicKeyJwk || getPeerEcdhPublicKey(recipientPeerId);
  if (!isValidEcP256Jwk(peerJwk)) {
    throw new Error('E2EE_PEER_KEY_REQUIRED: Отсутствует открытый ECDH P-256 ключ получателя.');
  }

  const cryptoObj = getCrypto();
  const localKeys = await getOrCreateLocalEcdhKeyPair(options?.localProfileId || senderPeerId);
  const envelopeId = options?.envelopeId || `env_${cryptoObj.randomUUID()}`;
  const salt = generateRandomHex(16);
  const ivHex = generateRandomHex(12);
  const iv = hexToUint8(ivHex);

  const aesKey = await deriveEcdhSharedAesKey(localKeys.keyPair.privateKey, peerJwk, salt, ['encrypt']);

  const jsonStr = JSON.stringify(payload);
  const contentHash = await computeContentHash(jsonStr);
  const encoder = new TextEncoder();
  const aad = encoder.encode(`${senderPeerId}|${recipientPeerId}|${envelopeId}`);

  const encryptedBuffer = await cryptoObj.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as Uint8Array<ArrayBuffer>,
      additionalData: aad as Uint8Array<ArrayBuffer>,
    },
    aesKey,
    encoder.encode(jsonStr)
  );

  return {
    v: 2,
    envelopeId,
    ciphertext: uint8ToHex(new Uint8Array(encryptedBuffer)),
    iv: ivHex,
    salt,
    contentHash,
    senderEcdhPublicKeyJwk: localKeys.publicKeyJwk,
  };
}

// Decrypt blind ciphertext using ECDH v2 key agreement + AAD verification (with read-only v1 fallback)
export async function decryptChatPayload(
  envelope: P2PEncryptedEnvelope,
  myPeerId: string,
  options?: {
    localProfileId?: string;
    peerPublicKeyJwk?: JsonWebKey;
  }
): Promise<any> {
  if (
    myPeerId !== envelope.senderPeerId &&
    myPeerId !== envelope.recipientPeerId &&
    envelope.recipientPeerId !== 'my-local'
  ) {
    throw new Error('Криптографический отказ: этот узел является лишь пиром-почтальоном и не имеет ключа дешифровки.');
  }

  const cryptoObj = getCrypto();
  const iv = hexToUint8(envelope.iv);
  const encryptedBytes = hexToUint8(envelope.ciphertext);

  if (envelope.v === 2) {
    const localKeys = await getOrCreateLocalEcdhKeyPair(options?.localProfileId || myPeerId);
    const isRecipient = myPeerId === envelope.recipientPeerId || envelope.recipientPeerId === 'my-local';
    const remoteJwk =
      options?.peerPublicKeyJwk ||
      (isRecipient
        ? envelope.senderEcdhPublicKeyJwk || getPeerEcdhPublicKey(envelope.senderPeerId)
        : getPeerEcdhPublicKey(envelope.recipientPeerId));

    if (!isValidEcP256Jwk(remoteJwk)) {
      throw new Error('Не найден открытый ECDH ключ собеседника для расшифровки конверта.');
    }

    const aesKey = await deriveEcdhSharedAesKey(localKeys.keyPair.privateKey, remoteJwk, envelope.salt, ['decrypt']);
    const aad = new TextEncoder().encode(
      `${envelope.senderPeerId}|${envelope.recipientPeerId}|${envelope.envelopeId}`
    );

    const decryptedBuffer = await cryptoObj.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as Uint8Array<ArrayBuffer>,
        additionalData: aad as Uint8Array<ArrayBuffer>,
      },
      aesKey,
      encryptedBytes as Uint8Array<ArrayBuffer>
    );

    const jsonStr = new TextDecoder().decode(decryptedBuffer);
    const actualHash = await computeContentHash(jsonStr);
    if (envelope.contentHash && actualHash !== envelope.contentHash) {
      throw new Error('Ошибка целостности конверта: SHA-256 содержимого не совпадает.');
    }
    return JSON.parse(jsonStr);
  }

  // Legacy v1 read-only fallback for pre-upgrade envelopes
  const legacyKey = await deriveLegacyV1ChatKey(envelope.senderPeerId, envelope.recipientPeerId, envelope.salt);
  const decryptedBuffer = await cryptoObj.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as Uint8Array<ArrayBuffer>,
    },
    legacyKey,
    encryptedBytes as Uint8Array<ArrayBuffer>
  );
  return JSON.parse(new TextDecoder().decode(decryptedBuffer));
}

// Store and inspect real sealed envelopes for UI privacy inspector
export function saveEncryptedEnvelopeRecord(envelope: P2PEncryptedEnvelope): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(ENVELOPE_VAULT_STORAGE_KEY);
    const list: P2PEncryptedEnvelope[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(e => e.envelopeId !== envelope.envelopeId);
    filtered.unshift(envelope);
    localStorage.setItem(ENVELOPE_VAULT_STORAGE_KEY, JSON.stringify(filtered.slice(0, 60)));
  } catch {
    // Ignore storage quota overflow for preview inspector cache
  }
}

export function getEncryptedEnvelopeById(envelopeId: string): P2PEncryptedEnvelope | null {
  if (typeof localStorage === 'undefined' || !envelopeId) return null;
  try {
    const raw = localStorage.getItem(ENVELOPE_VAULT_STORAGE_KEY);
    if (raw) {
      const list: P2PEncryptedEnvelope[] = JSON.parse(raw);
      const found = list.find(e => e.envelopeId === envelopeId);
      if (found) return found;
    }
    const vaultMatch = getCustodyVaultEnvelopes().find(e => e.envelopeId === envelopeId);
    return vaultMatch || null;
  } catch {
    return null;
  }
}

export function inspectEnvelopePrivacy(envelope: P2PEncryptedEnvelope, observerPeerId: string) {
  const isAuthorized =
    observerPeerId === envelope.senderPeerId ||
    observerPeerId === envelope.recipientPeerId ||
    envelope.recipientPeerId === 'my-local';
  return {
    isAuthorized,
    version: envelope.v || 1,
    envelopeId: envelope.envelopeId,
    sender: envelope.senderName,
    recipient: envelope.recipientName,
    hops: envelope.hops,
    ciphertextPreview: envelope.ciphertext.substring(0, 64) + '... (ECDH P-256 + HKDF + AES-GCM-256)',
    iv: envelope.iv,
    salt: envelope.salt,
    contentHash: envelope.contentHash,
    statusText: isAuthorized
      ? '🔓 Вы авторизованы: ваша пара ключей ECDH P-256 позволяет расшифровать конверт.'
      : '🔒 Полная слепота курьера: промежуточный пир видит только маршрутные заголовки.',
  };
}

// DTN Custody Storage Management (Blind Mailbox Vault on Intermediary Peers)
export function getCustodyVaultEnvelopes(): P2PEncryptedEnvelope[] {
  const saved = localStorage.getItem(CUSTODY_VAULT_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [];
    }
  }
  return [];
}

export function saveEnvelopeToCustody(envelope: P2PEncryptedEnvelope): void {
  const vault = getCustodyVaultEnvelopes();
  if (!vault.some(e => e.envelopeId === envelope.envelopeId)) {
    vault.push(envelope);
    localStorage.setItem(CUSTODY_VAULT_STORAGE_KEY, JSON.stringify(vault));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('p2p:custody_vault_updated', { detail: vault }));
    }
  }
}

export function removeEnvelopeFromCustody(envelopeId: string): void {
  const vault = getCustodyVaultEnvelopes();
  const filtered = vault.filter(e => e.envelopeId !== envelopeId);
  localStorage.setItem(CUSTODY_VAULT_STORAGE_KEY, JSON.stringify(filtered));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('p2p:custody_vault_updated', { detail: filtered }));
  }
}

// Local Chat History Management
export function getAllChatMessages(): P2PChatMessage[] {
  const saved = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
  if (saved) {
    try {
      const parsed: P2PChatMessage[] = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        const seen = new Set<string>();
        const unique: P2PChatMessage[] = [];
        for (const m of parsed) {
          const key = m.id || m.envelopeId;
          if (key && !seen.has(key)) {
            seen.add(key);
            unique.push(m);
          }
        }
        return unique;
      }
      return INITIAL_SAMPLE_CHATS;
    } catch {
      return INITIAL_SAMPLE_CHATS;
    }
  }
  localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(INITIAL_SAMPLE_CHATS));
  return INITIAL_SAMPLE_CHATS;
}

export function saveChatMessage(message: P2PChatMessage): void {
  const messages = getAllChatMessages();
  const existingIndex = messages.findIndex(
    m => (m.id && m.id === message.id) || (m.envelopeId && m.envelopeId === message.envelopeId)
  );
  if (existingIndex >= 0) {
    messages[existingIndex] = message;
  } else {
    messages.push(message);
  }
  localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(messages));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('p2p:chat_updated', { detail: message }));
  }
}

export function getChatMessagesForFriend(myPeerId: string, friendPeerId: string): P2PChatMessage[] {
  const all = getAllChatMessages();
  const filtered = all.filter(
    m =>
      (m.senderPeerId === myPeerId && m.recipientPeerId === friendPeerId) ||
      (m.senderPeerId === friendPeerId && m.recipientPeerId === myPeerId)
  ).sort((a, b) => a.timestamp - b.timestamp);

  const seen = new Set<string>();
  const unique: P2PChatMessage[] = [];
  for (const m of filtered) {
    const key = m.id || m.envelopeId;
    if (key && !seen.has(key)) {
      seen.add(key);
      unique.push(m);
    }
  }
  return unique;
}

// Honest Demo Companion Chats (marked explicitly as non-E2EE demo bot messages)
const INITIAL_SAMPLE_CHATS: P2PChatMessage[] = [
  {
    id: 'msg_init_theo_1',
    envelopeId: 'env_theo_init_1',
    senderPeerId: 'peer_theo_vangogh',
    senderName: 'Тео Кот ван Гог',
    recipientPeerId: 'my-local',
    recipientName: 'Вы (Художник)',
    text: 'Приветствую, брат! Я демонстрационный куратор-бот гильдии. Для настоящего E2EE-общения подключи живого пира через WebRTC.',
    timestamp: Date.now() - 3600000 * 4,
    status: 'delivered',
    deliveryRoute: ['Демо-бот: Тео Кот ван Гог', 'Вы'],
    isE2EE: false,
    isDemoBot: true,
  },
  {
    id: 'msg_init_arles_1',
    envelopeId: 'env_arles_init_1',
    senderPeerId: 'peer_arles_cat',
    senderName: 'Арльский Мурлыка',
    recipientPeerId: 'my-local',
    recipientName: 'Вы (Художник)',
    text: 'Мяу! Это демонстрационная лента офлайн-бота. Настоящее сквозное шифрование ECDH P-256 работает между реальными пирами после обмена ключами.',
    timestamp: Date.now() - 3600000 * 2,
    status: 'delivered',
    deliveryRoute: ['Демо-бот: Арльский Мурлыка', 'Вы'],
    isE2EE: false,
    isDemoBot: true,
  },
];

// Main P2P Send Message Action
export async function sendP2PChatMessage(params: {
  text: string;
  recipient: PeerFriend;
  myProfile: ArtistProfile;
  connectedFriends: PeerFriend[];
  attachmentArtwork?: Artwork;
}): Promise<P2PChatMessage> {
  const { text, recipient, myProfile, connectedFriends, attachmentArtwork } = params;
  const cryptoObj = getCrypto();

  const envelopeId = `env_${cryptoObj.randomUUID()}`;
  const messageId = `msg_${cryptoObj.randomUUID()}`;
  const isDemoBot = recipient.peerId === 'peer_theo_vangogh' || recipient.peerId === 'peer_arles_cat';
  const recipientKey = recipient.ecdhPublicKeyJwk || getPeerEcdhPublicKey(recipient.peerId);

  let isE2EE = false;
  let finalStatus: P2PChatMessage['status'] = 'sending';
  let deliveryRoute: string[] = ['Вы'];
  const isRecipientDirectlyOnline = recipient.status === 'online';

  if (!isDemoBot && isValidEcP256Jwk(recipientKey)) {
    const payloadToEncrypt = {
      messageId,
      envelopeId,
      text: text.trim(),
      attachmentArtworkId: attachmentArtwork?.id,
      attachmentArtworkTitle: attachmentArtwork?.title,
      attachmentArtworkUrl: attachmentArtwork?.imageUrl,
      timestamp: Date.now(),
    };

    const sealed = await encryptChatPayload(
      payloadToEncrypt,
      myProfile.id,
      recipient.peerId,
      {
        envelopeId,
        recipientPublicKeyJwk: recipientKey,
        localProfileId: myProfile.id,
      }
    );

    const envelope: P2PEncryptedEnvelope = {
      v: 2,
      envelopeId,
      senderPeerId: myProfile.id,
      senderName: myProfile.name,
      recipientPeerId: recipient.peerId,
      recipientName: recipient.name,
      createdAt: Date.now(),
      expiresAt: Date.now() + 86400000 * 7,
      ciphertext: sealed.ciphertext,
      iv: sealed.iv,
      salt: sealed.salt,
      contentHash: sealed.contentHash,
      senderEcdhPublicKeyJwk: sealed.senderEcdhPublicKeyJwk,
      hops: [myProfile.name],
      isRelayed: !isRecipientDirectlyOnline,
    };

    isE2EE = true;

    if (isRecipientDirectlyOnline) {
      deliveryRoute = ['Вы', recipient.name];
      finalStatus = 'delivered';
      p2pNetwork.sendDirectMessage(recipient.peerId, {
        type: 'CHAT_ENVELOPE_DIRECT',
        senderProfile: myProfile,
        payload: envelope,
        timestamp: Date.now(),
      });
    } else {
      const availableCouriers = connectedFriends.filter(
        f => f.peerId !== recipient.peerId && f.status === 'online'
      );
      const courierNames = availableCouriers.length > 0
        ? availableCouriers.map(c => c.name)
        : ['Локальный DTN-буфер'];
      envelope.hops = [myProfile.name, ...courierNames];
      deliveryRoute = ['Вы', ...courierNames.map(n => `Курьер: ${n}`), `Ожидает выхода «${recipient.name}» в сеть`];
      finalStatus = 'relayed_in_custody';

      p2pNetwork.broadcastMessage({
        type: 'CHAT_ENVELOPE_CUSTODY',
        senderProfile: myProfile,
        payload: {
          envelope,
          targetPeerId: recipient.peerId,
          couriersCount: availableCouriers.length,
        },
        timestamp: Date.now(),
      });
    }

    saveEncryptedEnvelopeRecord(envelope);
  } else if (isDemoBot) {
    deliveryRoute = ['Вы', `Демо-бот: ${recipient.name} (без E2EE)`];
    finalStatus = 'delivered';
  } else {
    throw new Error(
      `Невозможно отправить зашифрованное сообщение пиру «${recipient.name}»: ещё не выполнен обмен ключами ECDH P-256 через WebRTC.`
    );
  }

  const chatMessage: P2PChatMessage = {
    id: messageId,
    envelopeId,
    senderPeerId: myProfile.id,
    senderName: myProfile.name,
    recipientPeerId: recipient.peerId,
    recipientName: recipient.name,
    text: text.trim(),
    attachmentArtworkId: attachmentArtwork?.id,
    attachmentArtworkTitle: attachmentArtwork?.title,
    attachmentArtworkUrl: attachmentArtwork?.imageUrl,
    timestamp: Date.now(),
    status: finalStatus,
    deliveryRoute,
    isE2EE,
    isDemoBot,
    isRelayedDelivery: !isRecipientDirectlyOnline && isE2EE,
  };

  saveChatMessage(chatMessage);

  // Autonomous companion bot response for demo bots (explicitly tagged isE2EE: false, isDemoBot: true)
  if (isDemoBot) {
    setTimeout(async () => {
      try {
        let idToken: string | null = null;
        try {
          const { auth } = await import('../firebase');
          idToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
        } catch {
          idToken = null;
        }

        let replyText = '';
        if (idToken) {
          const response = await fetch('/api/curator-chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              message: text.trim(),
              recipientPeerId: recipient.peerId,
              senderName: myProfile.name,
            }),
          });
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.reply) {
              replyText = data.reply;
            }
          }
        }

        if (!replyText) {
          replyText =
            recipient.peerId === 'peer_theo_vangogh'
              ? 'Брат мой, я получил твою записку в демо-режиме! Войди через Google для живых ответов куратора или подключи реального пира для настоящего ECDH-шифрования.'
              : 'Мур-мяу! Это автономный демо-отклик без облачного ИИ. Чтобы говорить с облачным куратором, авторизуйся через Google.';
        }

        const replyMsgId = `msg_${cryptoObj.randomUUID()}`;
        const replyEnvelopeId = `env_${cryptoObj.randomUUID()}`;
        const replyMessage: P2PChatMessage = {
          id: replyMsgId,
          envelopeId: replyEnvelopeId,
          senderPeerId: recipient.peerId,
          senderName: recipient.name,
          recipientPeerId: myProfile.id,
          recipientName: myProfile.name,
          text: replyText,
          timestamp: Date.now(),
          status: 'delivered',
          deliveryRoute: [`Демо-бот: ${recipient.name}`, myProfile.name],
          isE2EE: false,
          isDemoBot: true,
        };
        saveChatMessage(replyMessage);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('p2p:chat_updated'));
        }
      } catch (err) {
        console.warn('Autonomous companion chat notice:', err);
      }
    }, 900);
  }

  return chatMessage;
}

export function announcePeerPresence(myProfile: ArtistProfile): void {
  p2pNetwork.broadcastMessage({
    type: 'PEER_PRESENCE_ANNOUNCEMENT',
    senderProfile: myProfile,
    payload: {
      peerId: myProfile.id,
      name: myProfile.name,
      timestamp: Date.now(),
    },
    timestamp: Date.now(),
  });
}

export function deliverCustodyEnvelopesForOnlineFriend(friendPeerId: string, myProfile: ArtistProfile): number {
  const vault = getCustodyVaultEnvelopes();
  const pendingForFriend = vault.filter(e => e.recipientPeerId === friendPeerId);

  if (pendingForFriend.length === 0) return 0;

  for (const envelope of pendingForFriend) {
    envelope.hops.push(`Курьер ${myProfile.name} (доставлено из офлайн-хранилища)`);
    envelope.isRelayed = true;

    p2pNetwork.sendDirectMessage(friendPeerId, {
      type: 'CHAT_ENVELOPE_DIRECT',
      senderProfile: myProfile,
      payload: envelope,
      timestamp: Date.now(),
    });
  }

  return pendingForFriend.length;
}

if (typeof window !== 'undefined') {
  p2pNetwork.onMessage(async (msg: P2PMessage) => {
    const localProfileStr = localStorage.getItem('vangogh_artist_profile');
    if (!localProfileStr) return;

    let myProfile: ArtistProfile;
    try {
      myProfile = JSON.parse(localProfileStr);
    } catch {
      return;
    }

    if (msg.type === 'CHAT_ENVELOPE_DIRECT') {
      const envelope: P2PEncryptedEnvelope = msg.payload;
      if (envelope && (envelope.recipientPeerId === myProfile.id || envelope.recipientPeerId === 'my-local')) {
        try {
          if (envelope.senderEcdhPublicKeyJwk) {
            registerPeerEcdhPublicKey(envelope.senderPeerId, envelope.senderEcdhPublicKeyJwk);
          }
          const decrypted = await decryptChatPayload(envelope, myProfile.id, {
            localProfileId: myProfile.id,
          });

          const newMsg: P2PChatMessage = {
            id: decrypted.messageId || `msg_${getCrypto().randomUUID()}`,
            envelopeId: envelope.envelopeId,
            senderPeerId: envelope.senderPeerId,
            senderName: envelope.senderName,
            recipientPeerId: myProfile.id,
            recipientName: myProfile.name,
            text: decrypted.text,
            attachmentArtworkId: decrypted.attachmentArtworkId,
            attachmentArtworkTitle: decrypted.attachmentArtworkTitle,
            attachmentArtworkUrl: decrypted.attachmentArtworkUrl,
            timestamp: decrypted.timestamp || Date.now(),
            status: 'delivered',
            deliveryRoute: (envelope.hops || []).concat([myProfile.name]),
            isE2EE: envelope.v === 2,
            isRelayedDelivery: envelope.isRelayed,
          };

          saveEncryptedEnvelopeRecord(envelope);
          saveChatMessage(newMsg);

          p2pNetwork.sendDirectMessage(envelope.senderPeerId, {
            type: 'CHAT_DELIVERY_ACK',
            senderProfile: myProfile,
            payload: {
              envelopeId: envelope.envelopeId,
              recipientPeerId: myProfile.id,
              deliveredAt: Date.now(),
              finalRoute: newMsg.deliveryRoute,
            } as P2PDeliveryAck,
            timestamp: Date.now(),
          });
        } catch (err) {
          console.error('Failed to decrypt received chat envelope:', err);
        }
      }
    } else if (msg.type === 'CHAT_ENVELOPE_CUSTODY') {
      const { envelope, targetPeerId } = msg.payload || {};
      if (envelope && targetPeerId !== myProfile.id && envelope.senderPeerId !== myProfile.id) {
        saveEnvelopeToCustody(envelope);
      }
    } else if (msg.type === 'CHAT_DELIVERY_ACK') {
      const ack: P2PDeliveryAck = msg.payload;
      if (ack?.envelopeId) {
        removeEnvelopeFromCustody(ack.envelopeId);

        const all = getAllChatMessages();
        const existing = all.find(m => m.envelopeId === ack.envelopeId);
        if (existing && existing.status !== 'delivered') {
          existing.status = 'delivered';
          existing.deliveryRoute = ack.finalRoute || existing.deliveryRoute;
          saveChatMessage(existing);
        }
      }
    } else if (msg.type === 'PEER_PRESENCE_ANNOUNCEMENT') {
      const onlinePeerId = msg.payload?.peerId;
      if (onlinePeerId && onlinePeerId !== myProfile.id) {
        deliverCustodyEnvelopesForOnlineFriend(onlinePeerId, myProfile);
      }
    }
  });
}
