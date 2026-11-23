import { PeerEndorsement, WebOfTrustProfile, TrustTier, ArtistProfile } from '../types';
import { computeSha256 } from './p2pSwarmChunker';
import { getCryptoKeyPair, saveCryptoKeyPair } from './p2pStorage';

const STORAGE_KEY_ENDORSEMENTS = 'vangogh_peer_endorsements';
const ECDSA_STORAGE_ID = 'ecdsa_p256_identity';

// Demo endorsements from sample guild personas (explicitly marked isDemo: true)
const DEFAULT_ENDORSEMENTS: PeerEndorsement[] = [
  {
    id: 'end_theo_1',
    endorserPeerId: 'peer_theo_vangogh',
    endorserName: 'Тео Ван Гог (Парижский салон)',
    endorserTier: 'guild_patriarch',
    subjectPeerId: 'local_painter',
    subjectPeerName: 'Винсент Рыжехвостый',
    trustScoreAssigned: 5,
    statement: 'Брат мой, твои полотна с кошками Сен-Реми обладают несравненным пылом и чистейшей живописной правдой!',
    digitalSignature: 'DEMO_SAMPLE_ENDORSEMENT',
    isDemo: true,
    timestamp: Date.now() - 86400000 * 3,
    txHash: '0x7f88a99120bc129487fa832b49c0d12e9944a821fb7a66100c4',
  },
  {
    id: 'end_arles_2',
    endorserPeerId: 'peer_arles_cat',
    endorserName: 'Арльский Мурлыка',
    endorserTier: 'master_post_impressionist',
    subjectPeerId: 'local_painter',
    subjectPeerName: 'Винсент Рыжехвостый',
    trustScoreAssigned: 5,
    statement: 'Подтверждаю абсолютную подлинность кошачьей натуры во всех холстах. Никаких чужаков, только коты!',
    digitalSignature: 'DEMO_SAMPLE_ENDORSEMENT',
    isDemo: true,
    timestamp: Date.now() - 86400000 * 1.5,
    txHash: '0x12bb998834ef19a84210a99c0018fa7b2210bc9882a17cb1299',
  },
];

let localEcdsaCache: {
  keyPair: CryptoKeyPair;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
} | null = null;

function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { crypto?: Crypto }).crypto) {
    return (globalThis as unknown as { crypto: Crypto }).crypto;
  }
  throw new Error('Web Crypto API is unavailable');
}

function isValidEcdsaJwk(jwk: unknown): jwk is JsonWebKey {
  if (!jwk || typeof jwk !== 'object') return false;
  const candidate = jwk as JsonWebKey;
  return (
    candidate.kty === 'EC' &&
    candidate.crv === 'P-256' &&
    typeof candidate.x === 'string' &&
    typeof candidate.y === 'string'
  );
}

export function buildEndorsementCanonicalPayload(
  endorserPeerId: string,
  subjectPeerId: string,
  trustScoreAssigned: number,
  statement: string,
  timestamp: number
): string {
  return JSON.stringify({
    endorserPeerId,
    subjectPeerId,
    trustScoreAssigned,
    statement,
    timestamp,
  });
}

