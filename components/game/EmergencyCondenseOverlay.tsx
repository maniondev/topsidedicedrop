import React, { useEffect, useRef, useState } from 'react';
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
  const [ran, setRan] = useState(false);

  useEffect(() => {
    if (!visible) { setRan(false); return; }

    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();

    // Short theatrical pause, then run condense and report results
    const timer = setTimeout(() => {
      const { finalBoard, scoreGained } = runEmergencyCondense(board);
      setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
          onComplete(finalBoard, scoreGained);
          setRan(false);
        });
      }, 800);
    }, 600);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.accent }]}>
        <Text style={[styles.title, { color: colors.accent, fontFamily: 'PlayfairDisplay_700Bold' }]}>
          ⚡ Emergency Condense
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>Compressing board…</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  card: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    gap: 12,
    minWidth: 260,
  },
  title: { fontSize: 22, textAlign: 'center' },
  sub: { fontSize: 15 },
});
