import React from 'react';
import { useThemeStyle } from '../../context/ThemeStyleContext';

export const RasterThemeBackground: React.FC = () => {
  const { activeTheme } = useThemeStyle();

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* 1. Primary Raster Oil Canvas Wallpaper with subtle presence */}
      <div
        key={activeTheme.id}
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 scale-[1.02] transform-gpu opacity-25"
        style={{
          backgroundImage: `url(${activeTheme.bgImageUrl})`,
          filter: 'brightness(0.65) contrast(1.05) saturate(1.1)',
        }}
      />

      {/* 2. Deep Instagram Dark Canvas Wash (ensures clean photo-first contrast) */}
      <div
        className="absolute inset-0 transition-all duration-700"
        style={{
          background: 'linear-gradient(180deg, rgba(5, 7, 15, 0.88) 0%, rgba(7, 10, 22, 0.92) 60%, rgba(4, 6, 14, 0.96) 100%)',
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
