import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  visible: boolean;
  onResume: () => void;
  onContinueLater: () => void; // saves state and quits to lobby
  onNewGame: () => void;       // quits to lobby without saving
}

export default function PauseModal({ visible, onResume, onContinueLater, onNewGame }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onResume}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            Paused
          </Text>

          <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={onResume}>
            <Text style={[styles.btnText, { color: colors.accentText }]}>▶  Resume</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.accent }]}
            onPress={onContinueLater}
          >
            <Text style={[styles.outlineText, { color: colors.accent }]}>Save & Quit</Text>
            <Text style={[styles.subText, { color: colors.textMuted }]}>Resume next time you play</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.outlineBtn, { borderColor: colors.border }]} onPress={onNewGame}>
            <Text style={[styles.outlineText, { color: colors.textSecondary }]}>✕  Quit Without Saving</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  card:       { width: '100%', borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12 },
  title:      { fontSize: 28, marginBottom: 4 },
  btn:        { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText:    { fontSize: 17, fontWeight: '700' },
  outlineBtn: { width: '100%', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, gap: 3 },
  outlineText:{ fontSize: 16, fontWeight: '600' },
  subText:    { fontSize: 11 },
});
