import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform, AppState } from 'react-native';
import { useEffect } from 'react';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Fredoka_400Regular, Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Rubik_700Bold } from '@expo-google-fonts/rubik';
import * as SplashScreen from 'expo-splash-screen';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import mobileAds, { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import { preloadAllAds } from '@/lib/adManager';
import { initSessionTracker } from '@/lib/sessionTracker';
import { replayQueue } from '@/lib/scoreQueue';
import { initAppsFlyer } from '@/lib/appsflyer';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { SoundProvider } from '@/contexts/SoundContext';
import { MusicProvider } from '@/contexts/MusicContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { DifficultyProvider } from '@/contexts/DifficultyContext';
import { GameStatusProvider } from '@/contexts/GameStatusContext';
import { AnimationProvider } from '@/contexts/AnimationContext';
import { DiceStyleProvider } from '@/contexts/DiceStyleContext';
import LaunchIntroOverlay from '@/components/LaunchIntroOverlay';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const { colors } = useTheme();
  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="game/index"
          options={{ presentation: 'card', animation: 'slide_from_bottom', headerShown: false }}
        />
      </Stack>
      <StatusBar style={colors.statusBar} />
      <LaunchIntroOverlay />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ PlayfairDisplay_700Bold, Fredoka_400Regular, Fredoka_600SemiBold, Fredoka_700Bold, Rubik_700Bold });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    let initialActive = true; // skip the first 'active' event which fires on cold launch
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        if (initialActive) { initialActive = false; return; }
        replayQueue().catch(() => {});
      } else {
        initialActive = false;
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    (async () => {
      if (Platform.OS === 'ios') {
        await new Promise<void>(resolve => setTimeout(resolve, 500));
        await requestTrackingPermissionsAsync();
      }

      try {
        const consentInfo = await AdsConsent.requestInfoUpdate();
        if (
          consentInfo.isConsentFormAvailable &&
          consentInfo.status === AdsConsentStatus.REQUIRED
        ) {
          await AdsConsent.showForm();
        }
      } catch (e) {
        console.warn('UMP consent error:', e);
      }

      initAppsFlyer();
      initSessionTracker();

      await mobileAds().initialize();
      preloadAllAds();
      replayQueue().catch(() => {});
    })();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <PremiumProvider>
          <StatsProvider>
            <DifficultyProvider>
              <GameStatusProvider>
                <SoundProvider>
                  <MusicProvider>
                    <AnimationProvider>
                      <DiceStyleProvider>
                        <AppShell />
                      </DiceStyleProvider>
                    </AnimationProvider>
                  </MusicProvider>
                </SoundProvider>
              </GameStatusProvider>
            </DifficultyProvider>
          </StatsProvider>
        </PremiumProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
