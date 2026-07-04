import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, useWindowDimensions, Platform, Dimensions,
} from 'react-native';

const IS_LARGE = Platform.isPad || Dimensions.get('window').width >= 600;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { useDifficulty, Difficulty, GRAVITY_MS } from '@/contexts/DifficultyContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useSound } from '@/contexts/SoundContext';
import { useMusic } from '@/contexts/MusicContext';
import AppLogo from '@/components/AppLogo';
import HowToPlayModal from '@/components/HowToPlayModal';
import PremiumModal from '@/components/PremiumModal';
import { loadSavedGame } from '@/lib/storage';
import { useInterstitialAd } from '@/hooks/useInterstitialAd';
import { isFirstRunOfSession, markFirstRunUsed } from '@/lib/sessionTracker';

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy',   label: 'Easy'   },
  { id: 'medium', label: 'Medium' },
  { id: 'hard',   label: 'Hard'   },
];

export default function LobbyScreen() {
  const { colors } = useTheme();
  const { statsFor, stats } = useStats();
  const { difficulty, setDifficulty } = useDifficulty();
  const { isPremium, upgrade } = usePremium();
  const { soundEnabled, setSoundEnabled } = useSound();
  const { musicEnabled, setMusicEnabled, devMusicIncluded } = useMusic();
  const { top } = useSafeAreaInsets();
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [howToIsFirstOpen, setHowToIsFirstOpen] = useState(false);
  const { showInterstitial } = useInterstitialAd();

  useEffect(() => {
    AsyncStorage.getItem('tm_seen_how_to_play').then(v => {
      if (!v) {
        setHowToIsFirstOpen(true);
        setHowToOpen(true);
        AsyncStorage.setItem('tm_seen_how_to_play', '1').catch(() => {});
      }
    }).catch(() => {});
  }, []);
  const [newGameConfirmOpen, setNewGameConfirmOpen] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  const { width } = useWindowDimensions();
  // Scale UI relative to a 390-pt baseline, capped at 1.4× for large screens (iPad / Android tablet).
  const scale = Math.min(width / 390, 1.4);
  const ph    = Math.round(20 * scale);   // paddingHorizontal
  const gap   = Math.round(10 * scale);   // standard gap between siblings
  const rowH  = Math.round((Platform.OS === 'android' ? 50 : 60) * scale);
  const r14   = Math.round(14 * scale);
  const r16   = Math.round(16 * scale);
  const r12   = Math.round(12 * scale);
  const f     = (n: number) => Math.round(n * scale);

  // Button widths: content = width - 2*ph, 3 slots with 2 gaps between them
  const diffBtnW  = (width - ph * 2 - gap * 2) / 3;
  const continueW = Math.round(diffBtnW * 2 + gap);
  const newGameW  = Math.round(diffBtnW);

  const dstats = statsFor(difficulty);

  const currentStreak = useMemo(() => {
    if (stats.recentRuns.length === 0) return 0;
    const DAY = 86400000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = new Set(stats.recentRuns.map(r => {
      const d = new Date(r.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }));
    let cur = today.getTime();
    if (!days.has(cur)) {
      cur -= DAY;
      if (!days.has(cur)) return 0;
    }
    let streak = 0;
    while (days.has(cur)) { streak++; cur -= DAY; }
    return streak;
  }, [stats.recentRuns]);

  const lastRunScore = useMemo(() => {
    const run = stats.recentRuns.find(r => r.difficulty === difficulty);
    return run ? run.score : 0;
  }, [stats.recentRuns, difficulty]);

  useFocusEffect(useCallback(() => {
    loadSavedGame(difficulty).then(s => setHasSavedGame(!!s)).catch(() => {});
  }, [difficulty]));

  const handleContinue = useCallback(() => {
    router.push('/game');
  }, []);

  const handleNewGame = useCallback(() => {
    if (hasSavedGame) {
      setNewGameConfirmOpen(true);
    } else {
      const isFirst = isFirstRunOfSession();
      markFirstRunUsed();
      if (!isPremium && !isFirst) {
        showInterstitial(() => router.push({ pathname: '/game', params: { fresh: '1' } }));
      } else {
        router.push({ pathname: '/game', params: { fresh: '1' } });
      }
    }
  }, [hasSavedGame, isPremium, showInterstitial]);

  const handleNewGameConfirmed = useCallback(() => {
    setNewGameConfirmOpen(false);
    markFirstRunUsed();
    router.push({ pathname: '/game', params: { fresh: '1' } });
  }, []);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background, paddingTop: top, paddingHorizontal: ph }]}>

      {/* TOP — logo, difficulty, play */}
      <View style={[styles.topBlock, { paddingTop: f(16), gap: f(12) }]}>
        <View style={[styles.titleRow, { marginLeft: -f(8) }]}>
          <AppLogo size={f(62)} />
          <View style={[styles.titleTextBlock, { marginLeft: f(4) }]}>
            <Text style={[styles.titleText, { fontSize: f(30), lineHeight: f(34) }]} numberOfLines={1} adjustsFontSizeToFit includeFontPadding={false}>
              <Text style={[styles.titleTopside, { color: colors.titleColor ?? colors.text, fontSize: f(30) }]}>Topside</Text>
              <Text style={[styles.titleColon, { color: colors.titleColor ?? colors.text, fontSize: f(30) }]}>: </Text>
              <Text style={[styles.titleDiceDrop, { color: colors.accent, fontSize: f(28) }]}>Dice Drop</Text>
            </Text>
            <Text style={[styles.subtitleText, { color: colors.textSecondary, fontSize: f(13), marginTop: Platform.OS === 'android' ? 1 : f(3) }]}>
              A drop and merge game.
            </Text>
          </View>
        </View>

        <View style={[styles.diffSection, { height: rowH }]}>
          <View style={[styles.diffRow, { gap }]}>
            {DIFFICULTIES.map(d => {
              const active = d.id === difficulty;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.diffBtn,
                    { flex: 1, borderRadius: r14 },
                    active
                      ? { backgroundColor: colors.accent, borderColor: colors.accent }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => setDifficulty(d.id)}
                >
                  <Text style={[
                    styles.diffLabel,
                    { fontSize: f(15), color: active ? colors.accentText : colors.textSecondary, fontWeight: active ? '700' : '400' },
                  ]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={hasSavedGame ? [styles.btnRow, { gap }] : styles.btnSingle}>
          {hasSavedGame ? (
            <>
              <TouchableOpacity
                style={[styles.playBtn, { width: continueW, height: rowH, borderRadius: r14, backgroundColor: colors.accent }]}
                onPress={handleContinue}
              >
                <Text style={[styles.playBtnText, { color: colors.accentText, fontFamily: 'Rubik_700Bold', fontSize: f(24) }]}>
                  Continue
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.diffBtn, { width: newGameW, height: rowH, borderRadius: r14, backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleNewGame}
              >
                <Text style={[styles.diffLabel, { fontSize: f(15), color: colors.textSecondary, fontWeight: '400' }]}>New Game</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.playBtn, { height: rowH, borderRadius: r14, backgroundColor: colors.accent }]}
              onPress={handleNewGame}
            >
              <Text style={[styles.playBtnText, { color: colors.accentText, fontFamily: 'Rubik_700Bold', fontSize: f(24) }]}>
                Play
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SPACER 1 — flexible, divider centered within */}
      <View style={[styles.spacer, { maxHeight: f(40) }]}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      {/* MIDDLE — 2x2 stat grid */}
      <View style={[styles.statsGrid, { gap: f(12) }]}>
        <View style={[styles.statsRow, { gap: f(12) }]}>
          <View style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: r16, gap: f(6) }]}>
            <Ionicons name="star-outline" size={f(22)} color={colors.accent} />
            <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'Rubik_700Bold', fontSize: f(36), lineHeight: f(38) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {dstats.bestUnassisted > 0 ? dstats.bestUnassisted.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary, fontSize: f(10) }]}>BEST UNASSISTED</Text>
          </View>
          <View style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: r16, gap: f(6) }]}>
            <Ionicons name="trophy-outline" size={f(22)} color={colors.accent} />
            <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'Rubik_700Bold', fontSize: f(36), lineHeight: f(38) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {dstats.bestScore > 0 ? dstats.bestScore.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary, fontSize: f(10) }]}>BEST OVERALL</Text>
          </View>
        </View>
        <View style={[styles.statsRow, { gap: f(12) }]}>
          <View style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: r16, gap: f(6) }]}>
            <Ionicons name="timer-outline" size={f(22)} color={colors.textSecondary} />
            <Text style={[styles.heroValue, { color: colors.textSecondary, fontFamily: 'Rubik_700Bold', fontSize: f(36), lineHeight: f(38) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {lastRunScore > 0 ? lastRunScore.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary, fontSize: f(10) }]}>LAST RUN</Text>
          </View>
          <View style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, borderRadius: r16, gap: f(6) }]}>
            <Ionicons name="flame-outline" size={f(22)} color={colors.textSecondary} />
            <Text style={[styles.heroValue, { color: colors.textSecondary, fontFamily: 'Rubik_700Bold', fontSize: f(36), lineHeight: f(38) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {currentStreak > 0 ? currentStreak.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary, fontSize: f(10) }]}>DAY STREAK</Text>
          </View>
        </View>
      </View>

      {/* SPACER 2 — flexible, divider centered within */}
      <View style={[styles.spacer, { maxHeight: f(40) }]}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      {/* BOTTOM — how to play + sound toggle + premium */}
      <View style={[styles.bottomBlock, { paddingBottom: f(20), gap: f(12) }]}>
        <View style={[styles.bottomRow, { gap }]}>
          <TouchableOpacity
            style={[styles.rowBtn, { flex: 1, height: rowH, borderRadius: r14, paddingHorizontal: f(16), gap: f(8), backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => { setHowToIsFirstOpen(false); setHowToOpen(true); }}
          >
            <Ionicons name="book-outline" size={f(18)} color={colors.accent} />
            <Text style={[styles.rowBtnText, { color: colors.textSecondary, fontSize: f(15) }]}>How to Play</Text>
          </TouchableOpacity>
          {devMusicIncluded ? (
            <View style={[styles.bottomRow, { flex: 1, gap: f(8) }]}>
              <CrossableIconButton
                icon="volume-high"
                enabled={soundEnabled}
                onPress={() => setSoundEnabled(!soundEnabled)}
                rowH={rowH} r14={r14} f={f} colors={colors}
              />
              <CrossableIconButton
                icon="musical-notes"
                enabled={musicEnabled}
                onPress={() => setMusicEnabled(!musicEnabled)}
                rowH={rowH} r14={r14} f={f} colors={colors}
              />
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.rowBtn, { flex: 1, height: rowH, borderRadius: r14, paddingHorizontal: f(16), gap: f(8), backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              onPress={() => setSoundEnabled(!soundEnabled)}
            >
              <Ionicons
                name={soundEnabled ? 'volume-high' : 'volume-mute'}
                size={f(20)}
                color={soundEnabled ? colors.accent : colors.textMuted}
              />
              <Text style={[styles.rowBtnText, { color: colors.textSecondary, fontSize: f(15), width: f(76) }]}>
                {soundEnabled ? 'Sound On' : 'Sound Off'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {!isPremium && (
          <TouchableOpacity
            style={[styles.unlockBanner, { backgroundColor: colors.premiumGold, borderRadius: r12, paddingVertical: f(11), paddingHorizontal: f(16), gap: f(7) }]}
            onPress={() => setPremiumModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="star" size={f(14)} color={colors.accentText} />
            <Text style={[styles.unlockBannerText, { color: colors.accentText, fontSize: f(13) }]}>
              Unlock Sound Packs, Themes, and More
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <HowToPlayModal visible={howToOpen} showConsent={howToIsFirstOpen} onClose={() => setHowToOpen(false)} />
      <PremiumModal visible={premiumModalVisible} onClose={() => setPremiumModalVisible(false)} />

      {/* New Game confirmation */}
      <Modal visible={newGameConfirmOpen} transparent animationType="fade" onRequestClose={() => setNewGameConfirmOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
              Start New Game?
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              This will discard your currently saved run.
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: colors.accent }]}
              onPress={() => { setNewGameConfirmOpen(false); setTimeout(handleContinue, 200); }}
            >
              <Text style={[styles.modalBtnText, { color: colors.accentText }]}>Continue Saved Run</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOutlineBtn, { borderColor: colors.accent }]}
              onPress={handleNewGameConfirmed}
            >
              <Text style={[styles.modalOutlineText, { color: colors.accent }]}>Start New Game</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalOutlineBtn, { borderColor: colors.border }]}
              onPress={() => setNewGameConfirmOpen(false)}
            >
              <Text style={[styles.modalOutlineText, { color: colors.textSecondary }]}>← Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Icon-only toggle button with a diagonal strike overlay when off — used for
// the Sound/Music split (dev-only, pending a real music track).
function CrossableIconButton({ icon, enabled, onPress, rowH, r14, f, colors }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  enabled: boolean;
  onPress: () => void;
  rowH: number; r14: number; f: (n: number) => number;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      style={[crossBtnStyles.btn, { flex: 1, height: rowH, borderRadius: r14, backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={crossBtnStyles.iconWrap}>
        <Ionicons name={icon} size={f(20)} color={enabled ? colors.accent : colors.textMuted} />
        {!enabled && (
          <View style={[crossBtnStyles.strike, { backgroundColor: colors.textMuted, width: f(26) }]} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const crossBtnStyles = StyleSheet.create({
  btn:      { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  strike:   { position: 'absolute', height: 2, borderRadius: 1, transform: [{ rotate: '-45deg' }] },
});

const styles = StyleSheet.create({
  safe:         { flex: 1 },
  topBlock:     {},
  spacer:       { flex: 1, justifyContent: 'center' },
  divider:      { height: 1 },
  statsGrid:    { flex: 1 },
  statsRow:     { flex: 1, flexDirection: 'row' },
  bottomBlock:  {},

  titleRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  titleTextBlock: { flex: 1 },
  titleText:      {},
  titleTopside:   { fontFamily: 'PlayfairDisplay_700Bold', letterSpacing: 0.5 },
  titleColon:     { fontFamily: 'PlayfairDisplay_700Bold' },
  titleDiceDrop:  { fontFamily: 'Rubik_700Bold', letterSpacing: 0.5 },
  subtitleText:   { fontWeight: '600', letterSpacing: 0.3, marginLeft: 2 },

  heroLabel:      { fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  heroValue:      {},
  bestScoreCard:  { flex: 1, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },

  diffSection:  {},
  diffRow:      { flexDirection: 'row', height: '100%' },
  diffBtn:      { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  diffLabel:    {},

  btnRow:       { flexDirection: 'row' },
  btnSingle:    {},
  playBtn:      { alignItems: 'center', justifyContent: 'center' },
  playBtnText:  {},

  bottomRow:    { flexDirection: 'row' },
  rowBtn:       { borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  rowBtnText:   { fontWeight: '500' },

  unlockBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  unlockBannerText: { fontWeight: '700' },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  modalCard:        { width: '100%', maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: IS_LARGE ? 16 : 12 },
  modalTitle:       { fontSize: IS_LARGE ? 32 : 28, marginBottom: 4 },
  modalSubtitle:    { fontSize: IS_LARGE ? 17 : 13, textAlign: 'center', lineHeight: IS_LARGE ? 24 : 18, marginBottom: 4 },
  modalBtn:         { width: '100%', paddingVertical: IS_LARGE ? 20 : 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText:     { fontSize: IS_LARGE ? 20 : 17, fontWeight: '700' },
  modalOutlineBtn:  { width: '100%', paddingVertical: IS_LARGE ? 18 : 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
  modalOutlineText: { fontSize: IS_LARGE ? 19 : 16, fontWeight: '600' },
});
