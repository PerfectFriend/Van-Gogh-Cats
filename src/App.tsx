import React, { useState, useEffect } from 'react';
import { X, Crown } from 'lucide-react';
import { ArtStudioGenerator, StudioGenerateParams } from './components/ArtStudioGenerator';
import { ImageEditorModal } from './components/ImageEditorModal';
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
import { SplashScreen } from './components/SplashScreen';
import { SystemPermissionsModal } from './components/SystemPermissionsModal';
import { OnboardingModal } from './components/OnboardingModal';
import { SystemPlatformsView } from './components/SystemPlatformsView';
import { InstagramNav } from './components/instagram/InstagramNav';
import { StoriesStrip } from './components/instagram/StoriesStrip';
import { InstagramStoryModal } from './components/instagram/InstagramStoryModal';
import { InstagramFeedPost } from './components/instagram/InstagramFeedPost';
import { InstagramExploreView } from './components/instagram/InstagramExploreView';
import { InstagramProfileView } from './components/instagram/InstagramProfileView';
import { ArtworkActionSheet } from './components/instagram/ArtworkActionSheet';
import { ThemeDrawerModal } from './components/instagram/ThemeDrawerModal';
import { INITIAL_MASTERPIECES } from './data/masterpieces';
import { GOURMET_CAT_SPONSORS } from './data/catSponsors';
import { Artwork, AspectRatioType, ArtistProfile, CatProfile, MainAppTab, StoredUserProfile } from './types';
import { validateCatSanctity } from './utils/p2pCrypto';
import {
  saveLocalArtwork,
  getLocalArtworks,
  getFriendBackupArtworks,
  purgeCondemnedArtworkFromStorage,
  deleteArtworkFromStorage,
  cleanseCorruptedVectorArtworks,
} from './utils/p2pStorage';
import {
  getAllProfiles,
  getActiveProfile,
  hasCompletedPermissionsSetup,
} from './utils/profileManager';
import { filePeerComplaint } from './utils/p2pDispute';
import { p2pNetwork } from './utils/p2pNetwork';
import { museumAudio } from './utils/museumAudio';
import { useTranslation } from './context/LanguageContext';
import { useFirebaseAuth } from './context/FirebaseAuthContext';

