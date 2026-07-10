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

/** Rotate tap, merge chain pass. */
export function hapticLight() {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Six-clear. */
export function hapticMedium() {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** All Clear. */
export function hapticSuccess() {
  if (!enabled) return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}
