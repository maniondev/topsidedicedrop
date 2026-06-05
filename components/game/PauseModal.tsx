import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  visible: boolean;
  onResume: () => void;
  onNewGame: () => void;
}

export default function PauseModal({ visible, onResume, onNewGame }: Props) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onResume}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            Paused
          </Text>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.accent }]}
            onPress={onResume}
          >
            <Text style={[styles.btnText, { color: colors.accentText }]}>▶ Resume</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.border }]}
            onPress={onNewGame}
          >
            <Text style={[styles.outlineText, { color: colors.textSecondary }]}>New Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  card:       { width: '100%', borderRadius: 20, borderWidth: 1, padding: 32, alignItems: 'center', gap: 14 },
  title:      { fontSize: 28, marginBottom: 4 },
  btn:        { width: '100%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText:    { fontSize: 17, fontWeight: '700' },
  outlineBtn: { width: '100%', paddingVertical: 13, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  outlineText:{ fontSize: 16, fontWeight: '600' },
});
