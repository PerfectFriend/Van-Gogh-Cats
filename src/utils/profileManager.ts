// Multi-Profile and BIP-39 Vault Manager (Maximum 3 profiles per device)
import { StoredUserProfile, ArtistProfile, Artwork, SystemPermissionStatus } from '../types';
import { hashPinCode, generateSalt, mnemonicToSeedHex } from './bip39';

const PROFILES_STORAGE_KEY = 'vangogh_multi_profiles';
const ACTIVE_PROFILE_ID_KEY = 'vangogh_active_profile_id';
const PERMISSIONS_STORAGE_KEY = 'vangogh_system_permissions';

const DEFAULT_AVATARS = [
  'from-amber-500 to-yellow-600',
  'from-blue-600 to-indigo-900',
  'from-emerald-600 to-teal-800',
  'from-purple-600 to-indigo-700',
  'from-rose-600 to-amber-700',
  'from-cyan-500 to-blue-700',
];

const CAT_PAINTER_NAMES = [
  'Винсент Рыжехвостый',
  'Арльский Мурлыка',
  'Кот из Сен-Реми',
  'Тео Кот ван Гог',
  'Звёздный Пушистик',
  'Мастер Подсолнухов',
  'Кипарисовый Барсик',
  'Мяу-Импрессионист',
  'Оверский Лапочкин',
  'Клод Монемур',
];

// Read all stored profiles (up to 3)
export function getAllProfiles(): StoredUserProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      // Check legacy single profile if present
      const legacyRaw = localStorage.getItem('vangogh_artist_profile');
      if (legacyRaw) {
        try {
          const legacy: ArtistProfile = JSON.parse(legacyRaw);
          const migrated: StoredUserProfile = {
            ...legacy,
            isCurrent: true,
            hasBip39Wallet: false,
          };
          saveAllProfiles([migrated]);
          setActiveProfileId(migrated.id);
          return [migrated];
        } catch {}
      }
      return [];
    }
    const profiles: StoredUserProfile[] = JSON.parse(raw);
    return Array.isArray(profiles) ? profiles.slice(0, 3) : [];
  } catch {
    return [];
  }
}

// Save all profiles to localStorage
export function saveAllProfiles(profiles: StoredUserProfile[]): void {
  const bounded = profiles.slice(0, 3);
  localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(bounded));
}

// Get active profile ID
export function getActiveProfileId(): string | null {
  return localStorage.getItem(ACTIVE_PROFILE_ID_KEY);
}

// Set active profile ID and sync legacy key for backward compatibility
export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_PROFILE_ID_KEY, id);
  const profiles = getAllProfiles();
  const updated = profiles.map(p => ({
    ...p,
    isCurrent: p.id === id,
  }));
  saveAllProfiles(updated);

  const active = updated.find(p => p.id === id);
  if (active) {
    const legacy: ArtistProfile = {
      id: active.id,
      name: active.name,
      avatarColor: active.avatarColor,
      bio: active.bio,
      createdAt: active.createdAt,
      totalCreations: active.totalCreations,
      likedArtworkIds: active.likedArtworkIds,
      isBannedReadOnly: active.isBannedReadOnly,
      bannedReason: active.bannedReason,
    };
    localStorage.setItem('vangogh_artist_profile', JSON.stringify(legacy));
  }
}

// Get active profile or first profile
export function getActiveProfile(): StoredUserProfile | null {
  const profiles = getAllProfiles();
  if (profiles.length === 0) return null;

  const activeId = getActiveProfileId();
  if (activeId) {
    const found = profiles.find(p => p.id === activeId);
    if (found) return found;
  }

  // Fallback to first profile marked isCurrent or simply first
  const current = profiles.find(p => p.isCurrent) || profiles[0];
  if (current) {
    setActiveProfileId(current.id);
  }
  return current || null;
}

// Check if user can create another profile (< 3)
export function canCreateNewProfile(): boolean {
  return getAllProfiles().length < 3;
}

// Save a newly created or imported profile (enforces max 3)
export function saveNewProfile(profile: StoredUserProfile): { success: boolean; error?: string } {
  const existing = getAllProfiles();
  if (existing.length >= 3) {
    return {
      success: false,
      error: 'Достигнут лимит профилей (максимум 3 профиля на одном устройстве). Удалите один из профилей перед созданием нового.'
    };
  }

  // Check duplicate ID
  const filtered = existing.filter(p => p.id !== profile.id);
  const updated = [...filtered, { ...profile, isCurrent: true }];
  saveAllProfiles(updated);
  setActiveProfileId(profile.id);
  return { success: true };
}

