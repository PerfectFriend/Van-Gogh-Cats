// Peer Jury Dispute Protocol: Weighted Voting System for Auditors with 2:1 Quorum and Network-Wide Condemnation Broadcast
import { PeerDispute, Artwork, ArtistProfile, AuditorVote, VerificationProposal, PeerFriend } from '../types';
import { purgeCondemnedArtworkFromStorage } from './p2pStorage';
import { setArtistReadOnlyBan } from './p2pCrypto';
import { p2pNetwork } from './p2pNetwork';

const DISPUTES_STORAGE_KEY = 'vangogh_peer_disputes';
const BANNED_PEERS_STORAGE_KEY = 'vangogh_banned_peers_registry';

export interface BannedPeerRecord {
  peerId: string;
  isBannedReadOnly: boolean;
  reason: string;
  bannedAt: number;
}

// Initial demo disputes showcasing the weighted voting mechanism
const INITIAL_DEMO_DISPUTES: PeerDispute[] = [
  {
    id: 'dispute_dog_intrusion_01',
    artworkId: 'suspect_dog_painting_1',
    artworkTitle: 'Подозрительный зверь у кипариса',
    artworkImageUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
    artworkPrompt: 'Золотистый ретривер в вихре ночного арльского неба с кипарисами',
    authorId: 'peer_intruder_dog_fan',
    authorName: 'Тайный Собачник',
    reporterPeerId: 'peer_theo_vangogh',
    reporterName: 'Тео Ван Гог (Парижский салон)',
    complaintReason: 'Грубейшее нарушение кодекса «Только Коты»: на холсте изображён золотистый ретривер вместо кота!',
    timestamp: Date.now() - 3600000 * 3,
    confirmVotes: ['peer_theo_vangogh', 'peer_arles_cat'],
    rejectVotes: ['peer_intruder_dog_fan'],
    weightedVotes: [
      {
        auditorId: 'peer_theo_vangogh',
        auditorName: 'Тео Ван Гог (Парижский салон)',
        decision: 'confirm',
        weight: 3, // Certified Senior Auditor
        timestamp: Date.now() - 3600000 * 3,
        reason: 'Экспертная оценка: на холсте не кошачьи уши и морда собаки.',
      },
      {
        auditorId: 'peer_arles_cat',
        auditorName: 'Арльский Мурлыка',
        decision: 'confirm',
        weight: 2, // Certified Auditor
        timestamp: Date.now() - 3600000 * 2,
        reason: 'Кошачья святыня осквернена собачьим присутствием.',
      },
      {
        auditorId: 'peer_intruder_dog_fan',
        auditorName: 'Тайный Собачник',
        decision: 'reject',
        weight: 1, // Standard Peer
        timestamp: Date.now() - 3600000 * 1,
        reason: 'Это кот породы лабрадор-мяу!',
      },
    ],
    confirmWeight: 5,
    rejectWeight: 1,
    ratio: 5.0,
    status: 'pending',
  },
];

// Calculate voting weight for an auditor based on their credentials and status
export function calculateAuditorWeight(
  profileOrFriend: { id?: string; peerId?: string; isAuditor?: boolean; totalCreations?: number; createdAt?: number }
): number {
  let weight = 1; // Base weight for any peer

  // Certified community auditor has bonus weight
  if (profileOrFriend.isAuditor) {
    weight += 2;
  }

  // Active seasoned artist with 3+ creations gains seniority weight
  if (profileOrFriend.totalCreations && profileOrFriend.totalCreations >= 3) {
    weight += 1;
  }

  // Web-of-Trust (WoT) reputation bonus from cryptographic endorsements
  const peerId = profileOrFriend.id || profileOrFriend.peerId;
  if (peerId && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('vangogh_peer_endorsements');
      if (raw) {
        const endorsements = JSON.parse(raw);
        const count = endorsements.filter((e: any) => e.subjectPeerId === peerId || (peerId === 'local_painter' && e.subjectPeerId === 'local_painter')).length;
        if (count >= 7) weight += 3; // Guild Patriarch
        else if (count >= 4) weight += 2; // Master
        else if (count >= 2) weight += 1; // Trusted
      }
    } catch {}
  }

  return weight;
}

export function getPeerDisputes(): PeerDispute[] {
  const saved = localStorage.getItem(DISPUTES_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return INITIAL_DEMO_DISPUTES;
    }
  }
  localStorage.setItem(DISPUTES_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_DISPUTES));
  return INITIAL_DEMO_DISPUTES;
}

export function savePeerDisputes(disputes: PeerDispute[]): void {
  localStorage.setItem(DISPUTES_STORAGE_KEY, JSON.stringify(disputes));
}

