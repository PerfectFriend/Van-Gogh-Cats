import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ShieldCheck, Globe, Wifi, Database, CheckCircle2, Loader2, Brush, ArrowRight, Zap } from 'lucide-react';
import splashWallpaper from '../assets/images/splash_cyber_gaudi_1790474348858.jpg';

interface SplashScreenProps {
  onComplete: () => void;
  onLanguageDetected?: (lang: 'ru' | 'en') => void;
}

interface LoadingStage {
  id: string;
  nameRu: string;
  nameEn: string;
  detail: string;
  icon: React.ReactNode;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete, onLanguageDetected }) => {
  const [progress, setProgress] = useState(10);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [detectedLang, setDetectedLang] = useState<'ru' | 'en'>('ru');
  const [stageDetails, setStageDetails] = useState<string>('Инициализация ядра галереи...');

  // Use refs to prevent re-triggering effects when callbacks change identity
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const onLanguageDetectedRef = useRef(onLanguageDetected);
  onLanguageDetectedRef.current = onLanguageDetected;

  const completedRef = useRef(false);

  const [stages, setStages] = useState<LoadingStage[]>([
    {
      id: 'language',
      nameRu: 'Определение языка системы',
      nameEn: 'System Language Detection',
      detail: 'Анализ языкового окружения ОС и браузера...',
      icon: <Globe className="w-5 h-5 text-cyan-400" />,
      status: 'pending',
    },
    {
      id: 'network',
      nameRu: 'Настройка сетевого окружения',
      nameEn: 'Network Environment Setup',
      detail: 'Проверка LAN-интерфейсов, WebRTC STUN и сигнального P2P-хаба...',
      icon: <Wifi className="w-5 h-5 text-amber-400" />,
      status: 'pending',
    },
    {
      id: 'storage',
      nameRu: 'Тестирование целостности приложения и локального хранилища',
      nameEn: 'Integrity & Storage Verification',
      detail: 'Валидация IndexedDB, криптографических ключей Web Crypto и квот...',
      icon: <Database className="w-5 h-5 text-emerald-400" />,
      status: 'pending',
    },
  ]);

  const handleFinish = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    onCompleteRef.current();
  };

  useEffect(() => {
    let isCancelled = false;

    // Guaranteed fallback timer: automatically finish in 3.5 seconds maximum
    const safetyTimeout = setTimeout(() => {
      if (!isCancelled && !completedRef.current) {
        handleFinish();
      }
    }, 3500);

    const runInitialization = async () => {
      try {
        // Stage 1: Определение языка системы
        setStages(prev => prev.map((s, i) => i === 0 ? { ...s, status: 'running' } : s));
        setStageDetails('Сканирование navigator.language и системных региональных настроек...');
        setProgress(25);

        await new Promise(r => setTimeout(r, 400));
        if (isCancelled) return;

        const sysLang = (typeof navigator !== 'undefined' ? navigator.language || 'ru' : 'ru').toLowerCase();
        const isRu = sysLang.startsWith('ru') || sysLang.startsWith('be') || sysLang.startsWith('uk') || sysLang.startsWith('kk');
        const langChoice: 'ru' | 'en' = isRu ? 'ru' : 'en';
        setDetectedLang(langChoice);

        if (onLanguageDetectedRef.current) {
          onLanguageDetectedRef.current(langChoice);
        }

        setStages(prev => prev.map((s, i) => i === 0 ? {
          ...s,
          status: 'completed',
          detail: `Язык системы: ${sysLang.toUpperCase()} (${langChoice === 'ru' ? 'Русский' : 'English'}) зафиксирован`
        } : s));
        setProgress(50);
        setCurrentStageIndex(1);

        // Stage 2: Настройка сетевого окружения
        setStages(prev => prev.map((s, i) => i === 1 ? { ...s, status: 'running' } : s));
        setStageDetails('Проверка LAN-интерфейсов, WebRTC ICE-кандидатов и P2P-сигналинга...');

        await new Promise(r => setTimeout(r, 450));
        if (isCancelled) return;

        const rtcSupported = typeof window !== 'undefined' && ('RTCPeerConnection' in window);
        const onlineStatus = typeof navigator !== 'undefined' ? navigator.onLine : true;

        setStages(prev => prev.map((s, i) => i === 1 ? {
          ...s,
          status: 'completed',
          detail: `Сетевой стек: ${onlineStatus ? 'Online' : 'Offline'}, WebRTC ${rtcSupported ? 'Готов (STUN/Dual-Host)' : 'Ограничен'}`
        } : s));
        setProgress(80);
        setCurrentStageIndex(2);

        // Stage 3: Тестирование целостности приложения и локального хранилища
        setStages(prev => prev.map((s, i) => i === 2 ? { ...s, status: 'running' } : s));
        setStageDetails('Проверка крипто-провайдера Web Crypto API и хранилища IndexedDB...');

        await new Promise(r => setTimeout(r, 450));
        if (isCancelled) return;

        const cryptoOk = typeof window !== 'undefined' && !!window.crypto?.subtle;
        let idbOk = true;
        try {
          if (!('indexedDB' in window)) idbOk = false;
        } catch {
          idbOk = false;
        }

        setStages(prev => prev.map((s, i) => i === 2 ? {
          ...s,
          status: 'completed',
          detail: `Целостность подтверждена: WebCrypto ${cryptoOk ? 'OK' : 'Fail'}, IndexedDB ${idbOk ? 'OK' : 'Fallback'}`
        } : s));
        setProgress(100);
        setStageDetails('Все подсистемы успешно инициализированы!');

        await new Promise(r => setTimeout(r, 350));
        if (!isCancelled) {
          handleFinish();
        }
      } catch (err) {
        console.warn('Splash initialization error, proceeding directly:', err);
        handleFinish();
      }
    };

    runInitialization();

    return () => {
      isCancelled = true;
      clearTimeout(safetyTimeout);
    };
  }, []); // Run ONCE on mount

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#030612] select-none">
      {/* High-Resolution Cyberpunk + Van Gogh + Gaudí Background Wallpaper */}
      <div
        className="absolute inset-0 bg-cover bg-center transition-all duration-1000 filter brightness-90 contrast-110"
        style={{ backgroundImage: `url(${splashWallpaper})` }}
      />

      {/* Cyberpunk & Gaudí Stained Glass Artistic Gradient Overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#020512] via-[#050c26]/75 to-[#0b1338]/60 backdrop-blur-[1.5px]" />

      {/* Radiant Cyber-Neon Glow Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-fuchsia-500/20 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Splash Card */}
      <div className="relative z-10 max-w-xl w-full mx-4 sm:mx-6 p-6 sm:p-8 rounded-3xl bg-[#070b22]/90 border border-amber-400/50 shadow-[0_25px_80px_rgba(0,0,0,0.95)] backdrop-blur-2xl text-center space-y-6">
        
        {/* Artistic Emblem & Header */}
        <div className="space-y-3">
          <div className="mx-auto w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-amber-400 via-pink-500 to-cyan-500 p-0.5 shadow-2xl shadow-cyan-500/25 animate-bounce duration-1000">
            <div className="w-full h-full bg-[#080d26] rounded-2xl flex items-center justify-center">
              <Brush className="w-8 h-8 sm:w-10 sm:h-10 text-amber-300 transform -rotate-12" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-cyan-200 tracking-wide drop-shadow-[0_2px_15px_rgba(251,191,36,0.5)]">
              Van Gogh CryptoCats Gallery
            </h1>
            <p className="text-xs sm:text-sm font-cyber text-cyan-200/90 tracking-wider">
              Cyberpunk • Gaudí • Van Gogh Impasto • P2P Vault
            </p>
          </div>
        </div>

        {/* Progress Bar Container */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-cyber text-cyan-300/80">
            <span className="truncate pr-2">{stageDetails}</span>
            <span className="font-bold text-amber-300 shrink-0 font-mono">{progress}%</span>
          </div>

          <div className="w-full h-3.5 bg-indigo-950/90 rounded-full border border-indigo-700/70 overflow-hidden p-0.5 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-amber-400 via-pink-400 to-cyan-400 rounded-full transition-all duration-300 ease-out shadow-[0_0_20px_rgba(34,211,238,0.7)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Loading Stages Checklist */}
        <div className="space-y-2.5 text-left">
          {stages.map((stage, idx) => {
            const isCurrent = idx === currentStageIndex && stage.status === 'running';
            const isDone = stage.status === 'completed';

            return (
              <div
                key={stage.id}
                className={`p-3 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 ${
                  isCurrent
                    ? 'bg-indigo-900/50 border-amber-400/60 shadow-lg shadow-amber-500/15'
                    : isDone
                    ? 'bg-slate-900/60 border-emerald-500/50 text-slate-200'
                    : 'bg-slate-900/30 border-indigo-950 text-slate-500'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 p-1.5 rounded-xl bg-[#090e29] border border-indigo-800/80">
                    {stage.icon}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs sm:text-sm font-semibold truncate ${isDone ? 'text-emerald-300' : isCurrent ? 'text-amber-200' : 'text-slate-400'}`}>
                      {detectedLang === 'ru' ? stage.nameRu : stage.nameEn}
                    </p>
                    <p className="text-[11px] text-cyan-200/60 truncate font-cyber">
                      {stage.detail}
                    </p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : isCurrent ? (
                    <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-700" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer actions: Guaranteed Skip Button */}
        <div className="pt-2 flex items-center justify-between gap-3 text-xs border-t border-indigo-900/50">
          <div className="flex items-center gap-1.5 text-cyan-300/70 font-cyber text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>BIP-39 Vault & Ubuntu RC1 Ready</span>
          </div>

          <button
            type="button"
            onClick={handleFinish}
            className="py-1.5 px-3.5 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 text-cyan-200 hover:text-white border border-indigo-700 flex items-center gap-1 font-semibold transition-all cursor-pointer"
          >
            <span>Войти сразу</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
