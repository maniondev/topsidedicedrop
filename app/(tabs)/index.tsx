import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal, useWindowDimensions, Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { useDifficulty, Difficulty, GRAVITY_MS } from '@/contexts/DifficultyContext';
import { usePremium } from '@/contexts/PremiumContext';
import { useSound } from '@/contexts/SoundContext';
import AppLogo from '@/components/AppLogo';
import HowToPlayModal from '@/components/HowToPlayModal';
import PremiumModal from '@/components/PremiumModal';
import { loadSavedGame } from '@/lib/storage';

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
  const { top } = useSafeAreaInsets();
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('tm_seen_how_to_play').then(v => {
      if (!v) {
        setHowToOpen(true);
        AsyncStorage.setItem('tm_seen_how_to_play', '1').catch(() => {});
      }
    }).catch(() => {});
  }, []);
  const [newGameConfirmOpen, setNewGameConfirmOpen] = useState(false);
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);

  const { width } = useWindowDimensions();
  // Exact pixel widths so Continue/NewGame align with Medium/Hard edges.
  // Content = width - 40 (paddingH:20 each side), diff row gap:10 × 2 = 20 → each button = (width-60)/3.
  const diffBtnW  = (width - 60) / 3;
  const continueW = Math.round(diffBtnW * 2 + 10);
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
      router.push({ pathname: '/game', params: { fresh: '1' } });
    }
  }, [hasSavedGame]);

  const handleNewGameConfirmed = useCallback(() => {
    setNewGameConfirmOpen(false);
    router.push({ pathname: '/game', params: { fresh: '1' } });
  }, []);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background, paddingTop: top }]}>

      {/* TOP — logo, difficulty, play */}
      <View style={styles.topBlock}>
        <View style={styles.titleRow}>
          <AppLogo size={62} />
          <View style={styles.titleTextBlock}>
            <Text style={styles.titleText} numberOfLines={1} adjustsFontSizeToFit includeFontPadding={false}>
              <Text style={[styles.titleTopside, { color: colors.titleColor ?? colors.text }]}>Topside</Text>
              <Text style={[styles.titleColon, { color: colors.titleColor ?? colors.text }]}>: </Text>
              <Text style={[styles.titleDiceDrop, { color: colors.accent }]}>Dice Drop</Text>
            </Text>
            <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
              A drop and merge game.
            </Text>
          </View>
        </View>

        <View style={styles.diffSection}>
          <View style={styles.diffRow}>
            {DIFFICULTIES.map(d => {
              const active = d.id === difficulty;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.diffBtn,
                    active
                      ? { backgroundColor: colors.accent, borderColor: colors.accent }
                      : { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                  onPress={() => setDifficulty(d.id)}
                >
                  <Text style={[
                    styles.diffLabel,
                    { color: active ? colors.accentText : colors.textSecondary, fontWeight: active ? '700' : '400' },
                  ]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={hasSavedGame ? styles.btnRow : styles.btnSingle}>
          {hasSavedGame ? (
            <>
              <TouchableOpacity
                style={[styles.playBtn, { width: continueW, backgroundColor: colors.accent }]}
                onPress={handleContinue}
              >
                <Text style={[styles.playBtnText, { color: colors.accentText, fontFamily: 'Rubik_700Bold' }]}>
                  Continue
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.diffBtn, { width: newGameW, backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={handleNewGame}
              >
                <Text style={[styles.diffLabel, { color: colors.textSecondary, fontWeight: '400' }]}>New Game</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: colors.accent }]}
              onPress={handleNewGame}
            >
              <Text style={[styles.playBtnText, { color: colors.accentText, fontFamily: 'Rubik_700Bold' }]}>
                Play
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* SPACER 1 — flexible, divider centered within */}
      <View style={styles.spacer}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      {/* MIDDLE — 2x2 stat grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statsRow}>
          <View style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="trophy-outline" size={22} color={colors.accent} style={styles.heroIcon} />
            <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'Rubik_700Bold' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {dstats.bestScore > 0 ? dstats.bestScore.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>BEST OVERALL</Text>
          </View>
          <View style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="star-outline" size={22} color={colors.accent} style={styles.heroIcon} />
            <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'Rubik_700Bold' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {dstats.bestUnassisted > 0 ? dstats.bestUnassisted.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>BEST UNASSISTED</Text>
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="timer-outline" size={22} color={colors.textSecondary} style={styles.heroIcon} />
            <Text style={[styles.heroValue, { color: colors.textSecondary, fontFamily: 'Rubik_700Bold' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {lastRunScore > 0 ? lastRunScore.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>LAST RUN</Text>
          </View>
          <View style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="flame-outline" size={22} color={colors.textSecondary} style={styles.heroIcon} />
            <Text style={[styles.heroValue, { color: colors.textSecondary, fontFamily: 'Rubik_700Bold' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {currentStreak > 0 ? currentStreak.toLocaleString() : '—'}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>DAY STREAK</Text>
          </View>
        </View>
      </View>

      {/* SPACER 2 — flexible, divider centered within */}
      <View style={styles.spacer}>
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      </View>

      {/* BOTTOM — how to play + sound toggle + premium */}
      <View style={styles.bottomBlock}>
        <View style={styles.bottomRow}>
          <TouchableOpacity
            style={[styles.howToPlayBtn, { flex: 1, backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => setHowToOpen(true)}
          >
            <Ionicons name="book-outline" size={18} color={colors.accent} />
            <Text style={[styles.howToPlayText, { color: colors.textSecondary }]}>How to Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.soundBtn, { flex: 1, backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => setSoundEnabled(!soundEnabled)}
          >
            <Ionicons
              name={soundEnabled ? 'volume-high' : 'volume-mute'}
              size={20}
              color={soundEnabled ? colors.accent : colors.textMuted}
            />
            <Text style={[styles.soundBtnText, { color: colors.textSecondary }]}>
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </Text>
          </TouchableOpacity>
        </View>

        {!isPremium && (
          <TouchableOpacity
            style={[styles.unlockBanner, { backgroundColor: colors.premiumGold }]}
            onPress={() => setPremiumModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="star" size={14} color={colors.accentText} />
            <Text style={[styles.unlockBannerText, { color: colors.accentText }]}>
              Unlock Sound Packs, Themes, and More
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <HowToPlayModal visible={howToOpen} onClose={() => setHowToOpen(false)} />
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

const ROW_H = Platform.OS === 'android' ? 50 : 60;

const styles = StyleSheet.create({
  safe:           { flex: 1, paddingHorizontal: 20 },

  topBlock:       { paddingTop: 16, gap: 12 },
  spacer:         { flex: 1, maxHeight: 40, justifyContent: 'center' },
  divider:        { height: 1 },
  statsGrid:      { flex: 1, gap: 12 },
  statsRow:       { flex: 1, flexDirection: 'row', gap: 12 },
  bottomBlock:    { paddingBottom: 20, gap: 12 },

  titleRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 2, marginLeft: -8 },
  titleTextBlock: { flex: 1, marginLeft: 4 },
  titleText:      { fontSize: 30, lineHeight: 34 },
  titleTopside:   { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, letterSpacing: 0.5 },
  titleColon:     { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30 },
  titleDiceDrop:  { fontFamily: 'Rubik_700Bold', fontSize: 28, letterSpacing: 0.5 },
  subtitleText:   { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, marginTop: Platform.OS === 'android' ? 1 : 3, marginLeft: 2 },

  heroIcon:       {},
  heroLabel:      { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  heroValue:      { fontSize: 36, lineHeight: 38 },
  bestScoreCard:  { flex: 1, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },


  diffSection:    { height: ROW_H },
  diffRow:        { flexDirection: 'row', gap: 10, height: '100%' },
  diffBtn:        { flex: 1, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  diffLabel:      { fontSize: 15 },

  btnRow:         { flexDirection: 'row', gap: 10 },
  btnSingle:      { gap: 0 },
  playBtn:        { height: ROW_H, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  playBtnText:    { fontSize: 24 },
  newGameBtn:     { height: ROW_H, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  newGameText:    { fontSize: 15 },

  bottomRow:      { flexDirection: 'row', gap: 10 },
  howToPlayBtn:   { height: ROW_H, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  howToPlayText:  { fontSize: 15, fontWeight: '500' },
  soundBtn:       { height: ROW_H, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  soundBtnText:   { fontSize: 15, fontWeight: '500', width: 76 },

  unlockBanner:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 16 },
  unlockBannerText: { fontSize: 13, fontWeight: '700' },

  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  modalCard:        { width: '100%', borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12 },
  modalTitle:       { fontSize: 28, marginBottom: 4 },
  modalSubtitle:    { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 4 },
  modalBtn:         { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText:     { fontSize: 17, fontWeight: '700' },
  modalOutlineBtn:  { width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
  modalOutlineText: { fontSize: 16, fontWeight: '600' },
});