// Banned peers registry in persistent storage
export function getBannedPeersRegistry(): Record<string, BannedPeerRecord> {
  const saved = localStorage.getItem(BANNED_PEERS_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return {};
    }
  }
  return {};
}

export function saveBannedPeerRecord(record: BannedPeerRecord): void {
  const registry = getBannedPeersRegistry();
  registry[record.peerId] = record;
  localStorage.setItem(BANNED_PEERS_STORAGE_KEY, JSON.stringify(registry));
}

// Update the isBannedReadOnly flag for the offending user in their profile & network records
export function updateOffendingUserReadOnlyStatus(
  authorId: string,
  authorName: string,
  reason: string,
  currentProfile?: ArtistProfile
): void {
  // 1. Record in persistent blacklist registry
  saveBannedPeerRecord({
    peerId: authorId,
    isBannedReadOnly: true,
    reason,
    bannedAt: Date.now(),
  });

  // 2. If offending user is the current local profile, lock it permanently
  if (currentProfile && (currentProfile.id === authorId || authorId === 'my-local' || authorId === 'anonymous_author')) {
    setArtistReadOnlyBan(reason);
  } else {
    // Check if stored local profile matches authorId
    const stored = localStorage.getItem('vangogh_artist_profile');
    if (stored) {
      try {
        const localProf: ArtistProfile = JSON.parse(stored);
        if (localProf.id === authorId) {
          localProf.isBannedReadOnly = true;
          localProf.bannedReason = reason;
          localStorage.setItem('vangogh_artist_profile', JSON.stringify(localProf));
        }
      } catch (e) {
        console.error('Error updating local profile ban status:', e);
      }
    }
  }

  // 3. Update friends list if offending user is listed as a peer friend
  const savedFriends = localStorage.getItem('vangogh_p2p_friends');
  if (savedFriends) {
    try {
      const friends: PeerFriend[] = JSON.parse(savedFriends);
      let updated = false;
      const modifiedFriends = friends.map(f => {
        if (f.peerId === authorId) {
          updated = true;
          return { ...f, isBannedReadOnly: true };
        }
        return f;
      });
      if (updated) {
        localStorage.setItem('vangogh_p2p_friends', JSON.stringify(modifiedFriends));
      }
    } catch (e) {
      console.error('Error updating peer friends ban status:', e);
    }
  }
}

// Broadcast the 'condemned' status across the peer network
export function broadcastCondemnedStatus(
  dispute: PeerDispute,
  verdictNote: string,
  broadcaster: ArtistProfile
): void {
  const payload = {
    artworkId: dispute.artworkId,
    artworkTitle: dispute.artworkTitle,
    authorId: dispute.authorId,
    authorName: dispute.authorName,
    disputeId: dispute.id,
    verdictNote,
    timestamp: Date.now(),
  };

  // 1. Broadcast via P2P network manager (BroadcastChannel & WebRTC)
  p2pNetwork.broadcastMessage({
    type: 'CONDEMNED_BROADCAST',
    senderProfile: broadcaster,
    payload,
    timestamp: Date.now(),
  });

  // 2. Dispatch custom DOM event for active UI components
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('p2p:artwork_condemned', {
        detail: payload,
      })
    );
  }
}

// Trigger a verification proposal for connected peers when a complaint is filed
export function triggerVerificationProposal(
  dispute: PeerDispute,
  reporter: ArtistProfile
): void {
  const proposal: VerificationProposal = {
    disputeId: dispute.id,
    artworkId: dispute.artworkId,
    artworkTitle: dispute.artworkTitle,
    artworkImageUrl: dispute.artworkImageUrl,
    artworkPrompt: dispute.artworkPrompt,
    authorId: dispute.authorId,
    authorName: dispute.authorName,
    reporterPeerId: reporter.id,
    reporterName: reporter.name,
    complaintReason: dispute.complaintReason,
    timestamp: dispute.timestamp,
    requiredRatio: '2:1',
  };

  // 1. Broadcast proposal across the peer network
  p2pNetwork.broadcastMessage({
    type: 'VERIFICATION_PROPOSAL',
    senderProfile: reporter,
    payload: proposal,
    timestamp: Date.now(),
  });

  // 2. Dispatch DOM event for notification banners / modal toasts
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('p2p:verification_proposal', {
        detail: proposal,
      })
    );
  }
}

