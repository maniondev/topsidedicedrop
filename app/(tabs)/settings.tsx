import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, SafeAreaView,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound } from '@/contexts/SoundContext';
import { usePremium } from '@/contexts/PremiumContext';
import AppLogo from '@/components/AppLogo';
import AdBanner from '@/components/AdBanner';
import PremiumModal from '@/components/PremiumModal';
import { ThemeId, ThemeMeta, THEME_IDS } from '@/constants/theme';

export default function SettingsScreen() {
  const { colors, themeId, setTheme } = useTheme();
  const { soundEnabled, setSoundEnabled } = useSound();
  const { isPremium, restorePurchases } = usePremium();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <AppLogo size={28} />
        <Text style={[styles.title, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Settings
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Premium */}
        {!isPremium && (
          <TouchableOpacity
            style={[styles.premiumBanner, { backgroundColor: colors.premiumBg, borderColor: colors.premiumGold }]}
            onPress={() => setPremiumModalOpen(true)}
          >
            <Text style={[styles.premiumTitle, { color: colors.premiumGold }]}>⭐ Go Premium</Text>
            <Text style={[styles.premiumSub, { color: colors.textSecondary }]}>
              Remove ads · Unlimited undos · Reroll pieces
            </Text>
          </TouchableOpacity>
        )}

        {isPremium && (
          <View style={[styles.premiumBanner, { backgroundColor: colors.premiumBg, borderColor: colors.premiumGold }]}>
            <Text style={[styles.premiumTitle, { color: colors.premiumGold }]}>⭐ Premium Active</Text>
            <Text style={[styles.premiumSub, { color: colors.textSecondary }]}>Thanks for your support!</Text>
          </View>
        )}

        {/* Theme */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
          <View style={styles.themeGrid}>
            {THEME_IDS.map(id => {
              const meta = ThemeMeta[id];
              const active = id === themeId;
              return (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.themeBtn,
                    { borderColor: active ? colors.accent : colors.border },
                  ]}
                  onPress={() => setTheme(id as ThemeId)}
                >
                  <View style={styles.swatches}>
                    {meta.swatches.map((s, i) => (
                      <View key={i} style={[styles.swatch, { backgroundColor: s }]} />
                    ))}
                  </View>
                  <Text style={[styles.themeLabel, { color: active ? colors.accent : colors.textSecondary }]}>
                    {meta.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Sound */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>Sound Effects</Text>
            <Switch
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              trackColor={{ true: colors.accent, false: colors.border }}
            />
          </View>
        </View>

        {/* Restore */}
        {!isPremium && (
          <TouchableOpacity
            style={[styles.section, styles.restoreBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={restorePurchases}
          >
            <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>Restore Purchase</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <AdBanner />

      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  title: { fontSize: 22 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  section: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 16 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeBtn: {
    borderRadius: 10, borderWidth: 2,
    paddingVertical: 8, paddingHorizontal: 10,
    alignItems: 'center', gap: 4, minWidth: 74,
  },
  swatches: { flexDirection: 'row', gap: 3 },
  swatch: { width: 14, height: 14, borderRadius: 7 },
  themeLabel: { fontSize: 11, fontWeight: '600' },
  premiumBanner: {
    borderRadius: 14, borderWidth: 2,
    padding: 16, gap: 4, alignItems: 'center',
  },
  premiumTitle: { fontSize: 18, fontWeight: '700' },
  premiumSub: { fontSize: 13, textAlign: 'center' },
  restoreBtn: { alignItems: 'center' },
});
