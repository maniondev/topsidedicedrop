import { useEffect, useState, useCallback, useRef } from 'react';
import { RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { rewardedAd as ad, adsReady } from '@/lib/adManager';
import { restoreGameAudioSession } from '@/lib/audioSession';

export function useRewardedAd(onRewarded: () => void) {
  const [adLoaded, setAdLoaded] = useState(ad.loaded);
  const callbackRef = useRef(onRewarded);
  callbackRef.current = onRewarded;

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
    const unsubClosed = ad.addAdEventListener(AdEventType.CLOSED, () => {
      restoreGameAudioSession();
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
    if (ad.loaded) {
      ad.show().catch(() => { ad.load(); });
      return;
    }
    ad.load();
    const fallbackTimer = setTimeout(() => {
      // Ad still didn't load — grant reward directly
      unsubLoadedRef.current?.();
      callbackRef.current();
    }, 1500);
    // If the ad loads in time, cancel the fallback and show it
    const unsub = ad.addAdEventListener(RewardedAdEventType.LOADED, () => {
      clearTimeout(fallbackTimer);
      unsub();
      ad.show().catch(() => {
        // show() failed after load — grant reward anyway
        callbackRef.current();
        ad.load();
      });
    });
    unsubLoadedRef.current = unsub;
  }, []);

  return { adLoaded, showAd, showAdWithFallback };
}
