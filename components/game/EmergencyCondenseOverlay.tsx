import React, { useEffect, useRef, useState } from 'react';
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
  // Stay mounted through the fade-out — unmounting the instant `visible` flips
  // false (the old `if (!visible) return null`) skipped the exit animation.
  const [rendered, setRendered] = useState(visible);

  useEffect(() => {
    if (visible) setRendered(true);
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: visible ? 250 : 300,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!visible && finished) setRendered(false);
    });
  }, [visible, opacity]);

  if (!rendered) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]} pointerEvents="none">
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.accent }]}>
        <Text style={[styles.title, { color: colors.accent, fontFamily: 'Rubik_700Bold' }]}>
          Condensing…
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    padding: 28, borderRadius: 20, borderWidth: 2,
    alignItems: 'center', minWidth: 200,
  },
  title: { fontSize: 22, textAlign: 'center' },
});
