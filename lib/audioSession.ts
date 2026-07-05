import Sound from 'react-native-sound';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOUND_MODE_KEY = 'tm_sound_mode'; // shared with SoundContext

let _mode: 'ambient' | 'playback' = 'ambient';

function applyCategory(mode: 'ambient' | 'playback') {
  try {
    if (mode === 'playback') {
      Sound.setCategory('Playback', true);
    } else {
      Sound.setCategory('Ambient');
    }
    // iOS deactivates the shared AVAudioSession on backgrounding; nothing
    // else in the app calls setActive again afterward (removed from every
    // play() call by patches/react-native-sound+0.13.0.patch for perf), so
    // without this, playback silently no-ops after an app-switcher trip.
    Sound.setActive(true);
  } catch {}
}

export function setAudioMode(mode: 'ambient' | 'playback') {
  _mode = mode;
  applyCategory(mode);
}

// Two independent contexts (Sound SFX + Music) each construct a batch of
// Sound/AVAudioPlayer instances on mount. Calling the native setCategory
// bridge from both, concurrently, while either batch is mid-construction can
// disrupt in-flight player setup on iOS. This makes the FIRST-ever category
// application shared and idempotent — whichever context calls it first does
// the real native work; the other just awaits the same promise instead of
// making its own competing native call.
let ensurePromise: Promise<void> | null = null;
export function ensureAudioSessionCategory(): Promise<void> {
  if (!ensurePromise) {
    ensurePromise = (async () => {
      try {
        const saved = await AsyncStorage.getItem(SOUND_MODE_KEY);
        _mode = saved === 'playback' ? 'playback' : 'ambient';
      } catch {}
      applyCategory(_mode);
    })();
  }
  return ensurePromise;
}

export function restoreGameAudioSession(delayMs = 200) {
  setTimeout(() => {
    applyCategory(_mode);
  }, delayMs);
}

// Foregrounding (app switcher, incoming call, etc.) can leave iOS's shared
// AVAudioSession deactivated. SoundContext and MusicContext both react to
// the same 'active' AppState event and each reconstruct their own batch of
// Sound/AVAudioPlayer instances — the same concurrent-native-call race that
// ensureAudioSessionCategory() fixed for cold launch reappears here unless
// both go through one shared, awaited reactivation first. Coalesces callers
// that overlap in time into a single real native call; resets once resolved
// so the *next* foreground event runs it fresh.
let resumePromise: Promise<void> | null = null;
export function reactivateAudioSessionOnResume(): Promise<void> {
  if (!resumePromise) {
    resumePromise = (async () => {
      applyCategory(_mode);
    })().finally(() => {
      resumePromise = null;
    });
  }
  return resumePromise;
}
