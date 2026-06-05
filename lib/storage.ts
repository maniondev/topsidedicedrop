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
const SAVED_GAME_KEY = `${PREFIX}saved_game`;
export const THEME_KEY = `${PREFIX}theme`;
export const SOUND_KEY = `${PREFIX}sound`;

export interface SavedGame {
  board: Array<Array<{ value: number; id: string } | null>>;
  score: number;
  queue: unknown[]; // QueuedPiece[] serialized
  runBestChain: number;
  difficulty: Difficulty;
  savedAt: number;
}

export async function saveGame(game: SavedGame): Promise<void> {
  try { await AsyncStorage.setItem(SAVED_GAME_KEY, JSON.stringify(game)); } catch {}
}

export async function loadSavedGame(): Promise<SavedGame | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_GAME_KEY);
    if (raw) return JSON.parse(raw) as SavedGame;
  } catch {}
  return null;
}

export async function clearSavedGame(): Promise<void> {
  try { await AsyncStorage.removeItem(SAVED_GAME_KEY); } catch {}
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
