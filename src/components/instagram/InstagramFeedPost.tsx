import React, { useState, useRef } from 'react';
import {
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  MoreHorizontal,
  Headphones,
  Volume2,
} from 'lucide-react';
import { Artwork } from '../../types';
import { useTranslation } from '../../context/LanguageContext';
import { getLocalizedArtwork } from '../../utils/i18n';
import { useLongPress } from '../../hooks/useLongPress';
import { museumAudio } from '../../utils/museumAudio';
import { VoiceboxAudioGuidePlayer } from '../VoiceboxAudioGuidePlayer';

interface InstagramFeedPostProps {
  artwork: Artwork;
  isLiked: boolean;
  onLike: (id: string) => void;
  onOpenContextMenu: (artwork: Artwork) => void;
  onOpenZoom: (artwork: Artwork) => void;
  onOpenGuestbook: (artwork: Artwork) => void;
  onOpenPostcard: (artwork: Artwork) => void;
  onOpenFramingModal: (artwork: Artwork) => void;
  isAudioOpen: boolean;
  onToggleAudio: (artwork: Artwork) => void;
}

export const InstagramFeedPost: React.FC<InstagramFeedPostProps> = ({
  artwork,
  isLiked,
  onLike,
  onOpenContextMenu,
  onOpenZoom,
  onOpenGuestbook,
  onOpenPostcard,
  onOpenFramingModal,
  isAudioOpen,
  onToggleAudio,
}) => {
  const { t } = useTranslation();
  const currentArtwork = getLocalizedArtwork(artwork, t);

  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [expandedCaption, setExpandedCaption] = useState(false);
  const [isPurring, setIsPurring] = useState(false);
  const lastTapRef = useRef<number>(0);

  const authorLabel =
    currentArtwork.authorName ||
    (currentArtwork.isUserCreated ? 'Вы · Локальная мастерская' : 'vangogh.atelier');

  // Double-tap to like, single-tap to zoom (delayed slightly so double-tap works smoothly)
  const handleImageTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 260;
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      lastTapRef.current = 0;
      if (!isLiked) {
        onLike(currentArtwork.id);
      }
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 750);
    } else {
      lastTapRef.current = now;
    }
  };

  // Long-press on the artwork opens the full Context Menu with all museum tools
  const { isPressing, handlers: imageLongPressHandlers } = useLongPress({
    onLongPress: () => onOpenContextMenu(artwork),
    onClick: handleImageTap,
    delay: 420,
  });

  // Long-press on Audio button toggles Cat Purr
  const { handlers: audioLongPressHandlers } = useLongPress({
    onLongPress: () => {
      const active = museumAudio.togglePurr(0.18);
      setIsPurring(active);
    },
    onClick: () => onToggleAudio(currentArtwork),
    delay: 420,
  });

  // Long-press on Bookmark button opens Zoom directly
  const { handlers: bookmarkLongPressHandlers } = useLongPress({
    onLongPress: () => onOpenZoom(currentArtwork),
    onClick: () => onOpenFramingModal(artwork),
    delay: 420,
  });

  return (
    <article className="bg-[#090c1a]/85 sm:border sm:border-white/10 sm:rounded-2xl overflow-hidden backdrop-blur-md">
      {/* 1. Post Header */}
      <div className="px-3.5 py-2.5 flex items-center justify-between gap-3">
        <div
          className="flex items-center gap-3 min-w-0 cursor-pointer"
          onClick={() => onOpenContextMenu(artwork)}
        >
          <div className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-cyan-400 shrink-0">
            <img
              src={currentArtwork.imageUrl}
              alt={authorLabel}
              referrerPolicy="no-referrer"
              className="w-full h-full rounded-full object-cover border border-[#090c1a]"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">
              {authorLabel}
            </p>
            <p className="text-xs text-slate-400 truncate mt-0.5">
              {currentArtwork.style} · {currentArtwork.year}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpenContextMenu(artwork)}
          className="min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          aria-label="Дополнительные действия"
          title="Долгое нажатие на фото или меню · Все инструменты"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* 2. Post Media (Long-press for extra menu, double-tap for like) */}
      <div
        {...imageLongPressHandlers}
        className={`relative bg-black select-none cursor-pointer overflow-hidden transition-transform duration-200 ${
          isPressing ? 'scale-[0.985]' : 'scale-100'
        }`}
      >
        <img
          src={currentArtwork.imageUrl}
          alt={currentArtwork.title}
          referrerPolicy="no-referrer"
          draggable={false}
          className="w-full max-h-[640px] aspect-square sm:aspect-[4/4.2] object-cover select-none"
        />

        {/* Subtle tactile press ring feedback */}
        {isPressing && (
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center pointer-events-none">
            <div className="px-3.5 py-1.5 rounded-full bg-black/75 text-white text-xs font-medium backdrop-blur-md">
              Открытие меню…
            </div>
          </div>
        )}

        {/* Double-tap floating heart burst */}
        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-in zoom-in-75 fade-in duration-200">
            <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-[0_0_25px_rgba(244,63,94,0.8)]" />
          </div>
        )}
      </div>

      {/* Inline Audio Player ONLY when user opens Voicebox HD */}
      {isAudioOpen && (
        <div className="px-3.5 pt-3 animate-in fade-in duration-200">
          <VoiceboxAudioGuidePlayer
            artwork={currentArtwork}
            onClose={() => onToggleAudio(currentArtwork)}
          />
        </div>
      )}

      {/* 3. Instagram Action Bar */}
      <div className="px-2 pt-1.5 flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => onLike(currentArtwork.id)}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-transform active:scale-125 cursor-pointer ${
              isLiked ? 'text-rose-500' : 'text-slate-100 hover:text-slate-300'
            }`}
            aria-label="Нравится"
          >
            <Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => onOpenGuestbook(artwork)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-100 hover:text-slate-300 transition-colors cursor-pointer"
            aria-label="Книга отзывов"
            title="Отзывы и отпечатки лап"
          >
            <MessageCircle className="w-6 h-6" />
          </button>

          <button
            type="button"
            onClick={() => onOpenPostcard(artwork)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-100 hover:text-slate-300 transition-colors cursor-pointer"
            aria-label="Отправить открытку"
            title="Винтажная открытка"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center">
          <button
            type="button"
            {...audioLongPressHandlers}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              isAudioOpen || isPurring
                ? 'text-amber-400'
                : 'text-slate-100 hover:text-slate-300'
            }`}
            aria-label="Аудиогид"
            title="Нажмите для аудиогида · Удерживайте для мурчания"
          >
            {isPurring ? <Volume2 className="w-5 h-5" /> : <Headphones className="w-5 h-5" />}
          </button>

          <button
            type="button"
            {...bookmarkLongPressHandlers}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-100 hover:text-amber-300 transition-colors cursor-pointer"
            aria-label="В зал и раму"
            title="Примерить в раму · Удерживайте для увеличения мазков"
          >
            <Bookmark className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 4. Likes & Clean Caption */}
      <div className="px-3.5 pb-4 space-y-1.5">
        <p className="text-sm font-semibold text-white tabular-nums">
          Нравится: {(currentArtwork.likes || 12).toLocaleString()}
        </p>

        <div className="text-sm text-slate-200 leading-snug">
          <span className="font-semibold text-white mr-1.5">{currentArtwork.title}</span>
          <span className={expandedCaption ? '' : 'line-clamp-2 inline'}>
            {currentArtwork.description}
          </span>
          {!expandedCaption && currentArtwork.description.length > 90 && (
            <button
              type="button"
              onClick={() => setExpandedCaption(true)}
              className="text-slate-400 hover:text-slate-200 ml-1 text-xs font-medium cursor-pointer"
            >
              ещё
            </button>
          )}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => onOpenZoom(currentArtwork)}
            className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            Рассмотреть мазки кисти
          </button>
          <span className="text-slate-600 text-xs">·</span>
          <button
            type="button"
            onClick={() => onOpenContextMenu(artwork)}
            className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            Удерживайте фото для всех опций
          </button>
        </div>
      </div>
    </article>
  );
};
