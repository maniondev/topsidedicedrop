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

  // Force our audio state for an ad about to present / just dismissed. iOS-only;
  // Android ads are globally muted so there's nothing to juggle there.
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
  const unsubLoadedRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsubLoaded = ad.addAdEventListener(RewardedAdEventType.LOADED, () => setAdLoaded(true));

    // Just FLAG the reward here — do NOT run game logic yet. EARNED_REWARD fires
    // while the ad is still on screen (app backgrounded); starting the condense
    // now schedules timers/animations against a suspended UI thread and freezes.
    const unsubEarned = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
      earnedRef.current = true;
    });

    // Fire the reward callback ONLY after the ad is fully dismissed and the app
    // is back in the foreground — so the resulting animations/timers run cleanly.
    // This CLOSED handler is the single source of truth for restoring audio,
    // no matter HOW the ad was dismissed (X button, back, click-through return
    // then close). On iOS endAdAudio restores the user's category + restarts
    // music; on Android we only restore the game session.
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
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
      setAdLoaded(false);
      ad.load();
    });

    if (adsReady && !ad.loaded) ad.load();

    return () => { unsubLoaded(); unsubEarned(); unsubClosed(); unsubError(); };
  }, []);

  // If the ad isn't ready, trigger a load and wait up to 1.5s.
  // If it loads in time we show it; otherwise we grant the reward for free
  // so the player is never stuck on a broken ad.
  const showAdWithFallback = useCallback(() => {
    const begin = () => adAudioRef.current.beginAdAudio();
    // Undo audio changes if the ad never actually shows (show() rejected), so
    // we don't strand the music paused or the category on Ambient. CLOSED
    // won't fire in that case.
    const undo = () => adAudioRef.current.endAdAudio();
    if (ad.loaded) {
      begin();
      ad.show().catch(() => { undo(); ad.load(); });
      return;
    }
    ad.load();
    const fallbackTimer = setTimeout(() => {
      // Ad still didn't load — grant reward directly (no ad shown, no audio to undo)
      unsubLoadedRef.current?.();
      callbackRef.current();
    }, 1500);
    // If the ad loads in time, cancel the fallback and show it
    const unsub = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      clearTimeout(fallbackTimer);
      unsub();
      begin();
      ad.show().catch(() => {
        // show() failed after load — undo audio and grant reward anyway
        undo();
        callbackRef.current();
        ad.load();
      });
    });
    unsubLoadedRef.current = unsub;
  }, []);

  return { adLoaded, showAdWithFallback };
}