// Get or generate persistent non-extractable Web Crypto ECDSA P-256 key pair (stored in IndexedDB crypto_keys)
export async function getOrCreatePeerEcdsaKeyPair(): Promise<{
  fingerprint: string;
  publicKeyJwk: JsonWebKey;
  sign: (payload: string) => Promise<string>;
}> {
  const cryptoObj = getCrypto();

  if (!localEcdsaCache) {
    const stored = await getCryptoKeyPair(ECDSA_STORAGE_ID);

    // 1. Modern non-extractable CryptoKey handles stored in IndexedDB
    if (stored?.publicKey && stored?.privateKey && isValidEcdsaJwk(stored.publicKeyJwk)) {
      localEcdsaCache = {
        keyPair: { publicKey: stored.publicKey, privateKey: stored.privateKey },
        publicKeyJwk: stored.publicKeyJwk,
        fingerprint: stored.fingerprint,
      };
    } else if (stored && isValidEcdsaJwk(stored.publicKeyJwk) && stored.privateKeyJwk) {
      // 2. Migrate legacy JWK to non-extractable handle & scrub privateKeyJwk
      try {
        const [publicKey, privateKey] = await Promise.all([
          cryptoObj.subtle.importKey(
            'jwk',
            stored.publicKeyJwk,
            { name: 'ECDSA', namedCurve: 'P-256' },
            true,
            ['verify']
          ),
          cryptoObj.subtle.importKey(
            'jwk',
            stored.privateKeyJwk,
            { name: 'ECDSA', namedCurve: 'P-256' },
            false,
            ['sign']
          ),
        ]);
        await saveCryptoKeyPair({
          id: ECDSA_STORAGE_ID,
          algorithm: 'ECDSA-P256',
          publicKey,
          privateKey,
          publicKeyJwk: stored.publicKeyJwk,
          fingerprint: stored.fingerprint,
          createdAt: stored.createdAt || Date.now(),
        });
        localEcdsaCache = {
          keyPair: { publicKey, privateKey },
          publicKeyJwk: stored.publicKeyJwk,
          fingerprint: stored.fingerprint,
        };
      } catch {
        localEcdsaCache = null;
      }
    }
  }

  if (!localEcdsaCache) {
    const keyPair = await cryptoObj.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign', 'verify']
    );
    const [publicKeyJwk, exportedSpki] = await Promise.all([
      cryptoObj.subtle.exportKey('jwk', keyPair.publicKey),
      cryptoObj.subtle.exportKey('spki', keyPair.publicKey),
    ]);
    const spkiHex = Array.from(new Uint8Array(exportedSpki))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const rawFpr = await computeSha256(spkiHex);
    const fingerprint = `ECDSA-P256:${rawFpr.slice(0, 8).toUpperCase()}:${rawFpr.slice(-8).toUpperCase()}`;

    await saveCryptoKeyPair({
      id: ECDSA_STORAGE_ID,
      algorithm: 'ECDSA-P256',
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicKeyJwk,
      fingerprint,
      createdAt: Date.now(),
    });

    localEcdsaCache = {
      keyPair,
      publicKeyJwk,
      fingerprint,
    };
  }

  const active = localEcdsaCache;
  return {
    fingerprint: active.fingerprint,
    publicKeyJwk: active.publicKeyJwk,
    sign: async (payload: string) => {
      const enc = new TextEncoder();
      const sigBuf = await cryptoObj.subtle.sign(
        { name: 'ECDSA', hash: { name: 'SHA-256' } },
        active.keyPair.privateKey,
        enc.encode(payload)
      );
      const sigHex = Array.from(new Uint8Array(sigBuf))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return `SIG_ECDSA_${sigHex}`;
    },
  };
}

// Verify ECDSA P-256 digital signature of an endorsement (never passes demo stubs or tampered payloads)
export async function verifyEndorsementSignature(endorsement: PeerEndorsement): Promise<boolean> {
  if (
    endorsement.isDemo ||
    !endorsement.endorserPublicKeyJwk ||
    !isValidEcdsaJwk(endorsement.endorserPublicKeyJwk) ||
    !endorsement.digitalSignature ||
    !endorsement.digitalSignature.startsWith('SIG_ECDSA_')
  ) {
    return false;
  }

  const sigHex = endorsement.digitalSignature.slice('SIG_ECDSA_'.length);
  if (!/^[0-9a-f]{64,256}$/i.test(sigHex) || sigHex.length % 2 !== 0) {
    return false;
  }

  try {
    const cryptoObj = getCrypto();
    const pubKey = await cryptoObj.subtle.importKey(
      'jwk',
      endorsement.endorserPublicKeyJwk,
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify']
    );

    const sigBytes = new Uint8Array(sigHex.length / 2);
    for (let i = 0; i < sigHex.length; i += 2) {
      sigBytes[i / 2] = parseInt(sigHex.slice(i, i + 2), 16);
    }

    const canonicalPayload = buildEndorsementCanonicalPayload(
      endorsement.endorserPeerId,
      endorsement.subjectPeerId,
      endorsement.trustScoreAssigned,
      endorsement.statement,
      endorsement.timestamp
    );

    return await cryptoObj.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      pubKey,
      sigBytes as Uint8Array<ArrayBuffer>,
      new TextEncoder().encode(canonicalPayload)
    );
  } catch {
    return false;
  }
}

