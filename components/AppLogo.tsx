import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming, Easing } from 'react-native-reanimated';
import Logo from '@/assets/images/logo.svg';
import { useMusic } from '@/contexts/MusicContext';

interface Props {
  size?: number;
  animated?: boolean;
}

const SWING_DEG = 4;

export default function AppLogo({ size = 48, animated = false }: Props) {
  const logoSize = Math.round(size * 1.25);
  const { bpm, musicSyncStartedAt, musicLoopStartedAt } = useMusic();
  // Anchor to the current audio loop's start (re-anchored every wrap) so
  // sway-vs-audio drift can't accumulate; falls back to the track's
  // original start if the loop duration was unavailable.
  const anchorTs = musicLoopStartedAt || musicSyncStartedAt;
  const rotation = useSharedValue(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }

    if (!animated) {
      rotation.value = 0;
      return;
    }

    const quarterNoteMs = 60000 / bpm;
    const halfNoteMs = quarterNoteMs * 2;
    const barMs = quarterNoteMs * 4;
    rotation.value = 0;

    const startSwing = () => {
      // Each direction of the swing takes a half note (2 beats) at the
      // current track's BPM, so the motion reads as in-time with the music.
      // Starting from center and ramping to the first extreme over just a
      // quarter note puts the far-left/far-right hits on beats 2 and 4
      // instead of 1 and 3.
      rotation.value = withSequence(
        withTiming(1, { duration: quarterNoteMs, easing: Easing.inOut(Easing.sin) }),
        withRepeat(
          withSequence(
            withTiming(-1, { duration: halfNoteMs, easing: Easing.inOut(Easing.sin) }),
            withTiming(1, { duration: halfNoteMs, easing: Easing.inOut(Easing.sin) }),
          ),
          -1,
        ),
      );
    };

    if (!anchorTs) {
      // No known track start yet (e.g. music disabled) — just start now.
      startSwing();
      return;
    }

    // Anchored to the current loop's start rather than to whenever this
    // effect happens to fire — that gap (React render/effect scheduling)
    // was enough to visibly drift the swing off the beat grid. Delaying to
    // the next real bar boundary before kicking off the (otherwise
    // identical) sequence fixes it; once started, the sequence's own fixed
    // durations keep it locked until the next loop wrap re-runs this.
    const now = Date.now();
    // The loop-wrap re-run lands a few ms AFTER the boundary — treat
    // "just past a boundary" as that boundary rather than freezing at
    // center for a whole extra bar waiting for the next one.
    const k = Math.max(0, Math.ceil((now - anchorTs - 150) / barMs));
    const nextBarBoundary = anchorTs + k * barMs;
    const delay = Math.max(0, nextBarBoundary - now);
    timerRef.current = setTimeout(startSwing, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [animated, bpm, anchorTs]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * SWING_DEG}deg` }],
    transformOrigin: ['50%', '0%', 0],
  }));

  return (
    <View style={{ width: logoSize, height: logoSize, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={animated ? animatedStyle : undefined}>
        <Logo width={logoSize} height={logoSize} />
      </Animated.View>
    </View>
  );
}
