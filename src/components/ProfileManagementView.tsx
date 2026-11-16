import React, { useState } from 'react';
import { User, Shield, Key, Lock, Download, Trash2, PlusCircle, CheckCircle2, Eye, EyeOff, AlertTriangle, Sparkles, Copy, Award, Smartphone } from 'lucide-react';
import { StoredUserProfile, Artwork } from '../types';
import {
  getAllProfiles,
  getActiveProfile,
  setActiveProfileId,
  deleteProfile,
  exportProfileArchive,
  verifyProfilePin,
  updateProfile,
} from '../utils/profileManager';
import { ProfileLimitModal } from './ProfileLimitModal';
import { OnboardingModal } from './OnboardingModal';

interface ProfileManagementViewProps {
  currentProfile: StoredUserProfile;
  artworks: Artwork[];
  onProfileChanged: (profile: StoredUserProfile) => void;
  onOpenCatPassport: () => void;
}

export const ProfileManagementView: React.FC<ProfileManagementViewProps> = ({
  currentProfile,
  artworks,
  onProfileChanged,
  onOpenCatPassport,
}) => {
  const [profiles, setProfiles] = useState<StoredUserProfile[]>(getAllProfiles());
  const [showSeedPinModal, setShowSeedPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isSeedRevealed, setIsSeedRevealed] = useState(false);
  const [copiedSeed, setCopiedSeed] = useState(false);

  // Modals for adding profile
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState<'create' | 'restore'>('create');
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Profile switch pin check
  const [switchingToProfile, setSwitchingToProfile] = useState<StoredUserProfile | null>(null);
  const [switchPin, setSwitchPin] = useState('');
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Notice
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const refreshProfiles = () => {
    const list = getAllProfiles();
    setProfiles(list);
    const active = getActiveProfile();
    if (active) onProfileChanged(active);
  };

  const handleRevealSeedWithPin = async () => {
    if (currentProfile.pinHash) {
      const valid = await verifyProfilePin(currentProfile, enteredPin);
      if (!valid) {
        setPinError('Неверный PIN-код');
        return;
      }
    }
    setPinError(null);
    setShowSeedPinModal(false);
    setIsSeedRevealed(true);
    setEnteredPin('');
  };

  const handleCopySeed = () => {
    if (currentProfile.seedPhrase && navigator.clipboard) {
      navigator.clipboard.writeText(currentProfile.seedPhrase);
      setCopiedSeed(true);
      setTimeout(() => setCopiedSeed(false), 3000);
    }
  };

  const handleExport = (profile: StoredUserProfile) => {
    exportProfileArchive(profile, artworks);
    setFeedbackNotice(`Архив профиля «${profile.name}» успешно скачан на ваш диск`);
    setTimeout(() => setFeedbackNotice(null), 5000);
  };

  const handlePromptAddProfile = (mode: 'create' | 'restore') => {
    if (profiles.length >= 3) {
      setShowLimitModal(true);
    } else {
      setOnboardingMode(mode);
      setShowOnboarding(true);
    }
  };

  const handleSwitchProfile = async (target: StoredUserProfile) => {
    if (target.id === currentProfile.id) return;
    if (target.pinHash) {
      setSwitchingToProfile(target);
      setSwitchPin('');
      setSwitchError(null);
    } else {
      setActiveProfileId(target.id);
      refreshProfiles();
    }
  };

  const handleConfirmSwitchWithPin = async () => {
    if (!switchingToProfile) return;
    const valid = await verifyProfilePin(switchingToProfile, switchPin);
    if (!valid) {
      setSwitchError('Неверный PIN-код');
      return;
    }
    setActiveProfileId(switchingToProfile.id);
    setSwitchingToProfile(null);
    setSwitchPin('');
    refreshProfiles();
  };

  const handleDeleteCurrentOrSelected = (profile: StoredUserProfile) => {
    if (profiles.length <= 1) {
      alert('Нельзя удалить единственный профиль. Создайте второй профиль перед удалением текущего.');
      return;
    }
    if (confirm(`Удалить профиль «${profile.name}» с этого устройства? Рекомендуется предварительно экспортировать архив.`)) {
      deleteProfile(profile.id);
      refreshProfiles();
    }
  };

  const userArtworksCount = artworks.filter(
    a => a.authorId === currentProfile.id || a.isUserCreated || a.source === 'my-local'
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0a0f2b] via-[#0d163d] to-[#070b24] border border-amber-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 p-0.5 shadow-xl shadow-amber-500/20 shrink-0">
            <div className="w-full h-full bg-[#080d26] rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-amber-300" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-cyan-200">
              Профили, Ключи и BIP-39 Vault
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/80 font-cyber">
              Управление профилями (до 3 на устройстве), сид-фразы, PIN-коды и экспорт архивов
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => handlePromptAddProfile('create')}
            className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Создать профиль #{profiles.length + 1}</span>
          </button>

          <button
            onClick={() => handlePromptAddProfile('restore')}
            className="py-2.5 px-4 rounded-xl bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 text-cyan-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Key className="w-4 h-4 text-cyan-400" />
            <span>Восстановить по 12 словам</span>
          </button>
        </div>
      </div>

      {feedbackNotice && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Grid: Active Profile Card & Multi-Profile List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Active Profile Deep Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Profile Info Card */}
          <div className="p-6 sm:p-8 rounded-3xl bg-[#0a0f2b]/90 border border-amber-500/40 shadow-xl space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-tr ${currentProfile.avatarColor || 'from-amber-500 to-yellow-600'} p-0.5 shadow-lg flex items-center justify-center text-3xl font-bold text-slate-950 shrink-0`}>
                  🐱
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-100">{currentProfile.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-cyber bg-emerald-950/80 border border-emerald-500/60 text-emerald-300">
                      Активен сейчас
                    </span>
                  </div>
                  <p className="text-xs text-cyan-300/70 mt-1 font-cyber">
                    ID: <span className="font-mono text-amber-300">{currentProfile.id}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExport(currentProfile)}
                  className="py-2 px-3.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Экспорт полного архива профиля и картин"
                >
                  <Download className="w-4 h-4" />
                  <span>Экспорт в архив</span>
                </button>

                <button
                  onClick={onOpenCatPassport}
                  className="py-2 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Паспорт кота</span>
                </button>
              </div>
            </div>

            {/* Profile Bio */}
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/60 text-xs sm:text-sm text-slate-300">
              <span className="text-cyan-400 font-cyber block mb-1">Творческий статус / Био:</span>
              <p className="italic">«{currentProfile.bio}»</p>
            </div>

            {/* Profile Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 text-center">
                <p className="text-[11px] text-cyan-300/70 font-cyber">Авторских картин</p>
                <p className="text-xl font-bold text-amber-300">{userArtworksCount}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 text-center">
                <p className="text-[11px] text-cyan-300/70 font-cyber">Тип кошелька</p>
                <p className="text-sm font-bold text-emerald-300">
                  {currentProfile.hasBip39Wallet ? 'BIP-39 (12 слов)' : 'Локальный ключ'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 text-center col-span-2 sm:col-span-1">
                <p className="text-[11px] text-cyan-300/70 font-cyber">Защита PIN-кодом</p>
                <p className="text-sm font-bold text-amber-300">
                  {currentProfile.pinHash ? 'Включена (4 цифры)' : 'Не установлена'}
                </p>
              </div>
            </div>

            {/* BIP-39 Seed Vault Section */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-indigo-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-200">
                    Секретная Seed-фраза восстановления (BIP-39)
                  </h3>
                </div>

                {isSeedRevealed && (
                  <button
                    onClick={() => setIsSeedRevealed(false)}
                    className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Скрыть</span>
                  </button>
                )}
              </div>

              {currentProfile.seedPhrase ? (
                isSeedRevealed ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {currentProfile.seedPhrase.split(' ').map((word, idx) => (
                        <div
                          key={idx}
                          className="p-2 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center gap-2 font-mono text-xs"
                        >
                          <span className="text-[10px] text-cyan-400/60 font-bold">{idx + 1}.</span>
                          <span className="text-amber-300 font-semibold">{word}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <p className="text-[11px] text-amber-200/80">
                        Никому не сообщайте эту мнемоническую фразу!
                      </p>
                      <button
                        onClick={handleCopySeed}
                        className="py-1.5 px-3 rounded-lg bg-indigo-900 hover:bg-indigo-800 text-xs font-semibold text-cyan-200 flex items-center gap-1"
                      >
                        {copiedSeed ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedSeed ? 'Скопировано!' : 'Копировать'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-indigo-950/60 border border-indigo-900/60">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-cyan-400" />
                      <span className="text-xs text-slate-300">
                        Фраза зашифрована и скрыта в целях безопасности.
                      </span>
                    </div>
                    <button
                      onClick={() => setShowSeedPinModal(true)}
                      className="py-2 px-4 rounded-xl bg-indigo-900 hover:bg-indigo-800 border border-indigo-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Показать фразу (ввести PIN)</span>
                    </button>
                  </div>
                )
              ) : (
                <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300/90 flex items-center justify-between gap-3">
                  <span>Данный профиль создан без мнемоники BIP-39. Рекомендуется создать современный профиль по протоколу BIP-39.</span>
                  <button
                    onClick={() => handlePromptAddProfile('create')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0"
                  >
                    Создать BIP-39
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Col 3: Multi-Profile Switcher (Max 3) */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-[#0a0f2b]/90 border border-indigo-900/70 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <span>Профили на устройстве</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-cyber bg-indigo-950 border border-amber-500/50 text-amber-300">
                  {profiles.length}/3
                </span>
              </h2>
            </div>

            <p className="text-xs text-cyan-200/70 font-cyber">
              Вы можете переключаться между 3 кошачьими аккаунтами на одном компьютере или телефоне.
            </p>

            {/* List of 3 profiles */}
            <div className="space-y-3">
              {profiles.map((p) => {
                const isCurrent = p.id === currentProfile.id;

                return (
                  <div
                    key={p.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-indigo-900/50 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-indigo-950/30 border-indigo-900/60 hover:border-indigo-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${p.avatarColor || 'from-amber-500 to-yellow-600'} flex items-center justify-center font-bold text-slate-950 shrink-0`}>
                          🐱
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-100 truncate">{p.name}</p>
                          <p className="text-[11px] text-cyan-300/60 truncate font-cyber">
                            {p.hasBip39Wallet ? 'BIP-39 Vault' : 'Локальный'}
                          </p>
                        </div>
                      </div>

                      {isCurrent ? (
                        <span className="text-xs font-bold text-emerald-400 shrink-0">
                          ✓ Активен
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSwitchProfile(p)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-xs font-semibold text-cyan-200 border border-indigo-700 transition-all shrink-0 cursor-pointer"
                        >
                          Переключить
                        </button>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-indigo-950 flex items-center justify-between text-xs">
                      <button
                        onClick={() => handleExport(p)}
                        className="text-amber-300 hover:text-amber-200 flex items-center gap-1"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Экспорт</span>
                      </button>

                      <button
                        onClick={() => handleDeleteCurrentOrSelected(p)}
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить слот</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Profile Slot status */}
            {profiles.length < 3 ? (
              <button
                onClick={() => handlePromptAddProfile('create')}
                className="w-full py-3 px-4 rounded-xl border border-dashed border-amber-500/40 hover:border-amber-400 bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Добавить ещё профиль (свободно слотов: {3 - profiles.length})</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-900 text-center text-xs text-cyan-300/70">
                Заполнены все 3 слота профилей. Для добавления 4-го потребуется освободить один из них.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Reveal Seed PIN Dialog */}
      {showSeedPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-[#0a0f2b] border border-amber-500/40 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-amber-400" />
              <h3 className="text-lg font-bold text-slate-100">Подтвердите PIN-код</h3>
            </div>
            <p className="text-xs text-slate-300">
              Для отображения секретной мнемоники введите ваш PIN-код:
            </p>
            <input
              type="password"
              maxLength={6}
              value={enteredPin}
              onChange={(e) => {
                setEnteredPin(e.target.value.replace(/\D/g, ''));
                setPinError(null);
              }}
              placeholder="••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-indigo-700 text-center text-lg tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
            />
            {pinError && <p className="text-xs text-rose-400">{pinError}</p>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setShowSeedPinModal(false);
                  setEnteredPin('');
                  setPinError(null);
                }}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Отмена
              </button>
              <button
                onClick={handleRevealSeedWithPin}
                className="py-2 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
              >
                Показать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Switch Profile PIN Dialog */}
      {switchingToProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-[#0a0f2b] border border-amber-500/40 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3">
              <Lock className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-bold text-slate-100">Вход в «{switchingToProfile.name}»</h3>
            </div>
            <p className="text-xs text-slate-300">
              Введите PIN-код для переключения на данный профиль:
            </p>
            <input
              type="password"
              maxLength={6}
              value={switchPin}
              onChange={(e) => {
                setSwitchPin(e.target.value.replace(/\D/g, ''));
                setSwitchError(null);
              }}
              placeholder="••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-indigo-700 text-center text-lg tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
            />
            {switchError && <p className="text-xs text-rose-400">{switchError}</p>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setSwitchingToProfile(null);
                  setSwitchPin('');
                  setSwitchError(null);
                }}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmSwitchWithPin}
                className="py-2 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs"
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding Modal for Creating or Restoring */}
      <OnboardingModal
        isOpen={showOnboarding}
        initialMode={onboardingMode}
        allowClose={true}
        onClose={() => setShowOnboarding(false)}
        artworks={artworks}
        onComplete={(newProf) => {
          setShowOnboarding(false);
          refreshProfiles();
          setFeedbackNotice(`Профиль «${newProf.name}» успешно активирован!`);
          setTimeout(() => setFeedbackNotice(null), 5000);
        }}
      />

      {/* Profile Limit Modal if limit 3 reached */}
      <ProfileLimitModal
        isOpen={showLimitModal}
        profiles={profiles}
        artworks={artworks}
        onClose={() => setShowLimitModal(false)}
        onProfileRemovedAndProceedToOnboarding={() => {
          setShowLimitModal(false);
          refreshProfiles();
          setOnboardingMode('create');
          setShowOnboarding(true);
        }}
      />
    </div>
  );
};
