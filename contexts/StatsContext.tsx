import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { loadStats, recordRun, clearStats, Stats, DiffStats } from '@/lib/storage';
import { Difficulty } from '@/contexts/DifficultyContext';

const EMPTY: Stats = {
  byDifficulty: {
    easy:   { bestScore: 0, bestUnassisted: 0, totalRuns: 0, bestChain: 0, lifetimeScore: 0 },
    medium: { bestScore: 0, bestUnassisted: 0, totalRuns: 0, bestChain: 0, lifetimeScore: 0 },
    hard:   { bestScore: 0, bestUnassisted: 0, totalRuns: 0, bestChain: 0, lifetimeScore: 0 },
  },
  recentRuns: [],
};

interface StatsCtxType {
  stats: Stats;
  statsFor: (d: Difficulty) => DiffStats;
  submitRun: (score: number, bestChain: number, difficulty: Difficulty, usedContinue: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  resetStats: () => Promise<void>;
}

const StatsCtx = createContext<StatsCtxType>({
  stats: EMPTY,
  statsFor: () => EMPTY.byDifficulty.medium,
  submitRun: async () => {},
  refresh: async () => {},
  resetStats: async () => {},
});

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(EMPTY);

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

  const resetStats = useCallback(async () => {
    const empty = await clearStats();
    setStats(empty);
  }, []);

  const statsFor = useCallback((d: Difficulty) => stats.byDifficulty[d], [stats]);

  const value = useMemo(
    () => ({ stats, statsFor, submitRun, refresh, resetStats }),
    [stats, statsFor, submitRun, refresh, resetStats],
  );
  return <StatsCtx.Provider value={value}>{children}</StatsCtx.Provider>;
}

export function useStats() {
  return useContext(StatsCtx);
}
