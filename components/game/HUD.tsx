import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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

const CS = 18;            // tile size for the inline preview
const NEXT_CANVAS_W = 64; // fixed width so piece changes never shift layout
const VALUE_AREA_H  = 56; // shared height for the score numbers AND next-piece preview

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
  onLogoPress?: () => void;
}

export default function HUD({ score, bestScore, nextPiece, onLogoPress }: Props) {
  const { colors } = useTheme();
  const { faceColor, dotColor } = useDieColors();

  return (
    <View style={styles.row}>

      {/* Logo doubles as a pause button in-game */}
      <TouchableOpacity
        style={styles.logoBtn}
        onPress={onLogoPress}
        disabled={!onLogoPress}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.6}
      >
        <AppLogo size={46} />
      </TouchableOpacity>

      {/* Three aligned columns: labels share a baseline, values share a centered row */}
      <View style={styles.columns}>
        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.textMuted }]}>SCORE</Text>
          <View style={styles.valueArea}>
            <Text style={[styles.value, { color: colors.text, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {score.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.separator }]} />

        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.textMuted }]}>BEST</Text>
          <View style={styles.valueArea}>
            <Text style={[styles.value, { color: colors.accent, fontFamily: 'PlayfairDisplay_700Bold' }]}>
              {bestScore.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.separator }]} />

        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.textMuted }]}>NEXT</Text>
          <View style={[styles.valueArea, { width: NEXT_CANVAS_W }]}>
            {nextPiece && (
              <InlinePiece piece={nextPiece} faceColor={faceColor} dotColor={dotColor} />
            )}
          </View>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 10 },
  logoBtn:   { marginRight: 6 },
  columns:   { flex: 1, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around' },
  col:       { flex: 1, alignItems: 'center' },
  label:     { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  valueArea: { height: VALUE_AREA_H, alignItems: 'center', justifyContent: 'center' },
  value:     { fontSize: 28 },
  divider:   { width: 1, height: VALUE_AREA_H, marginTop: 16 },
});
