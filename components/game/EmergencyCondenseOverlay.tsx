import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { runEmergencyCondense } from '@/lib/condense';
import { Board } from '@/lib/board';

interface Props {
  visible: boolean;
  board: Board;
  onComplete: (board: Board, scoreGained: number) => void;
}

export default function EmergencyCondenseOverlay({ visible, board, onComplete }: Props) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!visible) {
      opacity.setValue(0);
      return;
    }

    // Fade in
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();

    // Give the UI a frame to show the overlay, then run condense (sync but brief)
    // then fade out and report results
    const timer = setTimeout(() => {
      const { finalBoard, scoreGained } = runEmergencyCondense(board);

      // Hold the "condensed" state for a moment so the user sees it
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          onCompleteRef.current(finalBoard, scoreGained);
        });
      }, 600);
    }, 700);

    return () => clearTimeout(timer);
  // board intentionally excluded — we only want the snapshot at the moment visible=true
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.accent }]}>
        <Text style={[styles.title, { color: colors.accent, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          ⚡ Condensing…
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
