import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { getLocales } from 'expo-localization';

// Languages whose text the app's custom fonts (Fredoka / Rubik / Playfair)
// cannot render — those are Latin-only typefaces with no CJK glyphs, so
// Japanese / Korean / Chinese text set in them shows tofu (□), especially on
// Android where an explicit fontFamily often won't fall back on its own.
const CJK_LANGS = new Set(['ja', 'ko', 'zh']);

/** True when `lang` (defaults to the device language) needs the system font. */
export function isCJK(lang?: string): boolean {
  const code = (lang ?? getLocales()[0]?.languageCode ?? 'en')
    .toLowerCase()
    .split('-')[0];
  return CJK_LANGS.has(code);
}

/**
 * Returns a resolver for `fontFamily` values that is aware of the active
 * language. Latin locales keep the app's custom fonts; CJK locales get
 * `undefined`, so React Native falls back to the system font (which ships
 * with full CJK coverage) instead of rendering tofu.
 *
 * Only wrap fontFamily on <Text> that renders TRANSLATED copy. Brand text
 * (the "Topside: Dice Drop" logo) and pure-number displays (scores) stay on
 * their custom font — they're always Latin/digits and render fine everywhere.
 *
 *   const font = useLocalizedFont();
 *   <Text style={{ fontFamily: font('Fredoka_600SemiBold') }}>{t('...')}</Text>
 */
export function useLocalizedFont(): (family: string) => string | undefined {
  const { i18n } = useTranslation();
  const cjk = isCJK(i18n.language);
  return useCallback((family: string) => (cjk ? undefined : family), [cjk]);
}
