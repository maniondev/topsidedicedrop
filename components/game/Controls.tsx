import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

const GAP = 6; // space between each of the 5 buttons

interface Props {
  onLeft: () => void;
  onRight: () => void;
  onRotate: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onPause: () => void;
  disabled?: boolean;
  boardW: number;
}

function CtrlBtn({ onPress, children, size }: {
  onPress: () => void;
  children: React.ReactNode;
  size: number;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.btn, { width: size, height: size, backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.65}
    >
      {children}
    </TouchableOpacity>
  );
}

// Tap = soft drop one cell. Hold 300ms = hard drop (snap to bottom).
function DropButton({ onSoftDrop, onHardDrop, size }: { onSoftDrop: () => void; onHardDrop: () => void; size: number }) {
  const { colors } = useTheme();
  const holdTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHardDropRef = useRef(false);

  return (
    <TouchableOpacity
      style={[styles.btn, { width: size, height: size, backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPressIn={() => {
        didHardDropRef.current = false;
        holdTimerRef.current = setTimeout(() => {
          didHardDropRef.current = true;
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onHardDrop();
        }, 300);
      }}
      onPressOut={() => {
        if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
      }}
      onPress={() => {
        if (!didHardDropRef.current) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSoftDrop(); }
        didHardDropRef.current = false;
      }}
      activeOpacity={0.65}
    >
      <Ionicons name="arrow-down" size={22} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const Controls = React.memo(function Controls({ onLeft, onRight, onRotate, onSoftDrop, onHardDrop, onPause, disabled, boardW }: Props) {
  const { colors } = useTheme();
  // All 5 buttons equal size; space-between aligns outer edges with board edges.
  const btnSize = Math.max(36, Math.floor((boardW - GAP * 4) / 5));

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.btn, { width: btnSize, height: btnSize, backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPause(); }}
        activeOpacity={0.65}
      >
        <Ionicons name="pause" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      <CtrlBtn onPress={onLeft} size={btnSize}>
        <Ionicons name="arrow-back" size={22} color={colors.text} />
      </CtrlBtn>

      <CtrlBtn onPress={onRotate} size={btnSize}>
        <MaterialCommunityIcons name="rotate-right" size={22} color={colors.accent} />
      </CtrlBtn>

      <CtrlBtn onPress={onRight} size={btnSize}>
        <Ionicons name="arrow-forward" size={22} color={colors.text} />
      </CtrlBtn>

      <DropButton onSoftDrop={onSoftDrop} onHardDrop={onHardDrop} size={btnSize} />
    </View>
  );
});

export default Controls;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  btn: { borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