// File a new complaint by a peer against an artwork
export function filePeerComplaint(
  artwork: Artwork,
  reporter: ArtistProfile,
  reason: string
): PeerDispute {
  const disputes = getPeerDisputes();

  // Prevent duplicate open disputes for same artwork
  const existing = disputes.find(d => d.artworkId === artwork.id && d.status === 'pending');
  if (existing) {
    return existing;
  }

  const reporterWeight = calculateAuditorWeight(reporter);
  const initialWeightedVote: AuditorVote = {
    auditorId: reporter.id,
    auditorName: reporter.name,
    decision: 'confirm',
    weight: reporterWeight,
    timestamp: Date.now(),
    reason: reason.trim(),
  };

  const newDispute: PeerDispute = {
    id: 'dispute_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    artworkId: artwork.id,
    artworkTitle: artwork.title,
    artworkImageUrl: artwork.imageUrl,
    artworkPrompt: artwork.prompt,
    authorId: artwork.authorId || 'anonymous_author',
    authorName: artwork.authorName || 'Неизвестный автор',
    reporterPeerId: reporter.id,
    reporterName: reporter.name,
    complaintReason: reason.trim(),
    timestamp: Date.now(),
    confirmVotes: [reporter.id],
    rejectVotes: [],
    weightedVotes: [initialWeightedVote],
    confirmWeight: reporterWeight,
    rejectWeight: 0,
    ratio: reporterWeight,
    status: 'pending',
  };

  const updated = [newDispute, ...disputes];
  savePeerDisputes(updated);

  // Trigger proposal for connected peers to verify
  triggerVerificationProposal(newDispute, reporter);

  return newDispute;
}

export interface VoteResult {
  dispute: PeerDispute;
  actionTaken: 'voted' | 'condemned' | 'acquitted' | 'already_voted';
  message: string;
  ratio: number;
}

// Logic to calculate if a complaint receives a 2:1 ratio of confirmation to rejection
export function calculateRatioMetrics(weightedVotes: AuditorVote[]): {
  confirmWeight: number;
  rejectWeight: number;
  confirmCount: number;
  rejectCount: number;
  ratio: number;
  is2To1Condemned: boolean;
  is2To1Acquitted: boolean;
} {
  const confirmVotes = weightedVotes.filter(v => v.decision === 'confirm');
  const rejectVotes = weightedVotes.filter(v => v.decision === 'reject');

  const confirmWeight = confirmVotes.reduce((sum, v) => sum + v.weight, 0);
  const rejectWeight = rejectVotes.reduce((sum, v) => sum + v.weight, 0);

  const confirmCount = confirmVotes.length;
  const rejectCount = rejectVotes.length;

  const ratio = rejectWeight === 0 ? confirmWeight : Number((confirmWeight / rejectWeight).toFixed(2));

  // Condition for condemnation:
  // Requires at least 2 distinct confirm votes AND confirmation weight must be at least 2x rejection weight
  const is2To1Condemned =
    confirmCount >= 2 &&
    (rejectWeight === 0 ? confirmWeight >= 3 : confirmWeight >= rejectWeight * 2);

  // Condition for acquittal (false complaint dismissed):
  // Rejection weight is at least 2x confirmation weight with at least 2 reject votes
  const is2To1Acquitted =
    rejectCount >= 2 &&
    (confirmWeight === 0 ? rejectWeight >= 3 : rejectWeight >= confirmWeight * 2);

  return {
    confirmWeight,
    rejectWeight,
    confirmCount,
    rejectCount,
    ratio,
    is2To1Condemned,
    is2To1Acquitted,
  };
}

