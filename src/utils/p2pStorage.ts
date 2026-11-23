// IndexedDB Client Storage for P2P Local Artworks, Cat Passports, and 8GB Mutual Quotas
import { Artwork, CatProfile, StorageNodeQuota } from '../types';

const DB_NAME = 'VanGoghCatsP2PDB';
const DB_VERSION = 3;
const STORE_MY_CREATIONS = 'my_creations';
const STORE_FRIEND_BACKUPS = 'friend_backups';
const STORE_CAT_PROFILES = 'cat_profiles';
const STORE_CRYPTO_KEYS = 'crypto_keys';

export const TOTAL_8GB_BYTES = 8000000000;
export const OWN_QUOTA_BYTES = 1600000000; // 1.6 GB
export const FRIEND_QUOTA_BYTES = 6400000000; // 6.4 GB (4 friends x 1.6 GB)

export interface StoredCryptoKeyRecord {
  id: string;
  algorithm: string;
  publicKey?: CryptoKey;
  privateKey?: CryptoKey;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk?: JsonWebKey; // Legacy migration read-only fallback
  fingerprint: string;
  createdAt: number;
}

function openDB(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_MY_CREATIONS)) {
        db.createObjectStore(STORE_MY_CREATIONS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FRIEND_BACKUPS)) {
        db.createObjectStore(STORE_FRIEND_BACKUPS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CAT_PROFILES)) {
        db.createObjectStore(STORE_CAT_PROFILES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CRYPTO_KEYS)) {
        db.createObjectStore(STORE_CRYPTO_KEYS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveCryptoKeyPair(record: StoredCryptoKeyRecord): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CRYPTO_KEYS, 'readwrite');
      tx.objectStore(STORE_CRYPTO_KEYS).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    if (typeof indexedDB !== 'undefined') {
      console.warn('Failed to save crypto key pair to IndexedDB:', err);
    }
  }
}

export async function getCryptoKeyPair(id: string): Promise<StoredCryptoKeyRecord | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CRYPTO_KEYS, 'readonly');
      const request = tx.objectStore(STORE_CRYPTO_KEYS).get(id);
      request.onsuccess = () => resolve((request.result as StoredCryptoKeyRecord) || null);
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

// Cat Passports
export async function saveCatProfile(profile: CatProfile): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CAT_PROFILES, 'readwrite');
    tx.objectStore(STORE_CAT_PROFILES).put(profile);
  } catch (err) {
    console.error('Failed to save cat profile to IndexedDB:', err);
  }
}

export async function getCatProfiles(): Promise<CatProfile[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_CAT_PROFILES, 'readonly');
      const request = tx.objectStore(STORE_CAT_PROFILES).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function deleteCatProfile(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_CAT_PROFILES, 'readwrite');
    tx.objectStore(STORE_CAT_PROFILES).delete(id);
  } catch (err) {
    console.error('Failed to delete cat profile:', err);
  }
}

// 8 GB Storage Node Quota Engine
export async function getStorageQuotaDetails(): Promise<StorageNodeQuota> {
  try {
    const [ownWorks, friendWorks] = await Promise.all([getLocalArtworks(), getFriendBackupArtworks()]);
    
    // Approximate whole-file WebP weight ~ 2 MB per artwork
    const ownBytes = ownWorks.reduce((acc, art) => acc + (art.imageUrl?.length || 2097152), 0);
    const friendBytes = friendWorks.reduce((acc, art) => acc + (art.imageUrl?.length || 2097152), 0);

    // Count unique friend custodians
    const friendPeers = new Set(friendWorks.map(w => w.authorId || w.originPeerId).filter(Boolean));

    return {
      totalCapacityBytes: TOTAL_8GB_BYTES,
      ownReservedBytes: OWN_QUOTA_BYTES,
      friendsReservedBytes: FRIEND_QUOTA_BYTES,
      ownUsedBytes: ownBytes,
      friendsUsedBytes: friendBytes,
      activeCustodiansCount: Math.min(4, friendPeers.size),
      wholeFilesCount: ownWorks.length + friendWorks.length
    };
  } catch {
    return {
      totalCapacityBytes: TOTAL_8GB_BYTES,
      ownReservedBytes: OWN_QUOTA_BYTES,
      friendsReservedBytes: FRIEND_QUOTA_BYTES,
      ownUsedBytes: 0,
      friendsUsedBytes: 0,
      activeCustodiansCount: 0,
      wholeFilesCount: 0
    };
  }
}

