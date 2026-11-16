import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { MasterpieceViewer } from './components/MasterpieceViewer';
import { ArtStudioGenerator } from './components/ArtStudioGenerator';
import { ImageEditorModal } from './components/ImageEditorModal';
import { GalleryGrid } from './components/GalleryGrid';
import { BrushstrokeZoomModal } from './components/BrushstrokeZoomModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { AndroidInstallBanner } from './components/AndroidInstallBanner';
import { UbuntuDesktopModal } from './components/UbuntuDesktopModal';
import { P2PNetworkHub } from './components/P2PNetworkHub';
import { FileComplaintModal } from './components/FileComplaintModal';
import { CatPassportModal } from './components/CatPassportModal';
import { ProUpgradeModal } from './components/ProUpgradeModal';
import { MuseumFramingModal } from './components/MuseumFramingModal';
import { MuseumPostcardModal } from './components/MuseumPostcardModal';
import { ArtworkGuestbookModal } from './components/ArtworkGuestbookModal';
import { DeletePublicationModal } from './components/DeletePublicationModal';
import { RasterThemeBackground } from './components/theming/RasterThemeBackground';
import { StyleThemeSelectorBar } from './components/theming/StyleThemeSelectorBar';
import { SplashScreen } from './components/SplashScreen';
import { SystemPermissionsModal } from './components/SystemPermissionsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { ProfileManagementView } from './components/ProfileManagementView';
import { SystemPlatformsView } from './components/SystemPlatformsView';
import { INITIAL_MASTERPIECES } from './data/masterpieces';
import { Artwork, AspectRatioType, ArtistProfile, CatProfile, MainAppTab, StoredUserProfile } from './types';
import { getOrCreateArtistProfile, validateCatSanctity } from './utils/p2pCrypto';
import {
  saveLocalArtwork,
  getLocalArtworks,
  getFriendBackupArtworks,
  purgeCondemnedArtworkFromStorage,
  deleteArtworkFromStorage,
  cleanseCorruptedVectorArtworks
} from './utils/p2pStorage';
import {
  getAllProfiles,
  getActiveProfile,
  hasCompletedPermissionsSetup,
  setActiveProfileId,
} from './utils/profileManager';
import { filePeerComplaint } from './utils/p2pDispute';
import { p2pNetwork } from './utils/p2pNetwork';
import { useTranslation } from './context/LanguageContext';