// Auditor casts vote: confirm complaint (guilty) or reject complaint (false alarm/vandalism)
export async function castAuditorVote(
  disputeId: string,
  auditorId: string,
  vote: 'confirm' | 'reject',
  myProfile: ArtistProfile,
  voteReason?: string
): Promise<VoteResult> {
  const disputes = getPeerDisputes();
  const index = disputes.findIndex(d => d.id === disputeId);
  if (index === -1) {
    throw new Error('Дело не найдено в реестре аудита');
  }

  const dispute = { ...disputes[index] };

  if (dispute.status !== 'pending') {
    return {
      dispute,
      actionTaken: 'already_voted',
      message: `Дело уже закрыто вердиктом: ${dispute.status === 'condemned' ? 'Осуждено' : 'Оправдано'}.`,
      ratio: dispute.ratio || 0,
    };
  }

  // Check if auditor has already voted
  const existingVotes = dispute.weightedVotes || [];
  if (existingVotes.some(v => v.auditorId === auditorId) || dispute.confirmVotes.includes(auditorId) || dispute.rejectVotes.includes(auditorId)) {
    return {
      dispute,
      actionTaken: 'already_voted',
      message: 'Вы уже отдали свой голос аудитора по данному предложению о верификации.',
      ratio: dispute.ratio || 0,
    };
  }

  // Calculate auditor weight
  const weight = calculateAuditorWeight(myProfile);

  const newVote: AuditorVote = {
    auditorId,
    auditorName: myProfile.name,
    decision: vote,
    weight,
    timestamp: Date.now(),
    reason: voteReason || (vote === 'confirm' ? 'Подтверждаю нарушение' : 'Жалоба необоснованна'),
  };

  const updatedVotes = [...existingVotes, newVote];
  dispute.weightedVotes = updatedVotes;

  if (vote === 'confirm') {
    dispute.confirmVotes = [...dispute.confirmVotes, auditorId];
  } else {
    dispute.rejectVotes = [...dispute.rejectVotes, auditorId];
  }

  // Calculate if complaint receives a 2:1 ratio
  const metrics = calculateRatioMetrics(updatedVotes);
  dispute.confirmWeight = metrics.confirmWeight;
  dispute.rejectWeight = metrics.rejectWeight;
  dispute.ratio = metrics.ratio;

  // Broadcast the vote cast to peers
  p2pNetwork.broadcastMessage({
    type: 'AUDITOR_VOTE_CAST',
    senderProfile: myProfile,
    payload: {
      disputeId: dispute.id,
      vote: newVote,
      metrics,
    },
    timestamp: Date.now(),
  });

  // Case 1: Condemned - 2:1 ratio reached
  if (metrics.is2To1Condemned) {
    dispute.status = 'condemned';
    dispute.verdictNote = `Вердикт аудиторов: Вина подтверждена (Взвешенный кворум: ${metrics.confirmWeight} подтвердили / ${metrics.rejectWeight} отвергли, соотношение ${metrics.ratio}:1 ≥ 2:1). Картина признана опасной и удалена из всех бэкапов друзей. Автор ${dispute.authorName} переведён в режим ТОЛЬКО ЧТЕНИЕ навсегда.`;

    // 1. Purge from local IndexedDB and friend backups
    await purgeCondemnedArtworkFromStorage(dispute.artworkId);

    // 2. Update the isBannedReadOnly flag for the offending user in their profile
    updateOffendingUserReadOnlyStatus(
      dispute.authorId,
      dispute.authorName,
      dispute.verdictNote,
      myProfile
    );

    // 3. Broadcast the 'condemned' status across the peer network
    broadcastCondemnedStatus(dispute, dispute.verdictNote, myProfile);

    disputes[index] = dispute;
    savePeerDisputes(disputes);

    return {
      dispute,
      actionTaken: 'condemned',
      message: dispute.verdictNote,
      ratio: metrics.ratio,
    };
  }

  // Case 2: Acquitted - Rejection ratio reached (protection against malicious/frivolous complaints)
  if (metrics.is2To1Acquitted) {
    dispute.status = 'acquitted';
    dispute.verdictNote = `Жалоба отклонена коллегией аудиторов (Взвешенный кворум: ${metrics.rejectWeight} отклонили / ${metrics.confirmWeight} за). Донос признан ложным/вредительским. Картина защищена и остаётся в сети.`;

    disputes[index] = dispute;
    savePeerDisputes(disputes);

    return {
      dispute,
      actionTaken: 'acquitted',
      message: dispute.verdictNote,
      ratio: metrics.ratio,
    };
  }

  // Case 3: Remains pending
  disputes[index] = dispute;
  savePeerDisputes(disputes);

  return {
    dispute,
    actionTaken: 'voted',
    message: `Ваш взвешенный голос (вес: ${weight}) учтён. Текущее соотношение весов: ${metrics.confirmWeight} ЗА / ${metrics.rejectWeight} ПРОТИВ (соотношение: ${metrics.ratio}:1). Требуется соотношение 2:1 для закрытия вердикта.`,
    ratio: metrics.ratio,
  };
}

// Global network listener to handle incoming broadcast events (e.g. CONDEMNED_BROADCAST)
if (typeof window !== 'undefined') {
  p2pNetwork.onMessage(async (msg) => {
    if (msg.type === 'CONDEMNED_BROADCAST' && msg.payload?.artworkId) {
      // Automatic network-wide purge
      await purgeCondemnedArtworkFromStorage(msg.payload.artworkId);
      
      // Update local storage dispute record
      const disputes = getPeerDisputes();
      const match = disputes.find(d => d.artworkId === msg.payload.artworkId);
      if (match) {
        match.status = 'condemned';
        match.verdictNote = msg.payload.verdictNote || 'Осуждено сетью пиров.';
        savePeerDisputes(disputes);
      }

      // Check if current local user is the condemned author
      const localProfileStr = localStorage.getItem('vangogh_artist_profile');
      if (localProfileStr) {
        try {
          const profile: ArtistProfile = JSON.parse(localProfileStr);
          if (profile.id === msg.payload.authorId) {
            setArtistReadOnlyBan(msg.payload.verdictNote || 'Ваш профиль переведён в режим ТОЛЬКО ЧТЕНИЕ решением пиров.');
          }
        } catch {}
      }
    }
  });
}
