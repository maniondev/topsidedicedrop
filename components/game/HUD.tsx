import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, RoundedRect, Circle, Group } from '@shopify/react-native-skia';
import { useTheme } from '@/contexts/ThemeContext';
import { QueuedPiece } from '@/hooks/useGame';
import { VALUE_COLORS, VALUE_DOT_COLORS } from '@/constants/game';
import AppLogo from '@/components/AppLogo';

const DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0.50, 0.50]],
  2: [[0.72, 0.28], [0.28, 0.72]],
  3: [[0.72, 0.28], [0.50, 0.50], [0.28, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.50, 0.50], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.50], [0.72, 0.50], [0.28, 0.78], [0.72, 0.78]],
};

const CS = 22;
const NEXT_CANVAS_W = 76; // fixed width so piece changes never shift layout

function InlinePiece({ piece }: { piece: QueuedPiece }) {
  const maxDr = Math.max(...piece.tiles.map(t => t.dr));
  const maxDc = Math.max(...piece.tiles.map(t => t.dc));
  const w = (maxDc + 1) * CS + 2;
  const h = (maxDr + 1) * CS + 2;
  return (
    <Canvas style={{ width: w, height: h }}>
      {piece.tiles.map((t, i) => {
        const x = t.dc * CS + 1;
        const y = t.dr * CS + 1;
        const rw = CS - 2;
        const fill = VALUE_COLORS[t.value] ?? '#888';
        const dotColor = VALUE_DOT_COLORS[t.value] ?? '#fff';
        const dotR = Math.max(CS * 0.09, 2);
        const dots = DOT_POSITIONS[t.value] ?? DOT_POSITIONS[1];
        return (
          <Group key={i}>
            <RoundedRect x={x} y={y} width={rw} height={rw} r={4} color={fill} />
            {dots.map(([xf, yf], di) => (
              <Circle key={di} cx={x + xf * rw} cy={y + yf * rw} r={dotR} color={dotColor} />
            ))}
          </Group>
        );
      })}
    </Canvas>
  );
}

interface Props {
  score: number;
  bestScore: number;
  nextPiece?: QueuedPiece;
}

export default function HUD({ score, bestScore, nextPiece }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.row}>

      {/* Left — Logo, same flex as right so BEST stays centered */}
      <View style={styles.side}>
        <AppLogo size={26} />
      </View>

      {/* Center — Score | Best, always centered */}
      <View style={styles.center}>
        <View style={styles.block}>
          <Text style={[styles.label, { color: colors.textMuted }]}>SCORE</Text>
          <Text style={[styles.value, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {score.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: colors.separator }]} />
        <View style={styles.block}>
          <Text style={[styles.label, { color: colors.textMuted }]}>BEST</Text>
          <Text style={[styles.value, { color: colors.accent, fontFamily: 'PlayfairDisplay_700Bold' }]}>
            {bestScore.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Right — Next piece in a fixed-width container */}
      <View style={styles.side}>
        {nextPiece && (
          <View style={styles.nextWrap}>
            <Text style={[styles.label, { color: colors.textMuted }]}>NEXT</Text>
            {/* Fixed canvas width so the piece never shifts the layout */}
            <View style={{ width: NEXT_CANVAS_W, alignItems: 'center', justifyContent: 'center', height: 32 }}>
              <InlinePiece piece={nextPiece} />
            </View>
          </View>
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 12 },
  side:     { flex: 1, alignItems: 'center' },
  center:   { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  block:    { alignItems: 'center', paddingHorizontal: 14 },
  label:    { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  value:    { fontSize: 24, marginTop: 1 },
  divider:  { width: 1, height: 32 },
  nextWrap: { alignItems: 'center', gap: 2 },
});
