import React, { useEffect } from 'react';
import { X, Check, Globe } from 'lucide-react';
import { useThemeStyle } from '../../context/ThemeStyleContext';
import { useTranslation } from '../../context/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../../utils/i18n';

interface ThemeDrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeDrawerModal: React.FC<ThemeDrawerModalProps> = ({ isOpen, onClose }) => {
  const { allThemes, activeStyleId, setActiveStyleId } = useThemeStyle();
  const { language, setLanguage } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-[#101426] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl text-slate-100 max-h-[85vh] flex flex-col overflow-hidden"
      >
        <div className="sm:hidden pt-3 pb-1 flex justify-center">
          <div className="w-10 h-1 rounded-full bg-white/25" />
        </div>

        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Оформление и язык</h3>
            <p className="text-xs text-slate-400">11 художественных стилей и 10 языков</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-6">
          {/* Themes Grid */}
          <div className="space-y-2.5">
            <p className="text-xs font-medium text-slate-400">Художественная тема интерфейса</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {allThemes.map((theme) => {
                const isActive = theme.id === activeStyleId;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setActiveStyleId(theme.id)}
                    className={`relative p-2 rounded-2xl border text-left transition-all cursor-pointer overflow-hidden ${
                      isActive
                        ? 'border-amber-400 bg-white/10 ring-1 ring-amber-400/50'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="relative h-16 rounded-xl overflow-hidden mb-2">
                      <img
                        src={theme.bgImageUrl}
                        alt={theme.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {isActive && (
                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                          <Check className="w-5 h-5 text-amber-300" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-medium text-white truncate">
                      {theme.themeSymbol} {theme.name.split(' (')[0]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language Selector */}
          <div className="space-y-2.5 pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <Globe className="w-3.5 h-3.5" />
              <span>Язык интерфейса</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isCurrent = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => setLanguage(lang.code as SupportedLanguage)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-white text-slate-950'
                        : 'bg-white/10 text-slate-300 hover:bg-white/15'
                    }`}
                  >
                    {lang.flag} {lang.nativeName}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
