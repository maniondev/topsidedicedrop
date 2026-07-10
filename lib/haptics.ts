import * as Haptics from 'expo-haptics';

// Payoff haptics only: six-clears and All Clear. Per-event haptics (rotate,
// lock, merge passes) were tried and removed — each expo-haptics call fires
// an iOS feedback generator on the main thread, and during gameplay's busy
// frames that contention caused audible/visible hitches. The two remaining
// moments are rare, celebratory, and land after the heavy cascade work.
// No settings toggle — at this frequency there's nothing to opt out of.
// iPads have no Taptic Engine; calls silently no-op there.

// Defer past the current frame's paint so the generator's main-thread work
// can never sit inside a frame deadline, and keep a minimum gap — the Taptic
// Engine smears impacts fired closer than ~150ms into one mushy buzz.
const MIN_GAP_MS = 150;
let lastAt = 0;

function fire(kind: () => Promise<unknown>) {
  const now = Date.now();
  if (now - lastAt < MIN_GAP_MS) return;
  lastAt = now;
  requestAnimationFrame(() => { kind().catch(() => {}); });
}

/** Six-clear. */
export function hapticMedium() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** All Clear. */
export function hapticSuccess() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
