import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  score: number;
  bestScore: number;
}

export default function HUD({ score, bestScore }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.block}>
        <Text style={[styles.label, { color: colors.textMuted }]}>SCORE</Text>
        <Text style={[styles.value, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          {score.toLocaleString()}
        </Text>
      </View>
      <View style={[styles.divider, { backgroundColor: colors.separator }]} />
      <View style={styles.block}>
        <Text style={[styles.label, { color: colors.textMuted }]}>BEST</Text>
        <Text style={[styles.value, { color: colors.accent, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          {bestScore.toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  block: { alignItems: 'center', paddingHorizontal: 24 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  value: { fontSize: 28, marginTop: 2 },
  divider: { width: 1, height: 36 },
});
