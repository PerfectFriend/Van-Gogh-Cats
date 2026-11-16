import React, { useState, useEffect } from 'react';
import { Terminal, Shield, Download, HardDrive, Bell, Volume2, ClipboardCheck, Radio, CheckCircle2, AlertCircle, RefreshCw, Smartphone, Monitor, Crown, ExternalLink } from 'lucide-react';
import { SystemPermissionStatus } from '../types';
import { getStoredPermissions, saveStoredPermissions } from '../utils/profileManager';
import { StyleThemeSelectorBar } from './theming/StyleThemeSelectorBar';

interface SystemPlatformsViewProps {
  onOpenUbuntuModal: () => void;
  onOpenAndroidModal: () => void;
  onOpenProModal: () => void;
  isPro: boolean;
  artworksCount: number;
}

export const SystemPlatformsView: React.FC<SystemPlatformsViewProps> = ({
  onOpenUbuntuModal,
  onOpenAndroidModal,
  onOpenProModal,
  isPro,
  artworksCount,
}) => {
  const [permissions, setPermissions] = useState<SystemPermissionStatus>(getStoredPermissions());
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const checkLivePermissions = async () => {
    const cur = { ...permissions };
    if (typeof window !== 'undefined' && 'Notification' in window) {
      cur.notifications = Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'prompt';
    }
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      try {
        const persisted = await navigator.storage.persisted();
        if (persisted) cur.persistentStorage = 'granted';
      } catch {}
    }
    setPermissions(cur);
  };

  useEffect(() => {
    checkLivePermissions();
  }, []);

  const handleCopy = (text: string, id: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedCmd(id);
      setTimeout(() => setCopiedCmd(null), 3000);
    }
  };

  const handleGrantNotification = async () => {
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      const updated: SystemPermissionStatus = { ...permissions, notifications: res === 'granted' ? 'granted' : 'denied' };
      setPermissions(updated);
      saveStoredPermissions(updated);
    }
  };

  const handleGrantStorage = async () => {
    if (navigator.storage && navigator.storage.persist) {
      const persisted = await navigator.storage.persist();
      const updated: SystemPermissionStatus = { ...permissions, persistentStorage: persisted ? 'granted' : 'denied' };
      setPermissions(updated);
      saveStoredPermissions(updated);
    }
  };

  const handleGrantAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        ctx.resume().then(() => ctx.close());
      }
    } catch {}
    const updated: SystemPermissionStatus = { ...permissions, audio: 'granted' };
    setPermissions(updated);
    saveStoredPermissions(updated);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0a0f2b] via-[#0d163d] to-[#070b24] border border-cyan-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-600 p-0.5 shadow-xl shadow-cyan-500/20 shrink-0">
            <div className="w-full h-full bg-[#080d26] rounded-2xl flex items-center justify-center">
              <Monitor className="w-8 h-8 text-cyan-300" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-cyan-200">
              Система, Платформы и Разрешения
            </h1>
            <p className="text-xs sm:text-sm text-cyan-200/80 font-cyber">
              Пакеты для Ubuntu Linux RC1, PWA Android, аудит системных разрешений и темы
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={onOpenUbuntuModal}
            className="py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-950 transition-all cursor-pointer"
          >
            <Terminal className="w-4 h-4" />
            <span>Ubuntu RC1 Центр</span>
          </button>

          <button
            onClick={onOpenAndroidModal}
            className="py-2.5 px-4 rounded-xl bg-indigo-900/70 hover:bg-indigo-800 border border-indigo-700 text-cyan-200 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Android PWA</span>
          </button>
        </div>
      </div>

      {/* Grid: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Col 1: System Permissions Audit & Status */}
        <div className="p-6 rounded-3xl bg-[#0a0f2b]/90 border border-indigo-900/80 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-slate-100">Системные разрешения приложения</h2>
            </div>
            <button
              onClick={checkLivePermissions}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-indigo-950"
              title="Обновить статус"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-cyan-200/70 font-cyber">
            Зафиксированные системные доступы браузера и операционной системы:
          </p>

          <div className="space-y-3">
            {/* Notifications */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Bell className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Системные уведомления</p>
                  <p className="text-[11px] text-cyan-300/60">P2P оповещения о полотнах и спорах</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-cyber ${permissions.notifications === 'granted' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'bg-rose-950 text-rose-300 border border-rose-500/50'}`}>
                  {permissions.notifications === 'granted' ? 'Предоставлено' : 'Не активно'}
                </span>
                {permissions.notifications !== 'granted' && (
                  <button onClick={handleGrantNotification} className="px-2 py-1 rounded bg-indigo-900 text-[10px] text-cyan-200 hover:bg-indigo-800">
                    Запросить
                  </button>
                )}
              </div>
            </div>

            {/* Persistent Storage */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <HardDrive className="w-4 h-4 text-cyan-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Постоянное хранилище (IndexedDB)</p>
                  <p className="text-[11px] text-cyan-300/60">Защита кэша 1024x1024 картин от очистки</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-cyber ${permissions.persistentStorage === 'granted' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50' : 'bg-amber-950 text-amber-300 border border-amber-500/50'}`}>
                  {permissions.persistentStorage === 'granted' ? 'Активно' : 'Ограничено'}
                </span>
                {permissions.persistentStorage !== 'granted' && (
                  <button onClick={handleGrantStorage} className="px-2 py-1 rounded bg-indigo-900 text-[10px] text-cyan-200 hover:bg-indigo-800">
                    Включить
                  </button>
                )}
              </div>
            </div>

            {/* Web Audio */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-purple-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Web Audio API / Аудиогид</p>
                  <p className="text-[11px] text-cyan-300/60">Воспроизведение Edge-TTS без ограничений</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-cyber bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                  Готово
                </span>
                <button onClick={handleGrantAudio} className="px-2 py-1 rounded bg-indigo-900 text-[10px] text-cyan-200 hover:bg-indigo-800">
                  Тест
                </button>
              </div>
            </div>

            {/* Clipboard */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ClipboardCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">Буфер обмена (Clipboard API)</p>
                  <p className="text-[11px] text-cyan-300/60">Копирование сид-фраз, ключей и ссылок</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-cyber bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                Разрешено
              </span>
            </div>

            {/* Network / WebRTC */}
            <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Radio className="w-4 h-4 text-orange-400 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-slate-200">LAN Discovery & WebRTC STUN</p>
                  <p className="text-[11px] text-cyan-300/60">Прямое сопряжение двух хостов Ubuntu</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-cyber bg-emerald-950 text-emerald-300 border border-emerald-500/50">
                Готово
              </span>
            </div>
          </div>
        </div>

        {/* Col 2: Ubuntu RC1 Packages & Dual-Host LAN pairing */}
        <div className="p-6 rounded-3xl bg-[#0a0f2b]/90 border border-orange-500/40 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-bold text-slate-100">Ubuntu Linux Release Candidate 1</h2>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-cyber bg-orange-950 border border-orange-500/60 text-orange-300">
              RC1
            </span>
          </div>

          <p className="text-xs text-cyan-200/70 font-cyber">
            Готовые бинарные дистрибутивы для хостов Ubuntu 22.04 / 24.04 LTS:
          </p>

          {/* Download Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <a
              href="/vangogh-cats-gallery_latest_all.deb"
              download
              className="p-3.5 rounded-2xl bg-orange-950/40 hover:bg-orange-900/50 border border-orange-500/50 flex items-center gap-3 text-orange-200 transition-all cursor-pointer"
            >
              <Download className="w-5 h-5 text-orange-400 shrink-0" />
              <div>
                <p className="text-xs font-bold">Скачать .deb пакет</p>
                <p className="text-[10px] text-orange-300/70 font-cyber">Ubuntu 22.04 / 24.04</p>
              </div>
            </a>

            <a
              href="/vangogh-cats-gallery_latest_linux.tar.gz"
              download
              className="p-3.5 rounded-2xl bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-700/60 flex items-center gap-3 text-cyan-200 transition-all cursor-pointer"
            >
              <Download className="w-5 h-5 text-cyan-400 shrink-0" />
              <div>
                <p className="text-xs font-bold">Скачать .tar.gz архив</p>
                <p className="text-[10px] text-cyan-300/70 font-cyber">Портативная версия</p>
              </div>
            </a>
          </div>

          {/* Fast deployment CLI snippet */}
          <div className="space-y-2">
            <label className="text-xs font-cyber text-slate-300">Быстрое развёртывание на двух хостах:</label>
            <div className="p-3 rounded-xl bg-slate-950 border border-indigo-900 font-mono text-xs text-amber-300 flex items-center justify-between gap-2 overflow-x-auto">
              <span className="truncate">./scripts/setup-ubuntu-dual-host.sh</span>
              <button
                onClick={() => handleCopy('./scripts/setup-ubuntu-dual-host.sh', 'dual')}
                className="px-2 py-1 rounded bg-indigo-900 text-[10px] text-cyan-200 hover:bg-indigo-800 shrink-0"
              >
                {copiedCmd === 'dual' ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
          </div>

          {/* Service status CLI snippet */}
          <div className="space-y-2">
            <label className="text-xs font-cyber text-slate-300">Проверка службы systemd:</label>
            <div className="p-3 rounded-xl bg-slate-950 border border-indigo-900 font-mono text-xs text-cyan-300 flex items-center justify-between gap-2 overflow-x-auto">
              <span className="truncate">systemctl status vangogh-gallery.service</span>
              <button
                onClick={() => handleCopy('systemctl status vangogh-gallery.service', 'sys')}
                className="px-2 py-1 rounded bg-indigo-900 text-[10px] text-cyan-200 hover:bg-indigo-800 shrink-0"
              >
                {copiedCmd === 'sys' ? 'Скопировано!' : 'Копировать'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Style Theme Customizer Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-slate-100">Художественные темы оформления галереи</h2>
        </div>
        <StyleThemeSelectorBar />
      </div>
    </div>
  );
};
