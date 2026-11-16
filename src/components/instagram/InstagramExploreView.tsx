import React, { useState } from 'react';
import { Search, X, Sparkles, Image as ImageIcon } from 'lucide-react';
import { Artwork } from '../../types';
import { VAN_GOGH_STYLE_PRESETS } from '../../data/stylePresets';
import { useTranslation } from '../../context/LanguageContext';
import { getLocalizedArtwork, getLocalizedPresets } from '../../utils/i18n';
import { useLongPress } from '../../hooks/useLongPress';

interface InstagramExploreViewProps {
  artworks: Artwork[];
  activeArtworkId: string;
  onSelectArtwork: (artwork: Artwork) => void;
  onOpenContextMenu: (artwork: Artwork) => void;
}

interface ExploreTileProps {
  item: Artwork;
  isActive: boolean;
  onTap: () => void;
  onLongPress: () => void;
}

const ExploreTile: React.FC<ExploreTileProps> = ({ item, isActive, onTap, onLongPress }) => {
  const { isPressing, handlers } = useLongPress({
    onLongPress,
    onClick: onTap,
    delay: 400,
  });

  return (
    <button
      type="button"
      {...handlers}
      className={`group relative aspect-square bg-[#070a18] overflow-hidden cursor-pointer select-none transition-transform duration-150 focus:outline-none ${
        isPressing ? 'scale-95' : ''
      } ${isActive ? 'ring-2 ring-amber-400 ring-inset' : ''}`}
      aria-label={item.title}
    >
      <img
        src={item.imageUrl}
        alt={item.title}
        referrerPolicy="no-referrer"
        draggable={false}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />

      {/* Subtle hover overlay on desktop */}
      <div className="hidden sm:flex absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity items-end p-2.5 text-left">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-white truncate">{item.title}</p>
          <p className="text-[11px] text-slate-300 truncate">{item.style}</p>
        </div>
      </div>

      {/* Tiny indicator if user-created */}
      {item.isUserCreated && (
        <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-amber-300">
          <Sparkles className="w-3 h-3" />
        </span>
      )}
    </button>
  );
};

export const InstagramExploreView: React.FC<InstagramExploreViewProps> = ({
  artworks,
  activeArtworkId,
  onSelectArtwork,
  onOpenContextMenu,
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyleFilter, setSelectedStyleFilter] = useState('all');

  const localizedPresets = getLocalizedPresets(VAN_GOGH_STYLE_PRESETS, t);
  const localizedArtworks = artworks.map((a) => getLocalizedArtwork(a, t));

  const filters = [
    { id: 'all', label: 'Все' },
    { id: 'restoration', label: 'Мои и P2P' },
    ...localizedPresets.slice(0, 6).map((p) => ({
      id: p.id,
      label: p.name.split(' (')[0],
    })),
  ];

  const filteredArtworks = localizedArtworks.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      item.style.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.authorName && item.authorName.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (selectedStyleFilter === 'all') return true;
    if (selectedStyleFilter === 'restoration') {
      return Boolean(item.isUserCreated || item.source === 'p2p-friend');
    }
    const matchingPreset = localizedPresets.find((p) => p.id === selectedStyleFilter);
    if (matchingPreset) {
      return (
        item.style.toLowerCase().includes(matchingPreset.name.split(' (')[0].toLowerCase()) ||
        item.prompt.toLowerCase().includes(matchingPreset.id.toLowerCase())
      );
    }
    return true;
  });

  return (
    <div className="max-w-[935px] mx-auto px-0 sm:px-4 py-3 sm:py-6 space-y-3 sm:space-y-4">
      {/* Search Bar */}
      <div className="px-3 sm:px-0 space-y-2.5">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по котикам, стилям или авторам..."
            className="w-full h-10 pl-10 pr-9 rounded-xl bg-white/10 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-white/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 p-1 text-slate-400 hover:text-white cursor-pointer"
              aria-label="Очистить поиск"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Clean Horizontal Filter Strip */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
          {filters.map((f) => {
            const isSelected = selectedStyleFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelectedStyleFilter(f.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-white text-slate-950'
                    : 'bg-white/10 text-slate-200 hover:bg-white/15'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3-Column Classic Instagram Grid */}
      {filteredArtworks.length === 0 ? (
        <div className="py-20 text-center text-slate-400 space-y-2">
          <ImageIcon className="w-10 h-10 mx-auto opacity-40" />
          <p className="text-sm">Ничего не найдено по вашему запросу</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 sm:gap-2">
          {filteredArtworks.map((item) => (
            <ExploreTile
              key={item.id}
              item={item}
              isActive={item.id === activeArtworkId}
              onTap={() => onSelectArtwork(item)}
              onLongPress={() => onOpenContextMenu(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};
