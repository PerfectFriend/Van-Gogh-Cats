// P2P and Cryptographic identity utils using Web Crypto API
import { ArtistProfile, Artwork } from '../types';
export { validateCatSanctity } from './catSanctity';

const ARTIST_PROFILE_KEY = 'vangogh_artist_profile';

const PAINTER_NAMES = [
  'Винсент Рыжехвостый',
  'Кот из Сен-Реми',
  'Арльский Мурлыка',
  'Тео Кот ван Гог',
  'Звёздный Пушистик',
  'Мастер Подсолнухов',
  'Кипарисовый Барсик',
  'Мяу-Импрессионист',
];

const AVATAR_PALETTES = [
  'from-amber-500 to-yellow-600',
  'from-blue-600 to-indigo-900',
  'from-emerald-600 to-teal-800',
  'from-purple-600 to-indigo-700',
  'from-amber-600 to-orange-800',
];

function getCrypto(): Crypto {
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  if (typeof globalThis !== 'undefined' && (globalThis as unknown as { crypto?: Crypto }).crypto) {
    return (globalThis as unknown as { crypto: Crypto }).crypto;
  }
  throw new Error('Web Crypto API is unavailable in this environment');
}

// Generate or retrieve persistent artist profile
export async function getOrCreateArtistProfile(): Promise<{ profile: ArtistProfile; keyFingerprint: string }> {
  const cached = localStorage.getItem(ARTIST_PROFILE_KEY);
  if (cached) {
    try {
      const parsed: ArtistProfile = JSON.parse(cached);
      return { profile: parsed, keyFingerprint: parsed.id };
    } catch {
      // Regenerate if corrupted
    }
  }

  const cryptoObj = getCrypto();
  const array = new Uint8Array(16);
  cryptoObj.getRandomValues(array);
  const fingerprint = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');

  const randomName = PAINTER_NAMES[Math.floor(Math.random() * PAINTER_NAMES.length)];
  const randomPalette = AVATAR_PALETTES[Math.floor(Math.random() * AVATAR_PALETTES.length)];

  const newProfile: ArtistProfile = {
    id: fingerprint,
    name: randomName,
    avatarColor: randomPalette,
    bio: 'Художник децентрализованной мастерской кошачьего постимпрессионизма',
    createdAt: Date.now(),
    totalCreations: 0,
    likedArtworkIds: [],
  };

  localStorage.setItem(ARTIST_PROFILE_KEY, JSON.stringify(newProfile));
  return { profile: newProfile, keyFingerprint: fingerprint };
}

export function saveArtistProfile(profile: ArtistProfile): void {
  localStorage.setItem(ARTIST_PROFILE_KEY, JSON.stringify(profile));
}

// Ban author to Read-Only mode permanently
export function setArtistReadOnlyBan(reason: string): ArtistProfile | null {
  const cached = localStorage.getItem(ARTIST_PROFILE_KEY);
  if (cached) {
    try {
      const profile: ArtistProfile = JSON.parse(cached);
      profile.isBannedReadOnly = true;
      profile.bannedReason = reason;
      localStorage.setItem(ARTIST_PROFILE_KEY, JSON.stringify(profile));
      return profile;
    } catch {
      return null;
    }
  }
  return null;
}

// Compute full 256-bit (64 lowercase hex chars) SHA-256 hash; fails closed if Web Crypto is unavailable
export async function computeContentHash(content: string): Promise<string> {
  const cryptoObj = getCrypto();
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await cryptoObj.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Export whole gallery as a standalone .catpack file (offline public metadata + artworks backup)
export function exportCatPack(profile: ArtistProfile, artworks: Artwork[]): void {
  if (typeof document === 'undefined') return;
  const pack = {
    version: '1.0-p2p',
    exportedAt: new Date().toISOString(),
    artist: {
      id: profile.id,
      name: profile.name,
      avatarColor: profile.avatarColor,
      bio: profile.bio,
      createdAt: profile.createdAt,
      totalCreations: profile.totalCreations,
    },
    artworks: artworks.filter(a => a.isUserCreated || a.source === 'my-local'),
  };

  const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vangogh-cats-${profile.name.replace(/\s+/g, '_')}-${Date.now()}.catpack.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
