import Sound from 'react-native-sound';

let _mode: 'ambient' | 'playback' = 'ambient';

export function setAudioMode(mode: 'ambient' | 'playback') {
  _mode = mode;
}

export function restoreGameAudioSession(delayMs = 200) {
  setTimeout(() => {
    try {
      if (_mode === 'playback') {
        Sound.setCategory('Playback', true);
      } else {
        Sound.setCategory('Ambient');
      }
    } catch {}
  }, delayMs);
}
