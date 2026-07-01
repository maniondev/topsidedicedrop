import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const HINTS = [
  { icon: '← →', label: 'Swipe to move' },
  { icon: '↻',   label: 'Tap to rotate' },
  { icon: '↓',   label: 'Swipe down to drop' },
];

interface Props {
  onDismiss: () => void;
}

export default function TutorialOverlay({ onDismiss }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  const dismiss = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onDismiss());
  }, [onDismiss]);

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, { opacity }]} onStartShouldSetResponder={() => true}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.cardBorder }]}>
        {HINTS.map((h, i) => (
          <View key={i} style={[styles.row, i < HINTS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
            <Text style={[styles.icon, { color: colors.accent }]}>{h.icon}</Text>
            <Text style={[styles.label, { color: colors.text }]}>{h.label}</Text>
          </View>
        ))}
        <TouchableOpacity style={[styles.btn, { backgroundColor: colors.accent }]} onPress={dismiss} activeOpacity={0.8}>
          <Text style={[styles.btnText, { color: colors.accentText }]}>Got it</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.38)', padding: 40 },
  card:     { borderRadius: 16, borderWidth: 1, paddingTop: 8, paddingBottom: 16, paddingHorizontal: 24, width: '100%', maxWidth: 440 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 14 },
  icon:     { fontSize: 22, width: 32, textAlign: 'center' },
  label:    { fontSize: 15, flex: 1, flexWrap: 'wrap' },
  btn:      { marginTop: 12, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  btnText:  { fontSize: 16, fontFamily: 'Rubik_700Bold' },
});
