import React, { useState } from 'react';
import { AlertTriangle, Download, Trash2, Shield, X, ArrowRight, CheckCircle2 } from 'lucide-react';
import { StoredUserProfile, Artwork } from '../types';
import { exportProfileArchive, deleteProfile } from '../utils/profileManager';

interface ProfileLimitModalProps {
  isOpen: boolean;
  profiles: StoredUserProfile[];
  artworks?: Artwork[];
  onClose: () => void;
  onProfileRemovedAndProceedToOnboarding: () => void;
}

export const ProfileLimitModal: React.FC<ProfileLimitModalProps> = ({
  isOpen,
  profiles,
  artworks = [],
  onClose,
  onProfileRemovedAndProceedToOnboarding,
}) => {
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(profiles[0]?.id || null);
  const [exportedProfileIds, setExportedProfileIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (!isOpen) return null;

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

  const handleExport = (profile: StoredUserProfile) => {
    exportProfileArchive(profile, artworks);
    setExportedProfileIds(prev => new Set([...prev, profile.id]));
  };

  const handleDeleteAndProceed = () => {
    if (!selectedProfileId) return;
    deleteProfile(selectedProfileId);
    onProfileRemovedAndProceedToOnboarding();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="max-w-xl w-full bg-[#0a0f2b] border border-amber-500/50 rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.95)] text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-indigo-900/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-gaudi font-bold text-amber-200">
                Достигнут лимит 3 профилей
              </h2>
              <p className="text-xs text-cyan-200/70 font-cyber">
                На одном устройстве может храниться не более 3 активных кошачьих профилей
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-indigo-900/40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info notice */}
        <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs sm:text-sm text-amber-200/90 leading-relaxed">
          Чтобы создать или восстановить <strong>4-й профиль</strong>, необходимо освободить слот и удалить один из существующих. Рекомендуем сначала экспортировать выбранный профиль в архив на локальный диск — так вы сохраните сид-фразу и авторские картины!
        </div>

        {/* Existing 3 Profiles list */}
        <div className="space-y-3">
          <label className="text-xs font-cyber text-cyan-300 font-bold uppercase tracking-wider">
            Выберите профиль для экспорта и удаления:
          </label>
          <div className="space-y-2">
            {profiles.map((p) => {
              const isSelected = p.id === selectedProfileId;
              const isExported = exportedProfileIds.has(p.id);

              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedProfileId(p.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-900/50 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-indigo-950/30 border-indigo-900/60 hover:border-indigo-700'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${p.avatarColor || 'from-amber-500 to-yellow-600'} flex items-center justify-center font-bold text-slate-950 shrink-0`}>
                      🐱
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-100 truncate">{p.name}</p>
                      <p className="text-[11px] text-cyan-300/60 truncate font-cyber">
                        ID: {p.id.slice(0, 14)}... • {p.hasBip39Wallet ? 'BIP-39 Vault' : 'Локальный'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(p);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ${
                        isExported
                          ? 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                          : 'bg-indigo-900/70 hover:bg-indigo-800 border-indigo-600 text-amber-300'
                      }`}
                      title="Экспорт в .catpack.json архив"
                    >
                      {isExported ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Архив сохранён</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Экспорт в архив</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Profile Action Card */}
        {selectedProfile && (
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-indigo-900/80 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-cyan-300/70">Выбран к удалению:</span>
              <span className="font-bold text-slate-200">{selectedProfile.name}</span>
            </div>

            {!exportedProfileIds.has(selectedProfile.id) && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <span>Профиль ещё не сохранён на диск. Сделайте резервную копию:</span>
                <button
                  type="button"
                  onClick={() => handleExport(selectedProfile)}
                  className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shrink-0"
                >
                  Скачать архив
                </button>
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                type="button"
                onClick={handleDeleteAndProceed}
                className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-950 cursor-pointer transition-all"
              >
                <Trash2 className="w-4 h-4" />
                <span>Удалить слот и начать онбординг</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
