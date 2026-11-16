export type AspectRatioType = '1:1' | '16:9' | '4:3' | '3:4' | '9:16' | '4:1' | '1:4';

export type ImageSizeType = '1K' | '2K' | '4K';

export interface ReferenceCatPhoto {
  id: string;
  dataUrl: string;
  mimeType: string;
  name?: string;
}

export interface ColorSwatch {
  hex: string;
  name: string;
}

export interface Artwork {
  id: string;
  title: string;
  titleEn?: string;
  imageUrl: string;
  prompt: string;
  style: string;
  year: string;
  description: string;
  palette: ColorSwatch[];
  brushstrokeNote: string;
  aspectRatio: AspectRatioType;
  createdAt: number;
  isUserCreated?: boolean;
  modelUsed?: string;
  likes?: number;
  // P2P Fields
  authorId?: string;
  authorName?: string;
  authorSignature?: string;
  originPeerId?: string;
  isBackedUpLocally?: boolean;
  source?: 'masterpiece' | 'my-local' | 'p2p-friend';
  isCondemned?: boolean;
  condemnedReason?: string;
  catProfileId?: string;
}

// Digital Cat Passport & Identity
export interface CatProfile {
  id: string;
  name: string;
  breed: string;
  coatPattern: 'solid-black' | 'tuxedo' | 'ginger-tabby' | 'calico' | 'siamese' | 'white' | 'grey-smoke' | 'other';
  eyeColor: string;
  distinctiveMarks: string; // e.g. "Белая манишка на шее и пятнышко на животике между задними лапами"
  referencePhotoUrl?: string;
  createdAt: number;
  artworksCount: number;
}

// 8 GB Mutual Storage Node Quota
export interface StorageNodeQuota {
  totalCapacityBytes: number; // 8,000,000,000 (8 GB)
  ownReservedBytes: number;    // 1,600,000,000 (1.6 GB)
  friendsReservedBytes: number;// 6,400,000,000 (6.4 GB, 4 x 1.6 GB)
  ownUsedBytes: number;
  friendsUsedBytes: number;
  activeCustodiansCount: number; // target: 4
  wholeFilesCount: number;
}

export interface StylePreset {
  id: string;
  name: string;
  titleEn: string;
  description: string;
  promptModifier: string;
  colors: string[];
  samplePrompt: string;
}

export interface StyleThemeVisuals {
  id: string;
  name: string;
  artist: string;
  titleEn: string;
  bgImageUrl: string;
  bgOverlay: string;
  plateBg: string;
  plateBorder: string;
  plateGlow: string;
  plateRim: string;
  buttonPrimaryBg: string;
  buttonPrimaryBorder: string;
  buttonPrimaryText: string;
  buttonPrimaryGlow: string;
  buttonSecondaryBg: string;
  buttonSecondaryBorder: string;
  buttonSecondaryText: string;
  accentBadgeBg: string;
  accentBadgeBorder: string;
  accentBadgeText: string;
  activeChipBg: string;
  activeChipBorder: string;
  activeChipText: string;
  themeSymbol: string;
  moodDescription: string;
}

export interface GenerateImageRequest {
  prompt: string;
  model?: string;
  aspectRatio?: AspectRatioType;
  imageSize?: ImageSizeType;
  stylePresetId?: string;
  customStyleNote?: string;
  referenceImages?: { dataUrl: string; mimeType?: string }[];
}

export interface EditImageRequest {
  imageBase64: string;
  mimeType: string;
  prompt: string;
  model?: string;
  imageSize?: ImageSizeType;
}

export interface GenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
  promptUsed?: string;
  modelUsed?: string;
  title?: string;
  description?: string;
}

export type ViewMode = 'gallery' | 'studio' | 'editor' | 'canvas' | 'p2p-network';

export type MainAppTab = 'gallery' | 'explore' | 'studio' | 'network' | 'profiles' | 'system';

// P2P Artist Identity & Friendship
export interface ArtistProfile {
  id: string; // Public fingerprint (hex or base64)
  name: string;
  avatarColor: string;
  bio: string;
  createdAt: number;
  totalCreations: number;
  likedArtworkIds: string[];
  isBannedReadOnly?: boolean;
  bannedReason?: string;
}

