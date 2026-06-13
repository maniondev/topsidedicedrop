import Sound from 'react-native-sound';

export function restoreGameAudioSession(delayMs = 200) {
  setTimeout(() => {
    try {
      Sound.setCategory('Playback', true);
      Sound.setActive(true);
    } catch {}
  }, delayMs);
}
