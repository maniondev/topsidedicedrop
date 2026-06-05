import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound } from '@/contexts/SoundContext';
import { usePremium } from '@/contexts/PremiumContext';
import AdBanner from '@/components/AdBanner';
import PremiumModal from '@/components/PremiumModal';
import { ThemeId, ThemeMeta, THEME_IDS } from '@/constants/theme';

const FREE_THEME: ThemeId = 'dice';

export default function SettingsScreen() {
  const { colors, themeId, setTheme } = useTheme();
  const { soundEnabled, setSoundEnabled } = useSound();
  const { isPremium, upgrade, restorePurchases, devToggle } = usePremium();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Premium banner */}
        {!isPremium ? (
          <TouchableOpacity
            style={[styles.premiumBanner, { backgroundColor: colors.premiumBg, borderColor: colors.premiumGold }]}
            onPress={() => setPremiumModalOpen(true)}
          >
            <Text style={[styles.premiumTitle, { color: colors.premiumGold }]}>⭐ Go Premium</Text>
            <Text style={[styles.premiumSub, { color: colors.textSecondary }]}>
              Remove ads · All themes · 1 free continue/run
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.premiumBanner, { backgroundColor: colors.premiumBg, borderColor: colors.premiumGold }]}>
            <Text style={[styles.premiumTitle, { color: colors.premiumGold }]}>⭐ Premium Active</Text>
            <Text style={[styles.premiumSub, { color: colors.textSecondary }]}>Thanks for your support!</Text>
          </View>
        )}

        {/* Theme — locked for free users */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
            {!isPremium && (
              <View style={styles.premiumTag}>
                <Ionicons name="star" size={10} color={colors.premiumGold} />
                <Text style={[styles.premiumTagText, { color: colors.premiumGold }]}>Premium</Text>
              </View>
            )}
          </View>
          <View style={styles.themeGrid}>
            {THEME_IDS.map(id => {
              const meta    = ThemeMeta[id];
              const active  = id === themeId;
              const locked  = !isPremium && id !== FREE_THEME;
              return (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.themeBtn,
                    { borderColor: active ? colors.accent : colors.border },
                    locked && styles.themeBtnLocked,
                  ]}
                  onPress={() => {
                    if (locked) { setPremiumModalOpen(true); return; }
                    setTheme(id as ThemeId);
                  }}
                >
                  <View style={styles.swatches}>
                    {meta.swatches.map((s, i) => (
                      <View key={i} style={[styles.swatch, { backgroundColor: s, opacity: locked ? 0.4 : 1 }]} />
                    ))}
                  </View>
                  <Text style={[styles.themeLabel, {
                    color: locked ? colors.textMuted : active ? colors.accent : colors.textSecondary,
                  }]}>
                    {meta.label}
                  </Text>
                  {locked && (
                    <Ionicons name="lock-closed" size={10} color={colors.textMuted} style={styles.lockIcon} />
                  )}
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

        {/* DEV ONLY: premium toggle */}
        {__DEV__ && (
          <TouchableOpacity
            style={[styles.devBtn, { borderColor: '#FF6B00' }]}
            onPress={devToggle}
          >
            <Text style={[styles.devBtnText, { color: '#FF6B00' }]}>
              DEV: {isPremium ? '⭐ Premium ON — tap to disable' : '○ Premium OFF — tap to enable'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {!isPremium && <AdBanner />}

      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  title:          { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  content:        { padding: 20, gap: 16, paddingBottom: 40 },
  section:        { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle:   { fontSize: 15, fontWeight: '700' },
  sectionTitleRow:{ flexDirection: 'row', alignItems: 'center', gap: 8 },
  premiumTag:     { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'transparent' },
  premiumTagText: { fontSize: 10, fontWeight: '700' },
  row:            { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel:       { fontSize: 16 },
  themeGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  themeBtn:       { borderRadius: 10, borderWidth: 2, paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', gap: 4, minWidth: 74 },
  themeBtnLocked: { opacity: 0.7 },
  swatches:       { flexDirection: 'row', gap: 3 },
  swatch:         { width: 14, height: 14, borderRadius: 7 },
  themeLabel:     { fontSize: 11, fontWeight: '600' },
  lockIcon:       { position: 'absolute', top: 4, right: 4 },
  premiumBanner:  { borderRadius: 14, borderWidth: 2, padding: 16, gap: 4, alignItems: 'center' },
  premiumTitle:   { fontSize: 18, fontWeight: '700' },
  premiumSub:     { fontSize: 13, textAlign: 'center' },
  restoreBtn:     { alignItems: 'center' },
  devBtn:         { borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', padding: 12, alignItems: 'center' },
  devBtnText:     { fontSize: 13, fontWeight: '600' },
});