export async function saveLocalArtwork(artwork: Artwork): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_MY_CREATIONS, 'readwrite');
    const store = tx.objectStore(STORE_MY_CREATIONS);
    store.put(artwork);
  } catch (err) {
    console.error('Failed to save to IndexedDB:', err);
  }
}

export async function getLocalArtworks(): Promise<Artwork[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MY_CREATIONS, 'readonly');
      const store = tx.objectStore(STORE_MY_CREATIONS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function saveFriendBackupArtwork(artwork: Artwork): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_FRIEND_BACKUPS, 'readwrite');
    const store = tx.objectStore(STORE_FRIEND_BACKUPS);
    store.put({
      ...artwork,
      isBackedUpLocally: true,
      source: 'p2p-friend',
    });
  } catch (err) {
    console.error('Failed to save friend backup to IndexedDB:', err);
  }
}

export async function getFriendBackupArtworks(): Promise<Artwork[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_FRIEND_BACKUPS, 'readonly');
      const store = tx.objectStore(STORE_FRIEND_BACKUPS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function calculateStorageUsage(): Promise<{ usedBytes: number; approximateMB: string }> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const used = estimate.usage || 0;
      return {
        usedBytes: used,
        approximateMB: (used / (1024 * 1024)).toFixed(1) + ' МБ',
      };
    }
  } catch {
    // fallback
  }
  return { usedBytes: 0, approximateMB: '0.0 МБ' };
}

// Delete authored publication permanently from storage
export async function deleteArtworkFromStorage(artworkId: string): Promise<boolean> {
  try {
    const db = await openDB();
    const tx1 = db.transaction(STORE_MY_CREATIONS, 'readwrite');
    tx1.objectStore(STORE_MY_CREATIONS).delete(artworkId);
    
    const tx2 = db.transaction(STORE_FRIEND_BACKUPS, 'readwrite');
    tx2.objectStore(STORE_FRIEND_BACKUPS).delete(artworkId);
    return true;
  } catch (err) {
    console.error('Failed to delete artwork from storage:', err);
    return false;
  }
}

// Cleanse and remove any corrupted vector/SVG graphics from previous edit/remix attempts
export async function cleanseCorruptedVectorArtworks(): Promise<string[]> {
  const purgedIds: string[] = [];
  try {
    const db = await openDB();

    // Check my creations store
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_MY_CREATIONS, 'readwrite');
      const store = tx.objectStore(STORE_MY_CREATIONS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: Artwork[] = req.result || [];
        for (const art of items) {
          const isSvg = Boolean(
            art.imageUrl?.startsWith('data:image/svg+xml') ||
            art.imageUrl?.includes('<svg') ||
            art.imageUrl?.includes('xmlns=') ||
            art.id?.startsWith('vg_edit_') ||
            art.modelUsed?.includes('impasto-studio')
          );
          if (isSvg) {
            store.delete(art.id);
            purgedIds.push(art.id);
          }
        }
        resolve();
      };
      req.onerror = () => resolve();
    });

    // Check friend backups store
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_FRIEND_BACKUPS, 'readwrite');
      const store = tx.objectStore(STORE_FRIEND_BACKUPS);
      const req = store.getAll();
      req.onsuccess = () => {
        const items: Artwork[] = req.result || [];
        for (const art of items) {
          const isSvg = Boolean(
            art.imageUrl?.startsWith('data:image/svg+xml') ||
            art.imageUrl?.includes('<svg') ||
            art.imageUrl?.includes('xmlns=') ||
            art.id?.startsWith('vg_edit_') ||
            art.modelUsed?.includes('impasto-studio')
          );
          if (isSvg) {
            store.delete(art.id);
            if (!purgedIds.includes(art.id)) purgedIds.push(art.id);
          }
        }
        resolve();
      };
      req.onerror = () => resolve();
    });
  } catch (err) {
    console.error('Error cleansing vector artworks:', err);
  }
  return purgedIds;
}

// Erase condemned artwork completely from all peer caches and stores
export async function purgeCondemnedArtworkFromStorage(artworkId: string): Promise<void> {
  try {
    const db = await openDB();
    // Delete from my creations
    const tx1 = db.transaction(STORE_MY_CREATIONS, 'readwrite');
    tx1.objectStore(STORE_MY_CREATIONS).delete(artworkId);
    
    // Delete from friend backups
    const tx2 = db.transaction(STORE_FRIEND_BACKUPS, 'readwrite');
    tx2.objectStore(STORE_FRIEND_BACKUPS).delete(artworkId);
  } catch (err) {
    console.error('Failed to purge condemned artwork from storage:', err);
  }
}
