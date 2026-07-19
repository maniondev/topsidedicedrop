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
  // Traditional-script Chinese (zh-Hant) isn't shipped. Rather than forcing
  // those users straight to Simplified, prefer any OTHER supported language
  // later in their preference list; only when none exists fall back to
  // zh-Hans — still closer to their language than English. Simplified-script
  // (and script-unspecified) Chinese maps to zh-Hans immediately as before.
  let deferred: SupportedLanguage | null = null;
  for (const loc of locales) {
    const tag = loc.languageTag;                       // e.g. 'pt-BR', 'zh-Hans-CN'
    const lang = (loc.languageCode ?? '').toLowerCase(); // e.g. 'pt', 'zh'
    if (tag && supported.has(tag)) return tag as SupportedLanguage;
    if (lang === 'pt') return 'pt-BR';
    if (lang === 'zh') {
      if (loc.languageScriptCode === 'Hant') { deferred = deferred ?? 'zh-Hans'; continue; }
      return 'zh-Hans';
    }
    if (lang && supported.has(lang)) return lang as SupportedLanguage;
  }
  return deferred ?? 'en';
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

// ── Locale-aware formatting ──────────────────────────────────────────────────
// Always format against the APP's active language, never the device locale —
// they can differ once the user picks a language in Settings, and a raw
// `toLocaleString()`/`toLocaleDateString()` (locale `undefined` = device)
// would then show e.g. "Jul 17, 2026" inside a Japanese UI. Components that
// render these all use useTranslation(), so a language switch re-renders them
// and the helpers pick up the new language on that render.

// Formatter instances are cached — formatNumber sits in per-frame paths (the
// HUD's animated score count-up during merge chains), and constructing an
// Intl formatter is a native allocation per call. Keyed by options signature;
// both caches are dropped whenever the app language changes.
let numberFormatCache = new Map<string, Intl.NumberFormat>();
let dateFormatCache: Intl.DateTimeFormat | null = null;
i18n.on('languageChanged', () => {
  numberFormatCache = new Map();
  dateFormatCache = null;
});

/** App-language digit grouping (en 12,345 / de 12.345 / fr 12 345). */
export function formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
  try {
    const key = options ? JSON.stringify(options) : '';
    let fmt = numberFormatCache.get(key);
    if (!fmt) {
      fmt = new Intl.NumberFormat(i18n.language, options);
      numberFormatCache.set(key, fmt);
    }
    return fmt.format(n);
  } catch {
    return n.toLocaleString();
  }
}

/** Abbreviated score (1,234 / 1.2K / 3.4M) with the app language's separators
 *  (de "1,2K"). Shared by the leaderboard and Find Players so the two can't
 *  drift apart. */
export function formatScore(n: number): string {
  if (n >= 1_000_000) return `${formatNumber(n / 1_000_000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M`;
  if (n >= 1_000)     return `${formatNumber(n / 1_000, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}K`;
  return formatNumber(n);
}

/** App-language short date (en "Jul 17, 2026" / de "17. Juli 2026" / ja "2026年7月17日"). */
export function formatDate(ts: number): string {
  const opts = { month: 'short', day: 'numeric', year: 'numeric' } as const;
  try {
    if (!dateFormatCache) dateFormatCache = new Intl.DateTimeFormat(i18n.language, opts);
    return dateFormatCache.format(ts);
  } catch {
    return new Date(ts).toLocaleDateString(undefined, opts);
  }
}

// Kick the stored-language read off at module load — the root layout gates its
// first render on this promise, and starting it here (instead of in a
// post-mount effect) overlaps the AsyncStorage round-trip with font loading
// and native module init instead of serializing it after React mounts.
export const storedLanguageReady: Promise<void> = loadStoredLanguage();

export default i18n;
