import React, { useState, useEffect } from 'react';
import { 
  Award, 
  ShieldCheck, 
  CheckCircle2, 
  KeyRound, 
  Star, 
  Users, 
  Plus, 
  ExternalLink, 
  Feather, 
  Sparkles,
  Gavel
} from 'lucide-react';
import { ArtistProfile, WebOfTrustProfile, PeerEndorsement, TrustTier, PeerFriend } from '../types';
import { getLocalWoTProfile, createPeerEndorsement, calculateTrustTier, calculateWoTJuryBonus } from '../utils/p2pWebOfTrust';

interface P2PWebOfTrustViewProps {
  artistProfile: ArtistProfile;
  friends: PeerFriend[];
}

export const P2PWebOfTrustView: React.FC<P2PWebOfTrustViewProps> = ({
  artistProfile,
  friends,
}) => {
  const [wotProfile, setWotProfile] = useState<WebOfTrustProfile>(() => getLocalWoTProfile(artistProfile));
  const [isEndorsingOpen, setIsEndorsingOpen] = useState<boolean>(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string>(friends[0]?.peerId || '');
  const [assignedStars, setAssignedStars] = useState<number>(5);
  const [statementText, setStatementText] = useState<string>('');
  const [endorsingSuccess, setEndorsingSuccess] = useState<string | null>(null);

  useEffect(() => {
    setWotProfile(getLocalWoTProfile(artistProfile));
  }, [artistProfile]);

  const handleEndorseFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetFriend = friends.find((f) => f.peerId === selectedFriendId) || friends[0];
    if (!targetFriend || !statementText.trim()) return;

    await createPeerEndorsement(
      artistProfile,
      wotProfile.tier,
      targetFriend.peerId,
      targetFriend.name,
      assignedStars,
      statementText.trim()
    );

    // Refresh profile
    setWotProfile(getLocalWoTProfile(artistProfile));
    setEndorsingSuccess(`Ключ мастера «${targetFriend.name}» успешно подписан вашим криптографическим сертификатом!`);
    setStatementText('');
    setIsEndorsingOpen(false);
    setTimeout(() => setEndorsingSuccess(null), 4000);
  };

  const getTierBadge = (tier: TrustTier) => {
    switch (tier) {
      case 'guild_patriarch':
        return { label: 'Патриарх Артели', color: 'from-amber-400 to-yellow-600 text-amber-950', icon: Award };
      case 'master_post_impressionist':
        return { label: 'Мастер Постимпрессионизма', color: 'from-purple-600 to-indigo-700 text-purple-100', icon: Sparkles };
      case 'trusted_artist':
        return { label: 'Признанный Мастер', color: 'from-blue-600 to-cyan-700 text-blue-100', icon: ShieldCheck };
      case 'novice_apprentice':
      default:
        return { label: 'Начинающий Подмастерье', color: 'from-zinc-700 to-zinc-900 text-zinc-300', icon: Feather };
    }
  };

  const badge = getTierBadge(wotProfile.tier);
  const BadgeIcon = badge.icon;

  return (
    <div className="bg-amber-950/40 border border-amber-800/40 rounded-2xl p-4 sm:p-6 backdrop-blur-md shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-amber-800/30 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Award className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-serif font-bold text-amber-100">
              Web-of-Trust (Кольца Доверия и Репутационные Сертификаты)
            </h3>
          </div>
          <p className="text-sm text-amber-300/80 mt-1">
            Взаимная подпись открытых ключей художников цифровыми сертификатами, повышающая вес голоса в суде аудиторов
          </p>
        </div>

        <button
          onClick={() => setIsEndorsingOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Подписать ключ друга</span>
        </button>
      </div>

      {endorsingSuccess && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{endorsingSuccess}</span>
        </div>
      )}

      {/* Artist Trust Profile Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Tier & Rank */}
        <div className="p-4 rounded-xl bg-black/40 border border-amber-800/30 space-y-3">
          <div className="text-xs text-amber-300/70 font-medium">Ваш ранг в Сети Доверия:</div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r ${badge.color} font-bold text-xs shadow-md`}>
            <BadgeIcon className="w-4 h-4" />
            <span>{badge.label}</span>
          </div>

          <div className="text-xs text-amber-200/80 pt-1">
            Рейтинг доверия гильдии: <span className="font-bold text-yellow-400">{wotProfile.trustScore} / 5.0</span>
          </div>
        </div>

        {/* Public Key Fingerprint */}
        <div className="p-4 rounded-xl bg-black/40 border border-amber-800/30 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-amber-300/70 font-medium">
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Отпечаток открытого ключа (Ed25519):</span>
          </div>
          <div className="font-mono text-xs text-amber-200 bg-black/60 p-2 rounded-lg border border-amber-900/40 break-all select-all">
            {wotProfile.publicKeyFingerprint}
          </div>
          <div className="text-[11px] text-amber-400/60">
            Подтверждено Web Crypto API на вашем устройстве
          </div>
        </div>

        {/* Jury Voting Weight Bonus */}
        <div className="p-4 rounded-xl bg-black/40 border border-amber-800/30 space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-amber-300/70 font-medium">
            <Gavel className="w-3.5 h-3.5 text-yellow-400" />
            <span>Бонус в Коллегии Аудиторов:</span>
          </div>
          <div className="text-2xl font-serif font-bold text-yellow-300">
            +{wotProfile.juryWeightBonus} <span className="text-sm font-sans font-normal text-amber-200">голоса</span>
          </div>
          <div className="text-[11px] text-amber-300/70">
            Ваши решения по жалобам имеют повышенный авторитет благодаря подписям мастеров.
          </div>
        </div>
      </div>

      {/* Received Endorsements List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-amber-300/80 px-1 font-medium">
          <span>Сертификаты доверия, выданные вашему холсту ({wotProfile.endorsementsReceived.length}):</span>
          <span className="text-amber-400">Криптографически заверено</span>
        </div>

        <div className="space-y-3">
          {wotProfile.endorsementsReceived.map((endorsement) => (
            <div
              key={endorsement.id}
              className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/30 space-y-2 hover:border-amber-700/50 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-amber-100">{endorsement.endorserName}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-900/40 border border-purple-500/40 text-purple-300">
                    {endorsement.endorserTier === 'guild_patriarch' ? 'Патриарх' : 'Мастер'}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {[...Array(endorsement.trustScoreAssigned)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
              </div>

              <p className="text-xs text-amber-200/90 italic font-serif bg-black/20 p-2.5 rounded-lg border border-amber-900/20">
                «{endorsement.statement}»
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-amber-400/60 pt-1">
                <span>Подпись: {endorsement.digitalSignature}</span>
                <span>Транзакция: {endorsement.txHash}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Endorse a friend modal */}
      {isEndorsingOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1a0f07] border border-amber-700/60 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-amber-800/40 pb-3">
              <div className="flex items-center gap-2 text-amber-100 font-serif font-bold text-lg">
                <KeyRound className="w-5 h-5 text-purple-400" />
                <span>Выдать Сертификат Доверия другу</span>
              </div>
              <button
                onClick={() => setIsEndorsingOpen(false)}
                className="text-amber-400 hover:text-amber-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEndorseFriend} className="space-y-4">
              <div>
                <label className="block text-xs text-amber-300/80 mb-1 font-medium">
                  Выберите мастера из ваших друзей:
                </label>
                <select
                  value={selectedFriendId}
                  onChange={(e) => setSelectedFriendId(e.target.value)}
                  className="w-full bg-black/50 border border-amber-700/60 rounded-xl px-3 py-2 text-xs text-amber-100 font-medium focus:ring-1 focus:ring-purple-400"
                >
                  {friends.map((f) => (
                    <option key={f.peerId} value={f.peerId}>
                      {f.name} ({f.peerId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-amber-300/80 mb-1 font-medium">
                  Оценка подлинности таланта (звёзды):
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAssignedStars(s)}
                      className="p-1 focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 transition-transform hover:scale-110 ${
                          s <= assignedStars ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-amber-200 ml-2">{assignedStars} из 5</span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-amber-300/80 mb-1 font-medium">
                  Свидетельство мастера (отзыв в сети доверия):
                </label>
                <textarea
                  required
                  rows={3}
                  value={statementText}
                  onChange={(e) => setStatementText(e.target.value)}
                  placeholder="Опишите, почему вы доверяете стилю и кошачьей подлинности этого художника..."
                  className="w-full bg-black/50 border border-amber-700/60 rounded-xl p-3 text-xs text-amber-100 focus:ring-1 focus:ring-purple-400 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEndorsingOpen(false)}
                  className="px-4 py-2 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 text-amber-200 text-xs"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                >
                  Подписать открытый ключ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
