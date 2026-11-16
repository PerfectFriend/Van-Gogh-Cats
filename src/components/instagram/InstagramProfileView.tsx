import React, { useState } from 'react';
import {
  Grid3X3,
  Key,
  Monitor,
  ChevronDown,
  Menu,
  PlusSquare,
  Award,
  ShieldCheck,
  Download,
  Palette,
  Crown,
  Smartphone,
  Globe,
  LogOut,
  CheckCircle2,
  UserPlus,
} from 'lucide-react';
import { Artwork, StoredUserProfile } from '../../types';
import { ProfileManagementView } from '../ProfileManagementView';
import { SystemPlatformsView } from '../SystemPlatformsView';
import { ActionMenuSheet, ActionMenuItem } from './ActionMenuSheet';
import { useLongPress } from '../../hooks/useLongPress';
import { getAllProfiles, setActiveProfileId, exportProfileArchive } from '../../utils/profileManager';
import { useFirebaseAuth } from '../../context/FirebaseAuthContext';
import { p2pNetwork } from '../../utils/p2pNetwork';

interface InstagramProfileViewProps {
  currentProfile: StoredUserProfile;
  artworks: Artwork[];
  isPro: boolean;
  onProfileChanged: (profile: StoredUserProfile) => void;
  onSelectArtwork: (artwork: Artwork) => void;
  onOpenContextMenu: (artwork: Artwork) => void;
  onOpenCatPassport: () => void;
  onOpenUbuntuModal: () => void;
  onOpenAndroidModal: () => void;
  onOpenProModal: () => void;
  onOpenThemeDrawer: () => void;
  onOpenCreateStudio: () => void;
  onOpenOnboardingModal: () => void;
}

