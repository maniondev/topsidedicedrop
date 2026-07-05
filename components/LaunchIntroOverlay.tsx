import React, { useEffect, useRef } from 'react';
import { View, Image, Animated, StyleSheet, Platform } from 'react-native';
import { useMusic } from '@/contexts/MusicContext';

// Matches the native splash screen exactly (app.json's expo-splash-screen
// config: fixed background + per-platform logo, regardless of selected
// theme, since the native splash can't vary by theme either) — this is a JS
// continuation of it, not a new design, so the handoff is seamless.
const SPLASH_BG = '#1C1008';
const SPLASH_LOGO = Platform.OS === 'android'
  ? require('@/assets/images/splash-logo-android.png')
  : require('@/assets/images/splash-logo.png');
// ~90% of each platform's native splash logo size (iOS imageWidth 400,
// Android 280 in app.json) — deliberately a touch smaller than the splash
// so the handoff reads as a subtle intentional step, not a mismatch.
const LOGO_WIDTH = Platform.OS === 'android' ? 252 : 360;

export default function LaunchIntroOverlay() {
  const { launchIntroActive, launchPlaybackStarted, launchStingerDurationMs } = useMusic();
  const barFill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (launchPlaybackStarted && launchStingerDurationMs) {
      barFill.setValue(0);
      Animated.timing(barFill, {
        toValue: 1,
        duration: launchStingerDurationMs,
        useNativeDriver: false, // animating width, not supported by native driver
      }).start();
    }
  }, [launchPlaybackStarted, launchStingerDurationMs]);

  if (!launchIntroActive) return null;

  return (
    // Blocks touches while visible — otherwise the invisible Home screen
    // underneath is tappable during the intro. Safe to block because two
    // independent safety timeouts guarantee the overlay always clears.
    <View style={styles.container} pointerEvents="auto">
      <Image source={SPLASH_LOGO} resizeMode="contain" style={styles.logo} />
      {launchPlaybackStarted && launchStingerDurationMs ? (
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              { width: barFill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_BG,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
    elevation: 999,
  },
  logo: { width: LOGO_WIDTH, height: LOGO_WIDTH },
  track: {
    position: 'absolute',
    bottom: '18%',
    width: 200,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2.5,
    backgroundColor: '#E5384A', // logo's accent red
  },
});
