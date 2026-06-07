import React, { useRef } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import * as Haptics from 'expo-haptics';

interface Props {
  onLeft: () => void;
  onRight: () => void;
  onRotate: () => void;
  onSoftDrop: () => void;
  onHardDrop: () => void;
  onPause: () => void;
  disabled?: boolean;
}

function CtrlBtn({ onPress, children, size = 60 }: {
  onPress: () => void;
  children: React.ReactNode;
  size?: number;
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
function DropButton({ onSoftDrop, onHardDrop }: { onSoftDrop: () => void; onHardDrop: () => void }) {
  const { colors } = useTheme();
  const holdTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHardDropRef  = useRef(false);

  return (
    <TouchableOpacity
      style={[styles.btn, styles.sideBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
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

export default function Controls({ onLeft, onRight, onRotate, onSoftDrop, onHardDrop, onPause, disabled }: Props) {
  const { colors } = useTheme();
  // Always render the buttons (even while the board resolves/spawns) so they never
  // flicker out — the game reducer safely ignores moves outside the falling phase.

  return (
    <View style={styles.row}>
      {/* Pause — left, mirrors down button on right */}
      <TouchableOpacity
        style={[styles.btn, styles.sideBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPause(); }}
        activeOpacity={0.65}
      >
        <Ionicons name="pause" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {/* [←] [↺] [→] centered in remaining space */}
      <View style={styles.centerGroup}>
        <CtrlBtn onPress={onLeft}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </CtrlBtn>
        <CtrlBtn onPress={onRotate}>
          <MaterialCommunityIcons name="rotate-right" size={24} color={colors.accent} />
        </CtrlBtn>
        <CtrlBtn onPress={onRight}>
          <Ionicons name="arrow-forward" size={24} color={colors.text} />
        </CtrlBtn>
      </View>

      {/* Down — tap = 1 cell, hold = snap */}
      <DropButton onSoftDrop={onSoftDrop} onHardDrop={onHardDrop} />
    </View>
  );
}

const styles = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  centerGroup: { flexDirection: 'row', gap: 12, justifyContent: 'center', flex: 1 },
  btn:         { borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  sideBtn:     { width: 52, height: 52 },
  placeholder: { height: 60 },
});