export function calculateTrustTier(endorsements: PeerEndorsement[]): TrustTier {
  const count = endorsements.length;
  const hasPatriarch = endorsements.some((e) => e.endorserTier === 'guild_patriarch');

  if (count >= 7 || (count >= 4 && hasPatriarch)) {
    return 'guild_patriarch';
  }
  if (count >= 4) {
    return 'master_post_impressionist';
  }
  if (count >= 2) {
    return 'trusted_artist';
  }
  return 'novice_apprentice';
}

export function calculateWoTJuryBonus(tier: TrustTier): number {
  switch (tier) {
    case 'guild_patriarch':
      return 3;
    case 'master_post_impressionist':
      return 2;
    case 'trusted_artist':
      return 1;
    case 'novice_apprentice':
    default:
      return 0;
  }
}

export function getLocalWoTProfile(artistProfile: ArtistProfile): WebOfTrustProfile {
  let storedEndorsements = DEFAULT_ENDORSEMENTS;
  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_KEY_ENDORSEMENTS);
    if (raw) {
      try {
        storedEndorsements = JSON.parse(raw);
      } catch {}
    }
  }

  const received = storedEndorsements.filter(
    (e) => e.subjectPeerId === artistProfile.id || e.subjectPeerId === 'local_painter'
  );
  const given = storedEndorsements.filter((e) => e.endorserPeerId === artistProfile.id);
  const tier = calculateTrustTier(received);

  const avgScore =
    received.length > 0
      ? Number((received.reduce((acc, curr) => acc + curr.trustScoreAssigned, 0) / received.length).toFixed(1))
      : 4.8;

  const profileFpr = localEcdsaCache
    ? localEcdsaCache.fingerprint
    : `ECDSA-P256:${artistProfile.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}:LOCAL`;

  return {
    peerId: artistProfile.id,
    peerName: artistProfile.name,
    publicKeyFingerprint: profileFpr,
    tier,
    trustScore: avgScore,
    endorsementsReceived: received,
    endorsementsGiven: given,
    juryWeightBonus: calculateWoTJuryBonus(tier),
  };
}

// Create a cryptographically signed endorsement with embedded ECDSA P-256 public JWK
export async function createPeerEndorsement(
  endorser: ArtistProfile,
  endorserTier: TrustTier,
  targetPeerId: string,
  targetPeerName: string,
  score: number,
  statement: string
): Promise<PeerEndorsement> {
  const cryptoObj = getCrypto();
  const timestamp = Date.now();
  const canonicalPayload = buildEndorsementCanonicalPayload(
    endorser.id,
    targetPeerId,
    score,
    statement,
    timestamp
  );

  const keyPair = await getOrCreatePeerEcdsaKeyPair();
  const digitalSignature = await keyPair.sign(canonicalPayload);
  const txHash = `0x${await computeSha256(digitalSignature + canonicalPayload)}`;

  const newEndorsement: PeerEndorsement = {
    id: `end_${cryptoObj.randomUUID()}`,
    endorserPeerId: endorser.id,
    endorserName: endorser.name,
    endorserTier,
    subjectPeerId: targetPeerId,
    subjectPeerName: targetPeerName,
    trustScoreAssigned: score,
    statement,
    digitalSignature,
    endorserPublicKeyJwk: keyPair.publicKeyJwk,
    isDemo: false,
    timestamp,
    txHash,
  };

  if (typeof localStorage !== 'undefined') {
    let existing: PeerEndorsement[] = [...DEFAULT_ENDORSEMENTS];
    const raw = localStorage.getItem(STORAGE_KEY_ENDORSEMENTS);
    if (raw) {
      try {
        existing = JSON.parse(raw);
      } catch {}
    }
    existing.unshift(newEndorsement);
    localStorage.setItem(STORAGE_KEY_ENDORSEMENTS, JSON.stringify(existing));
  }

  return newEndorsement;
}
