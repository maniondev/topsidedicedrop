import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GameColors, GameColorsDim, ThemeColors, ThemeId, Themes } from '@/constants/theme';
import { THEME_KEY } from '@/lib/storage';

interface ThemeContextValue {
  themeId: ThemeId;
  colors: ThemeColors;
  setTheme: (id: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: 'dice',
  colors: Themes.dice,
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<ThemeId>('dice');

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
