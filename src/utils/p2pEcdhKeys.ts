// Persistent Non-Extractable ECDH P-256 Keypair & Pinned Peer Public Key Store (TOFU + Key-Change Detection)
import { computeContentHash } from './p2pCrypto';
import { getCryptoKeyPair, saveCryptoKeyPair } from './p2pStorage';

const PEER_ECDH_KEYS_STORAGE_KEY = 'vangogh_p2p_peer_ecdh_keys_v2';
const LEGACY_PEER_ECDH_KEYS_STORAGE_KEY = 'vangogh_p2p_peer_ecdh_keys';

export type PeerKeyTrustStatus = 'none' | 'tofu_unverified' | 'verified' | 'key_changed';

export interface PeerEcdhKeyRecord {
  jwk: JsonWebKey;
  pinnedAt: number;
  verified: boolean;
  verifiedSafetyNumber?: string;
  conflictingJwk?: JsonWebKey;
  conflictDetectedAt?: number;
}

const localEcdhMemoryCache = new Map<string, {
  keyPair: CryptoKeyPair;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
}>();

const peerEcdhMemoryCache = new Map<string, PeerEcdhKeyRecord>();

export function getWebCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { crypto?: Crypto }).crypto) {
    return (globalThis as unknown as { crypto: Crypto }).crypto;
  }
  throw new Error('Web Crypto API is unavailable');
}

