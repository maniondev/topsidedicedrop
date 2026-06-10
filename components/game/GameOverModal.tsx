import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  visible: boolean;
  score: number;
  bestScore: number;
  prevBest: number;
  // free continue: premium gets 1 free per run (no ad)
  freeContinueAvailable: boolean;
  // paid continue: rewarded ad available
  adLoaded: boolean;
  onFreeContinue: () => void;
  onContinue: () => void;
  onNewGame: () => void;
}

export default function GameOverModal({
  visible, score, bestScore, prevBest,
  freeContinueAvailable, adLoaded,
  onFreeContinue, onContinue, onNewGame,
}: Props) {
  const { colors } = useTheme();
  const isNewBest = score > prevBest && score > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onNewGame}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
            Game Over
          </Text>
          {isNewBest && (
            <Text style={[styles.newBest, { color: colors.accent }]}>New Best!</Text>
          )}
          <Text style={[styles.score, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
            {score.toLocaleString()}
          </Text>
          <Text style={[styles.bestLabel, { color: colors.textMuted }]}>
            {isNewBest
              ? `Previous best: ${prevBest.toLocaleString()}`
              : `Best: ${bestScore.toLocaleString()}`}
          </Text>

          {freeContinueAvailable && (
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: colors.accent }]}
              onPress={onFreeContinue}
            >
              <Text style={[styles.continueBtnText, { color: colors.accentText }]}>Free Continue</Text>
              <Text style={[styles.continueSub, { color: colors.accentText }]}>Premium perk — 1 per run</Text>
            </TouchableOpacity>
          )}

          {/* Ad continue — always shown (when no free continue); disabled until an ad is ready */}
          {!freeContinueAvailable && (
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: colors.accent, opacity: adLoaded ? 1 : 0.5 }]}
              onPress={onContinue}
              disabled={!adLoaded}
            >
              <Text style={[styles.continueBtnText, { color: colors.accentText }]}>▶ Continue</Text>
              <Text style={[styles.continueSub, { color: colors.accentText }]}>
                {adLoaded ? 'Watch a short ad' : 'Loading ad…'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.newGameBtn, { borderColor: colors.border }]}
            onPress={onNewGame}
          >
            <Text style={[styles.newGameText, { color: colors.text }]}>New Game</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card:         { width: '100%', borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12 },
  title:        { fontSize: 26 },
  newBest:      { fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
  score:        { fontSize: 52, lineHeight: 60 },
  bestLabel:    { fontSize: 14 },
  continueBtn:  { width: '100%', paddingVertical: 14, borderRadius: 14, alignItems: 'center', gap: 2 },
  continueBtnText: { fontSize: 16, fontWeight: '700' },
  continueSub:  { fontSize: 12, opacity: 0.85 },
  newGameBtn:   { width: '100%', paddingVertical: 13, borderRadius: 14, alignItems: 'center', borderWidth: 1 },
  newGameText:  { fontSize: 16, fontWeight: '600' },
});
