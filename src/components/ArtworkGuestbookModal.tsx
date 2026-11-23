import React, { useState, useEffect } from 'react';
import { X, BookOpen, Star, Send, ShieldCheck, Heart, Sparkles, User, CheckCircle2 } from 'lucide-react';
import { Artwork, GuestbookEntry } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface ArtworkGuestbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  artwork: Artwork | null;
  currentArtistName?: string;
}

const DEFAULT_HISTORICAL_ENTRIES: Record<string, GuestbookEntry[]> = {
  default: [
    {
      id: 'theo_note_1',
      artworkId: 'all',
      authorName: 'Тео ван Гог',
      comment: 'Дорогой брат! Твоя палитра в этой картине полна невиданного света. Этот кот на фоне вихрей мазков кажется живым хранителем ночного покоя.',
      rating: 5,
      pawStampColor: 'gold',
      createdAt: Date.now() - 86400000 * 3,
      isP2PVerified: true
    },
    {
      id: 'claude_note_2',
      artworkId: 'all',
      authorName: 'Клод Моне (Живерни)',
      comment: 'Изумительная игра светотени и густой импасто. Шерсть передана тончайшими рефлексами утреннего солнца.',
      rating: 5,
      pawStampColor: 'ultramarine',
      createdAt: Date.now() - 86400000 * 2,
      isP2PVerified: true
    },
    {
      id: 'gauguin_note_3',
      artworkId: 'all',
      authorName: 'Поль Гоген',
      comment: 'Дикая первозданная мощь цвета. Этот кот явно видел тайны южных островов.',
      rating: 5,
      pawStampColor: 'terracotta',
      createdAt: Date.now() - 86400000 * 1,
      isP2PVerified: true
    }
  ]
};

