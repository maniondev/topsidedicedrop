import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Canvas, RoundedRect, Circle, Rect, Group, BlurMask, Line, RadialGradient, vec, rrect, rect } from '@shopify/react-native-skia';
import { QueuedPiece } from '@/hooks/useGame';
import { useDieColors, useTheme } from '@/contexts/ThemeContext';
import { useDiceStyle, DiceStyleId } from '@/contexts/DiceStyleContext';

const DOT_POSITIONS: Record<number, Array<[number, number]>> = {
  1: [[0.50, 0.50]],
  2: [[0.72, 0.28], [0.28, 0.72]],
  3: [[0.72, 0.28], [0.50, 0.50], [0.28, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.50, 0.50], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.22], [0.72, 0.22], [0.28, 0.50], [0.72, 0.50], [0.28, 0.78], [0.72, 0.78]],
};

const PREVIEW_CS = 26;

function PreviewDie({ x, y, cs, value, faceColor, dotColor, diceStyle }: {
  x: number; y: number; cs: number; value: number;
  faceColor: string; dotColor: string; diceStyle: DiceStyleId;
}) {
  const pad = 1;
  const rw = cs - pad * 2;
  const rx = x + pad, ry = y + pad;
  const cx = rx + rw / 2, cy = ry + rw / 2;
  const dotR = Math.max(cs * 0.085, 2);
  const dots = DOT_POSITIONS[value] ?? DOT_POSITIONS[1];

  switch (diceStyle) {
    case 'sketch':
      return (
        <>
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={5} color={faceColor} style="stroke" strokeWidth={2} />
          {dots.map(([xf, yf], i) => (
            <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={Math.max(cs * 0.095, 3)} color={faceColor} style="stroke" strokeWidth={1.5} />
          ))}
        </>
      );

    case 'pixel': {
      const pipSize = Math.max(cs * 0.16, 3.5);
      return (
        <>
          <Rect x={rx} y={ry} width={rw} height={rw} color={faceColor} />
          <Rect x={rx} y={ry} width={rw} height={1.5} color="rgba(255,255,255,0.3)" />
          <Rect x={rx} y={ry} width={1.5} height={rw} color="rgba(255,255,255,0.3)" />
          <Rect x={rx} y={ry + rw - 1.5} width={rw} height={1.5} color="rgba(0,0,0,0.3)" />
          <Rect x={rx + rw - 1.5} y={ry} width={1.5} height={rw} color="rgba(0,0,0,0.3)" />
          {dots.map(([xf, yf], i) => (
            <Rect key={i} x={rx + xf * rw - pipSize / 2} y={ry + yf * rw - pipSize / 2} width={pipSize} height={pipSize} color={dotColor} />
          ))}
        </>
      );
    }

    case 'neon':
      return (
        <>
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={5} color="rgba(6,3,16,0.93)" />
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={5} color={faceColor} style="stroke" strokeWidth={1.8}>
            <BlurMask blur={3} style="solid" />
          </RoundedRect>
          <RoundedRect x={rx + 1} y={ry + 1} width={rw - 2} height={rw - 2} r={4} color={faceColor} style="stroke" strokeWidth={0.6} />
          {dots.map(([xf, yf], i) => (
            <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={faceColor}>
              <BlurMask blur={2} style="solid" />
            </Circle>
          ))}
          {dots.map(([xf, yf], i) => (
            <Circle key={`s${i}`} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR * 0.55} color={faceColor} />
          ))}
        </>
      );

    case 'raised': {
      const bevel = Math.max(cs * 0.12, 2.5);
      const clip = rrect(rect(rx, ry, rw, rw), 4, 4);
      return (
        <>
          <Group clip={clip}>
            <Rect x={rx} y={ry} width={rw} height={rw} color={faceColor} />
            <Rect x={rx} y={ry} width={rw} height={rw} color="transparent">
              <RadialGradient c={vec(rx, ry)} r={rw * 1.5} colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0)']} />
            </Rect>
            <Rect x={rx} y={ry} width={rw} height={rw} color="transparent">
              <RadialGradient c={vec(rx + rw, ry + rw)} r={rw * 1.5} colors={['rgba(0,0,0,0.42)', 'rgba(0,0,0,0)']} />
            </Rect>
            <Rect x={rx} y={ry} width={rw} height={bevel} color="rgba(255,255,255,0.48)" />
            <Rect x={rx} y={ry + bevel} width={bevel} height={rw - bevel} color="rgba(255,255,255,0.28)" />
            <Rect x={rx} y={ry + rw - bevel} width={rw} height={bevel} color="rgba(0,0,0,0.45)" />
            <Rect x={rx + rw - bevel} y={ry} width={bevel} height={rw - bevel} color="rgba(0,0,0,0.28)" />
          </Group>
          {dots.map(([xf, yf], i) => (
            <Circle key={`sh${i}`} cx={rx + xf * rw + 1} cy={ry + yf * rw + 1} r={dotR} color="rgba(0,0,0,0.35)" />
          ))}
          {dots.map(([xf, yf], i) => (
            <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={dotColor} />
          ))}
        </>
      );
    }

    default: // classic
      return (
        <>
          <RoundedRect x={rx} y={ry} width={rw} height={rw} r={5} color={faceColor} />
          {dots.map(([xf, yf], i) => (
            <Circle key={i} cx={rx + xf * rw} cy={ry + yf * rw} r={dotR} color={dotColor} />
          ))}
        </>
      );
  }
}

const PiecePreview = React.memo(function PiecePreview({ piece, diceStyle }: { piece: QueuedPiece; diceStyle: DiceStyleId }) {
  const { faceColor, dotColor: getDotColor } = useDieColors();
  const maxDr = useMemo(() => Math.max(...piece.tiles.map(t => t.dr)), [piece]);
  const maxDc = useMemo(() => Math.max(...piece.tiles.map(t => t.dc)), [piece]);
  const canvasW = (maxDc + 1) * PREVIEW_CS + 4;
  const canvasH = (maxDr + 1) * PREVIEW_CS + 4;

  return (
    <Canvas style={{ width: canvasW, height: canvasH }}>
      {piece.tiles.map((t, i) => {
        const x = t.dc * PREVIEW_CS + 2;
        const y = t.dr * PREVIEW_CS + 2;
        return (
          <PreviewDie
            key={i}
            x={x} y={y} cs={PREVIEW_CS}
            value={t.value}
            faceColor={faceColor(t.value)}
            dotColor={getDotColor(t.value)}
            diceStyle={diceStyle}
          />
        );
      })}
    </Canvas>
  );
}, (prev, next) => prev.piece === next.piece && prev.diceStyle === next.diceStyle);

interface Props {
  queue: QueuedPiece[];
}

function NextQueue({ queue }: Props) {
  const { colors } = useTheme();
  const { diceStyle } = useDiceStyle();
  const next = queue[0];
  if (!next) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textMuted }]}>NEXT</Text>
      <View style={[styles.slot, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <PiecePreview piece={next} diceStyle={diceStyle} />
      </View>
    </View>
  );
}

export default React.memo(NextQueue, (prev, next) => {
  const p = prev.queue[0];
  const n = next.queue[0];
  return p?.shapeId === n?.shapeId && p?.rotation === n?.rotation;
});

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  slot: {
    minWidth: 72, minHeight: 60,
    borderRadius: 10, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8, paddingVertical: 6,
  },
});
