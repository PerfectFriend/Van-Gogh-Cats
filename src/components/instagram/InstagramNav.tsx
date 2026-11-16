import React, { useState } from 'react';
import {
  Home,
  Search,
  PlusSquare,
  Send,
  Menu,
  Palette,
  Award,
  Monitor,
  Smartphone,
  Crown,
  Wand2,
  RefreshCw,
  UserPlus,
  Brush,
  Shield,
} from 'lucide-react';
import { MainAppTab, StoredUserProfile } from '../../types';
import { useLongPress } from '../../hooks/useLongPress';
import { ActionMenuSheet, ActionMenuItem } from './ActionMenuSheet';
import { getAllProfiles, setActiveProfileId } from '../../utils/profileManager';

interface InstagramNavProps {
  activeTab: MainAppTab;
  onSelectTab: (tab: MainAppTab) => void;
  activeProfile: StoredUserProfile;
  onProfileChanged: (profile: StoredUserProfile) => void;
  onOpenThemeDrawer: () => void;
  onOpenCatPassport: () => void;
  onOpenUbuntuModal: () => void;
  onOpenAndroidModal: () => void;
  onOpenProModal: () => void;
  onSelectRandomCurated: () => void;
  onOpenOnboardingModal: () => void;
  isPro: boolean;
}

