// Top 10 World Languages Localization Types for Van Gogh CryptoCats

export type SupportedLanguage = 
  | 'ru' // Русский
  | 'en' // English
  | 'es' // Español
  | 'fr' // Français
  | 'de' // Deutsch
  | 'zh' // 中文 (Chinese)
  | 'ja' // 日本語 (Japanese)
  | 'pt' // Português
  | 'ar' // العربية (Arabic)
  | 'hi'; // हिन्दी (Hindi)

export interface LanguageMeta {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export interface LocalizedMasterpiece {
  title: string;
  style: string;
  year: string;
  description: string;
  brushstrokeNote: string;
  paletteColors: string[];
}

export interface LocalizedStylePreset {
  name: string;
  description: string;
  samplePrompt: string;
}

export interface TranslationDict {
  // App Titles & Brand
  appTitle: string;
  appSubtitle: string;
  aiStudioBadge: string;
  galleryCount: string;
  activeModelLabel: string;
  systemLangAuto: string;

  // Van Gogh Quotes (Navbar & Footer)
  quotes: string[];
  footerQuote: string;
  footerMadeFor: string;

  // Navbar actions
  btnP2PNetwork: string;
  btnP2PNetworkTitle: string;
  btnUbuntuDesktop: string;
  btnUbuntuDesktopTitle: string;
  btnInstallAndroid: string;
  btnInstallAndroidTitle: string;
  statusP2POffline: string;

  // Masterpiece Viewer
  zoomBrushstrokes: string;
  downloadPainting: string;
  downloading: string;
  remixInStudio: string;
  copiedPaletteHex: string;
  copyColorHex: string;
  paletteColorsTitle: string;
  detailsTitle: string;
  masterpieceStyleLabel: string;
  creationTimeLabel: string;
  artisticVisionTitle: string;
  impastoNoteTitle: string;
  promptTitle: string;
  modelUsedTitle: string;
  likesLabel: string;
  disputeReportBtn: string;
  disputeReportBtnTitle: string;
  disputeCondemnedBadge: string;
  authorLocalBadge: string;
  peerBackupBadge: string;

  // Art Studio Generator
  studioBadge: string;
  studioTitle: string;
  studioSubtitle: string;
  promptLabel: string;
  promptPlaceholder: string;
  randomCuratedBtn: string;
  chooseStyleLabel: string;
  chooseRatioLabel: string;
  ratioSquare: string;
  ratioLandscape: string;
  ratioClassic: string;
  ratioPortrait: string;
  ratioStory: string;
  generateBtn: string;
  generatingBtn: string;
  quickPromptsTitle: string;
  quickPrompts: string[];
  modelSelectTitle: string;
  modelRecommendedBadge: string;
  modelHdBadge: string;
  modelSpeedBadge: string;
  modelDescRecommended: string;
  modelDescHd: string;
  modelDescSpeed: string;
  bannedReadOnlyAlert: string;
  catSanctityError: string;
  studioTip: string;
  errorGenerate: string;
  errorGeminiConnection: string;

  // Gallery Grid
  expoMuseumTitle: string;
  galleryMainTitle: string;
  gallerySubtitle: string;
  filterAll: string;
  filterRestorations: string;
  artworksFound: string;
  clickToInspectHint: string;
  likesCountSuffix: string;
  userCreatedBadge: string;
  p2pBackedBadge: string;
  likeArtworkTooltip: string;

  // Brushstroke Zoom Modal
  zoomModalHeader: string;
  zoomModalSub: string;
  zoomModalDownload: string;
  zoomModalDownloading: string;
  zoomModalZoomIn: string;
  zoomModalZoomOut: string;
  zoomModalHint: string;
  impastoTechniqueTitle: string;
  impastoTechniqueDesc: string;
  colorContrastTitle: string;

