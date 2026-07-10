import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Game-event haptics. Fire-and-forget wrappers around expo-haptics: the buzz
// runs on dedicated hardware (Taptic Engine / vibrator), so calls cost
// microseconds and are safe at game-event rates (lock, merge passes) — just
// never per soft-drop step or per frame. iPads have no Taptic Engine; calls
// silently no-op there. Independent of the sound toggles by design — haptics
// still work with sound muted — with its own Settings switch persisted here.

const HAPTICS_KEY = 'tm_haptics';

let enabled = true;
AsyncStorage.getItem(HAPTICS_KEY).then(v => { if (v === '0') enabled = false; }).catch(() => {});

export async function getHapticsEnabled(): Promise<boolean> {
  try { return (await AsyncStorage.getItem(HAPTICS_KEY)) !== '0'; } catch { return true; }
}

export function setHapticsEnabled(v: boolean) {
  enabled = v;
  AsyncStorage.setItem(HAPTICS_KEY, v ? '1' : '0').catch(() => {});
}

// Defer every haptic past the current frame's paint. Each expo-haptics call
// allocates + fires an iOS feedback generator ON THE MAIN THREAD; issued
// mid-effect it lands inside the same frame deadline as the board redraw and
// sound trigger it accompanies, and that contention showed up as audible/
// visible hitches during merge cascades. One frame (~16ms) later is
// imperceptible for touch feedback but keeps it out of the busy frame.
// Also enforce a small minimum gap: the Taptic Engine smears impacts fired
// closer than ~150ms into one mushy buzz.
const MIN_GAP_MS = 150;
let lastAt = 0;

function fire(kind: () => Promise<unknown>) {
  if (!enabled) return;
  const now = Date.now();
  if (now - lastAt < MIN_GAP_MS) return;
  lastAt = now;
  requestAnimationFrame(() => { kind().catch(() => {}); });
}

/** Rotate tap. */
export function hapticLight() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Six-clear. */
export function hapticMedium() {
  fire(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** All Clear. */
export function hapticSuccess() {
  fire(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
