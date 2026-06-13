import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  visible: boolean;
}

/**
 * Pure visual flourish shown during Emergency Condense. The actual board
 * condense + resume is driven by the game screen (a single, robust effect),
 * NOT by this component — so it survives the rewarded-ad background/foreground
 * transition that used to strand the game in a non-playable state.
 */
export default function EmergencyCondenseOverlay({ visible }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 250 : 300,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.accent }]}>
        <Text style={[styles.title, { color: colors.accent, fontFamily: 'Rubik_700Bold' }]}>
          Condensing…
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Compressing the board
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    padding: 32, borderRadius: 20, borderWidth: 2,
    alignItems: 'center', gap: 10, minWidth: 240,
  },
  title: { fontSize: 22, textAlign: 'center' },
  sub:   { fontSize: 14 },
});