  // Image Editor Modal
  editorModalHeader: string;
  editorModalSub: string;
  editorSourceCanvas: string;
  editorUploadBtn: string;
  editorPromptLabel: string;
  editorPromptPlaceholder: string;
  editorIdeasTitle: string;
  editorIdeas: string[];
  editorApplyBtn: string;
  editorApplyingBtn: string;
  editorBannedAlert: string;
  editorTip: string;
  editorError: string;

  // File Complaint Modal
  complaintModalTitle: string;
  complaintAuthor: string;
  complaintUnknownAuthor: string;
  complaintProtectionTitle: string;
  complaintProtectionDesc: string;
  complaintReasonLabel: string;
  complaintCommonReasons: string[];
  complaintCustomReasonLabel: string;
  complaintCustomReasonPlaceholder: string;
  complaintCancelBtn: string;
  complaintSubmitBtn: string;
  complaintAlertSuccess: string;

  // Android Banner & Modal
  androidBannerTitle: string;
  androidBannerQuickInstall: string;
  androidBannerGuide: string;
  androidBannerInstallBtn: string;
  androidBannerHide: string;
  androidModalTitle: string;
  androidModalSubtitle: string;
  androidTabPwa: string;
  androidTabManual: string;
  androidInstallBtn: string;
  androidStatusRequesting: string;
  androidStatusSuccess: string;
  androidStatusCancelled: string;
  androidStatusManual: string;
  androidStep1Title: string;
  androidStep1Desc: string;
  androidStep2Title: string;
  androidStep2Desc: string;
  androidStep3Title: string;
  androidStep3Desc: string;
  androidCopyLinkBtn: string;
  androidCopiedLink: string;
  androidShareBtn: string;
  androidOpenExternalBtn: string;
  androidFeaturesTitle: string;
  androidFeatures: string[];

  // Ubuntu Desktop Modal
  ubuntuModalTitle: string;
  ubuntuModalSubtitle: string;
  ubuntuTabTerminal: string;
  ubuntuTabPwa: string;
  ubuntuTabDesktop: string;
  ubuntuTabManual: string;
  ubuntuOneClickTitle: string;
  ubuntuOneClickDesc: string;
  ubuntuCopyCmd: string;
  ubuntuCopied: string;
  ubuntuDownloadDesktop: string;
  ubuntuDownloadIcon: string;
  ubuntuDesktopHelp: string;
  ubuntuCloseBtn: string;

  // P2P Network Hub
  p2pHubTitle: string;
  p2pHubSubtitle: string;
  p2pTabNetwork: string;
  p2pTabFriends: string;
  p2pTabChat: string;
  p2pTabCollab: string;
  p2pTabSwarm: string;
  p2pTabWot: string;
  p2pTabStorage: string;
  p2pTabDisputes: string;
  p2pTabCatGuardian: string;
  p2pLocalProfileTitle: string;
  p2pDefaultArtistName: string;
  p2pDefaultArtistBio: string;
  p2pStatsCreations: string;
  p2pStatsLiked: string;
  p2pNetworkStatusActive: string;
  p2pInviteCodeTitle: string;
  p2pCopyInvite: string;
  p2pCopiedInvite: string;
  p2pAddFriendLabel: string;
  p2pAddFriendPlaceholder: string;
  p2pConnectFriendBtn: string;
  p2pStorageTitle: string;
  p2pStorageUsed: string;
  p2pStorageDesc: string;
  p2pExportPack: string;
  p2pImportPack: string;
  p2pDisputesTitle: string;
  p2pDisputesQuorumNote: string;
  p2pVoteGuilty: string;
  p2pVoteInnocent: string;
  p2pNoActiveDisputes: string;

  // Masterpieces local translations map
  masterpieces: Record<string, LocalizedMasterpiece>;

  // Style Presets local translations map
  presets: Record<string, LocalizedStylePreset>;

  // Common UI
  close: string;
  cancel: string;
  save: string;
  copy: string;
  copied: string;
  share: string;
  like: string;
  report: string;
}
