import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getPlayerIdentity } from './playerIdentity';

const QUEUE_KEY      = 'td_score_queue';
const TIMEOUT_MS     = 6000;

function withTimeout<T>(promise: Promise<T>, ms: number = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

interface QueuedScore {
  p_player_id:     string;
  p_display_name:  string;
  p_score:         number;
  p_best_chain:    number;
  p_difficulty:    string;
  p_used_continue: boolean;
  queued_at:       number;
}

async function loadQueue(): Promise<QueuedScore[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedScore[]): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

export async function submitScore(params: Omit<QueuedScore, 'queued_at'>): Promise<void> {
  try {
    const { error } = await withTimeout(supabase.rpc('submit_score', params));
    if (error) throw error;
  } catch {
    const queue = await loadQueue();
    queue.push({ ...params, queued_at: Date.now() });
    await saveQueue(queue);
  }
}

/** Fetches player identity then submits. Guarantees queuing even if identity fetch fails. */
export async function submitScoreForCurrentPlayer(params: {
  p_score: number;
  p_best_chain: number;
  p_difficulty: string;
  p_used_continue: boolean;
}): Promise<void> {
  try {
    const { playerId, displayName } = await getPlayerIdentity();
    await submitScore({ p_player_id: playerId, p_display_name: displayName, ...params });
  } catch {
    // Identity fetch failed — queue with a placeholder; replayQueue will resolve it next launch.
    const queue = await loadQueue();
    queue.push({ p_player_id: 'unknown', p_display_name: 'unknown', ...params, queued_at: Date.now() });
    await saveQueue(queue);
  }
}

export async function clearRemoteScores(playerId: string): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
  await withTimeout(supabase.rpc('reset_player_scores', { p_player_id: playerId }));
}

export async function replayQueue(): Promise<void> {
  const queue = await loadQueue();
  if (queue.length === 0) return;

  // Resolve any entries queued with unknown identity (identity fetch had failed at submit time)
  let resolvedId: string | null = null;
  let resolvedName: string | null = null;
  const needsResolution = queue.some(e => e.p_player_id === 'unknown');
  if (needsResolution) {
    try {
      const identity = await getPlayerIdentity();
      resolvedId   = identity.playerId;
      resolvedName = identity.displayName;
    } catch {}
  }

  const failed: QueuedScore[] = [];
  for (const entry of queue) {
    const resolved = entry.p_player_id === 'unknown'
      ? { ...entry, p_player_id: resolvedId ?? '', p_display_name: resolvedName ?? '' }
      : entry;

    // Drop permanently if identity still unknown — don't pollute leaderboard
    if (!resolved.p_player_id) continue;

    try {
      const { error } = await withTimeout(supabase.rpc('submit_score', {
        p_player_id:     resolved.p_player_id,
        p_display_name:  resolved.p_display_name,
        p_score:         resolved.p_score,
        p_best_chain:    resolved.p_best_chain,
        p_difficulty:    resolved.p_difficulty,
        p_used_continue: resolved.p_used_continue,
      }));
      if (error) throw error;
    } catch {
      failed.push(entry); // re-queue the original (unresolved) entry to retry next time
    }
  }

  await saveQueue(failed);
}
