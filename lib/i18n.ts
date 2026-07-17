import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '@/locales/en.json';
import es from '@/locales/es.json';
import fr from '@/locales/fr.json';
import de from '@/locales/de.json';
import ptBR from '@/locales/pt-BR.json';
import it from '@/locales/it.json';
import ja from '@/locales/ja.json';
import ko from '@/locales/ko.json';
import zhHans from '@/locales/zh-Hans.json';

// The languages we ship translation bundles for. English is the source of
// truth and the fallback for every missing key.
export const SUPPORTED_LANGUAGES = [
  'en', 'es', 'fr', 'de', 'pt-BR', 'it', 'ja', 'ko', 'zh-Hans',
] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// Each language shown in its OWN name (endonym) — the universal convention for
// a language picker, so a speaker can always recognize their language
// regardless of the UI's current language.
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  'pt-BR': 'Português (Brasil)',
  it: 'Italiano',
  ja: '日本語',
  ko: '한국어',
  'zh-Hans': '简体中文',
};

// Set once the user picks a language explicitly; overrides device language on
// every future launch until changed.
const LANGUAGE_KEY = 'td_language';

const resources = {
  en:        { translation: en },
  es:        { translation: es },
  fr:        { translation: fr },
  de:        { translation: de },
  'pt-BR':   { translation: ptBR },
  it:        { translation: it },
  ja:        { translation: ja },
  ko:        { translation: ko },
  'zh-Hans': { translation: zhHans },
};

// Map the device's ordered preferred locales to the best supported bundle.
// We only ship Brazilian Portuguese and Simplified Chinese, so bare `pt` and
// `zh` (any script/region) route to those; unsupported scripts (e.g. zh-Hant)
// fall through to the next preferred locale, then English.
function resolveDeviceLanguage(): SupportedLanguage {
  const supported = new Set<string>(SUPPORTED_LANGUAGES);
  // getLocales() is a native call; guard it so a missing/edge native state
  // can never crash i18n init — fall back to English instead.
  let locales: ReturnType<typeof getLocales> = [];
  try { locales = getLocales(); } catch { return 'en'; }
  for (const loc of locales) {
    const tag = loc.languageTag;                       // e.g. 'pt-BR', 'zh-Hans-CN'
    const lang = (loc.languageCode ?? '').toLowerCase(); // e.g. 'pt', 'zh'
    if (tag && supported.has(tag)) return tag as SupportedLanguage;
    if (lang === 'pt') return 'pt-BR';
    // TODO: distinguish Traditional (zh-Hant) — we only ship Simplified today.
    if (lang === 'zh') return 'zh-Hans';
    if (lang && supported.has(lang)) return lang as SupportedLanguage;
  }
  return 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: resolveDeviceLanguage(),
    fallbackLng: 'en',
    // React already escapes rendered strings — double-escaping mangles copy
    // with apostrophes/quotes.
    interpolation: { escapeValue: false },
    returnNull: false,
  });

/**
 * Apply a previously saved manual language choice, if any. Call once at
 * startup BEFORE rendering (the root layout gates on it) so the UI never
 * flashes the device language before switching to the saved one.
 */
export async function loadStoredLanguage(): Promise<void> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (
      stored &&
      (SUPPORTED_LANGUAGES as readonly string[]).includes(stored) &&
      stored !== i18n.language
    ) {
      await i18n.changeLanguage(stored);
    }
  } catch {}
}

/** Switch language now and remember the choice for future launches. */
export async function setLanguage(code: SupportedLanguage): Promise<void> {
  try { await AsyncStorage.setItem(LANGUAGE_KEY, code); } catch {}
  await i18n.changeLanguage(code);
}

export default i18n;
