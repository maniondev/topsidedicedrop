import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { loadStats, recordRun, Stats } from '@/lib/storage';
import { Difficulty } from '@/contexts/DifficultyContext';

interface StatsCtxType {
  stats: Stats;
  bestScore: number;
  submitRun: (score: number, bestChain: number, difficulty: Difficulty, usedContinue: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const StatsCtx = createContext<StatsCtxType>({
  stats: { bestScore: 0, totalRuns: 0, bestChain: 0, recentRuns: [] },
  bestScore: 0,
  submitRun: async () => {},
  refresh: async () => {},
});

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>({ bestScore: 0, totalRuns: 0, bestChain: 0, recentRuns: [] });

  useEffect(() => {
    loadStats().then(setStats).catch(() => {});
  }, []);

  const submitRun = useCallback(async (
    score: number,
    bestChain: number,
    difficulty: Difficulty,
    usedContinue: boolean,
  ) => {
    const updated = await recordRun(score, bestChain, difficulty, usedContinue);
    setStats(updated);
  }, []);

  const refresh = useCallback(async () => {
    const s = await loadStats();
    setStats(s);
  }, []);

  const value = useMemo(
    () => ({ stats, bestScore: stats.bestScore, submitRun, refresh }),
    [stats, submitRun, refresh],
  );
  return <StatsCtx.Provider value={value}>{children}</StatsCtx.Provider>;
}

export function useStats() {
  return useContext(StatsCtx);
}
