import { requireOptionalNativeModule } from 'expo-modules-core';

// Optional: absent on Android and in any build produced before this native
// module existed. In those cases we report `false` so callers keep their prior
// behavior (the app's own soundtrack plays as before).
const NativeAudioInfo = requireOptionalNativeModule<{
  isOtherAudioPlaying(): boolean;
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