export default function App() {
  const { t, setLanguage } = useTranslation();
  const [artworks, setArtworks] = useState<Artwork[]>(INITIAL_MASTERPIECES);
  const [activeArtworkId, setActiveArtworkId] = useState<string>(INITIAL_MASTERPIECES[0].id);
  const [activeModel, setActiveModel] = useState<string>('gemini-3.1-flash-lite-image');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [complaintNotice, setComplaintNotice] = useState<string | null>(null);

  // Tab State: replacing endless scroll with organized functional tabs
  const [activeTab, setActiveTab] = useState<MainAppTab>('gallery');

  // Splash & Onboarding Life Cycle
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);

  // Multi-Profile and Artist State
  const [profilesList, setProfilesList] = useState<StoredUserProfile[]>(() => getAllProfiles());
  const [artistProfile, setArtistProfile] = useState<ArtistProfile>(() => {
    const existing = getActiveProfile();
    if (existing) return existing;
    return {
      id: 'local_painter',
      name: 'Винсент Рыжехвостый',
      avatarColor: 'from-amber-500 to-yellow-600',
      bio: 'Художник децентрализованной мастерской',
      createdAt: Date.now(),
      totalCreations: 0,
      likedArtworkIds: [],
    };
  });

  // Modals state
  const [zoomArtwork, setZoomArtwork] = useState<Artwork | null>(null);
  const [editorArtwork, setEditorArtwork] = useState<Artwork | null>(null);
  const [isAndroidModalOpen, setIsAndroidModalOpen] = useState<boolean>(false);
  const [isUbuntuModalOpen, setIsUbuntuModalOpen] = useState<boolean>(false);
  const [isCatPassportOpen, setIsCatPassportOpen] = useState<boolean>(false);
  const [isProModalOpen, setIsProModalOpen] = useState<boolean>(false);
  const [framingArtwork, setFramingArtwork] = useState<Artwork | null>(null);
  const [postcardArtwork, setPostcardArtwork] = useState<Artwork | null>(null);
  const [guestbookArtwork, setGuestbookArtwork] = useState<Artwork | null>(null);
  const [complaintArtwork, setComplaintArtwork] = useState<Artwork | null>(null);
  const [deletingArtwork, setDeletingArtwork] = useState<Artwork | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<CatProfile | null>(null);
  const [externalStudioPrompt, setExternalStudioPrompt] = useState<string>('');
  const [inspectedCount, setInspectedCount] = useState<number>(1);
  const [isPro, setIsPro] = useState<boolean>(() => {
    try {
      return localStorage.getItem('vangogh_cat_pro_status') === 'true';
    } catch {
      return false;
    }
  });

  const handleActivatePro = () => {
    setIsPro(true);
    try {
      localStorage.setItem('vangogh_cat_pro_status', 'true');
    } catch {}
  };

  const handleDeactivatePro = () => {
    setIsPro(false);
    try {
      localStorage.removeItem('vangogh_cat_pro_status');
    } catch {}
  };

  const isCleanArtwork = (art: Artwork) =>
    !art.imageUrl?.startsWith('data:image/svg+xml') &&
    !art.imageUrl?.includes('<svg') &&
    !art.id?.startsWith('vg_edit_');

  const activeArtwork =
    artworks.find(a => a.id === activeArtworkId && isCleanArtwork(a)) ||
    artworks.find(a => isCleanArtwork(a)) ||
    INITIAL_MASTERPIECES[0];
  const activeArtworkIndex = artworks.findIndex(a => a.id === activeArtwork.id);

  const handleNavigatePrev = () => {
    if (artworks.length <= 1) return;
    const currentIdx = activeArtworkIndex >= 0 ? activeArtworkIndex : 0;
    const prevIndex = (currentIdx - 1 + artworks.length) % artworks.length;
    setActiveArtworkId(artworks[prevIndex].id);
    setInspectedCount(c => c + 1);
  };

  const handleNavigateNext = () => {
    if (artworks.length <= 1) return;
    const currentIdx = activeArtworkIndex >= 0 ? activeArtworkIndex : 0;
    const nextIndex = (currentIdx + 1) % artworks.length;
    setActiveArtworkId(artworks[nextIndex].id);
    setInspectedCount(c => c + 1);
  };

  // Lifecycle Step 1: Splash screen completion handler
  const handleSplashComplete = () => {
    setShowSplash(false);
    // Check if system permissions were already requested
    const permsDone = hasCompletedPermissionsSetup();
    if (!permsDone) {
      setShowPermissionsModal(true);
    } else {
      checkProfilesAfterStartup();
    }
  };

  // Lifecycle Step 2: Permissions modal completion handler
  const handlePermissionsComplete = () => {
    setShowPermissionsModal(false);
    checkProfilesAfterStartup();
  };

  // Check if onboarding is needed
  const checkProfilesAfterStartup = () => {
    const list = getAllProfiles();
    setProfilesList(list);
    if (list.length === 0) {
      setShowOnboardingModal(true);
    } else {
      const active = getActiveProfile() || list[0];
      setArtistProfile(active);
      initP2PForProfile(active);
    }
  };

  // Lifecycle Step 3: Onboarding completion handler
  const handleOnboardingComplete = (profile: StoredUserProfile) => {
    setShowOnboardingModal(false);
    setArtistProfile(profile);
    const updated = getAllProfiles();
    setProfilesList(updated);
    initP2PForProfile(profile);
    setActionNotice(`Добро пожаловать в галерею, мастер ${profile.name}!`);
    setTimeout(() => setActionNotice(null), 5000);
  };

  const initP2PForProfile = (profile: ArtistProfile) => {
    p2pNetwork.init(
      profile,
      (incomingArt) => {
        setArtworks(prev => {
          if (prev.some(a => a.id === incomingArt.id)) return prev;
          return [incomingArt, ...prev];
        });
      },
      (friend) => {
        console.log('WebRTC P2P friend connected:', friend.name);
      },
      (artId) => {
        setArtworks(prev => prev.map(a => a.id === artId ? { ...a, likes: (a.likes || 0) + 1 } : a));
      },
      artworks.length
    );
  };

  // Initialize P2P Artist Profile and load local + friend backups from IndexedDB
  useEffect(() => {
    // Cleanse any corrupted vector/SVG graphics from previous remix attempts and load safe creations
    cleanseCorruptedVectorArtworks().then((purged) => {
      if (purged.length > 0) {
        console.log('Cleaned corrupted vector artifacts from storage:', purged);
      }
      Promise.all([getLocalArtworks(), getFriendBackupArtworks()]).then(([localCreations, friendBackups]) => {
        const cleanLocal = localCreations.filter(isCleanArtwork);
        const cleanFriends = friendBackups.filter(isCleanArtwork);

        if (cleanLocal.length > 0 || cleanFriends.length > 0) {
          setArtworks(prev => {
            const combined = [...cleanLocal, ...cleanFriends, ...prev.filter(isCleanArtwork)];
            const seen = new Set<string>();
            return combined.filter(item => {
              if (seen.has(item.id)) return false;
              seen.add(item.id);
              return true;
            });
          });
        }
      });
    });

    // Also fetch server-side shared gallery artworks
    fetch('/api/artworks')
      .then(res => res.json())
      .then(data => {
        if (data.artworks && Array.isArray(data.artworks) && data.artworks.length > 0) {
          const cleanServerArt = data.artworks.filter(isCleanArtwork);
          setArtworks(prev => {
            const existingIds = new Set(cleanServerArt.map((a: Artwork) => a.id));
            const remaining = prev.filter(a => isCleanArtwork(a) && !existingIds.has(a.id));
            return [...cleanServerArt, ...remaining];
          });
        }
      })
      .catch(err => {
        console.warn('Using local initial masterpieces:', err);
      });
  }, []);

  const handleGenerateImage = async (
    prompt: string,
    model: string,
    aspectRatio: AspectRatioType,
    stylePresetId: string
  ) => {
    // 1. Enforce strict P2P rule: "Запрещено всё кроме котов"
    const validation = validateCatSanctity(prompt);
    if (!validation.isCat) {
      setError(validation.reason || t.catSanctityError);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model,
          aspectRatio,
          stylePresetId
        })
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || t.errorGenerate);
      }

      if (data.artwork) {
        const enrichedArtwork: Artwork = {
          ...data.artwork,
          authorId: artistProfile.id,
          authorName: artistProfile.name,
          source: 'my-local',
          isBackedUpLocally: true,
        };

        setArtworks(prev => [enrichedArtwork, ...prev]);
        setActiveArtworkId(enrichedArtwork.id);
        saveLocalArtwork(enrichedArtwork);
      } else if (data.isCuratedFallback) {
        const presetToArtId: Record<string, string> = {
          starry_night: 'vg_two_cats_starry',
          cafe_terrace: 'vg_two_cats_cafe',
          sunflowers: 'vg_two_cats_sunflowers',
          almond_blossom: 'vg_two_cats_almond',
          bedroom_arles: 'vg_two_cats_bedroom',
          wheatfield: 'vg_two_cats_wheatfield',
          irises: 'vg_two_cats_irises',
          red_vineyard: 'vg_two_cats_vineyard',
          olive_trees: 'vg_two_cats_olives',
          rhone_night: 'vg_two_cats_rhone',
        };

        const targetId = presetToArtId[stylePresetId] || 'vg_two_cats_starry';
        const baseMasterpiece = INITIAL_MASTERPIECES.find(a => a.id === targetId) || INITIAL_MASTERPIECES[0];

        const customArt: Artwork = {
          ...baseMasterpiece,
          id: `vg_exhibition_${Date.now()}`,
          title: data.suggestedTitle || baseMasterpiece.title,
          prompt: prompt,
          description: data.curatorNote || baseMasterpiece.description,
          isUserCreated: true,
          authorId: artistProfile.id,
          authorName: artistProfile.name,
          source: 'my-local',
          isBackedUpLocally: true,
          createdAt: Date.now()
        };

        setArtworks(prev => [customArt, ...prev]);
        setActiveArtworkId(customArt.id);
        saveLocalArtwork(customArt);

        if (data.quotaNotice) {
          setActionNotice(data.quotaNotice);
          setTimeout(() => setActionNotice(null), 6500);
        }
      }
    } catch (err: unknown) {
      console.info('Using authentic curated oil painting from collection:', (err as Error)?.message);
      const fallbackArt = INITIAL_MASTERPIECES[0];
      setActiveArtworkId(fallbackArt.id);
      setActionNotice('Экспозиция шедевра открыта в выбранном стиле.');
      setTimeout(() => setActionNotice(null), 6000);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageEdited = (newArtwork: Artwork) => {
    const enrichedArtwork: Artwork = {
      ...newArtwork,
      authorId: artistProfile.id,
      authorName: artistProfile.name,
      source: 'my-local',
      isBackedUpLocally: true,
    };
    setArtworks(prev => [enrichedArtwork, ...prev]);
    setActiveArtworkId(enrichedArtwork.id);
    saveLocalArtwork(enrichedArtwork);
  };

  const handleLike = (id: string) => {
    setArtworks(prev =>
      prev.map(art => {
        if (art.id === id) {
          return { ...art, likes: (art.likes || 10) + 1 };
        }
        return art;
      })
    );
  };

  const handleSelectRandomCurated = () => {
    const curated = artworks.filter(a => !a.isUserCreated);
    const options = curated.length > 0 ? curated : artworks;
    const randomIndex = Math.floor(Math.random() * options.length);
    setActiveArtworkId(options[randomIndex].id);
    setError(null);
  };

  const handlePurgeCondemnedArtwork = async (artworkId: string) => {
    await purgeCondemnedArtworkFromStorage(artworkId);
    setArtworks(prev => prev.filter(a => a.id !== artworkId));
    if (activeArtworkId === artworkId) {
      const fallback = artworks.find(a => a.id !== artworkId && isCleanArtwork(a)) || INITIAL_MASTERPIECES[0];
      setActiveArtworkId(fallback.id);
    }
  };

  const handleConfirmDelete = async (artworkId: string) => {
    try {
      const artToDelete = artworks.find(a => a.id === artworkId);
      await deleteArtworkFromStorage(artworkId);

      try {
        await fetch(`/api/artwork/${artworkId}`, { method: 'DELETE' });
      } catch (e) {
        console.warn('Backend delete notification error:', e);
      }

      setArtworks(prev => prev.filter(a => a.id !== artworkId));

      if (activeArtworkId === artworkId) {
        const remaining = artworks.filter(a => a.id !== artworkId && isCleanArtwork(a));
        const fallback = remaining[0] || INITIAL_MASTERPIECES[0];
        setActiveArtworkId(fallback.id);
      }

      setActionNotice(`Публикация «${artToDelete?.title || 'Картина'}» успешно удалена автором.`);
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: unknown) {
      console.error('Delete publication error:', err);
      setError('Не удалось удалить публикацию. Попробуйте снова.');
    }
  };

  const handleSubmitComplaint = (artwork: Artwork, reason: string) => {
    filePeerComplaint(artwork, artistProfile, reason);
    setActiveTab('network');
    setComplaintNotice(`${t.complaintAlertSuccess}: «${artwork.title}»`);
    setTimeout(() => setComplaintNotice(null), 6000);
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-cyan-400 selection:text-slate-950 relative overflow-x-hidden">
      {/* 1. Splash Screen at initial launch */}
      {showSplash && (
        <SplashScreen
          onComplete={handleSplashComplete}
          onLanguageDetected={(lang) => setLanguage(lang)}
        />
      )}

      {/* Authentic High-Resolution Raster Museum Art Background & Canvas Textures */}
      <RasterThemeBackground />

      {/* Complaint Notice Toast */}
      {complaintNotice && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-[#0d122e]/95 border-2 border-cyan-400/70 text-cyan-200 text-xs shadow-2xl max-w-sm animate-fade-in flex items-center justify-between gap-3 backdrop-blur-md">
          <span className="font-medium">{complaintNotice}</span>
          <button onClick={() => setComplaintNotice(null)} className="text-slate-400 hover:text-white cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* Author Publication Deletion Notice Toast */}
      {actionNotice && (
        <div className="fixed top-20 right-4 z-50 p-4 rounded-2xl bg-[#1a0814]/95 border-2 border-rose-500/80 text-rose-200 text-xs shadow-2xl max-w-sm animate-fade-in flex items-center justify-between gap-3 backdrop-blur-md">
          <span className="font-medium">{actionNotice}</span>
          <button onClick={() => setActionNotice(null)} className="text-rose-400 hover:text-rose-100 cursor-pointer font-bold">✕</button>
        </div>
      )}

      {/* Top Navbar with Functional Tabs Navigation */}
      <Navbar
        artworksCount={artworks.length}
        activeModel={activeModel}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        onOpenUbuntuModal={() => setIsUbuntuModalOpen(true)}
        onOpenCatPassport={() => setIsCatPassportOpen(true)}
        onOpenProModal={() => setIsProModalOpen(true)}
        isPro={isPro}
        profilesCount={profilesList.length}
        activeProfileName={artistProfile.name}
      />

      {/* Main Content Area Structured By Tabs */}
      <main className="relative z-10">
        {/* TAB 1: 🖼️ Masterpiece Gallery & Exhibition */}
        {activeTab === 'gallery' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 animate-in fade-in duration-300">
            {/* Hero Section: Active Van Gogh Cat Masterpiece */}
            <MasterpieceViewer
              artwork={activeArtwork}
              onOpenZoom={(art) => setZoomArtwork(art)}
              onOpenEditor={(art) => setEditorArtwork(art)}
              onLike={handleLike}
              onReportDispute={(art) => setComplaintArtwork(art)}
              onDeletePublication={(art) => setDeletingArtwork(art)}
              canDelete={Boolean(activeArtwork.isUserCreated || activeArtwork.source === 'my-local' || (artistProfile && activeArtwork.authorId === artistProfile.id))}
              isPro={isPro}
              onOpenProModal={() => setIsProModalOpen(true)}
              onOpenFramingModal={(art) => setFramingArtwork(art)}
              onOpenPostcard={(art) => setPostcardArtwork(art)}
              onOpenGuestbook={(art) => setGuestbookArtwork(art)}
              onNavigatePrev={artworks.length > 1 ? handleNavigatePrev : undefined}
              onNavigateNext={artworks.length > 1 ? handleNavigateNext : undefined}
              artworkIndex={activeArtworkIndex >= 0 ? activeArtworkIndex : 0}
              totalArtworks={artworks.length}
              inspectedCount={inspectedCount}
            />

            {/* Exhibition Gallery Grid */}
            <GalleryGrid
              artworks={artworks}
              activeArtworkId={activeArtworkId}
              onSelectArtwork={(item) => {
                setActiveArtworkId(item.id);
                setInspectedCount(c => c + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onLike={handleLike}
              onDeletePublication={(art) => setDeletingArtwork(art)}
              currentUserId={artistProfile.id}
              isPro={isPro}
              onOpenProModal={() => setIsProModalOpen(true)}
            />
          </div>
        )}

        {/* TAB 2: 🎨 AI Art Studio */}
        {activeTab === 'studio' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-8 animate-in fade-in duration-300">
            {/* AI Studio: Text Prompt Image Generation */}
            <ArtStudioGenerator
              onGenerate={handleGenerateImage}
              isGenerating={isGenerating}
              error={error}
              onClearError={() => setError(null)}
              onSelectRandomCurated={handleSelectRandomCurated}
              activeModel={activeModel}
              onModelChange={(m) => setActiveModel(m)}
              isBannedReadOnly={artistProfile.isBannedReadOnly}
              externalPrompt={externalStudioPrompt}
              activeCat={activeCat}
            />

            {/* Style Themes & Art Direction Selector Bar */}
            <StyleThemeSelectorBar />
          </div>
        )}

        {/* TAB 3: 🤝 P2P Network, Dual-Host LAN & Swarm Storage */}
        {activeTab === 'network' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 animate-in fade-in duration-300">
            <P2PNetworkHub
              artistProfile={artistProfile}
              myArtworks={artworks}
              onProfileUpdate={(updated) => setArtistProfile(updated)}
              onAddArtworksFromPeer={(newArts) => {
                setArtworks(prev => {
                  const existing = new Set(prev.map(a => a.id));
                  const filtered = newArts.filter(a => !existing.has(a.id));
                  return [...filtered, ...prev];
                });
              }}
              onSelectArtwork={(artwork) => {
                setActiveArtworkId(artwork.id);
                setActiveTab('gallery');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              onLikeArtwork={handleLike}
              onPurgeCondemnedArtwork={handlePurgeCondemnedArtwork}
            />
          </div>
        )}

        {/* TAB 4: 👤 Multi-Profile Manager & BIP-39 Vault */}
        {activeTab === 'profiles' && (
          <ProfileManagementView
            currentProfile={{
              ...artistProfile,
              seedPhrase: (artistProfile as StoredUserProfile).seedPhrase,
              pinHash: (artistProfile as StoredUserProfile).pinHash,
              pinSalt: (artistProfile as StoredUserProfile).pinSalt,
              hasBip39Wallet: (artistProfile as StoredUserProfile).hasBip39Wallet,
            }}
            artworks={artworks}
            onProfileChanged={(updatedProfile) => {
              setArtistProfile(updatedProfile);
              setProfilesList(getAllProfiles());
              initP2PForProfile(updatedProfile);
            }}
            onOpenCatPassport={() => setIsCatPassportOpen(true)}
          />
        )}

        {/* TAB 5: 🐧 System, Platforms & Permissions */}
        {activeTab === 'system' && (
          <SystemPlatformsView
            onOpenUbuntuModal={() => setIsUbuntuModalOpen(true)}
            onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
            onOpenProModal={() => setIsProModalOpen(true)}
            isPro={isPro}
            artworksCount={artworks.length}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-indigo-900/60 bg-[#070a24]/90 backdrop-blur-md py-8 text-center text-xs text-cyan-200/70 relative z-10">
        <div className="max-w-7xl mx-auto px-4 space-y-2 font-gaudi">
          <p className="text-sm text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-cyan-300">
            «{t.footerQuote}»
          </p>
          <p className="font-cyber text-[11px] text-cyan-300/60">
            {t.footerMadeFor} {activeModel} • BIP-39 Cryptographic Vault & Ubuntu RC1 Engine
          </p>
        </div>
      </footer>

      {/* Modals & Dialogs */}
      <SystemPermissionsModal
        isOpen={showPermissionsModal}
        onComplete={handlePermissionsComplete}
      />

      <OnboardingModal
        isOpen={showOnboardingModal}
        onComplete={handleOnboardingComplete}
        allowClose={profilesList.length > 0}
        onClose={() => setShowOnboardingModal(false)}
        artworks={artworks}
      />

      <BrushstrokeZoomModal
        artwork={zoomArtwork}
        isOpen={!!zoomArtwork}
        onClose={() => setZoomArtwork(null)}
      />

      <ImageEditorModal
        artwork={editorArtwork}
        isOpen={!!editorArtwork}
        onClose={() => setEditorArtwork(null)}
        onImageEdited={handleImageEdited}
        activeModel={activeModel}
        isBannedReadOnly={artistProfile.isBannedReadOnly}
      />

      <FileComplaintModal
        artwork={complaintArtwork}
        isOpen={!!complaintArtwork}
        onClose={() => setComplaintArtwork(null)}
        onSubmit={handleSubmitComplaint}
      />

      <DeletePublicationModal
        artwork={deletingArtwork}
        isOpen={!!deletingArtwork}
        onClose={() => setDeletingArtwork(null)}
        onConfirmDelete={handleConfirmDelete}
      />

      <CatPassportModal
        isOpen={isCatPassportOpen}
        onClose={() => setIsCatPassportOpen(false)}
        onSelectCatForStudio={(cat) => {
          setActiveCat(cat);
          setExternalStudioPrompt(
            `Кот по имени ${cat.name}, порода: ${cat.breed}, цвет глаз: ${cat.eyeColor}. Особые приметы: ${cat.distinctiveMarks}. Сидит задумчиво и смотрит на звёзды.`
          );
          setActiveTab('studio');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      <ProUpgradeModal
        isOpen={isProModalOpen}
        onClose={() => setIsProModalOpen(false)}
        isPro={isPro}
        onActivatePro={handleActivatePro}
        onDeactivatePro={handleDeactivatePro}
      />

      <MuseumFramingModal
        isOpen={!!framingArtwork}
        onClose={() => setFramingArtwork(null)}
        artwork={framingArtwork}
      />

      <MuseumPostcardModal
        isOpen={!!postcardArtwork}
        onClose={() => setPostcardArtwork(null)}
        artwork={postcardArtwork}
        artistName={artistProfile.name}
      />

      <ArtworkGuestbookModal
        isOpen={!!guestbookArtwork}
        onClose={() => setGuestbookArtwork(null)}
        artwork={guestbookArtwork}
        currentArtistName={artistProfile.name}
      />

      <AndroidInstallBanner onOpenModal={() => setIsAndroidModalOpen(true)} />
      
      <AndroidInstallModal
        isOpen={isAndroidModalOpen}
        onClose={() => setIsAndroidModalOpen(false)}
      />

      <UbuntuDesktopModal
        isOpen={isUbuntuModalOpen}
        onClose={() => setIsUbuntuModalOpen(false)}
      />
    </div>
  );
}
