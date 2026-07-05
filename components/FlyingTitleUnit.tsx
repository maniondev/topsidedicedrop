import React, { useEffect, useRef } from 'react';
import { StyleProp, TextStyle, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing } from 'react-native-reanimated';
import { useMusic } from '@/contexts/MusicContext';

interface Props {
  // This unit's eighth-note slot within the sequence (0-based; can include
  // skipped indices for a silent rest between words).
  index: number;
  // Total eighth-note slots in one direction (out, or in) of the sequence —
  // e.g. 16 slots = 2 bars of "Topside: Dice Drop" flying out, then another
  // 16 slots flying back in.
  totalSlots: number;
  // Reset point for the beat grid — pass musicSyncStartedAt normally, or an
  // override (e.g. the track's next natural loop-around) to give this a
  // fresh, predictable restart point instead of reusing an old one.
  epoch: number;
  active: boolean;
  style?: StyleProp<TextStyle>;
  children: string;
}

const FLY_OFFSET = 26;
// A visual change can only actually appear on the next screen refresh
// (~16ms at 60fps), so an instant cut scheduled for exactly the beat time
// still renders a frame or so late. Firing it this many ms early makes it
// land on (or just ahead of) the beat instead — perceptually reads better
// than lagging behind it. (Tuned by eye on device.)
const EXIT_VISUAL_LEAD_MS = 70;
// Each cycle's timers are armed this far BEFORE the cycle boundary. The
// first unit's exit sits at offset 0, so if arming happened at the boundary
// itself (via a JS timer that's already running late), its withDelay would
// clamp to 0 and the whole visual lead would be eaten — which made the "T"
// consistently cut later than every other letter.
const SCHEDULE_AHEAD_MS = 150;

export default function FlyingTitleUnit({ index, totalSlots, epoch, active, style, children }: Props) {
  const { bpm } = useMusic();
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (!active || !epoch) {
      translateY.value = 0;
      opacity.value = 1;
      return;
    }

    const quarterNoteMs = 60000 / bpm;
    const eighthNoteMs = quarterNoteMs / 2;
    const phaseMs = eighthNoteMs * totalSlots; // one full direction (out, or in)
    const cycleMs = phaseMs * 2; // flying out, then flying back in, forever
    const animMs = eighthNoteMs * 0.5;
    const outOffset = index * eighthNoteMs;
    const inOffset = phaseMs + index * eighthNoteMs;

    // Anchored to epoch so every unit — and the pulse animation sharing the
    // same epoch — stays phase-locked together.
    let cycleCount = Math.max(0, Math.floor((Date.now() - epoch) / cycleMs));

    // (Re)activation can land anywhere in the cycle — set this unit's
    // CURRENT phase-correct state explicitly. A unit whose exit already
    // passed (and whose re-entrance hasn't) must start hidden: the stale
    // exit event below is deliberately skipped, and leaving the unit at
    // rest made it sit visibly frozen while its neighbors vanished (seen
    // on a quick tab-away-and-back mid-exit-phase).
    {
      const tNow = Date.now() - (epoch + cycleCount * cycleMs);
      const hiddenNow = tNow >= outOffset - EXIT_VISUAL_LEAD_MS && tNow < inOffset;
      translateY.value = hiddenNow ? -FLY_OFFSET : 0;
      opacity.value = hiddenNow ? 0 : 1;
    }

    const scheduleCycle = () => {
      const cycleStart = epoch + cycleCount * cycleMs;
      const timers: ReturnType<typeof setTimeout>[] = [];

      // Exit is an instant cut — no fade, no glide — right on the beat, for
      // a hard visual punch. Scheduled via withDelay (UI thread, driven by
      // the native render clock) rather than a JS setTimeout, since a JS
      // timer's own scheduling jitter was making the cut land noticeably
      // late — there's no animation duration left to absorb that slop.
      // Entrance still starts animMs early via JS timer so its snap (with
      // overshoot) *lands* exactly on the beat instead of just starting
      // there — the longer real duration there absorbs typical jitter fine.
      // Events more than a beat in the past are SKIPPED, not fired
      // immediately — activation can land mid-cycle (the tier flip leads
      // its boundary), and replaying a stale cycle's events would flicker
      // every letter at once.
      const skipOlderThanMs = -(60000 / bpm);
      const outTime = cycleStart + outOffset - EXIT_VISUAL_LEAD_MS;
      if (outTime - Date.now() > skipOlderThanMs) {
        const outDelay = Math.max(0, outTime - Date.now());
        translateY.value = withDelay(outDelay, withTiming(-FLY_OFFSET, { duration: 0 }));
        opacity.value = withDelay(outDelay, withTiming(0, { duration: 0 }));
      }

      const inFireTime = cycleStart + inOffset - animMs;
      if (inFireTime - Date.now() > skipOlderThanMs) {
        timers.push(setTimeout(() => {
          translateY.value = withTiming(0, { duration: animMs, easing: Easing.out(Easing.back(1.8)) });
          opacity.value = withTiming(1, { duration: animMs * 0.6, easing: Easing.out(Easing.cubic) });
        }, Math.max(0, inFireTime - Date.now())));
      }

      cycleCount++;
      // Arm the next cycle ahead of its boundary (see SCHEDULE_AHEAD_MS) —
      // safe because all of this cycle's animations finish well before then,
      // and withDelay just holds the resting value until its delay elapses.
      timers.push(setTimeout(scheduleCycle, Math.max(0, cycleStart + cycleMs - SCHEDULE_AHEAD_MS - Date.now())));
      timersRef.current = timers;
    };
    scheduleCycle();

    return () => timersRef.current.forEach(clearTimeout);
  }, [active, index, totalSlots, bpm, epoch]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.Text style={[StyleSheet.flatten(style), animatedStyle]}>{children}</Animated.Text>;
}
