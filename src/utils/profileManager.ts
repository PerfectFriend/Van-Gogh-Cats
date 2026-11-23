// Multi-Profile and BIP-39 Vault Manager (Maximum 3 profiles per device)
import { StoredUserProfile, ArtistProfile, Artwork, SystemPermissionStatus } from '../types';
import {
  hashPinCode,
  generateSalt,
  mnemonicToSeedHex,
  deriveProfileIdFromSeedHex,
  encryptWithPassphrase,
  decryptWithPassphrase,
  EncryptedPassphrasePayload,
} from './bip39';

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

function scrubSensitiveFields(profile: StoredUserProfile & { seedPhrase?: unknown }): StoredUserProfile {
  const { seedPhrase: _omitted, ...safe } = profile;
  void _omitted;
  return safe;
}

// Read all stored profiles (up to 3), scrubbing any legacy plaintext seedPhrase on read
export function getAllProfiles(): StoredUserProfile[] {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      const legacyRaw = localStorage.getItem('vangogh_artist_profile');
      if (legacyRaw) {
        try {
          const legacy: ArtistProfile & { seedPhrase?: unknown } = JSON.parse(legacyRaw);
          const migrated: StoredUserProfile = scrubSensitiveFields({
            ...legacy,
            isCurrent: true,
            hasBip39Wallet: false,
          });
          saveAllProfiles([migrated]);
          setActiveProfileId(migrated.id);
          return [migrated];
        } catch {
          return [];
        }
      }
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    let hadPlaintextSeed = false;
    const cleaned = parsed.slice(0, 3).map((item: StoredUserProfile & { seedPhrase?: unknown }) => {
      if (Object.prototype.hasOwnProperty.call(item, 'seedPhrase') && item.seedPhrase !== undefined) {
        hadPlaintextSeed = true;
      }
      return scrubSensitiveFields(item);
    });

    if (hadPlaintextSeed) {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(cleaned));
    }

    return cleaned;
  } catch {
    return [];
  }
}

// Save all profiles to localStorage (never persisting plaintext seed phrases)
export function saveAllProfiles(profiles: StoredUserProfile[]): void {
  const bounded = profiles.slice(0, 3).map(scrubSensitiveFields);
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

  const filtered = existing.filter(p => p.id !== profile.id);
  const updated = [...filtered, { ...scrubSensitiveFields(profile), isCurrent: true }];
  saveAllProfiles(updated);
  setActiveProfileId(profile.id);
  return { success: true };
}

// Update existing profile
export function updateProfile(updatedProfile: StoredUserProfile): void {
  const profiles = getAllProfiles();
  const idx = profiles.findIndex(p => p.id === updatedProfile.id);
  if (idx !== -1) {
    profiles[idx] = scrubSensitiveFields(updatedProfile);
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
    return true;
  }
  const computedHash = await hashPinCode(enteredPin, profile.pinSalt);
  return computedHash === profile.pinHash;
}

// Create new BIP-39 profile instance without storing plaintext mnemonic on disk/storage
export async function createBip39ProfileData(
  seedPhrase: string,
  pin: string,
  customName?: string,
  customBio?: string,
  customAvatarColor?: string
): Promise<StoredUserProfile> {
  const seedHex = await mnemonicToSeedHex(seedPhrase);
  const idFingerprint = await deriveProfileIdFromSeedHex(seedHex);

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
    pinHash,
    pinSalt: salt,
    totalCreations: 0,
    likedArtworkIds: [],
    hasBip39Wallet: true,
    isCurrent: true,
  };
}

export interface ProfileArchivePayload {
  archiveFormat: 'vangogh-catpack-profile-v3';
  exportedAt: string;
  profile: {
    id: string;
    name: string;
    bio: string;
    avatarColor: string;
    createdAt: number;
    totalCreations: number;
    hasBip39Wallet?: boolean;
    likedArtworkIds: string[];
  };
  optionalSeedPhrase?: string;
  artworksCount: number;
  artworks: Artwork[];
}

