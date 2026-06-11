import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

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

export async function replayQueue(): Promise<void> {
  const queue = await loadQueue();
  if (queue.length === 0) return;

  const failed: QueuedScore[] = [];
  for (const entry of queue) {
    try {
      const { error } = await withTimeout(supabase.rpc('submit_score', {
        p_player_id:     entry.p_player_id,
        p_display_name:  entry.p_display_name,
        p_score:         entry.p_score,
        p_best_chain:    entry.p_best_chain,
        p_difficulty:    entry.p_difficulty,
        p_used_continue: entry.p_used_continue,
      }));
      if (error) throw error;
    } catch {
      failed.push(entry);
    }
  }

  await saveQueue(failed);
}
