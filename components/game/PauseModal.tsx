import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const IS_LARGE = Platform.isPad || Dimensions.get('window').width >= 600;
import { useTheme } from '@/contexts/ThemeContext';
import { useSound } from '@/contexts/SoundContext';
import { useMusic } from '@/contexts/MusicContext';

interface Props {
  visible: boolean;
  onResume: () => void;
  onContinueLater: () => void; // saves state and quits to lobby
  onQuitAndLog: () => void;    // submits score to stats, then quits
  onQuitDiscard: () => void;   // quits without saving or logging score
  hasProgress?: boolean;       // false = no dice locked yet; skip log/discard dialog
}

export default function PauseModal({ visible, onResume, onContinueLater, onQuitAndLog, onQuitDiscard, hasProgress = true }: Props) {
  const { colors } = useTheme();
  const { soundEnabled, setSoundEnabled } = useSound();
  const { musicEnabled, setMusicEnabled, devMusicIncluded } = useMusic();
  const [confirming, setConfirming] = useState(false);

  // Reset confirmation step whenever modal closes
  const handleRequestClose = () => {
    setConfirming(false);
    onResume();
  };

  if (confirming) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={handleRequestClose}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.title, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
              Quit Without Saving?
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Your progress won't be saved. Log your score to the leaderboard or discard it.
            </Text>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.accent }]}
              onPress={onQuitAndLog}
            >
              <Text style={[styles.btnText, { color: colors.accentText }]}>Log Score</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: colors.accent }]}
              onPress={onQuitDiscard}
            >
              <Text style={[styles.outlineText, { color: colors.accent }]}>Discard Score</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineBtn, { borderColor: colors.border }]}
              onPress={() => setConfirming(false)}
            >
              <Text style={[styles.outlineText, { color: colors.textSecondary }]}>← Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleRequestClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.topBtnRow}>
            <TouchableOpacity
              style={[styles.muteBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setSoundEnabled(!soundEnabled)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={soundEnabled ? 'volume-high' : 'volume-mute'}
                size={18}
                color={soundEnabled ? colors.accent : colors.textDim}
              />
            </TouchableOpacity>
            {devMusicIncluded && (
              <TouchableOpacity
                style={[styles.muteBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setMusicEnabled(!musicEnabled)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="musical-notes"
                  size={18}
                  color={musicEnabled ? colors.accent : colors.textDim}
                />
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.title, { color: colors.text, fontFamily: 'Rubik_700Bold' }]}>
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
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: colors.border }]}
            onPress={() => hasProgress ? setConfirming(true) : onQuitDiscard()}
          >
            <Text style={[styles.outlineText, { color: colors.textSecondary }]}>✕  Quit Without Saving</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 40 },
  card:       { width: '100%', maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: 28, alignItems: 'center', gap: 12, position: 'relative' },
  topBtnRow:  { position: 'absolute', top: 14, right: 14, flexDirection: 'row', gap: 8 },
  muteBtn:    { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title:      { fontSize: 28, marginBottom: 4 },
  subtitle:   { fontSize: IS_LARGE ? 16 : 13, textAlign: 'center', lineHeight: IS_LARGE ? 22 : 18, marginBottom: 4 },
  btn:        { width: '100%', paddingVertical: IS_LARGE ? 20 : 14, borderRadius: 12, alignItems: 'center' },
  btnText:    { fontSize: IS_LARGE ? 20 : 17, fontWeight: '700' },
  outlineBtn: { width: '100%', paddingVertical: IS_LARGE ? 18 : 12, borderRadius: 12, alignItems: 'center', borderWidth: 1.5, gap: 3 },
  outlineText:{ fontSize: IS_LARGE ? 18 : 16, fontWeight: '600' },
  subText:    { fontSize: 11 },
});
