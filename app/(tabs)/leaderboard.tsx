import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { Difficulty } from '@/contexts/DifficultyContext';
import { RunRecord } from '@/lib/storage';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatScore(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

const DIFF_COLOR: Record<Difficulty, string> = {
  easy: '#27AE60',
  medium: '#F5A623',
  hard: '#E45757',
};

function DiffBadge({ diff }: { diff: Difficulty }) {
  return (
    <Text style={[styles.badge, { color: DIFF_COLOR[diff], borderColor: DIFF_COLOR[diff] }]}>
      {diff.charAt(0).toUpperCase()}
    </Text>
  );
}

function RunRow({ rank, run, isYou = true }: { rank: number; run: RunRecord; isYou?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.runRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.runRank, { color: rank <= 3 ? colors.accent : colors.textMuted }]}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
      </Text>
      <View style={styles.runInfo}>
        <Text style={[styles.runName, { color: colors.text }]} numberOfLines={1}>
          {isYou ? 'You' : '—'}
        </Text>
        <Text style={[styles.runDate, { color: colors.textMuted }]}>{formatDate(run.date)}</Text>
      </View>
      <View style={styles.runRight}>
        {run.bestChain > 1 && (
          <Text style={[styles.runChain, { color: colors.textMuted }]}>×{run.bestChain}</Text>
        )}
        <DiffBadge diff={run.difficulty} />
        <Text style={[styles.runScore, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          {formatScore(run.score)}
        </Text>
      </View>
    </View>
  );
}

export default function LeaderboardScreen() {
  const { colors } = useTheme();
  const { stats } = useStats();

  const [filterDifficulty, setFilterDifficulty] = useState<Difficulty | 'all'>('all');
  const [filterType, setFilterType] = useState<'overall' | 'unassisted'>('overall');

  const isUnassisted = filterType === 'unassisted';
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  // Filtered runs for ranked list + derived stats
  const filteredRuns = stats.recentRuns.filter(r => {
    const diffMatch = filterDifficulty === 'all' || r.difficulty === filterDifficulty;
    const typeMatch = !isUnassisted || !r.usedContinue;
    return diffMatch && typeMatch;
  });

  // Best Run & Average — respect both filters
  const diffs: Difficulty[] = ['easy', 'medium', 'hard'];
  const bestRun = filterDifficulty === 'all'
    ? Math.max(0, ...diffs.map(d => isUnassisted ? stats.byDifficulty[d].bestUnassisted : stats.byDifficulty[d].bestScore))
    : isUnassisted ? stats.byDifficulty[filterDifficulty].bestUnassisted : stats.byDifficulty[filterDifficulty].bestScore;

  const averageScore = filteredRuns.length > 0
    ? Math.round(filteredRuns.reduce((a, r) => a + r.score, 0) / filteredRuns.length)
    : 0;

  const bestThisWeek = Math.max(0, ...filteredRuns.filter(r => r.date >= weekAgo).map(r => r.score));

  // Always-overall stats (lifetime, total runs, best chain — unaffected by type filter)
  const overallRuns = stats.recentRuns.filter(r =>
    filterDifficulty === 'all' || r.difficulty === filterDifficulty
  );
  const lifetimeScore = filterDifficulty === 'all'
    ? diffs.reduce((sum, d) => sum + stats.byDifficulty[d].lifetimeScore, 0)
    : stats.byDifficulty[filterDifficulty].lifetimeScore;
  const totalRuns = filterDifficulty === 'all'
    ? diffs.reduce((sum, d) => sum + stats.byDifficulty[d].totalRuns, 0)
    : stats.byDifficulty[filterDifficulty].totalRuns;
  const bestChain = filterDifficulty === 'all'
    ? Math.max(0, ...diffs.map(d => stats.byDifficulty[d].bestChain))
    : stats.byDifficulty[filterDifficulty].bestChain;

  // Sorted runs for the ranked list
  const rankedRuns = [...filteredRuns].sort((a, b) => b.score - a.score);

  const FilterBtn = ({ label, value, current, onPress }: { label: string; value: string; current: string; onPress: (v: any) => void }) => (
    <TouchableOpacity
      style={[styles.filterBtn, { backgroundColor: current === value ? colors.accent : colors.card, borderColor: current === value ? colors.accent : colors.border }]}
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
        <Text style={[styles.title, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>Leaderboard</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Filters */}
        <View style={styles.filters}>
          <View style={styles.filterRow}>
            <FilterBtn label="All" value="all" current={filterDifficulty} onPress={setFilterDifficulty} />
            <FilterBtn label="Easy" value="easy" current={filterDifficulty} onPress={setFilterDifficulty} />
            <FilterBtn label="Medium" value="medium" current={filterDifficulty} onPress={setFilterDifficulty} />
            <FilterBtn label="Hard" value="hard" current={filterDifficulty} onPress={setFilterDifficulty} />
          </View>
          <View style={styles.filterRow}>
            <FilterBtn label="Overall" value="overall" current={filterType} onPress={setFilterType} />
            <FilterBtn label="Unassisted" value="unassisted" current={filterType} onPress={setFilterType} />
          </View>
        </View>

        {/* Personal stats — Best Run, Average, Best This Week (type-filtered) */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>YOUR STATS</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>BEST RUN</Text>
              <Text style={[styles.statValue, { color: colors.accent, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                {bestRun > 0 ? bestRun.toLocaleString() : '—'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>AVERAGE</Text>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                {averageScore > 0 ? averageScore.toLocaleString() : '—'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>THIS WEEK</Text>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                {bestThisWeek > 0 ? bestThisWeek.toLocaleString() : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Always-overall stats */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>ALL TIME</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>LIFETIME</Text>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                {lifetimeScore > 0 ? formatScore(lifetimeScore) : '—'}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>RUNS</Text>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                {totalRuns}
              </Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>BEST CHAIN</Text>
              <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                {bestChain > 0 ? `×${bestChain}` : '—'}
              </Text>
            </View>
          </View>
        </View>

        {/* Ranked runs — placeholder for future global leaderboard */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>YOUR RUNS</Text>
            {/* TODO: Toggle between "My Runs" and "Global" once Supabase is wired */}
            <Text style={[styles.comingSoon, { color: colors.textMuted }]}>Global rankings coming soon</Text>
          </View>
          {rankedRuns.length > 0 ? (
            rankedRuns.map((run, i) => (
              <RunRow key={`${run.date}-${run.score}`} rank={i + 1} run={run} />
            ))
          ) : (
            <Text style={[styles.empty, { color: colors.textMuted }]}>
              No runs yet — play a game first!
            </Text>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:           { flex: 1 },
  header:         { paddingVertical: 16, paddingHorizontal: 20 },
  title:          { fontSize: 32 },
  content:        { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },

  filters:        { gap: 8 },
  filterRow:      { flexDirection: 'row', gap: 8 },
  filterBtn:      { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 1.5, alignItems: 'center' },
  filterBtnText:  { fontSize: 13 },

  section:        { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  sectionTitle:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  comingSoon:     { fontSize: 11, fontStyle: 'italic' },

  statsRow:       { flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 16, paddingTop: 4 },
  statItem:       { flex: 1, alignItems: 'center', gap: 4 },
  statDivider:    { width: 1, marginVertical: 4 },
  statLabel:      { fontSize: 9, fontWeight: '700', letterSpacing: 1.2 },
  statValue:      { fontSize: 18 },

  runRow:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  runRank:        { fontSize: 14, fontWeight: '700', width: 32, textAlign: 'center' },
  runInfo:        { flex: 1 },
  runName:        { fontSize: 15, fontWeight: '600' },
  runDate:        { fontSize: 12, marginTop: 1 },
  runRight:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runChain:       { fontSize: 12 },
  runScore:       { fontSize: 17 },
  badge:          { fontSize: 10, fontWeight: '700', borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  empty:          { textAlign: 'center', padding: 24, fontSize: 14, fontStyle: 'italic' },
});
