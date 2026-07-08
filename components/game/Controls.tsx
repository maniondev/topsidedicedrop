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
  boardW: number;
}

// Boxed button — the three main controls (left / rotate / right), grouped and
// centered.
const CtrlBtn = React.memo(function CtrlBtn({ onPress, children, size }: {
  onPress: () => void;
  children: React.ReactNode;
  size: number;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.btn, { width: size, height: size, backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPressIn={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }}
      activeOpacity={0.65}
    >
      {children}
    </TouchableOpacity>
  );
});

// Drop control — standalone symbol (no box), pinned to the board's right edge.
// Tap = soft drop one cell. Hold 300ms = hard drop (snap to bottom).
function DropButton({ onSoftDrop, onHardDrop, width, height, iconSize }: { onSoftDrop: () => void; onHardDrop: () => void; width: number; height: number; iconSize: number }) {
  const { colors } = useTheme();
  const holdTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didHardDropRef = useRef(false);

  return (
    <TouchableOpacity
      style={[styles.sideBtn, styles.sideBtnRight, { width, height }]}
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
      <Ionicons name="arrow-down" size={iconSize} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

const Controls = React.memo(function Controls({ onLeft, onRight, onRotate, onSoftDrop, onHardDrop, onPause, disabled, boardW }: Props) {
  const { colors } = useTheme();
  // Pause and Drop used to sit flush against the left/right main buttons, so
  // players kept hitting pause instead of ← and drop instead of →. They're now
  // standalone symbols pinned to the board's edges, with the three main
  // controls grouped in the center — space-between opens a clear gap between
  // the group and each edge control.
  const mainSize = Math.max(52, Math.floor(boardW * 0.19));
  const iconSize = Math.max(20, Math.round(mainSize * 0.3));
  const sideIconSize = Math.max(24, Math.round(boardW * 0.07));
  // Standalone controls: keep a comfortable vertical tap height, but keep the
  // width NARROW (just hugging the icon) so their inside edge stays near the
  // board edge — this widens the gap to ←/→ and cuts accidental pause/drop taps.
  const sideH = Math.max(44, Math.floor(boardW * 0.13));
  const sideW = sideIconSize + 12;
  // Space between the three main buttons. Wider than a hair so ←/→ aren't
  // crowding rotate — this intentionally breaks their old grid-column
  // alignment. There's ~30px of slack to the edge controls, so widening here
  // never crowds pause/drop.
  const mainGap = Math.max(10, Math.round(boardW * 0.045));

  return (
    <View style={styles.row}>
      {/* Pause — standalone symbol, left edge of the board */}
      <TouchableOpacity
        style={[styles.sideBtn, styles.sideBtnLeft, { width: sideW, height: sideH }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPause(); }}
        activeOpacity={0.6}
      >
        <Ionicons name="pause" size={sideIconSize} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Main controls — grouped and centered */}
      <View style={[styles.mainGroup, { gap: mainGap }]}>
        <CtrlBtn onPress={onLeft} size={mainSize}>
          <Ionicons name="arrow-back" size={iconSize} color={colors.text} />
        </CtrlBtn>

        <CtrlBtn onPress={onRotate} size={mainSize}>
          <MaterialCommunityIcons name="rotate-right" size={iconSize} color={colors.accent} />
        </CtrlBtn>

        <CtrlBtn onPress={onRight} size={mainSize}>
          <Ionicons name="arrow-forward" size={iconSize} color={colors.text} />
        </CtrlBtn>
      </View>

      {/* Drop — standalone symbol, right edge of the board */}
      <DropButton onSoftDrop={onSoftDrop} onHardDrop={onHardDrop} width={sideW} height={sideH} iconSize={sideIconSize} />
    </View>
  );
});

export default Controls;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  mainGroup: { flexDirection: 'row', alignItems: 'center' },
  btn: { borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  // Standalone symbols (pause, drop): no card background/border — just the icon
  // in a generous touch target. The icon is aligned to the board-facing edge
  // (left for pause, right for drop) so the symbol hugs the board's side; the
  // remaining touch area extends inward, keeping the tap target large without
  // pushing the icon away from the edge.
  sideBtn: { justifyContent: 'center' },
  sideBtnLeft: { alignItems: 'flex-start' },
  sideBtnRight: { alignItems: 'flex-end' },
});
