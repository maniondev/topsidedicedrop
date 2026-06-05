import { useEffect, useState, useCallback, useRef } from 'react';
import { RewardedAdEventType, AdEventType } from 'react-native-google-mobile-ads';
import { rewardedAd as ad, adsReady } from '@/lib/adManager';
import { restoreGameAudioSession } from '@/lib/audioSession';

export function useRewardedAd(onRewarded: () => void) {
  const [adLoaded, setAdLoaded] = useState(ad.loaded);
  const callbackRef = useRef(onRewarded);
  callbackRef.current = onRewarded;

  useEffect(() => {
    const unsubLoaded  = ad.addAdEventListener(RewardedAdEventType.LOADED, () => setAdLoaded(true));
    const unsubEarned  = ad.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => callbackRef.current());
    const unsubClosed  = ad.addAdEventListener(AdEventType.CLOSED, () => {
      restoreGameAudioSession();
      setAdLoaded(false);
      ad.load();
    });
    const unsubError   = ad.addAdEventListener(AdEventType.ERROR, () => {
      setAdLoaded(false);
      ad.load();
    });

    if (adsReady && !ad.loaded) ad.load();

    return () => { unsubLoaded(); unsubEarned(); unsubClosed(); unsubError(); };
  }, []);

  const showAd = useCallback(() => {
    if (ad.loaded) ad.show().catch(() => { ad.load(); });
  }, []);

  return { adLoaded, showAd };
}