export const InstagramNav: React.FC<InstagramNavProps> = ({
  activeTab,
  onSelectTab,
  activeProfile,
  onProfileChanged,
  onOpenThemeDrawer,
  onOpenCatPassport,
  onOpenUbuntuModal,
  onOpenAndroidModal,
  onOpenProModal,
  onSelectRandomCurated,
  onOpenOnboardingModal,
  isPro,
}) => {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [createSheetOpen, setCreateSheetOpen] = useState(false);

  const profiles = getAllProfiles();

  // Long press handlers
  const profileLongPress = useLongPress({
    onLongPress: () => setAccountSheetOpen(true),
    onClick: () => onSelectTab('profiles'),
  });

  const createLongPress = useLongPress({
    onLongPress: () => setCreateSheetOpen(true),
    onClick: () => onSelectTab('studio'),
  });

  const brandLongPress = useLongPress({
    onLongPress: () => onOpenThemeDrawer(),
    onClick: () => {
      onSelectTab('gallery');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const moreItems: ActionMenuItem[] = [
    {
      id: 'themes',
      label: 'Темы оформления и язык',
      sublabel: '11 стилей (Ван Гог, Гауди, Климт) · 10 языков',
      icon: <Palette className="w-5 h-5 text-fuchsia-400" />,
      onClick: onOpenThemeDrawer,
    },
    {
      id: 'cat-passports',
      label: 'Паспорта котиков',
      sublabel: 'Цифровые профили и особые приметы питомцев',
      icon: <Award className="w-5 h-5 text-amber-400" />,
      onClick: onOpenCatPassport,
    },
    {
      id: 'system-view',
      label: 'Система, разрешения и Ubuntu RC1',
      sublabel: 'Пакеты .deb/.tar.gz и аудит разрешений',
      icon: <Shield className="w-5 h-5 text-cyan-400" />,
      onClick: () => onSelectTab('system'),
    },
    {
      id: 'ubuntu-modal',
      label: 'Установить на Ubuntu Linux',
      sublabel: 'Dual-Host синхронизация в локальной сети',
      icon: <Monitor className="w-5 h-5 text-orange-400" />,
      onClick: onOpenUbuntuModal,
    },
    {
      id: 'android-modal',
      label: 'Установить Android PWA',
      sublabel: 'Автономное приложение на телефон',
      icon: <Smartphone className="w-5 h-5 text-emerald-400" />,
      onClick: onOpenAndroidModal,
    },
    {
      id: 'pro',
      label: isPro ? 'PRO Патронат активен' : 'PRO Без рекламы',
      sublabel: 'Отключение карточек дегустации кормов',
      icon: <Crown className="w-5 h-5 text-yellow-400" />,
      onClick: onOpenProModal,
      highlight: true,
    },
  ];

  const accountItems: ActionMenuItem[] = [
    ...profiles.map((p) => ({
      id: `acc-${p.id}`,
      label: p.name,
      sublabel: p.hasBip39Wallet ? 'BIP-39 Vault' : 'Локальный профиль',
      icon: (
        <div
          className={`w-8 h-8 rounded-full bg-gradient-to-tr ${
            p.avatarColor || 'from-amber-500 to-yellow-600'
          } flex items-center justify-center text-sm`}
        >
          🐱
        </div>
      ),
      badgeText: p.id === activeProfile.id ? 'Активен' : 'Выбрать',
      highlight: p.id === activeProfile.id,
      onClick: () => {
        if (p.id !== activeProfile.id) {
          if (p.pinHash) {
            onSelectTab('profiles');
          } else {
            setActiveProfileId(p.id);
            onProfileChanged(p);
          }
        }
      },
    })),
    {
      id: 'acc-add',
      label: profiles.length >= 3 ? 'Управление слотами (3/3)' : 'Создать / восстановить профиль',
      sublabel: 'BIP-39 мнемоника 12 слов и PIN-код',
      icon: <UserPlus className="w-5 h-5 text-cyan-400" />,
      onClick: () => {
        if (profiles.length >= 3) {
          onSelectTab('profiles');
        } else {
          onOpenOnboardingModal();
        }
      },
    },
  ];

  const createItems: ActionMenuItem[] = [
    {
      id: 'create-studio',
      label: 'Новая картина в AI-Студии',
      sublabel: 'Генерация котика по текстовому описанию',
      icon: <Wand2 className="w-5 h-5 text-amber-400" />,
      onClick: () => onSelectTab('studio'),
    },
    {
      id: 'create-passport',
      label: 'Нарисовать по паспорту кота',
      sublabel: 'Подставить приметы вашего питомца',
      icon: <Award className="w-5 h-5 text-cyan-400" />,
      onClick: onOpenCatPassport,
    },
    {
      id: 'create-random',
      label: 'Случайный шедевр коллекции',
      sublabel: 'Открыть случайное полотно в ленте',
      icon: <RefreshCw className="w-5 h-5 text-fuchsia-400" />,
      onClick: () => {
        onSelectRandomCurated();
        onSelectTab('gallery');
      },
    },
  ];

  return (
    <>
      {/* 1. DESKTOP LEFT SIDEBAR (Instagram Web Layout) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-[72px] xl:w-[228px] flex-col justify-between bg-[#060916]/95 backdrop-blur-xl border-r border-white/10 py-6 px-3">
        <div className="space-y-6">
          {/* Brand Wordmark */}
          <button
            type="button"
            {...brandLongPress.handlers}
            className="w-full px-3 py-2 flex items-center gap-3 text-left cursor-pointer group"
            title="CryptoCats · Удерживайте для смены темы"
          >
            <Brush className="w-6 h-6 text-amber-300 shrink-0 group-hover:rotate-12 transition-transform" />
            <span className="hidden xl:inline font-gaudi font-bold text-lg tracking-wide text-white whitespace-nowrap">
              CryptoCats
            </span>
          </button>

          {/* Primary 5 Nav Links */}
          <nav className="space-y-1.5">
            <button
              type="button"
              onClick={() => {
                onSelectTab('gallery');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full min-h-[48px] px-3 rounded-xl flex items-center gap-4 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'gallery'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Home className={`w-6 h-6 shrink-0 ${activeTab === 'gallery' ? 'text-amber-300' : ''}`} />
              <span className="hidden xl:inline text-sm">Главная</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('explore');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full min-h-[48px] px-3 rounded-xl flex items-center gap-4 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'explore'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Search className={`w-6 h-6 shrink-0 ${activeTab === 'explore' ? 'text-amber-300' : ''}`} />
              <span className="hidden xl:inline text-sm">Обзор</span>
            </button>

            <button
              type="button"
              {...createLongPress.handlers}
              className={`w-full min-h-[48px] px-3 rounded-xl flex items-center gap-4 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'studio'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
              title="Нажмите для создания · Удерживайте для быстрого меню"
            >
              <PlusSquare className={`w-6 h-6 shrink-0 ${activeTab === 'studio' ? 'text-amber-300' : ''}`} />
              <span className="hidden xl:inline text-sm">Создать</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onSelectTab('network');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`w-full min-h-[48px] px-3 rounded-xl flex items-center gap-4 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'network'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Send className={`w-6 h-6 shrink-0 ${activeTab === 'network' ? 'text-amber-300' : ''}`} />
              <span className="hidden xl:inline text-sm">Direct P2P</span>
            </button>

            <button
              type="button"
              {...profileLongPress.handlers}
              className={`w-full min-h-[48px] px-3 rounded-xl flex items-center gap-4 transition-colors cursor-pointer whitespace-nowrap ${
                activeTab === 'profiles' || activeTab === 'system'
                  ? 'bg-white/10 text-white font-semibold'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
              title="Удерживайте для переключения профиля (до 3)"
            >
              <div
                className={`w-6 h-6 rounded-full bg-gradient-to-tr ${
                  activeProfile.avatarColor || 'from-amber-400 to-yellow-500'
                } flex items-center justify-center text-xs shrink-0 ${
                  activeTab === 'profiles' ? 'ring-2 ring-white' : ''
                }`}
              >
                🐱
              </div>
              <span className="hidden xl:inline text-sm truncate">Профиль</span>
            </button>
          </nav>
        </div>

        {/* Bottom "Ещё ☰" Menu Trigger */}
        <button
          type="button"
          onClick={() => setMoreMenuOpen(true)}
          className="w-full min-h-[48px] px-3 rounded-xl flex items-center gap-4 text-slate-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          title="Темы, паспорта, Ubuntu RC1, язык и настройки"
        >
          <Menu className="w-6 h-6 shrink-0" />
          <span className="hidden xl:inline text-sm">Ещё</span>
        </button>
      </aside>

      {/* 2. MOBILE COMPACT TOP BAR (h-12, single row) */}
      <header className="md:hidden sticky top-0 z-40 h-12 px-4 bg-[#060916]/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
        <button
          type="button"
          {...brandLongPress.handlers}
          className="flex items-center gap-2 font-gaudi font-bold text-lg text-white cursor-pointer whitespace-nowrap shrink-0"
        >
          <Brush className="w-5 h-5 text-amber-300 shrink-0" />
          <span>CryptoCats</span>
        </button>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setMoreMenuOpen(true)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-200 hover:bg-white/10 cursor-pointer"
            aria-label="Дополнительное меню"
          >
            <Menu className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('network')}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full cursor-pointer ${
              activeTab === 'network' ? 'text-amber-300' : 'text-slate-200 hover:bg-white/10'
            }`}
            aria-label="Direct P2P чаты"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 3. MOBILE FIXED BOTTOM TAB BAR (h-14, 5 icons) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#060916]/95 backdrop-blur-xl border-t border-white/10 grid grid-cols-5 items-center">
        <button
          type="button"
          onClick={() => {
            onSelectTab('gallery');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`h-full flex items-center justify-center cursor-pointer ${
            activeTab === 'gallery' ? 'text-white' : 'text-slate-500'
          }`}
          aria-label="Главная"
        >
          <Home className={`w-6 h-6 ${activeTab === 'gallery' ? 'text-amber-300' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('explore')}
          className={`h-full flex items-center justify-center cursor-pointer ${
            activeTab === 'explore' ? 'text-white' : 'text-slate-500'
          }`}
          aria-label="Обзор"
        >
          <Search className={`w-6 h-6 ${activeTab === 'explore' ? 'text-amber-300' : ''}`} />
        </button>

        <button
          type="button"
          {...createLongPress.handlers}
          className={`h-full flex items-center justify-center cursor-pointer ${
            activeTab === 'studio' ? 'text-white' : 'text-slate-400'
          }`}
          aria-label="Создать"
        >
          <PlusSquare className={`w-6 h-6 ${activeTab === 'studio' ? 'text-amber-300' : ''}`} />
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('network')}
          className={`h-full flex items-center justify-center cursor-pointer ${
            activeTab === 'network' ? 'text-white' : 'text-slate-500'
          }`}
          aria-label="Direct P2P"
        >
          <Send className={`w-5 h-5 ${activeTab === 'network' ? 'text-amber-300' : ''}`} />
        </button>

        <button
          type="button"
          {...profileLongPress.handlers}
          className="h-full flex items-center justify-center cursor-pointer"
          aria-label="Профиль"
        >
          <div
            className={`w-7 h-7 rounded-full bg-gradient-to-tr ${
              activeProfile.avatarColor || 'from-amber-400 to-yellow-500'
            } flex items-center justify-center text-xs ${
              activeTab === 'profiles' || activeTab === 'system' ? 'ring-2 ring-white' : ''
            }`}
          >
            🐱
          </div>
        </button>
      </nav>

      {/* Action Sheets for Menus & Long-Presses */}
      <ActionMenuSheet
        isOpen={moreMenuOpen}
        onClose={() => setMoreMenuOpen(false)}
        title="Меню галереи"
        subtitle="Дополнительные инструменты и платформы"
        items={moreItems}
      />

      <ActionMenuSheet
        isOpen={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        title="Смена профиля"
        subtitle="Устройство хранит до 3 BIP-39 аккаунтов"
        items={accountItems}
      />

      <ActionMenuSheet
        isOpen={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        title="Быстрое создание"
        subtitle="Выберите способ добавления котика"
        items={createItems}
      />
    </>
  );
};
