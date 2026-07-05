import React, { useEffect, useRef } from 'react';
import { TextStyle, StyleProp, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useMusic } from '@/contexts/MusicContext';

interface Props {
  children: string;
  style?: StyleProp<TextStyle>;
  // Gate on/off — e.g. the Home screen pauses this while a game is active.
  active?: boolean;
}

const FLIP_DURATION_MS = 200;

export default function SpinningLabel({ children, style, active = true }: Props) {
  const { bpm, musicLoopStartedAt } = useMusic();
  const rotation = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!active) {
      rotation.value = 0;
      return;
    }
    // A full vertical flip every 2 whole notes (8 beats) at the current
    // track's BPM, with the flip itself taking a fixed 200ms. Anchored to
    // the CURRENT audio loop's start timestamp (re-anchored every wrap by
    // MusicContext) so animation-vs-audio drift can't accumulate — the
    // track's real loop length runs slightly longer than its nominal beat
    // grid, which used to desync the flip over long sessions. When no music
    // is playing (musicLoopStartedAt 0), free-runs from now.
    const wholeNoteMs = (60000 / bpm) * 4;
    const cycleMs = wholeNoteMs * 2;
    const startTime = musicLoopStartedAt || Date.now();
    let cycleCount = Math.max(0, Math.floor((Date.now() - startTime) / cycleMs));

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
  }, [active, bpm, musicLoopStartedAt]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 800 }, { rotateX: `${rotation.value}deg` }],
  }));

  return <Animated.Text style={[StyleSheet.flatten(style), animatedStyle]}>{children}</Animated.Text>;
}
