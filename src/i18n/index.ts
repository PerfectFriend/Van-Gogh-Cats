import { LanguageMeta, SupportedLanguage, TranslationDict } from './types';
import { ru } from './locales/ru';
import { en } from './locales/en';
import { es } from './locales/es';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { zh } from './locales/zh';
import { ja } from './locales/ja';
import { pt } from './locales/pt';
import { ar } from './locales/ar';
import { hi } from './locales/hi';
import { Artwork, StylePreset } from '../types';

export * from './types';

export const SUPPORTED_LANGUAGES: LanguageMeta[] = [
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳' }
];

export const TRANSLATIONS: Record<SupportedLanguage, TranslationDict> = {
  ru,
  en,
  es,
  fr,
  de,
  zh,
  ja,
  pt,
  ar,
  hi
};

const STORAGE_KEY = 'crypto_cats_language_v1';

export function detectSystemLanguage(): SupportedLanguage {
  if (typeof window === 'undefined' || !window.navigator) {
    return 'ru';
  }

  const browserLangs = window.navigator.languages || [window.navigator.language || ''];
  for (const rawLang of browserLangs) {
    if (!rawLang || typeof rawLang !== 'string') continue;
    const code = rawLang.toLowerCase().split('-')[0];
    if (code === 'ru') return 'ru';
    if (code === 'en') return 'en';
    if (code === 'es') return 'es';
    if (code === 'fr') return 'fr';
    if (code === 'de') return 'de';
    if (code === 'zh') return 'zh';
    if (code === 'ja') return 'ja';
    if (code === 'pt') return 'pt';
    if (code === 'ar') return 'ar';
    if (code === 'hi') return 'hi';
  }

  return 'en';
}

export function getInitialLanguage(): { language: SupportedLanguage; isAuto: boolean } {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      if (saved === 'auto') {
        return { language: detectSystemLanguage(), isAuto: true };
      }
      const match = SUPPORTED_LANGUAGES.find(l => l.code === saved);
      if (match) {
        return { language: match.code, isAuto: false };
      }
    }
  }
  return { language: detectSystemLanguage(), isAuto: true };
}

export function saveUserLanguage(lang: SupportedLanguage | 'auto'): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
  }
}

/**
 * Returns an Artwork with localized title, description, brushstrokeNote, style, year, and palette
 * if it corresponds to one of the initial masterpieces.
 */
export function getLocalizedArtwork(artwork: Artwork, t: TranslationDict): Artwork {
  if (!artwork || !artwork.id) return artwork;
  const loc = t.masterpieces[artwork.id];
  if (!loc) return artwork;

  const localizedPalette = artwork.palette.map((color, index) => {
    const locColorName = loc.paletteColors && loc.paletteColors[index];
    return {
      ...color,
      name: locColorName || color.name
    };
  });

  return {
    ...artwork,
    title: loc.title || artwork.title,
    style: loc.style || artwork.style,
    year: loc.year || artwork.year,
    description: loc.description || artwork.description,
    brushstrokeNote: loc.brushstrokeNote || artwork.brushstrokeNote,
    palette: localizedPalette
  };
}

/**
 * Returns style presets localized for the current language.
 */
export function getLocalizedPresets(presets: StylePreset[], t: TranslationDict): StylePreset[] {
  return presets.map(preset => {
    const loc = t.presets[preset.id];
    if (!loc) return preset;
    return {
      ...preset,
      name: loc.name || preset.name,
      description: loc.description || preset.description,
      samplePrompt: loc.samplePrompt || preset.samplePrompt
    };
  });
}