export interface EncryptedProfileArchiveFile {
  archiveFormat: 'vangogh-catpack-encrypted-v1';
  exportedAt: string;
  profileId: string;
  profileName: string;
  encryptedPayload: EncryptedPassphrasePayload;
}

function triggerJsonDownload(data: unknown, filename: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export public metadata + artworks (.catpack.json) — never contains plaintext seed phrase
export function exportProfileArchive(profile: StoredUserProfile, artworks: Artwork[] = []): void {
  const userArtworks = artworks.filter(
    a => a.authorId === profile.id || a.isUserCreated || a.source === 'my-local'
  );

  const archiveData: ProfileArchivePayload = {
    archiveFormat: 'vangogh-catpack-profile-v3',
    exportedAt: new Date().toISOString(),
    profile: {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      avatarColor: profile.avatarColor,
      createdAt: profile.createdAt,
      totalCreations: profile.totalCreations,
      hasBip39Wallet: profile.hasBip39Wallet,
      likedArtworkIds: profile.likedArtworkIds,
    },
    artworksCount: userArtworks.length,
    artworks: userArtworks,
  };

  const safeName = profile.name.replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');
  triggerJsonDownload(
    archiveData,
    `vangogh-cat-profile-${safeName}-${profile.id.slice(0, 8)}-${Date.now()}.catpack.json`
  );
}

// Create encrypted profile archive payload (can optionally wrap a user-supplied mnemonic inside AES-GCM)
export async function buildEncryptedProfileArchive(
  profile: StoredUserProfile,
  artworks: Artwork[],
  passphrase: string,
  optionalSeedPhrase?: string
): Promise<EncryptedProfileArchiveFile> {
  const userArtworks = artworks.filter(
    a => a.authorId === profile.id || a.isUserCreated || a.source === 'my-local'
  );

  const innerPayload: ProfileArchivePayload = {
    archiveFormat: 'vangogh-catpack-profile-v3',
    exportedAt: new Date().toISOString(),
    profile: {
      id: profile.id,
      name: profile.name,
      bio: profile.bio,
      avatarColor: profile.avatarColor,
      createdAt: profile.createdAt,
      totalCreations: profile.totalCreations,
      hasBip39Wallet: profile.hasBip39Wallet,
      likedArtworkIds: profile.likedArtworkIds,
    },
    ...(optionalSeedPhrase?.trim() ? { optionalSeedPhrase: optionalSeedPhrase.trim() } : {}),
    artworksCount: userArtworks.length,
    artworks: userArtworks,
  };

  const encryptedPayload = await encryptWithPassphrase(JSON.stringify(innerPayload), passphrase);

  return {
    archiveFormat: 'vangogh-catpack-encrypted-v1',
    exportedAt: new Date().toISOString(),
    profileId: profile.id,
    profileName: profile.name,
    encryptedPayload,
  };
}

export async function exportEncryptedProfileArchive(
  profile: StoredUserProfile,
  artworks: Artwork[],
  passphrase: string,
  optionalSeedPhrase?: string
): Promise<void> {
  const archive = await buildEncryptedProfileArchive(profile, artworks, passphrase, optionalSeedPhrase);
  const safeName = profile.name.replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');
  triggerJsonDownload(
    archive,
    `vangogh-cat-profile-${safeName}-${profile.id.slice(0, 8)}-${Date.now()}.catpack.enc.json`
  );
}

export async function decryptEncryptedProfileArchive(
  jsonText: string,
  passphrase: string
): Promise<ProfileArchivePayload> {
  const parsed = JSON.parse(jsonText) as EncryptedProfileArchiveFile;
  if (parsed?.archiveFormat !== 'vangogh-catpack-encrypted-v1' || !parsed?.encryptedPayload) {
    throw new Error('Неподдерживаемый формат зашифрованного архива.');
  }
  const plaintext = await decryptWithPassphrase(parsed.encryptedPayload, passphrase);
  return JSON.parse(plaintext) as ProfileArchivePayload;
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
