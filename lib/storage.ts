import AsyncStorage from '@react-native-async-storage/async-storage';
import { Difficulty } from '@/contexts/DifficultyContext';

const PREFIX = 'tm_';

export interface RunRecord {
  score: number;
  date: number;
  bestChain: number;
  difficulty: Difficulty;
  usedContinue: boolean;
}

export interface Stats {
  bestScore: number;
  totalRuns: number;
  bestChain: number;
  recentRuns: RunRecord[];
}

const STATS_KEY      = `${PREFIX}stats`;
// Saved games are keyed PER DIFFICULTY so an easy run can't be resumed and
// credited as hard (and vice-versa). One save slot per difficulty.
const SAVED_GAME_PREFIX = `${PREFIX}saved_game_`;
const savedKey = (d: Difficulty) => `${SAVED_GAME_PREFIX}${d}`;
export const THEME_KEY = `${PREFIX}theme`;
export const SOUND_KEY = `${PREFIX}sound`;

export interface SavedGame {
  board: Array<Array<{ value: number; id: string } | null>>;
  score: number;
  queue: unknown[]; // QueuedPiece[] serialized
  activePiece: unknown; // ActivePiece | null — the in-flight piece, so resume isn't a free reroll
  runBestChain: number;
  difficulty: Difficulty;
  savedAt: number;
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
    if (raw) return JSON.parse(raw) as Stats;
  } catch {}
  return { bestScore: 0, totalRuns: 0, bestChain: 0, recentRuns: [] };
}

export async function saveStats(stats: Stats): Promise<void> {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export async function clearStats(): Promise<Stats> {
  const empty: Stats = { bestScore: 0, totalRuns: 0, bestChain: 0, recentRuns: [] };
  await saveStats(empty);
  return empty;
}

export async function recordRun(
  score: number,
  bestChain: number,
  difficulty: Difficulty,
  usedContinue: boolean,
): Promise<Stats> {
  const stats = await loadStats();
  stats.totalRuns++;
  if (score > stats.bestScore) stats.bestScore = score;
  if (bestChain > stats.bestChain) stats.bestChain = bestChain;
  stats.recentRuns = [
    { score, date: Date.now(), bestChain, difficulty, usedContinue },
    ...stats.recentRuns,
  ].slice(0, 20);
  await saveStats(stats);
  return stats;
}
