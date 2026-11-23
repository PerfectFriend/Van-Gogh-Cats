import React, { useState } from 'react';
import { 
  Terminal, 
  Download, 
  Check, 
  Copy, 
  Sparkles, 
  Monitor, 
  Layers, 
  X, 
  CheckCircle2, 
  ExternalLink,
  Code,
  FolderDown,
  Cpu,
  Package,
  FileText,
  BookOpen
} from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface UbuntuDesktopModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UbuntuDesktopModal: React.FC<UbuntuDesktopModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'deb' | 'installer' | 'pwa_chrome' | 'manual'>('deb');

  if (!isOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const cleanUrl = currentUrl.endsWith('/') ? currentUrl.slice(0, -1) : currentUrl;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const oneLineCommand = `curl -sSL ${cleanUrl}/install-ubuntu.sh | bash -s -- "${cleanUrl}"`;
  const packageBuildCmd = `APP_URL="${cleanUrl}" npm run package:ubuntu && sudo apt install ./dist/packages/vangogh-cats-gallery_latest_all.deb`;

  const desktopEntryContent = `[Desktop Entry]
Version=1.0
Type=Application
Name=${t.appTitle}
GenericName=Art Gallery & AI Studio
Comment=${t.appSubtitle}
Exec=google-chrome --app="${cleanUrl}" --class=vangogh-cats-gallery %u
Icon=${cleanUrl}/pwa-512x512.png
Terminal=false
Categories=Graphics;Photography;Art;AudioVideo;
StartupWMClass=vangogh-cats-gallery
Keywords=VanGogh;Cats;Art;Gallery;AI;Masterpiece;`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-ubuntu-title"
    >
      <div className="relative w-full max-w-2xl cyber-gaudi-card border-2 border-cyan-400/50 rounded-3xl shadow-[0_0_50px_rgba(0,245,212,0.25)] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header with Ubuntu Warm Gradient Theme */}
        <div className="relative p-5 sm:p-6 bg-gradient-to-r from-[#0c0824] via-[#101740] to-[#080d2c] border-b border-indigo-900/60 z-10">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 hover:bg-slate-800 transition cursor-pointer"
            aria-label={t.close}
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-600 via-amber-600 to-amber-400 p-2 shadow-lg flex items-center justify-center border border-amber-300/40">
              <Monitor className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-orange-600/30 text-orange-300 font-bold border border-orange-500/40 flex items-center gap-1">
                  <Package className="w-3.5 h-3.5" /> Ubuntu Linux .deb
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-400/30">
                  v1.0.0 Release
                </span>
              </div>
              <h2 id="modal-ubuntu-title" className="text-xl font-bold text-amber-100 mt-1 font-serif tracking-wide flex items-center gap-2">
                {t.ubuntuModalTitle}
              </h2>
              <p className="text-xs text-slate-300">
                {t.ubuntuModalSubtitle}
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-950/90 p-1.5 mt-4 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setActiveTab('deb')}
              className={`py-2 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'deb'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Пакет .DEB</span>
            </button>

            <button
              onClick={() => setActiveTab('installer')}
              className={`py-2 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'installer'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>{t.ubuntuTabTerminal}</span>
            </button>

            <button
              onClick={() => setActiveTab('pwa_chrome')}
              className={`py-2 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'pwa_chrome'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>{t.ubuntuTabPwa}</span>
            </button>

            <button
              onClick={() => setActiveTab('manual')}
              className={`py-2 px-2 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'manual'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Руководство & Tar</span>
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto text-slate-300 text-sm">
          {/* TAB 0: Local .deb package builder */}
          {activeTab === 'deb' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-950/50 via-amber-950/30 to-slate-900 border border-orange-500/40 shadow-inner space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-400" />
                    <div>
                      <span className="font-bold text-amber-200 text-sm">
                        Сборка Debian-пакета (.deb) из исходников
                      </span>
                      <p className="text-[11px] text-slate-300">
                        Для Ubuntu 20.04, 22.04, 24.04 LTS — собирается в dist/packages/
                      </p>
                    </div>
                  </div>
                  <a
                    href="/install-ubuntu.sh"
                    download="install-ubuntu.sh"
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
                  >
                    <Download className="w-4 h-4" />
                    <span>Скачать install-ubuntu.sh</span>
                  </a>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed pt-1">
                  Соберите и установите пакет .deb одной командой из корня репозитория:
                </p>

                <div className="relative">
                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-mono overflow-x-auto leading-relaxed select-all">
                    {packageBuildCmd}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(packageBuildCmd, 'deb_wget')}
                    className="absolute top-2 right-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
                  >
                    {copiedKey === 'deb_wget' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'deb_wget' ? t.ubuntuCopied : t.ubuntuCopyCmd}</span>
                  </button>
                </div>
              </div>

              {/* Package specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase">Пакет</span>
                  <p className="font-mono text-amber-300 text-[11px] truncate">vangogh-cats-gallery</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase">Версия</span>
                  <p className="font-mono text-emerald-300 text-[11px]">1.0.0</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase">Архитектура</span>
                  <p className="font-mono text-sky-300 text-[11px]">all (x86_64/arm)</p>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-0.5">
                  <span className="text-[10px] text-slate-400 uppercase">Каталог</span>
                  <p className="font-mono text-yellow-300 text-[11px]">dist/packages/</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: 1-Click Terminal Installer */}
          {activeTab === 'installer' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-950/40 via-amber-950/30 to-slate-900 border border-orange-500/40 shadow-inner space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-200 text-sm flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    {t.ubuntuOneClickTitle}:
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {t.ubuntuOneClickDesc}
                </p>

                <div className="relative">
                  <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-mono overflow-x-auto leading-relaxed select-all">
                    {oneLineCommand}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(oneLineCommand, 'oneline')}
                    className="absolute top-2 right-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow"
                  >
                    {copiedKey === 'oneline' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'oneline' ? t.ubuntuCopied : t.ubuntuCopyCmd}</span>
                  </button>
                </div>
              </div>

              {/* Direct script download button */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-800/60 border border-slate-700 text-xs">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-200">{t.ubuntuDownloadDesktop}:</p>
                  <p className="text-slate-400"><span className="font-mono text-amber-300">install-ubuntu.sh</span></p>
                </div>
                <a
                  href="/install-ubuntu.sh"
                  download="install-ubuntu.sh"
                  className="px-3.5 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-amber-200 font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-600"
                >
                  <Download className="w-3.5 h-3.5 text-yellow-400" />
                  <span>install-ubuntu.sh</span>
                </a>
              </div>

              {/* Feature Highlights on Linux */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>GNOME Dock</span>
                  </div>
                  <p className="text-slate-400">Dash & Launcher integration.</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Native Window</span>
                  </div>
                  <p className="text-slate-400">Standalone --app window without tabs.</p>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>P2P & Offline</span>
                  </div>
                  <p className="text-slate-400">Service Worker & IndexedDB local cache.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: PWA Browser Install in 1-Click */}
          {activeTab === 'pwa_chrome' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Google Chrome, Chromium, Brave, Microsoft Edge:
              </p>

              <div className="rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-200 text-xs">PWA Omnibox:</span>
                  <span className="text-[11px] text-slate-400">Browser address bar</span>
                </div>

                <div className="flex items-center justify-between bg-slate-900 px-3.5 py-2.5 rounded-lg border border-slate-800 text-xs">
                  <div className="flex items-center gap-2 text-slate-300 truncate">
                    <span className="text-emerald-400 font-mono text-[11px]">🔒 https://</span>
                    <span className="font-mono text-slate-200">{cleanUrl.replace(/^https?:\/\//, '')}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold animate-pulse">
                      <FolderDown className="w-3.5 h-3.5" />
                      <span>Install</span>
                    </div>
                  </div>
                </div>

                <ol className="list-decimal list-inside space-y-2 text-xs text-slate-300 pt-1">
                  <li>Нажмите на значок установки справа в адресной строке браузера.</li>
                  <li>Подтвердите добавление приложения в систему.</li>
                  <li>Запускайте напрямую через меню Super или Ubuntu Dock.</li>
                </ol>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-600/40 text-xs space-y-1.5">
                <span className="font-bold text-blue-200">Быстрый запуск из CLI:</span>
                <div className="relative">
                  <pre className="p-2.5 rounded-lg bg-slate-950 text-sky-300 font-mono overflow-x-auto text-[11px]">
                    google-chrome --app="{cleanUrl}"
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`google-chrome --app="${cleanUrl}"`, 'chrome_app')}
                    className="absolute top-1.5 right-1.5 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] cursor-pointer"
                  >
                    {copiedKey === 'chrome_app' ? t.ubuntuCopied : t.copy}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Tarball & Systemd */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-200 text-xs flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-amber-400" />
                    Портативный архив (.tar.gz) и документация (README.md)
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Скрипт <code className="text-amber-300">npm run package:ubuntu</code> собирает оба дистрибутива (.deb и .tar.gz) в <code className="text-cyan-300">dist/packages/</code>. Подробная документация находится в <code className="text-amber-300">README.md</code> в корне проекта.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <a
                    href="/install-ubuntu.sh"
                    download="install-ubuntu.sh"
                    className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать install-ubuntu.sh</span>
                  </a>
                  <button
                    onClick={() => copyToClipboard('npm run package:ubuntu', 'pkg_cmd')}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-200 border border-slate-600 font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    {copiedKey === 'pkg_cmd' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-yellow-400" />}
                    <span>{copiedKey === 'pkg_cmd' ? t.ubuntuCopied : 'Копировать npm run package:ubuntu'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-200 text-xs">Автономный локальный запуск через Systemd:</span>
                <div className="relative">
                  <pre className="p-3 rounded-lg bg-slate-950 text-xs text-amber-300 font-mono overflow-x-auto leading-relaxed">
                    sudo tee /etc/systemd/system/vangogh-cats.service &lt;&lt; 'EOF'{'\n'}
                    [Unit]{'\n'}
                    Description=Van Gogh Cats Gallery Daemon{'\n'}
                    After=network.target{'\n'}{'\n'}
                    [Service]{'\n'}
                    Type=simple{'\n'}
                    User=$USER{'\n'}
                    WorkingDirectory=${process.env.PWD || '/var/www/vangogh-cats'}{'\n'}
                    ExecStart=/usr/bin/npm start{'\n'}
                    Restart=on-failure{'\n'}{'\n'}
                    [Install]{'\n'}
                    WantedBy=multi-user.target{'\n'}
                    EOF{'\n'}
                    sudo systemctl enable --now vangogh-cats
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-orange-400" />
            <span>Ubuntu 20.04, 22.04, 24.04 LTS & GNOME</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
          >
            {t.ubuntuCloseBtn || t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
