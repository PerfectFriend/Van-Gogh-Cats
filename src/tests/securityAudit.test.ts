import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

if (!globalThis.crypto) {
  const { webcrypto } = await import('node:crypto');
  globalThis.crypto = webcrypto as unknown as Crypto;
}

const memoryStore: Record<string, string> = {};
(globalThis as unknown as { localStorage: Storage }).localStorage = {
  get length() {
    return Object.keys(memoryStore).length;
  },
  key: (i: number) => Object.keys(memoryStore)[i] ?? null,
  getItem: (key: string) => memoryStore[key] ?? null,
  setItem: (key: string, value: string) => {
    memoryStore[key] = String(value);
  },
  removeItem: (key: string) => {
    delete memoryStore[key];
  },
  clear: () => {
    for (const k of Object.keys(memoryStore)) delete memoryStore[k];
  },
};

import { validateCatSanctity } from '../utils/catSanctity';
import { computeContentHash } from '../utils/p2pCrypto';
import {
  hashPinCode,
  encryptWithPassphrase,
  decryptWithPassphrase,
  generateBip39Mnemonic,
} from '../utils/bip39';
import {
  saveNewProfile,
  getAllProfiles,
  buildEncryptedProfileArchive,
  decryptEncryptedProfileArchive,
} from '../utils/profileManager';
import {
  getOrCreateLocalEcdhKeyPair,
  encryptChatPayload,
  decryptChatPayload,
  computeSafetyNumber,
  hasSeenEnvelopeReplay,
  recordSeenEnvelope,
} from '../utils/p2pChatProtocol';
import {
  registerPeerEcdhPublicKey,
  getPeerEcdhKeyState,
  confirmPeerNewEcdhKey,
  markPeerSafetyNumberVerified,
  clearPeerKeyCacheForTests,
} from '../utils/p2pEcdhKeys';
import {
  getOrCreatePeerEcdsaKeyPair,
  createPeerEndorsement,
  verifyEndorsementSignature,
} from '../utils/p2pWebOfTrust';
import { ArtistProfile, P2PEncryptedEnvelope, StoredUserProfile } from '../types';

