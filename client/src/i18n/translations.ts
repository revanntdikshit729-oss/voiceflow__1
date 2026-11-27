import { AppLanguage, SupportedLocale, TranslationDictionary } from './types';
import { en } from './locales/en';
import { hi } from './locales/hi';
import { hinglish } from './locales/hinglish';
import { bn } from './locales/bn';
import { ta } from './locales/ta';
import { te } from './locales/te';
import { mr } from './locales/mr';
import { gu } from './locales/gu';
import { kn } from './locales/kn';
import { ml } from './locales/ml';
import { pa } from './locales/pa';
import { or } from './locales/or';
import { as } from './locales/as';

export type { AppLanguage, SupportedLocale, TranslationDictionary };

export const languageCodeToAppLanguage = (code?: string): AppLanguage => {
  if (!code) return 'en';
  if (code === 'hi-IN' || code === 'hi') return 'hi';
  if (code === 'hinglish') return 'hinglish';
  if (code === 'bn-IN' || code === 'bn') return 'bn';
  if (code === 'ta-IN' || code === 'ta') return 'ta';
  if (code === 'te-IN' || code === 'te') return 'te';
  if (code === 'mr-IN' || code === 'mr') return 'mr';
  if (code === 'gu-IN' || code === 'gu') return 'gu';
  if (code === 'kn-IN' || code === 'kn') return 'kn';
  if (code === 'ml-IN' || code === 'ml') return 'ml';
  if (code === 'pa-IN' || code === 'pa') return 'pa';
  if (code === 'or-IN' || code === 'or') return 'or';
  if (code === 'as-IN' || code === 'as') return 'as';
  return 'en';
};

export const appLanguageToLocale = (lang: AppLanguage): SupportedLocale => {
  switch (lang) {
    case 'hi': return 'hi-IN';
    case 'hinglish': return 'hinglish';
    case 'bn': return 'bn-IN';
    case 'ta': return 'ta-IN';
    case 'te': return 'te-IN';
    case 'mr': return 'mr-IN';
    case 'gu': return 'gu-IN';
    case 'kn': return 'kn-IN';
    case 'ml': return 'ml-IN';
    case 'pa': return 'pa-IN';
    case 'or': return 'or-IN';
    case 'as': return 'as-IN';
    case 'en':
    default:
      return 'en-IN';
  }
};

export const translations: Record<AppLanguage, TranslationDictionary> = {
  en,
  hi,
  hinglish,
  bn,
  ta,
  te,
  mr,
  gu,
  kn,
  ml,
  pa,
  or,
  as,
};

/**
 * Access translation dictionary with dev-time missing key warning proxy.
 */
export function getTranslations(lang: AppLanguage): TranslationDictionary {
  const dict = translations[lang] || translations.en;
  if (process.env.NODE_ENV !== 'production' && typeof Proxy !== 'undefined') {
    return new Proxy(dict, {
      get(target, prop: string) {
        if (!(prop in target) || target[prop as keyof TranslationDictionary] === undefined) {
          console.warn(`[i18n] Missing translation key "${prop}" for language "${lang}"`);
          return translations.en[prop as keyof TranslationDictionary] ?? prop;
        }
        return target[prop as keyof TranslationDictionary];
      },
    });
  }
  return dict;
}

export const languageOptions: {
  code: AppLanguage;
  locale: SupportedLocale;
  label: string;
  native: string;
  speechSupported: boolean;
}[] = [
  { code: 'en', locale: 'en-IN', label: 'English', native: 'English', speechSupported: true },
  { code: 'hi', locale: 'hi-IN', label: 'Hindi', native: 'हिंदी', speechSupported: true },
  { code: 'hinglish', locale: 'hinglish', label: 'Hinglish', native: 'Hinglish', speechSupported: true },
  { code: 'bn', locale: 'bn-IN', label: 'Bengali', native: 'বাংলা', speechSupported: true },
  { code: 'ta', locale: 'ta-IN', label: 'Tamil', native: 'தமிழ்', speechSupported: true },
  { code: 'te', locale: 'te-IN', label: 'Telugu', native: 'తెలుగు', speechSupported: true },
  { code: 'mr', locale: 'mr-IN', label: 'Marathi', native: 'मराठी', speechSupported: true },
  { code: 'gu', locale: 'gu-IN', label: 'Gujarati', native: 'ગુજરાતી', speechSupported: true },
  { code: 'kn', locale: 'kn-IN', label: 'Kannada', native: 'ಕನ್ನಡ', speechSupported: true },
  { code: 'ml', locale: 'ml-IN', label: 'Malayalam', native: 'മലയാളം', speechSupported: true },
  { code: 'pa', locale: 'pa-IN', label: 'Punjabi', native: 'ਪੰਜਾਬੀ', speechSupported: true },
  { code: 'or', locale: 'or-IN', label: 'Odia', native: 'ଓଡ଼ିଆ', speechSupported: true },
  { code: 'as', locale: 'as-IN', label: 'Assamese', native: 'অসমীয়া', speechSupported: true },
];

export function getLocalizedRoleButtons(lang: AppLanguage) {
  const dict = translations[lang] || translations.en;
  return {
    doctor: dict.continueAsDoctor,
    patient: dict.continueAsPatient,
    selectLang: dict.preferredLanguageSelectPrompt,
    profile: dict.tabProfileAndSettings,
    interfaceLang: dict.preferredLanguage,
  };
}
