import React, { useMemo, useState, useRef, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect, router, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTheme } from '@/contexts/ThemeContext';
import { useSound } from '@/contexts/SoundContext';
import { useMusic } from '@/contexts/MusicContext';
import { useAnimation } from '@/contexts/AnimationContext';
import { useDiceStyle } from '@/contexts/DiceStyleContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useStats } from '@/contexts/StatsContext';
import { CONTROLS_SEEN_KEY, saveGame } from '@/lib/storage';
import { buildDemoSave } from '@/lib/demoBoard';
import { useDifficulty } from '@/contexts/DifficultyContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PremiumModal from '@/components/PremiumModal';
import { LANGUAGE_NAMES, type SupportedLanguage } from '@/lib/i18n';
import { openNativeReview, getHasRated } from '@/lib/reviewPrompt';
import { Section, RowItem, ToggleRow, makeSettingsStyles } from '@/components/settings/SettingsShared';
import { getAppIcon, APP_ICON_SUPPORTED, type AppIconId } from '@/lib/appIcon';
import { COMPOSER_NAME, openComposerIG } from '@/lib/composer';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
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
  const [currentIcon, setCurrentIcon] = useState<AppIconId>('default');
  const scrollRef = useRef<ScrollView>(null);

  useFocusEffect(useCallback(() => {
    getHasRated().then(setHasRatedState);
    getAppIcon().then(setCurrentIcon);
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
      t('settings.stats.resetConfirmTitle'),
      t('settings.stats.resetConfirmBody'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.reset'), style: 'destructive', onPress: async () => {
          await resetStats();
          Alert.alert(t('settings.stats.resetDoneTitle'), t('settings.stats.resetDoneBody'));
        }},
      ],
    );
  };

  return (
    <View style={[styles.safe, { paddingTop: top }]}>
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        <Pressable onPressIn={handleTitlePressIn} onPressOut={handleTitlePressOut}>
          <Text style={styles.screenTitle}>{t('settings.title')}</Text>
        </Pressable>

        {/* Premium */}
        <Section label={t('settings.sections.premium')} styles={styles}>
          {isFullyUnlocked ? (
            <View style={styles.premiumActive}>
              <Ionicons name="star" size={20} color={colors.premiumGold} />
              <Text style={[styles.premiumTitle, { color: colors.premiumGold }]}>{t('settings.premium.active')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: colors.premiumGold }]}
              onPress={handleUpgrade}
              activeOpacity={0.85}
            >
              <Ionicons name="star" size={16} color={colors.accentText} />
              <Text style={[styles.upgradeBtnText, { color: colors.accentText }]}>
                {hasCustomization ? t('settings.premium.removeAds') : hasNoAds ? t('settings.premium.unlockCustomization') : t('settings.premium.unlockPremium')}
              </Text>
            </TouchableOpacity>
          )}
          {!isFullyUnlocked && (
            <RowItem label={t('common.restorePurchases')} onPress={restorePurchases} colors={colors} styles={styles} />
          )}
          {!hasCustomization && (
            <RowItem label={t('common.redeemCode')} onPress={redeemCode} colors={colors} styles={styles} />
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
          <Text style={styles.sectionLabel}>{t('settings.sections.sound')}</Text>
          <View style={styles.sectionCard}>
            {/* Always visible — the audio-session category governs the
                soundtrack too, not just SFX, so hiding it behind the Sound
                Effects toggle stranded music-only users on the wrong mode. */}
            <ToggleRow
              label={t('settings.sound.breakSilent')}
              sublabel={t('settings.sound.breakSilentSub')}
              value={soundMode === 'playback'}
              onValueChange={v => setSoundMode(v ? 'playback' : 'ambient')}
              colors={colors}
              styles={styles}
            />
            <ToggleRow
              label={t('settings.sound.soundEffects')}
              value={soundEnabled}
              onValueChange={setSoundEnabled}
              colors={colors}
              styles={styles}
            />
            <ToggleRow
              label={t('settings.sound.soundtrack')}
              value={musicEnabled}
              onValueChange={setMusicEnabled}
              colors={colors}
              styles={styles}
            />
          </View>
        </View>

        {/* Customize */}
        <Section label={t('settings.sections.customize')} styles={styles}>
          <RowItem label={t('settings.customize.theme')} value={t(`themeNames.${themeId}`)} onPress={() => router.push('/settings/theme')} colors={colors} styles={styles} />
          <RowItem label={t('settings.customize.soundtrack')} value={t(`soundtrackNames.${soundtrackId}`)} onPress={() => router.push('/settings/soundtrack')} colors={colors} styles={styles} />
          <RowItem label={t('settings.customize.soundEffects')} value={t(`soundPackNames.${soundPack}`)} onPress={() => router.push('/settings/sound-pack')} colors={colors} styles={styles} />
          <RowItem label={t('settings.customize.animationPack')} value={t(`animPackNames.${animPack}`)} onPress={() => router.push('/settings/animation-pack')} colors={colors} styles={styles} />
          <RowItem label={t('settings.customize.diceStyle')} value={t(`diceStyleNames.${diceStyle}`)} onPress={() => router.push('/settings/dice-style')} colors={colors} styles={styles} />
          {APP_ICON_SUPPORTED && (
            <RowItem label={t('settings.customize.appIcon')} value={t(`appIconNames.${currentIcon}`)} onPress={() => router.push('/settings/app-icon')} colors={colors} styles={styles} />
          )}
          {/* Language route isn't in the generated typed-routes map until the
              dev server regenerates it; the cast bridges tsc until then. */}
          <RowItem label={t('settings.language.title')} value={LANGUAGE_NAMES[i18n.language as SupportedLanguage] ?? i18n.language} onPress={() => router.push('/settings/language' as Href)} colors={colors} styles={styles} />
        </Section>

        {/* Gameplay toggles */}
        <Section label={t('settings.sections.gameplay')} styles={styles}>
          <ToggleRow
            label={t('settings.gameplay.scorePopups')}
            value={showChainPopups}
            onValueChange={setShowChainPopups}
            colors={colors}
            styles={styles}
          />
          <ToggleRow
            label={t('settings.gameplay.performanceMode')}
            sublabel={t('settings.gameplay.performanceModeSub')}
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
        <Section label={t('settings.sections.about')} styles={styles}>
          {hasRated ? (
            <RowItem label={t('settings.about.rated')} colors={colors} styles={styles} />
          ) : (
            <RowItem label={t('settings.about.rate')} colors={colors} styles={styles} onPress={openNativeReview} />
          )}
          <RowItem label={t('settings.about.moreGames')} colors={colors} styles={styles} onPress={() => Linking.openURL('https://topside.games')} />
          <RowItem label={`${t('settings.soundtrack.composerLabel')} ${COMPOSER_NAME}`} colors={colors} styles={styles} onPress={openComposerIG} />
          <RowItem label={t('settings.about.privacy')} colors={colors} styles={styles} onPress={() => Linking.openURL('https://topside.games/dicedrop/privacy')} />
          <RowItem label={t('settings.about.terms')} colors={colors} styles={styles} onPress={() => Linking.openURL('https://topside.games/dicedrop/tos')} />
          <RowItem label={t('settings.about.contact')} colors={colors} styles={styles} onPress={() => Linking.openURL('https://topside.games/contact')} />
          <RowItem label={t('settings.about.version')} value={Constants.expoConfig?.version ?? '—'} colors={colors} styles={styles} />
        </Section>

        {/* Stats */}
        <Section label={t('settings.sections.stats')} styles={styles}>
          <RowItem label={t('settings.stats.reset')} onPress={confirmReset} danger colors={colors} styles={styles} />
        </Section>

        <View style={{ height: 8 }} />
      </ScrollView>

      <PremiumModal visible={premiumModalOpen} onClose={() => setPremiumModalOpen(false)} />
    </View>
  );
}
