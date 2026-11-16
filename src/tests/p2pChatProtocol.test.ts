import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAllChatMessages,
  saveChatMessage,
  getChatMessagesForFriend,
} from '../utils/p2pChatProtocol';
import { P2PChatMessage } from '../types';

// Mock localStorage for Node test runner
const memoryStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, value: string) => {
    memoryStore[key] = value;
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
  clear: () => {
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
  },
};

(globalThis as any).localStorage = mockLocalStorage;

describe('P2P Chat Protocol Message Deduplication', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  test('getAllChatMessages deduplicates entries with identical id or envelopeId', () => {
    const rawDuplicateMessages: P2PChatMessage[] = [
      {
        id: 'msg_mtzufby7_xb1lq',
        envelopeId: 'env_1',
        senderPeerId: 'peer_a',
        senderName: 'Кот А',
        recipientPeerId: 'peer_b',
        recipientName: 'Кот Б',
        text: 'Мяу 1',
        timestamp: 1000,
        status: 'delivered',
        deliveryRoute: ['peer_a', 'peer_b'],
        isE2EE: true,
      },
      {
        id: 'msg_mtzufby7_xb1lq',
        envelopeId: 'env_1',
        senderPeerId: 'peer_a',
        senderName: 'Кот А',
        recipientPeerId: 'peer_b',
        recipientName: 'Кот Б',
        text: 'Мяу 1 duplicate',
        timestamp: 1000,
        status: 'delivered',
        deliveryRoute: ['peer_a', 'peer_b'],
        isE2EE: true,
      },
    ];

    mockLocalStorage.setItem('vangogh_p2p_chat_history', JSON.stringify(rawDuplicateMessages));
    const result = getAllChatMessages();

    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'msg_mtzufby7_xb1lq');
  });

  test('saveChatMessage updates existing message instead of duplicating', () => {
    // Start with empty history
    mockLocalStorage.setItem('vangogh_p2p_chat_history', JSON.stringify([]));

    const msg: P2PChatMessage = {
      id: 'msg_mtzufby7_xb1lq',
      envelopeId: 'env_1',
      senderPeerId: 'peer_a',
      senderName: 'Кот А',
      recipientPeerId: 'peer_b',
      recipientName: 'Кот Б',
      text: 'Original',
      timestamp: 1000,
      status: 'sending',
      deliveryRoute: ['peer_a'],
      isE2EE: true,
    };

    saveChatMessage(msg);
    saveChatMessage({ ...msg, text: 'Updated delivery', status: 'delivered' });

    const all = getAllChatMessages();
    assert.equal(all.length, 1);
    assert.equal(all[0].id, 'msg_mtzufby7_xb1lq');
    assert.equal(all[0].text, 'Updated delivery');
    assert.equal(all[0].status, 'delivered');
  });

  test('getChatMessagesForFriend returns unique messages without duplicate keys', () => {
    const msgA: P2PChatMessage = {
      id: 'msg_test_1',
      envelopeId: 'env_test_1',
      senderPeerId: 'peer_me',
      senderName: 'Me',
      recipientPeerId: 'peer_friend',
      recipientName: 'Friend',
      text: 'Hello',
      timestamp: 1000,
      status: 'delivered',
      deliveryRoute: ['peer_me', 'peer_friend'],
      isE2EE: true,
    };

    saveChatMessage(msgA);
    const messages = getChatMessagesForFriend('peer_me', 'peer_friend');
    assert.equal(messages.length, 1);

    // Verify all keys are unique
    const keys = messages.map((m, idx) => m.id ? `${m.id}_${idx}` : `msg_${idx}`);
    const uniqueKeys = new Set(keys);
    assert.equal(uniqueKeys.size, keys.length);
  });
});
