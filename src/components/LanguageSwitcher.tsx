import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, Sparkles, ChevronDown } from 'lucide-react';
import { useTranslation } from '../context/LanguageContext';
import { SUPPORTED_LANGUAGES, SupportedLanguage } from '../utils/i18n';

export const LanguageSwitcher: React.FC = () => {
  const { language, isAuto, setLanguage, systemLang } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMeta = SUPPORTED_LANGUAGES.find(l => l.code === language) || SUPPORTED_LANGUAGES[0];

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="language-switcher-button"
        onClick={() => setIsOpen(prev => !prev)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-900/60 hover:bg-amber-800/80 text-amber-100 text-xs font-medium border border-amber-600/40 shadow-sm transition active:scale-95 cursor-pointer"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Сменить язык / Switch Language"
      >
        <span className="text-base leading-none">{currentMeta.flag}</span>
        <span className="font-semibold">{currentMeta.nativeName}</span>
        {isAuto && (
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-yellow-300 font-sans border border-yellow-500/30">
            Auto
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-amber-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/98 backdrop-blur-xl border border-amber-500/40 shadow-2xl p-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
          role="menu"
        >
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-200">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Язык / Language</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Top 10</span>
          </div>

          {/* Option: Auto System Detection */}
          <button
            onClick={() => {
              setLanguage('auto');
              setIsOpen(false);
            }}
            className={`w-full mt-1.5 px-3 py-2 rounded-xl text-left text-xs font-medium flex items-center justify-between transition cursor-pointer ${
              isAuto
                ? 'bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 font-bold shadow-md'
                : 'text-amber-100 hover:bg-slate-800'
            }`}
            role="menuitem"
          >
            <div className="flex items-center gap-2">
              <Sparkles className={`w-3.5 h-3.5 ${isAuto ? 'text-slate-950' : 'text-amber-400'}`} />
              <div>
                <p>Автоматически (Системный)</p>
                <p className={`text-[10px] ${isAuto ? 'text-slate-900' : 'text-slate-400'}`}>
                  Определён: {SUPPORTED_LANGUAGES.find(l => l.code === systemLang)?.nativeName || systemLang}
                </p>
              </div>
            </div>
            {isAuto && <Check className="w-4 h-4 text-slate-950" />}
          </button>

          <div className="my-1 border-t border-slate-800" />

          {/* 10 Top World Languages List */}
          <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = !isAuto && language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs flex items-center justify-between transition cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-200 font-bold border border-amber-500/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  role="menuitem"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base leading-none">{lang.flag}</span>
                    <div>
                      <span className="font-medium text-amber-100">{lang.nativeName}</span>
                      <span className="text-[11px] text-slate-400 ml-1.5 font-sans">({lang.name})</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-yellow-400" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
