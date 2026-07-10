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
import { preloadAllAds, markAdsInitialized } from '@/lib/adManager';
import { initSessionTracker } from '@/lib/sessionTracker';
import { getPlayerIdentity } from '@/lib/playerIdentity';
import { replayQueue } from '@/lib/scoreQueue';
import { initAppsFlyer } from '@/lib/appsflyer';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { SoundProvider } from '@/contexts/SoundContext';
import { MusicProvider } from '@/contexts/MusicContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { DifficultyProvider } from '@/contexts/DifficultyContext';
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

  // Warm the player identity (Supabase anon session restore — or, on a fresh
  // install, account creation + display-name registration) shortly after
  // launch, once the cold-start crunch has passed. getPlayerIdentity() is
  // memoized, so the first visit to the Stats tab then shows the name
  // instantly instead of "…" while this resolves in view. Fire-and-forget.
  useEffect(() => {
    const t = setTimeout(() => { getPlayerIdentity().catch(() => {}); }, 4000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let preloadTimer: ReturnType<typeof setTimeout> | undefined;
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
      // BOTH platforms: silence ad creatives while no ad is showing. AdMob
      // interactive/video creatives can bleed audio the moment they PRELOAD
      // (before ever being shown) — sometimes minutes later, at full volume,
      // untouchable by our own sound/music toggles since the SDK's players
      // bypass our audio stack entirely. Long documented on Android; observed
      // in the field on iOS too (idle on the home tab, ad audio out of
      // nowhere), so the old iOS carve-out "no such preload bug there" is
      // gone. setAppMuted alone doesn't stop it; setAppVolume(0) is the
      // community mitigation (partial — a few creatives still leak, but it
      // kills most). iOS UNMUTES around an actually-presented ad
      // (enterAdAudioSession/exitAdAudioSession in lib/audioSession.ts) so
      // shown ads keep their sound; Android stays muted even while showing,
      // as before. Muted-at-request can lower video-ad eligibility/eCPM —
      // accepted trade-off vs. phantom ad audio. Muting is policy-compliant.
      mobileAds().setAppMuted(true);
      mobileAds().setAppVolume(0);
      // Preloading the two full-screen ads is deferred out of the launch
      // window (see lib/adManager.ts) — the game screen requests it at first
      // game start; this timer is the fallback for sessions that idle on the
      // home screen, comfortably past the cold-start crunch either way.
      markAdsInitialized();
      preloadTimer = setTimeout(preloadAllAds, 6000);
      replayQueue().catch(() => {});
    })();
    return () => { if (preloadTimer) clearTimeout(preloadTimer); };
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <PremiumProvider>
          <StatsProvider>
            <DifficultyProvider>
              <SoundProvider>
                <MusicProvider>
                  <AnimationProvider>
                    <DiceStyleProvider>
                      <AppShell />
                    </DiceStyleProvider>
                  </AnimationProvider>
                </MusicProvider>
              </SoundProvider>
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
