import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
  sanitizeFirestoreId,
  compressImageForFirestore,
} from '../firebase';
import { Artwork, AspectRatioType } from '../types';

interface FirebaseAuthContextValue {
  googleUser: User | null;
  isAuthReady: boolean;
  isSigningIn: boolean;
  authError: string | null;
  cloudArtworks: Artwork[];
  cloudCustomStylePrompt: string;
  cloudPreferredStyleId: string | null;
  signInWithGoogle: () => Promise<User | null>;
  signOutGoogle: () => Promise<void>;
  clearAuthError: () => void;
  saveArtworkToCloud: (artwork: Artwork, stylePresetId?: string) => Promise<void>;
  deleteArtworkFromCloud: (artworkId: string) => Promise<void>;
  updateCloudStylePreferences: (preferredStyleId: string, customStylePrompt: string) => Promise<void>;
}

const FirebaseAuthContext = createContext<FirebaseAuthContextValue | null>(null);

export const useFirebaseAuth = (): FirebaseAuthContextValue => {
  const ctx = useContext(FirebaseAuthContext);
  if (!ctx) {
    throw new Error('useFirebaseAuth must be used inside FirebaseAuthProvider');
  }
  return ctx;
};

export const FirebaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [cloudArtworks, setCloudArtworks] = useState<Artwork[]>([]);
  const [cloudCustomStylePrompt, setCloudCustomStylePrompt] = useState<string>('');
  const [cloudPreferredStyleId, setCloudPreferredStyleId] = useState<string | null>(null);

  const ensureInFlightRef = React.useRef<Map<string, Promise<void>>>(new Map());

  const ensureUserDocs = useCallback(async (user: User) => {
    const uid = sanitizeFirestoreId(user.uid, 'user');
    const existingPromise = ensureInFlightRef.current.get(uid);
    if (existingPromise) {
      return existingPromise;
    }

    const run = (async () => {
      const userPath = `users/${uid}`;
      const privatePath = `users/${uid}/private/account`;
      let activePath = userPath;
      let activeOp = OperationType.WRITE;

      try {
        const userRef = doc(db, 'users', uid);
        activeOp = OperationType.GET;
        const userSnap = await getDoc(userRef);
        const displayName = (user.displayName || user.email?.split('@')[0] || 'Cat Artist').slice(0, 100);
        const photoURL = (user.photoURL || '').slice(0, 500);

        if (!userSnap.exists()) {
          activeOp = OperationType.CREATE;
          await setDoc(userRef, {
            uid,
            displayName,
            ...(photoURL ? { photoURL } : {}),
            bio: 'Персональная облачная галерея котиков',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          const data = userSnap.data();
          if (typeof data?.customStylePrompt === 'string') {
            setCloudCustomStylePrompt(data.customStylePrompt);
          }
          if (typeof data?.preferredStyleId === 'string') {
            setCloudPreferredStyleId(data.preferredStyleId);
          }
          activeOp = OperationType.UPDATE;
          await updateDoc(userRef, {
            displayName,
            ...(photoURL ? { photoURL } : {}),
            updatedAt: serverTimestamp(),
          });
        }

        if (user.email) {
          activePath = privatePath;
          const privRef = doc(db, 'users', uid, 'private', 'account');
          activeOp = OperationType.GET;
          const privSnap = await getDoc(privRef);
          const email = user.email.slice(0, 200);
          if (!privSnap.exists()) {
            activeOp = OperationType.CREATE;
            await setDoc(privRef, {
              uid,
              email,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          } else {
            activeOp = OperationType.UPDATE;
            await updateDoc(privRef, {
              email,
              updatedAt: serverTimestamp(),
            });
          }
        }
      } catch (err) {
        handleFirestoreError(err, activeOp, activePath);
      } finally {
        ensureInFlightRef.current.delete(uid);
      }
    })();

    ensureInFlightRef.current.set(uid, run);
    return run;
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setGoogleUser(user);
      setIsAuthReady(true);
      if (user) {
        try {
          await ensureUserDocs(user);
        } catch (err) {
          console.warn('Could not sync user doc on auth restore:', err);
        }
      } else {
        setCloudArtworks([]);
        setCloudCustomStylePrompt('');
        setCloudPreferredStyleId(null);
      }
    });
    return () => unsub();
  }, [ensureUserDocs]);

  // Attach Firestore snapshot listener ONLY when auth is ready and user is authenticated
  useEffect(() => {
    if (!isAuthReady || !googleUser) return;

    const uid = sanitizeFirestoreId(googleUser.uid, 'user');
    const artworksPath = `users/${uid}/artworks`;
    const q = query(collection(db, 'users', uid, 'artworks'), where('ownerUid', '==', uid));

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const loaded: Artwork[] = [];
        snapshot.forEach((docSnap) => {
          const d = docSnap.data();
          const createdMs =
            d.createdAt instanceof Timestamp
              ? d.createdAt.toMillis()
              : typeof d.createdAt === 'number'
              ? d.createdAt
              : Date.now();

          loaded.push({
            id: String(d.id || docSnap.id),
            title: String(d.title || 'Кошачий шедевр'),
            imageUrl: String(d.imagePreviewUrl || ''),
            prompt: String(d.prompt || ''),
            style: String(d.style || 'Авторский стиль'),
            year: `Cloud Gallery, ${new Date(createdMs).getFullYear()}`,
            description: String(d.description || ''),
            palette: [
              { hex: '#0047AB', name: 'Синий' },
              { hex: '#FFD700', name: 'Золото' },
              { hex: '#00F5D4', name: 'Циан' },
            ],
            brushstrokeNote: 'Сохранено в персональной галерее Google Cloud',
            aspectRatio: (d.aspectRatio as AspectRatioType) || '1:1',
            createdAt: createdMs,
            isUserCreated: true,
            modelUsed: String(d.modelUsed || 'gemini-nano-banana-2.1'),
            likes: typeof d.likes === 'number' ? d.likes : 1,
            authorId: uid,
            authorName: googleUser.displayName || 'Google Artist',
            source: 'my-local',
            isBackedUpLocally: true,
          });
        });

        loaded.sort((a, b) => b.createdAt - a.createdAt);
        setCloudArtworks(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, artworksPath);
      }
    );

    return () => unsub();
  }, [isAuthReady, googleUser]);

  const signInWithGoogle = useCallback(async (): Promise<User | null> => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await ensureUserDocs(result.user);
      return result.user;
    } catch (err: any) {
      const code = err?.code || '';
      const rawMsg = String(err?.message || '');
      if (code === 'auth/popup-closed-by-user') {
        setAuthError('Окно входа через Google было закрыто до завершения авторизации.');
      } else if (code === 'auth/popup-blocked') {
        setAuthError('Браузер заблокировал всплывающее окно Google. Разрешите pop-up и повторите.');
      } else if (rawMsg.startsWith('{')) {
        setAuthError('Аккаунт Google подключён, но синхронизация профиля с облаком требует прав доступа Firestore.');
      } else {
        setAuthError(rawMsg || 'Не удалось выполнить вход через Google.');
      }
      return null;
    } finally {
      setIsSigningIn(false);
    }
  }, [ensureUserDocs]);

  const signOutGoogle = useCallback(async () => {
    try {
      await signOut(auth);
      setCloudArtworks([]);
    } catch (err: any) {
      setAuthError(err?.message || 'Ошибка выхода из Google-аккаунта.');
    }
  }, []);

  const saveArtworkToCloud = useCallback(
    async (artwork: Artwork, stylePresetId = 'custom') => {
      if (!googleUser) return;
      const uid = sanitizeFirestoreId(googleUser.uid, 'user');
      const artworkId = sanitizeFirestoreId(artwork.id, 'vg_art');
      const path = `users/${uid}/artworks/${artworkId}`;

      try {
        await ensureUserDocs(googleUser);
        const compressedUrl = await compressImageForFirestore(artwork.imageUrl, 450000);
        if (!compressedUrl || compressedUrl.length < 10) return;

        const allowedRatios = ['1:1', '4:3', '3:4', '16:9', '9:16', '4:1', '1:4'];
        const safeRatio = allowedRatios.includes(artwork.aspectRatio) ? artwork.aspectRatio : '1:1';

        const artRef = doc(db, 'users', uid, 'artworks', artworkId);
        await setDoc(artRef, {
          id: artworkId,
          ownerUid: uid,
          title: (artwork.title || 'Кошачье полотно').slice(0, 120),
          style: (artwork.style || 'Авторский стиль').slice(0, 100),
          stylePresetId: (stylePresetId || 'custom').slice(0, 64),
          prompt: (artwork.prompt || 'Кот в авторском стиле').slice(0, 1000),
          aspectRatio: safeRatio,
          modelUsed: (artwork.modelUsed || 'gemini-nano-banana-2.1').slice(0, 80),
          description: (artwork.description || '').slice(0, 600),
          imagePreviewUrl: compressedUrl.slice(0, 500000),
          likes: Math.max(0, Math.min(1000000, Number(artwork.likes) || 1)),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    },
    [googleUser, ensureUserDocs]
  );

  const deleteArtworkFromCloud = useCallback(
    async (artworkId: string) => {
      if (!googleUser) return;
      const uid = sanitizeFirestoreId(googleUser.uid, 'user');
      const safeId = sanitizeFirestoreId(artworkId, 'vg_art');
      const path = `users/${uid}/artworks/${safeId}`;
      try {
        await deleteDoc(doc(db, 'users', uid, 'artworks', safeId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    },
    [googleUser]
  );

  const updateCloudStylePreferences = useCallback(
    async (preferredStyleId: string, customStylePrompt: string) => {
      if (!googleUser) return;
      const uid = sanitizeFirestoreId(googleUser.uid, 'user');
      const path = `users/${uid}`;
      try {
        await ensureUserDocs(googleUser);
        await updateDoc(doc(db, 'users', uid), {
          preferredStyleId: preferredStyleId.slice(0, 64),
          customStylePrompt: customStylePrompt.slice(0, 400),
          updatedAt: serverTimestamp(),
        });
        setCloudPreferredStyleId(preferredStyleId);
        setCloudCustomStylePrompt(customStylePrompt);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    },
    [googleUser, ensureUserDocs]
  );

  return (
    <FirebaseAuthContext.Provider
      value={{
        googleUser,
        isAuthReady,
        isSigningIn,
        authError,
        cloudArtworks,
        cloudCustomStylePrompt,
        cloudPreferredStyleId,
        signInWithGoogle,
        signOutGoogle,
        clearAuthError: () => setAuthError(null),
        saveArtworkToCloud,
        deleteArtworkFromCloud,
        updateCloudStylePreferences,
      }}
    >
      {children}
    </FirebaseAuthContext.Provider>
  );
};
