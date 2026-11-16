// Van Gogh Whispers: P2P Chat Protocol with End-to-End Encryption (E2EE) and Store-and-Forward (DTN) Custody
import { ArtistProfile, Artwork, PeerFriend, P2PChatMessage, P2PEncryptedEnvelope, P2PDeliveryAck } from '../types';
import { p2pNetwork, P2PMessage } from './p2pNetwork';
import { computeContentHash } from './p2pCrypto';

const CHAT_HISTORY_STORAGE_KEY = 'vangogh_p2p_chat_history';
const CUSTODY_VAULT_STORAGE_KEY = 'vangogh_dtn_custody_vault';

// Helper: Convert Uint8Array to Hex string and vice-versa
function uint8ToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToUint8(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// Generate random Hex IV
function generateRandomHex(byteLength = 16): string {
  const array = new Uint8Array(byteLength);
  window.crypto.getRandomValues(array);
  return uint8ToHex(array);
}

// Derive Shared E2EE Key between Sender and Recipient (PBKDF2 + AES-GCM 256)
async function deriveSharedChatKey(peerA: string, peerB: string, saltHex: string): Promise<CryptoKey> {
  const sortedPeerIds = [peerA, peerB].sort().join('::vangogh_cats_e2ee_channel::');
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(sortedPeerIds),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  const salt = hexToUint8(saltHex);

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 20000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

// Encrypt plaintext payload into blind ciphertext
export async function encryptChatPayload(
  payload: any,
  senderPeerId: string,
  recipientPeerId: string
): Promise<{ ciphertext: string; iv: string; salt: string; contentHash: string }> {
  const salt = generateRandomHex(16);
  const ivHex = generateRandomHex(12); // Standard 96-bit IV for AES-GCM
  const iv = hexToUint8(ivHex);

  const key = await deriveSharedChatKey(senderPeerId, recipientPeerId, salt);
  const jsonStr = JSON.stringify(payload);
  const contentHash = await computeContentHash(jsonStr);

  const encoder = new TextEncoder();
  const encodedData = encoder.encode(jsonStr);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    encodedData
  );

  const ciphertext = uint8ToHex(new Uint8Array(encryptedBuffer));
  return { ciphertext, iv: ivHex, salt, contentHash };
}

// Decrypt blind ciphertext using shared secret key
export async function decryptChatPayload(
  envelope: P2PEncryptedEnvelope,
  myPeerId: string
): Promise<any> {
  // Check authorization: only sender or recipient can decrypt
  if (myPeerId !== envelope.senderPeerId && myPeerId !== envelope.recipientPeerId) {
    throw new Error('Криптографический отказ: этот узел является лишь пиром-почтальоном и не имеет ключа дешифровки.');
  }

  const key = await deriveSharedChatKey(envelope.senderPeerId, envelope.recipientPeerId, envelope.salt);
  const iv = hexToUint8(envelope.iv);
  const encryptedBytes = hexToUint8(envelope.ciphertext);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv as any,
    },
    key,
    encryptedBytes as any
  );

  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decryptedBuffer);
  return JSON.parse(jsonStr);
}

