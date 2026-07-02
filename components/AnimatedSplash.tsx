import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Dimensions, Easing } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Splash tuning — all JS, edit + reload live (no rebuild needed) ──────────
const BG_COLOR = '#EDE8DF';     // must match the native splash background for a seamless handoff

// Which trail length to show: 'short' | 'med' | 'long'
const TAIL: 'short' | 'med' | 'long' = 'med';
const ART = {
  short: require('@/assets/images/splash/tail-short.png'),
  med:   require('@/assets/images/splash/tail-med.png'),
  long:  require('@/assets/images/splash/tail-long.png'),
};

// Artwork is 1440 x 3200 (full-screen composition, die in the lower third).
const ART_W = 1440;
const ART_H = 3200;
const ART_DISPLAY_W = SCREEN_W;                    // render full screen width
const ART_DISPLAY_H = SCREEN_W * (ART_H / ART_W);  // preserve aspect (taller than the screen)

// Where the die sits within the artwork (fraction of art height, 0 = top, 1 = bottom).
// Tune this to line the die up if it rests too high/low.
const DIE_ART_FRAC = 0.80;
// Where the die should REST on screen (fraction of screen height).
const DIE_SCREEN_FRAC = 0.52;
// How far the die falls, as a fraction of screen height.
const FALL_FRAC = 0.28;

const FALL_MS = 950;            // fall duration
const HOLD_MS = 220;            // pause at rest before fade
const FADE_MS = 380;            // splash fade-out

// Vertical position (image top) so the die lands at DIE_SCREEN_FRAC when at rest.
const REST_TOP  = DIE_SCREEN_FRAC * SCREEN_H - DIE_ART_FRAC * ART_DISPLAY_H;
const START_TOP = REST_TOP - FALL_FRAC * SCREEN_H;   // start higher, then slide down

interface Props {
  onFinish: () => void;
}

/**
 * JS-driven launch splash. Cream backdrop (matching the native splash) with the
 * die + trail sliding down into place, a brief hold, then a fade-out that hands
 * off to the app. Position/size/timing/tail are all JS constants above — tune
 * them with a Metro reload, no native rebuild.
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
    outputRange: [START_TOP, REST_TOP],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]} pointerEvents="none">
      <Animated.Image
        source={ART[TAIL]}
        resizeMode="contain"
        style={{
          position: 'absolute',
          width: ART_DISPLAY_W,
          height: ART_DISPLAY_H,
          left: 0,
          transform: [{ translateY }],
        }}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: BG_COLOR },
});
