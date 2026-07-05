import React, { useEffect, useRef } from 'react';
import { TextStyle, StyleProp, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useMusic } from '@/contexts/MusicContext';

interface Props {
  children: string;
  style?: StyleProp<TextStyle>;
  // Gate on/off — e.g. the Home screen pauses this while a game is active.
  active?: boolean;
  // Overrides the default musicSyncEpoch-based reset trigger — e.g. the Home
  // screen passes the track's next natural loop-around after a game, so the
  // flip restarts fresh there instead of wherever it happened to be paused.
  epoch?: number;
}

const FLIP_DURATION_MS = 200;

export default function SpinningLabel({ children, style, active = true, epoch }: Props) {
  const { bpm, musicSyncEpoch } = useMusic();
  const resetKey = epoch ?? musicSyncEpoch;
  const rotation = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      rotation.value = 0;
      return;
    }
    // A full vertical flip every 2 whole notes (8 beats) at the current
    // track's BPM, with the flip itself taking a fixed 200ms. Each cycle is
    // scheduled against the absolute start time (startTime + n * cycleMs)
    // rather than chained relative delays, so per-frame timing slop can't
    // accumulate into audible/visible drift over a long session. Restarting
    // on resetKey keeps it locked whenever the track itself restarts from
    // position 0, or the Home screen forces a fresh reset point.
    const wholeNoteMs = (60000 / bpm) * 4;
    const cycleMs = wholeNoteMs * 2;
    const startTime = Date.now();
    let cycleCount = 0;

    // Restarting this effect (bpm or musicSyncEpoch change) can land mid-flip.
    // Assigning a plain number cancels any in-flight withTiming animation and
    // snaps immediately, so a leftover fractional angle never becomes the new
    // "resting" baseline that every subsequent +360 flip is stacked on top of.
    rotation.value = 0;

    const scheduleNext = () => {
      cycleCount++;
      const targetTime = startTime + cycleCount * cycleMs - FLIP_DURATION_MS;
      const delay = Math.max(0, targetTime - Date.now());
      timerRef.current = setTimeout(() => {
        rotation.value = withTiming(
          rotation.value + 360,
          { duration: FLIP_DURATION_MS, easing: Easing.inOut(Easing.quad) },
        );
        scheduleNext();
      }, delay);
    };
    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, bpm, resetKey]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateX: `${rotation.value}deg` }],
  }));

  return <Animated.Text style={[StyleSheet.flatten(style), animatedStyle]}>{children}</Animated.Text>;
}
