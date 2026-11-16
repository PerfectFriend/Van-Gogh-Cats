import React, { useState } from 'react';
import { Smartphone, Download, X, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTranslation } from '../context/LanguageContext';

interface AndroidInstallBannerProps {
  onOpenModal: () => void;
}

export const AndroidInstallBanner: React.FC<AndroidInstallBannerProps> = ({ onOpenModal }) => {
  const { isInstallable, isInstalled, install, triggerHaptic } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);
  const { t } = useTranslation();

  // Don't show if already installed in standalone mode, or if user dismissed it this session
  if (isInstalled || isDismissed) {
    return null;
  }

  const handleBannerClick = async () => {
    triggerHaptic(25);
    if (isInstallable) {
      const outcome = await install();
      if (outcome !== 'accepted') {
        onOpenModal();
      }
    } else {
      onOpenModal();
    }
  };

  return (
    <aside 
      aria-label={t.androidInstallBtn}
      className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-bounce-subtle"
    >
      <div className="relative p-3.5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 border border-amber-500/40 shadow-2xl shadow-black/80 flex items-center gap-3">
        {/* App Icon */}
        <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-400/40 p-1 flex items-center justify-center shrink-0">
          <img src="/pwa-192x192.png" alt={t.appTitle} className="w-full h-full object-contain rounded-lg" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
              <Smartphone className="w-3 h-3" /> Android
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
          </div>
          <p className="text-xs font-semibold text-slate-100 truncate">
            {t.appTitle}
          </p>
          <p className="text-[11px] text-slate-400 truncate">
            {isInstallable ? t.androidBannerQuickInstall : t.androidBannerGuide}
          </p>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            id="quick-android-install-banner-btn"
            onClick={handleBannerClick}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-amber-950/40 transition transform active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t.androidInstallBtn}</span>
          </button>

          <button
            id="dismiss-android-banner-btn"
            onClick={() => {
              triggerHaptic(10);
              setIsDismissed(true);
            }}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            aria-label={t.close}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
