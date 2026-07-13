import { requireOptionalNativeModule } from 'expo-modules-core';

export interface AudioInterruptionEvent {
  type: 'began' | 'ended';
  // iOS's hint that resuming playback is appropriate (set on most alarm/Siri
  // dismissals). Informational — this app restarts-from-the-top regardless,
  // to re-anchor the beat grid.
  shouldResume: boolean;
}

export interface AudioRouteChangeEvent {
  // AVAudioSession.RouteChangeReason as a string — e.g. 'newDeviceAvailable'
  // (a device, often Bluetooth, connected) or 'oldDeviceUnavailable'
  // (disconnected). Informational; callers currently treat every reason the
  // same (a cue to re-verify sync state), but it's threaded through in case
  // that ever needs to change.
  reason: string;
}

// Optional: absent on Android and in any build produced before this native
// module existed. In those cases we report `false` / never fire events, so
// callers keep their prior behavior.
const NativeAudioInfo = requireOptionalNativeModule<{
  isOtherAudioPlaying(): boolean;
  addListener(
    eventName: 'onAudioInterruption',
    listener: (event: AudioInterruptionEvent) => void,
  ): { remove(): void };
  addListener(
    eventName: 'onAudioRouteChange',
    listener: (event: AudioRouteChangeEvent) => void,
  ): { remove(): void };
}>('NativeAudioInfo');

/**
 * True when other audio (the user's own music, a podcast, a call, etc.) is
 * currently playing on the device. iOS only; returns false everywhere the
 * native module isn't available.
 */
export function isOtherAudioPlaying(): boolean {
  if (!NativeAudioInfo) return false;
  try {
    return NativeAudioInfo.isOtherAudioPlaying();
  } catch {
    return false;
  }
}

/**
 * Subscribe to audio-session interruptions (alarms, timers, Siri, calls).
 * These can fire WITHOUT an AppState change — a banner alarm leaves the app
 * 'active' — so audio recovery must not rely on foreground events alone.
 * iOS only; a no-op subscription is returned where the module is absent.
 */
export function addAudioInterruptionListener(
  listener: (event: AudioInterruptionEvent) => void,
): { remove(): void } {
  if (!NativeAudioInfo) return { remove() {} };
  try {
    return NativeAudioInfo.addListener('onAudioInterruption', listener);
  } catch {
    return { remove() {} };
  }
}

/**
 * Subscribe to audio ROUTE changes — Bluetooth (AirPods) connect/disconnect,
 * wired headphones, CarPlay, AirPlay. Route negotiation (Bluetooth especially)
 * can take longer than this app's fixed "did playback actually start" checks,
 * which can leave the music beat-sync epoch unset (animations stuck idle)
 * even though audio eventually plays. iOS only; a no-op subscription is
 * returned where the module is absent.
 */
export function addAudioRouteChangeListener(
  listener: (event: AudioRouteChangeEvent) => void,
): { remove(): void } {
  if (!NativeAudioInfo) return { remove() {} };
  try {
    return NativeAudioInfo.addListener('onAudioRouteChange', listener);
  } catch {
    return { remove() {} };
  }
}