// Update existing profile
export function updateProfile(updatedProfile: StoredUserProfile): void {
  const profiles = getAllProfiles();
  const idx = profiles.findIndex(p => p.id === updatedProfile.id);
  if (idx !== -1) {
    profiles[idx] = updatedProfile;
    saveAllProfiles(profiles);
    if (getActiveProfileId() === updatedProfile.id) {
      setActiveProfileId(updatedProfile.id);
    }
  }
}

// Delete profile
export function deleteProfile(profileId: string): void {
  const profiles = getAllProfiles();
  const remaining = profiles.filter(p => p.id !== profileId);
  saveAllProfiles(remaining);

  if (getActiveProfileId() === profileId) {
    if (remaining.length > 0) {
      setActiveProfileId(remaining[0].id);
    } else {
      localStorage.removeItem(ACTIVE_PROFILE_ID_KEY);
      localStorage.removeItem('vangogh_artist_profile');
    }
  }
}

// Verify PIN code for a profile
export async function verifyProfilePin(profile: StoredUserProfile, enteredPin: string): Promise<boolean> {
  if (!profile.pinHash || !profile.pinSalt) {
    return true; // No PIN configured
  }
  const computedHash = await hashPinCode(enteredPin, profile.pinSalt);
  return computedHash === profile.pinHash;
}

// Create new BIP-39 profile instance
export async function createBip39ProfileData(
  seedPhrase: string,
  pin: string,
  customName?: string,
  customBio?: string,
  customAvatarColor?: string
): Promise<StoredUserProfile> {
  const seedHex = await mnemonicToSeedHex(seedPhrase);
  const idFingerprint = 'cat_' + seedHex.substring(0, 16);

  const salt = generateSalt();
  const pinHash = await hashPinCode(pin, salt);

  const defaultName = CAT_PAINTER_NAMES[Math.floor(Math.random() * CAT_PAINTER_NAMES.length)];
  const defaultAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];

  return {
    id: idFingerprint,
    name: customName?.trim() || defaultName,
    bio: customBio?.trim() || 'Художник децентрализованной мастерской кошачьего постимпрессионизма (BIP-39 Vault)',
    avatarColor: customAvatarColor || defaultAvatar,
    createdAt: Date.now(),
    seedPhrase,
    pinHash,
    pinSalt: salt,
    totalCreations: 0,
    likedArtworkIds: [],
    hasBip39Wallet: true,
    isCurrent: true,
  };
}

// Export Profile Archive (.catpack.json) to local disk before deletion or as backup
export function exportProfileArchive(profile: StoredUserProfile, artworks: Artwork[] = []): void {
  const userArtworks = artworks.filter(a => 
    a.authorId === profile.id || a.isUserCreated || a.source === 'my-local'
  );

  const archiveData = {
    archiveFormat: 'vangogh-catpack-profile-v2',
    exportedAt: new Date().toISOString(),
    profile: {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      avatarColor: profile.avatarColor,
      createdAt: profile.createdAt,
      totalCreations: profile.totalCreations,
      hasBip39Wallet: profile.hasBip39Wallet,
      seedPhrase: profile.seedPhrase, // Backup seed
      likedArtworkIds: profile.likedArtworkIds,
    },
    artworksCount: userArtworks.length,
    artworks: userArtworks,
  };

  const jsonStr = JSON.stringify(archiveData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = profile.name.replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');
  a.href = url;
  a.download = `vangogh-cat-profile-${safeName}-${profile.id.slice(0, 8)}-${Date.now()}.catpack.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// System permissions handling
export function getStoredPermissions(): SystemPermissionStatus {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return {
    notifications: 'prompt',
    persistentStorage: 'prompt',
    audio: 'prompt',
    clipboard: 'prompt',
    networkLan: 'prompt',
  };
}

export function saveStoredPermissions(perms: SystemPermissionStatus): void {
  localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify({
    ...perms,
    completedAt: Date.now(),
  }));
}

export function hasCompletedPermissionsSetup(): boolean {
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed.completedAt);
  } catch {
    return false;
  }
}
