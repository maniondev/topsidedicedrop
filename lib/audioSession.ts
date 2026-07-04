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
