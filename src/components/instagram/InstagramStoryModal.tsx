import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Palette, ZoomIn, Heart, Sparkles } from 'lucide-react';
import { Artwork } from '../../types';
import { useThemeStyle } from '../../context/ThemeStyleContext';
import { useTranslation } from '../../context/LanguageContext';
import { getLocalizedArtwork } from '../../utils/i18n';

interface InstagramStoryModalProps {
  isOpen: boolean;
  initialArtwork: Artwork | null;
  initialThemeId?: string;
  artworks: Artwork[];
  onClose: () => void;
  onOpenZoom: (art: Artwork) => void;
  onLike: (id: string) => void;
  onOpenInStudio: (themeId?: string) => void;
}

export const InstagramStoryModal: React.FC<InstagramStoryModalProps> = ({
  isOpen,
  initialArtwork,
  initialThemeId,
  artworks,
  onClose,
  onOpenZoom,
  onLike,
  onOpenInStudio,
}) => {
  const { t } = useTranslation();
  const { allThemes, setActiveStyleId } = useThemeStyle();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const storySlides = artworks.slice(0, 8);
  const safeIndex = storySlides.length > 0 ? Math.min(Math.max(0, currentIndex), storySlides.length - 1) : 0;

  useEffect(() => {
    if (!isOpen) return;
    if (initialArtwork) {
      const foundIdx = storySlides.findIndex((a) => a.id === initialArtwork.id);
      setCurrentIndex(foundIdx >= 0 ? foundIdx : 0);
    } else {
      setCurrentIndex(0);
    }
    setProgress(0);
  }, [isOpen, initialArtwork]);

  useEffect(() => {
    if (!isOpen || storySlides.length === 0) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 100 ? 100 : prev + 2));
    }, 100);
    return () => clearInterval(interval);
  }, [isOpen, safeIndex, storySlides.length]);

  useEffect(() => {
    if (!isOpen || progress < 100) return;
    if (safeIndex < storySlides.length - 1) {
      setCurrentIndex(safeIndex + 1);
      setProgress(0);
    } else {
      onClose();
    }
  }, [isOpen, progress, safeIndex, storySlides.length, onClose]);

  useEffect(() => {
    if (!isOpen || storySlides.length === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') {
        setCurrentIndex((i) => Math.min(storySlides.length - 1, i + 1));
        setProgress(0);
      }
      if (e.key === 'ArrowLeft') {
        setCurrentIndex((i) => Math.max(0, i - 1));
        setProgress(0);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, storySlides.length]);

  const currentSlide = storySlides[safeIndex];
  if (!isOpen || !currentSlide) return null;

  const activeArt = getLocalizedArtwork(currentSlide, t) || currentSlide;
  if (!activeArt) return null;

  const activeStoryTheme = initialThemeId
    ? allThemes.find((th) => th.id === initialThemeId)
    : allThemes[safeIndex % Math.max(1, allThemes.length)];

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="relative w-full h-full sm:max-w-[430px] sm:max-h-[820px] sm:rounded-3xl overflow-hidden bg-[#070a18] border border-white/10 shadow-2xl flex flex-col">
        {/* Progress Bars */}
        <div className="absolute top-0 inset-x-0 z-20 p-3 pt-3.5 bg-gradient-to-b from-black/80 via-black/40 to-transparent space-y-2.5">
          <div className="flex gap-1">
            {storySlides.map((_, idx) => (
              <div key={idx} className="h-0.5 flex-1 bg-white/25 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-100"
                  style={{
                    width: idx < safeIndex ? '100%' : idx === safeIndex ? `${progress}%` : '0%',
                  }}
                />
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={activeArt.imageUrl}
                alt={activeArt.title}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full object-cover border border-white/30 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{activeArt.title}</p>
                <p className="text-[11px] text-slate-300 truncate">{activeArt.style}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              aria-label="Закрыть историю"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full-screen Story Image with tap zones */}
        <div className="relative flex-1 flex items-center justify-center bg-black">
          <img
            src={activeArt.imageUrl}
            alt={activeArt.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />

          {/* Tap left / right invisible zones */}
          <button
            type="button"
            aria-label="Предыдущая история"
            onClick={() => {
              setCurrentIndex(Math.max(0, safeIndex - 1));
              setProgress(0);
            }}
            className="absolute inset-y-16 left-0 w-1/3 z-10 cursor-pointer"
          />
          <button
            type="button"
            aria-label="Следующая история"
            onClick={() => {
              if (safeIndex < storySlides.length - 1) {
                setCurrentIndex(safeIndex + 1);
                setProgress(0);
              } else {
                onClose();
              }
            }}
            className="absolute inset-y-16 right-0 w-2/3 z-10 cursor-pointer"
          />

          {/* Desktop subtle prev/next buttons */}
          {safeIndex > 0 && (
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(Math.max(0, safeIndex - 1));
                setProgress(0);
              }}
              className="hidden sm:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 text-white items-center justify-center hover:bg-black/80 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {safeIndex < storySlides.length - 1 && (
            <button
              type="button"
              onClick={() => {
                setCurrentIndex(Math.min(storySlides.length - 1, safeIndex + 1));
                setProgress(0);
              }}
              className="hidden sm:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/50 text-white items-center justify-center hover:bg-black/80 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Bottom Caption & Quick Actions */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-4 pt-12 bg-gradient-to-t from-black/95 via-black/70 to-transparent space-y-3">
          <p className="text-xs text-slate-200 line-clamp-2 leading-relaxed">
            {activeArt.description}
          </p>

          <div className="flex items-center gap-2">
            {activeStoryTheme && (
              <button
                type="button"
                onClick={() => {
                  setActiveStyleId(activeStoryTheme.id);
                  onOpenInStudio(activeStoryTheme.id);
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-white text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-200 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Нарисовать в стиле</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenZoom(activeArt);
              }}
              className="py-2.5 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-medium flex items-center gap-1.5 backdrop-blur-md cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
              <span>Мазки</span>
            </button>

            <button
              type="button"
              onClick={() => onLike(activeArt.id)}
              className="min-w-[44px] min-h-[40px] rounded-xl bg-white/15 hover:bg-white/25 text-rose-400 flex items-center justify-center backdrop-blur-md cursor-pointer"
              aria-label="Нравится"
            >
              <Heart className="w-4 h-4 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
