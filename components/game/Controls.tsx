import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
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

function CtrlBtn({
  onPress,
  children,
  wide,
}: {
  onPress: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.btn, wide && styles.btnWide, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
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
      <View style={styles.row}>
        <CtrlBtn onPress={onLeft}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </CtrlBtn>
        <CtrlBtn onPress={onRotate}>
          <MaterialCommunityIcons name="rotate-right" size={22} color={colors.accent} />
        </CtrlBtn>
        <CtrlBtn onPress={onSoftDrop}>
          <Ionicons name="arrow-down" size={22} color={colors.text} />
        </CtrlBtn>
        <CtrlBtn onPress={onRight}>
          <Ionicons name="arrow-forward" size={22} color={colors.text} />
        </CtrlBtn>
      </View>
      <TouchableOpacity
        style={[styles.hardDropBtn, { backgroundColor: colors.accent }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onHardDrop();
        }}
        activeOpacity={0.75}
      >
        <Ionicons name="chevron-down-outline" size={18} color={colors.accentText} />
        <Text style={[styles.hardDropText, { color: colors.accentText }]}>DROP</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  btn: {
    width: 58, height: 52,
    borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  btnWide: { width: 76 },
  hardDropBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 12,
  },
  hardDropText: { fontSize: 13, fontWeight: '700', letterSpacing: 1 },
});
