import React from 'react';
import { useThemeStyle } from '../../context/ThemeStyleContext';
import { GaudiCornerOrnament } from '../GaudiOrnaments';

interface ThemedPlateProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  showOrnaments?: boolean;
  intensity?: 'normal' | 'deep' | 'subtle';
  id?: string;
}

export const ThemedPlate: React.FC<ThemedPlateProps> = ({
  children,
  className = '',
  showOrnaments = true,
  intensity = 'normal',
  id,
  style,
  ...props
}) => {
  const { activeTheme } = useThemeStyle();

  const opacity = intensity === 'deep' ? 0.96 : intensity === 'subtle' ? 0.85 : 0.92;

  return (
    <div
      id={id}
      {...props}
      style={{
        background: activeTheme.plateBg,
        borderColor: activeTheme.plateBorder,
        boxShadow: activeTheme.plateGlow,
        ...style
      }}
      className={`relative rounded-3xl border backdrop-blur-xl transition-all duration-500 overflow-hidden ${className}`}
    >
      {/* Radiant Top Stained-Glass Rim matching the artist's palette */}
      <div
        className="absolute top-0 left-0 right-0 h-[2.5px] z-10 transition-all duration-500"
        style={{ background: activeTheme.plateRim }}
      />

      {/* Subtle Painterly Canvas Texture Watermark */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10 mix-blend-overlay bg-cover bg-center transition-all duration-700"
        style={{ backgroundImage: `url(${activeTheme.bgImageUrl})` }}
      />

      {/* Gaudi Corner Vignettes if enabled */}
      {showOrnaments && (
        <>
          <GaudiCornerOrnament position="top-left" />
          <GaudiCornerOrnament position="top-right" />
          <GaudiCornerOrnament position="bottom-left" />
          <GaudiCornerOrnament position="bottom-right" />
        </>
      )}

      {/* Inner Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};
