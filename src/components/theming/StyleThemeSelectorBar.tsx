import React from 'react';
import { useThemeStyle } from '../../context/ThemeStyleContext';
import { Palette, Check, Sparkles } from 'lucide-react';

interface StyleThemeSelectorBarProps {
  onStyleSelected?: (styleId: string) => void;
  compact?: boolean;
}

export const StyleThemeSelectorBar: React.FC<StyleThemeSelectorBarProps> = ({
  onStyleSelected,
  compact = false
}) => {
  const { activeStyleId, setActiveStyleId, allThemes, activeTheme } = useThemeStyle();

  const handleSelect = (id: string) => {
    setActiveStyleId(id);
    if (onStyleSelected) {
      onStyleSelected(id);
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg border text-sm" style={{
            background: activeTheme.accentBadgeBg,
            borderColor: activeTheme.accentBadgeBorder,
            color: activeTheme.accentBadgeText
          }}>
            <Palette className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs sm:text-sm font-gaudi font-bold text-slate-100 flex items-center gap-1.5">
              <span>Художественный стиль оформления:</span>
              <span className="font-semibold" style={{ color: activeTheme.accentBadgeText }}>
                {activeTheme.name}
              </span>
            </h4>
            <p className="text-[11px] text-slate-300/70 hidden sm:block">
              {activeTheme.moodDescription}
            </p>
          </div>
        </div>

        <div className="text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0" style={{
          background: activeTheme.accentBadgeBg,
          borderColor: activeTheme.accentBadgeBorder,
          color: activeTheme.accentBadgeText
        }}>
          <Sparkles className="w-3 h-3" />
          <span>Растровые фоны, плашки и кнопки</span>
        </div>
      </div>

      {/* Horizontal Scrollable Carousel of All 11 Authentic Style Themes */}
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-indigo-900/50 scrollbar-track-transparent">
        {allThemes.map((theme) => {
          const isActive = theme.id === activeStyleId;
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleSelect(theme.id)}
              className={`group relative flex-shrink-0 flex items-center gap-2.5 p-1.5 pr-3.5 rounded-2xl border transition-all duration-300 text-left cursor-pointer overflow-hidden ${
                isActive
                  ? 'scale-[1.03] shadow-lg ring-2 ring-offset-1 ring-offset-[#060814]'
                  : 'hover:scale-[1.01] hover:border-slate-400/40 opacity-80 hover:opacity-100'
              }`}
              style={{
                background: isActive ? theme.plateBg : 'rgba(12, 16, 38, 0.75)',
                borderColor: isActive ? theme.plateBorder : 'rgba(255, 255, 255, 0.1)',
                boxShadow: isActive ? theme.plateGlow : 'none',
                // @ts-ignore
                '--tw-ring-color': theme.plateBorder
              }}
            >
              {/* Raster Miniature Thumbnail */}
              <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 border border-white/20 shadow-inner">
                <img
                  src={theme.bgImageUrl}
                  alt={theme.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <span className="absolute bottom-0 right-0 text-xs px-1 rounded-tl-md bg-black/60 backdrop-blur-xs">
                  {theme.themeSymbol}
                </span>
                {isActive && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <Check className="w-5 h-5 text-white drop-shadow-md" />
                  </div>
                )}
              </div>

              {/* Text Info */}
              <div className="min-w-0">
                <div className="text-xs font-bold truncate max-w-[130px] sm:max-w-[150px]" style={{
                  color: isActive ? '#ffffff' : '#cbd5e1'
                }}>
                  {theme.name.split(' (')[0]}
                </div>
                <div className="text-[10px] text-slate-300/60 truncate max-w-[130px] sm:max-w-[150px]">
                  {theme.artist.split(',')[0]}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
