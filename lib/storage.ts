import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'tm_';

export interface RunRecord {
  score: number;
  date: number;
}

export interface Stats {
  bestScore: number;
  totalRuns: number;
  recentRuns: RunRecord[];
}

const STATS_KEY = `${PREFIX}stats`;
const THEME_KEY = `${PREFIX}theme`;
const SOUND_KEY = `${PREFIX}sound`;

export async function loadStats(): Promise<Stats> {
  try {
    const raw = await AsyncStorage.getItem(STATS_KEY);
    if (raw) return JSON.parse(raw) as Stats;
  } catch {}
  return { bestScore: 0, totalRuns: 0, recentRuns: [] };
}

export async function saveStats(stats: Stats): Promise<void> {
  try {
    await AsyncStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {}
}

export async function recordRun(score: number): Promise<Stats> {
  const stats = await loadStats();
  stats.totalRuns++;
  if (score > stats.bestScore) stats.bestScore = score;
  stats.recentRuns = [{ score, date: Date.now() }, ...stats.recentRuns].slice(0, 20);
  await saveStats(stats);
  return stats;
}

export { THEME_KEY, SOUND_KEY };
