import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { useDifficulty, Difficulty, GRAVITY_MS } from '@/contexts/DifficultyContext';
import AppLogo from '@/components/AppLogo';
import HowToPlayModal from '@/components/HowToPlayModal';
import { loadSavedGame } from '@/lib/storage';

const DIFFICULTIES: { id: Difficulty; label: string }[] = [
  { id: 'easy',   label: 'Easy'   },
  { id: 'medium', label: 'Medium' },
  { id: 'hard',   label: 'Hard'   },
];

export default function LobbyScreen() {
  const { colors } = useTheme();
  const { statsFor } = useStats();
  const { difficulty, setDifficulty } = useDifficulty();
  const { top } = useSafeAreaInsets();
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);
  const [newGameConfirmOpen, setNewGameConfirmOpen] = useState(false);

  const dstats = statsFor(difficulty);

  // Re-check for a saved game for the SELECTED difficulty — on focus and whenever
  // the difficulty changes. A save only counts toward the matching difficulty.
  useFocusEffect(useCallback(() => {
    loadSavedGame(difficulty).then(s => setHasSavedGame(!!s)).catch(() => {});
  }, [difficulty]));

  // Continue the saved game (game screen auto-loads it)
  const handleContinue = useCallback(() => {
    router.push('/game');
  }, []);

  // New Game tapped — if a save exists, warn first
  const handleNewGame = useCallback(() => {
    if (hasSavedGame) {
      setNewGameConfirmOpen(true);
    } else {
      router.push({ pathname: '/game', params: { fresh: '1' } });
    }
  }, [hasSavedGame]);

  // Confirmed: discard save and start fresh
  const handleNewGameConfirmed = useCallback(() => {
    setNewGameConfirmOpen(false);
    router.push({ pathname: '/game', params: { fresh: '1' } });
  }, []);

  return (
    <View style={[styles.safe, { backgroundColor: colors.background, paddingTop: top }]}>
      <View style={styles.content}>

        {/* Header — logo left of title */}
        <View style={styles.titleRow}>
          <AppLogo size={62} />
          <View style={styles.titleTextBlock}>
            <Text style={styles.titleText} numberOfLines={1} adjustsFontSizeToFit>
              <Text style={[styles.titleTopside, { color: colors.text }]}>Topside</Text>
              <Text style={[styles.titleColon, { color: colors.text }]}>: </Text>
              <Text style={[styles.titleDiceDrop, { color: colors.accent }]}>Dice Drop</Text>
            </Text>
            <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
              A drop and merge game.
            </Text>
          </View>
        </View>

        {/* Difficulty — drives the stats below */}
        <View style={styles.diffSection}>
          <View style={styles.diffRow}>
            {DIFFICULTIES.map(d => {
              const active = d.id === difficulty;
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[
                    styles.diffBtn,
                    { borderColor: active ? colors.accent : colors.border },
                    active && { backgroundColor: colors.accentDim },
                  ]}
                  onPress={() => setDifficulty(d.id)}
                >
                  <Text style={[
                    styles.diffLabel,
                    { color: active ? colors.accent : colors.textMuted, fontWeight: active ? '700' : '400' },
                  ]}>
                    {d.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action buttons — right after difficulty */}
        <View style={hasSavedGame ? styles.btnRow : styles.btnSingle}>
          {hasSavedGame ? (
            <>
              <TouchableOpacity
                style={[styles.playBtn, styles.btnHalf, { backgroundColor: colors.accent }]}
                onPress={handleContinue}
              >
                <Text style={[styles.playBtnText, { color: colors.accentText, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                  Continue
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.newGameBtn, styles.btnHalf, { borderColor: colors.border }]}
                onPress={handleNewGame}
              >
                <Text style={[styles.newGameText, { color: colors.textSecondary }]}>New Game</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.playBtn, { backgroundColor: colors.accent }]}
              onPress={handleNewGame}
            >
              <Text style={[styles.playBtnText, { color: colors.accentText, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                Play
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Best Overall and Best Unassisted — for the selected difficulty */}
        <View style={styles.bestScoresRow}>
          <View style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.heroLabel, { color: colors.textMuted }]}>BEST OVERALL</Text>
            <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'Rubik_700Bold' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {dstats.bestScore > 0 ? dstats.bestScore.toLocaleString() : '—'}
            </Text>
          </View>
          <View style={[styles.bestScoreCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.heroLabel, { color: colors.textMuted }]}>BEST UNASSISTED</Text>
            <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'Rubik_700Bold' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {dstats.bestUnassisted > 0 ? dstats.bestUnassisted.toLocaleString() : '—'}
            </Text>
          </View>
        </View>

        {/* Stats row — for the selected difficulty */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>TOTAL RUNS</Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Rubik_700Bold' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {dstats.totalRuns}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>LIFETIME SCORE</Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'Rubik_700Bold' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
              {dstats.lifetimeScore > 0 ? dstats.lifetimeScore.toLocaleString() : '—'}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* How to Play button */}
        <TouchableOpacity
          style={[styles.howToPlayBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          onPress={() => setHowToOpen(true)}
        >
          <Text style={[styles.howToPlayText, { color: colors.textSecondary }]}>How to Play</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

      </View>

      <HowToPlayModal visible={howToOpen} onClose={() => setHowToOpen(false)} />

      {/* New Game confirmation — warns that saved run will be discarded */}
      <Modal visible={newGameConfirmOpen} transparent animationType="fade" onRequestClose={() => setNewGameConfirmOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
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

const ROW_H = 60; // shared height for stat cards, difficulty, play button

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  content:     { flex: 1, paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  titleRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 2, marginLeft: -8 },
  titleTextBlock: { flex: 1, marginLeft: 4 },
  titleText:      { fontSize: 30 },
  titleTopside:   { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, letterSpacing: 0.5 },
  titleColon:     { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30 },
  titleDiceDrop:  { fontFamily: 'Rubik_700Bold', fontSize: 28, letterSpacing: 0.5 },
  subtitleText:   { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, marginTop: 3, marginLeft: 2 },
  heroCard:    { borderRadius: 16, borderWidth: 1, paddingVertical: 16, alignItems: 'center', gap: 2 },
  heroLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  heroValue:   { fontSize: 44, lineHeight: 50 },
  bestScoresRow: { flexDirection: 'row', gap: 12 },
  bestScoreCard: { flex: 1, borderRadius: 16, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 2 },
  statsRow:    { flexDirection: 'row', gap: 12 },
  statCard:    { flex: 1, height: ROW_H, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  statLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  statValue:   { fontSize: 24 },
  diffSection: { height: ROW_H },
  diffRow:     { flexDirection: 'row', gap: 10, height: '100%' },
  diffBtn:     { flex: 1, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  diffLabel:   { fontSize: 15 },
  divider:     { height: 1, alignSelf: 'stretch', marginVertical: 10 },
  modalOverlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  modalCard:        { width: '100%', borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12 },
  modalTitle:       { fontSize: 28, marginBottom: 4 },
  modalSubtitle:    { fontSize: 13, textAlign: 'center', lineHeight: 18, marginBottom: 4 },
  modalBtn:         { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  modalBtnText:     { fontSize: 17, fontWeight: '700' },
  modalOutlineBtn:  { width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5 },
  modalOutlineText: { fontSize: 16, fontWeight: '600' },
  btnRow:      { flexDirection: 'row', gap: 10 },
  btnSingle:   { gap: 0 },
  btnHalf:     { flex: 1 },
  playBtn:     { height: ROW_H, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  playBtnText: { fontSize: 24 },
  newGameBtn:  { height: ROW_H, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  newGameText: { fontSize: 16, fontWeight: '600' },
  howToPlayBtn:  { height: ROW_H, borderRadius: 14, borderWidth: 1, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  howToPlayText: { fontSize: 15, fontWeight: '500' },
});
