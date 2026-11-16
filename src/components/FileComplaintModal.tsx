import React, { useState } from 'react';
import { X, ShieldAlert, Gavel, AlertTriangle } from 'lucide-react';
import { Artwork, ArtistProfile } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedArtwork } from '../utils/i18n';

interface FileComplaintModalProps {
  artwork: Artwork | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (artwork: Artwork, reason: string) => void;
}

export const FileComplaintModal: React.FC<FileComplaintModalProps> = ({
  artwork,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const reasonsList = t.complaintCommonReasons || [
    'На картине не кот',
    'Спам или нерелевантный контент',
    'Подозрение на вредоносный код'
  ];
  const [reason, setReason] = useState(reasonsList[0] || '');
  const [customReason, setCustomReason] = useState('');

  if (!isOpen || !artwork) return null;

  const currentArtwork = getLocalizedArtwork(artwork, t);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalReason = customReason.trim() ? customReason.trim() : (reason || reasonsList[0]);
    onSubmit(currentArtwork, finalReason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-950 border-2 border-rose-500/40 p-6 shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 text-rose-400 font-serif font-bold text-lg border-b border-slate-800 pb-3">
          <ShieldAlert className="w-6 h-6 text-rose-500" />
          <span>{t.complaintModalTitle}</span>
        </div>

        <div className="mt-4 p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
          <img
            src={currentArtwork.imageUrl}
            alt={currentArtwork.title}
            className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-700"
          />
          <div className="overflow-hidden">
            <h4 className="font-bold text-sm text-amber-100 truncate">{currentArtwork.title}</h4>
            <p className="text-xs text-slate-400 truncate">{t.complaintAuthor || 'Автор:'} {currentArtwork.authorName || t.complaintUnknownAuthor || 'Неизвестный пир'}</p>
            <p className="text-[11px] text-slate-500 font-mono truncate">{currentArtwork.prompt}</p>
          </div>
        </div>

        <div className="mt-3 p-3 rounded-xl bg-rose-950/30 border border-rose-900/50 text-xs text-rose-200/90 leading-relaxed flex items-start gap-2.5">
          <Gavel className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            {t.complaintProtectionDesc}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-300 mb-2">
              {t.complaintReasonLabel}
            </label>
            <div className="space-y-1.5">
              {reasonsList.map((r, i) => (
                <label
                  key={i}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                    reason === r && !customReason.trim()
                      ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="disputeReason"
                    checked={reason === r && !customReason.trim()}
                    onChange={() => {
                      setReason(r);
                      setCustomReason('');
                    }}
                    className="accent-rose-500"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              {t.complaintCustomReasonLabel}
            </label>
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder={t.complaintCustomReasonPlaceholder}
              rows={2}
              className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900 cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-900/30 transition cursor-pointer flex items-center gap-1.5"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{t.complaintSubmitBtn}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
