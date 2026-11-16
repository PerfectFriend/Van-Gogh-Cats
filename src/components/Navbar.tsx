import React, { useState, useEffect } from 'react';
import { Palette, Sparkles, Smartphone, Brush, Users, Monitor, Crown, Shield, Image, Sliders, Award } from 'lucide-react';
import { VAN_GOGH_QUOTES } from '../data/masterpieces';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useTranslation } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ButtonOrnamentFlourish } from './GaudiOrnaments';
import { useThemeStyle } from '../context/ThemeStyleContext';
import { MainAppTab } from '../types';

interface NavbarProps {
  artworksCount: number;
  activeModel: string;
  activeTab: MainAppTab;
  onSelectTab: (tab: MainAppTab) => void;
  onOpenAndroidModal: () => void;
  onOpenUbuntuModal: () => void;
  onOpenCatPassport: () => void;
  onOpenProModal: () => void;
  isPro: boolean;
  profilesCount?: number;
  activeProfileName?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  artworksCount, 
  activeModel, 
  activeTab,
  onSelectTab,
  onOpenAndroidModal,
  onOpenUbuntuModal,
  onOpenCatPassport,
  onOpenProModal,
  isPro,
  profilesCount = 1,
  activeProfileName,
}) => {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const { isInstalled, isInstallable } = usePWAInstall();
  const { t } = useTranslation();
  const { activeTheme } = useThemeStyle();

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex(prev => (prev + 1) % VAN_GOGH_QUOTES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const tabs: { id: MainAppTab; labelRu: string; labelEn: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'gallery',
      labelRu: 'Галерея шедевров',
      labelEn: 'Masterpiece Gallery',
      icon: <Image className="w-4 h-4 shrink-0" />,
      badge: String(artworksCount),
    },
    {
      id: 'studio',
      labelRu: 'Арт-Студия AI',
      labelEn: 'AI Art Studio',
      icon: <Brush className="w-4 h-4 shrink-0" />,
      badge: '1024x1024',
    },
    {
      id: 'network',
      labelRu: 'P2P Сеть & LAN',
      labelEn: 'P2P Network & LAN',
      icon: <Users className="w-4 h-4 shrink-0" />,
      badge: 'Dual-Host',
    },
    {
      id: 'profiles',
      labelRu: 'Профили & BIP-39',
      labelEn: 'Profiles & BIP-39',
      icon: <Shield className="w-4 h-4 shrink-0" />,
      badge: `${profilesCount}/3`,
    },
    {
      id: 'system',
      labelRu: 'Система & Ubuntu',
      labelEn: 'System & Ubuntu',
      icon: <Monitor className="w-4 h-4 shrink-0" />,
      badge: 'RC1',
    },
  ];

  return (
    <header
      style={{
        background: activeTheme.plateBg,
        borderColor: activeTheme.plateBorder
      }}
      className="sticky top-0 z-40 backdrop-blur-xl border-b shadow-[0_12px_40px_rgba(0,0,0,0.8)] text-slate-100 transition-all duration-500"
    >
      {/* Top radiant Stained-Glass rim matching artist palette */}
      <div className="h-[2.5px] w-full transition-all duration-500" style={{ background: activeTheme.plateRim }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Row 1: Brand Title & Information / Language Switcher */}
        <div className="py-2.5 sm:py-3 flex items-center justify-between gap-4 border-b border-indigo-900/40">
          {/* Brand Title */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl p-[1.5px] shadow-lg shrink-0 cursor-pointer" onClick={() => onSelectTab('gallery')} style={{ background: activeTheme.plateRim }}>
              <div className="w-full h-full bg-[#0b0e28] rounded-2xl flex items-center justify-center">
                <Brush className="w-5 h-5 text-amber-300" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-gaudi font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-cyan-200 flex items-center gap-2 truncate">
                <span>{t.appTitle}</span>
                <span
                  style={{
                    background: activeTheme.accentBadgeBg,
                    borderColor: activeTheme.accentBadgeBorder,
                    color: activeTheme.accentBadgeText
                  }}
                  className="hidden md:inline-flex items-center gap-1 text-[10px] font-cyber font-semibold px-2 py-0.5 rounded-full border shadow-sm shrink-0"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{activeTheme.themeSymbol} {activeTheme.name.split(' (')[0]}</span>
                </span>
              </h1>
              <p className="text-[11px] text-cyan-200/70 truncate hidden sm:block font-medium">
                {activeProfileName ? `Мастер: ${activeProfileName}` : t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Van Gogh Quote Ticker (Expanded & Scannable) */}
          <div className="hidden xl:flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d1238]/80 border border-amber-500/30 text-xs text-amber-200/90 max-w-sm truncate italic font-gaudi shadow-inner">
            <span className="truncate">«{t.quotes && t.quotes[quoteIndex % (t.quotes.length || 1)]}»</span>
          </div>

          {/* Right Controls: Cat Passport, PRO Button, Language Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Cat Passport Quick Modal */}
            <button
              onClick={onOpenCatPassport}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-xs text-amber-200 font-bold transition-all"
              title="Цифровые паспорта и приметы котиков"
            >
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>Паспорт кота</span>
            </button>

            {/* PRO Version / Patron Modal */}
            <button
              onClick={onOpenProModal}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                isPro
                  ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-bold shadow-md'
                  : 'bg-indigo-950/70 hover:bg-indigo-900 text-yellow-300 border border-yellow-500/40'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">{isPro ? 'PRO' : 'Без рекламы'}</span>
            </button>

            {/* Language Switcher Dropdown */}
            <LanguageSwitcher />
          </div>
        </div>

        {/* Row 2: Functional Tabs Navigation Bar */}
        <nav className="py-2 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  style={
                    isActive
                      ? {
                          background: activeTheme.buttonPrimaryBg,
                          borderColor: activeTheme.buttonPrimaryBorder,
                          color: activeTheme.buttonPrimaryText,
                          boxShadow: activeTheme.buttonPrimaryGlow,
                        }
                      : {
                          background: 'rgba(15, 23, 58, 0.6)',
                          borderColor: 'rgba(99, 102, 241, 0.25)',
                          color: '#cbd5e1',
                        }
                  }
                  className={`group relative flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 active:scale-95 border cursor-pointer ${
                    isActive
                      ? 'shadow-lg font-bold scale-[1.02]'
                      : 'hover:bg-indigo-900/40 hover:text-slate-100 hover:border-indigo-600'
                  }`}
                >
                  <ButtonOrnamentFlourish side="left" />
                  {tab.icon}
                  <span className="whitespace-nowrap">
                    {tab.labelRu}
                  </span>
                  {tab.badge && (
                    <span
                      className={`text-[10px] font-cyber px-1.5 py-0.2 rounded-full border ${
                        isActive
                          ? 'bg-black/30 border-black/20 text-current'
                          : 'bg-indigo-950/80 border-indigo-700/60 text-cyan-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                  <ButtonOrnamentFlourish side="right" />
                </button>
              );
            })}
          </div>

          {/* Quick Platform Modals */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <button
              onClick={onOpenUbuntuModal}
              className="px-2.5 py-1.5 rounded-xl bg-orange-950/40 hover:bg-orange-900/50 border border-orange-500/40 text-orange-200 text-xs font-cyber flex items-center gap-1.5 transition-all"
              title="Ubuntu RC1 бинарные пакеты"
            >
              <Monitor className="w-3.5 h-3.5 text-orange-400" />
              <span>Ubuntu RC1</span>
            </button>

            <button
              onClick={onOpenAndroidModal}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/70 border border-indigo-700/60 text-cyan-200 text-xs font-cyber flex items-center gap-1.5 transition-all"
              title="Android PWA установка"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Android PWA</span>
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};
