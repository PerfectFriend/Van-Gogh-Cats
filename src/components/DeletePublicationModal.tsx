import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, ShieldAlert, CheckCircle2, X, AlertOctagon } from 'lucide-react';
import { Artwork } from '../types';
import { useTranslation } from '../context/LanguageContext';
import { getLocalizedArtwork } from '../utils/i18n';
import { GaudiCornerOrnament, ButtonOrnamentFlourish } from './GaudiOrnaments';

interface DeletePublicationModalProps {
  artwork: Artwork | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (artworkId: string) => void;
}

export const DeletePublicationModal: React.FC<DeletePublicationModalProps> = ({
  artwork,
  isOpen,
  onClose,
  onConfirmDelete
}) => {
  const { t } = useTranslation();
  const [confirmWord, setConfirmWord] = useState('');
  const [isAwareChecked, setIsAwareChecked] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setConfirmWord('');
      setIsAwareChecked(false);
      setIsDeleting(false);
    }
  }, [isOpen, artwork?.id]);

  if (!isOpen || !artwork) return null;

  const currentArtwork = getLocalizedArtwork(artwork, t);
  const targetWord = 'УДАЛИТЬ';
  const isWordValid = confirmWord.trim().toUpperCase() === targetWord || confirmWord.trim().toUpperCase() === 'DELETE';
  const canSubmit = isAwareChecked && isWordValid && !isDeleting;

  const handleDelete = () => {
    if (!canSubmit) return;
    setIsDeleting(true);
    onConfirmDelete(artwork.id);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isDeleting) onClose();
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl cyber-gaudi-card p-6 sm:p-7 shadow-2xl border-2 border-rose-500/50 bg-slate-950/95 text-slate-100 overflow-hidden">
        {/* Authentic Gaudi Corner Ornaments */}
        <GaudiCornerOrnament position="top-left" color="#f43f5e" />
        <GaudiCornerOrnament position="top-right" color="#f43f5e" />
        <GaudiCornerOrnament position="bottom-left" color="#f43f5e" />
        <GaudiCornerOrnament position="bottom-right" color="#f43f5e" />

        {/* Ambient warning background glow */}
        <div className="absolute top-0 right-1/4 w-72 h-72 bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-900/40 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-950/80 border border-rose-500/40 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <Trash2 className="w-6 h-6 animate-pulse text-rose-400" />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-rose-300">
                Удаление публикации автора
              </h3>
              <p className="text-xs text-rose-300/70">
                Защита от случайного удаления полотна
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="p-2 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition cursor-pointer disabled:opacity-50"
            title={t.close || 'Закрыть'}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Artwork Card Info */}
        <div className="mt-5 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 flex items-center gap-4">
          <img
            src={currentArtwork.imageUrl}
            alt={currentArtwork.title}
            className="w-20 h-20 rounded-xl object-cover shrink-0 border border-rose-500/30 shadow-md"
          />
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm text-slate-100 truncate">
              {currentArtwork.title}
            </h4>
            <p className="text-xs text-amber-400/90 mt-0.5 truncate">
              {currentArtwork.style}
            </p>
            <p className="text-xs text-slate-400 mt-1 truncate">
              {currentArtwork.authorName ? `Автор: ${currentArtwork.authorName}` : currentArtwork.year}
            </p>
          </div>
        </div>

        {/* Accidental Deletion Protection Mechanism */}
        <div className="mt-5 space-y-4">
          {/* Warning box */}
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-200/90 leading-relaxed">
              <span className="font-semibold text-rose-300">Внимание: </span>
              Это действие необратимо. Полотно будет окончательно удалено из вашей экспозиции, локальной базы данных и синхронизированных P2P-узлов.
            </div>
          </div>

          {/* Double Verification Step 1: Checkbox */}
          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 cursor-pointer hover:border-slate-700 transition">
            <input
              type="checkbox"
              checked={isAwareChecked}
              onChange={(e) => setIsAwareChecked(e.target.checked)}
              className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-rose-600 focus:ring-rose-500 focus:ring-offset-0 cursor-pointer"
            />
            <span className="text-xs text-slate-300 select-none leading-normal">
              Я подтверждаю своё намерение удалить публикацию безвозвратно и понимаю, что восстановить её будет невозможно.
            </span>
          </label>

          {/* Double Verification Step 2: Confirmation Word Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-300">
              Для подтверждения введите слово{' '}
              <span className="font-mono font-bold text-rose-400 tracking-wider bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-800/40">
                УДАЛИТЬ
              </span>
              :
            </label>
            <div className="relative">
              <input
                type="text"
                value={confirmWord}
                onChange={(e) => setConfirmWord(e.target.value)}
                placeholder="Введите УДАЛИТЬ"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-sm font-mono tracking-wide text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
              />
              {isWordValid && (
                <CheckCircle2 className="w-5 h-5 text-emerald-400 absolute right-3 top-2.5 pointer-events-none" />
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition cursor-pointer disabled:opacity-50"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!canSubmit}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition shadow-lg ${
              canSubmit
                ? 'bg-rose-600 hover:bg-rose-500 text-white cursor-pointer shadow-rose-900/40 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-slate-800/80 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            {canSubmit && <ButtonOrnamentFlourish />}
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Удаление...' : 'Удалить публикацию навсегда'}</span>
            {canSubmit && <ButtonOrnamentFlourish />}
          </button>
        </div>
      </div>
    </div>
  );
};
