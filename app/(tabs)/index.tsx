import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { useDifficulty, Difficulty, GRAVITY_MS } from '@/contexts/DifficultyContext';
import { useGameStatus } from '@/contexts/GameStatusContext';
import { usePremium } from '@/contexts/PremiumContext';
import AppLogo from '@/components/AppLogo';
import AdBanner from '@/components/AdBanner';
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
  const { isPremium } = usePremium();
  const [hasSavedGame, setHasSavedGame] = useState(false);

  useEffect(() => {
    loadSavedGame().then(s => setHasSavedGame(!!s)).catch(() => {});
  }, []);

  const handlePlay = useCallback(() => {
    router.push('/game');
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

        {/* Difficulty selector */}
        <View style={[styles.diffSection, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.diffTitle, { color: colors.textMuted }]}>DIFFICULTY</Text>
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
          {hasSavedGame && (
            <TouchableOpacity
              style={[styles.resumeBtn, { backgroundColor: colors.premiumBg, borderColor: colors.premiumGold }]}
              onPress={handlePlay}
            >
              <Text style={[styles.resumeBtnText, { color: colors.premiumGold }]}>💾  Resume Saved Game</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: colors.accent }]}
            onPress={handlePlay}
          >
            <Text style={[styles.playBtnText, { color: colors.accentText, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {hasSavedGame ? 'New Game' : 'Play'}
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {!isPremium && <AdBanner />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  content:     { paddingTop: 16, paddingHorizontal: 20, gap: 20, paddingBottom: 40 },
  titleRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginLeft: -8 },
  titleTextBlock: { flex: 1, marginLeft: 4 },
  titleText:      { fontSize: 30 },
  titleTopside:   { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30, letterSpacing: 0.5 },
  titleColon:     { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 30 },
  titleDiceDrop:  { fontFamily: 'Fredoka_700Bold', fontSize: 28, letterSpacing: 0.5 },
  subtitleText:   { fontSize: 13, fontWeight: '600', letterSpacing: 0.3, marginTop: 3, marginLeft: 2 },
  heroCard:    { borderRadius: 18, borderWidth: 1, padding: 28, alignItems: 'center', gap: 4 },
  heroLabel:   { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  heroValue:   { fontSize: 60, lineHeight: 68 },
  statsRow:    { flexDirection: 'row', gap: 12 },
  statCard:    { flex: 1, borderRadius: 14, borderWidth: 1, padding: 18, alignItems: 'center', gap: 4 },
  statLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  statValue:   { fontSize: 30 },
  diffSection: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  diffTitle:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  diffRow:     { flexDirection: 'row', gap: 8 },
  diffBtn:     { flex: 1, borderRadius: 10, borderWidth: 1.5, paddingVertical: 10, alignItems: 'center' },
  diffLabel:   { fontSize: 15 },
  btnStack:    { gap: 12 },
  resumeBtn:   { borderRadius: 16, borderWidth: 2, paddingVertical: 16, alignItems: 'center' },
  resumeBtnText: { fontSize: 18, fontWeight: '700' },
  playBtn:     { borderRadius: 16, paddingVertical: 20, alignItems: 'center' },
  playBtnText: { fontSize: 28 },
});
