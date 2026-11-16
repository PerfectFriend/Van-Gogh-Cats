import React from 'react';

/**
 * Gaudi & Van Gogh Ornamental SVG Elements
 * Inspired by Antoni Gaudí's organic wrought-iron curves (Casa Batlló, Park Güell)
 * and Vincent van Gogh's swirling brushstrokes (The Starry Night, Sunflowers).
 */

// 1. Corner Vignette Ornament (for 4 corners of cards and modals)
export const GaudiCornerOrnament: React.FC<{
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  className?: string;
  color?: string;
}> = ({ position, className = '', color = 'currentColor' }) => {
  const transform = {
    'top-left': '',
    'top-right': 'scale(-1, 1)',
    'bottom-left': 'scale(1, -1)',
    'bottom-right': 'scale(-1, -1)',
  }[position];

  return (
    <div
      className={`absolute pointer-events-none select-none z-20 ${
        position === 'top-left' ? 'top-1.5 left-1.5' :
        position === 'top-right' ? 'top-1.5 right-1.5' :
        position === 'bottom-left' ? 'bottom-1.5 left-1.5' :
        'bottom-1.5 right-1.5'
      } ${className}`}
      style={{ transform }}
    >
      <svg
        width="38"
        height="38"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-85 filter drop-shadow-[0_0_6px_rgba(255,183,3,0.5)]"
      >
        {/* Gaudi organic curved ironwork corner with Van Gogh swirl spiral */}
        <path
          d="M3 45C3 21.804 21.804 3 45 3"
          stroke="url(#gaudiGradGold)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M8 45C8 24.5685 24.5685 8 45 8"
          stroke="url(#gaudiGradCyan)"
          strokeWidth="1.2"
          strokeDasharray="2 3"
          strokeLinecap="round"
        />
        {/* Inner Van Gogh spiral vortex flourish */}
        <path
          d="M14 26C14 19.3726 19.3726 14 26 14C30 14 33 17 33 21C33 24 30.5 26.5 27.5 26.5C25 26.5 23 24.5 23 22"
          stroke="url(#gaudiGradGold)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        {/* Stained-glass mosaic jewel points */}
        <circle cx="6" cy="6" r="3.5" fill="#ffb703" filter="drop-shadow(0 0 4px #ffb703)" />
        <circle cx="6" cy="6" r="1.5" fill="#ffffff" />
        <circle cx="26" cy="6" r="2" fill="#00f5d4" />
        <circle cx="6" cy="26" r="2" fill="#f72585" />
        <circle cx="45" cy="3" r="2.5" fill="#ffb703" />
        <circle cx="3" cy="45" r="2.5" fill="#00f5d4" />

        <defs>
          <linearGradient id="gaudiGradGold" x1="3" y1="3" x2="45" y2="45" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffd166" />
            <stop offset="0.5" stopColor="#ffb703" />
            <stop offset="1" stopColor="#fb8500" />
          </linearGradient>
          <linearGradient id="gaudiGradCyan" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop stopColor="#00f5d4" />
            <stop offset="1" stopColor="#4361ee" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};

// 2. Central Arch Crest / Medallion (for card headers and dividers)
export const GaudiMedallionCrest: React.FC<{
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, icon, className = '' }) => {
  return (
    <div className={`relative flex flex-col items-center justify-center my-3 select-none ${className}`}>
      <div className="flex items-center gap-3 w-full max-w-lg">
        {/* Left organic swirl flourish */}
        <svg width="60" height="24" viewBox="0 0 80 32" fill="none" className="flex-1 opacity-80">
          <path
            d="M0 16C25 16 35 30 50 30C65 30 75 16 80 16"
            stroke="url(#medallionGradLeft)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10 16C20 16 28 6 42 6C55 6 65 16 75 16"
            stroke="#00f5d4"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <circle cx="42" cy="6" r="2" fill="#ffd166" />
          <defs>
            <linearGradient id="medallionGradLeft" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="transparent" />
              <stop offset="0.5" stopColor="#ffb703" />
              <stop offset="1" stopColor="#00f5d4" />
            </linearGradient>
          </defs>
        </svg>

        {/* Central Crown / Medallion */}
        <div className="relative flex items-center justify-center p-1.5 rounded-full bg-gradient-to-r from-amber-400 via-fuchsia-500 to-cyan-400 shadow-[0_0_15px_rgba(255,183,3,0.5)]">
          <div className="w-8 h-8 rounded-full bg-[#080d28] flex items-center justify-center border border-amber-300/40">
            {icon || <span className="text-sm">✨</span>}
          </div>
        </div>

        {/* Right organic swirl flourish */}
        <svg width="60" height="24" viewBox="0 0 80 32" fill="none" className="flex-1 opacity-80" style={{ transform: 'scale(-1, 1)' }}>
          <path
            d="M0 16C25 16 35 30 50 30C65 30 75 16 80 16"
            stroke="url(#medallionGradRight)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10 16C20 16 28 6 42 6C55 6 65 16 75 16"
            stroke="#00f5d4"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
          <circle cx="42" cy="6" r="2" fill="#ffd166" />
          <defs>
            <linearGradient id="medallionGradRight" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="transparent" />
              <stop offset="0.5" stopColor="#ffb703" />
              <stop offset="1" stopColor="#00f5d4" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {title && (
        <span className="mt-1 text-xs font-gaudi font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-300 to-cyan-200">
          {title}
        </span>
      )}
      {subtitle && (
        <span className="text-[10px] text-cyan-200/60 font-sans">{subtitle}</span>
      )}
    </div>
  );
};

// 3. Van Gogh & Gaudi Ornate Horizontal Divider
export const VanGoghOrnateDivider: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`relative py-3 flex items-center justify-center select-none ${className}`}>
      <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent"></div>
      <div className="absolute inset-x-0 flex items-center justify-center gap-2">
        <span className="text-amber-400/70 text-xs">〰️</span>
        <div className="w-2.5 h-2.5 rotate-45 bg-gradient-to-br from-amber-300 to-cyan-400 shadow-[0_0_8px_rgba(255,183,3,0.8)] border border-white/60"></div>
        <span className="text-cyan-400/70 text-xs">〰️</span>
      </div>
    </div>
  );
};

// 4. Button Ornamental Wing (Adds Gaudi wrought iron curls to button edges)
export const ButtonOrnamentFlourish: React.FC<{ side: 'left' | 'right' }> = ({ side }) => {
  return (
    <svg
      width="14"
      height="18"
      viewBox="0 0 14 18"
      fill="none"
      className={`shrink-0 opacity-80 group-hover:opacity-100 transition-transform duration-300 ${
        side === 'left' ? 'group-hover:-translate-x-0.5' : 'group-hover:translate-x-0.5 -scale-x-100'
      }`}
    >
      <path
        d="M2 9C2 4.5 5 2 9 2C12 2 13 4 12 6C11 8 8 8 7 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M2 9C2 13.5 5 16 9 16C12 16 13 14 12 12C11 10 8 10 7 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="2" cy="9" r="1.5" fill="currentColor" />
    </svg>
  );
};