export interface StoredUserProfile extends ArtistProfile {
  seedPhrase?: string;     // 12-word BIP-39 mnemonic
  pinHash?: string;        // SHA-256 hash of PIN + salt
  pinSalt?: string;        // Random salt
  isCurrent?: boolean;     // Active profile flag
  catPassportId?: string;
  hasBip39Wallet?: boolean;
}

export interface SystemPermissionStatus {
  notifications: 'granted' | 'denied' | 'prompt';
  persistentStorage: 'granted' | 'denied' | 'prompt';
  audio: 'granted' | 'denied' | 'prompt';
  clipboard: 'granted' | 'denied' | 'prompt';
  networkLan: 'granted' | 'denied' | 'prompt';
  completedAt?: number;
}

export interface PeerFriend {
  peerId: string;
  name: string;
  avatarColor: string;
  addedAt: number;
  lastSeenAt: number;
  status: 'online' | 'offline' | 'connecting';
  artworkCount: number;
  sharedStorageBytes: number;
  connectionMethod: 'direct-webrtc' | 'qr-handshake' | 'broadcast-channel';
  isAuditor?: boolean;
  isBannedReadOnly?: boolean;
  latencyMs?: number;
}

export interface SignalingPeer {
  peerId: string;
  name: string;
  avatarColor: string;
  lastHeartbeat: number;
  artworkCount: number;
}

export interface AuditorVote {
  auditorId: string;
  auditorName: string;
  decision: 'confirm' | 'reject';
  weight: number;
  timestamp: number;
  reason?: string;
}

export interface VerificationProposal {
  disputeId: string;
  artworkId: string;
  artworkTitle: string;
  artworkImageUrl: string;
  artworkPrompt: string;
  authorId: string;
  authorName: string;
  reporterPeerId: string;
  reporterName: string;
  complaintReason: string;
  timestamp: number;
  requiredRatio: string; // e.g. "2:1"
}

export interface PeerDispute {
  id: string;
  artworkId: string;
  artworkTitle: string;
  artworkImageUrl: string;
  artworkPrompt: string;
  authorId: string;
  authorName: string;
  reporterPeerId: string;
  reporterName: string;
  complaintReason: string;
  timestamp: number;
  confirmVotes: string[]; // List of auditor peerIds who confirmed the complaint
  rejectVotes: string[];  // List of auditor peerIds who rejected the complaint
  weightedVotes?: AuditorVote[]; // Granular weighted votes record
  confirmWeight?: number;        // Accumulated confirmation weight
  rejectWeight?: number;         // Accumulated rejection weight
  ratio?: number;                // Calculated confirm/reject ratio
  status: 'pending' | 'condemned' | 'acquitted';
  verdictNote?: string;
}

export interface P2PNetworkStats {
  connectedPeersCount: number;
  totalSharedArtworks: number;
  localBackupBytes: number;
  maxStorageBytes: number;
}

// P2P Chat Protocol: E2EE & Store-and-Forward (DTN)
export interface P2PChatMessage {
  id: string;
  envelopeId: string;
  senderPeerId: string;
  senderName: string;
  recipientPeerId: string;
  recipientName: string;
  text: string;
  attachmentArtworkId?: string;
  attachmentArtworkTitle?: string;
  attachmentArtworkUrl?: string;
  timestamp: number;
  status: 'sending' | 'relayed_in_custody' | 'delivered' | 'read';
  deliveryRoute: string[]; // e.g. ['Вы', 'Курьер: Арльский Мурлыка', 'Адресат']
  isE2EE: boolean;
  isRelayedDelivery?: boolean;
}

export interface P2PEncryptedEnvelope {
  envelopeId: string;
  senderPeerId: string;
  senderName: string;
  recipientPeerId: string;
  recipientName: string;
  createdAt: number;
  expiresAt: number; // TTL
  ciphertext: string; // AES-GCM encrypted payload (cannot be read by relay peers)
  iv: string; // Initialization vector (hex)
  salt: string;
  contentHash: string; // Integrity verification
  hops: string[]; // Peer names who relayed the envelope
  isRelayed: boolean;
}

