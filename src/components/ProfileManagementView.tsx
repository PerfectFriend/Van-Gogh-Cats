import React, { useState, useRef } from 'react';
import {
  Shield,
  Key,
  Lock,
  Download,
  Upload,
  Trash2,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  Award,
  FileLock2,
} from 'lucide-react';
import { StoredUserProfile, Artwork } from '../types';
import {
  getAllProfiles,
  getActiveProfile,
  setActiveProfileId,
  deleteProfile,
  exportProfileArchive,
  exportEncryptedProfileArchive,
  decryptEncryptedProfileArchive,
  verifyProfilePin,
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

  // Encrypted backup export/import states
  const [showEncExportModal, setShowEncExportModal] = useState(false);
  const [encPassphrase, setEncPassphrase] = useState('');
  const [encOptionalSeed, setEncOptionalSeed] = useState('');
  const [encError, setEncError] = useState<string | null>(null);
  const [encLoading, setEncLoading] = useState(false);

  const importFileRef = useRef<HTMLInputElement | null>(null);
  const [pendingImportJson, setPendingImportJson] = useState<string | null>(null);
  const [importPassphrase, setImportPassphrase] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importedSeedResult, setImportedSeedResult] = useState<string | null>(null);

  // Modals for adding profile
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMode, setOnboardingMode] = useState<'create' | 'restore'>('create');
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Profile switch pin check
  const [switchingToProfile, setSwitchingToProfile] = useState<StoredUserProfile | null>(null);
  const [switchPin, setSwitchPin] = useState('');
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Inline delete confirmation (no window.confirm/alert)
  const [deletingCandidate, setDeletingCandidate] = useState<StoredUserProfile | null>(null);

  // Notice & Warning
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [warningNotice, setWarningNotice] = useState<string | null>(null);

  const refreshProfiles = () => {
    const list = getAllProfiles();
    setProfiles(list);
    const active = getActiveProfile();
    if (active) onProfileChanged(active);
  };

  const handleExportPublicArchive = (profile: StoredUserProfile) => {
    exportProfileArchive(profile, artworks);
    setFeedbackNotice(`Публичный архив картин и профиля «${profile.name}» (.catpack.json) скачан без приватных ключей.`);
    setTimeout(() => setFeedbackNotice(null), 5000);
  };

  const handleEncryptedExportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEncError(null);
    if (encPassphrase.length < 6) {
      setEncError('Придумайте надёжный пароль длиной минимум 6 символов.');
      return;
    }
    setEncLoading(true);
    try {
      await exportEncryptedProfileArchive(
        currentProfile,
        artworks,
        encPassphrase,
        encOptionalSeed.trim() || undefined
      );
      setShowEncExportModal(false);
      setEncPassphrase('');
      setEncOptionalSeed('');
      setFeedbackNotice(`Зашифрованный архив «${currentProfile.name}» (.catpack.enc.json) сохранён.`);
      setTimeout(() => setFeedbackNotice(null), 5000);
    } catch (err: any) {
      setEncError(err?.message || 'Ошибка шифрования архива.');
    } finally {
      setEncLoading(false);
    }
  };

  const handleSelectEncryptedFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setPendingImportJson(String(reader.result || ''));
      setImportPassphrase('');
      setImportError(null);
      setImportedSeedResult(null);
    };
    reader.readAsText(file);
    if (importFileRef.current) importFileRef.current.value = '';
  };

  const handleDecryptArchiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingImportJson) return;
    setImportError(null);
    try {
      const payload = await decryptEncryptedProfileArchive(pendingImportJson, importPassphrase);
      if (payload.optionalSeedPhrase) {
        setImportedSeedResult(payload.optionalSeedPhrase);
      } else {
        setPendingImportJson(null);
      }
      setFeedbackNotice(
        `Архив «${payload.profile.name}» успешно расшифрован (${payload.artworksCount} картин). Используйте фразу для восстановления профиля при необходимости.`
      );
      setTimeout(() => setFeedbackNotice(null), 6000);
    } catch {
      setImportError('Неверный пароль или повреждённый зашифрованный архив.');
    }
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

  const handleRequestDelete = (profile: StoredUserProfile) => {
    if (profiles.length <= 1) {
      setWarningNotice('Нельзя удалить единственный профиль на устройстве. Сначала создайте или восстановите второй профиль.');
      setTimeout(() => setWarningNotice(null), 5000);
      return;
    }
    setDeletingCandidate(profile);
  };

  const handleConfirmDelete = () => {
    if (!deletingCandidate) return;
    const deletedName = deletingCandidate.name;
    deleteProfile(deletingCandidate.id);
    setDeletingCandidate(null);
    refreshProfiles();
    setFeedbackNotice(`Профиль «${deletedName}» удалён с устройства.`);
    setTimeout(() => setFeedbackNotice(null), 4000);
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
              Управление профилями (до 3 на устройстве), PIN-защита PBKDF2 и шифрование бэкапов AES-GCM
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

      {warningNotice && (
        <div className="p-4 rounded-2xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{warningNotice}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1 & 2: Active Profile Deep Details */}
        <div className="lg:col-span-2 space-y-6">
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

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => handleExportPublicArchive(currentProfile)}
                  className="py-2 px-3.5 rounded-xl bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Скачать публичный архив картин (.catpack.json)"
                >
                  <Download className="w-4 h-4" />
                  <span>Экспорт картин</span>
                </button>

                <button
                  onClick={() => {
                    setEncError(null);
                    setShowEncExportModal(true);
                  }}
                  className="py-2 px-3.5 rounded-xl bg-emerald-900/50 hover:bg-emerald-800/70 border border-emerald-600/60 text-emerald-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileLock2 className="w-4 h-4 text-emerald-400" />
                  <span>Зашифрованный бэкап</span>
                </button>

                <button
                  onClick={onOpenCatPassport}
                  className="py-2 px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  <span>Паспорт кота</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/60 text-xs sm:text-sm text-slate-300">
              <span className="text-cyan-400 font-cyber block mb-1">Творческий статус / Био:</span>
              <p className="italic">«{currentProfile.bio}»</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 text-center">
                <p className="text-[11px] text-cyan-300/70 font-cyber">Авторских картин</p>
                <p className="text-xl font-bold text-amber-300">{userArtworksCount}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 text-center">
                <p className="text-[11px] text-cyan-300/70 font-cyber">Тип кошелька</p>
                <p className="text-sm font-bold text-emerald-300">
                  {currentProfile.hasBip39Wallet ? 'BIP-39 (без хранения сида)' : 'Локальный ключ'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 text-center col-span-2 sm:col-span-1">
                <p className="text-[11px] text-cyan-300/70 font-cyber">Защита PIN-кодом</p>
                <p className="text-sm font-bold text-amber-300">
                  {currentProfile.pinHash ? 'PBKDF2-SHA256 (100k)' : 'Не установлена'}
                </p>
              </div>
            </div>

            {/* Zero-Retention Seed Policy & Encrypted Backup Vault */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-indigo-800/80 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-sm font-bold text-slate-200">
                    Политика Zero-Retention и шифрованный архив (.catpack.enc.json)
                  </h3>
                </div>
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".json,.enc.json"
                  onChange={handleSelectEncryptedFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  className="py-1.5 px-3 rounded-lg bg-indigo-900/70 hover:bg-indigo-800 border border-indigo-700 text-xs font-semibold text-cyan-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Расшифровать бэкап</span>
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Для защиты приватности ваша мнемоника BIP-39 <strong>никогда не сохраняется на устройстве</strong> и не включается в открытые экспорты. Если вам нужен цифровой бэкап, используйте кнопку «Зашифрованный бэкап» с надёжным паролем (PBKDF2 600 000 итераций + AES-GCM-256).
              </p>

              {!currentProfile.hasBip39Wallet && (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-300/90 flex items-center justify-between gap-3">
                  <span>Данный профиль создан без мнемоники BIP-39. Рекомендуется создать новый профиль по протоколу BIP-39.</span>
                  <button
                    onClick={() => handlePromptAddProfile('create')}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer"
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
              Вы можете переключаться между 3 кошачьими аккаунтами на одном устройстве.
            </p>

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
                        onClick={() => handleExportPublicArchive(p)}
                        className="text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Экспорт</span>
                      </button>

                      <button
                        onClick={() => handleRequestDelete(p)}
                        className="text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить слот</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

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

      {/* Modal: Encrypted Archive Export */}
      {showEncExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleEncryptedExportSubmit}
            className="max-w-md w-full bg-[#0a0f2b] border border-emerald-500/40 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-100"
          >
            <div className="flex items-center gap-3">
              <FileLock2 className="w-6 h-6 text-emerald-400" />
              <h3 className="text-lg font-bold text-slate-100">Зашифрованный бэкап AES-GCM</h3>
            </div>
            <p className="text-xs text-slate-300">
              Файл будет зашифрован вашим паролем (PBKDF2 600 000 итераций). Без пароля расшифровать его невозможно.
            </p>
            <div>
              <label className="text-xs text-cyan-300 block mb-1">Пароль шифрования (мин. 6 символов):</label>
              <input
                type="password"
                value={encPassphrase}
                onChange={(e) => setEncPassphrase(e.target.value)}
                placeholder="Надёжный пароль..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-indigo-700 text-sm text-amber-200 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs text-cyan-300 block mb-1">
                Опционально: вложить 12 слов BIP-39 внутрь шифрофайла (с бумаги):
              </label>
              <textarea
                rows={2}
                value={encOptionalSeed}
                onChange={(e) => setEncOptionalSeed(e.target.value)}
                placeholder="Оставьте пустым для бэкапа только картин и профиля"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-indigo-700 text-xs font-mono text-amber-200 focus:outline-none focus:border-emerald-400"
              />
            </div>
            {encError && <p className="text-xs text-rose-400">{encError}</p>}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowEncExportModal(false);
                  setEncPassphrase('');
                  setEncOptionalSeed('');
                }}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={encLoading}
                className="py-2 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                {encLoading ? 'Шифрование...' : 'Скачать .catpack.enc.json'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Decrypt Imported Backup */}
      {pendingImportJson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <form
            onSubmit={handleDecryptArchiveSubmit}
            className="max-w-md w-full bg-[#0a0f2b] border border-cyan-500/40 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-100"
          >
            <div className="flex items-center gap-3">
              <Key className="w-6 h-6 text-cyan-400" />
              <h3 className="text-lg font-bold text-slate-100">Расшифровка бэкапа</h3>
            </div>
            {!importedSeedResult ? (
              <>
                <input
                  type="password"
                  value={importPassphrase}
                  onChange={(e) => setImportPassphrase(e.target.value)}
                  placeholder="Введите пароль архива..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-indigo-700 text-sm text-amber-200 focus:outline-none focus:border-cyan-400"
                />
                {importError && <p className="text-xs text-rose-400">{importError}</p>}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setPendingImportJson(null)}
                    className="py-2 px-4 rounded-xl bg-slate-800 text-xs text-slate-300 cursor-pointer"
                  >
                    Закрыть
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-5 rounded-xl bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Расшифровать
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-emerald-300">Восстановленная фраза из зашифрованного архива:</p>
                <div className="p-3 rounded-xl bg-slate-900 border border-emerald-500/40 font-mono text-xs text-amber-200 select-all">
                  {importedSeedResult}
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setPendingImportJson(null);
                      setImportedSeedResult(null);
                    }}
                    className="py-2 px-5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Готово
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Modal: Inline Delete Profile Confirmation */}
      {deletingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-md w-full bg-[#0a0f2b] border border-rose-500/40 rounded-3xl p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-400" />
              <h3 className="text-lg font-bold text-slate-100">Удалить профиль «{deletingCandidate.name}»?</h3>
            </div>
            <p className="text-xs text-slate-300">
              Слот на устройстве будет удалён без возможности отмены. Рекомендуется предварительно сохранить архив на диск.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeletingCandidate(null)}
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmDelete}
                className="py-2 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
              >
                Удалить слот
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
                className="py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleConfirmSwitchWithPin}
                className="py-2 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Войти
              </button>
            </div>
          </div>
        </div>
      )}

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
