import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/contexts/ThemeContext';
import { useLocalizedFont } from '@/lib/fonts';
import { generateCandidateName, commitDisplayName } from '@/lib/playerIdentity';

const IS_LARGE = (Platform as any).isPad || Dimensions.get('window').width >= 600;

interface Props {
  visible: boolean;
  currentName: string | null;
  onClose: () => void;
  // Called after a name is successfully committed to the leaderboard.
  onConfirmed: (newName: string) => void;
}

/**
 * Confirm-before-commit rename flow. Shuffling only generates candidates
 * LOCALLY (no server calls, no change to the public name); the name is written
 * to the leaderboard only when the player taps Confirm. Guards against the
 * accidental taps the old one-tap button was prone to.
 */
export default function RenameModal({ visible, currentName, onClose, onConfirmed }: Props) {
  const { t } = useTranslation();
  const font = useLocalizedFont();
  const { colors } = useTheme();
  const [candidate, setCandidate] = useState('');
  const [saving, setSaving] = useState(false);

  // Fresh candidate each time the modal opens.
  useEffect(() => {
    if (visible) {
      setCandidate(generateCandidateName());
      setSaving(false);
    }
  }, [visible]);

  const shuffle = () => {
    if (saving) return;
    setCandidate(generateCandidateName());
  };

  const confirm = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const stuck = await commitDisplayName(candidate);
      onConfirmed(stuck);
      onClose();
    } catch {
      Alert.alert(t('leaderboard.renameModal.errorTitle'), t('leaderboard.renameModal.errorBody'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.text, fontFamily: font('Rubik_700Bold') }]}>
            {t('leaderboard.renameModal.title')}
          </Text>

          <View style={styles.currentRow}>
            <Text style={[styles.currentLabel, { color: colors.textMuted }]}>{t('leaderboard.renameModal.current')}</Text>
            <Text style={[styles.currentName, { color: colors.textSecondary }]} numberOfLines={1}>{currentName ?? '—'}</Text>
          </View>

          <View style={[styles.candidateBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.candidate, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {candidate}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.shuffleBtn, { borderColor: colors.border, opacity: saving ? 0.5 : 1 }]}
            onPress={shuffle}
            disabled={saving}
            activeOpacity={0.7}
          >
            <Ionicons name="shuffle" size={16} color={colors.accent} />
            <Text style={[styles.shuffleText, { color: colors.accent }]}>{t('leaderboard.renameModal.shuffle')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.accent, opacity: saving ? 0.6 : 1 }]}
            onPress={confirm}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator size="small" color={colors.accentText} />
              : <Text style={[styles.confirmText, { color: colors.accentText }]}>{t('leaderboard.renameModal.confirm')}</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving} activeOpacity={0.7}>
            <Text style={[styles.cancelText, { color: colors.textMuted }]}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  card:         { width: '100%', maxWidth: 440, borderRadius: 20, borderWidth: 1, padding: IS_LARGE ? 28 : 24, alignItems: 'center', gap: IS_LARGE ? 16 : 12 },
  title:        { fontSize: IS_LARGE ? 28 : 22, marginBottom: 2 },
  currentRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' },
  currentLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase' },
  currentName:  { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  candidateBox: { alignSelf: 'stretch', borderRadius: 14, borderWidth: 1, paddingVertical: IS_LARGE ? 20 : 16, paddingHorizontal: 16, alignItems: 'center' },
  candidate:    { alignSelf: 'stretch', textAlign: 'center', fontSize: IS_LARGE ? 24 : 20, fontWeight: '700' },
  shuffleBtn:   { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1.5, borderRadius: 12, paddingVertical: IS_LARGE ? 18 : 14 },
  shuffleText:  { fontSize: IS_LARGE ? 19 : 16, fontWeight: '700' },
  confirmBtn:   { alignSelf: 'stretch', paddingVertical: IS_LARGE ? 18 : 14, borderRadius: 12, alignItems: 'center', marginTop: 2 },
  confirmText:  { fontSize: IS_LARGE ? 19 : 16, fontWeight: '700' },
  cancelBtn:    { paddingVertical: 8, alignItems: 'center' },
  cancelText:   { fontSize: IS_LARGE ? 16 : 14, fontWeight: '600' },
});