export interface P2PDeliveryAck {
  envelopeId: string;
  recipientPeerId: string;
  deliveredAt: number;
  finalRoute: string[];
}

// 1. Collaborative Canvas (CRDT-style stroke sync & live peer cursors)
export type BrushTextureStyle = 'impasto' | 'starry_swirl' | 'sunflower_dab' | 'palette_knife' | 'almond_branch';

export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface CanvasStroke {
  id: string;
  peerId: string;
  peerName: string;
  peerAvatarColor: string;
  color: string;
  width: number;
  brushStyle: BrushTextureStyle;
  points: StrokePoint[];
  timestamp: number;
}

export interface PeerCanvasCursor {
  peerId: string;
  peerName: string;
  peerAvatarColor: string;
  x: number;
  y: number;
  isDrawing: boolean;
  activeColor: string;
  lastActive: number;
}

export interface CollaborativeSessionState {
  roomId: string;
  roomName: string;
  activePeers: PeerCanvasCursor[];
  strokes: CanvasStroke[];
  lastModified: number;
}

// 2. Swarm Chunking & Merkle Tree Root verification
export interface ArtworkChunk {
  index: number;
  totalChunks: number;
  chunkHash: string; // SHA-256 of chunk data
  data: string;      // Base64 slice of the raw payload
  byteLength: number;
  sourcePeerId?: string;
  sourcePeerName?: string;
  isVerified: boolean;
  status: 'idle' | 'downloading' | 'verified' | 'corrupted';
}

export interface MerkleTreeProof {
  rootHash: string;
  leafHash: string;
  leafIndex: number;
  siblingHashes: string[];
}

export interface SwarmTransferSession {
  id: string;
  artworkId: string;
  artworkTitle: string;
  totalBytes: number;
  chunkSize: number;
  totalChunks: number;
  merkleRoot: string;
  chunks: ArtworkChunk[];
  activePeers: { peerId: string; name: string; speedKbps: number; chunksSeeded: number }[];
  isCompleted: boolean;
  reconstructedImageUrl?: string;
}

export interface P2PFileTransferProgress {
  transferId: string;
  artworkId: string;
  artworkTitle: string;
  direction: 'upload' | 'download';
  peerId: string;
  peerName: string;
  receivedChunks: number;
  totalChunks: number;
  progressPercent: number;
  bytesTransferred: number;
  totalBytes: number;
  speedKbps?: number;
  isComplete: boolean;
  error?: string;
}

// 3. Web of Trust (WoT) & Endorsement Rings
export type TrustTier = 'novice_apprentice' | 'trusted_artist' | 'master_post_impressionist' | 'guild_patriarch';

export interface PeerEndorsement {
  id: string;
  endorserPeerId: string;
  endorserName: string;
  endorserTier: TrustTier;
  subjectPeerId: string;
  subjectPeerName: string;
  trustScoreAssigned: number; // 1 to 5 stars
  statement: string;          // Testimonial / vouched words
  digitalSignature: string;   // Cryptographic signature of payload
  timestamp: number;
  txHash: string;
}

export interface WebOfTrustProfile {
  peerId: string;
  peerName: string;
  publicKeyFingerprint: string;
  tier: TrustTier;
  trustScore: number;         // Aggregate score
  endorsementsReceived: PeerEndorsement[];
  endorsementsGiven: PeerEndorsement[];
  juryWeightBonus: number;     // Extra voting weight granted by WoT
}

// 4. Museum Guestbook & Cat Paw Signatures
export interface GuestbookEntry {
  id: string;
  artworkId: string;
  authorName: string;
  authorPeerId?: string;
  comment: string;
  rating: number; // 1 to 5 paws 🐾
  pawStampColor: 'gold' | 'terracotta' | 'ultramarine' | 'emerald';
  createdAt: number;
  isP2PVerified?: boolean;
}

