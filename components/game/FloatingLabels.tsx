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
  rainbow?: boolean;  // when set: render each character in a cycling rainbow palette
  holdMs?: number;    // ms to hold at full opacity before fading (default 220)
}

const RAINBOW_PALETTE = ['#FF3B3B', '#FF8C00', '#FFD700', '#2ECC40', '#00AAFF', '#A044FF'];

function RainbowText({ text, fontSize, fontFamily }: { text: string; fontSize: number; fontFamily?: string }) {
  let colorIndex = 0;
  return (
    <View style={styles.rainbowRow}>
      {text.split('').map((ch, i) => {
        const color = ch.trim() ? RAINBOW_PALETTE[colorIndex++ % RAINBOW_PALETTE.length] : 'transparent';
        return (
          <Text key={i} style={[styles.text, styles.rainbowChar, {
            color,
            fontSize,
            fontFamily: fontFamily ?? undefined,
            textShadowColor: 'rgba(0,0,0,0.75)',
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 7,
          }]}>
            {ch === ' ' ? ' ' : ch}
          </Text>
        );
      })}
    </View>
  );
}


function FloatingLabelItem({
  text, x, y, color, fontSize, rotation, fontFamily, travelY = -70, glowColor, rainbow, holdMs = 220, onDone, centerHorizontally = false,
}: FloatingLabelData & { onDone: () => void; centerHorizontally?: boolean }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(1.5)).current;

  useEffect(() => {
    const travelDuration = Math.max(700, holdMs + 300);
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1,       duration: 80,            useNativeDriver: true }),
        Animated.spring(scale,      { toValue: 1,       useNativeDriver: true,   tension: 220, friction: 7 }),
      ]),
      Animated.parallel([
        Animated.timing(translateY, { toValue: travelY, duration: travelDuration, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(holdMs),
          Animated.timing(opacity,  { toValue: 0,       duration: 480,           useNativeDriver: true }),
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
        {rainbow ? (
          <RainbowText text={text} fontSize={fontSize} fontFamily={fontFamily} />
        ) : glowColor ? (
          <Text style={[textStyle, {
            color,
            textShadowColor: glowColor,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 3,
          }]}>{text}</Text>
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
  dropShadow:     { textShadowColor: 'rgba(0,0,0,0.55)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  text:           { fontWeight: '800' },
  rainbowRow:     { flexDirection: 'row', alignItems: 'center' },
  rainbowChar:    { fontWeight: '800' },
});
