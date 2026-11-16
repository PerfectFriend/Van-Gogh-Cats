import React, { useState, useRef } from 'react';
import { X, Sparkles, Sliders, Check, Download, Eye, Maximize2, Lightbulb } from 'lucide-react';
import { Artwork } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface MuseumFramingModalProps {
  isOpen: boolean;
  onClose: () => void;
  artwork: Artwork | null;
}

type FrameStyle = 'baroque-gold' | 'dutch-oak' | 'provence-walnut' | 'gallery-black';
type WallStyle = 'royal-burgundy' | 'midnight-ultramarine' | 'sage-velvet' | 'arles-stone';

export const MuseumFramingModal: React.FC<MuseumFramingModalProps> = ({
  isOpen,
  onClose,
  artwork
}) => {
  const { t } = useTranslation();
  const [selectedFrame, setSelectedFrame] = useState<FrameStyle>('baroque-gold');
  const [selectedWall, setSelectedWall] = useState<WallStyle>('royal-burgundy');
  const [hasSpotlight, setHasSpotlight] = useState<boolean>(true);
  const [showBenchCat, setShowBenchCat] = useState<boolean>(true);
  const roomRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !artwork) return null;

  // Frame styling classes & inline border properties
  const getFrameStyling = () => {
    switch (selectedFrame) {
      case 'baroque-gold':
        return {
          wrapper: 'p-6 sm:p-8 bg-gradient-to-tr from-yellow-700 via-amber-300 to-yellow-800 border-[14px] sm:border-[18px] border-[#976a16] shadow-[0_25px_60px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,230,120,0.5)] ring-4 ring-yellow-950/80',
          mat: 'p-3 bg-[#f7f4ea] shadow-inner ring-1 ring-amber-900/40',
          plaque: 'bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400 text-amber-950 border-amber-600 shadow-lg'
        };
      case 'dutch-oak':
        return {
          wrapper: 'p-6 sm:p-7 bg-gradient-to-tr from-stone-900 via-amber-950 to-stone-950 border-[16px] sm:border-[20px] border-[#2c1d11] shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_0_25px_rgba(0,0,0,0.9)] ring-2 ring-stone-900',
          mat: 'p-3 sm:p-4 bg-[#e8e2cf] shadow-inner ring-1 ring-stone-800',
          plaque: 'bg-gradient-to-r from-stone-300 via-amber-100 to-stone-300 text-stone-900 border-stone-600 shadow-lg'
        };
      case 'provence-walnut':
        return {
          wrapper: 'p-5 sm:p-6 bg-gradient-to-b from-[#5a3825] via-[#432818] to-[#2d1b10] border-[12px] sm:border-[16px] border-[#382012] shadow-[0_25px_50px_rgba(0,0,0,0.8)]',
          mat: 'p-2 bg-[#fdfbf7] shadow-inner ring-1 ring-[#5a3825]/40',
          plaque: 'bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-300 text-amber-950 border-amber-800'
        };
      case 'gallery-black':
        return {
          wrapper: 'p-4 sm:p-5 bg-neutral-950 border-[8px] sm:border-[10px] border-neutral-900 shadow-[0_30px_70px_rgba(0,0,0,0.9)] ring-1 ring-neutral-800',
          mat: 'p-4 sm:p-5 bg-white shadow-sm ring-1 ring-neutral-300',
          plaque: 'bg-neutral-900 text-neutral-100 border-neutral-700'
        };
    }
  };

  const getWallStyling = () => {
    switch (selectedWall) {
      case 'royal-burgundy':
        return 'bg-[#2b080c] bg-[radial-gradient(#401015_1px,transparent_1px)] [background-size:24px_24px]';
      case 'midnight-ultramarine':
        return 'bg-[#0a1526] bg-[radial-gradient(#142642_1px,transparent_1px)] [background-size:24px_24px]';
      case 'sage-velvet':
        return 'bg-[#122116] bg-[radial-gradient(#1e3323_1px,transparent_1px)] [background-size:24px_24px]';
      case 'arles-stone':
        return 'bg-[#261e18] bg-[radial-gradient(#382c23_1px,transparent_1px)] [background-size:24px_24px]';
    }
  };

  const frameInfo = getFrameStyling();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="cyber-gaudi-card border-2 border-cyan-400/50 rounded-3xl max-w-5xl w-full flex flex-col shadow-[0_0_50px_rgba(0,245,212,0.25)] overflow-hidden my-auto max-h-[96vh] relative">
        {/* Swirling ambient glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header bar */}
        <div className="px-5 py-4 bg-[#080d2c]/90 border-b border-indigo-900/60 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center border border-cyan-400/40 shadow-sm">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-cyan-300">
                Багетная Мастерская & Зал Музея
              </h3>
              <p className="text-[11px] text-cyan-200/70">
                Интерактивная примерка шедевра «{artwork.title}» в музейном зале
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

        {/* Controls Toolbar */}
        <div className="px-5 py-3 bg-[#090e30]/80 border-b border-indigo-900/60 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
          {/* Frame Selectors */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-cyan-300 font-cyber mr-1 text-[11px]">Рама:</span>
            {[
              { id: 'baroque-gold', label: 'Золотой барокко 1888' },
              { id: 'dutch-oak', label: 'Делфтский дуб' },
              { id: 'provence-walnut', label: 'Арльский орех' },
              { id: 'gallery-black', label: 'Галерейный минимал' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFrame(f.id as FrameStyle)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition border cursor-pointer ${
                  selectedFrame === f.id
                    ? 'cyber-btn-gold shadow-sm'
                    : 'bg-[#06081c] text-cyan-200/80 border-indigo-800/60 hover:border-cyan-400/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Wall Selectors */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <span className="text-cyan-300 font-cyber mr-1 text-[11px]">Стена:</span>
            {[
              { id: 'royal-burgundy', color: '#3d0c11', label: 'Бордо' },
              { id: 'midnight-ultramarine', color: '#0b1d33', label: 'Ультрамарин' },
              { id: 'sage-velvet', color: '#1a3320', label: 'Олива' },
              { id: 'arles-stone', color: '#382d24', label: 'Песчаник' }
            ].map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWall(w.id as WallStyle)}
                className={`w-6 h-6 rounded-full border-2 transition cursor-pointer ${
                  selectedWall === w.id ? 'scale-110 border-cyan-400 ring-2 ring-cyan-400/50' : 'border-indigo-700/60'
                }`}
                style={{ backgroundColor: w.color }}
                title={w.label}
              />
            ))}

            <button
              onClick={() => setHasSpotlight(!hasSpotlight)}
              className={`ml-2 px-3 py-1 rounded-xl border flex items-center gap-1 transition cursor-pointer font-cyber ${
                hasSpotlight ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50' : 'bg-[#06081c] text-cyan-200/60 border-indigo-800/60'
              }`}
              title="Музейный софит"
            >
              <Lightbulb className="w-3.5 h-3.5" />
              <span>Софит</span>
            </button>
          </div>
        </div>

        {/* The Museum Wall Simulation Stage */}
        <div
          ref={roomRef}
          className={`relative flex-1 min-h-[440px] sm:min-h-[520px] flex flex-col items-center justify-center p-6 sm:p-12 overflow-hidden transition-colors duration-700 ${getWallStyling()}`}
        >
          {/* Museum Spotlight Beam */}
          {hasSpotlight && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[90%] sm:w-[600px] h-[500px] pointer-events-none bg-gradient-to-b from-amber-200/20 via-amber-100/5 to-transparent blur-3xl rounded-full transform -translate-y-20"></div>
          )}

          {/* Picture Rail Cord hanging from top ceiling */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 flex justify-between w-48 sm:w-64 h-12 pointer-events-none z-10">
            <div className="w-0.5 h-full bg-gradient-to-b from-amber-600/80 to-amber-700/40"></div>
            <div className="w-0.5 h-full bg-gradient-to-b from-amber-600/80 to-amber-700/40"></div>
          </div>

          {/* Framed Canvas */}
          <div className={`relative z-20 transition-all duration-500 max-w-[85vw] sm:max-w-xl ${frameInfo.wrapper}`}>
            {/* Museum Passe-partout / Mat */}
            <div className={frameInfo.mat}>
              <div className="relative overflow-hidden bg-black/80 max-h-[50vh]">
                <img
                  src={artwork.imageUrl}
                  alt={artwork.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-contain max-h-[46vh] block"
                />
                {/* Canvas impasto gloss reflex */}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none"></div>
              </div>
            </div>

            {/* Museum Brass Plaque */}
            <div className="mt-3 sm:mt-4 text-center">
              <div
                className={`inline-block px-4 py-1.5 rounded border text-[11px] font-gaudi font-bold tracking-wide uppercase transition-colors duration-300 ${frameInfo.plaque}`}
              >
                <span>{artwork.title}</span>
                <span className="mx-2 opacity-60">•</span>
                <span className="font-sans text-[10px] font-semibold opacity-90">{artwork.year}</span>
              </div>
              <p className="text-[10px] text-amber-200/80 mt-1 font-sans italic">
                Холст, масло, техника импасто. Размер полотна: 73 × 92 см (Французский формат №30)
              </p>
            </div>
          </div>

          {/* Museum Floor & Bench with Resting Cat */}
          <div className="w-full absolute bottom-0 inset-x-0 h-16 sm:h-20 bg-gradient-to-t from-stone-950 via-stone-900 to-transparent border-t border-stone-800/40 flex items-end justify-center px-4">
            {showBenchCat && (
              <div className="flex items-center gap-2 mb-2 text-cyan-200 text-xs bg-[#060818]/90 px-3.5 py-1.5 rounded-xl border border-cyan-500/30 shadow-md">
                <span className="text-base">🛋️ 🐾</span>
                <span className="text-[11px] text-yellow-200 font-serif">
                  На бархатной скамье зала дремлет музейный кот Смоки
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer info bar */}
        <div className="px-5 py-3.5 bg-[#080d2c]/90 border-t border-indigo-900/60 flex items-center justify-between text-xs text-cyan-200/80 relative z-10">
          <span className="text-[11px] font-mono text-cyan-300/80">
            Музейная экспозиция • P2P Web of Trust Gallery
          </span>
          <button
            onClick={onClose}
            className="cyber-btn-cobalt px-4 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer"
          >
            Закрыть зал
          </button>
        </div>
      </div>
    </div>
  );
};
