import { useEffect, useCallback } from 'react';
import { AdEventType } from 'react-native-google-mobile-ads';
import { interstitialAd as ad, adsReady } from '@/lib/adManager';

export function useInterstitialAd() {
  useEffect(() => {
    const unsubError = ad.addAdEventListener(AdEventType.ERROR, () => { ad.load(); });
    if (adsReady && !ad.loaded) ad.load();
    return () => { unsubError(); };
  }, []);

  // Shows interstitial if ready; if not, proceeds immediately (no fallback ad needed).
  const showInterstitial = useCallback((onDone: () => void) => {
    if (!ad.loaded) {
      onDone();
      return;
    }
    const unsub = ad.addAdEventListener(AdEventType.CLOSED, () => {
      unsub();
      ad.load();
      onDone();
    });
    ad.show().catch(() => {
      unsub();
      onDone();
    });
  }, []);

  return { showInterstitial };
}
