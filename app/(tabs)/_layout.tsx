import { Tabs } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Dimensions, Platform, View } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemeAtmosphere from '@/components/ThemeAtmosphere';

const IS_LARGE = (Platform as any).isPad || Dimensions.get('window').width >= 600;

export default function TabLayout() {
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  const isAndroid = Platform.OS === 'android';
  const bottomPad = isAndroid ? Math.max(bottom, 12) + 16 : Math.max(bottom, 8);

  return (
    // One shared atmosphere layer behind ALL tab scenes (Play / Stats /
    // Settings). The wrapper carries the base background; the atmosphere fills
    // it; scenes and screen roots are transparent so it shows through — full
    // bleed, no per-screen padding seams.
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeAtmosphere />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarAllowFontScaling: false,
          // Leaving a tab pops its nested stack back to the root — so returning
          // to Settings lands on the top-level list, not the sub-picker you
          // last opened (Theme / Soundtrack / etc.).
          popToTopOnBlur: true,
          sceneStyle: { backgroundColor: 'transparent' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: IS_LARGE ? 14 : 10,
          paddingBottom: bottomPad,
          height: (IS_LARGE ? 72 : 60) + bottomPad,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: {
          fontSize: IS_LARGE ? 14 : 11,
          fontWeight: '600',
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarIconStyle: IS_LARGE ? { transform: [{ scale: 1.3 }] } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Play',
          tabBarItemStyle: { marginLeft: 20 },
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dice-5" size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarItemStyle: { marginRight: 20 },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
      </Tabs>
    </View>
  );
}
