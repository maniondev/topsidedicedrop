import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

export interface FloatingLabelData {
  id: string;
  type: 'chain' | 'score';
  text: string;
  x: number;        // center x in board coordinates (ignored when centerHorizontally)
  y: number;        // top y in overlay coordinates
  color: string;
  fontSize: number;
  rotation: number; // degrees, applied as static tilt
  fontFamily?: string;
  travelY?: number;   // upward travel in px, default -70
  glowColor?: string; // when set: stacked-text outline using this color for the stroke
}

// 8-direction offsets for the stacked-text stroke technique
const STROKE_OFFSETS: [number, number][] = [
  [-2, -2], [0, -2], [2, -2],
  [-2,  0],          [2,  0],
  [-2,  2], [0,  2], [2,  2],
];

function FloatingLabelItem({
  text, x, y, color, fontSize, rotation, fontFamily, travelY = -70, glowColor, onDone, centerHorizontally = false,
}: FloatingLabelData & { onDone: () => void; centerHorizontally?: boolean }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(1.5)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1,       duration: 80,  useNativeDriver: true }),
        Animated.spring(scale,      { toValue: 1,       useNativeDriver: true, tension: 220, friction: 7 }),
      ]),
      Animated.parallel([
        Animated.timing(translateY, { toValue: travelY, duration: 700, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(220),
          Animated.timing(opacity,  { toValue: 0,       duration: 480, useNativeDriver: true }),
        ]),
      ]),
    ]).start(({ finished }) => { if (finished) onDone(); });
  }, []);

  const anchorStyle = centerHorizontally
    ? [styles.anchor, styles.anchorCentered, { top: y }]
    : [styles.anchor, { left: x - 60, top: y }];

  const textStyle = [styles.text, { fontSize, fontFamily: fontFamily ?? undefined }];

  return (
    <View style={anchorStyle}>
      <Animated.View
        style={[
          styles.animWrap,
          { opacity, transform: [{ translateY }, { rotate: `${rotation}deg` }, { scale }] },
        ]}
      >
        {glowColor ? (
          // Stacked-text stroke: outline copies behind, fill on top
          <View style={styles.strokeWrap}>
            {STROKE_OFFSETS.map(([dx, dy], i) => (
              <Text key={i} style={[textStyle, styles.strokeCopy, { color: glowColor, left: dx, top: dy }]}>
                {text}
              </Text>
            ))}
            <Text style={[textStyle, { color }]}>{text}</Text>
          </View>
        ) : (
          <Text style={[textStyle, styles.dropShadow, { color }]}>{text}</Text>
        )}
      </Animated.View>
    </View>
  );
}

export function FloatingLabelsOverlay({
  labels,
  onRemove,
  centerHorizontally = false,
}: {
  labels: FloatingLabelData[];
  onRemove: (id: string) => void;
  centerHorizontally?: boolean;
}) {
  if (labels.length === 0) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {labels.map(l => (
        <FloatingLabelItem key={l.id} {...l} centerHorizontally={centerHorizontally} onDone={() => onRemove(l.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor:         { position: 'absolute', width: 120, alignItems: 'center' },
  anchorCentered: { left: 0, right: 0, width: undefined, alignItems: 'center' },
  animWrap:       { alignItems: 'center' },
  strokeWrap:     { alignItems: 'center' },
  strokeCopy:     { position: 'absolute', fontWeight: '800' },
  dropShadow:     { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  text:           { fontWeight: '800' },
});
