import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { useDifficulty, Difficulty, GRAVITY_MS } from '@/contexts/DifficultyContext';
import { useGameStatus } from '@/contexts/GameStatusContext';
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
  const { stats } = useStats();
  const { difficulty, setDifficulty } = useDifficulty();
  const { isGameActive } = useGameStatus();
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [howToOpen, setHowToOpen] = useState(false);

  // Re-check for a saved game every time the lobby is focused (e.g. after Save & Quit)
  useFocusEffect(useCallback(() => {
    loadSavedGame().then(s => setHasSavedGame(!!s)).catch(() => {});
  }, []));

  // Continue the saved game (game screen auto-loads it)
  const handleContinue = useCallback(() => {
    router.push('/game');
  }, []);

  // Start fresh — pass ?fresh=1 so the game screen ignores any saved game
  const handleNewGame = useCallback(() => {
    router.push({ pathname: '/game', params: { fresh: '1' } });
  }, []);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Header — logo left of title, CubePuzzle style */}
        <View style={styles.titleRow}>
          <AppLogo size={62} />
          <View style={styles.titleTextBlock}>
            <Text style={styles.titleText} numberOfLines={1} adjustsFontSizeToFit>
              <Text style={[styles.titleTopside, { color: colors.text }]}>Topside</Text>
              <Text style={[styles.titleColon, { color: colors.text }]}>: </Text>
              <Text style={[styles.titleDiceDrop, { color: colors.accent }]}>Dice Drop</Text>
            </Text>
            <Text style={[styles.subtitleText, { color: colors.textSecondary }]}>
              Stack. Merge. Survive.
            </Text>
          </View>
        </View>

        {/* Best Score hero */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.heroLabel, { color: colors.textMuted }]}>BEST SCORE</Text>
          <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {stats.bestScore > 0 ? stats.bestScore.toLocaleString() : '—'}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>RUNS</Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {stats.totalRuns}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>BEST CHAIN</Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {stats.bestChain > 0 ? `×${stats.bestChain}` : '—'}
            </Text>
          </View>
        </View>

        {/* Divider — below stats, above difficulty */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Difficulty selector */}
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

        {/* Play / Resume buttons */}
        <View style={styles.btnStack}>
          {hasSavedGame ? (
            <>
              {/* Primary — resume the saved run */}
              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: colors.accent }]}
                onPress={handleContinue}
              >
                <Text style={[styles.playBtnText, { color: colors.accentText, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                  Continue
                </Text>
              </TouchableOpacity>
              {/* Secondary — discard and start fresh */}
              <TouchableOpacity
                style={[styles.newGameBtn, { borderColor: colors.border }]}
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

        {/* Divider — below Continue/Play, above How to Play */}
        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* How to Play */}
        <TouchableOpacity style={styles.howToBtn} onPress={() => setHowToOpen(true)}>
          <Text style={[styles.howToText, { color: colors.textSecondary }]}>How to Play</Text>
        </TouchableOpacity>

      </ScrollView>

      <HowToPlayModal visible={howToOpen} onClose={() => setHowToOpen(false)} />
    </SafeAreaView>
  );
}

const ROW_H = 60; // shared height for stat cards, difficulty, play button

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  content:     { paddingTop: 16, paddingHorizontal: 20, gap: 12, paddingBottom: 40 },
  titleRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 2, marginLeft: -8 },
  titleTextBlock: { flex: 1, marginLeft: 4 },
  titleText:      { fontSize: 30 },
  titleTopside:   { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, letterSpacing: 0.5 },
  titleColon:     { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30 },
  titleDiceDrop:  { fontFamily: 'Fredoka_700Bold', fontSize: 28, letterSpacing: 0.5 },
  subtitleText:   { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, marginTop: 3, marginLeft: 2 },
  heroCard:    { borderRadius: 16, borderWidth: 1, paddingVertical: 16, alignItems: 'center', gap: 2 },
  heroLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  heroValue:   { fontSize: 44, lineHeight: 50 },
  statsRow:    { flexDirection: 'row', gap: 12 },
  statCard:    { flex: 1, height: ROW_H, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  statLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  statValue:   { fontSize: 24 },
  diffSection: { height: ROW_H },
  diffRow:     { flexDirection: 'row', gap: 10, height: '100%' },
  diffBtn:     { flex: 1, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  diffLabel:   { fontSize: 15 },
  divider:     { height: 1, marginHorizontal: 16, alignSelf: 'stretch' },
  btnStack:    { gap: 10, marginTop: 4 },
  howToBtn:    { alignItems: 'center', paddingVertical: 6 },
  howToText:   { fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
  playBtn:     { height: ROW_H, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  playBtnText: { fontSize: 24 },
  newGameBtn:  { height: 48, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  newGameText: { fontSize: 16, fontWeight: '600' },
});
