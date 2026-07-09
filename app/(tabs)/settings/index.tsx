import React, { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, Alert, Linking } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound, SoundPackMeta } from '@/contexts/SoundContext';
import { useMusic, SoundtrackMeta } from '@/contexts/MusicContext';
import { useAnimation, AnimPackMeta } from '@/contexts/AnimationContext';
import { useDiceStyle, DiceStyleMeta } from '@/contexts/DiceStyleContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useStats } from '@/contexts/StatsContext';
import { CONTROLS_SEEN_KEY, saveGame } from '@/lib/storage';
import { buildDemoSave } from '@/lib/demoBoard';
import { useDifficulty } from '@/contexts/DifficultyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PremiumModal from '@/components/PremiumModal';
import { ThemeMeta } from '@/constants/theme';
import { openNativeReview, getHasRated } from '@/lib/reviewPrompt';
import { Section, RowItem, ToggleRow, makeSettingsStyles } from '@/components/settings/SettingsShared';
import { getAppIcon, getCurrentAppIconLabel, APP_ICON_SUPPORTED } from '@/lib/appIcon';
import { COMPOSER_CREDIT_LABEL, openComposerIG } from '@/lib/composer';

export default function SettingsScreen() {
  const { top } = useSafeAreaInsets();
  const { colors, themeId } = useTheme();
  const styles = useMemo(() => makeSettingsStyles(colors), [colors]);
  const { soundEnabled, setSoundEnabled, soundPack, soundMode, setSoundMode } = useSound();
  const { musicEnabled, setMusicEnabled, soundtrackId } = useMusic();
  const { animPack, performanceMode, setPerformanceMode, showChainPopups, setShowChainPopups } = useAnimation();
  const { diceStyle } = useDiceStyle();
  const { hasCustomization, hasNoAds, restorePurchases, redeemCode, devToggleCustomization, devToggleNoAds } = usePremium();
  const isFullyUnlocked = hasCustomization && hasNoAds;
  const { resetStats } = useStats();
  const { difficulty } = useDifficulty();
  const [devControlsRevealed, setDevControlsRevealed] = useState(false);
  const [premiumModalOpen, setPremiumModalOpen] = useState(false);
  const [hasRated, setHasRatedState] = useState(false);
  const [, forceIconLabelRefresh] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    getHasRated().then(setHasRatedState);
    getAppIcon().then(() => forceIconLabelRefresh(n => n + 1));
  }, []));

  const handleUpgrade = () => setPremiumModalOpen(true);


  // Hidden gesture: tap the "Settings" title 5x, holding the 5th tap for 2s,
  // reveals dev-only controls (Reset Controls Tutorial, Enable/Remove
  // Premium, Include Music toggle) that are otherwise hidden even in dev
  // builds — keeps the Premium section looking like production by default.
  const devTapCountRef = useRef(0);
  const devResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const devHoldTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearDevResetTimer = () => {
    if (devResetTimerRef.current) { clearTimeout(devResetTimerRef.current); devResetTimerRef.current = null; }
  };
  const scheduleDevReset = () => {
    clearDevResetTimer();
    devResetTimerRef.current = setTimeout(() => { devTapCountRef.current = 0; }, 1500);
  };

  const handleTitlePressIn = () => {
    if (devTapCountRef.current === 4) {
      devHoldTimerRef.current = setTimeout(() => {
        devTapCountRef.current = 0;
        clearDevResetTimer();
        setDevControlsRevealed(v => !v);
      }, 2000);
    }
  };

  const handleTitlePressOut = () => {
    if (devHoldTimerRef.current) {
      clearTimeout(devHoldTimerRef.current);
      devHoldTimerRef.current = null;
      if (devTapCountRef.current === 4) {
        devTapCountRef.current = 0;
        clearDevResetTimer();
        return;
      }
    }
    if (devTapCountRef.current < 4) {
      devTapCountRef.current += 1;
      scheduleDevReset();
    }
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

        <Pressable onPressIn={handleTitlePressIn} onPressOut={handleTitlePressOut}>
          <Text style={styles.screenTitle}>Settings</Text>
        </Pressable>

        {/* Premium */}
        <Section label="Premium" styles={styles}>
          {isFullyUnlocked ? (
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
              <Ionicons name="star" size={16} color={colors.accentText} />
              <Text style={[styles.upgradeBtnText, { color: colors.accentText }]}>
                {hasCustomization ? 'Remove All Ads' : hasNoAds ? 'Unlock Customization' : 'Unlock Premium'}
              </Text>
            </TouchableOpacity>
          )}
          {!isFullyUnlocked && (
            <RowItem label="Restore Purchases" onPress={restorePurchases} colors={colors} styles={styles} />
          )}
          {!hasCustomization && (
            <RowItem label="Redeem Code" onPress={redeemCode} colors={colors} styles={styles} />
          )}
          {__DEV__ && devControlsRevealed && (
            <RowItem
              label="⚙️ Dev: Reset Controls Tutorial"
              onPress={() => AsyncStorage.removeItem(CONTROLS_SEEN_KEY)}
              colors={colors}
              styles={styles}
            />
          )}
          {__DEV__ && devControlsRevealed && (
            <RowItem
              label={hasCustomization ? '⚙️ Dev: Remove Customization' : '⚙️ Dev: Enable Customization'}
              onPress={devToggleCustomization}
              danger={hasCustomization}
              colors={colors}
              styles={styles}
            />
          )}
          {__DEV__ && devControlsRevealed && (
            <RowItem
              label={hasNoAds ? '⚙️ Dev: Remove No-Ads' : '⚙️ Dev: Enable No-Ads'}
              onPress={devToggleNoAds}
              danger={hasNoAds}
              colors={colors}
              styles={styles}
            />
          )}
          {__DEV__ && devControlsRevealed && (
            <RowItem
              label="⚙️ Dev: Demo Board 1 (twin towers)"
              onPress={() => {
                saveGame(buildDemoSave(difficulty, 1)).then(() => {
                  Alert.alert(
                    'Demo Board 1 Loaded',
                    `Tap Continue on the Home tab (difficulty: ${difficulty}). The 1-6-1 triple spawns in position — just hard-drop it. Demo runs never touch stats or the leaderboard.`,
                  );
                });
              }}
              colors={colors}
              styles={styles}
            />
          )}
          {__DEV__ && devControlsRevealed && (
            <RowItem
              label="⚙️ Dev: Demo Board 2 (organic)"
              onPress={() => {
                saveGame(buildDemoSave(difficulty, 2)).then(() => {
                  Alert.alert(
                    'Demo Board 2 Loaded',
                    `Tap Continue on the Home tab (difficulty: ${difficulty}). Move the vertical 4-3-4 triple ONE column RIGHT and drop (7-pass full clear, two 6-pair clears). Demo runs never touch stats or the leaderboard.`,
                  );
                });
              }}
              colors={colors}
              styles={styles}
            />
          )}
        </Section>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Sound</Text>
          <View style={styles.sectionCard}>
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
            <ToggleRow
              label="Sound Effects"
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              colors={colors}
              styles={styles}
            />
            <ToggleRow
              label="Soundtrack"
              value={musicEnabled}
              onValueChange={setMusicEnabled}
              colors={colors}
              styles={styles}
            />
          </View>
        </View>

        {/* Customize */}
        <Section label="Customize" styles={styles}>
          <RowItem label="Theme" value={ThemeMeta[themeId].label} onPress={() => router.push('/settings/theme')} colors={colors} styles={styles} />
          <RowItem label="Soundtrack" value={SoundtrackMeta[soundtrackId].label} onPress={() => router.push('/settings/soundtrack')} colors={colors} styles={styles} />
          <RowItem label="Sound Effects" value={SoundPackMeta[soundPack].label} onPress={() => router.push('/settings/sound-pack')} colors={colors} styles={styles} />
          <RowItem label="Animation Pack" value={AnimPackMeta[animPack].label} onPress={() => router.push('/settings/animation-pack')} colors={colors} styles={styles} />
          <RowItem label="Dice Style" value={DiceStyleMeta[diceStyle].label} onPress={() => router.push('/settings/dice-style')} colors={colors} styles={styles} />
          {APP_ICON_SUPPORTED && (
            <RowItem label="App Icon" value={getCurrentAppIconLabel()} onPress={() => router.push('/settings/app-icon')} colors={colors} styles={styles} />
          )}
        </Section>

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
            sublabel="Turns off visual & sound effects for smoother gameplay on older devices."
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
          <RowItem label={COMPOSER_CREDIT_LABEL} colors={colors} styles={styles} onPress={openComposerIG} />
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
