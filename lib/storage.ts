import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty } from '@/contexts/DifficultyContext';

const PREFIX = 'tm_';

export interface RunRecord {
  score: number;
  date: number;
  bestChain: number;
  difficulty: Difficulty;
  usedContinue: boolean;
  preContinueScore?: number; // score at the moment continue was used (unassisted leg)
}

export interface DiffStats {
  bestScore: number;        // best overall (with or without continues)
  bestUnassisted: number;   // best without using continues
  totalRuns: number;
  bestChain: number;
  lifetimeScore: number;    // aggregate of all scores for this difficulty
}

export interface Stats {
  byDifficulty: Record<Difficulty, DiffStats>;
  recentRuns: RunRecord[]; // global, last 100, each tagged with its difficulty
}

const emptyDiff = (): DiffStats => ({ bestScore: 0, bestUnassisted: 0, totalRuns: 0, bestChain: 0, lifetimeScore: 0 });
const emptyStats = (): Stats => {
  const empty = emptyDiff();
  return {
    byDifficulty: { easy: { ...empty }, medium: { ...empty }, hard: { ...empty } },
    recentRuns: [],
  };
};

const STATS_KEY         = `${PREFIX}stats`;
const STATS_RESET_KEY   = `${PREFIX}stats_reset`;
// Saved games are keyed PER DIFFICULTY so an easy run can't be resumed and
// credited as hard (and vice-versa). One save slot per difficulty.
const SAVED_GAME_PREFIX = `${PREFIX}saved_game_`;
const savedKey = (d: Difficulty) => `${SAVED_GAME_PREFIX}${d}`;
export const THEME_KEY         = `${PREFIX}theme`;
export const SOUND_KEY         = `${PREFIX}sound`;
export const CONTROLS_SEEN_KEY = `${PREFIX}controls_seen`;

export async function hasSeenControls(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(CONTROLS_SEEN_KEY)) === '1'; } catch { return false; }
}
export async function markControlsSeen(): Promise<void> {
  try { await AsyncStorage.setItem(CONTROLS_SEEN_KEY, '1'); } catch {}
}

export interface SavedGame {
  board: Array<Array<{ value: number; id: string } | null>>;
  score: number;
  queue: unknown[]; // QueuedPiece[] serialized
  activePiece: unknown; // ActivePiece | null — the in-flight piece, so resume isn't a free reroll
  runBestChain: number;
  difficulty: Difficulty;
  savedAt: number;
  // Dev-only demo runs (preset boards for App Store preview capture). A demo
  // run NEVER submits to stats or the leaderboard — the game screen checks
  // this flag and skips every submit/persist path.
  demo?: boolean;
}

export async function saveGame(game: SavedGame): Promise<void> {
  try { await AsyncStorage.setItem(savedKey(game.difficulty), JSON.stringify(game)); } catch {}
}

export async function loadSavedGame(difficulty: Difficulty): Promise<SavedGame | null> {
  try {
    const raw = await AsyncStorage.getItem(savedKey(difficulty));
    if (raw) return JSON.parse(raw) as SavedGame;
  } catch {}
  return null;
}

export async function clearSavedGame(difficulty: Difficulty): Promise<void> {
  try { await AsyncStorage.removeItem(savedKey(difficulty)); } catch {}
}

export async function loadStats(): Promise<Stats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Migrate / validate: only accept the per-difficulty shape, else start fresh.
      if (parsed && parsed.byDifficulty) {
        const recentRuns: RunRecord[] = Array.isArray(parsed.recentRuns) ? parsed.recentRuns : [];
        const byDiff = {
          easy:   { ...emptyDiff(), ...parsed.byDifficulty.easy },
          medium: { ...emptyDiff(), ...parsed.byDifficulty.medium },
          hard:   { ...emptyDiff(), ...parsed.byDifficulty.hard },
        };
        // One-time migration: if lifetimeScore is missing/0 but recentRuns has data,
        // seed it from whatever history we have (recent runs — best we can do).
        const needsMigration = (['easy', 'medium', 'hard'] as Difficulty[]).some(
          d => byDiff[d].lifetimeScore === 0 && byDiff[d].totalRuns > 0
        );
        if (needsMigration) {
          for (const run of recentRuns) {
            byDiff[run.difficulty].lifetimeScore += run.score;
          }
          // Persist the migrated values so we don't redo this every load
          const migrated = { byDifficulty: byDiff, recentRuns };
          AsyncStorage.setItem(STATS_KEY, JSON.stringify(migrated)).catch(() => {});
        }
        return { byDifficulty: byDiff, recentRuns };
      }
    }
  } catch {}
  return emptyStats();
}

export async function saveStats(stats: Stats): Promise<void> {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export async function clearStats(): Promise<Stats> {
  const empty = emptyStats();
  await saveStats(empty);
  try { await AsyncStorage.setItem(STATS_RESET_KEY, '1'); } catch {}
  return empty;
}

export async function wasStatsReset(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(STATS_RESET_KEY)) === '1'; } catch { return false; }
}

// Records the pre-continue score for bestUnassisted tracking only.
// Never touches totalRuns, lifetimeScore, or recentRuns — the final run covers those.
export async function recordPreContinueRun(
  score: number,
  bestChain: number,
  difficulty: Difficulty,
): Promise<Stats> {
  const stats = await loadStats();
  const d = stats.byDifficulty[difficulty];
  if (score > d.bestUnassisted) d.bestUnassisted = score;
  if (bestChain > d.bestChain) d.bestChain = bestChain;
  await saveStats(stats);
  return stats;
}

// ── Pending run (crash-safe score persistence) ────────────────────────────────
// Written at every game-over, cleared when the run is fully committed (new game,
// quit-and-log, save-and-quit) or consumed on next launch after an app kill.

export interface PendingRun {
  score: number;
  chain: number;
  difficulty: Difficulty;
  continueUsed: boolean;
  preContinueScore?: number;
  savedAt: number;
}

const PENDING_RUN_KEY = `${PREFIX}pending_run`;

export async function savePendingRun(run: Omit<PendingRun, 'savedAt'>): Promise<void> {
  try { await AsyncStorage.setItem(PENDING_RUN_KEY, JSON.stringify({ ...run, savedAt: Date.now() })); } catch {}
}

export async function loadPendingRun(): Promise<PendingRun | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_RUN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export async function clearPendingRun(): Promise<void> {
  try { await AsyncStorage.removeItem(PENDING_RUN_KEY); } catch {}
}

export async function recordRun(
  score: number,
  bestChain: number,
  difficulty: Difficulty,
  usedContinue: boolean,
  preContinueScore?: number,
): Promise<Stats> {
  const stats = await loadStats();
  const d = stats.byDifficulty[difficulty];
  d.totalRuns++;
  d.lifetimeScore += score;
  if (score > d.bestScore) d.bestScore = score;
  // Only update bestUnassisted if no continues were used
  if (!usedContinue && score > d.bestUnassisted) d.bestUnassisted = score;
  if (bestChain > d.bestChain) d.bestChain = bestChain;
  const record: RunRecord = { score, date: Date.now(), bestChain, difficulty, usedContinue };
  if (usedContinue && preContinueScore && preContinueScore > 0) {
    record.preContinueScore = preContinueScore;
  }
  stats.recentRuns = [record, ...stats.recentRuns].slice(0, 100);
  await saveStats(stats);
  return stats;
}