export const InstagramProfileView: React.FC<InstagramProfileViewProps> = ({
  currentProfile,
  artworks,
  isPro,
  onProfileChanged,
  onSelectArtwork,
  onOpenContextMenu,
  onOpenCatPassport,
  onOpenUbuntuModal,
  onOpenAndroidModal,
  onOpenProModal,
  onOpenThemeDrawer,
  onOpenCreateStudio,
  onOpenOnboardingModal,
}) => {
  const [subTab, setSubTab] = useState<'grid' | 'vault' | 'system'>('grid');
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);
  const [isDrawerMenuOpen, setIsDrawerMenuOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const { googleUser, signInWithGoogle, signOutGoogle, isSigningIn, cloudArtworks } = useFirebaseAuth();

  const profiles = getAllProfiles();
  const friendsCount = p2pNetwork.getConnectedFriends().length;

  const userArtworks = artworks.filter(
    (a) => a.authorId === currentProfile.id || a.isUserCreated || a.source === 'my-local'
  );
  const displayedGridArtworks = userArtworks.length > 0 ? userArtworks : artworks.slice(0, 9);

  const handleUsernameHandle = useLongPress({
    onLongPress: () => setIsAccountSwitcherOpen(true),
    onClick: () => setIsAccountSwitcherOpen(true),
  });

  const handleQuickExport = () => {
    exportProfileArchive(currentProfile, artworks);
    setNotice(`Архив профиля «${currentProfile.name}» сохранён на диск`);
    setTimeout(() => setNotice(null), 4000);
  };

  const accountSwitchItems: ActionMenuItem[] = [
    ...profiles.map((p) => ({
      id: `switch-${p.id}`,
      label: p.name,
      sublabel: p.hasBip39Wallet ? 'BIP-39 Vault · Защищён PIN' : 'Локальный профиль',
      icon: (
        <div
          className={`w-8 h-8 rounded-full bg-gradient-to-tr ${
            p.avatarColor || 'from-amber-500 to-yellow-600'
          } flex items-center justify-center text-sm`}
        >
          🐱
        </div>
      ),
      badgeText: p.id === currentProfile.id ? 'Активен' : 'Выбрать',
      highlight: p.id === currentProfile.id,
      onClick: () => {
        if (p.id !== currentProfile.id) {
          if (p.pinHash) {
            setSubTab('vault');
          } else {
            setActiveProfileId(p.id);
            onProfileChanged(p);
          }
        }
      },
    })),
    {
      id: 'google-auth-switch',
      label: googleUser ? `Google: ${googleUser.displayName || googleUser.email}` : 'Войти через Google',
      sublabel: googleUser
        ? `Синхронизировано полотен в облаке: ${cloudArtworks.length} · Нажмите чтобы выйти`
        : 'Синхронизация персональной галереи котов в облаке',
      icon: <Globe className={`w-5 h-5 ${googleUser ? 'text-emerald-400' : 'text-blue-400'}`} />,
      badgeText: googleUser ? 'Онлайн' : 'Войти',
      highlight: !!googleUser,
      onClick: () => {
        if (googleUser) {
          signOutGoogle();
          setNotice('Вы вышли из Google-аккаунта');
          setTimeout(() => setNotice(null), 3000);
        } else {
          signInWithGoogle();
        }
      },
    },
    {
      id: 'add-or-restore',
      label: profiles.length >= 3 ? 'Слот 4-го профиля (экспорт/замена)' : 'Добавить или восстановить профиль',
      sublabel: `Занято слотов: ${profiles.length} из 3`,
      icon: <UserPlus className="w-5 h-5 text-cyan-400" />,
      onClick: () => {
        if (profiles.length >= 3) {
          setSubTab('vault');
        } else {
          onOpenOnboardingModal();
        }
      },
    },
  ];

  const drawerMenuItems: ActionMenuItem[] = [
    {
      id: 'drawer-google',
      label: googleUser ? `Google-аккаунт (${googleUser.email || 'Подключён'})` : 'Войти через Google-аккаунт',
      sublabel: googleUser
        ? `В облаке сохранено работ: ${cloudArtworks.length} · Выйти`
        : 'Облачная галерея и сохранение ваших стилей',
      icon: googleUser ? (
        <LogOut className="w-5 h-5 text-rose-400" />
      ) : (
        <Globe className="w-5 h-5 text-blue-400" />
      ),
      onClick: () => {
        if (googleUser) {
          signOutGoogle();
        } else {
          signInWithGoogle();
        }
      },
      highlight: !googleUser,
    },
    {
      id: 'drawer-vault',
      label: 'Ключи BIP-39 и профили (до 3)',
      sublabel: 'Просмотр сид-фразы, PIN-код, смена аккаунта',
      icon: <Key className="w-5 h-5 text-amber-400" />,
      onClick: () => setSubTab('vault'),
    },
    {
      id: 'drawer-export',
      label: 'Экспорт архива профиля (.catpack)',
      sublabel: 'Скачать сид-фразу и картины на диск',
      icon: <Download className="w-5 h-5 text-emerald-400" />,
      onClick: handleQuickExport,
    },
    {
      id: 'drawer-themes',
      label: 'Темы оформления галереи',
      sublabel: '11 художественных фонов и палитр',
      icon: <Palette className="w-5 h-5 text-fuchsia-400" />,
      onClick: onOpenThemeDrawer,
    },
    {
      id: 'drawer-system',
      label: 'Система, разрешения и Ubuntu RC1',
      sublabel: 'Системные права, .deb / .tar.gz и LAN',
      icon: <Monitor className="w-5 h-5 text-orange-400" />,
      onClick: () => setSubTab('system'),
    },
    {
      id: 'drawer-ubuntu-modal',
      label: 'Быстрая установка Ubuntu RC1',
      sublabel: 'Открыть центр загрузки пакетов',
      icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />,
      onClick: onOpenUbuntuModal,
    },
    {
      id: 'drawer-android',
      label: 'Android PWA приложение',
      sublabel: 'Установить на смартфон или планшет',
      icon: <Smartphone className="w-5 h-5 text-emerald-400" />,
      onClick: onOpenAndroidModal,
    },
    {
      id: 'drawer-pro',
      label: isPro ? 'PRO Патронат активен' : 'PRO без рекламы',
      sublabel: 'Управление статусом патроната галереи',
      icon: <Crown className="w-5 h-5 text-yellow-400" />,
      onClick: onOpenProModal,
      highlight: true,
    },
  ];

  return (
    <div className="max-w-[935px] mx-auto px-0 sm:px-6 py-4 sm:py-8 space-y-6">
      {/* Top Instagram Profile Bar */}
      <div className="px-4 sm:px-0 flex items-center justify-between">
        <button
          type="button"
          {...handleUsernameHandle.handlers}
          className="flex items-center gap-1.5 text-lg sm:text-xl font-bold text-white cursor-pointer hover:opacity-85 transition-opacity"
          title="Нажмите или удерживайте для переключения профиля"
        >
          <span className="truncate max-w-[210px] sm:max-w-xs">{currentProfile.name}</span>
          <ChevronDown className="w-4 h-4 text-slate-300 shrink-0" />
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenCreateStudio}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Создать публикацию"
          >
            <PlusSquare className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => setIsDrawerMenuOpen(true)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Меню настроек и системы"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {notice && (
        <div className="mx-4 sm:mx-0 p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Instagram Profile Header: Avatar + 3 Stat Columns */}
      <div className="px-4 sm:px-0 flex items-center gap-6 sm:gap-12">
        <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-full p-[3px] bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-cyan-400 shrink-0">
          <div className="w-full h-full rounded-full bg-[#090c1a] overflow-hidden flex items-center justify-center text-3xl sm:text-5xl border-2 border-[#050711]">
            {googleUser?.photoURL ? (
              <img
                src={googleUser.photoURL}
                alt={googleUser.displayName || 'Google'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span>🐱</span>
            )}
          </div>
        </div>

        <div className="flex-1 grid grid-cols-3 text-center gap-2 max-w-md">
          <div>
            <p className="text-base sm:text-xl font-bold text-white tabular-nums">
              {userArtworks.length}
            </p>
            <p className="text-xs text-slate-400">работ</p>
          </div>
          <div>
            <p className="text-base sm:text-xl font-bold text-white tabular-nums">
              {friendsCount}
            </p>
            <p className="text-xs text-slate-400">пиров P2P</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAccountSwitcherOpen(true)}
            className="cursor-pointer hover:opacity-80"
          >
            <p className="text-base sm:text-xl font-bold text-amber-300 tabular-nums">
              {profiles.length}/3
            </p>
            <p className="text-xs text-slate-400">профили</p>
          </button>
        </div>
      </div>

      {/* Bio & Action Buttons */}
      <div className="px-4 sm:px-0 space-y-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-white">
              {googleUser?.displayName || currentProfile.name}
            </p>
            {googleUser && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/30 text-[11px] text-emerald-300 font-medium">
                Google: {googleUser.email}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
            {currentProfile.bio}
          </p>
          <p className="text-xs text-slate-400 font-mono">
            ID: {currentProfile.id.slice(0, 14)}… · {currentProfile.hasBip39Wallet ? 'BIP-39 Vault' : 'Локальный ключ'}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 max-w-lg">
          {!googleUser ? (
            <button
              type="button"
              onClick={() => signInWithGoogle()}
              disabled={isSigningIn}
              className="py-2 px-4 rounded-xl bg-white hover:bg-slate-100 text-xs sm:text-sm font-semibold text-slate-950 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Globe className="w-4 h-4 text-blue-600" />
              <span>{isSigningIn ? 'Вход...' : 'Войти через Google'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setSubTab(subTab === 'vault' ? 'grid' : 'vault')}
              className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs sm:text-sm font-semibold text-white transition-colors cursor-pointer"
            >
              {subTab === 'vault' ? 'Назад к сетке' : 'Ключи и профили'}
            </button>
          )}
          <button
            type="button"
            onClick={onOpenCatPassport}
            className="py-2 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-xs sm:text-sm font-semibold text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Award className="w-4 h-4 text-amber-400" />
            <span>Паспорт кота</span>
          </button>
        </div>
      </div>

      {/* Classic Instagram Profile Sub-Tabs Bar */}
      <div className="border-t border-white/10 grid grid-cols-3">
        <button
          type="button"
          onClick={() => setSubTab('grid')}
          className={`h-12 flex items-center justify-center gap-2 border-t-2 transition-colors cursor-pointer ${
            subTab === 'grid'
              ? 'border-white text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
          aria-label="Сетка публикаций"
        >
          <Grid3X3 className="w-5 h-5" />
          <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">Работы</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('vault')}
          className={`h-12 flex items-center justify-center gap-2 border-t-2 transition-colors cursor-pointer ${
            subTab === 'vault'
              ? 'border-white text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
          aria-label="BIP-39 Профили"
        >
          <Key className="w-5 h-5" />
          <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">BIP-39</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('system')}
          className={`h-12 flex items-center justify-center gap-2 border-t-2 transition-colors cursor-pointer ${
            subTab === 'system'
              ? 'border-white text-white'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
          aria-label="Система и Ubuntu"
        >
          <Monitor className="w-5 h-5" />
          <span className="hidden sm:inline text-xs font-semibold uppercase tracking-wider">Система</span>
        </button>
      </div>

      {/* Sub-Tab Content */}
      {subTab === 'grid' && (
        <div className="grid grid-cols-3 gap-0.5 sm:gap-2">
          {displayedGridArtworks.map((art) => (
            <ProfileGridTile
              key={art.id}
              artwork={art}
              onTap={() => onSelectArtwork(art)}
              onLongPress={() => onOpenContextMenu(art)}
            />
          ))}
        </div>
      )}

      {subTab === 'vault' && (
        <div className="px-2 sm:px-0">
          <ProfileManagementView
            currentProfile={currentProfile}
            artworks={artworks}
            onProfileChanged={onProfileChanged}
            onOpenCatPassport={onOpenCatPassport}
          />
        </div>
      )}

      {subTab === 'system' && (
        <div className="px-2 sm:px-0">
          <SystemPlatformsView
            onOpenUbuntuModal={onOpenUbuntuModal}
            onOpenAndroidModal={onOpenAndroidModal}
            onOpenProModal={onOpenProModal}
            isPro={isPro}
            artworksCount={artworks.length}
          />
        </div>
      )}

      {/* Account Switcher Sheet */}
      <ActionMenuSheet
        isOpen={isAccountSwitcherOpen}
        onClose={() => setIsAccountSwitcherOpen(false)}
        title="Переключение профиля"
        subtitle="До 3 BIP-39 аккаунтов на устройстве"
        items={accountSwitchItems}
      />

      {/* Profile Hamburger Settings Drawer */}
      <ActionMenuSheet
        isOpen={isDrawerMenuOpen}
        onClose={() => setIsDrawerMenuOpen(false)}
        title="Меню и инструменты"
        subtitle="Все дополнительные настройки галереи"
        items={drawerMenuItems}
      />
    </div>
  );
};

interface ProfileGridTileProps {
  artwork: Artwork;
  onTap: () => void;
  onLongPress: () => void;
}

const ProfileGridTile: React.FC<ProfileGridTileProps> = ({ artwork, onTap, onLongPress }) => {
  const { isPressing, handlers } = useLongPress({
    onLongPress,
    onClick: onTap,
    delay: 400,
  });

  return (
    <button
      type="button"
      {...handlers}
      className={`aspect-square bg-[#070a18] overflow-hidden cursor-pointer select-none transition-transform duration-150 ${
        isPressing ? 'scale-95' : ''
      }`}
    >
      <img
        src={artwork.imageUrl}
        alt={artwork.title}
        referrerPolicy="no-referrer"
        draggable={false}
        className="w-full h-full object-cover hover:opacity-90 transition-opacity"
      />
    </button>
  );
};
