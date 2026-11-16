import React, { useState, useRef } from 'react';
import { X, Sparkles, Download, Mail, Stamp, Send, Heart, Check, Share2 } from 'lucide-react';
import { Artwork } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface MuseumPostcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  artwork: Artwork | null;
  artistName?: string;
}

type StampType = 'van-gogh' | 'vermeer' | 'klimt' | 'monet';
type PaperStyle = 'arles-parchment' | 'paris-kraft' | 'saint-remy-lavender';

export const MuseumPostcardModal: React.FC<MuseumPostcardModalProps> = ({
  isOpen,
  onClose,
  artwork,
  artistName = 'Винсент Рыжехвостый'
}) => {
  const { t } = useTranslation();
  const [recipient, setRecipient] = useState<string>('Любителю изящных искусств и котиков');
  const [message, setMessage] = useState<string>(
    'Шлю тёплый мурчащий привет из галереи Арля! Под этим звёздным небом краска ложится густыми мазками, а пушистый натурщик сладко дремлет рядом.'
  );
  const [selectedStamp, setSelectedStamp] = useState<StampType>('van-gogh');
  const [selectedPaper, setSelectedPaper] = useState<PaperStyle>('arles-parchment');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const postcardCardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !artwork) return null;

  const stampsConfig = {
    'van-gogh': {
      title: 'Ван Гог 1888',
      price: '15¢',
      color: 'bg-amber-700 text-yellow-200 border-amber-900',
      icon: '🌻'
    },
    'vermeer': {
      title: 'Делфтский кот',
      price: '25¢',
      color: 'bg-blue-800 text-blue-100 border-blue-950',
      icon: '💎'
    },
    'klimt': {
      title: 'Золотой Климт',
      price: '50¢',
      color: 'bg-yellow-700 text-yellow-100 border-yellow-900',
      icon: '👑'
    },
    'monet': {
      title: 'Живерни 1899',
      price: '30¢',
      color: 'bg-emerald-800 text-emerald-100 border-emerald-950',
      icon: '🪷'
    }
  };

  const paperStyles = {
    'arles-parchment': {
      bg: 'bg-[#fcf8ed] text-stone-900 border-[#d8caa6]',
      lineColor: 'border-stone-400/40',
      postmarkColor: 'text-[#684126]/80'
    },
    'paris-kraft': {
      bg: 'bg-[#ebdcc4] text-amber-950 border-[#bfa985]',
      lineColor: 'border-amber-900/30',
      postmarkColor: 'text-[#472d1a]/80'
    },
    'saint-remy-lavender': {
      bg: 'bg-[#f4effc] text-indigo-950 border-[#cfbfeb]',
      lineColor: 'border-indigo-400/30',
      postmarkColor: 'text-[#3d2b63]/80'
    }
  };

  const currentPaper = paperStyles[selectedPaper];
  const activeStamp = stampsConfig[selectedStamp];

  // Draw and export high-res PNG postcard via HTML5 Canvas
  const handleDownloadPostcard = async () => {
    setIsExporting(true);
    try {
      const canvas = document.createElement('canvas');
      const width = 1200;
      const height = 800;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // 1. Draw Paper background
      ctx.fillStyle = selectedPaper === 'arles-parchment' ? '#fcf8ed' : selectedPaper === 'paris-kraft' ? '#ebdcc4' : '#f4effc';
      ctx.fillRect(0, 0, width, height);

      // Vintage grain border
      ctx.strokeStyle = '#8c7355';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, width - 40, height - 40);
      ctx.strokeStyle = '#c5b497';
      ctx.lineWidth = 1;
      ctx.strokeRect(26, 26, width - 52, height - 52);

      // Vertical postcard divider line
      ctx.beginPath();
      ctx.strokeStyle = '#9e8c75';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.moveTo(width / 2, 40);
      ctx.lineTo(width / 2, height - 40);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Draw Artwork on Left Half
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = artwork.imageUrl;

      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });

      // Frame background on left
      const artX = 50;
      const artY = 50;
      const artW = 480;
      const artH = 560;

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 6;
      ctx.fillRect(artX, artY, artW, artH);
      ctx.shadowColor = 'transparent';

      try {
        ctx.drawImage(img, artX + 16, artY + 16, artW - 32, artH - 70);
      } catch {
        ctx.fillStyle = '#edd6b1';
        ctx.fillRect(artX + 16, artY + 16, artW - 32, artH - 70);
      }

      // Title underneath artwork
      ctx.fillStyle = '#3a2518';
      ctx.font = 'italic bold 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(`«${artwork.title}»`, artX + artW / 2, artY + artH - 22);

      // 3. Right Half: Stamp, Postmark, and Handwritten Text
      // Draw Postal Stamp in top-right
      const stampX = width - 180;
      const stampY = 50;
      const stampW = 130;
      const stampH = 150;

      ctx.fillStyle = selectedStamp === 'van-gogh' ? '#b45309' : selectedStamp === 'vermeer' ? '#1e40af' : '#a16207';
      ctx.fillRect(stampX, stampY, stampW, stampH);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 3;
      ctx.strokeRect(stampX + 5, stampY + 5, stampW - 10, stampH - 10);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(activeStamp.icon, stampX + stampW / 2, stampY + 50);
      ctx.font = 'bold 14px Georgia, serif';
      ctx.fillText(activeStamp.title, stampX + stampW / 2, stampY + 85);
      ctx.font = 'bold 18px monospace';
      ctx.fillText(activeStamp.price, stampX + stampW / 2, stampY + 120);

      // 4. Postal Cancellation Postmark
      ctx.save();
      ctx.translate(stampX - 20, stampY + 70);
      ctx.rotate(-0.15);
      ctx.strokeStyle = '#4a2c16';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = 'bold 11px sans-serif';
      ctx.fillStyle = '#4a2c16';
      ctx.textAlign = 'center';
      ctx.fillText('POSTE D’ARLES', 0, -22);
      ctx.fillText('1888 • FÉLIN', 0, 0);
      ctx.fillText('★ RF ★', 0, 24);

      // Wavy ink cancellation lines
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        ctx.moveTo(48, i * 12);
        ctx.bezierCurveTo(80, i * 12 - 6, 110, i * 12 + 6, 140, i * 12);
      }
      ctx.stroke();
      ctx.restore();

      // 5. Handwritten Message (Left of Right Half)
      ctx.fillStyle = '#221914';
      ctx.font = 'italic 20px "Segoe Print", "Comic Sans MS", cursive, sans-serif';
      ctx.textAlign = 'left';

      // Word wrapping for message
      const textX = width / 2 + 30;
      let textY = 220;
      const maxWidth = 340;
      const words = message.split(' ');
      let currentLine = '';

      for (let n = 0; n < words.length; n++) {
        const testLine = currentLine + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(currentLine, textX, textY);
          currentLine = words[n] + ' ';
          textY += 32;
        } else {
          currentLine = testLine;
        }
      }
      ctx.fillText(currentLine, textX, textY);

      // Signature
      textY += 45;
      ctx.font = 'italic bold 22px Georgia, serif';
      ctx.fillText(`— ${artistName} 🐾`, textX + 40, textY);

      // 6. Recipient Address Lines in bottom-right
      const addrX = width / 2 + 180;
      let addrY = height - 240;

      ctx.fillStyle = '#614d3e';
      ctx.font = '12px sans-serif';
      ctx.fillText('Кому / Destinataire:', addrX, addrY);
      addrY += 24;

      ctx.fillStyle = '#1c130d';
      ctx.font = 'bold 18px Georgia, serif';
      ctx.fillText(recipient, addrX, addrY);

      // Dotted address lines
      for (let i = 0; i < 3; i++) {
        addrY += 36;
        ctx.beginPath();
        ctx.strokeStyle = '#a69279';
        ctx.lineWidth = 1;
        ctx.moveTo(addrX, addrY);
        ctx.lineTo(width - 50, addrY);
        ctx.stroke();
      }

      // Download generated image
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `Postcard_${artwork.title.replace(/\s+/g, '_')}_Arles1888.png`;
      a.click();
    } catch (err) {
      console.error('Error generating postcard:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyText = () => {
    const shareText = `«${artwork.title}» • Музейная открытка из Арля\n"${message}"\n— ${artistName} 🐾`;
    navigator.clipboard.writeText(shareText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="cyber-gaudi-card border-2 border-cyan-400/50 rounded-3xl max-w-4xl w-full flex flex-col shadow-[0_0_50px_rgba(0,245,212,0.25)] overflow-hidden my-auto max-h-[96vh] relative">
        {/* Swirling ambient glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Header */}
        <div className="px-5 py-4 bg-[#080d2c]/90 border-b border-indigo-900/60 flex items-center justify-between relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 text-cyan-300 flex items-center justify-center border border-cyan-400/40 shadow-sm">
              <Mail className="w-4 h-4 text-cyan-300" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-cyan-300">
                Музейная Открытка из Арля (1888)
              </h3>
              <p className="text-[11px] text-cyan-200/70">
                Винтажная почтовая карточка с шедевром «{artwork.title}»
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

        {/* Customization Toolbar */}
        <div className="p-4 bg-[#090e30]/80 border-b border-indigo-900/60 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs relative z-10">
          {/* Stamp selector */}
          <div>
            <label className="block text-[11px] font-cyber text-cyan-300 mb-1">Марка музея:</label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(stampsConfig) as StampType[]).map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStamp(st)}
                  className={`px-2 py-1.5 rounded-xl border text-left flex items-center gap-1.5 transition cursor-pointer ${
                    selectedStamp === st
                      ? 'cyber-btn-gold font-bold shadow-sm'
                      : 'bg-[#06081c] text-cyan-200/80 border-indigo-800/60 hover:border-cyan-400/40'
                  }`}
                >
                  <span>{stampsConfig[st].icon}</span>
                  <span className="truncate">{stampsConfig[st].title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Paper theme */}
          <div>
            <label className="block text-[11px] font-cyber text-cyan-300 mb-1">Бумага:</label>
            <div className="flex gap-1.5">
              {[
                { id: 'arles-parchment', label: 'Арль 1888' },
                { id: 'paris-kraft', label: 'Крафт' },
                { id: 'saint-remy-lavender', label: 'Лаванда' }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPaper(p.id as PaperStyle)}
                  className={`flex-1 px-2 py-1.5 rounded-xl border text-center font-medium transition cursor-pointer ${
                    selectedPaper === p.id
                      ? 'cyber-btn-gold font-bold'
                      : 'bg-[#06081c] text-cyan-200/80 border-indigo-800/60 hover:border-cyan-400/40'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recipient */}
          <div>
            <label className="block text-[11px] font-cyber text-cyan-300 mb-1">Кому (Адресат):</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-3 py-1.5 rounded-xl bg-[#06081c] border border-indigo-700/50 text-slate-100 text-xs focus:outline-none focus:border-cyan-400 font-sans"
            />
          </div>
        </div>

        {/* Postcard Interactive Preview Canvas Card */}
        <div className="p-4 sm:p-6 bg-[#050716] flex flex-col items-center justify-center overflow-y-auto relative z-10">
          <div
            ref={postcardCardRef}
            className={`w-full max-w-2xl rounded-2xl border-4 shadow-2xl p-4 sm:p-6 transition-all duration-300 relative ${currentPaper.bg}`}
          >
            {/* Stamp & Cancellation in Top Right */}
            <div className="absolute top-4 right-4 flex items-center">
              {/* Cancellation mark */}
              <div className="relative -mr-5 z-10 select-none pointer-events-none">
                <div
                  className={`w-20 h-20 rounded-full border-2 border-dashed flex flex-col items-center justify-center text-[9px] font-mono uppercase tracking-wider rotate-[-12deg] ${currentPaper.postmarkColor}`}
                >
                  <span className="font-bold">POSTE ARLES</span>
                  <span className="text-[8px]">1888 • CHAT</span>
                  <span>★ RF ★</span>
                </div>
              </div>

              {/* Postal Stamp */}
              <div
                className={`w-16 h-20 rounded border-2 border-dashed flex flex-col items-center justify-between p-1 shadow-md select-none ${activeStamp.color}`}
              >
                <div className="text-sm">{activeStamp.icon}</div>
                <div className="text-[9px] font-serif font-bold text-center leading-tight">
                  {activeStamp.title}
                </div>
                <div className="text-[10px] font-mono font-bold">{activeStamp.price}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              {/* Left Column: Framed Masterpiece on Postcard */}
              <div className="bg-white p-2.5 rounded-xl shadow-md border border-stone-300/80 transform -rotate-1">
                <div className="overflow-hidden rounded-lg aspect-square bg-stone-900 relative">
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/80 to-transparent text-white text-[11px] font-serif italic text-center">
                    «{artwork.title}»
                  </div>
                </div>
              </div>

              {/* Right Column: Handwritten Message & Address */}
              <div className="flex flex-col justify-between pt-10 sm:pt-4 space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold tracking-wider opacity-60 block mb-1">
                    Текст послания (кликните для правки):
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full bg-transparent font-serif italic text-xs leading-relaxed resize-none border-b border-stone-400/40 focus:outline-none focus:border-amber-700"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="font-serif italic text-xs font-bold">
                    С почтением, <span className="text-amber-800">{artistName}</span> 🐾
                  </div>
                  {/* Paw Wax Seal */}
                  <div className="w-8 h-8 rounded-full bg-red-800 text-yellow-300 shadow-md flex items-center justify-center text-xs border border-red-950/60 ring-2 ring-red-700">
                    🐾
                  </div>
                </div>

                <div className="pt-2 border-t border-dashed border-stone-400/50 text-[11px]">
                  <span className="opacity-60 text-[10px]">Кому: </span>
                  <span className="font-serif font-bold">{recipient}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-4 bg-[#080d2c]/90 border-t border-indigo-900/60 flex flex-wrap items-center justify-between gap-3 text-xs relative z-10">
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="cyber-btn-cobalt px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-cyan-300" /> : <Share2 className="w-3.5 h-3.5 text-cyan-300" />}
              <span>{isCopied ? 'Скопировано!' : 'Скопировать текст'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="cyber-btn-cobalt px-4 py-2 rounded-xl text-cyan-200 transition cursor-pointer font-bold"
            >
              Закрыть
            </button>
            <button
              onClick={handleDownloadPostcard}
              disabled={isExporting}
              className="cyber-btn-gold px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5 text-slate-950" />
              <span>{isExporting ? 'Создание открытки...' : 'Скачать открытку (PNG)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
