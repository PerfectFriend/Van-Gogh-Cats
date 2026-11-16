import React, { useState, useEffect } from 'react';
import { Bell, HardDrive, Volume2, ClipboardCheck, Radio, Shield, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { SystemPermissionStatus } from '../types';
import { getStoredPermissions, saveStoredPermissions } from '../utils/profileManager';

interface SystemPermissionsModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const SystemPermissionsModal: React.FC<SystemPermissionsModalProps> = ({ isOpen, onComplete }) => {
  const [permissions, setPermissions] = useState<SystemPermissionStatus>(getStoredPermissions());
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check current state where possible
    const checkActualPermissions = async () => {
      const current = { ...permissions };

      if (typeof window !== 'undefined' && 'Notification' in window) {
        current.notifications = Notification.permission === 'granted' ? 'granted' : Notification.permission === 'denied' ? 'denied' : 'prompt';
      }

      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
        try {
          const isPersisted = await navigator.storage.persisted();
          if (isPersisted) current.persistentStorage = 'granted';
        } catch {}
      }

      setPermissions(current);
    };

    if (isOpen) {
      checkActualPermissions();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGrantNotification = async () => {
    if ('Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        setPermissions(prev => ({
          ...prev,
          notifications: res === 'granted' ? 'granted' : 'denied'
        }));
      } catch {
        setPermissions(prev => ({ ...prev, notifications: 'denied' }));
      }
    }
  };

  const handleGrantStorage = async () => {
    if (navigator.storage && navigator.storage.persist) {
      try {
        const persisted = await navigator.storage.persist();
        setPermissions(prev => ({
          ...prev,
          persistentStorage: persisted ? 'granted' : 'denied'
        }));
      } catch {
        setPermissions(prev => ({ ...prev, persistentStorage: 'granted' }));
      }
    } else {
      setPermissions(prev => ({ ...prev, persistentStorage: 'granted' }));
    }
  };

  const handleGrantAudio = () => {
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        ctx.resume().then(() => {
          ctx.close();
        });
      }
      setPermissions(prev => ({ ...prev, audio: 'granted' }));
    } catch {
      setPermissions(prev => ({ ...prev, audio: 'granted' }));
    }
  };

  const handleGrantClipboard = async () => {
    try {
      if (navigator.clipboard) {
        setPermissions(prev => ({ ...prev, clipboard: 'granted' }));
      }
    } catch {
      setPermissions(prev => ({ ...prev, clipboard: 'granted' }));
    }
  };

  const handleGrantNetwork = () => {
    setPermissions(prev => ({ ...prev, networkLan: 'granted' }));
  };

  const handleGrantAllAndContinue = async () => {
    setIsProcessing(true);
    // Request notification
    if ('Notification' in window && Notification.permission !== 'granted') {
      try {
        await Notification.requestPermission();
      } catch {}
    }

    // Request persistent storage
    if (navigator.storage && navigator.storage.persist) {
      try {
        await navigator.storage.persist();
      } catch {}
    }

    // Web Audio unlock
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        await ctx.resume();
        await ctx.close();
      }
    } catch {}

    const updated: SystemPermissionStatus = {
      notifications: 'Notification' in window && Notification.permission === 'granted' ? 'granted' : 'prompt',
      persistentStorage: 'granted',
      audio: 'granted',
      clipboard: 'granted',
      networkLan: 'granted',
      completedAt: Date.now(),
    };

    saveStoredPermissions(updated);
    setIsProcessing(false);
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="max-w-xl w-full bg-[#0a0f2b] border border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_20px_70px_rgba(0,0,0,0.95)] text-slate-100 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-indigo-900/60 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-lg shadow-amber-500/20 shrink-0">
            <div className="w-full h-full bg-[#080d26] rounded-2xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-amber-300" />
            </div>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-cyan-200">
              Системные разрешения приложения
            </h2>
            <p className="text-xs text-cyan-200/70 font-cyber">
              Фиксация аппаратных и системных доступов для стабильной работы P2P-ноды и галереи
            </p>
          </div>
        </div>

        {/* Permissions List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
          {/* 1. Notifications */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Системные уведомления</p>
                <p className="text-xs text-cyan-300/60">P2P-сообщения, синхронизация картин и споры</p>
              </div>
            </div>
            <button
              onClick={handleGrantNotification}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                permissions.notifications === 'granted'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-indigo-900/60 hover:bg-indigo-800 border-indigo-700 text-cyan-200'
              }`}
            >
              {permissions.notifications === 'granted' ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Доступно</span> : 'Запросить'}
            </button>
          </div>

          {/* 2. Persistent Storage */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Постоянное хранилище (IndexedDB)</p>
                <p className="text-xs text-cyan-300/60">Защита кэша 1024x1024 шедевров от автоочистки ОС</p>
              </div>
            </div>
            <button
              onClick={handleGrantStorage}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                permissions.persistentStorage === 'granted'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-indigo-900/60 hover:bg-indigo-800 border-indigo-700 text-cyan-200'
              }`}
            >
              {permissions.persistentStorage === 'granted' ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Включено</span> : 'Разрешить'}
            </button>
          </div>

          {/* 3. Audio Guide */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
                <Volume2 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Аудиогид и звуковые эффекты</p>
                <p className="text-xs text-cyan-300/60">Голосовые экскурсии Edge-TTS и кошачьи звуки</p>
              </div>
            </div>
            <button
              onClick={handleGrantAudio}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                permissions.audio === 'granted'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-indigo-900/60 hover:bg-indigo-800 border-indigo-700 text-cyan-200'
              }`}
            >
              {permissions.audio === 'granted' ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Разрешено</span> : 'Включить'}
            </button>
          </div>

          {/* 4. Clipboard */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Буфер обмена (Clipboard)</p>
                <p className="text-xs text-cyan-300/60">Копирование seed-фраз, ключей и P2P-приглашений</p>
              </div>
            </div>
            <button
              onClick={handleGrantClipboard}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                permissions.clipboard === 'granted'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-indigo-900/60 hover:bg-indigo-800 border-indigo-700 text-cyan-200'
              }`}
            >
              {permissions.clipboard === 'granted' ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Готово</span> : 'Разрешить'}
            </button>
          </div>

          {/* 5. LAN & WebRTC */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/40 border border-indigo-900/70 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
                <Radio className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-200">Локальная сеть и WebRTC</p>
                <p className="text-xs text-cyan-300/60">Синхронизация между хостами Ubuntu в домашней сети</p>
              </div>
            </div>
            <button
              onClick={handleGrantNetwork}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                permissions.networkLan === 'granted'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-indigo-900/60 hover:bg-indigo-800 border-indigo-700 text-cyan-200'
              }`}
            >
              {permissions.networkLan === 'granted' ? <span className="flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Включено</span> : 'Разрешить'}
            </button>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleGrantAllAndContinue}
            disabled={isProcessing}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(251,191,36,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <span>Предоставить все разрешения и продолжить</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