export const ArtworkGuestbookModal: React.FC<ArtworkGuestbookModalProps> = ({
  isOpen,
  onClose,
  artwork,
  currentArtistName = 'Винсент Рыжехвостый'
}) => {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<GuestbookEntry[]>([]);
  const [newComment, setNewComment] = useState<string>('');
  const [newRating, setNewRating] = useState<number>(5);
  const [stampColor, setStampColor] = useState<'gold' | 'terracotta' | 'ultramarine' | 'emerald'>('gold');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Load guestbook entries from localStorage for this artwork
  useEffect(() => {
    if (!artwork) return;
    try {
      const stored = localStorage.getItem(`vangogh_guestbook_${artwork.id}`);
      if (stored) {
        setEntries(JSON.parse(stored));
      } else {
        // Fallback to historical reviews
        setEntries(DEFAULT_HISTORICAL_ENTRIES.default);
      }
    } catch {
      setEntries(DEFAULT_HISTORICAL_ENTRIES.default);
    }
  }, [artwork?.id]);

  if (!isOpen || !artwork) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    const newEntry: GuestbookEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      artworkId: artwork.id,
      authorName: currentArtistName,
      comment: newComment.trim(),
      rating: newRating,
      pawStampColor: stampColor,
      createdAt: Date.now(),
      isP2PVerified: true
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    try {
      localStorage.setItem(`vangogh_guestbook_${artwork.id}`, JSON.stringify(updated));
    } catch (err) {
      console.warn('Could not save to localStorage:', err);
    }

    setNewComment('');
    setIsSubmitting(false);
  };

  const stampColorClasses = {
    gold: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50',
    terracotta: 'bg-orange-500/20 text-orange-300 border-orange-500/50',
    ultramarine: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50',
    emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="cyber-gaudi-card border-2 border-cyan-400/50 rounded-3xl max-w-3xl w-full flex flex-col shadow-[0_0_50px_rgba(0,245,212,0.25)] overflow-hidden my-auto max-h-[96vh] relative">
        {/* Swirling ambient glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="px-5 py-4 bg-[#080d2c]/90 border-b border-indigo-900/60 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center border border-cyan-400/40 shadow-sm">
              <BookOpen className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-cyan-300">
                Книга Отзывов Экспоната
              </h3>
              <p className="text-[11px] text-cyan-200/70">
                Записи ценителей и отпечатки лап к картине «{artwork.title}»
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#121946] hover:bg-[#1a256a] text-cyan-200 flex items-center justify-center transition cursor-pointer border border-cyan-500/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Guestbook Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 relative z-10">
          {/* New Review Input Form */}
          <form
            onSubmit={handleSubmit}
            className="p-4 rounded-2xl bg-[#090d28]/90 border border-cyan-500/30 space-y-3 shadow-inner"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-gaudi font-bold text-yellow-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Оставить запись от: {currentArtistName}
              </span>

              {/* Rating selection (1-5 paws) */}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setNewRating(num)}
                    className="text-base hover:scale-125 transition cursor-pointer"
                    title={`Оценка: ${num} лапок`}
                  >
                    <span className={num <= newRating ? 'opacity-100' : 'opacity-30'}>🐾</span>
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Ваши впечатления о мазках, сюжете, характере котика и колорите..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#050718] border border-indigo-700/50 text-slate-100 text-xs focus:outline-none focus:border-cyan-400 placeholder-slate-500 font-sans"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Paw stamp color selector */}
              <div className="flex items-center gap-1.5 text-xs text-cyan-200/80">
                <span className="text-[11px] font-cyber">Цвет лапы:</span>
                {(['gold', 'terracotta', 'ultramarine', 'emerald'] as const).map((col) => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => setStampColor(col)}
                    className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium transition cursor-pointer ${
                      stampColor === col ? stampColorClasses[col] + ' ring-1' : 'bg-[#0b1030] text-cyan-300/70 border-indigo-800/60'
                    }`}
                  >
                    🐾 {col === 'gold' ? 'Золото' : col === 'terracotta' ? 'Терракота' : col === 'ultramarine' ? 'Ультрамарин' : 'Изумруд'}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="cyber-btn-gold px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 shadow-md"
              >
                <Send className="w-3.5 h-3.5 text-slate-950" />
                <span>Поставить лапу и записать</span>
              </button>
            </div>
          </form>

          {/* List of Entries */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-cyber font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Летопись отзывов ({entries.length})</span>
            </h4>

            {entries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 rounded-2xl bg-[#070b24]/90 border border-indigo-900/60 space-y-2 relative group hover:border-cyan-400/50 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-gaudi font-bold text-yellow-200">
                      {entry.authorName}
                    </span>
                    {entry.isP2PVerified && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#121946] text-cyan-300 text-[10px] border border-cyan-400/50 font-mono">
                        <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                        <span>Локальная запись (демо)</span>
                      </span>
                    )}
                  </div>

                  {/* Rating Paws */}
                  <div className="flex items-center gap-0.5 text-xs text-yellow-400" title={`Оценка: ${entry.rating}/5`}>
                    {Array.from({ length: entry.rating }).map((_, i) => (
                      <span key={i}>🐾</span>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-200 leading-relaxed font-sans font-normal">
                  {entry.comment}
                </p>

                <div className="flex items-center justify-between pt-1 text-[10px] text-cyan-300/60 border-t border-indigo-900/50">
                  <span className="font-mono">{new Date(entry.createdAt).toLocaleDateString()}</span>
                  <span className={`px-2 py-0.5 rounded-full border text-[10px] font-medium font-cyber ${stampColorClasses[entry.pawStampColor || 'gold']}`}>
                    Печать: 🐾 {entry.pawStampColor || 'gold'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#080d2c]/90 border-t border-indigo-900/60 flex items-center justify-between text-xs text-cyan-200/80 relative z-10">
          <span className="text-[11px] font-mono text-cyan-300/80">
            Локальная книга отзывов устройства (localStorage, демо)
          </span>
          <button
            onClick={onClose}
            className="cyber-btn-cobalt px-4 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            Закрыть книгу
          </button>
        </div>
      </div>
    </div>
  );
};
