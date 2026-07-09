import { useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import { AdEventType } from 'react-native-google-mobile-ads';
import { interstitialAd as ad, adsReady } from '@/lib/adManager';
import { useMusic } from '@/contexts/MusicContext';
import { enterAdAudioSession, exitAdAudioSession } from '@/lib/audioSession';

// The interstitial is a shared singleton, and BOTH the home and game screens
// mount this hook (game stacks over the tabs). Registering the persistent
// load/error/close handlers per instance double-fired them — every close ran
// the audio restore twice (double music restart / beat-grid reset). So bind
// them ONCE at module level here; the hook just keeps the shared music
// controls current and exposes showInterstitial.
const sharedMusic = { pauseMusic: () => {}, restartMusicFromTop: () => {} };
let bound = false;
let retry = 0;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleReload() {
  if (retryTimer) clearTimeout(retryTimer);
  const delay = Math.min(60000, 1000 * 2 ** retry); // 1s, 2s, 4s … cap 60s
  retry += 1;
  retryTimer = setTimeout(() => { ad.load(); }, delay);
}

function bindOnce() {
  if (bound) return;
  bound = true;
  ad.addAdEventListener(AdEventType.LOADED, () => { retry = 0; }); // success resets backoff
  ad.addAdEventListener(AdEventType.ERROR, () => { scheduleReload(); });
  // iOS: restore the user's audio category + restart the soundtrack once when
  // the ad closes, however it was dismissed. Android ads are silent.
  if (Platform.OS === 'ios') {
    ad.addAdEventListener(AdEventType.CLOSED, () => {
      try { exitAdAudioSession(); sharedMusic.restartMusicFromTop(); } catch {}
    });
  }
  if (adsReady && !ad.loaded) ad.load();
}

export function useInterstitialAd() {
  const { pauseMusic, restartMusicFromTop } = useMusic();
  sharedMusic.pauseMusic = pauseMusic;
  sharedMusic.restartMusicFromTop = restartMusicFromTop;

  useEffect(() => { bindOnce(); }, []);

  // Shows interstitial if ready; if not, proceeds immediately (no fallback ad).
  const showInterstitial = useCallback((onDone: () => void) => {
    if (!ad.loaded) { onDone(); return; }
    const unsub = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsub();
      ad.load();
      onDone();
    });
    // iOS: mute soundtrack + force silent-respecting Ambient before the ad
    // presents. If show() fails, undo so nothing is stranded.
    if (Platform.OS === 'ios') {
      try { sharedMusic.pauseMusic(); enterAdAudioSession(); } catch {}
    }
    ad.show().catch(() => {
      unsub();
      if (Platform.OS === 'ios') {
        try { exitAdAudioSession(); sharedMusic.restartMusicFromTop(); } catch {}
      }
      onDone();
    });
  }, []);

  return { showInterstitial };
}