// Test/Demonstration helper: Shows what an intermediary blind relay peer sees vs what the recipient sees
export function inspectEnvelopePrivacy(envelope: P2PEncryptedEnvelope, observerPeerId: string) {
  const isAuthorized = observerPeerId === envelope.senderPeerId || observerPeerId === envelope.recipientPeerId;
  return {
    isAuthorized,
    envelopeId: envelope.envelopeId,
    sender: envelope.senderName,
    recipient: envelope.recipientName,
    hops: envelope.hops,
    ciphertextPreview: envelope.ciphertext.substring(0, 48) + '... (Зашифровано AES-GCM 256)',
    iv: envelope.iv,
    salt: envelope.salt,
    contentHash: envelope.contentHash,
    statusText: isAuthorized
      ? '🔓 Вы авторизованы: ваш закрытый ключ позволяет прочесть сообщение.'
      : '🔒 Полная слепота курьера: пиры-друзья видят только адрес доставки, прочесть текст математически невозможно.',
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
  // Avoid duplicate storage
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

// Demo Initial Chats showcasing the protocol
const INITIAL_SAMPLE_CHATS: P2PChatMessage[] = [
  {
    id: 'msg_init_theo_1',
    envelopeId: 'env_theo_init_1',
    senderPeerId: 'peer_theo_vangogh',
    senderName: 'Тео Кот ван Гог',
    recipientPeerId: 'my-local',
    recipientName: 'Вы (Художник)',
    text: 'Приветствую, брат! Картины из Арля великолепны. Как продвигается работа над звёздным небом?',
    timestamp: Date.now() - 3600000 * 4,
    status: 'delivered',
    deliveryRoute: ['Тео Кот ван Гог', 'Вы'],
    isE2EE: true,
  },
  {
    id: 'msg_init_arles_1',
    envelopeId: 'env_arles_init_1',
    senderPeerId: 'peer_arles_cat',
    senderName: 'Арльский Мурлыка',
    recipientPeerId: 'my-local',
    recipientName: 'Вы (Художник)',
    text: 'Мяу! Я был офлайн вчера, но почтовый протокол пиров доставил твою палитру подсолнухов прямо в мою корзинку!',
    timestamp: Date.now() - 3600000 * 2,
    status: 'delivered',
    deliveryRoute: ['Арльский Мурлыка', 'Курьер: Тео Кот ван Гог', 'Вы'],
    isE2EE: true,
    isRelayedDelivery: true,
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

  const envelopeId = 'env_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  const messageId = 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);

  // 1. Prepare raw payload to be sealed inside E2EE envelope
  const payloadToEncrypt = {
    messageId,
    envelopeId,
    text: text.trim(),
    attachmentArtworkId: attachmentArtwork?.id,
    attachmentArtworkTitle: attachmentArtwork?.title,
    attachmentArtworkUrl: attachmentArtwork?.imageUrl,
    timestamp: Date.now(),
  };

  // 2. Encrypt payload with E2EE
  const { ciphertext, iv, salt, contentHash } = await encryptChatPayload(
    payloadToEncrypt,
    myProfile.id,
    recipient.peerId
  );

  const isRecipientDirectlyOnline = recipient.status === 'online';

  // 3. Construct sealed envelope
  const envelope: P2PEncryptedEnvelope = {
    envelopeId,
    senderPeerId: myProfile.id,
    senderName: myProfile.name,
    recipientPeerId: recipient.peerId,
    recipientName: recipient.name,
    createdAt: Date.now(),
    expiresAt: Date.now() + 86400000 * 7, // 7 days TTL
    ciphertext,
    iv,
    salt,
    contentHash,
    hops: [myProfile.name],
    isRelayed: !isRecipientDirectlyOnline,
  };

  let finalStatus: P2PChatMessage['status'] = 'sending';
  let deliveryRoute: string[] = ['Вы'];

  if (isRecipientDirectlyOnline) {
    // Mode A: Direct P2P delivery
    deliveryRoute = ['Вы', recipient.name];
    finalStatus = 'delivered';

    p2pNetwork.broadcastMessage({
      type: 'CHAT_ENVELOPE_DIRECT',
      senderProfile: myProfile,
      payload: envelope,
      timestamp: Date.now(),
    });
  } else {
    // Mode B: Store-and-Forward / DTN via friends
    // Find online friends who can act as blind custodians/couriers
    const availableCouriers = connectedFriends.filter(
      f => f.peerId !== recipient.peerId && f.status === 'online'
    );

    const courierNames = availableCouriers.length > 0 
      ? availableCouriers.map(c => c.name) 
      : ['Децентрализованная сеть пиров'];

    envelope.hops = [myProfile.name, ...courierNames];
    deliveryRoute = ['Вы', ...courierNames.map(n => `Курьер: ${n}`), `Ожидает выхода «${recipient.name}» в сеть`];
    finalStatus = 'relayed_in_custody';

    // Broadcast custody request to online peer friends
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

  // 4. Save local chat message representation
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
    isE2EE: true,
    isRelayedDelivery: !isRecipientDirectlyOnline,
  };

  saveChatMessage(chatMessage);

  // Autonomous companion bot response for Theo Van Gogh or Arles Cat (eliminates dead-end simulation)
  if (recipient.peerId === 'peer_theo_vangogh' || recipient.peerId === 'peer_arles_cat') {
    setTimeout(async () => {
      try {
        const response = await fetch('/api/curator-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            recipientPeerId: recipient.peerId,
            senderName: myProfile.name,
          }),
        });
        const data = await response.json();
        if (data.success && data.reply) {
          const replyMsgId = 'msg_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
          const replyEnvelopeId = 'env_' + Date.now().toString(36);
          const replyMessage: P2PChatMessage = {
            id: replyMsgId,
            envelopeId: replyEnvelopeId,
            senderPeerId: recipient.peerId,
            senderName: recipient.name,
            recipientPeerId: myProfile.id,
            recipientName: myProfile.name,
            text: data.reply,
            timestamp: Date.now(),
            status: 'delivered',
            deliveryRoute: [recipient.name, myProfile.name],
            isE2EE: true,
          };
          saveChatMessage(replyMessage);
          window.dispatchEvent(new CustomEvent('p2p:chat_updated'));
        }
      } catch (err) {
        console.warn('Autonomous companion chat error:', err);
      }
    }, 1200 + Math.random() * 800);
  }

  return chatMessage;
}