export default function App() {
  const { t, setLanguage } = useTranslation();
  const { googleUser, cloudArtworks, saveArtworkToCloud, deleteArtworkFromCloud } = useFirebaseAuth();
  const [artworks, setArtworks] = useState<Artwork[]>(INITIAL_MASTERPIECES);
  const [activeArtworkId, setActiveArtworkId] = useState<string>(INITIAL_MASTERPIECES[0].id);
  const [activeModel, setActiveModel] = useState<string>('gemini-nano-banana-2.1');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [complaintNotice, setComplaintNotice] = useState<string | null>(null);

  // Instagram Primary Navigation Tab
  const [activeTab, setActiveTab] = useState<MainAppTab>('gallery');

  // Splash & Onboarding Life Cycle
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState<boolean>(false);

  // Multi-Profile and Artist State
  const [profilesList, setProfilesList] = useState<StoredUserProfile[]>(() => getAllProfiles());
  const [artistProfile, setArtistProfile] = useState<StoredUserProfile>(() => {
    const existing = getActiveProfile();
    if (existing) return existing;
    return {
      id: 'local_painter',
      name: 'Винсент Рыжехвостый',
      avatarColor: 'from-amber-500 to-yellow-600',
      bio: 'Художник децентрализованной мастерской кошачьего постимпрессионизма',
      createdAt: Date.now(),
      totalCreations: 0,
      likedArtworkIds: [],
    };
  });

  // Instagram Interaction States
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [audioOpenArtworkId, setAudioOpenArtworkId] = useState<string | null>(null);
  const [contextMenuArtwork, setContextMenuArtwork] = useState<Artwork | null>(null);
  const [selectedPostModalArtwork, setSelectedPostModalArtwork] = useState<Artwork | null>(null);
  const [storyViewerState, setStoryViewerState] = useState<{
    isOpen: boolean;
    artwork: Artwork | null;
    themeId?: string;
  }>({ isOpen: false, artwork: null });
  const [isThemeDrawerOpen, setIsThemeDrawerOpen] = useState<boolean>(false);

  // Secondary Modals state (triggered via Context Menu / Long-press / Profile Menu)
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
    Boolean(art.imageUrl) &&
    !art.imageUrl?.startsWith('data:image/svg+xml') &&
    !art.imageUrl?.includes('<svg');

  const canDeleteArtwork = (art: Artwork) =>
    Boolean(
      art.isUserCreated ||
        art.source === 'my-local' ||
        (artistProfile && art.authorId === artistProfile.id)
    );

  // Lifecycle Step 1: Splash screen completion handler
  const handleSplashComplete = () => {
    setShowSplash(false);
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
    setActionNotice(`Добро пожаловать, ${profile.name}!`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  const initP2PForProfile = (profile: ArtistProfile) => {
    p2pNetwork.init(
      profile,
      (incomingArt) => {
        setArtworks((prev) => {
          if (prev.some((a) => a.id === incomingArt.id)) return prev;
          return [incomingArt, ...prev];
        });
      },
      (friend) => {
        console.log('WebRTC P2P friend connected:', friend.name);
      },
      (artId) => {
        setArtworks((prev) =>
          prev.map((a) => (a.id === artId ? { ...a, likes: (a.likes || 0) + 1 } : a))
        );
      },
      artworks.length
    );
  };

  useEffect(() => {
    cleanseCorruptedVectorArtworks().then(() => {
      Promise.all([getLocalArtworks(), getFriendBackupArtworks()]).then(
        ([localCreations, friendBackups]) => {
          const cleanLocal = localCreations.filter(isCleanArtwork);
          const cleanFriends = friendBackups.filter(isCleanArtwork);

          if (cleanLocal.length > 0 || cleanFriends.length > 0) {
            setArtworks((prev) => {
              const combined = [...cleanLocal, ...cleanFriends, ...prev.filter(isCleanArtwork)];
              const seen = new Set<string>();
              return combined.filter((item) => {
                if (seen.has(item.id)) return false;
                seen.add(item.id);
                return true;
              });
            });
          }
        }
      );
    });

    fetch('/api/artworks')
      .then((res) => res.json())
      .then((data) => {
        if (data.artworks && Array.isArray(data.artworks) && data.artworks.length > 0) {
          const cleanServerArt = data.artworks.filter(isCleanArtwork);
          setArtworks((prev) => {
            const existingIds = new Set(cleanServerArt.map((a: Artwork) => a.id));
            const remaining = prev.filter((a) => isCleanArtwork(a) && !existingIds.has(a.id));
            return [...cleanServerArt, ...remaining];
          });
        }
      })
      .catch((err) => {
        console.warn('Using local initial masterpieces:', err);
      });
    // Merge cloud artworks synced from signed-in Google account
    // Handled in dedicated effect below
  }, []);

  useEffect(() => {
    if (!cloudArtworks || cloudArtworks.length === 0) return;
    setArtworks((prev) => {
      const existingIds = new Set(prev.map((a) => a.id));
      const newCloud = cloudArtworks.filter((c) => isCleanArtwork(c) && !existingIds.has(c.id));
      if (newCloud.length === 0) return prev;
      return [...newCloud, ...prev];
    });
  }, [cloudArtworks]);

  const handleGenerateImage = async (params: StudioGenerateParams) => {
    if (params.referenceImages.length === 0) {
      const validation = validateCatSanctity(params.prompt);
      if (!validation.isCat) {
        setError(validation.reason || t.catSanctityError);
        return;
      }
    }

    setIsGenerating(true);
    setError(null);
    const total = params.batchCount || 1;
    const batchAngles = [
      '',
      ' Вариация композиции #2: иной ракурс и выразительное освещение.',
      ' Вариация композиции #3: крупный план и акцент на деталях и фактуре.',
    ];

    const createdArtworks: Artwork[] = [];
    const authorId = googleUser ? `google_${googleUser.uid.slice(0, 16)}` : artistProfile.id;
    const authorName = googleUser?.displayName || artistProfile.name;

    try {
      for (let i = 0; i < total; i++) {
        setGenerationProgress({ current: i + 1, total });
        const stepPrompt = `${params.prompt}${batchAngles[i] || ''}`.trim();

        const response = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: stepPrompt,
            model: params.model,
            aspectRatio: params.aspectRatio,
            imageSize: params.imageSize,
            stylePresetId: params.stylePresetId,
            customStylePrompt: params.customStylePrompt,
            referenceImages: params.referenceImages.map((img) => ({
              dataUrl: img.dataUrl,
              mimeType: img.mimeType,
            })),
          }),
        });

        const data = await response.json();
        if (!response.ok || !data.success || !data.artwork) {
          throw new Error(data.message || data.error || t.errorGenerate);
        }

        const enrichedArtwork: Artwork = {
          ...data.artwork,
          authorId,
          authorName,
          source: 'my-local',
          isBackedUpLocally: true,
        };

        createdArtworks.push(enrichedArtwork);
        setArtworks((prev) => [enrichedArtwork, ...prev]);
        setActiveArtworkId(enrichedArtwork.id);
        saveLocalArtwork(enrichedArtwork);
        if (googleUser) {
          saveArtworkToCloud(enrichedArtwork, params.customStylePrompt ? 'custom' : params.stylePresetId).catch(
            (cloudErr) => console.warn('Cloud sync warning:', cloudErr)
          );
        }
      }

      if (createdArtworks.length > 0) {
        setActionNotice(
          createdArtworks.length > 1
            ? `Создана серия из ${createdArtworks.length} картин в вашем стиле!`
            : `Полотно «${createdArtworks[0].title}» готово!`
        );
        setTimeout(() => setActionNotice(null), 4500);
        setActiveTab('gallery');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err: any) {
      setError(err?.message || t.errorGenerate);
    } finally {
      setIsGenerating(false);
      setGenerationProgress(null);
    }
  };

  const handleImageEdited = (newArtwork: Artwork) => {
    const authorId = googleUser ? `google_${googleUser.uid.slice(0, 16)}` : artistProfile.id;
    const authorName = googleUser?.displayName || artistProfile.name;
    const enrichedArtwork: Artwork = {
      ...newArtwork,
      authorId,
      authorName,
      source: 'my-local',
      isBackedUpLocally: true,
    };
    setArtworks((prev) => [enrichedArtwork, ...prev]);
    setActiveArtworkId(enrichedArtwork.id);
    saveLocalArtwork(enrichedArtwork);
    if (googleUser) {
      saveArtworkToCloud(enrichedArtwork, 'restoration').catch((e) => console.warn('Cloud sync warning:', e));
    }
    setActiveTab('gallery');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLike = (id: string) => {
    const alreadyLiked = likedIds.has(id);
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (alreadyLiked) next.delete(id);
      else next.add(id);
      return next;
    });
    setArtworks((prev) =>
      prev.map((art) => {
        if (art.id === id) {
          const delta = alreadyLiked ? -1 : 1;
          return { ...art, likes: Math.max(0, (art.likes || 12) + delta) };
        }
        return art;
      })
    );
  };

  const handleToggleAudioForArtwork = (art: Artwork) => {
    if (audioOpenArtworkId === art.id) {
      museumAudio.stopSpeech();
      setAudioOpenArtworkId(null);
    } else {
      setAudioOpenArtworkId(art.id);
      const narrationText = `${art.title}. Стиль: ${art.style}. ${art.description}. Особенность мазка: ${art.brushstrokeNote}`;
      museumAudio.playNeuralNarration(narrationText, art.id);
    }
  };

  const handleSelectRandomCurated = () => {
    const curated = artworks.filter((a) => !a.isUserCreated);
    const options = curated.length > 0 ? curated : artworks;
    const randomIndex = Math.floor(Math.random() * options.length);
    const picked = options[randomIndex];
    setActiveArtworkId(picked.id);
    setSelectedPostModalArtwork(picked);
    setError(null);
  };

  const handlePurgeCondemnedArtwork = async (artworkId: string) => {
    await purgeCondemnedArtworkFromStorage(artworkId);
    setArtworks((prev) => prev.filter((a) => a.id !== artworkId));
    if (activeArtworkId === artworkId) {
      const fallback =
        artworks.find((a) => a.id !== artworkId && isCleanArtwork(a)) || INITIAL_MASTERPIECES[0];
      setActiveArtworkId(fallback.id);
    }
  };

  const handleConfirmDelete = async (artworkId: string) => {
    try {
      const artToDelete = artworks.find((a) => a.id === artworkId);
      await deleteArtworkFromStorage(artworkId);
      if (googleUser) {
        deleteArtworkFromCloud(artworkId).catch(() => {});
      }
      try {
        await fetch(`/api/artwork/${artworkId}`, { method: 'DELETE' });
      } catch {}

      setArtworks((prev) => prev.filter((a) => a.id !== artworkId));
      if (selectedPostModalArtwork?.id === artworkId) {
        setSelectedPostModalArtwork(null);
      }
      if (activeArtworkId === artworkId) {
        const remaining = artworks.filter((a) => a.id !== artworkId && isCleanArtwork(a));
        setActiveArtworkId((remaining[0] || INITIAL_MASTERPIECES[0]).id);
      }

      setActionNotice(`Публикация «${artToDelete?.title || 'Картина'}» удалена.`);
      setTimeout(() => setActionNotice(null), 4000);
    } catch {
      setError('Не удалось удалить публикацию. Попробуйте снова.');
    }
  };

  const handleSubmitComplaint = (artwork: Artwork, reason: string) => {
    filePeerComplaint(artwork, artistProfile, reason);
    setActiveTab('network');
    setComplaintNotice(`${t.complaintAlertSuccess}: «${artwork.title}»`);
    setTimeout(() => setComplaintNotice(null), 5000);
  };

  // Order feed so if user picked an active artwork it's highlighted cleanly, otherwise chronological
  const feedArtworks = artworks.filter(isCleanArtwork);

  return (
    <div className="min-h-screen text-slate-100 font-sans selection:bg-amber-400 selection:text-slate-950 relative overflow-x-hidden">
      {/* 1. Splash Screen */}
      {showSplash && (
        <SplashScreen
          onComplete={handleSplashComplete}
          onLanguageDetected={(lang) => setLanguage(lang)}
        />
      )}

      {/* Subtle Instagram Dark Mode Theme Backdrop */}
      <RasterThemeBackground />

      {/* Notices */}
      {(complaintNotice || actionNotice) && (
        <div className="fixed top-14 md:top-4 right-4 z-50 px-4 py-3 rounded-2xl bg-[#121629]/95 border border-white/15 text-slate-100 text-xs shadow-2xl max-w-xs flex items-center justify-between gap-3 backdrop-blur-xl">
          <span>{complaintNotice || actionNotice}</span>
          <button
            type="button"
            onClick={() => {
              setComplaintNotice(null);
              setActionNotice(null);
            }}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Instagram Navigation: Desktop Left Rail + Mobile Top/Bottom Bars */}
      <InstagramNav
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        activeProfile={artistProfile}
        onProfileChanged={(updated) => {
          setArtistProfile(updated);
          setProfilesList(getAllProfiles());
          initP2PForProfile(updated);
        }}
        onOpenThemeDrawer={() => setIsThemeDrawerOpen(true)}
        onOpenCatPassport={() => setIsCatPassportOpen(true)}
        onOpenUbuntuModal={() => setIsUbuntuModalOpen(true)}
        onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
        onOpenProModal={() => setIsProModalOpen(true)}
        onSelectRandomCurated={handleSelectRandomCurated}
        onOpenOnboardingModal={() => setShowOnboardingModal(true)}
        isPro={isPro}
      />

      {/* Main Content Area offset by Instagram Desktop Left Sidebar & Mobile Bottom Bar */}
      <main className="relative z-10 md:pl-[72px] xl:pl-[228px] pb-20 md:pb-10 min-h-screen">
        {/* TAB 1: HOME FEED (Stories + Vertical Photo Feed) */}
        {activeTab === 'gallery' && (
          <div className="max-w-[560px] mx-auto pt-2 sm:pt-6 space-y-5">
            <StoriesStrip
              artistProfile={artistProfile}
              artworks={feedArtworks}
              onOpenStory={(art, themeId) =>
                setStoryViewerState({ isOpen: true, artwork: art, themeId })
              }
              onOpenStudio={() => setActiveTab('studio')}
              onOpenCatPassport={() => setIsCatPassportOpen(true)}
              onOpenThemeDrawer={() => setIsThemeDrawerOpen(true)}
            />

            <div className="space-y-4 sm:space-y-6">
              {feedArtworks.map((art, index) => {
                const showSponsorAfter = !isPro && (index + 1) % 10 === 0;
                const sponsor =
                  GOURMET_CAT_SPONSORS[Math.floor(index / 10) % GOURMET_CAT_SPONSORS.length] ||
                  GOURMET_CAT_SPONSORS[0];

                return (
                  <React.Fragment key={art.id}>
                    <InstagramFeedPost
                      artwork={art}
                      isLiked={likedIds.has(art.id)}
                      onLike={handleLike}
                      onOpenContextMenu={(a) => setContextMenuArtwork(a)}
                      onOpenZoom={(a) => setZoomArtwork(a)}
                      onOpenGuestbook={(a) => setGuestbookArtwork(a)}
                      onOpenPostcard={(a) => setPostcardArtwork(a)}
                      onOpenFramingModal={(a) => setFramingArtwork(a)}
                      isAudioOpen={audioOpenArtworkId === art.id}
                      onToggleAudio={handleToggleAudioForArtwork}
                    />

                    {/* Subtle Instagram-style Sponsored Post (1 in 10 unless PRO) */}
                    {showSponsorAfter && (
                      <div className="bg-[#090c1a]/85 sm:border sm:border-white/10 sm:rounded-2xl p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={sponsor.imageUrl}
                            alt={sponsor.brandName}
                            className="w-12 h-12 rounded-xl object-cover shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-400">Реклама · Партнёр галереи</p>
                            <p className="text-sm font-semibold text-white truncate">
                              {sponsor.brandName}
                            </p>
                            <p className="text-xs text-slate-300 truncate">{sponsor.slogan}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsProModalOpen(true)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-medium text-amber-300 flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <Crown className="w-3.5 h-3.5" />
                          <span>Убрать</span>
                        </button>
                      </div>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: EXPLORE GRID */}
        {activeTab === 'explore' && (
          <InstagramExploreView
            artworks={feedArtworks}
            activeArtworkId={activeArtworkId}
            onSelectArtwork={(art) => setSelectedPostModalArtwork(art)}
            onOpenContextMenu={(art) => setContextMenuArtwork(art)}
          />
        )}

        {/* TAB 3: CREATE STUDIO */}
        {activeTab === 'studio' && (
          <div className="py-4 sm:py-6">
            <ArtStudioGenerator
              onGenerate={handleGenerateImage}
              isGenerating={isGenerating}
              generationProgress={generationProgress}
              error={error}
              onClearError={() => setError(null)}
              onSelectRandomCurated={handleSelectRandomCurated}
              activeModel={activeModel}
              onModelChange={(m) => setActiveModel(m)}
              isBannedReadOnly={artistProfile.isBannedReadOnly}
              externalPrompt={externalStudioPrompt}
              activeCat={activeCat}
              onOpenCatPassport={() => setIsCatPassportOpen(true)}
            />
          </div>
        )}

        {/* TAB 4: DIRECT P2P NETWORK */}
        {activeTab === 'network' && (
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
            <P2PNetworkHub
              artistProfile={artistProfile}
              myArtworks={artworks}
              onProfileUpdate={(updated) => setArtistProfile(updated)}
              onAddArtworksFromPeer={(newArts) => {
                setArtworks((prev) => {
                  const existing = new Set(prev.map((a) => a.id));
                  const filtered = newArts.filter((a) => !existing.has(a.id));
                  return [...filtered, ...prev];
                });
              }}
              onSelectArtwork={(artwork) => {
                setSelectedPostModalArtwork(artwork);
              }}
              onLikeArtwork={handleLike}
              onPurgeCondemnedArtwork={handlePurgeCondemnedArtwork}
            />
          </div>
        )}

        {/* TAB 5: INSTAGRAM PROFILE (with BIP-39 Vault & System inside Drawer/Subtabs) */}
        {activeTab === 'profiles' && (
          <InstagramProfileView
            currentProfile={artistProfile}
            artworks={artworks}
            isPro={isPro}
            onProfileChanged={(updatedProfile) => {
              setArtistProfile(updatedProfile);
              setProfilesList(getAllProfiles());
              initP2PForProfile(updatedProfile);
            }}
            onSelectArtwork={(art) => setSelectedPostModalArtwork(art)}
            onOpenContextMenu={(art) => setContextMenuArtwork(art)}
            onOpenCatPassport={() => setIsCatPassportOpen(true)}
            onOpenUbuntuModal={() => setIsUbuntuModalOpen(true)}
            onOpenAndroidModal={() => setIsAndroidModalOpen(true)}
            onOpenProModal={() => setIsProModalOpen(true)}
            onOpenThemeDrawer={() => setIsThemeDrawerOpen(true)}
            onOpenCreateStudio={() => setActiveTab('studio')}
            onOpenOnboardingModal={() => setShowOnboardingModal(true)}
          />
        )}

        {/* TAB 6: SYSTEM VIEW (accessible via Menu -> System) */}
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

      {/* Single-Post Modal Lightbox when clicking a tile in Explore or Profile */}
      {selectedPostModalArtwork && (
        <div
          className="fixed inset-0 z-40 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
          onClick={() => setSelectedPostModalArtwork(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[540px] relative my-auto"
          >
            <button
              type="button"
              onClick={() => setSelectedPostModalArtwork(null)}
              className="absolute -top-11 right-0 min-w-[40px] min-h-[40px] rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer z-10"
              aria-label="Закрыть просмотр"
            >
              <X className="w-5 h-5" />
            </button>
            <InstagramFeedPost
              artwork={selectedPostModalArtwork}
              isLiked={likedIds.has(selectedPostModalArtwork.id)}
              onLike={handleLike}
              onOpenContextMenu={(a) => setContextMenuArtwork(a)}
              onOpenZoom={(a) => setZoomArtwork(a)}
              onOpenGuestbook={(a) => setGuestbookArtwork(a)}
              onOpenPostcard={(a) => setPostcardArtwork(a)}
              onOpenFramingModal={(a) => setFramingArtwork(a)}
              isAudioOpen={audioOpenArtworkId === selectedPostModalArtwork.id}
              onToggleAudio={handleToggleAudioForArtwork}
            />
          </div>
        </div>
      )}

      {/* Long-Press & "⋯" Artwork Context Menu Sheet */}
      <ArtworkActionSheet
        artwork={contextMenuArtwork}
        isOpen={!!contextMenuArtwork}
        onClose={() => setContextMenuArtwork(null)}
        onOpenZoom={(art) => setZoomArtwork(art)}
        onOpenEditor={(art) => setEditorArtwork(art)}
        onOpenFramingModal={(art) => setFramingArtwork(art)}
        onOpenPostcard={(art) => setPostcardArtwork(art)}
        onOpenGuestbook={(art) => setGuestbookArtwork(art)}
        onOpenAudioGuide={(art) => {
          setAudioOpenArtworkId(art.id);
          const narrationText = `${art.title}. Стиль: ${art.style}. ${art.description}. Особенность мазка: ${art.brushstrokeNote}`;
          museumAudio.playNeuralNarration(narrationText, art.id);
        }}
        onReportDispute={(art) => setComplaintArtwork(art)}
        onDeletePublication={(art) => setDeletingArtwork(art)}
        canDelete={contextMenuArtwork ? canDeleteArtwork(contextMenuArtwork) : false}
      />

      {/* Fullscreen Story Viewer Modal */}
      <InstagramStoryModal
        isOpen={storyViewerState.isOpen}
        initialArtwork={storyViewerState.artwork}
        initialThemeId={storyViewerState.themeId}
        artworks={feedArtworks}
        onClose={() => setStoryViewerState({ isOpen: false, artwork: null })}
        onOpenZoom={(art) => setZoomArtwork(art)}
        onLike={handleLike}
        onOpenInStudio={() => setActiveTab('studio')}
      />

      {/* Themes & Language Sheet */}
      <ThemeDrawerModal
        isOpen={isThemeDrawerOpen}
        onClose={() => setIsThemeDrawerOpen(false)}
      />

      {/* Onboarding & System Modals */}
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
