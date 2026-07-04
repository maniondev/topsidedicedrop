import { Stack } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsStackLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { color: colors.text, fontWeight: '700' },
        headerShadowVisible: false,
        headerBackTitle: '',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="theme" options={{ title: 'Theme' }} />
      <Stack.Screen name="sound-pack" options={{ title: 'Sound Pack' }} />
      <Stack.Screen name="animation-pack" options={{ title: 'Animation Pack' }} />
      <Stack.Screen name="dice-style" options={{ title: 'Dice Style' }} />
      <Stack.Screen name="app-icon" options={{ title: 'App Icon' }} />
    </Stack>
  );
}
