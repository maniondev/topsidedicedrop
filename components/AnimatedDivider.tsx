import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, withSequence, Easing } from 'react-native-reanimated';
import { useMusic } from '@/contexts/MusicContext';

// The home screen's divider lines, recruited into the idle-tier escalation:
//   'static' — plain 1px line (tiers 0-1, or animations suspended)
//   'comet'  — a bright head-and-tail streak flashes across the line in a
//              single quarter note; the top divider fires left→right on
//              beat 1, the bottom right→left on beat 3, alternating every
//              bar. Pops in fully visible at the near edge the instant the
//              beat hits, thicker than the line itself so it reads as a
//              flash rather than a sliding pixel.
// Linear speed (no easing) for a crisp pass, fired slightly early to absorb
// JS-timer latency (same visual-lead treatment as the title letters). All
// timing anchors to the shared loop epoch so drift can't accumulate.
interface Props {
  mode: 'static' | 'comet';
  // Loop-anchored phase epoch (animPhaseEpoch on the home screen).
  epoch: number;
  color: string;
  accentColor: string;
  direction?: 'ltr' | 'rtl';
  // Which half note of each bar this divider's sweep departs on:
  // 0 = beat 1 (first half), 1 = beat 3 (second half).
  phaseHalf?: 0 | 1;
}

const HEAD_WIDTH = 42;
const TAIL_WIDTH = 68;
const COMET_WIDTH = HEAD_WIDTH + TAIL_WIDTH;
// Render latency compensation: the flash should be visible ON the beat,
// not a frame or two after.
const COMET_LEAD_MS = 40;
// JS timers only ARM each sweep, this far ahead; the precise wait runs on
// the UI-thread clock via withDelay (same pattern as the other beat-synced
// components).
const SCHEDULE_AHEAD_MS = 150;
// When activation lands at/just past a bar boundary (tier flips are timed
// to boundaries), still fire THAT bar's sweep instead of rounding up and
// silently skipping it — which is why tier 2's very first beat had no
// comet on the top divider.
const BOUNDARY_TOLERANCE_MS = 250;

export default function AnimatedDivider({ mode, epoch, color, accentColor, direction = 'ltr', phaseHalf = 0 }: Props) {
  const { bpm } = useMusic();
  const [lineWidth, setLineWidth] = useState(0);
  const cometX = useSharedValue(-COMET_WIDTH);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    cometX.value = -COMET_WIDTH;

    if (mode !== 'comet' || !epoch || lineWidth <= 0) return;
    const quarterNoteMs = 60000 / bpm;
    const halfNoteMs = quarterNoteMs * 2;
    const barMs = quarterNoteMs * 4;

    // Starts fully on-screen at the near edge (visible the instant the
    // beat hits) and travels until fully off the far edge.
    const from = direction === 'ltr' ? 0 : lineWidth - COMET_WIDTH;
    const to = direction === 'ltr' ? lineWidth : -COMET_WIDTH;
    let bar = Math.max(
      0,
      Math.ceil((Date.now() - epoch - phaseHalf * halfNoteMs - BOUNDARY_TOLERANCE_MS) / barMs),
    );
    const scheduleNext = () => {
      const visualStart = epoch + bar * barMs + phaseHalf * halfNoteMs - COMET_LEAD_MS;
      const armDelay = Math.max(0, visualStart - SCHEDULE_AHEAD_MS - Date.now());
      timerRef.current = setTimeout(() => {
        const preciseDelay = Math.max(0, visualStart - Date.now());
        cometX.value = withDelay(
          preciseDelay,
          withSequence(
            withTiming(from, { duration: 0 }),
            withTiming(to, { duration: quarterNoteMs, easing: Easing.linear }),
          ),
        );
        bar++;
        scheduleNext();
      }, armDelay);
    };
    scheduleNext();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [mode, epoch, bpm, direction, phaseHalf, lineWidth]);

  const cometStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: cometX.value }],
  }));

  const isLtr = direction === 'ltr';

  return (
    <View
      style={[styles.line, { backgroundColor: color }]}
      onLayout={e => setLineWidth(e.nativeEvent.layout.width)}
    >
      {mode === 'comet' && (
        <View style={styles.cometTrack} pointerEvents="none">
          <Animated.View style={[styles.cometWrap, cometStyle]}>
            {/* Tail trails behind the head relative to travel direction. */}
            <View
              style={[
                styles.tail,
                { backgroundColor: accentColor },
                isLtr ? { left: 0 } : { right: 0 },
              ]}
            />
            <View
              style={[
                styles.head,
                { backgroundColor: accentColor },
                isLtr ? { right: 0 } : { left: 0 },
              ]}
            />
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { height: 1, width: '100%' },
  // Extends above/below the 1px line so the comet can be thicker than the
  // line while still clipping horizontally at the line's ends.
  cometTrack: { position: 'absolute', left: 0, right: 0, top: -2, bottom: -2, overflow: 'hidden' },
  cometWrap: { position: 'absolute', top: 0, bottom: 0, width: COMET_WIDTH },
  head: { position: 'absolute', top: 0, bottom: 0, width: HEAD_WIDTH, borderRadius: 2.5 },
  tail: { position: 'absolute', top: 1, bottom: 1, width: TAIL_WIDTH, borderRadius: 1.5, opacity: 0.35 },
});
