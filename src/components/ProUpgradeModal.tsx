import React from 'react';
import { Sparkles, Crown, Check, X, ShieldCheck, Zap, HardDrive, Palette } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';

interface ProUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  onActivatePro: () => void;
  onDeactivatePro: () => void;
}

export const ProUpgradeModal: React.FC<ProUpgradeModalProps> = ({
  isOpen,
  onClose,
  isPro,
  onActivatePro,
  onDeactivatePro
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="cyber-gaudi-card border-2 border-amber-400/60 rounded-3xl max-w-lg w-full p-6 sm:p-8 text-slate-100 shadow-[0_0_50px_rgba(255,183,3,0.25)] relative my-8 animate-fade-in overflow-hidden">
        {/* Glow ambient */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-[#121946] hover:bg-[#1a256a] text-cyan-200 flex items-center justify-center transition cursor-pointer border border-cyan-500/30 text-lg"
        >
          ×
        </button>

        {/* Crown Icon Header */}
        <div className="text-center space-y-3 pb-6 border-b border-indigo-900/60 relative z-10">
          <div className="w-16 h-16 mx-auto rounded-2xl cyber-btn-gold flex items-center justify-center text-slate-950 shadow-xl border border-amber-300">
            <Crown className="w-9 h-9 fill-current" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-cyan-300 flex items-center justify-center gap-2">
            <span>Музейный Патронат PRO</span>
          </h2>
          <p className="text-xs sm:text-sm text-cyan-200/80 max-w-sm mx-auto font-sans">
            Поддержите децентрализованную P2P-галерею живописи и откройте безупречный музейный опыт без рекламы
          </p>
        </div>

        {/* Perks List */}
        <div className="py-6 space-y-3.5 relative z-10">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#080d2c]/80 border border-indigo-900/60">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center shrink-0 border border-cyan-500/30">
              <Check className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-cyan-200 font-cyber">100% Отключение всей спонсорской рекламы</h4>
              <p className="text-[11px] text-slate-300/80 font-sans">Никаких баннеров и вставок корма в ленте картин и модальных окнах.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#080d2c]/80 border border-indigo-900/60">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-yellow-300 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Zap className="w-4 h-4 text-yellow-300" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-yellow-200 font-cyber">Приоритет в P2P-очереди WebRTC</h4>
              <p className="text-[11px] text-slate-300/80 font-sans">Ускоренная синхронизация шедевров между узлами друзей без задержек.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#080d2c]/80 border border-indigo-900/60">
            <div className="w-8 h-8 rounded-xl bg-fuchsia-500/15 text-fuchsia-300 flex items-center justify-center shrink-0 border border-fuchsia-500/30">
              <Crown className="w-4 h-4 text-fuchsia-300" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-fuchsia-200 font-cyber">Золотой знак «Меценат Музея»</h4>
              <p className="text-[11px] text-slate-300/80 font-sans">Особый золотой бейдж в профиле пира и повышенный авторитет в жюри аудиторов.</p>
            </div>
          </div>
        </div>

        {/* Current status & Action */}
        <div className="pt-2 text-center space-y-4 relative z-10">
          {isPro ? (
            <div className="space-y-3">
              <div className="py-2.5 px-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2 shadow-inner">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                <span>У вас активен статус PRO Мецената (Реклама отключена)</span>
              </div>
              <button
                onClick={() => {
                  onDeactivatePro();
                  onClose();
                }}
                className="text-xs text-cyan-300/80 hover:text-cyan-100 underline cursor-pointer"
              >
                Вернуться на бесплатный тариф со спонсорскими картинами
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl font-bold text-yellow-300 font-gaudi">Бесплатно</span>
                <span className="text-xs text-cyan-200/70">/ в рамках открытой беты</span>
              </div>
              <button
                onClick={() => {
                  onActivatePro();
                  onClose();
                }}
                className="w-full py-3.5 rounded-2xl cyber-btn-gold text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-xl transition active:scale-95 cursor-pointer font-cyber"
              >
                <Crown className="w-4 h-4 text-slate-950 fill-current" />
                <span>Активировать PRO и отключить рекламу</span>
              </button>
              <p className="text-[10px] text-cyan-300/60 font-mono">
                Моментальная активация статуса в локальном P2P-хранилище устройства
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