describe('Security & Cryptography Audit Suite', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    clearPeerKeyCacheForTests();
  });

  test('validateCatSanctity handles Unicode word boundaries accurately', () => {
    // Substring traps without real cats must be rejected
    assert.equal(validateCatSanctity('Мурал на стене дома').isCat, false);
    assert.equal(validateCatSanctity('Sunflowers over tomato field').isCat, false);
    assert.equal(validateCatSanctity('Странная догадка в темноте').isCat, false);

    // Co-presence of cat + dog should be allowed
    assert.equal(validateCatSanctity('Cat with a dog on a couch').isCat, true);
    assert.equal(validateCatSanctity('Рыжий кот и пёс на террасе').isCat, true);
  });

  test('computeContentHash returns full 64-character lowercase SHA-256 hex digest', async () => {
    const hash = await computeContentHash('vangogh-cat-masterpiece');
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  test('hashPinCode uses PBKDF2-SHA256 deterministically for same salt and rejects different PIN/salt', async () => {
    const h1 = await hashPinCode('1984', 'salt_aabbccdd');
    const h2 = await hashPinCode('1984', 'salt_aabbccdd');
    const h3 = await hashPinCode('1985', 'salt_aabbccdd');
    const h4 = await hashPinCode('1984', 'salt_different');

    assert.equal(h1, h2);
    assert.equal(h1.length, 64);
    assert.notEqual(h1, h3);
    assert.notEqual(h1, h4);
  });

  test('Plaintext seedPhrase is scrubbed from stored profiles & encrypted archive roundtrip succeeds/fails safely', async () => {
    const mnemonic = await generateBip39Mnemonic();
    const profileWithLegacySeed = {
      id: 'prof_test_1',
      name: 'Винсент Кот',
      avatarColor: 'from-amber-500 to-yellow-600',
      bio: 'Painter',
      createdAt: Date.now(),
      totalCreations: 0,
      likedArtworkIds: [],
      seedPhrase: mnemonic,
      hasBip39Wallet: true,
    } as StoredUserProfile & { seedPhrase: string };

    const savedRes = saveNewProfile(profileWithLegacySeed);
    assert.equal(savedRes.success, true);

    const profiles = getAllProfiles();
    assert.equal(profiles.length, 1);
    assert.equal(Object.prototype.hasOwnProperty.call(profiles[0], 'seedPhrase'), false);

    // Direct passphrase encryption roundtrip
    const cipherPayload = await encryptWithPassphrase('secret-canvas-key', 'StrongPassphrase!42');
    const decrypted = await decryptWithPassphrase(cipherPayload, 'StrongPassphrase!42');
    assert.equal(decrypted, 'secret-canvas-key');

    await assert.rejects(() => decryptWithPassphrase(cipherPayload, 'WrongPassphrase!'));

    // Encrypted .catpack.enc.json archive roundtrip
    const archive = await buildEncryptedProfileArchive(profiles[0], [], 'ArchiveSecret99!', mnemonic);
    const parsedBack = await decryptEncryptedProfileArchive(JSON.stringify(archive), 'ArchiveSecret99!');
    assert.equal(parsedBack.profile.id, profiles[0].id);
    assert.equal(parsedBack.optionalSeedPhrase, mnemonic);

    await assert.rejects(() => decryptEncryptedProfileArchive(JSON.stringify(archive), 'BadPassword'));
  });

  test('ECDH P-256 v2 E2EE encrypts, decrypts, verifies symmetric Safety Number, and rejects tampered AAD', async () => {
    const aliceId = 'peer_alice_e2ee';
    const bobId = 'peer_bob_e2ee';

    const aliceKeys = await getOrCreateLocalEcdhKeyPair(aliceId);
    const bobKeys = await getOrCreateLocalEcdhKeyPair(bobId);

    const snAliceBob = await computeSafetyNumber(aliceKeys.publicKeyJwk, bobKeys.publicKeyJwk);
    const snBobAlice = await computeSafetyNumber(bobKeys.publicKeyJwk, aliceKeys.publicKeyJwk);
    assert.equal(snAliceBob, snBobAlice);
    assert.match(snAliceBob, /^\d{5}( \d{5}){5}$/);

    const sealed = await encryptChatPayload(
      { text: 'Мяу под звёздами Арля', messageId: 'm1' },
      aliceId,
      bobId,
      {
        envelopeId: 'env_e2ee_test_1',
        recipientPublicKeyJwk: bobKeys.publicKeyJwk,
        localProfileId: aliceId,
      }
    );

    assert.equal(sealed.v, 2);

    const envelope = {
      v: 2,
      envelopeId: sealed.envelopeId,
      senderPeerId: aliceId,
      senderName: 'Алиса',
      recipientPeerId: bobId,
      recipientName: 'Боб',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
      ciphertext: sealed.ciphertext,
      iv: sealed.iv,
      salt: sealed.salt,
      contentHash: sealed.contentHash,
      senderEcdhPublicKeyJwk: sealed.senderEcdhPublicKeyJwk,
      hops: ['Алиса'],
      isRelayed: false,
    };

    const decrypted = await decryptChatPayload(envelope, bobId, {
      localProfileId: bobId,
    });
    assert.equal(decrypted.text, 'Мяу под звёздами Арля');

    // Tamper AAD field (envelopeId) -> AES-GCM authentication must reject
    await assert.rejects(() =>
      decryptChatPayload(
        { ...envelope, envelopeId: 'env_tampered' },
        bobId,
        { localProfileId: bobId }
      )
    );
  });

  test('ECDSA P-256 Web of Trust signs endorsements, verifies valid signatures, and rejects tampered or demo records', async () => {
    const keyInfo = await getOrCreatePeerEcdsaKeyPair();
    assert.ok(keyInfo.fingerprint.startsWith('ECDSA-P256:'));

    const artist: ArtistProfile = {
      id: 'artist_ecdsa_1',
      name: 'Кот Сезанн',
      avatarColor: 'from-amber-500 to-yellow-600',
      bio: 'Post-impressionist cat',
      createdAt: Date.now(),
      totalCreations: 5,
      likedArtworkIds: [],
    };

    const endorsement = await createPeerEndorsement(
      artist,
      'trusted_artist',
      'peer_target_1',
      'Кот Дега',
      5,
      'Превосходный кошачий портрет'
    );

    assert.equal(endorsement.isDemo, false);
    assert.ok(endorsement.endorserPublicKeyJwk);
    assert.equal(await verifyEndorsementSignature(endorsement), true);

    // Tampered statement must fail verification
    assert.equal(
      await verifyEndorsementSignature({
        ...endorsement,
        statement: 'Подменённый отзыв',
      }),
      false
    );

    // Demo endorsements never pass cryptographic verification
    assert.equal(
      await verifyEndorsementSignature({
        ...endorsement,
        isDemo: true,
      }),
      false
    );
  });

  test('Private Web Crypto ECDH key is non-extractable and ECDSA private key never leaves WebOfTrust closure', async () => {
    const ecdh = await getOrCreateLocalEcdhKeyPair('non_extractable_profile');
    const ecdsa = await getOrCreatePeerEcdsaKeyPair();

    assert.equal(ecdh.keyPair.privateKey.extractable, false);
    await assert.rejects(() => globalThis.crypto.subtle.exportKey('jwk', ecdh.keyPair.privateKey));

    assert.equal('keyPair' in ecdsa, false);
    assert.equal('privateKeyJwk' in ecdsa, false);
    assert.equal('d' in ecdsa.publicKeyJwk, false);
    const sig = await ecdsa.sign('challenge_check');
    assert.ok(sig.startsWith('SIG_ECDSA_'));
  });

  test('TOFU key pinning blocks silent key replacement (PEER_KEY_CHANGED) until user confirms new key', async () => {
    const aliceId = 'peer_alice_pin';
    const bobId = 'peer_bob_pin';
    const attackerId = 'peer_attacker_key';

    const aliceKeys = await getOrCreateLocalEcdhKeyPair(aliceId);
    const bobKeys = await getOrCreateLocalEcdhKeyPair(bobId);
    const otherKeys = await getOrCreateLocalEcdhKeyPair(attackerId);

    // Pin Alice's authentic key on Bob's device
    assert.equal(registerPeerEcdhPublicKey(aliceId, aliceKeys.publicKeyJwk), true);
    const safety = await computeSafetyNumber(aliceKeys.publicKeyJwk, bobKeys.publicKeyJwk);
    assert.equal(markPeerSafetyNumberVerified(aliceId, safety), true);
    assert.equal(getPeerEcdhKeyState(aliceId).status, 'verified');

    // Forged/rotated envelope claiming to be from aliceId with different key
    const forgedSealed = await encryptChatPayload(
      { text: 'Подменённое сообщение', messageId: 'm_forged' },
      attackerId,
      bobId,
      {
        envelopeId: 'env_forged_1',
        recipientPublicKeyJwk: bobKeys.publicKeyJwk,
        localProfileId: attackerId,
      }
    );

    const forgedEnvelope: P2PEncryptedEnvelope = {
      v: 2,
      envelopeId: forgedSealed.envelopeId,
      senderPeerId: aliceId,
      senderName: 'Алиса?',
      recipientPeerId: bobId,
      recipientName: 'Боб',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
      ciphertext: forgedSealed.ciphertext,
      iv: forgedSealed.iv,
      salt: forgedSealed.salt,
      contentHash: forgedSealed.contentHash,
      senderEcdhPublicKeyJwk: otherKeys.publicKeyJwk,
      hops: ['Алиса?'],
      isRelayed: false,
    };

    await assert.rejects(
      () => decryptChatPayload(forgedEnvelope, bobId, { localProfileId: bobId }),
      /PEER_KEY_CHANGED/
    );
    assert.equal(getPeerEcdhKeyState(aliceId).status, 'key_changed');

    // Explicit user confirmation rotates the pinned key and clears conflict
    assert.equal(confirmPeerNewEcdhKey(aliceId), true);
    assert.equal(getPeerEcdhKeyState(aliceId).status, 'tofu_unverified');
  });

  test('Legacy v1 envelopes are rejected on network and envelope replay protection tracks seen IDs', async () => {
    const legacyEnvelope: P2PEncryptedEnvelope = {
      v: 1,
      envelopeId: 'env_legacy_v1',
      senderPeerId: 'peer_a',
      senderName: 'А',
      recipientPeerId: 'peer_b',
      recipientName: 'Б',
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000,
      ciphertext: '00112233',
      iv: '00112233445566778899aabb',
      salt: '00112233445566778899aabbccddeeff',
      contentHash: '0'.repeat(64),
      hops: ['А'],
      isRelayed: false,
    };

    await assert.rejects(
      () => decryptChatPayload(legacyEnvelope, 'peer_b'),
      /LEGACY_V1_REJECTED/
    );

    assert.equal(hasSeenEnvelopeReplay('env_replay_unique_1'), false);
    recordSeenEnvelope('env_replay_unique_1');
    assert.equal(hasSeenEnvelopeReplay('env_replay_unique_1'), true);
  });
});