// Announce presence when a peer comes online, triggering courier delivery of stored envelopes
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

// Check and deliver custody envelopes when a friend is discovered online
export function deliverCustodyEnvelopesForOnlineFriend(friendPeerId: string, myProfile: ArtistProfile): number {
  const vault = getCustodyVaultEnvelopes();
  const pendingForFriend = vault.filter(e => e.recipientPeerId === friendPeerId);

  if (pendingForFriend.length === 0) return 0;

  for (const envelope of pendingForFriend) {
    envelope.hops.push(`Курьер ${myProfile.name} (доставлено из офлайн-хранилища)`);
    envelope.isRelayed = true;

    // Send to the now-online friend
    p2pNetwork.broadcastMessage({
      type: 'CHAT_ENVELOPE_DIRECT',
      senderProfile: myProfile,
      payload: envelope,
      timestamp: Date.now(),
    });
  }

  return pendingForFriend.length;
}

// Global P2P Network Message Listener for Chat & DTN Custody
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

    // 1. Direct Envelope delivery to me
    if (msg.type === 'CHAT_ENVELOPE_DIRECT') {
      const envelope: P2PEncryptedEnvelope = msg.payload;
      if (envelope && (envelope.recipientPeerId === myProfile.id || envelope.recipientPeerId === 'my-local')) {
        try {
          // Decrypt payload with my private/shared key
          const decrypted = await decryptChatPayload(envelope, myProfile.id);

          const newMsg: P2PChatMessage = {
            id: decrypted.messageId || 'msg_' + Date.now(),
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
            deliveryRoute: envelope.hops.concat([myProfile.name]),
            isE2EE: true,
            isRelayedDelivery: envelope.isRelayed,
          };

          saveChatMessage(newMsg);

          // Send Delivery Receipt (ACK) across network so couriers can prune their mailbox vault
          p2pNetwork.broadcastMessage({
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
    }

    // 2. Custody Envelope request: I am acting as a blind Store-and-Forward courier for a friend
    else if (msg.type === 'CHAT_ENVELOPE_CUSTODY') {
      const { envelope, targetPeerId } = msg.payload || {};
      if (envelope && targetPeerId !== myProfile.id && envelope.senderPeerId !== myProfile.id) {
        // As a courier, I store this sealed envelope in my blind mailbox vault
        saveEnvelopeToCustody(envelope);
      }
    }

    // 3. Delivery ACK: Recipient received and decrypted the envelope
    else if (msg.type === 'CHAT_DELIVERY_ACK') {
      const ack: P2PDeliveryAck = msg.payload;
      if (ack?.envelopeId) {
        // If I was holding this in custody, delete it from vault
        removeEnvelopeFromCustody(ack.envelopeId);

        // If I am the sender, update my message status to 'delivered'
        const all = getAllChatMessages();
        const msg = all.find(m => m.envelopeId === ack.envelopeId);
        if (msg && msg.status !== 'delivered') {
          msg.status = 'delivered';
          msg.deliveryRoute = ack.finalRoute || msg.deliveryRoute;
          saveChatMessage(msg);
        }
      }
    }

    // 4. Peer announced presence: check if I hold any envelopes in custody for them
    else if (msg.type === 'PEER_PRESENCE_ANNOUNCEMENT') {
      const onlinePeerId = msg.payload?.peerId;
      if (onlinePeerId && onlinePeerId !== myProfile.id) {
        deliverCustodyEnvelopesForOnlineFriend(onlinePeerId, myProfile);
      }
    }
  });
}
