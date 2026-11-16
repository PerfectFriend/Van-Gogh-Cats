import React, { useEffect } from 'react';
import { X } from 'lucide-react';

export interface ActionMenuItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  highlight?: boolean;
  badgeText?: string;
}

interface ActionMenuSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  previewImageUrl?: string;
  items: ActionMenuItem[];
  footerContent?: React.ReactNode;
}

export const ActionMenuSheet: React.FC<ActionMenuSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  previewImageUrl,
  items,
  footerContent,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-[#121629] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden text-slate-100 max-h-[85vh] flex flex-col"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>

        {/* Header */}
        {(title || previewImageUrl) && (
          <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {previewImageUrl && (
                <img
                  src={previewImageUrl}
                  alt={title || ''}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-xl object-cover border border-white/15 shrink-0"
                />
              )}
              <div className="min-w-0">
                {title && (
                  <h3 className="text-sm font-semibold text-white truncate">{title}</h3>
                )}
                {subtitle && (
                  <p className="text-xs text-slate-400 truncate mt-0.5">{subtitle}</p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              aria-label="Закрыть меню"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Menu List */}
        <div className="overflow-y-auto divide-y divide-white/5 px-2 py-1.5">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onClose();
                item.onClick();
              }}
              className={`w-full min-h-[48px] px-3.5 py-2.5 rounded-2xl flex items-center justify-between gap-3 text-left transition-colors cursor-pointer ${
                item.danger
                  ? 'text-rose-400 hover:bg-rose-500/10'
                  : item.highlight
                  ? 'text-amber-300 hover:bg-amber-500/10'
                  : 'text-slate-100 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <span className="shrink-0 opacity-90">{item.icon}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{item.label}</div>
                  {item.sublabel && (
                    <div className="text-xs text-slate-400 truncate mt-0.5">{item.sublabel}</div>
                  )}
                </div>
              </div>
              {item.badgeText && (
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {item.badgeText}
                </span>
              )}
            </button>
          ))}
        </div>

        {footerContent && (
          <div className="px-4 py-3 border-t border-white/10 bg-black/25">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
};
