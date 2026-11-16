import React from 'react';
import { useThemeStyle } from '../../context/ThemeStyleContext';

export const RasterThemeBackground: React.FC = () => {
  const { activeTheme } = useThemeStyle();

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* 1. Primary Raster Oil Canvas Wallpaper with smooth cross-fade */}
      <div
        key={activeTheme.id}
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 scale-[1.02] transform-gpu"
        style={{
          backgroundImage: `url(${activeTheme.bgImageUrl})`,
          filter: 'brightness(0.92) contrast(1.05) saturate(1.15)',
        }}
      />

      {/* 2. Deep Museum Wash & Vignette Layer (ensures pristine text legibility) */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          background: activeTheme.bgOverlay,
        }}
      />

      {/* 3. Subtle Painterly Impasto Canvas Texture Overlay */}
      <div
        className="absolute inset-0 opacity-20 mix-blend-color-burn pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(255,255,255,0.06) 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* 4. Soft Edge Vignette */}
      <div className="absolute inset-0 shadow-[inset_0_0_120px_rgba(0,0,0,0.85)] pointer-events-none" />
    </div>
  );
};
