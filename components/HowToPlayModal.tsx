import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const CONTROLS: { verb: string; rest: string }[] = [
  { verb: 'Swipe', rest: ' left/right to move' },
  { verb: 'Tap',   rest: ' to rotate' },
  { verb: 'Swipe', rest: ' down to drop faster' },
];

const RULES: { title: string; body: string }[] = [
  { title: 'Merge matching values', body: 'Two or more touching dice of the same value merge into one die of the next value: 1+1→2, 2+2→3, all the way up.' },
  { title: 'Build chains', body: 'A merge can trigger more merges as dice settle. The longer the chain, the bigger the score multiplier.' },
  { title: 'Clear the sixes', body: 'Merge two or more 6s to clear them off the board for a big bonus. The best way to free up space.' },
  { title: 'Survive', body: 'Unsupported stacks fall. The run ends when a new piece can no longer fit. Beat your best score!' },
];

export default function HowToPlayModal({ visible, onClose }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
            How to Play
          </Text>

          <View style={styles.rules}>
            <View style={styles.rule}>
              <Text style={[styles.ruleTitle, { color: colors.accent }]}>Drop the dice</Text>
              {CONTROLS.map((c, i) => (
                <Text key={i} style={[styles.ruleBody, { color: colors.textSecondary }]}>
                  <Text style={styles.verb}>{c.verb}</Text>{c.rest}
                </Text>
              ))}
            </View>
            {RULES.map((r, i) => (
              <View key={i} style={styles.rule}>
                <Text style={[styles.ruleTitle, { color: colors.accent }]}>{r.title}</Text>
                <Text style={[styles.ruleBody, { color: colors.textSecondary }]}>{r.body}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={onClose}>
            <Text style={[styles.btnText, { color: colors.accentText }]}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  card:      { width: '100%', maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: 20, gap: 14 },
  title:     { fontSize: 22, textAlign: 'center' },
  rules:     { gap: 10 },
  rule:      { gap: 2 },
  ruleTitle: { fontSize: 16, fontWeight: '700' },
  ruleBody:  { fontSize: 13, lineHeight: 19 },
  verb:      { fontWeight: '700' },
  btn:       { paddingVertical: 13, borderRadius: 12, alignItems: 'center' },
  btnText:   { fontSize: 16, fontWeight: '700' },
});
