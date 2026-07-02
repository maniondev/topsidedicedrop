import React, { useCallback, useEffect, useRef } from 'react';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View, Platform, Dimensions } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

const IS_LARGE = Platform.isPad || Dimensions.get('window').width >= 600;

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
    <Modal visible transparent animationType="none" onRequestClose={dismiss}>
      <Animated.View style={[styles.backdrop, { opacity }]}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.65)', padding: 40 },
  card:     { borderRadius: 16, borderWidth: 1, paddingTop: 8, paddingBottom: IS_LARGE ? 22 : 16, paddingHorizontal: IS_LARGE ? 32 : 24, width: '100%', maxWidth: IS_LARGE ? 460 : 440 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: IS_LARGE ? 20 : 14, gap: IS_LARGE ? 20 : 14, minHeight: IS_LARGE ? 92 : 70 },
  icon:     { fontSize: IS_LARGE ? 30 : 22, width: IS_LARGE ? 44 : 32, textAlign: 'center' },
  label:    { fontSize: IS_LARGE ? 21 : 15, flex: 1, flexWrap: 'wrap' },
  btn:      { marginTop: IS_LARGE ? 18 : 12, borderRadius: IS_LARGE ? 14 : 10, paddingVertical: IS_LARGE ? 22 : 16, alignItems: 'center' },
  btnText:  { fontSize: IS_LARGE ? 22 : 16, fontFamily: 'Rubik_700Bold' },
});
