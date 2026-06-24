import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform, AppState, View } from 'react-native';
import { ReactNode, useEffect } from 'react';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Rubik_700Bold } from '@expo-google-fonts/rubik';
import * as SplashScreen from 'expo-splash-screen';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import mobileAds, { AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import { preloadAllAds } from '@/lib/adManager';
import { replayQueue } from '@/lib/scoreQueue';
import { initAppsFlyer } from '@/lib/appsflyer';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { SoundProvider } from '@/contexts/SoundContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { DifficultyProvider } from '@/contexts/DifficultyContext';
import { GameStatusProvider } from '@/contexts/GameStatusContext';
import { AnimationProvider } from '@/contexts/AnimationContext';
import { DiceStyleProvider } from '@/contexts/DiceStyleContext';

SplashScreen.preventAutoHideAsync();

function IpadConstraint({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  if (!Platform.isPad) return <>{children}</>;
  return (
    <View style={[styles.ipadOuter, { backgroundColor: colors.background }]}>
      <View style={styles.ipadInner}>{children}</View>
    </View>
  );
}

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
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ PlayfairDisplay_700Bold, Fredoka_600SemiBold, Fredoka_700Bold, Rubik_700Bold });

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

      await mobileAds().initialize();
      preloadAllAds();
      replayQueue().catch(() => {});
    })();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <IpadConstraint>
          <PremiumProvider>
            <StatsProvider>
              <DifficultyProvider>
                <GameStatusProvider>
                  <SoundProvider>
                    <AnimationProvider>
                      <DiceStyleProvider>
                        <AppShell />
                      </DiceStyleProvider>
                    </AnimationProvider>
                  </SoundProvider>
                </GameStatusProvider>
              </DifficultyProvider>
            </StatsProvider>
          </PremiumProvider>
        </IpadConstraint>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  ipadOuter: { flex: 1, backgroundColor: '#EDE8DF', alignItems: 'center' },
  ipadInner: { flex: 1, width: 390 },
});
