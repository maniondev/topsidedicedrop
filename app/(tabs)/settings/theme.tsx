import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { usePremium } from '@/contexts/PremiumContext';
import { ThemeId, THEME_IDS, ThemeMeta, Themes } from '@/constants/theme';
import { makeSettingsStyles, SettingsSubHeader } from '@/components/settings/SettingsShared';
import PremiumModal from '@/components/PremiumModal';

const FREE_THEMES: ThemeId[] = ['dicedrop', 'dice', 'light', 'dark'];

export default function ThemeScreen() {
  const { colors, themeId, setTheme } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { isPremium } = usePremium();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  return (
    <View style={[styles.safe]}>
      <SettingsSubHeader title="Theme" colors={colors} />
      <ScrollView contentContainerStyle={[styles.content, { gap: 10 }]} showsVerticalScrollIndicator={false}>
        {THEME_IDS.map(id => {
          const meta = ThemeMeta[id];
          const theme = Themes[id];
          const selected = themeId === id;
          const locked = !isPremium && !FREE_THEMES.includes(id);
          return (
            <TouchableOpacity
              key={id}
              style={[
                rowStyles.row,
                { backgroundColor: theme.background, borderColor: selected ? theme.accent : theme.border },
                selected && { borderWidth: 2 },
              ]}
              activeOpacity={0.8}
              onPress={() => {
                if (locked) { setPremiumModalOpen(true); return; }
                setTheme(id);
              }}
            >
              <View style={[rowStyles.dot, { backgroundColor: theme.accent }]} />
              <Text style={[rowStyles.label, { color: theme.text }]} numberOfLines={1}>{meta.label}</Text>
              {locked
                ? <Ionicons name="lock-closed" size={18} color={theme.accent} />
                : selected && <Ionicons name="checkmark-circle" size={22} color={theme.accent} />
              }
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, borderWidth: 1, gap: 14 },
  dot:   { width: 26, height: 26, borderRadius: 13 },
  label: { flex: 1, fontSize: 16, fontWeight: '600' },
});
