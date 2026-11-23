// Persistent ECDH P-256 Keypair & Peer Public Key Store + Safety Numbers
import { computeContentHash } from './p2pCrypto';
import { getCryptoKeyPair, saveCryptoKeyPair } from './p2pStorage';

const PEER_ECDH_KEYS_STORAGE_KEY = 'vangogh_p2p_peer_ecdh_keys';

const localEcdhMemoryCache = new Map<string, {
  keyPair: CryptoKeyPair;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
}>();

const peerEcdhMemoryCache = new Map<string, JsonWebKey>();

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

// Persistent ECDH P-256 keypair stored in IndexedDB (with in-memory cache for Node tests & performance)
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
          true,
          ['deriveBits']
        ),
      ]);
      const entry = {
        keyPair: { publicKey, privateKey },
        publicKeyJwk: stored.publicKeyJwk,
        fingerprint: stored.fingerprint,
      };
      localEcdhMemoryCache.set(cacheKey, entry);
      return entry;
    } catch {
      // Regenerate if stored JWK cannot be imported
    }
  }

  const keyPair = await cryptoObj.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  );

  const [publicKeyJwk, privateKeyJwk] = await Promise.all([
    cryptoObj.subtle.exportKey('jwk', keyPair.publicKey),
    cryptoObj.subtle.exportKey('jwk', keyPair.privateKey),
  ]);

  const rawHash = await computeContentHash(canonicalizeEcPublicJwk(publicKeyJwk));
  const fingerprint = `ECDH-P256:${rawHash.slice(0, 8).toUpperCase()}:${rawHash.slice(-8).toUpperCase()}`;

  await saveCryptoKeyPair({
    id: cacheKey,
    algorithm: 'ECDH-P256',
    publicKeyJwk,
    privateKeyJwk,
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

export function registerPeerEcdhPublicKey(peerId: string, jwk: unknown): boolean {
  if (!peerId || !isValidEcP256Jwk(jwk)) return false;
  const cleanJwk: JsonWebKey = {
    kty: jwk.kty,
    crv: jwk.crv,
    x: jwk.x,
    y: jwk.y,
    ext: true,
  };
  peerEcdhMemoryCache.set(peerId, cleanJwk);

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(PEER_ECDH_KEYS_STORAGE_KEY);
      const map: Record<string, JsonWebKey> = raw ? JSON.parse(raw) : {};
      map[peerId] = cleanJwk;
      localStorage.setItem(PEER_ECDH_KEYS_STORAGE_KEY, JSON.stringify(map));
    } catch {}
  }
  return true;
}

export function getPeerEcdhPublicKey(peerId: string): JsonWebKey | null {
  if (!peerId) return null;
  const fromMem = peerEcdhMemoryCache.get(peerId);
  if (fromMem) return fromMem;

  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(PEER_ECDH_KEYS_STORAGE_KEY);
      if (raw) {
        const map = JSON.parse(raw) as Record<string, JsonWebKey>;
        if (map[peerId] && isValidEcP256Jwk(map[peerId])) {
          peerEcdhMemoryCache.set(peerId, map[peerId]);
          return map[peerId];
        }
      }
    } catch {}
  }
  return null;
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
