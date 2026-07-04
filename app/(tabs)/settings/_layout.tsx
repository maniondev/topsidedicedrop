import { Stack, router } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
        animation: 'none',
        headerBackVisible: false,
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.textSecondary} />
            <Text style={{ color: colors.textSecondary, fontSize: 17 }}>Settings</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false, title: 'Settings' }} />
      <Stack.Screen name="theme" options={{ title: 'Theme' }} />
      <Stack.Screen name="sound-pack" options={{ title: 'Sound Pack' }} />
      <Stack.Screen name="animation-pack" options={{ title: 'Animation Pack' }} />
      <Stack.Screen name="dice-style" options={{ title: 'Dice Style' }} />
      <Stack.Screen name="app-icon" options={{ title: 'App Icon' }} />
    </Stack>
  );
}
