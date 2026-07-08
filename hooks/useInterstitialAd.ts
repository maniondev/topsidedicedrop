import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { AdEventType } from 'react-native-google-mobile-ads';
import { interstitialAd as ad, adsReady } from '@/lib/adManager';
import { useMusic } from '@/contexts/MusicContext';
import { enterAdAudioSession, exitAdAudioSession } from '@/lib/audioSession';

export function useInterstitialAd() {
  const { pauseMusic, restartMusicFromTop } = useMusic();
  const musicRef = useRef({ pauseMusic, restartMusicFromTop });
  musicRef.current = { pauseMusic, restartMusicFromTop };

  // iOS only: pause the soundtrack + force the silent-switch-respecting Ambient
  // category before the ad shows, and restore + restart from the top when it's
  // gone. Android ads are globally muted, so there's nothing to juggle there.
  // Everything is wrapped so an audio hiccup can never block showing the ad.
  const beginAdAudio = () => {
    if (Platform.OS !== 'ios') return;
    try { musicRef.current.pauseMusic(); enterAdAudioSession(); } catch {}
  };
  const endAdAudio = () => {
    if (Platform.OS !== 'ios') return;
    try { exitAdAudioSession(); musicRef.current.restartMusicFromTop(); } catch {}
  };
  const adAudioRef = useRef({ beginAdAudio, endAdAudio });
  adAudioRef.current = { beginAdAudio, endAdAudio };

  useEffect(() => {
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => { ad.load(); });
    // Restore audio + restart the soundtrack when the ad closes, however it was
    // dismissed (X, back, or returning from a click-through then closing). This
    // is the single source of truth for the success path; the show() catch
    // below covers the ad never appearing.
    const unsubClosed = Platform.OS === 'ios'
      ? ad.addAdEventListener(AdEventType.CLOSED, () => adAudioRef.current.endAdAudio())
      : null;
    if (adsReady && !ad.loaded) ad.load();
    return () => { unsubError(); unsubClosed?.(); };
  }, []);

  // Shows interstitial if ready; if not, proceeds immediately (no fallback ad needed).
  const showInterstitial = useCallback((onDone: () => void) => {
    if (!ad.loaded) { onDone(); return; }
    const unsub = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsub();
      ad.load();
      onDone();
    });
    adAudioRef.current.beginAdAudio();
    ad.show().catch(() => {
      unsub();
      // Ad never presented — undo the audio changes so nothing is stranded.
      adAudioRef.current.endAdAudio();
      onDone();
    });
  }, []);

  return { showInterstitial };
}
