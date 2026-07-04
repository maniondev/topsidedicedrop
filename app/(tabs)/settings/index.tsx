import React, { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound, SoundPackMeta } from '@/contexts/SoundContext';
import { useAnimation, AnimPackMeta } from '@/contexts/AnimationContext';
import { useDiceStyle, DiceStyleMeta } from '@/contexts/DiceStyleContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useStats } from '@/contexts/StatsContext';
import { loadStats, saveStats, CONTROLS_SEEN_KEY } from '@/lib/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PremiumModal from '@/components/PremiumModal';
import { ThemeMeta } from '@/constants/theme';
import { openNativeReview, getHasRated } from '@/lib/reviewPrompt';
import { Section, RowItem, ToggleRow, makeSettingsStyles } from '@/components/settings/SettingsShared';
import { getAppIcon, getCurrentAppIconLabel } from '@/lib/appIcon';

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const { colors, themeId } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { soundEnabled, setSoundEnabled, soundPack, soundMode, setSoundMode } = useSound();
  const { animPack, performanceMode, setPerformanceMode, showChainPopups, setShowChainPopups } = useAnimation();
  const { diceStyle } = useDiceStyle();
  const { isPremium, restorePurchases, devToggle } = usePremium();
  const { resetStats, refresh } = useStats();
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [hasRated, setHasRatedState] = useState(false);
  const [, forceIconLabelRefresh] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    getHasRated().then(setHasRatedState);
    getAppIcon().then(() => forceIconLabelRefresh(n => n + 1));
  }, []));

  const handleUpgrade = () => setPremiumModalOpen(true);

  const boostStatsForScreenshots = async () => {
    const stats = await loadStats();
    const DAY = 24 * 60 * 60 * 1000;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    // Set medium best scores
    stats.byDifficulty.medium.bestScore = 12294;
    stats.byDifficulty.medium.bestUnassisted = 4174;
    stats.byDifficulty.medium.totalRuns = Math.max(stats.byDifficulty.medium.totalRuns, 47);
    stats.byDifficulty.medium.lifetimeScore = Math.max(stats.byDifficulty.medium.lifetimeScore, 189430);
    // Inject 17 consecutive daily runs (one per day) for streak
    const existingDays = new Set(stats.recentRuns.map(r => {
      const d = new Date(r.date); d.setHours(0, 0, 0, 0); return d.getTime();
    }));
    const fakeRuns = [];
    for (let i = 0; i < 17; i++) {
      const day = today.getTime() - i * DAY;
      if (!existingDays.has(day)) {
        fakeRuns.push({ score: Math.floor(800 + Math.random() * 3000), date: day + 10 * 60 * 1000, bestChain: Math.floor(1 + Math.random() * 5), difficulty: 'medium' as const, usedContinue: false });
      }
    }
    stats.recentRuns = [...fakeRuns, ...stats.recentRuns].slice(0, 100);
    await saveStats(stats);
    await refresh();
    Alert.alert('Done', 'Stats boosted for screenshots!');
  };

  const confirmReset = () => {
    Alert.alert(
      'Reset Stats?',
      'This permanently erases your local stats and removes your scores from the global leaderboard. This cannot be undone.',
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
              <Text style={[styles.premiumTitle, { color: colors.premiumGold }]}>Premium Active</Text>
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
              label="⚙️ Dev: Reset Controls Tutorial"
              onPress={() => AsyncStorage.removeItem(CONTROLS_SEEN_KEY)}
              colors={colors}
              styles={styles}
            />
          )}
          {__DEV__ && (
            <RowItem
              label="⚙️ Dev: Boost Stats (screenshots)"
              onPress={boostStatsForScreenshots}
              colors={colors}
              styles={styles}
            />
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

        {/* Sound */}
        <Section label="Sound" styles={styles}>
          <ToggleRow
            label="Sound Effects"
            value={soundEnabled}
            onValueChange={setSoundEnabled}
            colors={colors}
            styles={styles}
          />
          {soundEnabled && (
            <ToggleRow
              label="Break Through Silent Mode"
              sublabel="May pause streaming music"
              value={soundMode === 'playback'}
              onValueChange={v => setSoundMode(v ? 'playback' : 'ambient')}
              colors={colors}
              styles={styles}
            />
          )}
        </Section>

        {/* ── Customize ── */}
        <View style={styles.customizeHeader}>
          <Text style={styles.customizeTitle}>Customize</Text>
          {!isPremium && (
            <TouchableOpacity onPress={handleUpgrade} style={[styles.premiumPill, { backgroundColor: colors.premiumGold }]}>
              <Ionicons name="star" size={10} color="#fff" />
              <Text style={styles.premiumPillText}>Premium</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionCard}>
            <RowItem label="Theme" value={ThemeMeta[themeId].label} onPress={() => router.push('/settings/theme')} colors={colors} styles={styles} />
            <RowItem label="Sound Pack" value={SoundPackMeta[soundPack].label} onPress={() => router.push('/settings/sound-pack')} colors={colors} styles={styles} />
            <RowItem label="Animation Pack" value={AnimPackMeta[animPack].label} onPress={() => router.push('/settings/animation-pack')} colors={colors} styles={styles} />
            <RowItem label="Dice Style" value={DiceStyleMeta[diceStyle].label} onPress={() => router.push('/settings/dice-style')} colors={colors} styles={styles} />
            <RowItem label="App Icon" value={getCurrentAppIconLabel()} onPress={() => router.push('/settings/app-icon')} colors={colors} styles={styles} />
          </View>
        </View>

        {/* Gameplay toggles */}
        <Section label="Gameplay" styles={styles}>
          <ToggleRow
            label="Score Popups"
            value={showChainPopups}
            onValueChange={setShowChainPopups}
            colors={colors}
            styles={styles}
          />
          <ToggleRow
            label="Performance Mode"
            sublabel="Reduces visual effects for smoother gameplay on older devices."
            value={performanceMode}
            onValueChange={v => {
              setPerformanceMode(v);
              if (v) { setSoundEnabled(false); setShowChainPopups(false); }
            }}
            colors={colors}
            styles={styles}
          />
        </Section>

        {/* About */}
        <Section label="About" styles={styles}>
          {hasRated ? (
            <RowItem label="Rated — thank you! ★" colors={colors} styles={styles} />
          ) : (
            <RowItem label="Rate Topside: Dice Drop ★" colors={colors} styles={styles} onPress={openNativeReview} />
          )}
          <RowItem label="More Games by Topside" colors={colors} styles={styles} onPress={() => Linking.openURL('https://topside.games')} />
          <RowItem label="Privacy Policy" colors={colors} styles={styles} onPress={() => Linking.openURL('https://topside.games/dicedrop/privacy')} />
          <RowItem label="Terms of Service" colors={colors} styles={styles} onPress={() => Linking.openURL('https://topside.games/dicedrop/tos')} />
          <RowItem label="Contact" colors={colors} styles={styles} onPress={() => Linking.openURL('https://topside.games/contact')} />
          <RowItem label="Version" value={Constants.expoConfig?.version ?? '—'} colors={colors} styles={styles} />
        </Section>

        {/* Stats */}
        <Section label="Stats" styles={styles}>
          <RowItem label="Reset Stats" onPress={confirmReset} danger colors={colors} styles={styles} />
        </Section>

        <View style={{ height: 8 }} />
      </ScrollView>

      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </View>
  );
}
