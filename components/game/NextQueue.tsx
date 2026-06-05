import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, RoundedRect, Circle, Group } from '@shopify/react-native-skia';
import { QueuedPiece } from '@/hooks/useGame';
import { VALUE_COLORS, VALUE_DOT_COLORS } from '@/constants/game';
import { CellValue } from '@/lib/board';
import { useTheme } from '@/contexts/ThemeContext';

const DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0.50, 0.50]],
  2: [[0.72, 0.28], [0.28, 0.72]],
  3: [[0.72, 0.28], [0.50, 0.50], [0.28, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.50, 0.50], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.50], [0.72, 0.50], [0.28, 0.78], [0.72, 0.78]],
};

const PREVIEW_CS = 22; // cell size for queue previews

function PiecePreview({ piece }: { piece: QueuedPiece }) {
  const { colors } = useTheme();
  const maxDr = Math.max(...piece.tiles.map(t => t.dr));
  const maxDc = Math.max(...piece.tiles.map(t => t.dc));
  const canvasW = (maxDc + 1) * PREVIEW_CS + 4;
  const canvasH = (maxDr + 1) * PREVIEW_CS + 4;

  return (
    <Canvas style={{ width: canvasW, height: canvasH }}>
      {piece.tiles.map((t, i) => {
        const x = t.dc * PREVIEW_CS + 2;
        const y = t.dr * PREVIEW_CS + 2;
        const fill = VALUE_COLORS[t.value] ?? '#888';
        const dotColor = VALUE_DOT_COLORS[t.value] ?? '#fff';
        const rw = PREVIEW_CS - 2;
        const dotR = Math.max(PREVIEW_CS * 0.085, 2);
        const dots = DOT_POSITIONS[t.value] ?? DOT_POSITIONS[1];
        return (
          <Group key={i}>
            <RoundedRect x={x} y={y} width={rw} height={rw} r={5} color={fill} />
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
  queue: QueuedPiece[];
}

export default function NextQueue({ queue }: Props) {
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted }]}>NEXT</Text>
      <View style={styles.row}>
        {queue.slice(0, 3).map((piece, i) => (
          <View
            key={i}
            style={[
              styles.slot,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
              i === 0 && styles.slotFirst,
            ]}
          >
            <PiecePreview piece={piece} />
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 6 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  row: { flexDirection: 'row', gap: 8 },
  slot: {
    width: 60, height: 54,
    borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    opacity: 0.75,
  },
  slotFirst: { opacity: 1.0 },
});
