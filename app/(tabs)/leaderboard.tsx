import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { Difficulty } from '@/contexts/DifficultyContext';

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const { stats } = useStats();

  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'all'>('all');
  const [filterType, setFilterType] = useState<'overall' | 'unassisted'>('overall');

  // Get stats for the selected filter
  const getFilteredStats = () => {
    if (filterDifficulty === 'all') {
      // Aggregate across all difficulties
      const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
      const bestScore = Math.max(...difficulties.map(d => stats.byDifficulty[d].bestScore));
      const bestUnassisted = Math.max(...difficulties.map(d => stats.byDifficulty[d].bestUnassisted));
      const totalRuns = difficulties.reduce((sum, d) => sum + stats.byDifficulty[d].totalRuns, 0);
      const lifetimeScore = difficulties.reduce((sum, d) => sum + stats.byDifficulty[d].lifetimeScore, 0);
      const bestChain = Math.max(...difficulties.map(d => stats.byDifficulty[d].bestChain));

      // For unassisted, only count runs without continues
      const unassistedRuns = stats.recentRuns.filter(r => !r.usedContinue);
      const unassistedBest = unassistedRuns.length > 0 ? Math.max(...unassistedRuns.map(r => r.score)) : 0;

      return {
        bestRun: filterType === 'overall' ? bestScore : bestUnassisted,
        lifetimeScore,
        totalRuns,
        bestChain,
        averageScore: stats.recentRuns.length > 0 ? Math.round(stats.recentRuns.reduce((a, r) => a + r.score, 0) / stats.recentRuns.length) : 0,
        bestThisWeek: (() => {
          const now = Date.now();
          const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
          const thisWeek = stats.recentRuns.filter(r => r.date >= weekAgo && (filterType === 'overall' ? true : !r.usedContinue));
          return thisWeek.length > 0 ? Math.max(...thisWeek.map(r => r.score)) : 0;
        })(),
      };
    } else {
      // Single difficulty
      const d = stats.byDifficulty[filterDifficulty];
      const bestRun = filterType === 'overall' ? d.bestScore : d.bestUnassisted;

      // Average for this difficulty
      const diffRuns = stats.recentRuns.filter(r => r.difficulty === filterDifficulty && (filterType === 'overall' ? true : !r.usedContinue));
      const averageScore = diffRuns.length > 0 ? Math.round(diffRuns.reduce((a, r) => a + r.score, 0) / diffRuns.length) : 0;

      // Best this week for this difficulty
      const now = Date.now();
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const thisWeek = diffRuns.filter(r => r.date >= weekAgo);
      const bestThisWeek = thisWeek.length > 0 ? Math.max(...thisWeek.map(r => r.score)) : 0;

      return {
        bestRun,
        lifetimeScore: d.lifetimeScore,
        totalRuns: d.totalRuns,
        bestChain: d.bestChain,
        averageScore,
        bestThisWeek,
      };
    }
  };

  const filtered = getFilteredStats();

  const FilterButton = ({ label, value, current, onPress }: any) => (
    <TouchableOpacity
      style={[styles.filterBtn, { backgroundColor: current === value ? colors.accent : colors.card, borderColor: colors.border }]}
      onPress={() => onPress(value)}
    >
      <Text style={[styles.filterBtnText, { color: current === value ? colors.accentText : colors.textSecondary, fontWeight: current === value ? '700' : '400' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Leaderboard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Difficulty Filter */}
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>DIFFICULTY</Text>
          <View style={styles.filterRow}>
            <FilterButton label="All" value="all" current={filterDifficulty} onPress={setFilterDifficulty} />
            <FilterButton label="Easy" value="easy" current={filterDifficulty} onPress={setFilterDifficulty} />
            <FilterButton label="Medium" value="medium" current={filterDifficulty} onPress={setFilterDifficulty} />
            <FilterButton label="Hard" value="hard" current={filterDifficulty} onPress={setFilterDifficulty} />
          </View>
        </View>

        {/* Type Filter */}
        <View style={styles.filterGroup}>
          <Text style={[styles.filterLabel, { color: colors.textMuted }]}>TYPE</Text>
          <View style={styles.filterRow}>
            <FilterButton label="Overall" value="overall" current={filterType} onPress={setFilterType} />
            <FilterButton label="Unassisted" value="unassisted" current={filterType} onPress={setFilterType} />
          </View>
        </View>

        {/* Hero stat: Best Run */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.heroLabel, { color: colors.textMuted }]}>BEST RUN</Text>
          <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {filtered.bestRun > 0 ? filtered.bestRun.toLocaleString() : '—'}
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>AVERAGE</Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {filtered.averageScore > 0 ? filtered.averageScore.toLocaleString() : '—'}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>LIFETIME</Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {filtered.lifetimeScore > 0 ? filtered.lifetimeScore.toLocaleString() : '—'}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>BEST CHAIN</Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {filtered.bestChain > 0 ? `×${filtered.bestChain}` : '—'}
            </Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>TOTAL RUNS</Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {filtered.totalRuns}
            </Text>
          </View>
        </View>

        {/* Best This Week */}
        <View style={[styles.statCardWide, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>BEST THIS WEEK</Text>
          <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {filtered.bestThisWeek > 0 ? filtered.bestThisWeek.toLocaleString() : '—'}
          </Text>
        </View>

        {filtered.totalRuns === 0 && (
          <Text style={[styles.empty, { color: colors.textMuted }]}>No runs yet — play a game first!</Text>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { paddingVertical: 16, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#00000010' },
  title:          { fontSize: 32, fontFamily: 'PlayfairDisplay_700Bold' },
  content:        { paddingVertical: 16, paddingHorizontal: 20, gap: 16 },

  filterGroup:    { gap: 8 },
  filterLabel:    { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  filterRow:      { flexDirection: 'row', gap: 8 },
  filterBtn:      { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  filterBtnText:  { fontSize: 13, fontWeight: '600' },

  heroCard:       { borderRadius: 16, borderWidth: 1, paddingVertical: 20, alignItems: 'center', gap: 2 },
  heroLabel:      { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  heroValue:      { fontSize: 44, lineHeight: 50 },

  statsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard:       { flex: 1, minWidth: '48%', borderRadius: 14, borderWidth: 1, paddingVertical: 14, alignItems: 'center', gap: 2 },
  statCardWide:   { borderRadius: 14, borderWidth: 1, paddingVertical: 16, alignItems: 'center', gap: 4 },
  statLabel:      { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  statValue:      { fontSize: 22 },

  empty:          { textAlign: 'center', marginTop: 20, fontSize: 14, fontStyle: 'italic' },
});
