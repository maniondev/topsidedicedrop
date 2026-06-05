import React, { useEffect, useRef } from 'react';
import { AdEventType } from 'react-native-google-mobile-ads';
import { interstitialAd as interstitial } from '@/lib/adManager';
import { refundAdSlot } from '@/lib/adCounter';
import { restoreGameAudioSession } from '@/lib/audioSession';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function AdInterstitial({ visible, onClose }: Props) {
  const showingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!visible) return;

    if (interstitial.loaded) {
      showingRef.current = true;

      const unsubClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        showingRef.current = false;
        unsubClosed();
        unsubError();
        restoreGameAudioSession();
        onCloseRef.current();
        interstitial.load();
      });

      const unsubError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
        showingRef.current = false;
        unsubClosed();
        unsubError();
        restoreGameAudioSession();
        onCloseRef.current();
        interstitial.load();
      });

      interstitial.show().catch(() => {
        showingRef.current = false;
        unsubClosed();
        unsubError();
        onCloseRef.current();
        interstitial.load();
      });

      return () => {
        unsubClosed();
        unsubError();
        if (showingRef.current) { showingRef.current = false; onCloseRef.current(); }
      };
    } else {
      refundAdSlot();
      onCloseRef.current();
      interstitial.load();
    }
  }, [visible]);

  return null;
}
