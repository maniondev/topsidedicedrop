import React, { useMemo } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '@/constants/theme';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  visible: boolean;
  onRate: () => void;
  onLater: () => void;
  onDontAsk: () => void;
}

export default function ReviewPromptModal({ visible, onRate, onLater, onDontAsk }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={styles.card}>

          <View style={styles.iconRow}>
            <View style={styles.iconBg}>
              <Ionicons name="star" size={26} color={colors.premiumGold} />
            </View>
          </View>

          <Text style={styles.title}>Enjoying Dice Drop?</Text>
          <Text style={styles.body}>
            If you're having fun, a rating means a lot and helps others find the game.
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.rateBtn} onPress={onRate} activeOpacity={0.85}>
              <Ionicons name="star" size={16} color={colors.accentText} />
              <Text style={styles.rateBtnText}>Leave a Rating</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.laterBtn} onPress={onLater} activeOpacity={0.7}>
              <Text style={styles.laterBtnText}>Not Now</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dontAskBtn} onPress={onDontAsk} activeOpacity={0.7}>
              <Text style={styles.dontAskBtnText}>Don't Ask Again</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    card: {
      width: '100%',
      backgroundColor: c.card,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: c.cardBorder,
      padding: 24,
      alignItems: 'center',
      gap: 12,
    },
    iconRow: { marginBottom: 4 },
    iconBg: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: c.accentDim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: 18,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.3,
      textAlign: 'center',
    },
    body: {
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 4,
    },
    buttons: { width: '100%', gap: 10 },
    rateBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: c.accent,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 20,
    },
    rateBtnText: {
      fontSize: 15,
      fontWeight: '700',
      color: c.accentText,
    },
    laterBtn: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 20,
      borderWidth: 1,
      borderColor: c.border,
    },
    laterBtnText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.text,
    },
    dontAskBtn: {
      alignItems: 'center',
      paddingVertical: 10,
    },
    dontAskBtnText: {
      fontSize: 14,
      color: c.textDim,
    },
  });
}
