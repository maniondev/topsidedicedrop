import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Platform } from 'react-native';
import { useFonts, PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { requestTrackingPermissionsAsync } from 'expo-tracking-transparency';
import mobileAds from 'react-native-google-mobile-ads';
import { preloadAllAds } from '@/lib/adManager';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { PremiumProvider } from '@/contexts/PremiumContext';
import { SoundProvider } from '@/contexts/SoundContext';
import { StatsProvider } from '@/contexts/StatsContext';
import { DifficultyProvider } from '@/contexts/DifficultyContext';

SplashScreen.preventAutoHideAsync();

function AppShell() {
  const { colors } = useTheme();
  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style={colors.statusBar} />
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ PlayfairDisplay_700Bold });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  useEffect(() => {
    (async () => {
      await mobileAds().initialize();
      if (Platform.OS === 'ios') {
        await new Promise<void>(resolve => setTimeout(resolve, 500));
        await requestTrackingPermissionsAsync();
      }
      preloadAllAds();
    })();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider>
        <PremiumProvider>
          <StatsProvider>
            <DifficultyProvider>
              <SoundProvider>
                <AppShell />
              </SoundProvider>
            </DifficultyProvider>
          </StatsProvider>
        </PremiumProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
