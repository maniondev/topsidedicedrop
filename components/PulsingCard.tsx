import React, { useEffect, useRef } from 'react';
import { ViewStyle, StyleProp, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withTiming, Easing } from 'react-native-reanimated';
import { useMusic } from '@/contexts/MusicContext';

interface Props {
  // This card's slot (0-3) within the 4-beat bar it pulses on.
  beatIndex: number;
  // Reset point for the beat grid — pass musicSyncStartedAt normally, or an
  // override (e.g. the track's next natural loop-around) to give this pulse
  // a fresh, predictable restart point instead of reusing an old one.
  epoch: number;
  active: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

const PULSE_SCALE = 1.05;

export default function PulsingCard({ beatIndex, epoch, active, style, children }: Props) {
  const { bpm } = useMusic();
  const scale = useSharedValue(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active || !epoch) {
      scale.value = 1;
      return;
    }
    const quarterNoteMs = 60000 / bpm;
    const barMs = quarterNoteMs * 4;
    const attackMs = quarterNoteMs * 0.35;
    const decayMs = quarterNoteMs * 0.35;
    // Anchored to epoch (not to when this pulse turns on), so the first
    // pulse lands on-grid instead of at an arbitrary offset.
    let cycleCount = Math.max(
      0,
      Math.ceil((Date.now() - epoch - beatIndex * quarterNoteMs - attackMs) / barMs),
    );

    const scheduleNext = () => {
      const beatTime = epoch + cycleCount * barMs + beatIndex * quarterNoteMs;
      // Start the growth early enough that the peak (not the start of the
      // motion) lands exactly on the beat.
      const delay = Math.max(0, beatTime - attackMs - Date.now());
      timerRef.current = setTimeout(() => {
        scale.value = withSequence(
          withTiming(PULSE_SCALE, { duration: attackMs, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: decayMs, easing: Easing.in(Easing.quad) }),
        );
        cycleCount++;
        scheduleNext();
      }, delay);
    };
    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, beatIndex, bpm, epoch]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // style is often already an array from the caller (e.g. [styles.card, {...}]);
  // flattening avoids handing Reanimated a nested array, which can silently
  // drop the static layout styles (flex, width) inside it.
  return <Animated.View style={[StyleSheet.flatten(style), animatedStyle]}>{children}</Animated.View>;
}
