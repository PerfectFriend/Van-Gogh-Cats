import React, { createContext, useContext, useState, useEffect } from 'react';
import { StyleThemeVisuals } from '../types';
import { STYLE_THEMES, getStyleTheme } from '../data/styleThemes';

interface ThemeStyleContextType {
  activeStyleId: string;
  activeTheme: StyleThemeVisuals;
  setActiveStyleId: (id: string) => void;
  allThemes: StyleThemeVisuals[];
}

const ThemeStyleContext = createContext<ThemeStyleContextType | undefined>(undefined);

export const ThemeStyleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeStyleId, setActiveStyleIdState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('vangogh_active_style_theme');
      if (saved && STYLE_THEMES[saved]) return saved;
    } catch {
      // ignore
    }
    return 'starry_night';
  });

  const setActiveStyleId = (id: string) => {
    if (STYLE_THEMES[id]) {
      setActiveStyleIdState(id);
      try {
        localStorage.setItem('vangogh_active_style_theme', id);
      } catch {
        // ignore
      }
    }
  };

  const activeTheme = getStyleTheme(activeStyleId);
  const allThemes = Object.values(STYLE_THEMES);

  // Apply CSS custom properties to root for deep CSS integration
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--active-theme-border', activeTheme.plateBorder);
    root.style.setProperty('--active-theme-glow', activeTheme.plateGlow);
    root.style.setProperty('--active-theme-btn-bg', activeTheme.buttonPrimaryBg);
    root.style.setProperty('--active-theme-btn-text', activeTheme.buttonPrimaryText);
  }, [activeTheme]);

  return (
    <ThemeStyleContext.Provider
      value={{
        activeStyleId,
        activeTheme,
        setActiveStyleId,
        allThemes
      }}
    >
      {children}
    </ThemeStyleContext.Provider>
  );
};

export const useThemeStyle = (): ThemeStyleContextType => {
  const context = useContext(ThemeStyleContext);
  if (!context) {
    throw new Error('useThemeStyle must be used within a ThemeStyleProvider');
  }
  return context;
};
