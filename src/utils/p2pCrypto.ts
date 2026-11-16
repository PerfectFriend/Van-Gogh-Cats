// P2P and Cryptographic identity utils using Web Crypto API
import { ArtistProfile, Artwork } from '../types';

const ARTIST_PROFILE_KEY = 'vangogh_artist_profile';
const ARTIST_KEYPAIR_KEY = 'vangogh_artist_keypair_raw';

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

  // Create unique key fingerprint
  let fingerprint = '';
  try {
    const array = new Uint8Array(16);
    window.crypto.getRandomValues(array);
    fingerprint = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
  } catch {
    fingerprint = 'cat_' + Math.random().toString(36).substring(2, 15);
  }

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

// Compute simple SHA-256 hash of text for digital fingerprint
export async function computeContentHash(content: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  } catch {
    return Math.random().toString(36).substring(2, 14);
  }
}

// Strict Cat Validation: "Запрещено всё кроме котов"
export function validateCatSanctity(prompt: string, title?: string): { isCat: boolean; reason?: string } {
  const combined = `${prompt} ${title || ''}`.toLowerCase();
  
  // Forbidden non-cat domestic animals if explicitly requested without a cat
  const dogKeywords = ['собака', 'щенок', 'пес', 'пёс', 'дог', 'dog', 'puppy', 'hound', 'canine', 'chihuahua', 'husky'];
  const catKeywords = ['кот', 'кошка', 'котик', 'котёнок', 'котенок', 'кошач', 'котя', 'мяу', 'мур', 'cat', 'kitten', 'feline', 'kitty', 'tabby', 'tom'];

  const hasCat = catKeywords.some(kw => combined.includes(kw));
  const hasDog = dogKeywords.some(kw => combined.includes(kw));

  if (!hasCat) {
    return {
      isCat: false,
      reason: 'В децентрализованной сети Ван Гога действует строгое правило: картина ОБЯЗАТЕЛЬНО должна изображать кота или кошку!',
    };
  }

  if (hasDog && !combined.includes('кот')) {
    return {
      isCat: false,
      reason: 'Обнаружены несоответствующие животные. В галерее разрешены исключительно котики.',
    };
  }

  return { isCat: true };
}

// Export whole gallery as a standalone .catpack file (offline backup)
export function exportCatPack(profile: ArtistProfile, artworks: Artwork[]): void {
  const pack = {
    version: '1.0-p2p',
    exportedAt: new Date().toISOString(),
    artist: profile,
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
