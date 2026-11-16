import React, { useState } from 'react';
import { Sparkles, Palette, Heart, Check, Filter, Image as ImageIcon, Download, Trash2 } from 'lucide-react';
import { Artwork } from '../types';
import { VAN_GOGH_STYLE_PRESETS } from '../data/stylePresets';
import { downloadArtworkImage } from '../utils/downloadHelper';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedArtwork, getLocalizedPresets } from '../utils/i18n';
import { GOURMET_CAT_SPONSORS } from '../data/catSponsors';
import { CatSponsorCard } from './CatSponsorCard';
import { GaudiCornerOrnament, ButtonOrnamentFlourish } from './GaudiOrnaments';
import { useThemeStyle } from '../context/ThemeStyleContext';

interface GalleryGridProps {
  artworks: Artwork[];
  activeArtworkId: string;
  onSelectArtwork: (artwork: Artwork) => void;
  onLike: (id: string) => void;
  onDeletePublication?: (artwork: Artwork) => void;
  currentUserId?: string;
  isPro?: boolean;
  onOpenProModal?: () => void;
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  artworks,
  activeArtworkId,
  onSelectArtwork,
  onLike,
  onDeletePublication,
  currentUserId,
  isPro = false,
  onOpenProModal
}) => {
  const [selectedStyleFilter, setSelectedStyleFilter] = useState<string>('all');
  const { t } = useTranslation();
  const { activeTheme } = useThemeStyle();

  const localizedPresets = getLocalizedPresets(VAN_GOGH_STYLE_PRESETS, t);

  const styles = [
    { id: 'all', label: t.filterAll },
    ...localizedPresets.map(p => ({
      id: p.id,
      label: p.name
    })),
    { id: 'restoration', label: t.filterRestorations }
  ];

  const localizedArtworks = artworks.map(a => getLocalizedArtwork(a, t));

  const filteredArtworks = localizedArtworks.filter(item => {
    if (selectedStyleFilter === 'all') return true;
    if (selectedStyleFilter === 'restoration') {
      return item.isUserCreated || item.source === 'p2p-friend';
    }
    const matchingPreset = localizedPresets.find(p => p.id === selectedStyleFilter);
    if (matchingPreset) {
      return item.style.toLowerCase().includes(matchingPreset.name.toLowerCase()) ||
             item.prompt.toLowerCase().includes(matchingPreset.id.toLowerCase());
    }
    return true;
  });

  return (
    <section
      style={{
        background: activeTheme.plateBg,
        borderColor: activeTheme.plateBorder,
        boxShadow: activeTheme.plateGlow
      }}
      className="p-4 sm:p-6 lg:p-8 rounded-3xl border shadow-2xl relative overflow-hidden group transition-all duration-500 backdrop-blur-xl"
    >
      {/* Radiant Top Stained-Glass Rim matching artist's palette */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] z-10 transition-all duration-500"
        style={{ background: activeTheme.plateRim }}
      />

      {/* Subtle Painterly Canvas Texture Watermark */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10 mix-blend-overlay bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${activeTheme.bgImageUrl})` }}
      />

      {/* Authentic Gaudi Catalan Wrought Iron Corner Vignettes */}
      <GaudiCornerOrnament position="top-left" />
      <GaudiCornerOrnament position="top-right" />
      <GaudiCornerOrnament position="bottom-left" />
      <GaudiCornerOrnament position="bottom-right" />

      {/* Header & Style Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-indigo-900/50 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-xs font-cyber font-bold uppercase tracking-wider text-cyan-400">
            <Palette className="w-4 h-4 text-cyan-400" />
            <span>{t.expoMuseumTitle}</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-cyan-300 mt-1">
            {t.galleryMainTitle}
          </h3>
          <p className="text-xs sm:text-sm text-cyan-200/80 mt-0.5">
            {t.gallerySubtitle}
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5">
          {styles.map((st) => {
            const isSelected = selectedStyleFilter === st.id;
            return (
              <button
                key={st.id}
                onClick={() => setSelectedStyleFilter(st.id)}
                style={
                  isSelected
                    ? {
                        background: activeTheme.buttonPrimaryBg,
                        borderColor: activeTheme.buttonPrimaryBorder,
                        color: activeTheme.buttonPrimaryText,
                        boxShadow: activeTheme.buttonPrimaryGlow
                      }
                    : {
                        background: activeTheme.buttonSecondaryBg,
                        borderColor: activeTheme.buttonSecondaryBorder,
                        color: activeTheme.buttonSecondaryText
                      }
                }
                className="px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer border shadow-sm"
              >
                <span>{st.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Artworks */}
      {filteredArtworks.length === 0 ? (
        <div className="text-center py-12 text-cyan-200/70 relative z-10">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-40 text-cyan-400" />
          <p className="font-gaudi">{t.gallerySubtitle}</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
          {filteredArtworks.map((item, index) => {
            const isActive = item.id === activeArtworkId;
            const showSponsorAfterThis = !isPro && ((index + 1) % 10 === 0 || (filteredArtworks.length < 10 && index === 4));
            const sponsorIdx = Math.floor(index / 10) % GOURMET_CAT_SPONSORS.length;
            const currentSponsor = GOURMET_CAT_SPONSORS[sponsorIdx];

            return (
              <React.Fragment key={item.id}>
                <div
                  onClick={() => onSelectArtwork(item)}
                  className={`group cursor-pointer rounded-2xl overflow-hidden bg-gradient-to-b from-[#0b0f2e]/90 via-[#0e1438]/80 to-[#070a20]/95 border-2 transition-all duration-300 flex flex-col justify-between shadow-lg hover:shadow-[0_0_25px_rgba(0,245,212,0.25)] ${
                    isActive
                      ? 'border-yellow-400 ring-2 ring-yellow-400/40 shadow-[0_0_30px_rgba(255,183,3,0.35)] scale-[1.02]'
                      : 'border-indigo-900/60 hover:border-cyan-500/60'
                  }`}
                >
                  {/* Image top container */}
                  <div className="relative overflow-hidden aspect-square bg-[#050718]">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {/* Active badge overlay */}
                    {isActive && (
                      <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-yellow-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1 font-cyber">
                        <Check className="w-3 h-3 text-slate-950 stroke-[3]" />
                        <span>{t.expoMuseumTitle}</span>
                      </div>
                    )}

                    {/* User badge */}
                    {item.isUserCreated && (
                      <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-cyan-950/90 text-cyan-300 font-cyber font-semibold text-[10px] border border-cyan-500/50 shadow-sm backdrop-blur-xs">
                        {t.authorLocalBadge}
                      </div>
                    )}

                    {/* Style banner */}
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#070a20] via-[#070a20]/75 to-transparent p-2.5 pt-6">
                      <span className="text-[11px] font-gaudi font-semibold text-amber-200 block truncate">
                        {item.style}
                      </span>
                    </div>
                  </div>

                  {/* Info Card bottom */}
                  <div className="p-3.5 flex flex-col justify-between flex-grow">
                    <div>
                      <h4 className="font-gaudi font-bold text-sm text-slate-100 group-hover:text-yellow-300 transition-colors line-clamp-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-300/80 line-clamp-2 mt-1 leading-snug">
                        {item.description}
                      </p>
                    </div>

                    {/* Color dots & likes footer */}
                    <div className="mt-3 pt-2.5 border-t border-indigo-900/50 flex items-center justify-between">
                      <div className="flex items-center -space-x-1">
                        {item.palette.slice(0, 4).map((swatch, idx) => (
                          <span
                            key={idx}
                            className="w-3.5 h-3.5 rounded-full border border-white/30 shadow-sm"
                            style={{ backgroundColor: swatch.hex }}
                          />
                        ))}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            downloadArtworkImage(item.imageUrl, `${item.id}_vangogh_${item.title.replace(/\s+/g, '_')}`);
                          }}
                          className="p-1.5 rounded-lg text-cyan-200 hover:text-yellow-300 hover:bg-[#182161] transition-colors cursor-pointer"
                          title={t.downloadPainting}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        {(item.isUserCreated || item.source === 'my-local' || (currentUserId && item.authorId === currentUserId)) && onDeletePublication && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeletePublication(item);
                            }}
                            className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/80 transition-colors cursor-pointer"
                            title="Удалить публикацию автора (с защитой)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLike(item.id);
                          }}
                          className="flex items-center gap-1 text-xs text-cyan-200 hover:text-fuchsia-400 transition-colors cursor-pointer px-1 py-0.5 rounded-lg hover:bg-[#182161]"
                          title={t.likeArtworkTooltip}
                        >
                          <Heart className="w-3.5 h-3.5" />
                          <span className="font-cyber font-medium">{item.likes || 12}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Harmonious High-Art Sponsor Card: Exactly 1 in 10 items */}
                {showSponsorAfterThis && onOpenProModal && (
                  <CatSponsorCard
                    sponsor={currentSponsor}
                    onOpenProModal={onOpenProModal}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </section>
  );
};
