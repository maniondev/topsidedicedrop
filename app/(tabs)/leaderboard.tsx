import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { useStats } from '@/contexts/StatsContext';
import { usePremium } from '@/contexts/PremiumContext';
import AppLogo from '@/components/AppLogo';
import { RunRecord } from '@/lib/storage';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function DiffBadge({ diff }: { diff: RunRecord['difficulty'] }) {
  const { colors } = useTheme();
  if (!diff) return null;
  const color = diff === 'easy' ? '#27AE60' : diff === 'hard' ? '#E45757' : colors.textMuted;
  return (
    <Text style={[styles.badge, { color, borderColor: color }]}>
      {diff.charAt(0).toUpperCase() + diff.slice(1)}
    </Text>
  );
}

export default function StatsScreen() {
  const { colors } = useTheme();
  const { stats } = useStats();
  const { isPremium, upgrade } = usePremium();

  const avgScore = stats.recentRuns.length > 0
    ? Math.round(stats.recentRuns.reduce((a, r) => a + r.score, 0) / stats.recentRuns.length)
    : 0;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <AppLogo size={28} />
        <Text style={[styles.title, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          Stats
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Best score — always free */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.heroLabel, { color: colors.textMuted }]}>BEST SCORE</Text>
          <Text style={[styles.heroValue, { color: colors.accent, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {stats.bestScore.toLocaleString()}
          </Text>
        </View>

        {/* Free stats row */}
        <View style={styles.row}>
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

        {/* Premium stats */}
        {isPremium ? (
          <>
            <View style={styles.row}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>AVG SCORE</Text>
                <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                  {avgScore > 0 ? avgScore.toLocaleString() : '—'}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>CLEAN RUNS</Text>
                <Text style={[styles.statValue, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                  {stats.recentRuns.filter(r => !r.usedContinue).length}
                  <Text style={[styles.statSub, { color: colors.textMuted }]}> /20</Text>
                </Text>
              </View>
            </View>

            {/* Last 20 runs */}
            {stats.recentRuns.length > 0 && (
              <View style={[styles.runsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                <Text style={[styles.runsTitle, { color: colors.textSecondary }]}>Last 20 Runs</Text>
                {stats.recentRuns.map((run, i) => (
                  <View
                    key={i}
                    style={[styles.runRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.separator }]}
                  >
                    <View style={styles.runLeft}>
                      <Text style={[styles.runDate, { color: colors.textMuted }]}>{formatDate(run.date)}</Text>
                      <DiffBadge diff={run.difficulty} />
                      {run.usedContinue && (
                        <Ionicons name="refresh" size={11} color={colors.textMuted} />
                      )}
                    </View>
                    <View style={styles.runRight}>
                      {run.bestChain > 1 && (
                        <Text style={[styles.runChain, { color: colors.accent }]}>×{run.bestChain}</Text>
                      )}
                      <Text style={[styles.runScore, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
                        {run.score.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : (
          /* Premium upsell */
          <TouchableOpacity
            style={[styles.premiumNudge, { backgroundColor: colors.premiumBg, borderColor: colors.premiumGold }]}
            onPress={upgrade}
          >
            <Ionicons name="star" size={16} color={colors.premiumGold} />
            <Text style={[styles.premiumNudgeTitle, { color: colors.premiumGold }]}>Unlock Premium Stats</Text>
            <Text style={[styles.premiumNudgeSub, { color: colors.textSecondary }]}>
              Avg score · Clean runs · Last 20 run history
            </Text>
          </TouchableOpacity>
        )}

        {stats.totalRuns === 0 && (
          <Text style={[styles.empty, { color: colors.textMuted }]}>No runs yet — play a game first!</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, gap: 8 },
  title:       { fontSize: 22 },
  content:     { padding: 20, gap: 16, paddingBottom: 40 },
  heroCard:    { borderRadius: 16, borderWidth: 1, padding: 24, alignItems: 'center', gap: 4 },
  heroLabel:   { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  heroValue:   { fontSize: 52 },
  row:         { flexDirection: 'row', gap: 12 },
  statCard:    { flex: 1, borderRadius: 14, borderWidth: 1, padding: 18, alignItems: 'center', gap: 4 },
  statLabel:   { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  statValue:   { fontSize: 28 },
  statSub:     { fontSize: 14 },
  runsCard:    { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  runsTitle:   { fontSize: 13, fontWeight: '600', paddingHorizontal: 16, paddingVertical: 12 },
  runRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  runLeft:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  runRight:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  runDate:     { fontSize: 13 },
  runScore:    { fontSize: 16 },
  runChain:    { fontSize: 12, fontWeight: '700' },
  badge:       { fontSize: 10, fontWeight: '700', borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  premiumNudge:{ borderRadius: 14, borderWidth: 2, padding: 20, alignItems: 'center', gap: 6 },
  premiumNudgeTitle: { fontSize: 16, fontWeight: '700' },
  premiumNudgeSub:   { fontSize: 13, textAlign: 'center' },
  empty:       { textAlign: 'center', fontSize: 15, marginTop: 40 },
});
