import { requireOptionalNativeModule } from 'expo-modules-core';

export interface AudioInterruptionEvent {
  type: 'began' | 'ended';
  // iOS's hint that resuming playback is appropriate (set on most alarm/Siri
  // dismissals). Informational — this app restarts-from-the-top regardless,
  // to re-anchor the beat grid.
  shouldResume: boolean;
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
