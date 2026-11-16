import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ZoomIn,
  Download,
  Edit3,
  Heart,
  Share2,
  Check,
  Palette,
  Info,
  ShieldAlert,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  Volume2,
  VolumeX,
  Headphones,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Coffee,
  Mail,
  BookOpen,
  Trash2
} from 'lucide-react';
import { Artwork } from '../types';
import { downloadArtworkImage } from '../utils/downloadHelper';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedArtwork } from '../utils/i18n';
import { museumAudio } from '../utils/museumAudio';
import { GOURMET_CAT_SPONSORS } from '../data/catSponsors';
import { GaudiCornerOrnament, ButtonOrnamentFlourish } from './GaudiOrnaments';
import { useThemeStyle } from '../context/ThemeStyleContext';
import { VoiceboxAudioGuidePlayer } from './VoiceboxAudioGuidePlayer';

interface MasterpieceViewerProps {
  artwork: Artwork;
  onOpenZoom: (artwork: Artwork) => void;
  onOpenEditor: (artwork: Artwork) => void;
  onLike: (id: string) => void;
  onReportDispute?: (artwork: Artwork) => void;
  onDeletePublication?: (artwork: Artwork) => void;
  canDelete?: boolean;
  isPro?: boolean;
  onOpenProModal?: () => void;
  onOpenFramingModal?: (artwork: Artwork) => void;
  onOpenPostcard?: (artwork: Artwork) => void;
  onOpenGuestbook?: (artwork: Artwork) => void;
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  artworkIndex?: number;
  totalArtworks?: number;
  inspectedCount?: number;
}

