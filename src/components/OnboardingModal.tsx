import React, { useState, useEffect } from 'react';
import { Shield, Key, Lock, Copy, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, RefreshCw, Sparkles, User, LogIn, PlusCircle, Globe } from 'lucide-react';
import { StoredUserProfile, Artwork } from '../types';
import { generateBip39Mnemonic, validateBip39Mnemonic } from '../utils/bip39';
import {
  getAllProfiles,
  saveNewProfile,
  createBip39ProfileData,
  verifyProfilePin,
  setActiveProfileId,
} from '../utils/profileManager';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { ProfileLimitModal } from './ProfileLimitModal';

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (profile: StoredUserProfile) => void;
  onClose?: () => void;
  allowClose?: boolean;
  initialMode?: 'select' | 'create' | 'restore';
  artworks?: Artwork[];
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  onClose,
  allowClose = false,
  initialMode = 'select',
  artworks = [],
}) => {
  const [profiles, setProfiles] = useState<StoredUserProfile[]>([]);
  const [mode, setMode] = useState<'select' | 'create-show' | 'create-verify' | 'create-pin' | 'restore-seed' | 'restore-pin'>('select');
  
  // Seed state
  const [generatedSeed, setGeneratedSeed] = useState<string>('');
  const [copied, setCopied] = useState(false);
  
  // Verification test indices (3 random words to verify)
  const [verifyIndices, setVerifyIndices] = useState<number[]>([2, 6, 10]); // 0-based: #3, #7, #11
  const [verifyInputs, setVerifyInputs] = useState<{ [key: number]: string }>({});
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Restore state
  const [restoreInput, setRestoreInput] = useState<string>('');
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // PIN state
  const [pin, setPin] = useState<string>('');
  const [pinConfirm, setPinConfirm] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Profile details
  const [artistName, setArtistName] = useState<string>('');

  // Login existing profile state
  const [selectedProfileForLogin, setSelectedProfileForLogin] = useState<StoredUserProfile | null>(null);
  const [loginPin, setLoginPin] = useState<string>('');
  const [loginError, setLoginError] = useState<string | null>(null);

  // Limit modal state
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [pendingNextMode, setPendingNextMode] = useState<'create' | 'restore'>('create');

  const { googleUser, signInWithGoogle, isSigningIn, authError } = useFirebaseAuth();

  useEffect(() => {
    if (isOpen) {
      const existing = getAllProfiles();
      setProfiles(existing);
      if (existing.length === 0) {
        handleStartCreate();
      } else if (initialMode === 'create') {
        if (existing.length >= 3) {
          setPendingNextMode('create');
          setShowLimitModal(true);
        } else {
          handleStartCreate();
        }
      } else if (initialMode === 'restore') {
        if (existing.length >= 3) {
          setPendingNextMode('restore');
          setShowLimitModal(true);
        } else {
          handleStartRestore();
        }
      } else {
        setMode('select');
      }
    }
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const handleStartCreate = async () => {
    const existing = getAllProfiles();
    if (existing.length >= 3) {
      setPendingNextMode('create');
      setShowLimitModal(true);
      return;
    }
    const seed = await generateBip39Mnemonic();
    setGeneratedSeed(seed);
    setCopied(false);
    // Pick 3 random distinct word positions between 0 and 11
    const indices = [1, 5, 9]; // word #2, #6, #10
    setVerifyIndices(indices);
    setVerifyInputs({});
    setVerifyError(null);
    setPin('');
    setPinConfirm('');
    setPinError(null);
    setArtistName('');
    setMode('create-show');
  };

  const handleStartRestore = () => {
    const existing = getAllProfiles();
    if (existing.length >= 3) {
      setPendingNextMode('restore');
      setShowLimitModal(true);
      return;
    }
    setRestoreInput('');
    setRestoreError(null);
    setPin('');
    setPinConfirm('');
    setPinError(null);
    setArtistName('');
    setMode('restore-seed');
  };

  const handleCopySeed = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(generatedSeed);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleVerifyStep = () => {
    const words = generatedSeed.split(' ');
    for (const idx of verifyIndices) {
      const entered = (verifyInputs[idx] || '').trim().toLowerCase();
      const expected = words[idx].toLowerCase();
      if (entered !== expected) {
        setVerifyError(`Слово #${idx + 1} указано неверно. Ожидалось другое слово.`);
        return;
      }
    }
    setVerifyError(null);
    setMode('create-pin');
  };

  const handleCheckRestoreMnemonic = async () => {
    const check = await validateBip39Mnemonic(restoreInput);
    if (!check.valid) {
      setRestoreError(check.error || 'Недействительная мнемоническая фраза BIP-39');
      return;
    }
    setRestoreError(null);
    setMode('restore-pin');
  };

  const handleFinishCreateOrRestore = async (seedToUse: string) => {
    if (pin.length < 4) {
      setPinError('PIN-код должен содержать минимум 4 цифры');
      return;
    }
    if (pin !== pinConfirm) {
      setPinError('Введённые PIN-коды не совпадают');
      return;
    }

    try {
      const newProfile = await createBip39ProfileData(
        seedToUse,
        pin,
        artistName || undefined
      );

      const res = saveNewProfile(newProfile);
      if (!res.success) {
        setPinError(res.error || 'Ошибка сохранения профиля');
        return;
      }

      onComplete(newProfile);
    } catch (err: unknown) {
      setPinError((err as Error)?.message || 'Не удалось сгенерировать крипто-профиль');
    }
  };

  const handleLoginExisting = async (profile: StoredUserProfile) => {
    if (profile.pinHash) {
      const valid = await verifyProfilePin(profile, loginPin);
      if (!valid) {
        setLoginError('Неверный PIN-код для данного профиля');
        return;
      }
    }
    setActiveProfileId(profile.id);
    onComplete(profile);
  };

  const handleGoogleSignInAction = async () => {
    const user = await signInWithGoogle();
    if (!user) return;
    const existingList = getAllProfiles();
    const googleProfileId = `google_${user.uid.slice(0, 16)}`;
    const matched = existingList.find((p) => p.id === googleProfileId);
    if (matched) {
      setActiveProfileId(matched.id);
      onComplete(matched);
      return;
    }
    const newGoogleProfile: StoredUserProfile = {
      id: googleProfileId,
      name: user.displayName || user.email?.split('@')[0] || 'Google Художник',
      avatarColor: 'from-cyan-400 to-blue-600',
      bio: `Облачная галерея Google (${user.email || 'Cloud Sync'})`,
      createdAt: Date.now(),
      totalCreations: 0,
      likedArtworkIds: [],
      isCurrent: true,
      hasBip39Wallet: false,
    };
    if (existingList.length < 3) {
      saveNewProfile(newGoogleProfile);
    }
    onComplete(newGoogleProfile);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="max-w-xl w-full bg-[#0a0f2b] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.95)] text-slate-100 space-y-6">
        
        {/* MODE: Select Existing Profile or Create New */}
        {mode === 'select' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-yellow-500 p-0.5 shadow-lg shadow-amber-500/20">
                <div className="w-full h-full bg-[#080d26] rounded-2xl flex items-center justify-center">
                  <User className="w-7 h-7 text-amber-300" />
                </div>
              </div>
              <h2 className="text-xl sm:text-2xl font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-cyan-200">
                Вход в кошачий профиль
              </h2>
              <p className="text-xs text-cyan-200/70 font-cyber">
                Войдите через Google для облачной галереи или используйте локальный BIP-39 профиль
              </p>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignInAction}
              disabled={isSigningIn}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2.5 shadow-lg cursor-pointer transition-colors"
            >
              <Globe className="w-4 h-4 text-blue-600" />
              <span>
                {isSigningIn
                  ? 'Подключаем Google...'
                  : googleUser
                  ? `Продолжить как ${googleUser.displayName || googleUser.email}`
                  : 'Войти через Google'}
              </span>
            </button>
            {authError && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{authError}</span>
              </p>
            )}

            {/* List of existing profiles */}
            <div className="space-y-2.5">
              <label className="text-xs font-cyber text-cyan-300 font-bold uppercase tracking-wider">
                Сохранённые профили ({profiles.length}/3):
              </label>
              <div className="space-y-2">
                {profiles.map((p) => {
                  const isSelected = selectedProfileForLogin?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setSelectedProfileForLogin(p);
                        setLoginPin('');
                        setLoginError(null);
                      }}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-indigo-900/60 border-amber-400 shadow-md shadow-amber-500/20'
                          : 'bg-indigo-950/40 border-indigo-900/70 hover:border-indigo-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${p.avatarColor || 'from-amber-500 to-yellow-600'} flex items-center justify-center font-bold text-slate-950 shrink-0`}>
                          🐱
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-100 truncate">{p.name}</p>
                          <p className="text-[11px] text-cyan-300/60 truncate font-cyber">
                            {p.hasBip39Wallet ? 'BIP-39 Vault • Защищён PIN' : 'Базовый профиль'}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 text-xs font-cyber text-amber-300">
                        {isSelected ? '✓ Выбран' : 'Выбрать'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PIN Entry for selected profile */}
            {selectedProfileForLogin && (
              <div className="p-4 rounded-2xl bg-indigo-950/60 border border-indigo-800 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-cyan-300">Вход для: <strong>{selectedProfileForLogin.name}</strong></span>
                </div>
                {selectedProfileForLogin.pinHash ? (
                  <div>
                    <label className="text-xs text-slate-300 block mb-1">Введите 4-значный PIN-код:</label>
                    <input
                      type="password"
                      maxLength={6}
                      value={loginPin}
                      onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-indigo-700 text-center text-lg tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-emerald-300">У данного профиля не установлен PIN-код.</p>
                )}

                {loginError && (
                  <p className="text-xs text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{loginError}</span>
                  </p>
                )}

                <button
                  type="button"
                  onClick={() => handleLoginExisting(selectedProfileForLogin)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Войти в выбранный профиль</span>
                </button>
              </div>
            )}

            {/* Creation and Restore Options */}
            <div className="pt-2 border-t border-indigo-900/60 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleStartCreate}
                className="py-3 px-4 rounded-xl bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <PlusCircle className="w-4 h-4 text-amber-400" />
                <span>Создать новый профиль BIP-39</span>
              </button>

              <button
                type="button"
                onClick={handleStartRestore}
                className="py-3 px-4 rounded-xl bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-700 text-cyan-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Key className="w-4 h-4 text-cyan-400" />
                <span>Восстановить по 12 словам</span>
              </button>
            </div>

            {allowClose && onClose && (
              <button
                type="button"
                onClick={onClose}
                className="w-full text-center text-xs text-slate-400 hover:text-slate-200 py-1"
              >
                Закрыть окно
              </button>
            )}
          </div>
        )}

        {/* MODE: CREATE - SHOW 12 WORDS */}
        {mode === 'create-show' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-indigo-900/60 pb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-300">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-gaudi font-bold text-amber-200">
                  Шаг 1 из 3: Ваша Seed-фраза (BIP-39)
                </h2>
                <p className="text-xs text-cyan-200/70 font-cyber">
                  Сгенерировано 12 секретных слов для кошачьего кошелька и цифровых полотен
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignInAction}
              disabled={isSigningIn}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-colors"
            >
              <Globe className="w-4 h-4 text-blue-600" />
              <span>
                {isSigningIn ? 'Выполняется вход...' : 'Быстрый вход через Google (Облачная галерея)'}
              </span>
            </button>
            {authError && (
              <p className="text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{authError}</span>
              </p>
            )}

            <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed">
              ⚠️ <strong>Важно для BIP-39:</strong> Запишите эти 12 слов на бумаге в точном порядке! Они понадобятся для восстановления доступа к локальным полотнам и P2P-идентичности. На следующем шаге система проверит, что вы их сохранили.
            </div>

            {/* 12 Words Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
              {generatedSeed.split(' ').map((word, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-900/80 border border-indigo-800/80 flex items-center gap-2 font-mono text-xs"
                >
                  <span className="text-[10px] text-cyan-400/60 w-4 font-bold">{idx + 1}.</span>
                  <span className="font-semibold text-amber-300">{word}</span>
                </div>
              ))}
            </div>

            {/* Copy button */}
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleCopySeed}
                className="py-2 px-4 rounded-xl bg-indigo-900/70 hover:bg-indigo-800 border border-indigo-700 text-xs font-semibold text-cyan-200 flex items-center gap-2 cursor-pointer transition-all"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
                <span>{copied ? 'Скопировано в буфер!' : 'Скопировать 12 слов'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('create-verify')}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Я записал фразу → Проверка</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* MODE: CREATE - VERIFY 3 WORDS */}
        {mode === 'create-verify' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-indigo-900/60 pb-3">
              <button
                type="button"
                onClick={() => setMode('create-show')}
                className="p-2 rounded-xl bg-indigo-950 text-slate-400 hover:text-slate-100"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-gaudi font-bold text-amber-200">
                  Шаг 2 из 3: Проверка сохранения фразы
                </h2>
                <p className="text-xs text-cyan-200/70 font-cyber">
                  Подтвердите правильность записи, введя 3 случайных слова из вашей сид-фразы
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {verifyIndices.map((wordIndex) => (
                <div key={wordIndex} className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-900/80">
                  <label className="text-xs font-cyber text-cyan-300 block mb-1">
                    Введите <strong>слово #{wordIndex + 1}</strong>:
                  </label>
                  <input
                    type="text"
                    value={verifyInputs[wordIndex] || ''}
                    onChange={(e) => {
                      setVerifyInputs(prev => ({ ...prev, [wordIndex]: e.target.value }));
                      setVerifyError(null);
                    }}
                    placeholder={`Например: ${generatedSeed.split(' ')[wordIndex] ? '...' : ''}`}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-indigo-700 text-slate-100 font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              ))}
            </div>

            {verifyError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{verifyError}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode('create-show')}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Посмотреть фразу снова
              </button>

              <button
                type="button"
                onClick={handleVerifyStep}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Подтвердить и задать PIN</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* MODE: CREATE - PIN CODE & PROFILE DETAILS */}
        {mode === 'create-pin' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-indigo-900/60 pb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-gaudi font-bold text-amber-200">
                  Шаг 3 из 3: PIN-код и имя профиля
                </h2>
                <p className="text-xs text-cyan-200/70 font-cyber">
                  Задайте 4-значный код для быстрого входа без постоянного ввода 12 слов
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs text-cyan-300 block mb-1">Имя кошачьего мастера (псевдоним):</label>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Винсент Рыжехвостый"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-indigo-700 text-slate-100 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-cyan-300 block mb-1">PIN-код (4 цифры):</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ''));
                      setPinError(null);
                    }}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-indigo-700 text-center text-lg tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-cyan-300 block mb-1">Повторите PIN-код:</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pinConfirm}
                    onChange={(e) => {
                      setPinConfirm(e.target.value.replace(/\D/g, ''));
                      setPinError(null);
                    }}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-indigo-700 text-center text-lg tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleFinishCreateOrRestore(generatedSeed)}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(251,191,36,0.5)] cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Завершить онбординг и открыть галерею</span>
            </button>
          </div>
        )}

        {/* MODE: RESTORE - ENTER 12 WORDS */}
        {mode === 'restore-seed' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-indigo-900/60 pb-3">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="p-2 rounded-xl bg-indigo-950 text-slate-400 hover:text-slate-100"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-gaudi font-bold text-amber-200">
                  Восстановление профиля по 12 словам
                </h2>
                <p className="text-xs text-cyan-200/70 font-cyber">
                  Введите вашу BIP-39 мнемонику через пробел для детерминированного восстановления ключей
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs text-cyan-300 block mb-1">
                Мнемоническая фраза (12 английских слов):
              </label>
              <textarea
                rows={3}
                value={restoreInput}
                onChange={(e) => {
                  setRestoreInput(e.target.value);
                  setRestoreError(null);
                }}
                placeholder="abandon ability able about above absent absorb abstract absurd abuse access accident"
                className="w-full p-3.5 rounded-xl bg-slate-900 border border-indigo-700 text-amber-200 font-mono text-xs focus:outline-none focus:border-amber-400 leading-relaxed"
              />
              <p className="text-[11px] text-cyan-300/50 mt-1 font-cyber">
                Слова проверяются по официальному словарю BIP-39 и контрольной сумме SHA-256
              </p>
            </div>

            {restoreError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{restoreError}</span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMode('select')}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Назад
              </button>

              <button
                type="button"
                onClick={handleCheckRestoreMnemonic}
                className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-md"
              >
                <span>Проверить фразу и продолжить</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* MODE: RESTORE - PIN CODE */}
        {mode === 'restore-pin' && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 border-b border-indigo-900/60 pb-3">
              <button
                type="button"
                onClick={() => setMode('restore-seed')}
                className="p-2 rounded-xl bg-indigo-950 text-slate-400 hover:text-slate-100"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h2 className="text-xl font-gaudi font-bold text-amber-200">
                  Задайте новый PIN для быстрого входа
                </h2>
                <p className="text-xs text-cyan-200/70 font-cyber">
                  Фраза подтверждена! Задайте PIN-код для мгновенной разблокировки профиля на этом устройстве
                </p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs text-cyan-300 block mb-1">Имя профиля (опционально):</label>
                <input
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="Винсент Рыжехвостый"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-indigo-700 text-slate-100 text-sm focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-cyan-300 block mb-1">PIN-код (4 цифры):</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value.replace(/\D/g, ''));
                      setPinError(null);
                    }}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-indigo-700 text-center text-lg tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-cyan-300 block mb-1">Повторите PIN-код:</label>
                  <input
                    type="password"
                    maxLength={6}
                    value={pinConfirm}
                    onChange={(e) => {
                      setPinConfirm(e.target.value.replace(/\D/g, ''));
                      setPinError(null);
                    }}
                    placeholder="••••"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-indigo-700 text-center text-lg tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {pinError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{pinError}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleFinishCreateOrRestore(restoreInput)}
              className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(251,191,36,0.5)] cursor-pointer transition-all"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Восстановить профиль и войти</span>
            </button>
          </div>
        )}
      </div>

      {/* Profile Limit Modal if >= 3 profiles */}
      <ProfileLimitModal
        isOpen={showLimitModal}
        profiles={profiles}
        artworks={artworks}
        onClose={() => setShowLimitModal(false)}
        onProfileRemovedAndProceedToOnboarding={() => {
          setShowLimitModal(false);
          const remaining = getAllProfiles();
          setProfiles(remaining);
          if (pendingNextMode === 'create') {
            handleStartCreate();
          } else {
            handleStartRestore();
          }
        }}
      />
    </div>
  );
};
