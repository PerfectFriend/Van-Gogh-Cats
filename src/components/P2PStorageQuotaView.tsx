import React, { useState, useEffect } from 'react';
import { HardDrive, Users, CheckCircle2, Shield, AlertCircle, RefreshCw, Database, FileCheck } from 'lucide-react';
import { StorageNodeQuota } from '../types';
import { getStorageQuotaDetails, TOTAL_8GB_BYTES, OWN_QUOTA_BYTES, FRIEND_QUOTA_BYTES } from '../utils/p2pStorage';

export const P2PStorageQuotaView: React.FC = () => {
  const [quota, setQuota] = useState<StorageNodeQuota>({
    totalCapacityBytes: TOTAL_8GB_BYTES,
    ownReservedBytes: OWN_QUOTA_BYTES,
    friendsReservedBytes: FRIEND_QUOTA_BYTES,
    ownUsedBytes: 0,
    friendsUsedBytes: 0,
    activeCustodiansCount: 0,
    wholeFilesCount: 0,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshStats();
  }, []);

  const refreshStats = async () => {
    setIsRefreshing(true);
    try {
      const stats = await getStorageQuotaDetails();
      setQuota(stats);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatMB = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1) + ' МБ';
  };

  const formatGB = (bytes: number) => {
    return (bytes / (1000 * 1000 * 1000)).toFixed(2) + ' ГБ';
  };

  const ownPercent = Math.min(100, Math.round((quota.ownUsedBytes / quota.ownReservedBytes) * 100));
  const friendsPercent = Math.min(100, Math.round((quota.friendsUsedBytes / quota.friendsReservedBytes) * 100));
  const totalPercent = Math.min(100, Math.round(((quota.ownUsedBytes + quota.friendsUsedBytes) / quota.totalCapacityBytes) * 100));

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      {/* Principle header */}
      <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-600/40 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-amber-200 flex items-center gap-2 flex-wrap">
              <span>Локальная квота IndexedDB устройства (прототип кругового резервирования)</span>
              <span className="text-[10px] bg-slate-900 text-amber-300 border border-amber-700/50 px-2 py-0.5 rounded-full font-mono">
                Прототип квоты 8 ГБ
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Расчётная модель локального браузерного хранилища IndexedDB:
              <strong> 1 600 МБ</strong> под личные картины и 
              <strong> 6 400 МБ</strong> под резервы пиров (4 слота по 1 600 МБ). Показатели ниже отражают реальный объём сохранённых на этом устройстве данных.
            </p>
          </div>
        </div>
        <button
          onClick={refreshStats}
          disabled={isRefreshing}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-amber-300 rounded-xl border border-slate-600 transition shrink-0"
          title="Обновить состояние диска"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* 8 GB Progress Bar */}
      <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-semibold uppercase tracking-wider">
            Общая квота ноды: {formatGB(quota.totalCapacityBytes)} (8 000 МБ)
          </span>
          <span className="text-amber-300 font-bold font-mono">
            Занято: {formatMB(quota.ownUsedBytes + quota.friendsUsedBytes)} / 8 000 МБ ({totalPercent}%)
          </span>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="h-5 w-full bg-slate-900 rounded-full overflow-hidden flex p-0.5 border border-slate-800">
          <div
            style={{ width: `${Math.max(2, (quota.ownUsedBytes / quota.totalCapacityBytes) * 100)}%` }}
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-l-full transition-all duration-500"
            title={`Мои шедевры: ${formatMB(quota.ownUsedBytes)}`}
          />
          <div
            style={{ width: `${Math.max(2, (quota.friendsUsedBytes / quota.totalCapacityBytes) * 100)}%` }}
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-r-full transition-all duration-500"
            title={`Резервы друзей: ${formatMB(quota.friendsUsedBytes)}`}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 flex-wrap gap-2 pt-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" />
            <span>Личные полотна: <strong>{formatMB(quota.ownUsedBytes)}</strong> из 1 600 МБ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <span>Круг 4 друзей: <strong>{formatMB(quota.friendsUsedBytes)}</strong> из 6 400 МБ</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-700 inline-block" />
            <span>Свободный резерв: <strong>{formatMB(quota.totalCapacityBytes - (quota.ownUsedBytes + quota.friendsUsedBytes))}</strong></span>
          </div>
        </div>
      </div>

      {/* 4 Custodians Grid */}
      <div className="space-y-3">
        <h4 className="font-bold text-sm text-amber-200 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-400" />
            <span>Круг взаимного хранения (4 слота по 1 600 МБ)</span>
          </span>
          <span className="text-xs font-normal text-slate-400">
            Активных хранителей: <strong className="text-emerald-400">{quota.activeCustodiansCount} / 4</strong>
          </span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((slotIdx) => {
            const isAssigned = slotIdx <= quota.activeCustodiansCount;
            const simulatedUsed =
              isAssigned && quota.activeCustodiansCount > 0
                ? Math.round(quota.friendsUsedBytes / quota.activeCustodiansCount)
                : 0;

            return (
              <div
                key={slotIdx}
                className={`p-3.5 rounded-xl border flex flex-col justify-between space-y-3 transition ${
                  isAssigned 
                    ? 'bg-slate-900/90 border-blue-500/40 hover:border-blue-400' 
                    : 'bg-slate-950/60 border-slate-800 border-dashed text-slate-500'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-200">
                      Слот {slotIdx}
                    </span>
                    {isAssigned ? (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
                        <CheckCircle2 className="w-3 h-3" />
                        Активен
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">Свободен</span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Квота: 1 600 МБ
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Использовано:</span>
                    <strong className="text-slate-200">{formatMB(simulatedUsed)}</strong>
                  </div>
                  <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, (simulatedUsed / 1600000000) * 100)}%` }}
                      className="h-full bg-blue-500 rounded-full"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 text-right">
                    Zero-Copy WebP
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Protocol highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
          <div className="text-amber-300 font-bold flex items-center gap-1.5">
            <FileCheck className="w-4 h-4" />
            <span>Цельные WebP-файлы</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Файлы сохраняются без деления на микрочанки под именем <code>&lt;SHA-256&gt;.webp</code> для мгновенного чтения за 2 мс.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
          <div className="text-blue-300 font-bold flex items-center gap-1.5">
            <Users className="w-4 h-4" />
            <span>Репликация 5 копий</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            1 оригинал у автора + 4 полные реплики на устройствах друзей гарантируют выживание коллекции при отказе устройств.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs space-y-1">
          <div className="text-emerald-300 font-bold flex items-center gap-1.5">
            <Database className="w-4 h-4" />
            <span>Tit-for-Tat контракт</span>
          </div>
          <p className="text-slate-400 text-[11px]">
            Автоматическое поддержание баланса: хранение чужих картин взамен на сохранность ваших собственных.
          </p>
        </div>
      </div>
    </div>
  );
};
