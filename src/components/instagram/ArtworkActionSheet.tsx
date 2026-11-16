import React, { useState, useEffect } from 'react';
import {
  ZoomIn,
  Edit3,
  Maximize2,
  Mail,
  BookOpen,
  Headphones,
  Volume2,
  VolumeX,
  Download,
  Palette,
  ShieldAlert,
  Trash2,
  Check,
  ShieldCheck,
  Copy,
} from 'lucide-react';
import { Artwork } from '../../types';
import { ActionMenuSheet, ActionMenuItem } from './ActionMenuSheet';
import { downloadArtworkImage } from '../../utils/downloadHelper';
import { museumAudio } from '../../utils/museumAudio';
import { useTranslation } from '../../context/LanguageContext';
import { getLocalizedArtwork } from '../../utils/i18n';

interface ArtworkActionSheetProps {
  artwork: Artwork | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenZoom: (artwork: Artwork) => void;
  onOpenEditor: (artwork: Artwork) => void;
  onOpenFramingModal: (artwork: Artwork) => void;
  onOpenPostcard: (artwork: Artwork) => void;
  onOpenGuestbook: (artwork: Artwork) => void;
  onOpenAudioGuide: (artwork: Artwork) => void;
  onReportDispute?: (artwork: Artwork) => void;
  onDeletePublication?: (artwork: Artwork) => void;
  canDelete?: boolean;
}

export const ArtworkActionSheet: React.FC<ArtworkActionSheetProps> = ({
  artwork,
  isOpen,
  onClose,
  onOpenZoom,
  onOpenEditor,
  onOpenFramingModal,
  onOpenPostcard,
  onOpenGuestbook,
  onOpenAudioGuide,
  onReportDispute,
  onDeletePublication,
  canDelete = false,
}) => {
  const { t } = useTranslation();
  const [showPalette, setShowPalette] = useState(false);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [isPurring, setIsPurring] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setShowPalette(false);
    }
  }, [isOpen]);

  if (!artwork) return null;

  const localized = getLocalizedArtwork(artwork, t);

  const handleDownload = async () => {
    const filename = `${localized.id}_vangogh_${localized.title.replace(/\s+/g, '_')}`;
    await downloadArtworkImage(localized.imageUrl, filename);
  };

  const handleTogglePurr = () => {
    const active = museumAudio.togglePurr(0.18);
    setIsPurring(active);
  };

  const handleCopyPrompt = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(localized.prompt);
    }
  };

  const items: ActionMenuItem[] = [
    {
      id: 'zoom',
      label: t.zoomBrushstrokes || 'Изучить мазки кисти (Zoom)',
      sublabel: 'Детальный осмотр фактуры масла и холста',
      icon: <ZoomIn className="w-5 h-5 text-cyan-400" />,
      onClick: () => onOpenZoom(localized),
    },
    {
      id: 'audio-guide',
      label: 'Аудиогид Voicebox Studio HD',
      sublabel: 'Озвученная история полотна и мазка',
      icon: <Headphones className="w-5 h-5 text-amber-400" />,
      onClick: () => onOpenAudioGuide(localized),
      highlight: true,
    },
    {
      id: 'purr',
      label: isPurring ? 'Выключить мурчание кота' : 'Включить мурчание кота',
      sublabel: 'Акустический фон музейного кота',
      icon: isPurring ? <Volume2 className="w-5 h-5 text-emerald-400" /> : <VolumeX className="w-5 h-5 text-slate-300" />,
      onClick: handleTogglePurr,
      badgeText: isPurring ? 'Вкл' : 'Выкл',
    },
    {
      id: 'frame',
      label: 'Примерить в зал и раму',
      sublabel: 'Визуализация картины в багете на стене музея',
      icon: <Maximize2 className="w-5 h-5 text-amber-300" />,
      onClick: () => onOpenFramingModal(artwork),
    },
    {
      id: 'remix',
      label: t.remixInStudio || 'Ремикс в AI-Студии',
      sublabel: 'Изменить стиль, освещение или композицию',
      icon: <Edit3 className="w-5 h-5 text-indigo-400" />,
      onClick: () => onOpenEditor(localized),
    },
    {
      id: 'postcard',
      label: 'Винтажная открытка из Арля',
      sublabel: 'Оформить почтовую открытку для отправки другу',
      icon: <Mail className="w-5 h-5 text-pink-400" />,
      onClick: () => onOpenPostcard(artwork),
    },
    {
      id: 'guestbook',
      label: 'Книга отзывов и лапки 🐾',
      sublabel: 'Оставить отзыв и отпечаток кошачьей лапы',
      icon: <BookOpen className="w-5 h-5 text-yellow-300" />,
      onClick: () => onOpenGuestbook(artwork),
    },
    {
      id: 'download',
      label: t.downloadPainting || 'Скачать оригинал',
      sublabel: 'Сохранить картину на устройство',
      icon: <Download className="w-5 h-5 text-emerald-400" />,
      onClick: handleDownload,
    },
    {
      id: 'copy-prompt',
      label: 'Скопировать промпт полотна',
      sublabel: 'Для повторного использования в Студии',
      icon: <Copy className="w-5 h-5 text-slate-300" />,
      onClick: handleCopyPrompt,
    },
  ];

  if (onReportDispute) {
    items.push({
      id: 'dispute',
      label: t.disputeReportBtn || 'Пожаловаться (трибунал P2P)',
      sublabel: 'Проверка правила «Только коты» кворумом 2:1',
      icon: <ShieldAlert className="w-5 h-5 text-orange-400" />,
      onClick: () => onReportDispute(localized),
    });
  }

  if (canDelete && onDeletePublication) {
    items.push({
      id: 'delete',
      label: 'Удалить публикацию',
      sublabel: 'Удалить авторскую работу с устройства',
      icon: <Trash2 className="w-5 h-5 text-rose-400" />,
      onClick: () => onDeletePublication(localized),
      danger: true,
    });
  }

  return (
    <ActionMenuSheet
      isOpen={isOpen}
      onClose={onClose}
      title={localized.title}
      subtitle={`${localized.style} · ${localized.year}`}
      previewImageUrl={localized.imageUrl}
      items={items}
      footerContent={
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowPalette((v) => !v)}
              className="flex items-center gap-2 text-xs font-medium text-cyan-300 hover:text-cyan-200 cursor-pointer"
            >
              <Palette className="w-4 h-4" />
              <span>{showPalette ? 'Скрыть палитру пигментов' : 'Палитра пигментов и P2P подпись'}</span>
            </button>
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              Merkle OK
            </span>
          </div>

          {showPalette && (
            <div className="pt-1 space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {localized.palette.map((swatch, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(swatch.hex);
                      setCopiedHex(swatch.hex);
                      setTimeout(() => setCopiedHex(null), 1500);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-200 cursor-pointer"
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-white/30"
                      style={{ backgroundColor: swatch.hex }}
                    />
                    <span className="font-mono text-[11px]">{swatch.hex}</span>
                    {copiedHex === swatch.hex && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {localized.brushstrokeNote}
              </p>
            </div>
          )}
        </div>
      }
    />
  );
};
