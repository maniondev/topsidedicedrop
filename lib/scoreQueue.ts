import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { getPlayerIdentity } from './playerIdentity';

const QUEUE_KEY      = 'td_score_queue';
// Write-ahead marker for a leaderboard reset that couldn't reach Supabase
// (user reset stats while offline). Holds the playerId to clear. Every
// submission path flushes this FIRST, which guarantees a delayed reset can
// never land after newer legitimate scores and wipe them.
const PENDING_RESET_KEY = 'td_pending_remote_reset';
const TIMEOUT_MS     = 6000;

// PromiseLike (not Promise) because supabase.rpc() returns a thenable
// builder, not a real Promise — Promise.race accepts either at runtime;
// this just makes the types agree.
function withTimeout<T>(promise: PromiseLike<T>, ms: number = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

interface QueuedScore {
  p_player_id:          string;
  p_display_name:       string;
  p_score:              number;
  p_best_chain:         number;
  p_difficulty:         string;
  p_used_continue:      boolean;
  p_pre_continue_score: number;
  p_idempotency_key:    string;
  queued_at:            number;
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

// Completes any pending remote reset before other leaderboard writes.
// Throws if the reset can't complete — callers treat that like any other
// network failure (queue the score locally, retry later), preserving
// reset-before-scores ordering.
async function flushPendingRemoteReset(): Promise<void> {
  let playerId: string | null = null;
  try {
    playerId = await AsyncStorage.getItem(PENDING_RESET_KEY);
  } catch {
    return; // can't read the flag — don't block submissions on it
  }
  if (!playerId) return;
  const { error } = await withTimeout(supabase.rpc('reset_player_scores', { p_player_id: playerId }));
  if (error) throw error;
  await AsyncStorage.removeItem(PENDING_RESET_KEY);
}

export async function submitScore(params: Omit<QueuedScore, 'queued_at'>): Promise<void> {
  try {
    await flushPendingRemoteReset();
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
  p_score:              number;
  p_best_chain:         number;
  p_difficulty:         string;
  p_used_continue:      boolean;
  p_pre_continue_score?: number;
}): Promise<void> {
  const normalized = {
    ...params,
    p_pre_continue_score: params.p_pre_continue_score ?? 0,
    p_idempotency_key:    generateUUID(),
  };
  try {
    const { playerId, displayName } = await getPlayerIdentity();
    await submitScore({ p_player_id: playerId, p_display_name: displayName, ...normalized });
  } catch {
    // Identity fetch failed — queue with a placeholder; replayQueue will resolve it next launch.
    const queue = await loadQueue();
    queue.push({ p_player_id: 'unknown', p_display_name: 'unknown', ...normalized, queued_at: Date.now() });
    await saveQueue(queue);
  }
}

export async function updateBestUnassistedForCurrentPlayer(params: {
  p_score: number;
  p_difficulty: string;
}): Promise<void> {
  try {
    await flushPendingRemoteReset();
    const { playerId, displayName } = await getPlayerIdentity();
    await withTimeout(supabase.rpc('update_best_unassisted', {
      p_player_id:    playerId,
      p_display_name: displayName,
      p_score:        params.p_score,
      p_difficulty:   params.p_difficulty,
    }));
  } catch {}
}

export async function clearRemoteScores(playerId: string): Promise<void> {
  // Queued-but-unsent scores predate the reset — they die with it.
  await AsyncStorage.removeItem(QUEUE_KEY);
  // Write-ahead: mark the reset as pending BEFORE attempting it, so an
  // offline reset (or a crash mid-flight) is retried by the next
  // submission or queue replay instead of silently leaving the player's
  // "deleted" scores on the leaderboard. reset_player_scores only touches
  // this player's own rows and is idempotent, so a redundant retry after
  // an already-successful reset is harmless — and because every submit
  // flushes the pending reset first, a late retry can never wipe scores
  // posted after the reset.
  try { await AsyncStorage.setItem(PENDING_RESET_KEY, playerId); } catch {}
  try {
    const { error } = await withTimeout(supabase.rpc('reset_player_scores', { p_player_id: playerId }));
    if (error) throw error;
    await AsyncStorage.removeItem(PENDING_RESET_KEY);
  } catch {
    // Stays pending; flushPendingRemoteReset retries on the next
    // submission or replayQueue pass.
  }
}

export async function replayQueue(): Promise<void> {
  // A pending reset MUST land before any queued scores are replayed —
  // if it still can't complete, don't replay anything this pass.
  try {
    await flushPendingRemoteReset();
  } catch {
    return;
  }

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
        p_player_id:          resolved.p_player_id,
        p_display_name:       resolved.p_display_name,
        p_score:              resolved.p_score,
        p_best_chain:         resolved.p_best_chain,
        p_difficulty:         resolved.p_difficulty,
        p_used_continue:      resolved.p_used_continue,
        p_pre_continue_score: resolved.p_pre_continue_score ?? 0,
        p_idempotency_key:    resolved.p_idempotency_key,
      }));
      if (error) throw error;
    } catch {
      failed.push(entry); // re-queue the original (unresolved) entry to retry next time
    }
  }

  // Merge failed entries with any new entries added to the queue while replay was running.
  const currentQueue = await loadQueue();
  const triedKeys = new Set(queue.map(e => e.p_idempotency_key));
  const newEntries = currentQueue.filter(e => !triedKeys.has(e.p_idempotency_key));
  await saveQueue([...failed, ...newEntries]);
}
