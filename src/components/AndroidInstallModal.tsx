import React, { useState } from 'react';
import { 
  Smartphone, 
  Download, 
  CheckCircle2, 
  MoreVertical, 
  X, 
  Sparkles, 
  Layers, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTranslation } from '../context/LanguageContext';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { isInstallable, isInstalled, isInAppBrowser, isInIframe, install, triggerHaptic } = usePWAInstall();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pwa' | 'apk'>('pwa');
  const [installStatusMsg, setInstallStatusMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.href : 'https://ais-pre-ypwd3d2freqhamtros5prz-468670053177.europe-west3.run.app';

  const handleInstallClick = async () => {
    triggerHaptic(30);
    setInstallStatusMsg(t.androidStatusRequesting);
    const outcome = await install();
    if (outcome === 'accepted') {
      setInstallStatusMsg(t.androidStatusSuccess);
      setTimeout(() => onClose(), 1500);
    } else if (outcome === 'dismissed') {
      setInstallStatusMsg(t.androidStatusCancelled);
    } else {
      setInstallStatusMsg(t.androidStatusManual);
    }
  };

  const handleCopyUrl = () => {
    triggerHaptic(15);
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShare = async () => {
    triggerHaptic(15);
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.appTitle,
          text: t.appSubtitle,
          url: currentUrl,
        });
      } catch {
        handleCopyUrl();
      }
    } else {
      handleCopyUrl();
    }
  };

  const handleOpenExternal = () => {
    triggerHaptic(15);
    window.open(currentUrl, '_blank');
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(label);
    triggerHaptic(15);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-android-title"
    >
      <div 
        className="relative w-full max-w-xl cyber-gaudi-card border-2 border-cyan-400/50 rounded-3xl shadow-[0_0_50px_rgba(0,245,212,0.25)] overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header background with starry swirl theme */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-[#0c0824] via-[#101740] to-[#080d2c] border-b border-indigo-900/60 z-10">
          <button 
            id="close-android-modal-btn"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer"
            aria-label={t.close}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400/50 p-1.5 flex items-center justify-center shadow-lg shrink-0">
              <img src="/pwa-192x192.png" alt={t.appTitle} className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5" /> Android PWA App
                </span>
                {isInstalled && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-300 font-medium border border-blue-400/30">
                    ✓ {t.androidStatusSuccess?.split?.('.')?.[0] || 'Installed'}
                  </span>
                )}
              </div>
              <h2 id="modal-android-title" className="text-xl font-bold text-amber-200 mt-1 font-serif tracking-wide">
                {t.androidModalTitle}
              </h2>
              <p className="text-xs text-slate-300">
                {t.androidModalSubtitle}
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex rounded-xl bg-slate-950/80 p-1 mt-4 border border-slate-700/60">
            <button
              id="tab-pwa-btn"
              onClick={() => setActiveTab('pwa')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'pwa'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-4 h-4" />
              {t.androidTabPwa}
            </button>
            <button
              id="tab-apk-btn"
              onClick={() => setActiveTab('apk')}
              className={`flex-1 py-2 px-3 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'apk'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" />
              {t.androidTabManual}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-slate-300 text-sm">
          {activeTab === 'pwa' ? (
            <div className="space-y-5">
              {/* PRIMARY ACTION BUTTON: Always visible and clickable! */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-blue-900/20 border-2 border-amber-500/40 shadow-inner">
                <p className="text-amber-200 font-bold text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  {t.androidBannerQuickInstall}
                </p>

                <button
                  id="direct-android-install-action-btn"
                  onClick={handleInstallClick}
                  className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-amber-950/50 transition transform active:scale-95 cursor-pointer"
                >
                  <Download className="w-5 h-5 stroke-[2.5]" />
                  <span>{t.androidInstallBtn}</span>
                </button>

                {installStatusMsg && (
                  <p className="mt-2.5 text-xs text-amber-300 text-center font-medium bg-slate-950/60 p-2 rounded-lg border border-amber-500/30">
                    {installStatusMsg}
                  </p>
                )}
              </div>

              {/* Warning if opened inside Telegram, WhatsApp or iframe */}
              {(isInAppBrowser || isInIframe) && (
                <div className="p-3.5 rounded-xl bg-amber-950/50 border border-amber-600/50 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>In-App Browser / Iframe</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Open directly in <strong className="text-white">Google Chrome</strong>:
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      onClick={handleCopyUrl}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedLink ? t.androidCopiedLink : t.androidCopyLinkBtn}</span>
                    </button>
                    <button
                      onClick={handleOpenExternal}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{t.androidOpenExternalBtn}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* VISUAL MOCKUP: "КУДА НАЖАТЬ НА СМАРТФОНЕ В CHROME" */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-amber-200 text-sm flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    {t.androidBannerGuide}
                  </h3>
                </div>

                {/* Simulated Phone Chrome Screen */}
                <div className="rounded-xl bg-slate-950 border border-slate-700 p-3.5 shadow-xl space-y-3">
                  {/* Chrome address bar mockup */}
                  <div className="flex items-center justify-between bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs">
                    <div className="flex items-center gap-2 text-slate-400 truncate max-w-[210px] sm:max-w-[280px]">
                      <span className="text-emerald-400 font-mono text-[10px]">🔒 https://</span>
                      <span className="truncate text-slate-300 font-mono text-[11px]">ais-pre-...run.app</span>
                    </div>

                    {/* The famous 3 dots in Chrome */}
                    <div className="relative flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded animate-pulse">
                        {t.androidStep1Title} ➔
                      </span>
                      <div className="p-1 rounded-full bg-amber-500 text-slate-950 ring-4 ring-amber-500/30">
                        <MoreVertical className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* Chrome menu dropdown mockup */}
                  <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-700/80 space-y-1 text-xs">
                    <div className="py-1 px-2.5 text-slate-500">New Tab</div>
                    <div className="py-1 px-2.5 text-slate-500">Downloads</div>
                    
                    {/* The Target Line: Install App */}
                    <div className="relative py-2 px-3 rounded-md bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold flex items-center justify-between shadow-md">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4" />
                        <span>{t.androidInstallBtn}</span>
                      </div>
                      <span className="text-[11px] bg-slate-950 text-amber-300 px-2 py-0.5 rounded-full font-mono">
                        {t.androidStep2Title} ➔
                      </span>
                    </div>

                    <div className="py-1 px-2.5 text-slate-500">Desktop Site</div>
                  </div>
                </div>

                {/* Numbered quick steps */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/70 flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">1</span>
                    <p className="text-xs text-slate-300">
                      {t.androidStep1Desc}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/70 flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">2</span>
                    <p className="text-xs text-slate-300">
                      {t.androidStep2Desc}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/70 flex items-start gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center shrink-0">3</span>
                    <p className="text-xs text-slate-300">
                      {t.androidStep3Desc}
                    </p>
                  </div>
                </div>
              </div>

              {/* Share & Quick URL Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3.5 rounded-xl bg-slate-800/50 border border-slate-700 text-xs">
                <div className="truncate max-w-[240px] sm:max-w-xs text-slate-400 font-mono text-[11px]">
                  {currentUrl}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyUrl}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? t.androidCopiedLink : t.androidCopyLinkBtn}</span>
                  </button>
                  <button
                    onClick={handleShare}
                    className="px-3 py-1.5 rounded-lg bg-blue-900/60 hover:bg-blue-800/60 text-blue-200 font-medium text-xs flex items-center gap-1.5 border border-blue-500/30 transition cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>{t.androidShareBtn}</span>
                  </button>
                </div>
              </div>

              {/* Standalone Advantages */}
              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/30 text-xs space-y-1.5">
                <p className="text-blue-300 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {t.androidFeaturesTitle}
                </p>
                <ul className="text-slate-300 space-y-1">
                  {t.androidFeatures.map((feat, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="text-amber-400">•</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                APK & Google Play Store:
              </p>

              {/* Option A: Bubblewrap (Google TWA) */}
              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-200 text-xs flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                    Google Bubblewrap CLI (TWA)
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold">Official</span>
                </div>
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-slate-950 text-xs text-amber-300 font-mono overflow-x-auto leading-relaxed">
                    npm i -g @bubblewrap/cli{'\n'}
                    bubblewrap init --manifest {currentUrl}manifest.webmanifest{'\n'}
                    bubblewrap build
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`npm i -g @bubblewrap/cli && bubblewrap init --manifest ${currentUrl}manifest.webmanifest && bubblewrap build`, 'bubblewrap')}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
                  >
                    {copiedCmd === 'bubblewrap' ? t.copied : t.copy}
                  </button>
                </div>
              </div>

              {/* Option B: Capacitor */}
              <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700 space-y-2.5">
                <span className="font-bold text-amber-200 text-xs flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>
                  Capacitor (Android Studio)
                </span>
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-slate-950 text-xs text-sky-300 font-mono overflow-x-auto leading-relaxed">
                    npm i @capacitor/core @capacitor/android{'\n'}
                    npx cap init "{t.appTitle}" com.vangoghcats.gallery{'\n'}
                    npx cap add android{'\n'}
                    npx cap open android
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`npm i @capacitor/core @capacitor/android && npx cap init "${t.appTitle}" com.vangoghcats.gallery && npx cap add android && npx cap open android`, 'capacitor')}
                    className="absolute top-2 right-2 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs cursor-pointer"
                  >
                    {copiedCmd === 'capacitor' ? t.copied : t.copy}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Android Smartphone & Tablet PWA
          </div>
          <button
            id="close-android-modal-footer-btn"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
