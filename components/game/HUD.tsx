import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, RoundedRect, Circle, Group } from '@shopify/react-native-skia';
import { useTheme, useDieColors } from '@/contexts/ThemeContext';
import { QueuedPiece } from '@/hooks/useGame';
import AppLogo from '@/components/AppLogo';

const DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0.50, 0.50]],
  2: [[0.72, 0.28], [0.28, 0.72]],
  3: [[0.72, 0.28], [0.50, 0.50], [0.28, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.50, 0.50], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.50], [0.72, 0.50], [0.28, 0.78], [0.72, 0.78]],
};

const CS = 18;            // smaller tiles for the inline preview
const NEXT_CANVAS_W = 64; // fixed width so piece changes never shift layout
const NEXT_CANVAS_H = 60; // fixed height handles up to 3-tile-tall pieces (3*18+2=56)

function InlinePiece({ piece, faceColor, dotColor }: { piece: QueuedPiece; faceColor: (v: number) => string; dotColor: (v: number) => string }) {
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
        const fill = faceColor(t.value);
        const dc   = dotColor(t.value);
        const dotR = Math.max(CS * 0.09, 2);
        const dots = DOT_POSITIONS[t.value] ?? DOT_POSITIONS[1];
        return (
          <Group key={i}>
            <RoundedRect x={x} y={y} width={rw} height={rw} r={4} color={fill} />
            {dots.map(([xf, yf], di) => (
              <Circle key={di} cx={x + xf * rw} cy={y + yf * rw} r={dotR} color={dc} />
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
  const { faceColor, dotColor } = useDieColors();

  return (
    <View style={styles.row}>

      {/* Left — Logo, same flex as right so BEST stays centered */}
      <View style={styles.side}>
        <AppLogo size={36} />
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
            {/* Fixed container — piece can be 1-3 tiles tall/wide, never shifts layout */}
            <View style={{ width: NEXT_CANVAS_W, height: NEXT_CANVAS_H, alignItems: 'center', justifyContent: 'center' }}>
              <InlinePiece piece={nextPiece} faceColor={faceColor} dotColor={dotColor} />
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
  divider:  { width: 1, height: 48 },
  nextWrap: { alignItems: 'center', gap: 2 },
});
