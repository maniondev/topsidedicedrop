import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Difficulty = 'easy' | 'medium' | 'hard';

// Gravity interval per difficulty (ms per cell drop)
export const GRAVITY_MS: Record<Difficulty, number> = {
  easy:   1152, // 20% slower than medium (960 × 1.20)
  medium:  960, // normal
  hard:    576, // 40% faster than medium (960 × 0.60)
};

const DIFF_KEY = 'tm_difficulty';

interface DifficultyCtxType {
  difficulty: Difficulty;
  setDifficulty: (d: Difficulty) => void;
  gravityMs: number;
}

const DifficultyCtx = createContext<DifficultyCtxType>({
  difficulty: 'medium',
  setDifficulty: () => {},
  gravityMs: GRAVITY_MS.medium,
});

export function DifficultyProvider({ children }: { children: ReactNode }) {
  const [difficulty, setDifficultyState] = useState<Difficulty>('medium');

  useEffect(() => {
    AsyncStorage.getItem(DIFF_KEY).then(v => {
      if (v === 'easy' || v === 'medium' || v === 'hard') setDifficultyState(v);
    }).catch(() => {});
  }, []);

  const setDifficulty = useCallback(async (d: Difficulty) => {
    setDifficultyState(d);
    await AsyncStorage.setItem(DIFF_KEY, d);
  }, []);

  const value = useMemo(() => ({
    difficulty,
    setDifficulty,
    gravityMs: GRAVITY_MS[difficulty],
  }), [difficulty, setDifficulty]);

  return <DifficultyCtx.Provider value={value}>{children}</DifficultyCtx.Provider>;
}

export function useDifficulty() {
  return useContext(DifficultyCtx);
}
