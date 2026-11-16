import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  SupportedLanguage, 
  SUPPORTED_LANGUAGES, 
  TRANSLATIONS, 
  TranslationDict, 
  getInitialLanguage, 
  saveUserLanguage, 
  detectSystemLanguage 
} from '../utils/i18n';

interface LanguageContextType {
  language: SupportedLanguage;
  t: TranslationDict;
  isAuto: boolean;
  setLanguage: (lang: SupportedLanguage | 'auto') => void;
  systemLang: SupportedLanguage;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [langState, setLangState] = useState<{ language: SupportedLanguage; isAuto: boolean }>(() => {
    return getInitialLanguage();
  });

  const [systemLang, setSystemLang] = useState<SupportedLanguage>('en');

  useEffect(() => {
    const detected = detectSystemLanguage();
    setSystemLang(detected);

    const handleLanguageChange = () => {
      const newSys = detectSystemLanguage();
      setSystemLang(newSys);
      if (langState.isAuto) {
        setLangState({ language: newSys, isAuto: true });
      }
    };

    window.addEventListener('languagechange', handleLanguageChange);
    return () => window.removeEventListener('languagechange', handleLanguageChange);
  }, [langState.isAuto]);

  // Update HTML document lang, title and RTL direction
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const activeMeta = SUPPORTED_LANGUAGES.find(l => l.code === langState.language);
      document.documentElement.lang = langState.language;
      document.documentElement.dir = activeMeta?.dir || 'ltr';

      const currentT = TRANSLATIONS[langState.language] || TRANSLATIONS.ru;
      document.title = currentT.appTitle;

      // Update meta tags dynamically
      const ogTitleMeta = document.querySelector('meta[property="og:title"]');
      if (ogTitleMeta) {
        ogTitleMeta.setAttribute('content', currentT.appTitle);
      }
      const descMeta = document.querySelector('meta[name="description"]');
      if (descMeta) {
        descMeta.setAttribute('content', currentT.appSubtitle);
      }
      const ogDescMeta = document.querySelector('meta[property="og:description"]');
      if (ogDescMeta) {
        ogDescMeta.setAttribute('content', currentT.appSubtitle);
      }
    }
  }, [langState.language]);

  const handleSetLanguage = (choice: SupportedLanguage | 'auto') => {
    if (choice === 'auto') {
      const sys = detectSystemLanguage();
      saveUserLanguage('auto');
      setLangState({ language: sys, isAuto: true });
    } else {
      saveUserLanguage(choice);
      setLangState({ language: choice, isAuto: false });
    }
  };

  const t = TRANSLATIONS[langState.language] || TRANSLATIONS.ru;

  return (
    <LanguageContext.Provider value={{
      language: langState.language,
      t,
      isAuto: langState.isAuto,
      setLanguage: handleSetLanguage,
      systemLang
    }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
