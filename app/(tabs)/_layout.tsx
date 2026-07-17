import { Tabs } from 'expo-router';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Dimensions, Platform, View } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { useTheme } from '@/contexts/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ThemeAtmosphere from '@/components/ThemeAtmosphere';

const IS_LARGE = (Platform as any).isPad || Dimensions.get('window').width >= 600;

export default function TabLayout() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom } = useSafeAreaInsets();
  // The game screen stacks ON TOP of the tabs, which stay mounted beneath it
  // — without this gate the atmosphere's per-frame particle worklet + Skia
  // redraw kept running invisibly behind the board for the whole game,
  // stealing frames from gameplay. Suspend the ambient layer (the static
  // gradient stays) whenever the tabs aren't the focused route.
  const focused = useIsFocused();
  const isAndroid = Platform.OS === 'android';
  const bottomPad = isAndroid ? Math.max(bottom, 12) + 16 : Math.max(bottom, 8);

  return (
    // One shared atmosphere layer behind ALL tab scenes (Play / Stats /
    // Settings). The wrapper carries the base background; the atmosphere fills
    // it; scenes and screen roots are transparent so it shows through — full
    // bleed, no per-screen padding seams.
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeAtmosphere showAmbient={focused} />
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
          title: t('tabs.play'),
          tabBarItemStyle: { marginLeft: 20 },
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="dice-5" size={size + 2} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: t('tabs.stats'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="trophy-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('tabs.settings'),
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