export const MasterpieceViewer: React.FC<MasterpieceViewerProps> = ({
  artwork,
  onOpenZoom,
  onOpenEditor,
  onLike,
  onReportDispute,
  onDeletePublication,
  canDelete = false,
  isPro = false,
  onOpenProModal,
  onOpenFramingModal,
  onOpenPostcard,
  onOpenGuestbook,
  onNavigatePrev,
  onNavigateNext,
  artworkIndex = 0,
  totalArtworks = 1,
  inspectedCount = 1
}) => {
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [isLiked, setIsLiked] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPurring, setIsPurring] = useState(false);
  const [isNarrating, setIsNarrating] = useState(false);
  const [isVoiceboxPlayerOpen, setIsVoiceboxPlayerOpen] = useState(false);
  const [isTastingBannerDismissed, setIsTastingBannerDismissed] = useState(false);
  const { t, language } = useTranslation();
  const { activeTheme } = useThemeStyle();

  const currentArtwork = getLocalizedArtwork(artwork, t);

  // Stop sounds on unmount or artwork switch
  useEffect(() => {
    setIsLiked(false);
    museumAudio.stopSpeech();
    setIsNarrating(false);
    setIsTastingBannerDismissed(false);
  }, [artwork.id]);

  // Audio Engine subscription for real-time speech and purr status
  useEffect(() => {
    const unsub = museumAudio.subscribe((st) => {
      setIsNarrating(st.isPlaying || st.isBuffering);
      if (st.purrBackgroundEnabled && st.isPlaying) {
        setIsPurring(true);
      }
    });
    return () => {
      unsub();
      museumAudio.stopSpeech();
      museumAudio.stopPurr();
    };
  }, []);

  const handleCopyColor = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      const filename = `${currentArtwork.id}_vangogh_${currentArtwork.title.replace(/\s+/g, '_')}`;
      await downloadArtworkImage(currentArtwork.imageUrl, filename);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTogglePurr = () => {
    const active = museumAudio.togglePurr(0.18);
    setIsPurring(active);
  };

  const handleToggleNarration = () => {
    setIsVoiceboxPlayerOpen(true);
    if (isNarrating) {
      museumAudio.pause();
    } else {
      const narrationText = `${currentArtwork.title}. Стиль: ${currentArtwork.style}. ${currentArtwork.description}. Особенность мазка: ${currentArtwork.brushstrokeNote}`;
      museumAudio.playNeuralNarration(narrationText, currentArtwork.id);
    }
  };

  // Determine if this 10th inspection triggers the harmonious sponsor degustation
  const showSponsorDegustation = !isPro && !isTastingBannerDismissed && inspectedCount > 0 && inspectedCount % 10 === 0;
  const sponsor = GOURMET_CAT_SPONSORS[(Math.floor(inspectedCount / 10) - 1) % GOURMET_CAT_SPONSORS.length] || GOURMET_CAT_SPONSORS[0];

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

      {/* Dynamic swirling celestial background accents */}
      <div className="absolute -top-32 -right-32 w-80 h-80 bg-amber-400/15 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Harmonious Sponsor Degustation Interstitial (Every 10th inspected painting) */}
      {showSponsorDegustation && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#140b2e] via-[#0d123a] to-[#120826] border-2 border-yellow-400/80 shadow-[0_0_25px_rgba(255,183,3,0.3)] flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in relative backdrop-blur-md">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-yellow-400/60 shadow-md">
              <img src={sponsor.imageUrl} alt={sponsor.brandName} className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-yellow-400 text-slate-950 font-bold text-[10px] uppercase tracking-wider">
                  Дегустация 1/10
                </span>
                <span className="text-xs font-gaudi font-bold text-yellow-200">{sponsor.brandName}</span>
              </div>
              <p className="text-xs text-cyan-200/80 mt-0.5 line-clamp-1 font-medium">
                {sponsor.slogan} — {sponsor.flavor}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {onOpenProModal && (
              <button
                onClick={onOpenProModal}
                className="cyber-btn-gold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5 text-slate-950" />
                <span>Отключить в PRO</span>
              </button>
            )}
            <button
              onClick={() => setIsTastingBannerDismissed(true)}
              className="px-3 py-1.5 rounded-xl bg-[#1d275a] hover:bg-[#253275] text-cyan-200 text-xs font-medium border border-cyan-500/40 transition cursor-pointer"
            >
              Продолжить осмотр
            </button>
          </div>
        </div>
      )}

      {/* Top Hall Navigation & Audio Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-indigo-900/50">
        {/* Exhibition counter & Next/Prev */}
        <div className="flex items-center gap-2">
          {onNavigatePrev && (
            <button
              onClick={onNavigatePrev}
              className="p-2 rounded-xl bg-[#0e143c]/90 hover:bg-[#182161] text-cyan-200 border border-cyan-500/40 transition cursor-pointer shadow-sm"
              title="Предыдущая картина (←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <div className="px-3.5 py-1.5 rounded-xl bg-[#090d28]/90 border border-cyan-500/40 text-xs text-cyan-200 font-cyber shadow-inner">
            Экспонат <span className="text-yellow-400 font-bold text-sm">{artworkIndex + 1}</span> / {totalArtworks}
          </div>

          {onNavigateNext && (
            <button
              onClick={onNavigateNext}
              className="p-2 rounded-xl bg-[#0e143c]/90 hover:bg-[#182161] text-cyan-200 border border-cyan-500/40 transition cursor-pointer shadow-sm"
              title="Следующая картина (→)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Audio Guide & Purr Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              const nextOpen = !isVoiceboxPlayerOpen;
              setIsVoiceboxPlayerOpen(nextOpen);
              if (nextOpen && !isNarrating) {
                const narrationText = `${currentArtwork.title}. Стиль: ${currentArtwork.style}. ${currentArtwork.description}. Особенность мазка: ${currentArtwork.brushstrokeNote}`;
                museumAudio.playNeuralNarration(narrationText, currentArtwork.id);
              }
            }}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
              isNarrating
                ? 'cyber-btn-gold animate-pulse'
                : isVoiceboxPlayerOpen
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/60 shadow-md'
                : 'bg-[#0f1540]/90 hover:bg-[#182161] text-cyan-200 border border-cyan-500/40 shadow-sm'
            }`}
            title="Нейросетевой аудиогид Voicebox Studio HD"
          >
            <Headphones className="w-3.5 h-3.5 text-amber-400" />
            <span>{isNarrating ? 'Гид говорит...' : 'Voicebox Гид'}</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-400/30 text-amber-200 font-mono font-bold">HD</span>
          </button>

          <button
            onClick={handleTogglePurr}
            className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition active:scale-95 cursor-pointer flex items-center gap-1.5 ${
              isPurring
                ? 'cyber-btn-cyan'
                : 'bg-[#0f1540]/90 hover:bg-[#182161] text-cyan-200 border border-cyan-500/40 shadow-sm'
            }`}
            title="Мурчание музейного кота (Web Audio акустика)"
          >
            {isPurring ? <Volume2 className="w-3.5 h-3.5 animate-bounce text-slate-950" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{isPurring ? 'Кот мурчит' : 'Вкл. мурчание'}</span>
          </button>

          {onOpenFramingModal && (
            <button
              onClick={() => onOpenFramingModal(artwork)}
              className="cyber-btn-gold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Примерить картину в багет на стену музея"
            >
              <Maximize2 className="w-3.5 h-3.5 text-slate-950" />
              <span>В зал & раму</span>
            </button>
          )}

          {onOpenPostcard && (
            <button
              onClick={() => onOpenPostcard(artwork)}
              className="cyber-btn-magenta px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Создать винтажную открытку из Арля"
            >
              <Mail className="w-3.5 h-3.5 text-white" />
              <span>Открытка</span>
            </button>
          )}

          {onOpenGuestbook && (
            <button
              onClick={() => onOpenGuestbook(artwork)}
              className="px-3.5 py-2 rounded-2xl bg-[#111947]/90 hover:bg-[#192466] text-amber-200 border border-amber-400/50 text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-md"
              title="Книга отзывов и отпечатки лап ценителей"
            >
              <BookOpen className="w-3.5 h-3.5 text-yellow-400" />
              <span>Отзывы 🐾</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
        {/* Left column: Framed Oil Painting Canvas */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative group w-full max-w-xl">
            {/* Elegant Gaudí Trencadís Mosaic Cyber-Frame */}
            <div className="p-3.5 sm:p-5 bg-gradient-to-br from-[#12173f] via-[#1a2157] to-[#090c24] rounded-3xl shadow-[0_0_35px_rgba(67,97,238,0.35)] border-2 border-cyan-400/40 relative trencadis-border-accent">
              {/* Inner canvas matte */}
              <div className="bg-[#050718]/95 p-2 sm:p-2.5 rounded-2xl border border-indigo-500/40 relative overflow-hidden">
                <img
                  src={currentArtwork.imageUrl}
                  alt={currentArtwork.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-auto max-h-[500px] object-contain rounded-xl shadow-inner transition-transform duration-500 group-hover:scale-[1.01]"
                />

                {/* Subtle Canvas Texture overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-40"></div>

                {/* Hover overlay quick buttons */}
                <div className="absolute inset-0 bg-[#080b22]/75 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-3 backdrop-blur-sm">
                  <button
                    onClick={() => onOpenZoom(currentArtwork)}
                    className="cyber-btn-cyan px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                  >
                    <ZoomIn className="w-4 h-4 text-slate-950" />
                    {t.zoomBrushstrokes}
                  </button>
                  <button
                    onClick={() => onOpenEditor(currentArtwork)}
                    className="cyber-btn-cobalt px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                  >
                    <Edit3 className="w-4 h-4 text-cyan-200" />
                    {t.remixInStudio}
                  </button>
                  {onOpenFramingModal && (
                    <button
                      onClick={() => onOpenFramingModal(artwork)}
                      className="cyber-btn-gold px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xl transform translate-y-2 group-hover:translate-y-0 transition-all duration-300"
                    >
                      <Maximize2 className="w-4 h-4 text-slate-950" />
                      <span>В зал</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Gallery Label Plaque underneath */}
            <div className="mt-3.5 mx-auto w-fit px-5 py-1.5 rounded-full bg-[#0a0f32]/90 border border-amber-400/50 shadow-[0_0_15px_rgba(255,183,3,0.2)] flex items-center gap-2 text-xs text-amber-200">
              <span className="font-gaudi italic font-bold">{currentArtwork.style}</span>
              <span className="text-cyan-400">•</span>
              <span className="text-cyan-200/80 font-cyber">{currentArtwork.year}</span>
            </div>
          </div>
        </div>

        {/* Right column: Art Criticism & Interactive Controls */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center flex-wrap gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span>{t.expoMuseumTitle}</span>
              {currentArtwork.authorName && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 text-[10px] border border-emerald-500/40">
                  {t.complaintAuthor} {currentArtwork.authorName}
                </span>
              )}
              {currentArtwork.source === 'p2p-friend' && (
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 text-[10px] border border-indigo-500/40">
                  {t.peerBackupBadge}
                </span>
              )}
              {currentArtwork.isUserCreated && !currentArtwork.authorName && (
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/80 text-cyan-300 text-[10px] border border-cyan-500/40">
                  {t.authorLocalBadge}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#121946] text-cyan-300 text-[10px] border border-cyan-400/50 font-mono shadow-sm" title="Холст подписан криптографическим хешем Merkle Root">
                <CheckCircle2 className="w-3 h-3 text-cyan-400" />
                <span>P2P Merkle-Verified</span>
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-gaudi font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-200 to-cyan-300 tracking-tight leading-snug">
              {currentArtwork.title}
            </h2>

            <p className="mt-4 text-sm sm:text-base text-slate-200 leading-relaxed font-sans font-normal">
              {currentArtwork.description}
            </p>

            {/* Brushstroke note */}
            <div className="mt-4 p-3.5 rounded-2xl bg-[#090d29]/80 border border-cyan-500/30 flex items-start gap-2.5 shadow-inner">
              <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-cyber font-bold text-cyan-300">{t.impastoNoteTitle}:</p>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{currentArtwork.brushstrokeNote}</p>
              </div>
            </div>

            {/* Voicebox Studio HD Audio Guide Player */}
            {isVoiceboxPlayerOpen && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <VoiceboxAudioGuidePlayer
                  artwork={currentArtwork}
                  onClose={() => setIsVoiceboxPlayerOpen(false)}
                />
              </div>
            )}

            {/* Palette Swatches */}
            <div className="mt-5">
              <div className="flex items-center justify-between text-xs font-cyber font-bold text-cyan-300 mb-2">
                <span className="flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-yellow-400" />
                  {t.paletteColorsTitle}
                </span>
                {copiedHex && (
                  <span className="text-emerald-400 text-xs animate-fade-in font-mono">
                    {t.copied} {copiedHex}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {currentArtwork.palette.map((swatch, index) => (
                  <button
                    key={index}
                    onClick={() => handleCopyColor(swatch.hex)}
                    className="group flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-700/60 bg-[#0a0f30]/90 hover:bg-[#121a52] hover:border-cyan-400 transition-all duration-200 shadow-sm hover:scale-105 cursor-pointer"
                    title={`${t.copyColorHex}: ${swatch.name} (${swatch.hex})`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-white/40 shadow-inner flex-shrink-0"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="text-xs font-mono text-cyan-200">{swatch.hex}</span>
                    <span className="text-[11px] text-cyan-300/70 hidden sm:inline">{swatch.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons bar matching active theme palette */}
          <div className="pt-4 border-t border-indigo-900/50 flex flex-wrap gap-2.5">
            <button
              onClick={() => onOpenZoom(currentArtwork)}
              style={{
                background: activeTheme.buttonSecondaryBg,
                borderColor: activeTheme.buttonSecondaryBorder,
                color: activeTheme.buttonSecondaryText
              }}
              className="flex-1 min-w-[120px] group flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap border transition-all hover:scale-[1.02] shadow-sm"
            >
              <ButtonOrnamentFlourish side="left" />
              <ZoomIn className="w-4 h-4 shrink-0" />
              <span>{t.zoomBrushstrokes}</span>
              <ButtonOrnamentFlourish side="right" />
            </button>

            <button
              onClick={() => onOpenEditor(currentArtwork)}
              style={{
                background: activeTheme.buttonSecondaryBg,
                borderColor: activeTheme.buttonSecondaryBorder,
                color: activeTheme.buttonSecondaryText
              }}
              className="flex-1 min-w-[120px] group flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap border transition-all hover:scale-[1.02] shadow-sm"
            >
              <ButtonOrnamentFlourish side="left" />
              <Edit3 className="w-4 h-4 shrink-0" />
              <span>{t.remixInStudio}</span>
              <ButtonOrnamentFlourish side="right" />
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              style={{
                background: isDownloading ? 'rgba(50,50,70,0.5)' : activeTheme.buttonPrimaryBg,
                borderColor: isDownloading ? 'rgba(70,70,90,0.4)' : activeTheme.buttonPrimaryBorder,
                color: isDownloading ? '#888899' : activeTheme.buttonPrimaryText,
                boxShadow: isDownloading ? 'none' : activeTheme.buttonPrimaryGlow
              }}
              className="flex-1 min-w-[120px] group flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap border transition-all hover:scale-[1.02]"
            >
              <ButtonOrnamentFlourish side="left" />
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              ) : (
                <Download className="w-4 h-4 shrink-0" />
              )}
              <span>{isDownloading ? t.downloading : t.downloadPainting}</span>
              <ButtonOrnamentFlourish side="right" />
            </button>

            {onReportDispute && (
              <button
                onClick={() => onReportDispute(currentArtwork)}
                className="cyber-btn-magenta flex-1 min-w-[120px] group flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap"
                title={t.disputeReportBtnTitle}
              >
                <ButtonOrnamentFlourish side="left" />
                <ShieldAlert className="w-4 h-4 text-white shrink-0" />
                <span>{t.disputeReportBtn}</span>
                <ButtonOrnamentFlourish side="right" />
              </button>
            )}

            {canDelete && onDeletePublication && (
              <button
                onClick={() => onDeletePublication(currentArtwork)}
                className="flex-1 min-w-[120px] group flex items-center justify-center gap-1.5 px-3 py-3 rounded-2xl bg-rose-950/70 hover:bg-rose-900/90 text-rose-200 border border-rose-500/50 hover:border-rose-400 font-bold text-xs sm:text-sm cursor-pointer whitespace-nowrap transition-all shadow-md shadow-rose-950/40 hover:scale-[1.02] active:scale-[0.98]"
                title="Удалить публикацию автора (с двойным подтверждением намерения)"
              >
                <ButtonOrnamentFlourish side="left" />
                <Trash2 className="w-4 h-4 text-rose-400 shrink-0 group-hover:animate-bounce" />
                <span>Удалить</span>
                <ButtonOrnamentFlourish side="right" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

