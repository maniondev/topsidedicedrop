import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameColors, GameColorsDim, ThemeColors, ThemeId, Themes } from '@/constants/theme';
import { VALUE_TO_FACE, VALUE_DOT_COLORS_DEFAULT } from '@/constants/game';
import { THEME_KEY } from '@/lib/storage';

interface ThemeContextValue {
  themeId: ThemeId;
  colors: ThemeColors;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: 'dicedrop',
  colors: Themes.dicedrop,
  setTheme: () => {},
});

// One-shot migration for the default-theme change (Classic → Dice Drop).
// tm_theme is only ever written by an explicit pick, so users who never
// touched the picker flip to the new default automatically on update. Users
// with a stored 'dice' picked Classic when it WAS the default — move them to
// the new default once. The flag makes it once-ever: anyone who re-picks
// Classic afterwards keeps it through every future launch and update.
const THEME_MIGRATED_KEY = 'tm_theme_default_migrated';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('dicedrop');

  useEffect(() => {
    (async () => {
      try {
        const [v, migrated] = await Promise.all([
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(THEME_MIGRATED_KEY),
        ]);
        if (!migrated) {
          AsyncStorage.setItem(THEME_MIGRATED_KEY, '1').catch(() => {});
          if (v === 'dice') {
            AsyncStorage.setItem(THEME_KEY, 'dicedrop').catch(() => {});
            return; // stay on the (new) default this launch
          }
        }
        if (v && v in Themes) setThemeId(v as ThemeId);
      } catch {}
    })();
  }, []);

  const setTheme = useCallback(async (id: ThemeId) => {
    setThemeId(id);
    await AsyncStorage.setItem(THEME_KEY, id);
  }, []);

  const value = useMemo(() => ({ themeId, colors: Themes[themeId], setTheme }), [themeId, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function useGameColors() {
  const { colors } = useContext(ThemeContext);
  return useMemo(() => ({
    gameColors:    { ...GameColors,    ...(colors.gameColors    ?? {}) } as typeof GameColors,
    gameColorsDim: { ...GameColorsDim, ...(colors.gameColorsDim ?? {}) } as typeof GameColorsDim,
  }), [colors]);
}

/** Returns {faceColor, dotColor} for each die value 1-6, respecting the active theme. */
export function useDieColors(): { faceColor: (v: number) => string; dotColor: (v: number) => string } {
  const { colors } = useContext(ThemeContext);
  return useMemo(() => {
    const merged = { ...GameColors, ...(colors.gameColors ?? {}) };
    const darkDots = colors.lightGameColors ?? false;
    const darken   = new Set(colors.darkenFaceColors ?? []);

    const faceColor = (v: number): string => {
      const face = VALUE_TO_FACE[v];
      return face ? (merged[face] ?? VALUE_DOT_COLORS_DEFAULT[v]) : '#888';
    };

    const dotColor = (v: number): string => {
      // Per-theme darkening (e.g. yellow on light backgrounds). Themes that don't
      // list a face here get white pips (or dark pips when lightGameColors is set).
      const face = VALUE_TO_FACE[v];
      if (face && darken.has(face)) {
        return colors.darkenFaceColorsDot?.[face] ?? '#1A1A1A';
      }
      return darkDots ? '#1A1A1A' : '#ffffff';
    };

    return { faceColor, dotColor };
  }, [colors]);
}
