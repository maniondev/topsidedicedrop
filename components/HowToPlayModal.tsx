import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const RULES: { title: string; body: string }[] = [
  { title: 'Drop the dice', body: 'Shaped dice pieces fall from the top. Swipe left/right to move, tap to rotate, and swipe down to drop faster.' },
  { title: 'Merge matching values', body: 'Two touching dice of the same value merge into one die of the next value: 1+1→2, 2+2→3, all the way up.' },
  { title: 'Build chains', body: 'A merge can trigger more merges as dice settle. The longer the chain, the bigger the score multiplier.' },
  { title: 'Clear the sixes', body: 'Merge two 6s to clear them off the board for a big bonus. The best way to free up space.' },
  { title: 'Survive', body: 'Unsupported stacks fall. The run ends when a new piece can no longer fit. Beat your best score!' },
];

export default function HowToPlayModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            How to Play
          </Text>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {RULES.map((r, i) => (
              <View key={i} style={styles.rule}>
                <Text style={[styles.ruleTitle, { color: colors.accent }]}>{r.title}</Text>
                <Text style={[styles.ruleBody, { color: colors.textSecondary }]}>{r.body}</Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={onClose}>
            <Text style={[styles.btnText, { color: colors.accentText }]}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  card:        { width: '100%', maxHeight: '80%', borderRadius: 20, borderWidth: 1, padding: 24, gap: 16 },
  title:       { fontSize: 24, textAlign: 'center' },
  scroll:      { flexGrow: 0 },
  scrollContent: { gap: 16 },
  rule:        { gap: 3 },
  ruleTitle:   { fontSize: 15, fontWeight: '700' },
  ruleBody:    { fontSize: 14, lineHeight: 20 },
  btn:         { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText:     { fontSize: 16, fontWeight: '700' },
});
