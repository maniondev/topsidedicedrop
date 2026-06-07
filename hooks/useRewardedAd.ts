import { useEffect, useState, useCallback, useRef } from 'react';
import { RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { rewardedAd as ad, adsReady } from '@/lib/adManager';
import { restoreGameAudioSession } from '@/lib/audioSession';

export function useRewardedAd(onRewarded: () => void) {
  const [adLoaded, setAdLoaded] = useState(ad.loaded);
  const callbackRef = useRef(onRewarded);
  callbackRef.current = onRewarded;

  // Track whether the reward was earned during the current ad presentation.
  const earnedRef = useRef(false);

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

  const showAd = useCallback(() => {
    if (ad.loaded) {
      ad.show().catch(() => { ad.load(); });
      return true;
    }
    return false; // caller can fall back when no ad is ready
  }, []);

  return { adLoaded, showAd };
}
