import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const IS_LARGE = Platform.isPad || Dimensions.get('window').width >= 600;

interface Props {
  visible: boolean;
  score: number;
  bestScore: number;
  prevBest: number;
  freeContinueAvailable: boolean;
  onFreeContinue: () => void;
  onContinue: () => void;
  onNewGame: () => void;
  onHome: () => void;
  showAdNotice: boolean;
}

export default function GameOverModal({
  visible, score, bestScore, prevBest,
  freeContinueAvailable,
  onFreeContinue, onContinue, onNewGame, onHome, showAdNotice,
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

          {/* Ad continue — always tappable; shows ad if ready, grants reward after 1.5s fallback if not */}
          {!freeContinueAvailable && (
            <TouchableOpacity
              style={[styles.continueBtn, { backgroundColor: colors.accent }]}
              onPress={onContinue}
            >
              <Text style={[styles.continueBtnText, { color: colors.accentText }]}>▶ Continue</Text>
              <Text style={[styles.continueSub, { color: colors.accentText }]}>With an ad</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.newGameBtn, { borderColor: colors.border }]}
            onPress={onNewGame}
          >
            <Text style={[styles.newGameText, { color: colors.text }]}>New Game</Text>
            {showAdNotice && (
              <Text style={[styles.continueSub, { color: colors.textMuted }]}>With a skippable ad</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.homeBtn} onPress={onHome}>
            <Text style={[styles.homeBtnText, { color: colors.textDim }]}>← Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card:         { width: '100%', maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: IS_LARGE ? 16 : 12 },
  title:        { fontSize: IS_LARGE ? 32 : 26 },
  newBest:      { fontSize: IS_LARGE ? 19 : 15, fontWeight: '700', letterSpacing: 0.5 },
  score:        { fontSize: IS_LARGE ? 68 : 52, lineHeight: IS_LARGE ? 78 : 60 },
  bestLabel:    { fontSize: IS_LARGE ? 18 : 14 },
  continueBtn:  { width: '100%', paddingVertical: IS_LARGE ? 20 : 14, borderRadius: 14, alignItems: 'center', gap: 2 },
  continueBtnText: { fontSize: IS_LARGE ? 20 : 16, fontWeight: '700' },
  continueSub:  { fontSize: IS_LARGE ? 15 : 12, opacity: 0.85 },
  newGameBtn:   { width: '100%', paddingVertical: IS_LARGE ? 18 : 13, borderRadius: 14, alignItems: 'center', borderWidth: 1, gap: 2 },
  newGameText:  { fontSize: IS_LARGE ? 20 : 16, fontWeight: '600' },
  homeBtn:      { paddingVertical: IS_LARGE ? 12 : 8, alignItems: 'center' },
  homeBtnText:  { fontSize: IS_LARGE ? 16 : 13 },
});
