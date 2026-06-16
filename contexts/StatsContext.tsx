import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { loadStats, saveStats, recordRun, recordPreContinueRun, clearStats, loadPendingRun, clearPendingRun, Stats, DiffStats } from '@/lib/storage';
import { Difficulty } from '@/contexts/DifficultyContext';
import { clearRemoteScores, submitScoreForCurrentPlayer } from '@/lib/scoreQueue';
import { getPlayerIdentity } from '@/lib/playerIdentity';
import { supabase } from '@/lib/supabase';

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
  submitRun: (score: number, bestChain: number, difficulty: Difficulty, usedContinue: boolean, preContinueScore?: number) => Promise<void>;
  submitPreContinueRun: (score: number, bestChain: number, difficulty: Difficulty) => Promise<void>;
  refresh: () => Promise<void>;
  resetStats: () => Promise<void>;
}

const StatsCtx = createContext<StatsCtxType>({
  stats: EMPTY,
  statsFor: () => EMPTY.byDifficulty.medium,
  submitRun: async () => {},
  submitPreContinueRun: async () => {},
  refresh: async () => {},
  resetStats: async () => {},
});

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<Stats>(EMPTY);

  useEffect(() => {
    loadStats().then(async (loaded) => {
      setStats(loaded);
      // On a fresh install (all zeros), try to seed from Supabase leaderboard.
      const isEmpty = Object.values(loaded.byDifficulty).every(d => d.totalRuns === 0);
      if (isEmpty) {
        try {
          const { playerId } = await getPlayerIdentity();
          const { data } = await supabase
            .from('leaderboard')
            .select('difficulty, best_score, best_unassisted, best_chain, lifetime_score, run_count')
            .eq('player_id', playerId);
          if (data && data.length > 0) {
            const seeded: Stats = { ...loaded, byDifficulty: { ...loaded.byDifficulty } };
            for (const row of data) {
              const d = row.difficulty as Difficulty;
              if (seeded.byDifficulty[d]) {
                seeded.byDifficulty[d] = {
                  bestScore:      row.best_score,
                  bestUnassisted: row.best_unassisted,
                  bestChain:      row.best_chain,
                  lifetimeScore:  row.lifetime_score,
                  totalRuns:      row.run_count,
                };
              }
            }
            // Also restore recent runs (up to 35 days — Supabase retention window).
            // Restores lastRun, day streak, and this-week/this-month personal views.
            const { data: runsData } = await supabase
              .from('runs')
              .select('score, unassisted_score, best_chain, difficulty, used_continue, played_at')
              .eq('player_id', playerId)
              .order('played_at', { ascending: false })
              .limit(100);
            if (runsData && runsData.length > 0) {
              seeded.recentRuns = runsData.map(r => ({
                score:            r.score,
                date:             new Date(r.played_at).getTime(),
                bestChain:        r.best_chain,
                difficulty:       r.difficulty as Difficulty,
                usedContinue:     r.used_continue,
                preContinueScore: r.used_continue ? r.unassisted_score : undefined,
              }));
            }
            await saveStats(seeded);
            setStats(seeded);
          }
        } catch {}
      }
    }).catch(() => {});
    // If the app was killed while a game-over was pending (player never tapped New Game
    // or Continue), recover and commit that run now.
    loadPendingRun().then(async (pending) => {
      if (!pending) return;
      const age = Date.now() - pending.savedAt;
      if (pending.score > 0 && age < 24 * 60 * 60 * 1000) {
        const updated = await recordRun(pending.score, pending.chain, pending.difficulty, pending.continueUsed, pending.preContinueScore);
        setStats(updated);
        submitScoreForCurrentPlayer({ p_score: pending.score, p_best_chain: pending.chain, p_difficulty: pending.difficulty, p_used_continue: pending.continueUsed, p_pre_continue_score: pending.preContinueScore ?? 0 });
      }
      await clearPendingRun();
    }).catch(() => {});
  }, []);

  const submitRun = useCallback(async (
    score: number,
    bestChain: number,
    difficulty: Difficulty,
    usedContinue: boolean,
    preContinueScore?: number,
  ) => {
    const updated = await recordRun(score, bestChain, difficulty, usedContinue, preContinueScore);
    setStats(updated);
  }, []);

  const submitPreContinueRun = useCallback(async (
    score: number,
    bestChain: number,
    difficulty: Difficulty,
  ) => {
    const updated = await recordPreContinueRun(score, bestChain, difficulty);
    setStats(updated);
  }, []);

  const refresh = useCallback(async () => {
    const s = await loadStats();
    setStats(s);
  }, []);

  const resetStats = useCallback(async () => {
    const empty = await clearStats();
    setStats(empty);
    clearPendingRun();
    try {
      const { playerId } = await getPlayerIdentity();
      await clearRemoteScores(playerId);
    } catch {}
  }, []);

  const statsFor = useCallback((d: Difficulty) => stats.byDifficulty[d], [stats]);

  const value = useMemo(
    () => ({ stats, statsFor, submitRun, submitPreContinueRun, refresh, resetStats }),
    [stats, statsFor, submitRun, submitPreContinueRun, refresh, resetStats],
  );
  return <StatsCtx.Provider value={value}>{children}</StatsCtx.Provider>;
}

export function useStats() {
  return useContext(StatsCtx);
}
