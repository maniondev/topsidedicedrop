import React from 'react';
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
  disabled?: boolean;
}

function CtrlBtn({ onPress, children, size = 56 }: { onPress: () => void; children: React.ReactNode; size?: number }) {
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

export default function Controls({ onLeft, onRight, onRotate, onSoftDrop, onHardDrop, disabled }: Props) {
  const { colors } = useTheme();
  if (disabled) return <View style={styles.row} />;

  return (
    <View style={styles.container}>
      {/* Main row: [←]  [↺]  [→]  —spacer—  [↓] */}
      <View style={styles.row}>
        <View style={styles.leftGroup}>
          <CtrlBtn onPress={onLeft}>
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </CtrlBtn>
          <CtrlBtn onPress={onRotate}>
            <MaterialCommunityIcons name="rotate-right" size={22} color={colors.accent} />
          </CtrlBtn>
          <CtrlBtn onPress={onRight}>
            <Ionicons name="arrow-forward" size={22} color={colors.text} />
          </CtrlBtn>
        </View>

        <View style={styles.rightGroup}>
          <CtrlBtn onPress={onSoftDrop} size={52}>
            <Ionicons name="arrow-down" size={20} color={colors.textSecondary} />
          </CtrlBtn>
        </View>
      </View>

      {/* Hard drop — full width accent button */}
      <TouchableOpacity
        style={[styles.hardDropBtn, { backgroundColor: colors.accent }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onHardDrop(); }}
        activeOpacity={0.75}
      >
        <Ionicons name="chevron-down" size={18} color={colors.accentText} />
        <Ionicons name="chevron-down" size={18} color={colors.accentText} style={{ marginLeft: -10 }} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { alignItems: 'center', gap: 8, width: '100%', paddingHorizontal: 20 },
  row:        { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between' },
  leftGroup:  { flexDirection: 'row', gap: 10 },
  rightGroup: { flexDirection: 'row' },
  btn:        { borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hardDropBtn:{
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: '100%', paddingVertical: 10, borderRadius: 12,
  },
});
