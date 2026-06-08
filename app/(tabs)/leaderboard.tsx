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
    const isUnassisted = filterType === 'unassisted';
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Filter recentRuns by difficulty + type
    const runs = stats.recentRuns.filter(r => {
      const diffMatch = filterDifficulty === 'all' || r.difficulty === filterDifficulty;
      const typeMatch = !isUnassisted || !r.usedContinue;
      return diffMatch && typeMatch;
    });

    // Best run: for unassisted, use bestUnassisted from stored stats (which is more
    // accurate since recentRuns is capped at 20). For overall, use bestScore.
    let bestRun = 0;
    if (filterDifficulty === 'all') {
      const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
      bestRun = Math.max(...diffs.map(d =>
        isUnassisted ? stats.byDifficulty[d].bestUnassisted : stats.byDifficulty[d].bestScore
      ));
    } else {
      const d = stats.byDifficulty[filterDifficulty];
      bestRun = isUnassisted ? d.bestUnassisted : d.bestScore;
    }

    // Lifetime score: for unassisted we derive from recentRuns (capped 20) as best
    // we can — stored lifetimeScore is overall-only
    let lifetimeScore = 0;
    if (!isUnassisted) {
      if (filterDifficulty === 'all') {
        const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
        lifetimeScore = diffs.reduce((sum, d) => sum + stats.byDifficulty[d].lifetimeScore, 0);
      } else {
        lifetimeScore = stats.byDifficulty[filterDifficulty].lifetimeScore;
      }
    } else {
      // Approximate from recentRuns (last 20 — best we can do without a separate store)
      lifetimeScore = runs.reduce((sum, r) => sum + r.score, 0);
    }

    // Total runs: for unassisted derive from recentRuns (approximate)
    let totalRuns = 0;
    if (!isUnassisted) {
      if (filterDifficulty === 'all') {
        const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
        totalRuns = diffs.reduce((sum, d) => sum + stats.byDifficulty[d].totalRuns, 0);
      } else {
        totalRuns = stats.byDifficulty[filterDifficulty].totalRuns;
      }
    } else {
      totalRuns = runs.length; // from recentRuns, approximate
    }

    // Best chain: for unassisted derive from filtered runs
    let bestChain = 0;
    if (!isUnassisted) {
      if (filterDifficulty === 'all') {
        const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
        bestChain = Math.max(...diffs.map(d => stats.byDifficulty[d].bestChain));
      } else {
        bestChain = stats.byDifficulty[filterDifficulty].bestChain;
      }
    } else {
      bestChain = runs.length > 0 ? Math.max(...runs.map(r => r.bestChain)) : 0;
    }

    const averageScore = runs.length > 0 ? Math.round(runs.reduce((a, r) => a + r.score, 0) / runs.length) : 0;
    const thisWeekRuns = runs.filter(r => r.date >= weekAgo);
    const bestThisWeek = thisWeekRuns.length > 0 ? Math.max(...thisWeekRuns.map(r => r.score)) : 0;

    return { bestRun, lifetimeScore, totalRuns, bestChain, averageScore, bestThisWeek };
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