export function uint8ToHex(buffer: Uint8Array): string {
  return Array.from(buffer)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function hexToUint8(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function generateRandomHex(byteLength = 16): string {
  const cryptoObj = getWebCrypto();
  const array = new Uint8Array(byteLength);
  cryptoObj.getRandomValues(array);
  return uint8ToHex(array);
}

export function canonicalizeEcPublicJwk(jwk: JsonWebKey): string {
  return JSON.stringify({
    crv: jwk.crv || 'P-256',
    kty: jwk.kty || 'EC',
    x: jwk.x || '',
    y: jwk.y || '',
  });
}

export function isValidEcP256Jwk(jwk: unknown): jwk is JsonWebKey {
  if (!jwk || typeof jwk !== 'object') return false;
  const candidate = jwk as JsonWebKey;
  return (
    candidate.kty === 'EC' &&
    candidate.crv === 'P-256' &&
    typeof candidate.x === 'string' &&
    candidate.x.length >= 16 &&
    typeof candidate.y === 'string' &&
    candidate.y.length >= 16
  );
}

// Persistent non-extractable ECDH P-256 keypair stored in IndexedDB (privateKey is never extractable or serialized as JWK)
export async function getOrCreateLocalEcdhKeyPair(profileId = 'default'): Promise<{
  keyPair: CryptoKeyPair;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
}> {
  const cacheKey = `ecdh_p256_${profileId}`;
  const cached = localEcdhMemoryCache.get(cacheKey);
  if (cached) return cached;

  const cryptoObj = getWebCrypto();
  const stored = await getCryptoKeyPair(cacheKey);

  // 1. Modern non-extractable CryptoKey handles stored in IndexedDB
  if (stored?.publicKey && stored?.privateKey && isValidEcP256Jwk(stored.publicKeyJwk)) {
    const entry = {
      keyPair: { publicKey: stored.publicKey, privateKey: stored.privateKey },
      publicKeyJwk: stored.publicKeyJwk,
      fingerprint: stored.fingerprint,
    };
    localEcdhMemoryCache.set(cacheKey, entry);
    return entry;
  }

  // 2. Migrate legacy JWK record into non-extractable CryptoKey and scrub privateKeyJwk
  if (stored && isValidEcP256Jwk(stored.publicKeyJwk) && stored.privateKeyJwk) {
    try {
      const [publicKey, privateKey] = await Promise.all([
        cryptoObj.subtle.importKey(
          'jwk',
          stored.publicKeyJwk,
          { name: 'ECDH', namedCurve: 'P-256' },
          true,
          []
        ),
        cryptoObj.subtle.importKey(
          'jwk',
          stored.privateKeyJwk,
          { name: 'ECDH', namedCurve: 'P-256' },
          false,
          ['deriveBits']
        ),
      ]);
      await saveCryptoKeyPair({
        id: cacheKey,
        algorithm: 'ECDH-P256',
        publicKey,
        privateKey,
        publicKeyJwk: stored.publicKeyJwk,
        fingerprint: stored.fingerprint,
        createdAt: stored.createdAt || Date.now(),
      });
      const entry = {
        keyPair: { publicKey, privateKey },
        publicKeyJwk: stored.publicKeyJwk,
        fingerprint: stored.fingerprint,
      };
      localEcdhMemoryCache.set(cacheKey, entry);
      return entry;
    } catch {
      // Regenerate if legacy JWK cannot be imported
    }
  }

  // 3. Fresh keypair with extractable = false (privateKey cannot be read via exportKey)
  const keyPair = await cryptoObj.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveBits']
  );

  // Public key export always works even when private key is non-extractable
  const publicKeyJwk = await cryptoObj.subtle.exportKey('jwk', keyPair.publicKey);
  const rawHash = await computeContentHash(canonicalizeEcPublicJwk(publicKeyJwk));
  const fingerprint = `ECDH-P256:${rawHash.slice(0, 8).toUpperCase()}:${rawHash.slice(-8).toUpperCase()}`;

  await saveCryptoKeyPair({
    id: cacheKey,
    algorithm: 'ECDH-P256',
    publicKey: keyPair.publicKey,
    privateKey: keyPair.privateKey,
    publicKeyJwk,
    fingerprint,
    createdAt: Date.now(),
  });

  const entry = { keyPair, publicKeyJwk, fingerprint };
  localEcdhMemoryCache.set(cacheKey, entry);
  return entry;
}

export async function exportMyEcdhPublicJwk(profileId = 'default'): Promise<{
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
}> {
  const { publicKeyJwk, fingerprint } = await getOrCreateLocalEcdhKeyPair(profileId);
  return { publicKeyJwk, fingerprint };
}

function sanitizeEcPublicJwk(jwk: JsonWebKey): JsonWebKey {
  return {
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    y: jwk.y,
    ext: true,
  };
}

function loadPeerRecordFromStorage(peerId: string): PeerEcdhKeyRecord | null {
  const mem = peerEcdhMemoryCache.get(peerId);
  if (mem) return mem;

  if (typeof localStorage === 'undefined') return null;

  try {
    const raw = localStorage.getItem(PEER_ECDH_KEYS_STORAGE_KEY);
    if (raw) {
      const map = JSON.parse(raw) as Record<string, PeerEcdhKeyRecord>;
      const rec = map[peerId];
      if (rec && isValidEcP256Jwk(rec.jwk)) {
        peerEcdhMemoryCache.set(peerId, rec);
        return rec;
      }
    }

    // Read-only migration from v1 unpinned JWK map
    const legacyRaw = localStorage.getItem(LEGACY_PEER_ECDH_KEYS_STORAGE_KEY);
    if (legacyRaw) {
      const legacyMap = JSON.parse(legacyRaw) as Record<string, JsonWebKey>;
      if (legacyMap[peerId] && isValidEcP256Jwk(legacyMap[peerId])) {
        const migrated: PeerEcdhKeyRecord = {
          jwk: sanitizeEcPublicJwk(legacyMap[peerId]),
          pinnedAt: Date.now(),
          verified: false,
        };
        savePeerRecordToStorage(peerId, migrated);
        return migrated;
      }
    }
  } catch {}
  return null;
}

function savePeerRecordToStorage(peerId: string, record: PeerEcdhKeyRecord): void {
  peerEcdhMemoryCache.set(peerId, record);
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem(PEER_ECDH_KEYS_STORAGE_KEY);
    const map: Record<string, PeerEcdhKeyRecord> = raw ? JSON.parse(raw) : {};
    map[peerId] = record;
    localStorage.setItem(PEER_ECDH_KEYS_STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

// Pin peer ECDH key via TOFU; reject silent overwrites when key changes unless explicitly forced
export function registerPeerEcdhPublicKey(
  peerId: string,
  jwk: unknown,
  options?: { forceAccept?: boolean }
): boolean {
  if (!peerId || !isValidEcP256Jwk(jwk)) return false;
  const cleanJwk = sanitizeEcPublicJwk(jwk);
  const existing = loadPeerRecordFromStorage(peerId);

  if (!existing || options?.forceAccept) {
    savePeerRecordToStorage(peerId, {
      jwk: cleanJwk,
      pinnedAt: Date.now(),
      verified: false,
    });
    return true;
  }

  if (canonicalizeEcPublicJwk(existing.jwk) === canonicalizeEcPublicJwk(cleanJwk)) {
    return true;
  }

  // Key changed unexpectedly: keep existing pinned key intact and record conflict warning
  const updatedConflict: PeerEcdhKeyRecord = {
    ...existing,
    conflictingJwk: cleanJwk,
    conflictDetectedAt: Date.now(),
  };
  savePeerRecordToStorage(peerId, updatedConflict);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('p2p:peer_key_changed', { detail: { peerId } }));
  }
  return false;
}

export function getPeerEcdhPublicKey(peerId: string): JsonWebKey | null {
  if (!peerId) return null;
  return loadPeerRecordFromStorage(peerId)?.jwk || null;
}

export function getPeerEcdhKeyState(peerId: string): {
  status: PeerKeyTrustStatus;
  pinnedJwk: JsonWebKey | null;
  conflictingJwk?: JsonWebKey;
  verifiedSafetyNumber?: string;
} {
  if (!peerId) {
    return { status: 'none', pinnedJwk: null };
  }
  const rec = loadPeerRecordFromStorage(peerId);
  if (!rec) {
    return { status: 'none', pinnedJwk: null };
  }
  if (rec.conflictingJwk && isValidEcP256Jwk(rec.conflictingJwk)) {
    return {
      status: 'key_changed',
      pinnedJwk: rec.jwk,
      conflictingJwk: rec.conflictingJwk,
      verifiedSafetyNumber: rec.verifiedSafetyNumber,
    };
  }
  return {
    status: rec.verified ? 'verified' : 'tofu_unverified',
    pinnedJwk: rec.jwk,
    verifiedSafetyNumber: rec.verifiedSafetyNumber,
  };
}

export function markPeerSafetyNumberVerified(peerId: string, safetyNumber: string): boolean {
  const rec = loadPeerRecordFromStorage(peerId);
  if (!rec) return false;
  savePeerRecordToStorage(peerId, {
    ...rec,
    verified: true,
    verifiedSafetyNumber: safetyNumber,
    conflictingJwk: undefined,
    conflictDetectedAt: undefined,
  });
  return true;
}

export function confirmPeerNewEcdhKey(peerId: string): boolean {
  const rec = loadPeerRecordFromStorage(peerId);
  if (!rec?.conflictingJwk || !isValidEcP256Jwk(rec.conflictingJwk)) return false;
  savePeerRecordToStorage(peerId, {
    jwk: sanitizeEcPublicJwk(rec.conflictingJwk),
    pinnedAt: Date.now(),
    verified: false,
  });
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('p2p:peer_key_changed', { detail: { peerId, confirmed: true } }));
  }
  return true;
}

export function clearPeerKeyCacheForTests(): void {
  peerEcdhMemoryCache.clear();
  localEcdhMemoryCache.clear();
}

// Compute symmetric Safety Number (30 digits in 6x5-digit blocks) from both peers' ECDH public keys
export async function computeSafetyNumber(jwkA: JsonWebKey, jwkB: JsonWebKey): Promise<string> {
  const cryptoObj = getWebCrypto();
  const pair = [canonicalizeEcPublicJwk(jwkA), canonicalizeEcPublicJwk(jwkB)].sort().join('|');
  const digest = await cryptoObj.subtle.digest('SHA-256', new TextEncoder().encode(pair));
  const bytes = new Uint8Array(digest);
  const groups: string[] = [];
  for (let i = 0; i < 6; i++) {
    const offset = i * 4;
    const val =
      ((bytes[offset] << 24) >>> 0) +
      (bytes[offset + 1] << 16) +
      (bytes[offset + 2] << 8) +
      bytes[offset + 3];
    groups.push((val % 100000).toString().padStart(5, '0'));
  }
  return groups.join(' ');
}
