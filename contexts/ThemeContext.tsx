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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('dicedrop');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((v) => {
      if (v && v in Themes) setThemeId(v as ThemeId);
    });
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
