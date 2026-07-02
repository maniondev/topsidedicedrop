import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions, Easing } from 'react-native';

const { height: SCREEN_H } = Dimensions.get('window');

// ─── Splash tuning — all JS, edit + reload live (no rebuild needed) ──────────
const BG_COLOR = '#EDE8DF';     // must match the native splash background for a seamless handoff

const DIE_WIDTH = 180;          // width of the die/trail artwork (px)
const START_Y   = -SCREEN_H * 0.35; // where the die begins, relative to its resting spot (negative = higher up)
const END_Y     = 0;            // resting vertical offset from screen center
const REST_OFFSET_Y = -20;      // nudge the resting position up/down from dead center

const FALL_MS = 950;            // how long the die takes to fall
const HOLD_MS = 220;            // pause at rest before the splash fades
const FADE_MS = 380;            // splash fade-out duration

// Placeholder artwork — swap for the real die+trail export when ready.
// Keep it tall (die near the bottom, trail rising) and set DIE_WIDTH/aspectRatio to match.
const SPLASH_ART = require('@/assets/images/splash-logo.png');
const ART_ASPECT = 1;           // width / height of the artwork; update when real art lands

interface Props {
  onFinish: () => void;
}

/**
 * JS-driven launch splash. Renders a cream backdrop matching the native splash,
 * drops the die in, holds, then fades out and hands off to the app. Everything
 * here is plain JS/Animated, so position/size/timing can be tuned with a Metro
 * reload — no native rebuild.
 */
export default function AnimatedSplash({ onFinish }: Props) {
  const fall    = useRef(new Animated.Value(0)).current; // 0 → 1 fall progress
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fall,    { toValue: 1, duration: FALL_MS, easing: Easing.in(Easing.quad),  useNativeDriver: true }),
      Animated.delay(HOLD_MS),
      Animated.timing(opacity, { toValue: 0, duration: FADE_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) onFinish(); });
  }, []);

  const translateY = fall.interpolate({
    inputRange: [0, 1],
    outputRange: [START_Y + REST_OFFSET_Y, END_Y + REST_OFFSET_Y],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]} pointerEvents="none">
      <Animated.Image
        source={SPLASH_ART}
        resizeMode="contain"
        style={{ width: DIE_WIDTH, height: undefined, aspectRatio: ART_ASPECT, transform: [{ translateY }] }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: BG_COLOR, justifyContent: 'center', alignItems: 'center' },
});
