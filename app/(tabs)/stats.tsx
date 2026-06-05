import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import AppLogo from '@/components/AppLogo';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const { stats } = useStats();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <AppLogo size={28} />
        <Text style={[styles.title, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Stats
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Best score */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.heroLabel, { color: colors.textMuted }]}>BEST SCORE</Text>
          <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {stats.bestScore.toLocaleString()}
          </Text>
        </View>

        {/* Totals */}
        <View style={styles.row}>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>RUNS</Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {stats.totalRuns}
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>AVG SCORE</Text>
            <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {stats.totalRuns > 0
                ? Math.round(stats.recentRuns.reduce((a, r) => a + r.score, 0) / stats.recentRuns.length).toLocaleString()
                : '—'}
            </Text>
          </View>
        </View>

        {/* Recent runs */}
        {stats.recentRuns.length > 0 && (
          <View style={[styles.runsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.runsTitle, { color: colors.textSecondary }]}>Recent Runs</Text>
            {stats.recentRuns.map((run, i) => (
              <View key={i} style={[styles.runRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.separator }]}>
                <Text style={[styles.runDate, { color: colors.textMuted }]}>{formatDate(run.date)}</Text>
                <Text style={[styles.runScore, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                  {run.score.toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {stats.totalRuns === 0 && (
          <Text style={[styles.empty, { color: colors.textMuted }]}>
            No runs yet — play a game first!
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  title: { fontSize: 22 },
  content: { padding: 20, gap: 16 },
  heroCard: {
    borderRadius: 16, borderWidth: 1,
    padding: 24, alignItems: 'center', gap: 4,
  },
  heroLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  heroValue: { fontSize: 52 },
  row: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    padding: 18, alignItems: 'center', gap: 4,
  },
  statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  statValue: { fontSize: 28 },
  runsCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  runsTitle: { fontSize: 13, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 12 },
  runRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  runDate: { fontSize: 14 },
  runScore: { fontSize: 16 },
  empty: { textAlign: 'center', fontSize: 15, marginTop: 40 },
});
