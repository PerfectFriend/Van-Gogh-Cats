import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, Palette, Info, Sparkles, Download, Loader2 } from 'lucide-react';
import { Artwork } from '../types';
import { downloadArtworkImage } from '../utils/downloadHelper';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedArtwork } from '../utils/i18n';

interface BrushstrokeZoomModalProps {
  artwork: Artwork | null;
  isOpen: boolean;
  onClose: () => void;
}

export const BrushstrokeZoomModal: React.FC<BrushstrokeZoomModalProps> = ({
  artwork,
  isOpen,
  onClose
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1.5);
  const [isDownloading, setIsDownloading] = useState(false);
  const { t } = useTranslation();

  if (!isOpen || !artwork) return null;

  const currentArtwork = getLocalizedArtwork(artwork, t);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const filename = `${currentArtwork.id}_vangogh_${currentArtwork.title.replace(/\s+/g, '_')}`;
      await downloadArtworkImage(currentArtwork.imageUrl, filename);
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="cyber-gaudi-card border-2 border-cyan-400/50 rounded-3xl w-full max-w-5xl shadow-[0_0_50px_rgba(0,245,212,0.25)] overflow-hidden flex flex-col max-h-[92vh] relative">
        {/* Swirling ambient glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-indigo-900/60 flex items-center justify-between bg-[#080d2c]/90 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center shadow-sm">
              <ZoomIn className="w-5 h-5 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-lg font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-cyan-300 flex items-center gap-2">
                {t.zoomModalHeader}: «{currentArtwork.title}»
              </h3>
              <p className="text-xs text-cyan-200/70">
                {t.zoomModalSub}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="cyber-btn-cobalt px-3 py-1.5 rounded-xl disabled:opacity-50 text-xs flex items-center gap-1.5 cursor-pointer shadow font-bold"
              title={t.downloadPainting}
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-300" />
              ) : (
                <Download className="w-3.5 h-3.5 text-cyan-300" />
              )}
              <span className="hidden sm:inline">{isDownloading ? t.zoomModalDownloading : t.zoomModalDownload}</span>
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.5, 3))}
              className="cyber-btn-gold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 font-bold cursor-pointer"
              title={t.zoomModalZoomIn}
            >
              <ZoomIn className="w-4 h-4 text-slate-950" />
              <span>+{Math.round(zoomLevel * 100)}%</span>
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.5, 1))}
              className="cyber-btn-cobalt px-3 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer font-bold"
              title={t.zoomModalZoomOut}
            >
              <ZoomOut className="w-4 h-4 text-cyan-300" />
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#121946] hover:bg-[#1a256a] text-cyan-200 flex items-center justify-center transition cursor-pointer border border-cyan-500/30 ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Zoom Canvas Area */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center relative z-10">
          {/* Zoom container */}
          <div className="lg:col-span-8 flex items-center justify-center bg-[#030514]/90 p-4 rounded-2xl border border-indigo-900/60 overflow-auto max-h-[60vh] relative group shadow-inner">
            <div className="overflow-auto max-h-[55vh] flex items-center justify-center">
              <img
                src={currentArtwork.imageUrl}
                alt={currentArtwork.title}
                referrerPolicy="no-referrer"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transition: 'transform 0.3s ease'
                }}
                className="max-h-[500px] object-contain rounded-xl shadow-[0_0_30px_rgba(0,245,212,0.15)] cursor-zoom-in"
                onClick={() => setZoomLevel(prev => (prev >= 2.5 ? 1 : prev + 0.5))}
              />
            </div>
            <div className="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-[#080d2c]/90 text-cyan-300 text-xs border border-cyan-400/40 shadow pointer-events-none font-cyber">
              {t.zoomModalHint}
            </div>
          </div>

          {/* Art Technique details */}
          <div className="lg:col-span-4 space-y-5">
            <div className="p-4 rounded-2xl bg-[#070b24]/90 border border-indigo-900/60 shadow-sm">
              <h4 className="text-sm font-gaudi font-bold text-yellow-200 flex items-center gap-2">
                <Info className="w-4 h-4 text-cyan-300" />
                {t.impastoTechniqueTitle}
              </h4>
              <p className="text-xs text-slate-200 mt-2 leading-relaxed font-sans">
                {currentArtwork.brushstrokeNote}
              </p>
              <p className="text-xs text-cyan-300/70 mt-2 leading-relaxed font-sans">
                {t.impastoTechniqueDesc}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-[#070b24]/90 border border-indigo-900/60 shadow-sm">
              <h4 className="text-sm font-gaudi font-bold text-yellow-200 flex items-center gap-2">
                <Palette className="w-4 h-4 text-cyan-300" />
                {t.colorContrastTitle}
              </h4>
              <div className="mt-3 space-y-2">
                {currentArtwork.palette.map((color, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-4 h-4 rounded-full border border-indigo-700 shadow-sm"
                        style={{ backgroundColor: color.hex }}
                      />
                      <span className="text-cyan-200 font-sans">{color.name}</span>
                    </div>
                    <span className="font-mono text-cyan-300">{color.hex}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
