import React, { useMemo, useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert, Linking,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound } from '@/contexts/SoundContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useStats } from '@/contexts/StatsContext';
import PremiumModal from '@/components/PremiumModal';
import { ThemeColors, ThemeId, ThemeMeta, THEME_IDS, Themes } from '@/constants/theme';

const FREE_THEMES: ThemeId[] = ['dice', 'light', 'dark'];

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const { colors, themeId, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { soundEnabled, setSoundEnabled } = useSound();
  const { isPremium, upgrade, restorePurchases, devToggle } = usePremium();
  const { resetStats } = useStats();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, []));

  const handleUpgrade = () => setPremiumModalOpen(true);

  const confirmReset = () => {
    Alert.alert(
      'Reset Stats?',
      'This permanently erases your best score, run history, and all stats. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: async () => {
          await resetStats();
          Alert.alert('Stats Reset', 'Your stats have been cleared.');
        }},
      ],
    );
  };

  return (
    <View style={[styles.safe, { paddingTop: top }]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Text style={styles.screenTitle}>Settings</Text>

        {/* Premium */}
        <Section label="Premium" styles={styles}>
          {isPremium ? (
            <View style={styles.premiumActive}>
              <Ionicons name="star" size={20} color={colors.premiumGold} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.premiumTitle, { color: colors.premiumGold }]}>Premium Active</Text>
                <Text style={styles.premiumSub}>All themes · Remove ads · 1 free continue/run</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: colors.premiumGold }]}
              onPress={handleUpgrade}
              activeOpacity={0.85}
            >
              <Ionicons name="star" size={16} color="#fff" />
              <Text style={[styles.upgradeBtnText, { color: '#fff' }]}>Unlock Premium</Text>
            </TouchableOpacity>
          )}
          {!isPremium && (
            <RowItem label="Restore Purchases" onPress={restorePurchases} colors={colors} styles={styles} />
          )}
          {__DEV__ && (
            <RowItem
              label={isPremium ? '⚙️ Dev: Remove Premium' : '⚙️ Dev: Enable Premium'}
              onPress={devToggle}
              danger={isPremium}
              colors={colors}
              styles={styles}
            />
          )}
        </Section>

        {/* Theme */}
        <Section label="Theme" styles={styles}>
          <View style={styles.themeGrid}>
            {THEME_IDS.map(id => (
              <ThemeCard
                key={id}
                id={id}
                selected={themeId === id}
                locked={!isPremium && !FREE_THEMES.includes(id)}
                onSelect={() => {
                  if (!isPremium && !FREE_THEMES.includes(id)) { handleUpgrade(); return; }
                  setTheme(id);
                }}
                colors={colors}
                styles={styles}
              />
            ))}
          </View>
        </Section>

        {/* Sound */}
        <Section label="Sound" styles={styles}>
          <ToggleRow
            label="Sound Effects"
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            colors={colors}
            styles={styles}
          />
        </Section>

        {/* Stats */}
        <Section label="Stats" styles={styles}>
          <RowItem label="Reset Stats" onPress={confirmReset} danger colors={colors} styles={styles} />
        </Section>

        {/* About */}
        <Section label="About" styles={styles}>
          <RowItem label="Privacy Policy" colors={colors} styles={styles} onPress={() => Linking.openURL('https://sites.google.com/view/topsideapp/home')} />
          <RowItem label="Version" value={Constants.expoConfig?.version ?? '—'} colors={colors} styles={styles} />
        </Section>

        <View style={{ height: 40 }} />
      </ScrollView>

      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Section({ label, children, styles }: {
  label: string; children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );
}

function RowItem({ label, value, onPress, danger, colors, styles }: {
  label: string; value?: string; onPress?: () => void; danger?: boolean;
  colors: ThemeColors; styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Text style={[styles.rowLabel, danger && { color: colors.danger }]}>{label}</Text>
      {value ? (
        <Text style={styles.rowValue}>{value}</Text>
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={16} color={danger ? colors.danger : colors.textDim} />
      ) : null}
    </TouchableOpacity>
  );
}

function ToggleRow({ label, value, onValueChange, colors, styles }: {
  label: string; value: boolean; onValueChange: (v: boolean) => void;
  colors: ThemeColors; styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#fff"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

function ThemeCard({ id, selected, locked, onSelect, colors, styles }: {
  id: ThemeId; selected: boolean; locked: boolean; onSelect: () => void;
  colors: ThemeColors; styles: ReturnType<typeof makeStyles>;
}) {
  const meta = ThemeMeta[id];
  const theme = Themes[id];
  const [bg, card, accent] = meta.swatches;

  return (
    <TouchableOpacity
      style={[
        styles.themeCard,
        { backgroundColor: bg },
        selected && { borderColor: colors.accent },
        locked && { opacity: 0.5 },
      ]}
      onPress={onSelect}
      activeOpacity={0.8}
    >
      {/* Mini card preview */}
      <View style={[styles.themeCardInner, { backgroundColor: card }]}>
        <View style={[styles.themeAccentDot, { backgroundColor: accent }]} />
      </View>
      {/* Label row */}
      <View style={styles.themeCardLabel}>
        <Text style={[styles.themeCardName, { color: theme.text }]} numberOfLines={1}>
          {meta.label}
        </Text>
        {locked
          ? <Ionicons name="lock-closed" size={12} color={theme.textDim} />
          : selected && <Ionicons name="checkmark-circle" size={12} color={accent} />
        }
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    safe:           { flex: 1, backgroundColor: c.background },
    content:        { paddingHorizontal: 20, paddingTop: 16 },

    screenTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.5,
      marginBottom: 24,
    },

    section:      { marginBottom: 24 },
    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 1.2,
      marginBottom: 8,
      paddingLeft: 4,
    },
    sectionCard: {
      backgroundColor: c.card,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: 'hidden',
    },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.separator,
      gap: 12,
    },
    rowLabel: {
      flex: 1,
      fontSize: 15,
      color: c.text,
      fontWeight: '500',
    },
    rowValue: {
      fontSize: 14,
      color: c.textSecondary,
      fontWeight: '600',
    },

    premiumActive: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.separator,
    },
    premiumTitle: {
      fontSize: 15,
      fontWeight: '700',
    },
    premiumSub: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },

    upgradeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      paddingVertical: 11,
      paddingHorizontal: 20,
      marginHorizontal: 12,
      marginTop: 12,
      marginBottom: 4,
      justifyContent: 'center',
    },
    upgradeBtnText: {
      fontSize: 13,
      fontWeight: '700',
      letterSpacing: 0.2,
    },

    // Theme picker
    themeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      padding: 12,
    },
    themeCard: {
      width: '30%',
      flexGrow: 1,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      paddingBottom: 8,
    },
    themeCardInner: {
      height: 44,
      margin: 6,
      borderRadius: 8,
      justifyContent: 'center',
      alignItems: 'center',
    },
    themeAccentDot: {
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    themeCardLabel: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
      paddingTop: 2,
      gap: 4,
    },
    themeCardName: {
      fontSize: 11,
      fontWeight: '700',
      flex: 1,
    },
  });
}
