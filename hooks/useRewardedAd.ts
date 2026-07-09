import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import { RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { rewardedAd as ad, adsReady } from '@/lib/adManager';
import { restoreGameAudioSession, enterAdAudioSession, exitAdAudioSession } from '@/lib/audioSession';
import { useMusic } from '@/contexts/MusicContext';

export function useRewardedAd(onRewarded: () => void) {
  const [adLoaded, setAdLoaded] = useState(ad.loaded);
  const callbackRef = useRef(onRewarded);
  callbackRef.current = onRewarded;

  // iOS only: rewarded ads play with audio (Android ads are globally muted),
  // so pause the (ducked) soundtrack + force silent-respecting Ambient before
  // the ad shows, and restore + restart from the top when it's gone. Held in a
  // ref so the listener setup stays one-time. All calls are wrapped so an
  // audio hiccup can never block showing the ad or granting the reward.
  const { pauseMusic, restartMusicFromTop } = useMusic();
  const musicRef = useRef({ pauseMusic, restartMusicFromTop });
  musicRef.current = { pauseMusic, restartMusicFromTop };

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

  const earnedRef = useRef(false);
  // True from the moment we begin presenting until the ad is fully dismissed —
  // blocks a double-tap from calling show() twice (the 2nd rejects and would
  // run the undo path, tearing down the audio session under the live ad).
  const inFlightRef = useRef(false);
  // Fallback (ad-not-loaded) wait: timer + the transient LOADED listener, so
  // both can be cleaned up on a new attempt or unmount (they used to leak).
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackUnsubRef = useRef<(() => void) | null>(null);
  // Exponential backoff so a no-fill / offline device doesn't tight-loop
  // load→fail→load for the whole session.
  const retryRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelFallback = () => {
    if (fallbackTimerRef.current) { clearTimeout(fallbackTimerRef.current); fallbackTimerRef.current = null; }
    fallbackUnsubRef.current?.();
    fallbackUnsubRef.current = null;
  };
  const scheduleReload = () => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    const delay = Math.min(60000, 1000 * 2 ** retryRef.current); // 1s, 2s, 4s … cap 60s
    retryRef.current += 1;
    retryTimerRef.current = setTimeout(() => { ad.load(); }, delay);
  };

  useEffect(() => {
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      retryRef.current = 0; // success resets backoff
      setAdLoaded(true);
    });

    // Just FLAG the reward here — do NOT run game logic yet. EARNED_REWARD fires
    // while the ad is still on screen (app backgrounded); starting the condense
    // now schedules timers/animations against a suspended UI thread and freezes.
    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earnedRef.current = true;
    });

    // Fire the reward callback ONLY after the ad is fully dismissed and the app
    // is back in the foreground — so the resulting animations/timers run cleanly.
    // This CLOSED handler is the single source of truth for restoring audio,
    // no matter HOW the ad was dismissed (X, back, click-through return then close).
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      inFlightRef.current = false;
      if (Platform.OS === 'ios') adAudioRef.current.endAdAudio();
      else restoreGameAudioSession();
      setAdLoaded(false);
      ad.load();
      if (earnedRef.current) {
        earnedRef.current = false;
        // Defer one tick so the native ad activity is fully torn down first.
        setTimeout(() => callbackRef.current(), 0);
      }
    });

    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => {
      earnedRef.current = false;
      inFlightRef.current = false;
      setAdLoaded(false);
      scheduleReload();
    });

    if (adsReady && !ad.loaded) ad.load();

    return () => {
      unsubLoaded(); unsubEarned(); unsubClosed(); unsubError();
      cancelFallback();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, []);

  // If the ad isn't ready, trigger a load and wait up to 1.5s; if it loads in
  // time we show it, otherwise grant the reward for free so the player is never
  // stuck on a broken ad.
  const showAdWithFallback = useCallback(() => {
    if (inFlightRef.current) return; // guard against double-taps

    const begin = () => { inFlightRef.current = true; adAudioRef.current.beginAdAudio(); };
    const undo = () => { inFlightRef.current = false; adAudioRef.current.endAdAudio(); };

    if (ad.loaded) {
      begin();
      ad.show().catch(() => { undo(); ad.load(); });
      return;
    }

    inFlightRef.current = true; // block re-taps during the wait
    ad.load();
    cancelFallback();
    fallbackTimerRef.current = setTimeout(() => {
      cancelFallback();
      inFlightRef.current = false;
      callbackRef.current(); // grant free — no ad shown, no audio to undo
    }, 1500);
    fallbackUnsubRef.current = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      cancelFallback();
      begin();
      ad.show().catch(() => { undo(); callbackRef.current(); ad.load(); });
    });
  }, []);

  return { adLoaded, showAdWithFallback };
}
